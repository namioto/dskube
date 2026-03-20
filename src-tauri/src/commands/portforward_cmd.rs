use tauri::State;
use crate::state::{AppState, PortForwardInfo};
use tokio::net::TcpListener;
use tokio::process::Command;

#[tauri::command]
pub async fn cmd_start_port_forward(
    state: State<'_, AppState>,
    context: String,
    namespace: String,
    pod_name: String,
    pod_port: u16,
    local_port: Option<u16>,
) -> Result<u16, String> {
    // 로컬 포트 결정 (None이면 빈 포트 자동 선택)
    let actual_port = if let Some(p) = local_port {
        p
    } else {
        let listener = TcpListener::bind("127.0.0.1:0")
            .await
            .map_err(|e| e.to_string())?;
        let port = listener.local_addr().map_err(|e| e.to_string())?.port();
        drop(listener); // kubectl이 바인딩할 수 있도록 해제
        port
    };

    let key = format!("{}/{}:{}", namespace, pod_name, pod_port);

    // 이미 포워딩 중이면 중지
    {
        let mut handles = state.port_forward_handles.lock().await;
        if let Some(handle) = handles.remove(&key) {
            handle.abort();
        }
    }

    let context_clone = context.clone();
    let namespace_clone = namespace.clone();
    let pod_name_clone = pod_name.clone();
    let port_arg = format!("{}:{}", actual_port, pod_port);

    let handle = tokio::spawn(async move {
        let _ = Command::new("kubectl")
            .args([
                "port-forward",
                &format!("pod/{}", pod_name_clone),
                &port_arg,
                "-n", &namespace_clone,
                "--context", &context_clone,
            ])
            .kill_on_drop(true)
            .status()
            .await;
    });

    state.port_forward_handles.lock().await.insert(key.clone(), handle);
    state.port_forward_info.lock().await.insert(key.clone(), PortForwardInfo {
        key,
        local_port: actual_port,
        pod_name,
        pod_port,
        namespace,
    });

    Ok(actual_port)
}

#[tauri::command]
pub async fn cmd_stop_port_forward(
    state: State<'_, AppState>,
    key: String,
) -> Result<(), String> {
    if let Some(handle) = state.port_forward_handles.lock().await.remove(&key) {
        handle.abort();
    }
    state.port_forward_info.lock().await.remove(&key);
    Ok(())
}

#[tauri::command]
pub async fn cmd_list_port_forwards(
    state: State<'_, AppState>,
) -> Result<Vec<PortForwardInfo>, String> {
    Ok(state.port_forward_info.lock().await.values().cloned().collect())
}
