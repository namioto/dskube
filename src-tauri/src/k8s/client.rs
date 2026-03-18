use kube::{Client, Config};
use kube::config::{KubeConfigOptions, Kubeconfig};

pub async fn build_client(context: &str) -> Result<Client, String> {
    let kubeconfig = Kubeconfig::read().map_err(|e| e.to_string())?;
    let options = KubeConfigOptions {
        context: if context.is_empty() { None } else { Some(context.to_string()) },
        ..Default::default()
    };
    let config = Config::from_custom_kubeconfig(kubeconfig, &options)
        .await
        .map_err(|e| e.to_string())?;
    Client::try_from(config).map_err(|e| e.to_string())
}
