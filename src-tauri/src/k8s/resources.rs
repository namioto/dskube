use kube::{Client, Api};
use kube::api::ListParams;
use kube::runtime::watcher;
use kube::runtime::WatchStreamExt;
use k8s_openapi::api::core::v1::{Pod, ConfigMap, Service, Secret, Namespace, Node};
use k8s_openapi::api::apps::v1::{Deployment, StatefulSet, DaemonSet};
use k8s_openapi::api::networking::v1::Ingress;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use futures::TryStreamExt;
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
        "pods" => list_typed::<Pod>(client, namespace).await,
        "deployments" => list_typed::<Deployment>(client, namespace).await,
        "services" => list_typed::<Service>(client, namespace).await,
        "configmaps" => list_typed::<ConfigMap>(client, namespace).await,
        "secrets" => list_typed::<Secret>(client, namespace).await,
        "statefulsets" => list_typed::<StatefulSet>(client, namespace).await,
        "daemonsets" => list_typed::<DaemonSet>(client, namespace).await,
        "ingress" => list_typed::<Ingress>(client, namespace).await,
        "namespaces" => list_typed::<Namespace>(client, None).await,
        "nodes" => list_typed::<Node>(client, None).await,
        _ => Err(format!("Unknown resource type: {}", resource_type)),
    }
}

async fn list_typed<K>(client: Client, namespace: Option<&str>) -> Result<Vec<ResourceItem>, String>
where
    K: kube::Resource + Clone + serde::de::DeserializeOwned + std::fmt::Debug + 'static,
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
    Ok(list
        .items
        .iter()
        .map(|item| {
            let raw = serde_json::to_value(item).unwrap_or(Value::Null);
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
        })
        .collect())
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
        while let Some(pod) = stream.try_next().await.map_err(|e| e.to_string())? {
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
            app.emit(&event_name, serde_json::json!({"type": "refresh", "context": context}))
                .map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}
