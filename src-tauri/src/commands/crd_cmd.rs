use crate::state::AppState;
use crate::k8s::crd::{list_crds, CrdInfo};
use crate::k8s::resources::ResourceItem;
use kube::{api::{ApiResource, DynamicObject, ListParams}, Api};
use serde_json::Value;

#[tauri::command]
pub async fn cmd_list_crds(
    state: tauri::State<'_, AppState>,
    context: String,
) -> Result<Vec<CrdInfo>, String> {
    let client = state.get_or_create_client(&context).await?;
    list_crds(client).await
}

#[tauri::command]
pub async fn cmd_list_custom_resources(
    state: tauri::State<'_, AppState>,
    context: String,
    group: String,
    version: String,
    plural: String,
    kind: String,
    namespace: String,
) -> Result<Vec<ResourceItem>, String> {
    let client = state.get_or_create_client(&context).await?;

    let api_version = if group.is_empty() {
        version.clone()
    } else {
        format!("{}/{}", group, version)
    };

    let ar = ApiResource {
        group: group.clone(),
        version: version.clone(),
        api_version,
        kind,
        plural: plural.clone(),
    };

    let api: Api<DynamicObject> = if namespace.is_empty() || namespace == "all" {
        Api::all_with(client, &ar)
    } else {
        Api::namespaced_with(client, &namespace, &ar)
    };

    let list = api.list(&ListParams::default())
        .await
        .map_err(|e| e.to_string())?;

    let items = list.items.into_iter().map(|obj| {
        let raw: Value = serde_json::to_value(&obj).unwrap_or(Value::Null);
        let name = obj.metadata.name.clone().unwrap_or_default();
        let ns = obj.metadata.namespace.clone();
        let age = obj.metadata.creation_timestamp
            .as_ref()
            .map(|t| t.0.to_rfc3339());
        ResourceItem { name, namespace: ns, age, status: None, raw }
    }).collect();

    Ok(items)
}
