use tauri::{State, Emitter};
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
    tail_lines: Option<i64>,
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
        if let Err(e) = crate::k8s::logs::stream_logs(
            client, app.clone(), namespace, pod_name, container, panel_id_task.clone(), tail_lines,
        )
        .await
        {
            let _ = app.emit(&format!("log-error-{}", panel_id_task), e);
        }
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
