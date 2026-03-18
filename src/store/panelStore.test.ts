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
});
