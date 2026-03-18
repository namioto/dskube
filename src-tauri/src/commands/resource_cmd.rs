use tauri::State;
use crate::state::AppState;
use crate::k8s::resources::{list_resources, ResourceItem};

#[tauri::command]
pub async fn cmd_list_resources(
    state: State<'_, AppState>,
    context: String,
    resource_type: String,
    namespace: Option<String>,
) -> Result<Vec<ResourceItem>, String> {
    let client = state.get_or_create_client(&context).await?;
    list_resources(client, &resource_type, namespace.as_deref()).await
}

#[tauri::command]
pub async fn cmd_watch_resources(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
    context: String,
    resource_type: String,
    namespace: Option<String>,
    panel_id: String,
) -> Result<(), String> {
    let client = state.get_or_create_client(&context).await?;
    tauri::async_runtime::spawn(crate::k8s::resources::watch_resources(
        client,
        app,
        resource_type,
        namespace,
        panel_id,
        context,
    ));
    Ok(())
}

#[tauri::command]
pub async fn open_panel_window(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
    panel_id: String,
    panel_state: serde_json::Value,
) -> Result<(), String> {
    {
        let mut pending = state.pending_panel_states.lock().unwrap();
        pending.insert(panel_id.clone(), panel_state);
    }

    tauri::WebviewWindowBuilder::new(
        &app,
        format!("panel-{}", panel_id),
        tauri::WebviewUrl::App(format!("index.html?panel={}", panel_id).into()),
    )
    .title(format!("dskube panel"))
    .inner_size(800.0, 600.0)
    .build()
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn get_panel_init_state(
    state: State<'_, AppState>,
    panel_id: String,
) -> Option<serde_json::Value> {
    state
        .pending_panel_states
        .lock()
        .unwrap()
        .remove(&panel_id)
}

#[tauri::command]
pub async fn cmd_apply_resource(
    state: State<'_, AppState>,
    context: String,
    yaml: String,
) -> Result<(), String> {
    use kube::api::{DynamicObject, Patch, PatchParams};
    use kube::core::ApiResource;

    let client = state.get_or_create_client(&context).await?;
    let value: serde_json::Value =
        serde_yaml::from_str(&yaml).map_err(|e| e.to_string())?;

    let kind_str = value["kind"]
        .as_str()
        .unwrap_or_default()
        .to_string();
    let name = value["metadata"]["name"]
        .as_str()
        .unwrap_or_default()
        .to_string();
    let namespace = value["metadata"]["namespace"]
        .as_str()
        .map(|s| s.to_string());

    let api_version = value["apiVersion"].as_str().unwrap_or("v1");
    let (group, version) = if api_version.contains('/') {
        let mut parts = api_version.splitn(2, '/');
        (
            parts.next().unwrap_or("").to_string(),
            parts.next().unwrap_or("v1").to_string(),
        )
    } else {
        ("".to_string(), api_version.to_string())
    };

    let plural = format!("{}s", kind_str.to_lowercase());
    let ar = ApiResource {
        group,
        version,
        kind: kind_str,
        api_version: api_version.to_string(),
        plural,
    };

    let api: kube::Api<DynamicObject> = match namespace {
        Some(ns) => kube::Api::namespaced_with(client, &ns, &ar),
        None => kube::Api::all_with(client, &ar),
    };

    let patch: DynamicObject =
        serde_json::from_value(value).map_err(|e| e.to_string())?;
    api.patch(
        &name,
        &PatchParams::apply("dskube"),
        &Patch::Apply(&patch),
    )
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}
