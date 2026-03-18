use crate::k8s::config::{list_contexts, ContextInfo};

#[tauri::command]
pub fn get_contexts() -> Result<Vec<ContextInfo>, String> {
    list_contexts()
}

#[tauri::command]
pub async fn get_namespaces(context: String) -> Result<Vec<String>, String> {
    use crate::k8s::client::build_client;
    use k8s_openapi::api::core::v1::Namespace;
    use kube::Api;

    let client = build_client(&context).await?;
    let api: Api<Namespace> = Api::all(client);
    let list = api
        .list(&Default::default())
        .await
        .map_err(|e| e.to_string())?;
    Ok(list
        .items
        .iter()
        .filter_map(|n| n.metadata.name.clone())
        .collect())
}
