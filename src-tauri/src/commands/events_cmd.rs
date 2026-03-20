use tauri::State;
use crate::state::AppState;
use k8s_openapi::api::core::v1::Event;
use kube::{Api, Client};
use kube::api::ListParams;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EventItem {
    pub type_: String,
    pub reason: String,
    pub message: String,
    pub object_name: String,
    pub object_kind: String,
    pub count: i32,
    pub age: Option<String>,
    pub namespace: Option<String>,
}

pub async fn list_events_inner(client: Client, namespace: Option<&str>) -> Result<Vec<EventItem>, String> {
    let api: Api<Event> = match namespace {
        Some(ns) => Api::namespaced(client, ns),
        None => Api::all(client),
    };
    let list = api
        .list(&ListParams::default())
        .await
        .map_err(|e| e.to_string())?;

    let mut items: Vec<EventItem> = list
        .items
        .iter()
        .map(|e| EventItem {
            type_: e.type_.clone().unwrap_or_else(|| "Normal".to_string()),
            reason: e.reason.clone().unwrap_or_default(),
            message: e.message.clone().unwrap_or_default(),
            object_name: e.involved_object.name.clone().unwrap_or_default(),
            object_kind: e.involved_object.kind.clone().unwrap_or_default(),
            count: e.count.unwrap_or(1),
            age: e.metadata.creation_timestamp.as_ref().map(|t| t.0.to_rfc3339()),
            namespace: e.metadata.namespace.clone(),
        })
        .collect();

    // Warning 먼저, 그 다음 최신순
    fn type_priority(t: &str) -> u8 {
        match t {
            "Warning" => 0,
            "Normal" => 1,
            _ => 2,
        }
    }
    items.sort_by(|a, b| {
        type_priority(&a.type_)
            .cmp(&type_priority(&b.type_))
            .then(b.age.cmp(&a.age))
    });

    Ok(items)
}

#[tauri::command]
pub async fn cmd_list_events(
    state: State<'_, AppState>,
    context: String,
    namespace: Option<String>,
    resource_name: Option<String>,
    resource_kind: Option<String>,
) -> Result<Vec<EventItem>, String> {
    let client = state.get_or_create_client(&context).await?;
    let mut items = list_events_inner(client, namespace.as_deref()).await?;

    if let Some(ref name) = resource_name {
        items.retain(|e| e.object_name == *name);
    }
    if let Some(ref kind) = resource_kind {
        items.retain(|e| e.object_kind.eq_ignore_ascii_case(kind.as_str()));
    }

    Ok(items)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_event_item_default_type() {
        let item = EventItem {
            type_: "Warning".to_string(),
            reason: "BackOff".to_string(),
            message: "Back-off restarting failed container".to_string(),
            object_name: "my-pod".to_string(),
            object_kind: "Pod".to_string(),
            count: 5,
            age: None,
            namespace: Some("default".to_string()),
        };
        assert_eq!(item.type_, "Warning");
        assert_eq!(item.count, 5);
    }

    #[test]
    fn test_event_item_serializable() {
        let item = EventItem {
            type_: "Normal".to_string(),
            reason: "Pulled".to_string(),
            message: "Successfully pulled image".to_string(),
            object_name: "my-pod".to_string(),
            object_kind: "Pod".to_string(),
            count: 1,
            age: Some("2024-01-01T00:00:00Z".to_string()),
            namespace: Some("default".to_string()),
        };
        let json = serde_json::to_string(&item);
        assert!(json.is_ok());
        assert!(json.unwrap().contains("Normal"));
    }
}
