import { getConfiguredProviders } from "@/lib/providers/provider-config";
import { apiOk } from "@/lib/api-response";

export async function GET() {
  const available = getConfiguredProviders().map((p) => ({
    id: p.id,
    name: p.name,
    models: p.models,
  }));

  return apiOk({ providers: available });
}
