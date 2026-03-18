use kube::{Client, Api};
use k8s_openapi::api::core::v1::Pod;
use kube::api::LogParams;
use futures::AsyncBufReadExt;
use futures::TryStreamExt;
use tauri::Emitter;

pub async fn stream_logs(
    client: Client,
    app: tauri::AppHandle,
    namespace: String,
    pod_name: String,
    container: Option<String>,
    panel_id: String,
) -> Result<(), String> {
    let api: Api<Pod> = Api::namespaced(client, &namespace);
    let params = LogParams {
        follow: true,
        container,
        tail_lines: Some(100),
        ..Default::default()
    };

    let stream = api
        .log_stream(&pod_name, &params)
        .await
        .map_err(|e| e.to_string())?;

    let event_name = format!("log-line-{}", panel_id);
    let mut lines = stream.lines();

    while let Some(line) = lines.try_next().await.map_err(|e| e.to_string())? {
        app.emit(&event_name, line).map_err(|e| e.to_string())?;
    }

    Ok(())
}
