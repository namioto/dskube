import { describe, it, expect, beforeEach } from "vitest";
import { usePanelStore } from "./panelStore";

describe("panelStore", () => {
  beforeEach(() => {
    usePanelStore.setState({ panels: [] });
  });

  it("adds a panel", () => {
    usePanelStore.getState().addPanel("test-context");
    expect(usePanelStore.getState().panels).toHaveLength(1);
  });

  it("does not add more than 4 panels", () => {
    const { addPanel } = usePanelStore.getState();
    for (let i = 0; i < 5; i++) addPanel("ctx");
    expect(usePanelStore.getState().panels).toHaveLength(4);
  });

  it("removes a panel", () => {
    usePanelStore.getState().addPanel("ctx");
    const id = usePanelStore.getState().panels[0].id;
    usePanelStore.getState().removePanel(id);
    expect(usePanelStore.getState().panels).toHaveLength(0);
  });

  it("updates a panel field", () => {
    usePanelStore.getState().addPanel("ctx");
    const id = usePanelStore.getState().panels[0].id;
    usePanelStore.getState().updatePanel(id, { namespace: "kube-system" });
    expect(usePanelStore.getState().panels[0].namespace).toBe("kube-system");
  });

  it("sets splitDirection to vertical", () => {
    usePanelStore.getState().setSplitDirection("vertical");
    expect(usePanelStore.getState().splitDirection).toBe("vertical");
  });

  it("new panel has correct default values", () => {
    usePanelStore.getState().addPanel("ctx");
    const panel = usePanelStore.getState().panels[0];
    expect(panel.resourceType).toBe("pods");
    expect(panel.viewMode).toBe("list");
    expect(panel.selectedResource).toBeNull();
    expect(panel.context).toBe("ctx");
    expect(panel.namespace).toBe("default");
  });

  it("updatePanel with non-existent id is a no-op", () => {
    usePanelStore.getState().addPanel("ctx");
    const before = usePanelStore.getState().panels.map((p) => ({ ...p }));
    usePanelStore.getState().updatePanel("non-existent-id", { namespace: "kube-system" });
    const after = usePanelStore.getState().panels;
    expect(after).toHaveLength(before.length);
    expect(after[0].namespace).toBe(before[0].namespace);
  });

  it("removePanel with non-existent id is a no-op", () => {
    usePanelStore.getState().addPanel("ctx");
    usePanelStore.getState().removePanel("non-existent-id");
    expect(usePanelStore.getState().panels).toHaveLength(1);
  });

  it("addPanel with namespace sets namespace correctly", () => {
    usePanelStore.getState().addPanel("ctx", "kube-system");
    const panel = usePanelStore.getState().panels[0];
    expect(panel.namespace).toBe("kube-system");
  });
});
