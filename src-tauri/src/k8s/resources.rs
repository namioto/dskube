use kube::{Client, Api};
use kube::api::{ListParams, DynamicObject};
use kube::core::{NamespaceResourceScope, ApiResource};
use kube::runtime::watcher;
use kube::runtime::watcher::Event;
use k8s_openapi::api::core::v1::{Pod, ConfigMap, Service, Secret, Namespace, Node, PersistentVolume, PersistentVolumeClaim};
use k8s_openapi::api::apps::v1::{Deployment, StatefulSet, DaemonSet};
use k8s_openapi::api::batch::v1::{Job, CronJob};
use k8s_openapi::api::networking::v1::Ingress;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use futures::{TryStreamExt, StreamExt};
use tauri::Emitter;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ResourceItem {
    pub name: String,
    pub namespace: Option<String>,
    pub age: Option<String>,
    pub status: Option<String>,
    pub raw: Value,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ResourcePage {
    pub items: Vec<ResourceItem>,
    pub continue_token: Option<String>,
}

/// 리소스 타입의 API 메타 정보 (resources.rs가 single source of truth)
#[derive(Debug, Clone)]
pub struct ResourceApiInfo {
    pub kind: &'static str,
    pub group: &'static str,
    pub version: &'static str,
    pub api_version: &'static str,
    pub plural: &'static str,
    pub cluster_scoped: bool,
}

/// 알려진 모든 resource_type 목록 (resource_api_info의 key 집합)
pub const ALL_RESOURCE_TYPES: &[&str] = &[
    "pods", "deployments", "services", "configmaps", "secrets",
    "statefulsets", "daemonsets", "ingress", "namespaces", "nodes",
    "jobs", "cronjobs", "persistentvolumes", "persistentvolumeclaims",
];

/// kind (Pascal case, 대소문자 무관) → ResourceApiInfo 조회
pub fn resource_api_info_by_kind(kind: &str) -> Option<ResourceApiInfo> {
    ALL_RESOURCE_TYPES.iter().find_map(|rt| {
        let info = resource_api_info(rt)?;
        if info.kind.eq_ignore_ascii_case(kind) { Some(info) } else { None }
    })
}

pub fn resource_api_info(resource_type: &str) -> Option<ResourceApiInfo> {
    Some(match resource_type {
        "pods"                   => ResourceApiInfo { kind: "Pod",                    group: "",                  version: "v1", api_version: "v1",                     plural: "pods",                    cluster_scoped: false },
        "deployments"            => ResourceApiInfo { kind: "Deployment",             group: "apps",              version: "v1", api_version: "apps/v1",                plural: "deployments",             cluster_scoped: false },
        "services"               => ResourceApiInfo { kind: "Service",                group: "",                  version: "v1", api_version: "v1",                     plural: "services",                cluster_scoped: false },
        "configmaps"             => ResourceApiInfo { kind: "ConfigMap",              group: "",                  version: "v1", api_version: "v1",                     plural: "configmaps",              cluster_scoped: false },
        "secrets"                => ResourceApiInfo { kind: "Secret",                 group: "",                  version: "v1", api_version: "v1",                     plural: "secrets",                 cluster_scoped: false },
        "statefulsets"           => ResourceApiInfo { kind: "StatefulSet",            group: "apps",              version: "v1", api_version: "apps/v1",                plural: "statefulsets",            cluster_scoped: false },
        "daemonsets"             => ResourceApiInfo { kind: "DaemonSet",              group: "apps",              version: "v1", api_version: "apps/v1",                plural: "daemonsets",              cluster_scoped: false },
        "ingress"                => ResourceApiInfo { kind: "Ingress",                group: "networking.k8s.io", version: "v1", api_version: "networking.k8s.io/v1",   plural: "ingresses",               cluster_scoped: false },
        "namespaces"             => ResourceApiInfo { kind: "Namespace",              group: "",                  version: "v1", api_version: "v1",                     plural: "namespaces",              cluster_scoped: true  },
        "nodes"                  => ResourceApiInfo { kind: "Node",                   group: "",                  version: "v1", api_version: "v1",                     plural: "nodes",                   cluster_scoped: true  },
        "jobs"                   => ResourceApiInfo { kind: "Job",                    group: "batch",             version: "v1", api_version: "batch/v1",               plural: "jobs",                    cluster_scoped: false },
        "cronjobs"               => ResourceApiInfo { kind: "CronJob",               group: "batch",             version: "v1", api_version: "batch/v1",               plural: "cronjobs",                cluster_scoped: false },
        "persistentvolumes"      => ResourceApiInfo { kind: "PersistentVolume",      group: "",                  version: "v1", api_version: "v1",                     plural: "persistentvolumes",       cluster_scoped: true  },
        "persistentvolumeclaims" => ResourceApiInfo { kind: "PersistentVolumeClaim", group: "",                  version: "v1", api_version: "v1",                     plural: "persistentvolumeclaims",  cluster_scoped: false },
        _ => return None,
    })
}

pub async fn list_resources(
    client: Client,
    resource_type: &str,
    namespace: Option<&str>,
    limit: Option<u32>,
    continue_token: Option<String>,
) -> Result<ResourcePage, String> {
    match resource_type {
        "pods" => list_typed::<Pod, _>(client, namespace, limit, continue_token, |p| {
            p.status.as_ref().and_then(|s| s.phase.clone())
        }).await,
        "deployments" => list_typed::<Deployment, _>(client, namespace, limit, continue_token, |d| {
            d.status.as_ref().map(|s| format!("{}/{}", s.ready_replicas.unwrap_or(0), s.replicas.unwrap_or(0)))
        }).await,
        "services" => list_typed::<Service, _>(client, namespace, limit, continue_token, |s| {
            s.spec.as_ref().and_then(|sp| sp.type_.clone())
        }).await,
        "statefulsets" => list_typed::<StatefulSet, _>(client, namespace, limit, continue_token, |ss| {
            ss.status.as_ref().map(|s| format!("{}/{}", s.ready_replicas.unwrap_or(0), s.replicas))
        }).await,
        "daemonsets" => list_typed::<DaemonSet, _>(client, namespace, limit, continue_token, |ds| {
            ds.status.as_ref().map(|s| format!("{}/{}", s.number_ready, s.desired_number_scheduled))
        }).await,
        "configmaps" => list_typed::<ConfigMap, _>(client, namespace, limit, continue_token, |_| None).await,
        "secrets" => list_typed::<Secret, _>(client, namespace, limit, continue_token, |_| None).await,
        "ingress" => list_typed::<Ingress, _>(client, namespace, limit, continue_token, |_| None).await,
        "namespaces" => list_cluster_typed::<Namespace, _>(client, limit, continue_token, |n| {
            n.status.as_ref().and_then(|s| s.phase.clone())
        }).await,
        "nodes" => list_cluster_typed::<Node, _>(client, limit, continue_token, |n| {
            n.status.as_ref()
                .and_then(|s| s.conditions.as_ref())
                .and_then(|cs| cs.iter().find(|c| c.type_ == "Ready"))
                .map(|c| if c.status == "True" { "Ready".to_string() } else { "NotReady".to_string() })
        }).await,
        "jobs" => list_typed::<Job, _>(client, namespace, limit, continue_token, |j| {
            j.status.as_ref().map(|s| {
                format!("active:{} succeeded:{} failed:{}",
                    s.active.unwrap_or(0),
                    s.succeeded.unwrap_or(0),
                    s.failed.unwrap_or(0))
            })
        }).await,
        "cronjobs" => list_typed::<CronJob, _>(client, namespace, limit, continue_token, |c| {
            c.status.as_ref()
                .and_then(|s| s.last_schedule_time.as_ref())
                .map(|t| t.0.to_rfc3339())
        }).await,
        "persistentvolumes" => list_cluster_typed::<PersistentVolume, _>(client, limit, continue_token, |pv| {
            pv.status.as_ref().and_then(|s| s.phase.clone())
        }).await,
        "persistentvolumeclaims" => list_typed::<PersistentVolumeClaim, _>(client, namespace, limit, continue_token, |pvc| {
            pvc.status.as_ref().and_then(|s| s.phase.clone())
        }).await,
        _ => Err(format!("Unknown resource type: {}", resource_type)),
    }
}

async fn list_typed<K, F>(
    client: Client,
    namespace: Option<&str>,
    limit: Option<u32>,
    continue_token: Option<String>,
    extract_status: F,
) -> Result<ResourcePage, String>
where
    K: kube::Resource<Scope = NamespaceResourceScope> + Clone + serde::de::DeserializeOwned + serde::Serialize + std::fmt::Debug + 'static,
    K::DynamicType: Default,
    F: Fn(&K) -> Option<String>,
{
    let api: Api<K> = match namespace {
        Some(ns) => Api::namespaced(client, ns),
        None => Api::all(client),
    };
    let mut lp = ListParams::default();
    if let Some(l) = limit {
        lp = lp.limit(l);
    }
    if let Some(ref tok) = continue_token {
        lp = lp.continue_token(tok);
    }
    let obj_list = api
        .list(&lp)
        .await
        .map_err(|e| e.to_string())?;
    let continue_token = obj_list.metadata.continue_.clone();
    let items = obj_list
        .items
        .iter()
        .map(|item| to_resource_item_with_status(item, extract_status(item)))
        .collect();
    Ok(ResourcePage { items, continue_token })
}

async fn list_cluster_typed<K, F>(
    client: Client,
    limit: Option<u32>,
    continue_token: Option<String>,
    extract_status: F,
) -> Result<ResourcePage, String>
where
    K: kube::Resource + Clone + serde::de::DeserializeOwned + serde::Serialize + std::fmt::Debug + 'static,
    K::DynamicType: Default,
    F: Fn(&K) -> Option<String>,
{
    let api: Api<K> = Api::all(client);
    let mut lp = ListParams::default();
    if let Some(l) = limit {
        lp = lp.limit(l);
    }
    if let Some(ref tok) = continue_token {
        lp = lp.continue_token(tok);
    }
    let obj_list = api
        .list(&lp)
        .await
        .map_err(|e| e.to_string())?;
    let continue_token = obj_list.metadata.continue_.clone();
    let items = obj_list
        .items
        .iter()
        .map(|item| to_resource_item_with_status(item, extract_status(item)))
        .collect();
    Ok(ResourcePage { items, continue_token })
}

fn to_resource_item_with_status<K>(item: &K, status: Option<String>) -> ResourceItem
where
    K: kube::Resource + serde::Serialize,
    K::DynamicType: Default,
{
    let mut raw = serde_json::to_value(item).unwrap_or(Value::Null);
    // Strip sensitive fields from Secret objects
    if K::kind(&K::DynamicType::default()) == "Secret" {
        if let Some(obj) = raw.as_object_mut() {
            obj.remove("data");
            obj.remove("stringData");
        }
    }
    ResourceItem {
        name: item.meta().name.clone().unwrap_or_default(),
        namespace: item.meta().namespace.clone(),
        age: item
            .meta()
            .creation_timestamp
            .as_ref()
            .map(|t| t.0.to_rfc3339()),
        status,
        raw,
    }
}

pub async fn watch_resources(
    client: Client,
    app: tauri::AppHandle,
    resource_type: String,
    namespace: Option<String>,
    panel_id: String,
) -> Result<(), String> {
    let event_name = format!("resource-update-{}", panel_id);

    if resource_type == "pods" {
        let api: Api<Pod> = match &namespace {
            Some(ns) => Api::namespaced(client, ns),
            None => Api::all(client),
        };
        let mut stream = watcher(api, Default::default()).boxed();
        while let Some(event) = stream
            .try_next()
            .await
            .map_err(|e: kube::runtime::watcher::Error| e.to_string())?
        {
            match event {
                Event::Applied(pod) => {
                    let status = pod.status.as_ref().and_then(|s| s.phase.clone());
                    let item = to_resource_item_with_status(&pod, status);
                    app.emit(&event_name, &item).map_err(|e| e.to_string())?;
                }
                Event::Deleted(pod) => {
                    let name = pod.metadata.name.clone().unwrap_or_default();
                    let ns = pod.metadata.namespace.clone();
                    app.emit(
                        &event_name,
                        serde_json::json!({"type": "deleted", "name": name, "namespace": ns}),
                    )
                    .map_err(|e| e.to_string())?;
                }
                Event::Restarted(pods) => {
                    let items: Vec<ResourceItem> = pods.iter().map(|pod| {
                        let status = pod.status.as_ref().and_then(|s| s.phase.clone());
                        to_resource_item_with_status(pod, status)
                    }).collect();
                    app.emit(&event_name, serde_json::json!({"type": "restarted", "items": items}))
                        .map_err(|e| e.to_string())?;
                }
            }
        }
    } else {
        // 모든 리소스 타입에 kube-rs DynamicObject watcher 사용 (30s 폴링 제거)
        let info = resource_api_info(&resource_type)
            .ok_or_else(|| format!("Unknown resource type: {}", resource_type))?;
        let ar = ApiResource {
            group: info.group.to_string(),
            version: info.version.to_string(),
            kind: info.kind.to_string(),
            api_version: info.api_version.to_string(),
            plural: info.plural.to_string(),
        };
        let api: Api<DynamicObject> = if info.cluster_scoped {
            Api::all_with(client, &ar)
        } else {
            match &namespace {
                Some(ns) => Api::namespaced_with(client, ns, &ar),
                None => Api::all_with(client, &ar),
            }
        };
        let mut stream = watcher(api, Default::default()).boxed();
        while let Some(event) = stream
            .try_next()
            .await
            .map_err(|e: kube::runtime::watcher::Error| e.to_string())?
        {
            match event {
                Event::Applied(_) | Event::Restarted(_) => {
                    // 상태 추출은 typed API(list_resources)가 담당 → refresh 신호로 재조회 유도
                    app.emit(&event_name, serde_json::json!({"type": "refresh"}))
                        .map_err(|e| e.to_string())?;
                }
                Event::Deleted(obj) => {
                    let name = obj.metadata.name.clone().unwrap_or_default();
                    let ns = obj.metadata.namespace.clone();
                    app.emit(
                        &event_name,
                        serde_json::json!({"type": "deleted", "name": name, "namespace": ns}),
                    )
                    .map_err(|e| e.to_string())?;
                }
            }
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use k8s_openapi::api::core::v1::Pod;
    use k8s_openapi::apimachinery::pkg::apis::meta::v1::ObjectMeta;

    #[test]
    fn test_to_resource_item_sets_name_and_namespace() {
        let mut pod = Pod::default();
        pod.metadata = ObjectMeta {
            name: Some("test-pod".to_string()),
            namespace: Some("default".to_string()),
            ..Default::default()
        };
        let item = to_resource_item_with_status(&pod, Some("Running".to_string()));
        assert_eq!(item.name, "test-pod");
        assert_eq!(item.namespace, Some("default".to_string()));
        assert_eq!(item.status, Some("Running".to_string()));
    }

    #[test]
    fn test_to_resource_item_status_none() {
        let mut pod = Pod::default();
        pod.metadata = ObjectMeta {
            name: Some("no-status-pod".to_string()),
            ..Default::default()
        };
        let item = to_resource_item_with_status(&pod, None);
        assert_eq!(item.name, "no-status-pod");
        assert!(item.status.is_none());
    }

    #[test]
    fn test_secret_strips_data_and_string_data() {
        use k8s_openapi::api::core::v1::Secret;
        use k8s_openapi::ByteString;
        use std::collections::BTreeMap;

        let mut secret = Secret::default();
        secret.metadata = ObjectMeta {
            name: Some("my-secret".to_string()),
            ..Default::default()
        };
        secret.data = Some(BTreeMap::from([
            ("password".to_string(), ByteString(b"secret123".to_vec())),
        ]));

        let item = to_resource_item_with_status(&secret, None);
        assert_eq!(item.name, "my-secret");
        // data 필드가 제거되어야 함
        assert!(item.raw.get("data").is_none() || item.raw["data"].is_null());
    }

    #[test]
    fn test_to_resource_item_without_namespace() {
        use k8s_openapi::apimachinery::pkg::apis::meta::v1::ObjectMeta;

        let mut pod = Pod::default();
        pod.metadata = ObjectMeta {
            name: Some("cluster-wide-pod".to_string()),
            namespace: None,
            ..Default::default()
        };
        let item = to_resource_item_with_status(&pod, Some("Running".to_string()));
        assert_eq!(item.name, "cluster-wide-pod");
        assert!(item.namespace.is_none());
    }

    #[test]
    fn test_resource_item_serializable() {
        use k8s_openapi::apimachinery::pkg::apis::meta::v1::ObjectMeta;

        let mut pod = Pod::default();
        pod.metadata = ObjectMeta {
            name: Some("test-pod".to_string()),
            namespace: Some("default".to_string()),
            ..Default::default()
        };
        let item = to_resource_item_with_status(&pod, Some("Running".to_string()));
        // serde_json 직렬화 가능한지 확인
        let json = serde_json::to_string(&item);
        assert!(json.is_ok());
        let serialized = json.unwrap();
        assert!(serialized.contains("test-pod"));
    }

    #[test]
    fn test_to_resource_item_age_none_when_no_creation_timestamp() {
        use k8s_openapi::apimachinery::pkg::apis::meta::v1::ObjectMeta;

        let mut pod = Pod::default();
        pod.metadata = ObjectMeta {
            name: Some("pod-no-ts".to_string()),
            ..Default::default()
        };
        let item = to_resource_item_with_status(&pod, None);
        // creation_timestamp가 없으면 age는 None
        assert!(item.age.is_none());
    }

    #[test]
    fn test_event_name_format_for_panel() {
        let panel_id = "panel-xyz";
        let event_name = format!("resource-update-{}", panel_id);
        assert_eq!(event_name, "resource-update-panel-xyz");
    }

    #[test]
    fn test_resource_item_default_name_when_metadata_empty() {
        let pod = Pod::default();
        let item = to_resource_item_with_status(&pod, None);
        // metadata.name이 없으면 빈 문자열
        assert_eq!(item.name, "");
    }
}
