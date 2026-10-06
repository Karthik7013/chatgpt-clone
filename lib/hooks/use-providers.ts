"use client";

import { useEffect, useState } from "react";
import { getConfiguredProviders, isProviderConfigured } from "@/lib/providers/provider-config";

type ModelEntry = { id: string; name: string; description: string };
type Provider = { id: string; name: string; models: ModelEntry[] };

export function useProviders() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Use configured providers from env if available, otherwise fetch from API
    const configured = getConfiguredProviders();
    if (configured.length > 0) {
      setProviders(configured);
      setError(null);
    } else {
      // Fall back to API if no env keys are set
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
    }
    setLoading(false);
  }, []);

  return { providers, loading, error };
}
