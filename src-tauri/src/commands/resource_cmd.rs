use tauri::State;
use crate::state::AppState;
use crate::k8s::resources::{list_resources, ResourceItem};

/// Kubernetes kind → 복수형 매핑 (알려진 불규칙 형태 포함)
fn kind_to_plural(kind: &str) -> Option<&'static str> {
    match kind.to_lowercase().as_str() {
        "pod" => Some("pods"),
        "deployment" => Some("deployments"),
        "service" => Some("services"),
        "configmap" => Some("configmaps"),
        "secret" => Some("secrets"),
        "statefulset" => Some("statefulsets"),
        "daemonset" => Some("daemonsets"),
        "ingress" => Some("ingresses"),
        "namespace" => Some("namespaces"),
        "node" => Some("nodes"),
        "replicaset" => Some("replicasets"),
        "job" => Some("jobs"),
        "cronjob" => Some("cronjobs"),
        "persistentvolume" => Some("persistentvolumes"),
        "persistentvolumeclaim" => Some("persistentvolumeclaims"),
        _ => None,
    }
}

/// 지원하는 resource type 목록
const ALLOWED_KINDS: &[&str] = &[
    "Pod", "Deployment", "Service", "ConfigMap", "Secret",
    "StatefulSet", "DaemonSet", "Ingress", "Namespace", "Node",
    "ReplicaSet", "Job", "CronJob", "PersistentVolume", "PersistentVolumeClaim",
];

#[tauri::command]
pub async fn cmd_list_resources(
    state: State<'_, AppState>,
    context: String,
    resource_type: String,
    namespace: Option<String>,
) -> Result<Vec<ResourceItem>, String> {
    let client = state.get_or_create_client(&context).await?;
    list_resources(client, &resource_type, namespace.as_deref()).await
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
        let _ = crate::k8s::resources::watch_resources(
            client, app, resource_type, namespace, panel_id_task, context,
        )
        .await;
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

    // kind 허용 목록 검증
    if !ALLOWED_KINDS.iter().any(|k| k.eq_ignore_ascii_case(&kind_str)) {
        return Err(format!("Unsupported kind: '{}'. Allowed: {:?}", kind_str, ALLOWED_KINDS));
    }

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

    let plural = kind_to_plural(&kind_str)
        .ok_or_else(|| format!("Unknown plural for kind: {}", kind_str))?
        .to_string();

    let ar = ApiResource {
        group,
        version,
        kind: kind_str,
        api_version: api_version.to_string(),
        plural,
    };

    let api: kube::Api<DynamicObject> = match namespace {
        Some(ns) => kube::Api::namespaced_with(client, &ns, &ar),
        None => kube::Api::all_with(client, &ar),
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
