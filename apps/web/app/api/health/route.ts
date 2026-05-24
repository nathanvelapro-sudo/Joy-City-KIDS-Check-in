import { NextResponse } from "next/server";

import { createTimeoutFetch, getSupabasePublicEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

const HEALTH_CHECK_TIMEOUT_MS = 3500;

export async function GET() {
  try {
    const { anonKey, url } = getSupabasePublicEnv();
    const response = await createTimeoutFetch(HEALTH_CHECK_TIMEOUT_MS)(`${url}/rest/v1/`, {
      cache: "no-store",
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${anonKey}`,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          service: "joykids-web",
          supabase: "unreachable",
          status: response.status,
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      ok: true,
      service: "joykids-web",
      supabase: "reachable",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Health check failed";

    return NextResponse.json(
      {
        ok: false,
        service: "joykids-web",
        supabase: "unreachable",
        error: message,
      },
      { status: 503 },
    );
  }
}
