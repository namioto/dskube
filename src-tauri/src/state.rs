use std::collections::HashMap;
use std::sync::Mutex;
use kube::Client;
use serde_json::Value;

pub struct AppState {
    pub clients: Mutex<HashMap<String, Client>>,
    pub pending_panel_states: Mutex<HashMap<String, Value>>,
}

impl AppState {
    pub fn new() -> Self {
        AppState {
            clients: Mutex::new(HashMap::new()),
            pending_panel_states: Mutex::new(HashMap::new()),
        }
    }

    pub async fn get_or_create_client(&self, context: &str) -> Result<Client, String> {
        {
            let clients = self.clients.lock().unwrap();
            if let Some(client) = clients.get(context) {
                return Ok(client.clone());
            }
        }
        let client = crate::k8s::client::build_client(context).await?;
        self.clients
            .lock()
            .unwrap()
            .insert(context.to_string(), client.clone());
        Ok(client)
    }
}
