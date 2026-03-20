export interface CrdInfo {
  name: string;
  kind: string;
  group: string;
  version: string;
  plural: string;
  namespaced: boolean;
}

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
  | "nodes"
  | "jobs"
  | "cronjobs"
  | "persistentvolumes"
  | "persistentvolumeclaims"
  | "custom";

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

export interface ResourcePage {
  items: ResourceItem[];
  continue_token?: string;
}

export type PanelId = string;

export interface PanelState {
  id: PanelId;
  resourceType: ResourceType;
  namespace: string;
  context: string;
  selectedResource: ResourceItem | null;
  viewMode: "list" | "detail" | "logs" | "events" | "terminal";
  selectedCrd?: CrdInfo | null;
}
