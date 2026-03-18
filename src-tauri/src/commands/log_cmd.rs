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
    // Cancel existing log stream for this panel
    {
        let mut handles = state.log_handles.lock().await;
        if let Some(handle) = handles.remove(&panel_id) {
            handle.abort();
        }
    }

    let client = state.get_or_create_client(&context).await?;
    let panel_id_task = panel_id.clone();
    let handle = tauri::async_runtime::spawn(async move {
        let _ = crate::k8s::logs::stream_logs(
            client, app, namespace, pod_name, container, panel_id_task,
        )
        .await;
    });
    state.log_handles.lock().await.insert(panel_id, handle);
    Ok(())
}

#[tauri::command]
pub async fn cmd_stop_logs(
    state: State<'_, AppState>,
    panel_id: String,
) -> Result<(), String> {
    let mut handles = state.log_handles.lock().await;
    if let Some(handle) = handles.remove(&panel_id) {
        handle.abort();
    }
    Ok(())
}
