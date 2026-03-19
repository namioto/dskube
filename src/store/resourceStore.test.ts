import { describe, it, expect, beforeEach } from "vitest";
import { useResourceStore } from "./resourceStore";

const ITEM_A = { name: "pod-a", namespace: "default", status: "Running", raw: {} };
const ITEM_B = { name: "pod-b", namespace: "default", status: "Pending", raw: {} };

describe("resourceStore", () => {
  beforeEach(() => {
    useResourceStore.setState({ resources: {} });
  });

  // ── setResources ────────────────────────────────────────────────────────
  it("setResources stores items for a panel", () => {
    useResourceStore.getState().setResources("p1", [ITEM_A, ITEM_B]);
    expect(useResourceStore.getState().resources["p1"]).toHaveLength(2);
  });

  it("setResources overwrites existing items", () => {
    useResourceStore.getState().setResources("p1", [ITEM_A]);
    useResourceStore.getState().setResources("p1", [ITEM_B]);
    const items = useResourceStore.getState().resources["p1"];
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("pod-b");
  });

  it("setResources does not affect other panels", () => {
    useResourceStore.getState().setResources("p1", [ITEM_A]);
    useResourceStore.getState().setResources("p2", [ITEM_B]);
    expect(useResourceStore.getState().resources["p1"]).toHaveLength(1);
    expect(useResourceStore.getState().resources["p2"]).toHaveLength(1);
  });

  // ── updateResource ──────────────────────────────────────────────────────
  it("updateResource adds item when not found", () => {
    useResourceStore.getState().setResources("p1", [ITEM_A]);
    useResourceStore.getState().updateResource("p1", ITEM_B);
    expect(useResourceStore.getState().resources["p1"]).toHaveLength(2);
  });

  it("updateResource updates existing item matched by name+namespace", () => {
    useResourceStore.getState().setResources("p1", [ITEM_A]);
    const updated = { ...ITEM_A, status: "Failed" };
    useResourceStore.getState().updateResource("p1", updated);
    const items = useResourceStore.getState().resources["p1"];
    expect(items).toHaveLength(1);
    expect(items[0].status).toBe("Failed");
  });

  it("updateResource creates panel entry if none exists", () => {
    useResourceStore.getState().updateResource("p1", ITEM_A);
    expect(useResourceStore.getState().resources["p1"]).toHaveLength(1);
  });

  // ── clearPanel ──────────────────────────────────────────────────────────
  it("clearPanel removes panel data", () => {
    useResourceStore.getState().setResources("p1", [ITEM_A]);
    useResourceStore.getState().clearPanel("p1");
    expect(useResourceStore.getState().resources["p1"]).toBeUndefined();
  });

  it("clearPanel does not affect other panels", () => {
    useResourceStore.getState().setResources("p1", [ITEM_A]);
    useResourceStore.getState().setResources("p2", [ITEM_B]);
    useResourceStore.getState().clearPanel("p1");
    expect(useResourceStore.getState().resources["p2"]).toHaveLength(1);
  });

  it("clearPanel on nonexistent panel does not throw", () => {
    expect(() => useResourceStore.getState().clearPanel("ghost")).not.toThrow();
  });

  // ── 회귀: selector 안 ?? [] 금지 ────────────────────────────────────────
  // Zustand v5 useSyncExternalStore — selector가 새 [] 반환하면 tearing 무한루프
  it("[regression] resources[unknown] is undefined, not []", () => {
    const result = useResourceStore.getState().resources["nonexistent"];
    expect(result).toBeUndefined();
  });

  it("[regression] setResources stores stable array reference", () => {
    useResourceStore.getState().setResources("p1", [ITEM_A]);
    const ref1 = useResourceStore.getState().resources["p1"];
    const ref2 = useResourceStore.getState().resources["p1"];
    expect(ref1).toBe(ref2);
  });
});
