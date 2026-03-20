use kube::{Api, Client};
use k8s_openapi::apiextensions_apiserver::pkg::apis::apiextensions::v1::CustomResourceDefinition;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CrdInfo {
    pub name: String,
    pub kind: String,
    pub group: String,
    pub version: String,
    pub plural: String,
    pub namespaced: bool,
}

pub async fn list_crds(client: Client) -> Result<Vec<CrdInfo>, String> {
    let api: Api<CustomResourceDefinition> = Api::all(client);
    let list = api.list(&kube::api::ListParams::default())
        .await
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for crd in list.items {
        let spec = &crd.spec;
        let name = crd.metadata.name.clone().unwrap_or_default();
        let kind = spec.names.kind.clone();
        let group = spec.group.clone();
        let plural = spec.names.plural.clone();
        let namespaced = spec.scope == "Namespaced";

        // versions에서 첫 번째 served+storage 버전 선택
        let version = spec.versions.iter()
            .find(|v| v.served && v.storage)
            .or_else(|| spec.versions.first())
            .map(|v| v.name.clone())
            .unwrap_or_else(|| "v1".to_string());

        result.push(CrdInfo { name, kind, group, version, plural, namespaced });
    }

    Ok(result)
}
