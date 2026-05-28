import { Buffer } from "node:buffer";
import { createClient } from "@supabase/supabase-js";

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  return Buffer.from(padded, "base64").toString("utf8");
}

function assertServiceRoleKey(key) {
  const parts = key.split(".");

  if (parts.length !== 3) {
    return;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(parts[1]));

    if (payload.role !== "service_role") {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY is configured, but it is not a service_role key. Copy the service_role secret key from Supabase Project Settings > API Keys, then redeploy Vercel."
      );
    }
  } catch (error) {
    if (error.message?.includes("not a service_role key")) {
      throw error;
    }

    throw new Error("SUPABASE_SERVICE_ROLE_KEY could not be validated. Please re-copy the service_role key from Supabase.");
  }
}

export function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  assertServiceRoleKey(serviceRoleKey);

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false
    }
  });
}
