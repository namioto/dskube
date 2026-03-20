use tauri::State;
use crate::state::AppState;
use k8s_openapi::api::authorization::v1::{
    SelfSubjectAccessReview, SelfSubjectAccessReviewSpec, ResourceAttributes,
};
use kube::Api;

#[tauri::command]
pub async fn cmd_can_i(
    state: State<'_, AppState>,
    context: String,
    resource: String,
    verb: String,
    namespace: Option<String>,
) -> Result<bool, String> {
    let client = state.get_or_create_client(&context).await?;

    let review = SelfSubjectAccessReview {
        spec: SelfSubjectAccessReviewSpec {
            resource_attributes: Some(ResourceAttributes {
                namespace,
                verb: Some(verb),
                resource: Some(resource),
                ..Default::default()
            }),
            ..Default::default()
        },
        ..Default::default()
    };

    let api: Api<SelfSubjectAccessReview> = Api::all(client);
    let result = api
        .create(&kube::api::PostParams::default(), &review)
        .await
        .map_err(|e| e.to_string())?;

    Ok(result.status
        .map(|s| s.allowed)
        .unwrap_or(false))
}
