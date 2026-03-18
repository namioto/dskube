use kube::{Client, Api};
use kube::api::ListParams;
use kube::runtime::watcher;
use kube::runtime::WatchStreamExt;
use kube::core::NamespaceResourceScope;
use k8s_openapi::api::core::v1::{Pod, ConfigMap, Service, Secret, Namespace, Node};
use k8s_openapi::api::apps::v1::{Deployment, StatefulSet, DaemonSet};
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

pub async fn list_resources(
    client: Client,
    resource_type: &str,
    namespace: Option<&str>,
) -> Result<Vec<ResourceItem>, String> {
    match resource_type {
        "pods" => list_namespaced::<Pod>(client, namespace).await,
        "deployments" => list_namespaced::<Deployment>(client, namespace).await,
        "services" => list_namespaced::<Service>(client, namespace).await,
        "configmaps" => list_namespaced::<ConfigMap>(client, namespace).await,
        "secrets" => list_namespaced::<Secret>(client, namespace).await,
        "statefulsets" => list_namespaced::<StatefulSet>(client, namespace).await,
        "daemonsets" => list_namespaced::<DaemonSet>(client, namespace).await,
        "ingress" => list_namespaced::<Ingress>(client, namespace).await,
        "namespaces" => list_cluster::<Namespace>(client).await,
        "nodes" => list_cluster::<Node>(client).await,
        _ => Err(format!("Unknown resource type: {}", resource_type)),
    }
}

async fn list_namespaced<K>(client: Client, namespace: Option<&str>) -> Result<Vec<ResourceItem>, String>
where
    K: kube::Resource<Scope = NamespaceResourceScope>
        + Clone
        + std::fmt::Debug
        + serde::de::DeserializeOwned
        + serde::Serialize
        + 'static,
    K::DynamicType: Default,
{
    let api: Api<K> = match namespace {
        Some(ns) => Api::namespaced(client, ns),
        None => Api::all(client),
    };
    let list = api
        .list(&ListParams::default())
        .await
        .map_err(|e| e.to_string())?;
    Ok(list.items.iter().map(to_resource_item).collect())
}

async fn list_cluster<K>(client: Client) -> Result<Vec<ResourceItem>, String>
where
    K: kube::Resource
        + Clone
        + std::fmt::Debug
        + serde::de::DeserializeOwned
        + serde::Serialize
        + 'static,
    K::DynamicType: Default,
{
    let api: Api<K> = Api::all(client);
    let list = api
        .list(&ListParams::default())
        .await
        .map_err(|e| e.to_string())?;
    Ok(list.items.iter().map(to_resource_item).collect())
}

fn to_resource_item<K>(item: &K) -> ResourceItem
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
        status: None,
        raw,
    }
}

pub async fn watch_resources(
    client: Client,
    app: tauri::AppHandle,
    resource_type: String,
    namespace: Option<String>,
    panel_id: String,
    context: String,
) -> Result<(), String> {
    let event_name = format!("resource-update-{}", panel_id);

    if resource_type == "pods" {
        let api: Api<Pod> = match &namespace {
            Some(ns) => Api::namespaced(client, ns),
            None => Api::all(client),
        };
        let mut stream = watcher(api, Default::default())
            .applied_objects()
            .boxed();
        while let Some(pod) = stream
            .try_next()
            .await
            .map_err(|e: kube::runtime::watcher::Error| e.to_string())?
        {
            let item = ResourceItem {
                name: pod.metadata.name.clone().unwrap_or_default(),
                namespace: pod.metadata.namespace.clone(),
                age: pod
                    .metadata
                    .creation_timestamp
                    .as_ref()
                    .map(|t| t.0.to_rfc3339()),
                status: pod.status.as_ref().and_then(|s| s.phase.clone()),
                raw: serde_json::to_value(&pod).unwrap_or(Value::Null),
            };
            app.emit(&event_name, &item).map_err(|e| e.to_string())?;
        }
    } else {
        // Non-Pod 리소스는 30초마다 refresh 이벤트 emit
        loop {
            tokio::time::sleep(tokio::time::Duration::from_secs(30)).await;
            app.emit(
                &event_name,
                serde_json::json!({"type": "refresh", "context": context}),
            )
            .map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}
