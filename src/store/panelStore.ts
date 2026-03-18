import { create } from "zustand";
import { PanelId, PanelState, ResourceType } from "../types/k8s";

interface PanelStore {
  panels: PanelState[];
  splitDirection: "horizontal" | "vertical";
  addPanel: (context: string) => void;
  removePanel: (id: PanelId) => void;
  updatePanel: (id: PanelId, patch: Partial<PanelState>) => void;
  setSplitDirection: (dir: "horizontal" | "vertical") => void;
}

const createPanel = (context: string): PanelState => ({
  id: crypto.randomUUID(),
  resourceType: "pods" as ResourceType,
  namespace: "default",
  context,
  selectedResource: null,
  viewMode: "list",
});

export const usePanelStore = create<PanelStore>((set) => ({
  panels: [],
  splitDirection: "horizontal",
  addPanel: (context) =>
    set((s) => {
      if (s.panels.length >= 4) return s;
      return { panels: [...s.panels, createPanel(context)] };
    }),
  removePanel: (id) =>
    set((s) => ({ panels: s.panels.filter((p) => p.id !== id) })),
  updatePanel: (id, patch) =>
    set((s) => ({
      panels: s.panels.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    })),
  setSplitDirection: (dir) => set({ splitDirection: dir }),
}));
