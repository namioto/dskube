import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

const CACHE_TTL_MS = 300_000; // 5분

interface CacheEntry {
  value: boolean;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function getCached(key: string): boolean | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

function setCached(key: string, value: boolean): void {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function useRbac(
  context: string,
  resource: string,
  verb: string,
  namespace?: string
): boolean {
  const key = `${context}:${resource}:${verb}:${namespace ?? ""}`;
  const [allowed, setAllowed] = useState(() => getCached(key) ?? true); // 기본 true (낙관적)

  useEffect(() => {
    if (!context || !resource || !verb) return;
    const cached = getCached(key);
    if (cached !== undefined) {
      setAllowed(cached);
      return;
    }
    invoke<boolean>("cmd_can_i", { context, resource, verb, namespace })
      .then((result) => {
        setCached(key, result);
        setAllowed(result);
      })
      .catch(() => setAllowed(true)); // 에러 시 허용 (fail-open)
  }, [key]);

  return allowed;
}
