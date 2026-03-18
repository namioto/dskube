import { create } from "zustand";
import { PanelId, ResourceItem } from "../types/k8s";

interface ResourceStore {
  resources: Record<PanelId, ResourceItem[]>;
  setResources: (panelId: PanelId, items: ResourceItem[]) => void;
  updateResource: (panelId: PanelId, item: ResourceItem) => void;
}

export const useResourceStore = create<ResourceStore>((set) => ({
  resources: {},
  setResources: (panelId, items) =>
    set((s) => ({ resources: { ...s.resources, [panelId]: items } })),
  updateResource: (panelId, item) =>
    set((s) => {
      const list = s.resources[panelId] ?? [];
      const idx = list.findIndex((r) => r.name === item.name);
      const updated =
        idx >= 0
          ? list.map((r, i) => (i === idx ? item : r))
          : [...list, item];
      return { resources: { ...s.resources, [panelId]: updated } };
    }),
}));
