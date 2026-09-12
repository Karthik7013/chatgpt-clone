"use client";

import { useEffect, useState } from "react";

type ModelEntry = { id: string; name: string; description: string };
type Provider = { id: string; name: string; models: ModelEntry[] };

export function useProviders() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then((data) => setProviders(data.providers ?? []))
      .catch(() => setProviders([]))
      .finally(() => setLoading(false));
  }, []);

  return { providers, loading };
}
