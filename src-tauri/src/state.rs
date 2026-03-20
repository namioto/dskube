use std::collections::HashMap;
use std::time::{Duration, Instant};
use tokio::sync::Mutex;
use kube::Client;
use serde::{Serialize, Deserialize};
use serde_json::Value;
use tauri::async_runtime::JoinHandle;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PortForwardInfo {
    pub key: String,
    pub local_port: u16,
    pub pod_name: String,
    pub pod_port: u16,
    pub namespace: String,
}

const CLIENT_TTL: Duration = Duration::from_secs(10 * 60); // 10분
const NAMESPACE_CACHE_TTL: Duration = Duration::from_secs(30); // 30초 캐시

pub struct AppState {
    pub clients: Mutex<HashMap<String, (Client, Instant)>>,
    pub pending_panel_states: Mutex<HashMap<String, Value>>,
    pub watch_handles: Mutex<HashMap<String, JoinHandle<()>>>,
    pub log_handles: Mutex<HashMap<String, JoinHandle<()>>>,
    pub namespace_cache: Mutex<HashMap<String, (Vec<String>, Instant)>>,
    pub port_forward_handles: Mutex<HashMap<String, tokio::task::JoinHandle<()>>>,
    pub port_forward_info: Mutex<HashMap<String, PortForwardInfo>>,
    pub exec_stdin: Mutex<HashMap<String, tokio::sync::mpsc::Sender<bytes::Bytes>>>,
}

impl AppState {
    pub fn new() -> Self {
        AppState {
            clients: Mutex::new(HashMap::new()),
            pending_panel_states: Mutex::new(HashMap::new()),
            watch_handles: Mutex::new(HashMap::new()),
            log_handles: Mutex::new(HashMap::new()),
            namespace_cache: Mutex::new(HashMap::new()),
            port_forward_handles: Mutex::new(HashMap::new()),
            port_forward_info: Mutex::new(HashMap::new()),
            exec_stdin: Mutex::new(HashMap::new()),
        }
    }

    pub async fn get_or_create_client(&self, context: &str) -> Result<Client, String> {
        {
            let clients = self.clients.lock().await;
            if let Some((client, created_at)) = clients.get(context) {
                if created_at.elapsed() < CLIENT_TTL {
                    return Ok(client.clone());
                }
                // TTL 만료 → 재생성
            }
        }
        let client = crate::k8s::client::build_client(context).await?;
        self.clients
            .lock()
            .await
            .insert(context.to_string(), (client.clone(), Instant::now()));
        Ok(client)
    }

    /// 특정 컨텍스트의 클라이언트 캐시를 무효화 (에러 발생 시 호출 가능)
    #[allow(dead_code)]
    pub async fn invalidate_client(&self, context: &str) {
        self.clients.lock().await.remove(context);
    }

    pub async fn get_cached_namespaces(&self, context: &str) -> Option<Vec<String>> {
        let cache = self.namespace_cache.lock().await;
        if let Some((ns_list, cached_at)) = cache.get(context) {
            if cached_at.elapsed() < NAMESPACE_CACHE_TTL {
                return Some(ns_list.clone());
            }
        }
        None
    }

    pub async fn cache_namespaces(&self, context: &str, namespaces: Vec<String>) {
        self.namespace_cache
            .lock()
            .await
            .insert(context.to_string(), (namespaces, Instant::now()));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_new_state_has_empty_maps() {
        let state = AppState::new();
        assert!(state.clients.lock().await.is_empty());
        assert!(state.pending_panel_states.lock().await.is_empty());
        assert!(state.watch_handles.lock().await.is_empty());
        assert!(state.log_handles.lock().await.is_empty());
    }

    #[test]
    fn test_client_ttl_is_10_minutes() {
        assert_eq!(CLIENT_TTL, Duration::from_secs(600));
    }

    #[test]
    fn test_namespace_cache_ttl_is_30_seconds() {
        assert_eq!(NAMESPACE_CACHE_TTL, Duration::from_secs(30));
    }

    #[tokio::test]
    async fn test_get_cached_namespaces_returns_none_when_empty() {
        let state = AppState::new();
        let result = state.get_cached_namespaces("my-context").await;
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn test_cache_and_retrieve_namespaces() {
        let state = AppState::new();
        let ns = vec!["default".to_string(), "kube-system".to_string()];
        state.cache_namespaces("ctx", ns.clone()).await;
        let cached = state.get_cached_namespaces("ctx").await;
        assert_eq!(cached, Some(ns));
    }

    #[tokio::test]
    async fn test_cached_namespaces_different_contexts_independent() {
        let state = AppState::new();
        state.cache_namespaces("ctx-1", vec!["ns-a".to_string()]).await;
        state.cache_namespaces("ctx-2", vec!["ns-b".to_string()]).await;
        let ns1 = state.get_cached_namespaces("ctx-1").await;
        let ns2 = state.get_cached_namespaces("ctx-2").await;
        assert_eq!(ns1, Some(vec!["ns-a".to_string()]));
        assert_eq!(ns2, Some(vec!["ns-b".to_string()]));
    }

    #[tokio::test]
    async fn test_invalidate_client_removes_entry() {
        let state = AppState::new();
        // 직접 clients 맵에 더미 엔트리 삽입 불가 (Client가 실제 연결 필요)
        // invalidate_client가 존재하지 않는 키에 대해 패닉 없이 동작하는지 확인
        state.invalidate_client("nonexistent-context").await;
        assert!(state.clients.lock().await.is_empty());
    }

    #[tokio::test]
    async fn test_pending_panel_state_insert_and_remove() {
        let state = AppState::new();
        let value = serde_json::json!({"test": "data"});
        state.pending_panel_states.lock().await.insert("panel-1".to_string(), value.clone());
        let removed = state.pending_panel_states.lock().await.remove("panel-1");
        assert_eq!(removed, Some(value));
        assert!(state.pending_panel_states.lock().await.is_empty());
    }

    #[tokio::test]
    async fn test_multiple_invalidate_calls_are_idempotent() {
        let state = AppState::new();
        // 존재하지 않는 컨텍스트를 여러 번 invalidate해도 패닉 없어야 함
        state.invalidate_client("ctx-1").await;
        state.invalidate_client("ctx-1").await;
        state.invalidate_client("ctx-2").await;
        assert!(state.clients.lock().await.is_empty());
    }

    #[tokio::test]
    async fn test_watch_handles_insert_and_abort() {
        use tauri::async_runtime;
        let state = AppState::new();

        // 간단한 task 생성
        let handle = async_runtime::spawn(async {
            tokio::time::sleep(tokio::time::Duration::from_secs(60)).await;
        });

        state.watch_handles.lock().await.insert("panel-1".to_string(), handle);
        assert_eq!(state.watch_handles.lock().await.len(), 1);

        // handle 제거 및 abort
        let removed = state.watch_handles.lock().await.remove("panel-1");
        assert!(removed.is_some());
        removed.unwrap().abort();
        assert!(state.watch_handles.lock().await.is_empty());
    }

    #[tokio::test]
    async fn test_log_handles_insert_and_abort() {
        use tauri::async_runtime;
        let state = AppState::new();

        let handle = async_runtime::spawn(async {
            tokio::time::sleep(tokio::time::Duration::from_secs(60)).await;
        });

        state.log_handles.lock().await.insert("log-panel-1".to_string(), handle);
        assert_eq!(state.log_handles.lock().await.len(), 1);

        let removed = state.log_handles.lock().await.remove("log-panel-1");
        assert!(removed.is_some());
        removed.unwrap().abort();
        assert!(state.log_handles.lock().await.is_empty());
    }
}
