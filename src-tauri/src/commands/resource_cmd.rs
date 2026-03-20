use tauri::{State, Emitter};
use crate::state::AppState;
use crate::k8s::resources::{list_resources, ResourcePage, resource_api_info, resource_api_info_by_kind};

#[tauri::command]
pub async fn cmd_list_resources(
    state: State<'_, AppState>,
    context: String,
    resource_type: String,
    namespace: Option<String>,
    limit: Option<u32>,
    continue_token: Option<String>,
) -> Result<ResourcePage, String> {
    let client = state.get_or_create_client(&context).await?;
    list_resources(client, &resource_type, namespace.as_deref(), limit, continue_token).await
}

#[tauri::command]
pub async fn cmd_watch_resources(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
    context: String,
    resource_type: String,
    namespace: Option<String>,
    panel_id: String,
) -> Result<(), String> {
    // 기존 watch 태스크 취소
    {
        let mut handles = state.watch_handles.lock().await;
        if let Some(handle) = handles.remove(&panel_id) {
            handle.abort();
        }
    }

    let client = state.get_or_create_client(&context).await?;
    let panel_id_task = panel_id.clone();
    let handle = tauri::async_runtime::spawn(async move {
        if let Err(e) = crate::k8s::resources::watch_resources(
            client, app.clone(), resource_type, namespace, panel_id_task.clone(),
        )
        .await
        {
            let _ = app.emit(&format!("resource-error-{}", panel_id_task), e);
        }
    });

    state.watch_handles.lock().await.insert(panel_id, handle);
    Ok(())
}

#[tauri::command]
pub async fn cmd_stop_watch(
    state: State<'_, AppState>,
    panel_id: String,
) -> Result<(), String> {
    let mut handles = state.watch_handles.lock().await;
    if let Some(handle) = handles.remove(&panel_id) {
        handle.abort();
    }
    Ok(())
}

#[tauri::command]
pub async fn open_panel_window(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
    panel_id: String,
    panel_state: serde_json::Value,
) -> Result<(), String> {
    state
        .pending_panel_states
        .lock()
        .await
        .insert(panel_id.clone(), panel_state);

    tauri::WebviewWindowBuilder::new(
        &app,
        format!("panel-{}", panel_id),
        tauri::WebviewUrl::App(format!("index.html?panel={}", panel_id).into()),
    )
    .title("dskube panel")
    .inner_size(800.0, 600.0)
    .build()
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn get_panel_init_state(
    state: State<'_, AppState>,
    panel_id: String,
) -> Result<Option<serde_json::Value>, String> {
    Ok(state
        .pending_panel_states
        .lock()
        .await
        .remove(&panel_id))
}

#[tauri::command]
pub async fn cmd_apply_resource(
    state: State<'_, AppState>,
    context: String,
    yaml: String,
) -> Result<(), String> {
    use kube::api::{DynamicObject, Patch, PatchParams};
    use kube::core::ApiResource;

    let client = state.get_or_create_client(&context).await?;
    let value: serde_json::Value =
        serde_yaml::from_str(&yaml).map_err(|e| format!("Invalid YAML: {}", e))?;

    let kind_str = value["kind"]
        .as_str()
        .ok_or("Missing 'kind' field")?
        .to_string();

    // resource_api_info_by_kind 로 kind 유효성 검증 + API 정보 한 번에 조회
    let kind_info = resource_api_info_by_kind(&kind_str)
        .ok_or_else(|| format!("Unsupported kind: '{}'", kind_str))?;

    let name = value["metadata"]["name"]
        .as_str()
        .ok_or("Missing 'metadata.name' field")?
        .to_string();
    let namespace = value["metadata"]["namespace"]
        .as_str()
        .map(|s| s.to_string());

    let api_version = value["apiVersion"].as_str().unwrap_or("v1");
    let (group, version) = if api_version.contains('/') {
        let mut parts = api_version.splitn(2, '/');
        (
            parts.next().unwrap_or("").to_string(),
            parts.next().unwrap_or("v1").to_string(),
        )
    } else {
        ("".to_string(), api_version.to_string())
    };

    let plural = kind_info.plural.to_string();

    let ar = ApiResource {
        group,
        version,
        kind: kind_str,
        api_version: api_version.to_string(),
        plural,
    };
    let api: kube::Api<DynamicObject> = if kind_info.cluster_scoped {
        kube::Api::all_with(client, &ar)
    } else {
        let ns = namespace
            .ok_or("namespace is required in resource metadata for this type")?;
        kube::Api::namespaced_with(client, &ns, &ar)
    };

    let patch: DynamicObject =
        serde_json::from_value(value).map_err(|e| e.to_string())?;
    api.patch(
        &name,
        &PatchParams::apply("dskube"),
        &Patch::Apply(&patch),
    )
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

// ResourceApiInfo 및 resource_api_info 는 crate::k8s::resources 에서 import

#[tauri::command]
pub async fn cmd_delete_resource(
    state: State<'_, AppState>,
    context: String,
    resource_type: String,
    name: String,
    namespace: Option<String>,
) -> Result<(), String> {
    use kube::api::{DynamicObject, DeleteParams};
    use kube::core::ApiResource;

    let info = resource_api_info(&resource_type)
        .ok_or_else(|| format!("Unsupported resource type: {}", resource_type))?;
    let client = state.get_or_create_client(&context).await?;
    let ar = ApiResource {
        group: info.group.to_string(),
        version: info.version.to_string(),
        kind: info.kind.to_string(),
        api_version: info.api_version.to_string(),
        plural: info.plural.to_string(),
    };
    let api: kube::Api<DynamicObject> = if info.cluster_scoped {
        kube::Api::all_with(client, &ar)
    } else {
        let ns = namespace.as_deref()
            .ok_or_else(|| format!("namespace is required to delete {}", resource_type))?;
        kube::Api::namespaced_with(client, ns, &ar)
    };
    api.delete(&name, &DeleteParams::default())
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn cmd_scale_resource(
    state: State<'_, AppState>,
    context: String,
    resource_type: String,
    name: String,
    namespace: String,
    replicas: u32,
) -> Result<(), String> {
    use kube::api::{DynamicObject, Patch, PatchParams};
    use kube::core::ApiResource;

    const MAX_REPLICAS: u32 = 1000;
    if replicas > MAX_REPLICAS {
        return Err(format!("replicas {} exceeds maximum allowed ({})", replicas, MAX_REPLICAS));
    }
    if !matches!(resource_type.as_str(), "deployments" | "statefulsets") {
        return Err(format!("Scale not supported for: {}", resource_type));
    }

    let info = resource_api_info(&resource_type)
        .ok_or_else(|| format!("Unsupported resource type: {}", resource_type))?;
    let ar = ApiResource {
        group: info.group.to_string(),
        version: info.version.to_string(),
        kind: info.kind.to_string(),
        api_version: info.api_version.to_string(),
        plural: info.plural.to_string(),
    };

    let client = state.get_or_create_client(&context).await?;
    let api: kube::Api<DynamicObject> = kube::Api::namespaced_with(client, &namespace, &ar);
    api.patch(&name, &PatchParams::default(), &Patch::Merge(&serde_json::json!({ "spec": { "replicas": replicas } })))
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::k8s::resources::ALL_RESOURCE_TYPES;

    #[test]
    fn test_kind_to_plural_known_kinds() {
        assert_eq!(resource_api_info_by_kind("pod").map(|i| i.plural), Some("pods"));
        assert_eq!(resource_api_info_by_kind("Pod").map(|i| i.plural), Some("pods"));
        assert_eq!(resource_api_info_by_kind("deployment").map(|i| i.plural), Some("deployments"));
        assert_eq!(resource_api_info_by_kind("ingress").map(|i| i.plural), Some("ingresses"));
        assert_eq!(resource_api_info_by_kind("namespace").map(|i| i.plural), Some("namespaces"));
        assert_eq!(resource_api_info_by_kind("node").map(|i| i.plural), Some("nodes"));
        assert_eq!(resource_api_info_by_kind("service").map(|i| i.plural), Some("services"));
        assert_eq!(resource_api_info_by_kind("configmap").map(|i| i.plural), Some("configmaps"));
        assert_eq!(resource_api_info_by_kind("secret").map(|i| i.plural), Some("secrets"));
    }

    #[test]
    fn test_kind_to_plural_case_insensitive() {
        assert_eq!(resource_api_info_by_kind("POD").map(|i| i.plural), Some("pods"));
        assert_eq!(resource_api_info_by_kind("Deployment").map(|i| i.plural), Some("deployments"));
        assert_eq!(resource_api_info_by_kind("CONFIGMAP").map(|i| i.plural), Some("configmaps"));
        assert_eq!(resource_api_info_by_kind("StatefulSet").map(|i| i.plural), Some("statefulsets"));
    }

    #[test]
    fn test_kind_to_plural_unknown_returns_none() {
        assert!(resource_api_info_by_kind("unknownresource").is_none());
        assert!(resource_api_info_by_kind("").is_none());
        assert!(resource_api_info_by_kind("customresource").is_none());
    }

    #[test]
    fn test_allowed_kinds_contains_expected() {
        assert!(resource_api_info_by_kind("Pod").is_some());
        assert!(resource_api_info_by_kind("Deployment").is_some());
        assert!(resource_api_info_by_kind("Service").is_some());
        assert!(resource_api_info_by_kind("Namespace").is_some());
        assert!(resource_api_info_by_kind("Node").is_some());
    }

    #[test]
    fn test_kind_to_plural_statefulset_and_daemonset() {
        assert_eq!(resource_api_info_by_kind("statefulset").map(|i| i.plural), Some("statefulsets"));
        assert_eq!(resource_api_info_by_kind("daemonset").map(|i| i.plural), Some("daemonsets"));
        assert_eq!(resource_api_info_by_kind("job").map(|i| i.plural), Some("jobs"));
        assert_eq!(resource_api_info_by_kind("cronjob").map(|i| i.plural), Some("cronjobs"));
    }

    #[test]
    fn test_kind_to_plural_pv_pvc() {
        assert_eq!(resource_api_info_by_kind("persistentvolume").map(|i| i.plural), Some("persistentvolumes"));
        assert_eq!(resource_api_info_by_kind("persistentvolumeclaim").map(|i| i.plural), Some("persistentvolumeclaims"));
    }

    #[test]
    fn test_allowed_kinds_validation_logic() {
        // resource_api_info_by_kind 로 kind 유효성 검증
        assert!(resource_api_info_by_kind("Pod").is_some());
        assert!(resource_api_info_by_kind("pod").is_some());
        assert!(resource_api_info_by_kind("POD").is_some());
        assert!(resource_api_info_by_kind("Deployment").is_some());
        assert!(resource_api_info_by_kind("deployment").is_some());

        assert!(resource_api_info_by_kind("CustomResource").is_none());
        assert!(resource_api_info_by_kind("").is_none());
        assert!(resource_api_info_by_kind("ReplicaSet").is_none());
    }

    #[test]
    fn test_allowed_kinds_exact_list() {
        // ALL_RESOURCE_TYPES 에 정확히 14개 항목이 있는지 확인
        let expected_kinds = [
            "Pod", "Deployment", "Service", "ConfigMap", "Secret",
            "StatefulSet", "DaemonSet", "Ingress", "Namespace", "Node",
            "Job", "CronJob", "PersistentVolume", "PersistentVolumeClaim",
        ];
        assert_eq!(ALL_RESOURCE_TYPES.len(), expected_kinds.len());
        for kind in &expected_kinds {
            assert!(resource_api_info_by_kind(kind).is_some(), "Missing kind: {}", kind);
        }
    }

    #[test]
    fn test_cluster_scoped_resources() {
        assert!(resource_api_info("nodes").unwrap().cluster_scoped);
        assert!(resource_api_info("namespaces").unwrap().cluster_scoped);
        assert!(resource_api_info("persistentvolumes").unwrap().cluster_scoped);
    }

    #[test]
    fn test_namespaced_resources() {
        assert!(!resource_api_info("pods").unwrap().cluster_scoped);
        assert!(!resource_api_info("deployments").unwrap().cluster_scoped);
        assert!(!resource_api_info("services").unwrap().cluster_scoped);
        assert!(!resource_api_info("configmaps").unwrap().cluster_scoped);
        assert!(!resource_api_info("secrets").unwrap().cluster_scoped);
        assert!(!resource_api_info("persistentvolumeclaims").unwrap().cluster_scoped);
    }

    #[test]
    fn test_delete_resource_unsupported_type() {
        assert!(resource_api_info("unknownkind").is_none());
        assert!(resource_api_info("replicasets").is_none());
        assert!(resource_api_info("").is_none());
    }

    #[test]
    fn test_resource_api_info_known_types() {
        let info = resource_api_info("pods").unwrap();
        assert_eq!(info.kind, "Pod");
        assert_eq!(info.group, "");
        assert_eq!(info.plural, "pods");

        let info = resource_api_info("deployments").unwrap();
        assert_eq!(info.kind, "Deployment");
        assert_eq!(info.group, "apps");
        assert_eq!(info.api_version, "apps/v1");

        let info = resource_api_info("ingress").unwrap();
        assert_eq!(info.kind, "Ingress");
        assert_eq!(info.plural, "ingresses");
        assert_eq!(info.group, "networking.k8s.io");

        let info = resource_api_info("jobs").unwrap();
        assert_eq!(info.kind, "Job");
        assert_eq!(info.group, "batch");
    }

    #[test]
    fn test_scale_only_for_deployment_statefulset() {
        let scalable = |rt: &str| matches!(rt, "deployments" | "statefulsets");
        assert!(scalable("deployments"));
        assert!(scalable("statefulsets"));
        assert!(!scalable("pods"));
        assert!(!scalable("services"));
        assert!(!scalable("daemonsets"));
    }
}
