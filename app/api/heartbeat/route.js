import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function jsonResponse(body, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!cronSecret) {
    return jsonResponse(
      {
        ok: false,
        error: "CRON_SECRET is not configured."
      },
      503
    );
  }

  if (authorization !== `Bearer ${cronSecret}`) {
    return jsonResponse(
      {
        ok: false,
        error: "Unauthorized"
      },
      401
    );
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.rpc("refresh_project_activity");

    if (error) {
      throw error;
    }

    return jsonResponse({
      ok: true,
      message: "Supabase refreshed"
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to refresh Supabase."
      },
      500
    );
  }
}

