use tauri::State;
use crate::state::AppState;

#[tauri::command]
pub async fn cmd_stream_logs(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
    context: String,
    namespace: String,
    pod_name: String,
    container: Option<String>,
    panel_id: String,
) -> Result<(), String> {
    let client = state.get_or_create_client(&context).await?;
    tauri::async_runtime::spawn(crate::k8s::logs::stream_logs(
        client, app, namespace, pod_name, container, panel_id,
    ));
    Ok(())
}
