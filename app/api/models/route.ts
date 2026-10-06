import { getConfiguredProviders } from "@/lib/providers/provider-config";

export async function GET() {
  try {
    const available = getConfiguredProviders().map((p) => ({
      id: p.id,
      name: p.name,
      models: p.models,
    }));

    return Response.json({ providers: available });
  } catch (err) {
    console.error("[api/models] Failed to fetch providers:", err);
    return Response.json({ providers: [] });
  }
}
