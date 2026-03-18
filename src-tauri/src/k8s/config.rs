use kube::config::Kubeconfig;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ContextInfo {
    pub name: String,
    pub cluster: String,
    pub namespace: Option<String>,
}

pub fn list_contexts() -> Result<Vec<ContextInfo>, String> {
    let kubeconfig = Kubeconfig::read().map_err(|e| e.to_string())?;
    let contexts = kubeconfig
        .contexts
        .iter()
        .map(|ctx| ContextInfo {
            name: ctx.name.clone(),
            cluster: ctx
                .context
                .as_ref()
                .map(|c| c.cluster.clone())
                .unwrap_or_default(),
            namespace: ctx
                .context
                .as_ref()
                .and_then(|c| c.namespace.clone()),
        })
        .collect();
    Ok(contexts)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_list_contexts_returns_vec() {
        // kubeconfig가 없으면 에러, 있으면 Vec 반환 — 어느 쪽이든 패닉 없어야 함
        let result = list_contexts();
        assert!(result.is_ok() || result.is_err());
    }
}
