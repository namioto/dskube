export type ResourceType =
  | "pods"
  | "deployments"
  | "services"
  | "configmaps"
  | "secrets"
  | "statefulsets"
  | "daemonsets"
  | "ingress"
  | "namespaces"
  | "nodes";

export interface ContextInfo {
  name: string;
  cluster: string;
  namespace?: string;
}

export interface ResourceItem {
  name: string;
  namespace?: string;
  age?: string;
  status?: string;
  raw: Record<string, unknown>;
}

export type PanelId = string;

export interface PanelState {
  id: PanelId;
  resourceType: ResourceType;
  namespace: string;
  context: string;
  selectedResource: ResourceItem | null;
  viewMode: "list" | "detail" | "logs";
}
