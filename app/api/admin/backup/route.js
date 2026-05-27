import { createClient } from "@supabase/supabase-js";
import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

const backupTables = [
  "profiles",
  "suppliers",
  "items",
  "customers",
  "projects",
  "project_budgets",
  "cost_codes",
  "contracts",
  "purchase_requests",
  "purchase_request_items",
  "purchase_orders",
  "purchase_order_items",
  "delivery_orders",
  "account_payables",
  "account_payable_items",
  "account_receivables",
  "cash_bank_transactions",
  "accounting_entries",
  "notifications",
  "audit_logs"
];

function createServiceClient() {
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

function escapeCsv(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function backupToCsv(payload) {
  const sections = [
    ["backup_meta", payload.meta],
    ...Object.entries(payload.tables)
  ];

  return sections
    .map(([tableName, rows]) => {
      const rowList = Array.isArray(rows) ? rows : [rows];
      const keys = Array.from(new Set(rowList.flatMap((row) => Object.keys(row || {}))));
      const header = [`# ${tableName}`, keys.join(",")].filter(Boolean).join("\n");
      const body = rowList.map((row) => keys.map((key) => escapeCsv(row?.[key])).join(",")).join("\n");
      return [header, body].filter(Boolean).join("\n");
    })
    .join("\n\n");
}

function parseDateParam(value, label) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${label} is not a valid date/time.`);
  }

  return parsed.toISOString();
}

export async function GET(request) {
  const format = request.nextUrl.searchParams.get("format") === "csv" ? "csv" : "json";
  const requestedAt = new Date().toISOString();

  try {
    const startAt = parseDateParam(request.nextUrl.searchParams.get("start_at"), "Start date/time");
    const endAt = parseDateParam(request.nextUrl.searchParams.get("end_at"), "End date/time");

    if (startAt && endAt && new Date(startAt) > new Date(endAt)) {
      return NextResponse.json({ error: "Start date/time must be before end date/time." }, { status: 400 });
    }

    const sessionClient = await createSupabaseServerClient();
    const { data: userData, error: userError } = await sessionClient.auth.getUser();
    const user = userData?.user;

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized. Please login as admin." }, { status: 401 });
    }

    const { data: profile, error: profileError } = await sessionClient
      .from("profiles")
      .select("id, email, full_name, role")
      .eq("id", user.id)
      .single();

    if (profileError || profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden. Admin role is required for database backup." }, { status: 403 });
    }

    const serviceClient = createServiceClient();
    const tables = {};

    for (const tableName of backupTables) {
      let query = serviceClient
        .from(tableName)
        .select("*")
        .limit(50000);

      if (startAt) {
        query = query.gte("created_at", startAt);
      }

      if (endAt) {
        query = query.lte("created_at", endAt);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Backup failed while reading ${tableName}: ${error.message}`);
      }

      tables[tableName] = data || [];
    }

    const { error: auditError } = await serviceClient.from("audit_logs").insert({
      user_id: user.id,
      action: "backup_database",
      module: "Administration",
      table_name: "database_backup",
      metadata: {
        format,
        requested_at: requestedAt,
        start_at: startAt,
        end_at: endAt,
        tables: backupTables
      }
    });

    if (auditError) {
      throw new Error(`Backup audit log failed: ${auditError.message}`);
    }

    const payload = {
      meta: {
        app: "SISTECH",
        requested_at: requestedAt,
        requested_by: {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          role: profile.role
        },
        table_count: backupTables.length,
        filters: {
          start_at: startAt,
          end_at: endAt
        }
      },
      tables
    };

    const safeTimestamp = requestedAt.replace(/[:.]/g, "-");

    if (format === "csv") {
      return new Response(backupToCsv(payload), {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="sistech-backup-${safeTimestamp}.csv"`
        }
      });
    }

    return new Response(JSON.stringify(payload, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="sistech-backup-${safeTimestamp}.json"`
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Backup failed." }, { status: 500 });
  }
}
