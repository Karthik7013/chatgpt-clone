"use client";

import { useEffect, useState } from "react";

type ModelEntry = { id: string; name: string; description: string };
type Provider = { id: string; name: string; models: ModelEntry[] };

/**
 * Provider list for the model selector. Fetched from `/api/models`, which
 * filters by configured API keys server-side — env vars are never readable
 * from client code, so this must stay a fetch, not a direct config import.
 */
export function useProviders() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/models")
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load providers (${r.status})`);
        return r.json();
      })
      .then((data) => {
        setProviders(data.providers ?? []);
        setError(null);
      })
      .catch((err) => {
        setProviders([]);
        setError(err instanceof Error ? err.message : "Failed to load providers");
      })
      .finally(() => setLoading(false));
  }, []);

  return { providers, loading, error };
}
