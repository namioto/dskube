use std::collections::HashMap;
use tokio::sync::Mutex;
use kube::Client;
use serde_json::Value;
use tauri::async_runtime::JoinHandle;

pub struct AppState {
    pub clients: Mutex<HashMap<String, Client>>,
    pub pending_panel_states: Mutex<HashMap<String, Value>>,
    pub watch_handles: Mutex<HashMap<String, JoinHandle<()>>>,
    pub log_handles: Mutex<HashMap<String, JoinHandle<()>>>,
}

impl AppState {
    pub fn new() -> Self {
        AppState {
            clients: Mutex::new(HashMap::new()),
            pending_panel_states: Mutex::new(HashMap::new()),
            watch_handles: Mutex::new(HashMap::new()),
            log_handles: Mutex::new(HashMap::new()),
        }
    }

    pub async fn get_or_create_client(&self, context: &str) -> Result<Client, String> {
        {
            let clients = self.clients.lock().await;
            if let Some(client) = clients.get(context) {
                return Ok(client.clone());
            }
        }
        let client = crate::k8s::client::build_client(context).await?;
        self.clients
            .lock()
            .await
            .insert(context.to_string(), client.clone());
        Ok(client)
    }
}
