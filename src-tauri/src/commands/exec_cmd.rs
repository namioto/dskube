use tauri::{State, Emitter};
use crate::state::AppState;
use k8s_openapi::api::core::v1::Pod;
use kube::Api;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use bytes::Bytes;

#[tauri::command]
pub async fn cmd_exec_pod(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
    context: String,
    namespace: String,
    pod_name: String,
    container: Option<String>,
    panel_id: String,
    command: Vec<String>,
) -> Result<(), String> {
    {
        let mut handles = state.log_handles.lock().await;
        if let Some(handle) = handles.remove(&panel_id) {
            handle.abort();
        }
    }
    state.exec_stdin.lock().await.remove(&panel_id);

    let client = state.get_or_create_client(&context).await?;
    let api: Api<Pod> = Api::namespaced(client, &namespace);

    let cmd: Vec<&str> = command.iter().map(|s| s.as_str()).collect();

    let mut attach_params = kube::api::AttachParams::default()
        .stdin(true)
        .stdout(true)
        .stderr(true);
    if let Some(ref c) = container {
        if !c.is_empty() {
            attach_params = attach_params.container(c);
        }
    }

    let mut attached = api.exec(&pod_name, cmd, &attach_params)
        .await
        .map_err(|e| e.to_string())?;

    let (tx, mut rx) = tokio::sync::mpsc::channel::<Bytes>(32);
    state.exec_stdin.lock().await.insert(panel_id.clone(), tx);

    let mut stdout = attached.stdout().ok_or("stdout 없음")?;
    let mut stderr = attached.stderr().ok_or("stderr 없음")?;
    let mut stdin  = attached.stdin().ok_or("stdin 없음")?;

    // stdout 읽기 태스크
    let app_out = app.clone();
    let panel_out = panel_id.clone();
    tokio::spawn(async move {
        let mut buf = vec![0u8; 4096];
        loop {
            match stdout.read(&mut buf).await {
                Ok(0) | Err(_) => break,
                Ok(n) => {
                    let s = String::from_utf8_lossy(&buf[..n]).to_string();
                    let _ = app_out.emit(&format!("exec-stdout-{}", panel_out), s);
                }
            }
        }
    });

    // stderr 읽기 태스크
    let app_err = app.clone();
    let panel_err = panel_id.clone();
    tokio::spawn(async move {
        let mut buf = vec![0u8; 4096];
        loop {
            match stderr.read(&mut buf).await {
                Ok(0) | Err(_) => break,
                Ok(n) => {
                    let s = String::from_utf8_lossy(&buf[..n]).to_string();
                    let _ = app_err.emit(&format!("exec-stdout-{}", panel_err), s);
                }
            }
        }
    });

    // stdin 처리 핸들 (rx 소비)
    let handle = tauri::async_runtime::spawn(async move {
        while let Some(data) = rx.recv().await {
            if stdin.write_all(&data[..]).await.is_err() {
                break;
            }
        }
    });

    state.log_handles.lock().await.insert(panel_id, handle);
    Ok(())
}

#[tauri::command]
pub async fn cmd_exec_send_input(
    state: State<'_, AppState>,
    panel_id: String,
    input: String,
) -> Result<(), String> {
    let tx = state.exec_stdin.lock().await
        .get(&panel_id)
        .cloned();
    if let Some(tx) = tx {
        tx.send(Bytes::from(input.into_bytes()))
            .await
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn cmd_stop_exec(
    state: State<'_, AppState>,
    panel_id: String,
) -> Result<(), String> {
    if let Some(handle) = state.log_handles.lock().await.remove(&panel_id) {
        handle.abort();
    }
    state.exec_stdin.lock().await.remove(&panel_id);
    Ok(())
}
