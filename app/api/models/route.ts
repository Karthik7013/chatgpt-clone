import { NextResponse } from "next/server";
import { PROVIDERS } from "@/lib/providers/config";
import { isProviderConfigured } from "@/lib/providers/env";

export async function GET() {
  try {
    const available = PROVIDERS
      .filter((p) => isProviderConfigured(p.id))
      .map((p) => ({
        id: p.id,
        name: p.name,
        models: p.models,
      }));

    return NextResponse.json({ providers: available });
  } catch (err) {
    console.error("Failed to fetch providers:", err);
    return NextResponse.json({ providers: [] });
  }
}
