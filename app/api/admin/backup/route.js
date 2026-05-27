import { createClient } from "@supabase/supabase-js";
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

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false
    }
  });
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

export async function GET(request) {
  const format = request.nextUrl.searchParams.get("format") === "csv" ? "csv" : "json";
  const requestedAt = new Date().toISOString();

  try {
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

    await Promise.all(
      backupTables.map(async (tableName) => {
        const { data, error } = await serviceClient
          .from(tableName)
          .select("*")
          .limit(50000);

        tables[tableName] = error ? { error: error.message } : data || [];
      })
    );

    await serviceClient.from("audit_logs").insert({
      user_id: user.id,
      action: "backup_database",
      module: "Administration",
      table_name: "database_backup",
      metadata: {
        format,
        requested_at: requestedAt,
        tables: backupTables
      }
    });

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
        table_count: backupTables.length
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
