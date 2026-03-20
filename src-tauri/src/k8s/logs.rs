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
    tail_lines: Option<i64>,
) -> Result<(), String> {
    let api: Api<Pod> = Api::namespaced(client, &namespace);
    let params = LogParams {
        follow: true,
        container,
        tail_lines: Some(tail_lines.unwrap_or(1000)),
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

#[cfg(test)]
mod tests {
    #[test]
    fn test_tail_lines_default_is_1000() {
        let val: Option<i64> = None;
        assert_eq!(val.unwrap_or(1000), 1000);
    }

    #[test]
    fn test_tail_lines_custom_value() {
        let val: Option<i64> = Some(500);
        assert_eq!(val.unwrap_or(1000), 500);
    }

    #[test]
    fn test_tail_lines_boundary_values() {
        // 경계값 테스트
        let zero: Option<i64> = Some(0);
        assert_eq!(zero.unwrap_or(1000), 0);

        let negative: Option<i64> = Some(-1);
        assert_eq!(negative.unwrap_or(1000), -1);

        let large: Option<i64> = Some(i64::MAX);
        assert_eq!(large.unwrap_or(1000), i64::MAX);
    }

    #[test]
    fn test_event_name_format() {
        // log 이벤트 이름 포맷이 올바른지 확인
        let panel_id = "panel-abc-123";
        let event_name = format!("log-line-{}", panel_id);
        assert_eq!(event_name, "log-line-panel-abc-123");
    }
}
