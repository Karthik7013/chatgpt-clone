import { NextResponse } from "next/server";
import { getConfiguredProviders } from "@/lib/providers/provider-config";

export async function GET() {
  try {
    const available = getConfiguredProviders().map((p) => ({
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
