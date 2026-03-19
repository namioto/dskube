import { describe, it, expect, beforeEach } from "vitest";
import { useClusterStore } from "./clusterStore";

describe("clusterStore", () => {
  beforeEach(() => {
    useClusterStore.setState({
      contexts: [],
      currentContext: "",
      namespaces: ["default"],
      currentNamespace: "default",
    });
  });

  it("initial state has empty contexts", () => {
    expect(useClusterStore.getState().contexts).toHaveLength(0);
  });

  it("initial currentContext is empty string", () => {
    expect(useClusterStore.getState().currentContext).toBe("");
  });

  it("setContexts updates contexts list", () => {
    useClusterStore.getState().setContexts([
      { name: "prod", cluster: "prod-cluster" },
      { name: "staging", cluster: "staging-cluster" },
    ]);
    expect(useClusterStore.getState().contexts).toHaveLength(2);
    expect(useClusterStore.getState().contexts[0].name).toBe("prod");
  });

  it("setCurrentContext updates currentContext", () => {
    useClusterStore.getState().setCurrentContext("staging");
    expect(useClusterStore.getState().currentContext).toBe("staging");
  });

  it("setNamespaces replaces namespace list", () => {
    useClusterStore.getState().setNamespaces(["kube-system", "monitoring"]);
    expect(useClusterStore.getState().namespaces).toEqual(["kube-system", "monitoring"]);
  });

  it("setCurrentNamespace updates currentNamespace", () => {
    useClusterStore.getState().setCurrentNamespace("kube-system");
    expect(useClusterStore.getState().currentNamespace).toBe("kube-system");
  });

  it("setContexts with empty array clears contexts", () => {
    useClusterStore.getState().setContexts([{ name: "prod", cluster: "prod" }]);
    useClusterStore.getState().setContexts([]);
    expect(useClusterStore.getState().contexts).toHaveLength(0);
  });

  it("context with optional namespace field", () => {
    useClusterStore.getState().setContexts([
      { name: "dev", cluster: "dev-cluster", namespace: "dev-ns" },
    ]);
    expect(useClusterStore.getState().contexts[0].namespace).toBe("dev-ns");
  });
});
