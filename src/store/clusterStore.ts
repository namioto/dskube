import { create } from "zustand";
import { ContextInfo } from "../types/k8s";

interface ClusterStore {
  contexts: ContextInfo[];
  currentContext: string;
  namespaces: string[];
  setContexts: (contexts: ContextInfo[]) => void;
  setCurrentContext: (context: string) => void;
  setNamespaces: (namespaces: string[]) => void;
}

export const useClusterStore = create<ClusterStore>((set) => ({
  contexts: [],
  currentContext: "",
  namespaces: ["default"],
  setContexts: (contexts) => set({ contexts }),
  setCurrentContext: (context) => set({ currentContext: context }),
  setNamespaces: (namespaces) => set({ namespaces }),
}));
