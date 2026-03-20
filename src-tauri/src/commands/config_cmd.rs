use tauri::State;
use crate::k8s::config::{list_contexts, ContextInfo};
use crate::state::AppState;

#[tauri::command]
pub fn get_contexts() -> Result<Vec<ContextInfo>, String> {
    list_contexts()
}

#[tauri::command]
pub async fn get_namespaces(
    state: State<'_, AppState>,
    context: String,
) -> Result<Vec<String>, String> {
    // 캐시 확인
    if let Some(cached) = state.get_cached_namespaces(&context).await {
        return Ok(cached);
    }

    use k8s_openapi::api::core::v1::Namespace;
    use kube::Api;

    let client = state.get_or_create_client(&context).await?;
    let api: Api<Namespace> = Api::all(client);
    let list = api
        .list(&Default::default())
        .await
        .map_err(|e| e.to_string())?;
    let namespaces: Vec<String> = list
        .items
        .iter()
        .filter_map(|n| n.metadata.name.clone())
        .collect();

    // 캐시 저장
    state.cache_namespaces(&context, namespaces.clone()).await;

    Ok(namespaces)
}
