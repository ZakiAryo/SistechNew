import { createClient } from "@supabase/supabase-js";
import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import {
  backupTables,
  getBackupTableLabel,
  restoreColumnExcludes,
  restoreTableOrder
} from "@/lib/backupConfig";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

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

async function requireAdminProfile() {
  const sessionClient = await createSupabaseServerClient();
  const { data: userData, error: userError } = await sessionClient.auth.getUser();
  const user = userData?.user;

  if (userError || !user) {
    return {
      error: NextResponse.json({ error: "Unauthorized. Please login as admin." }, { status: 401 })
    };
  }

  const { data: profile, error: profileError } = await sessionClient
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    return {
      error: NextResponse.json({ error: "Forbidden. Admin role is required for database restore." }, { status: 403 })
    };
  }

  return { user, profile };
}

function getRecordsFromBackupTable(tablePayload) {
  if (Array.isArray(tablePayload)) {
    return tablePayload;
  }

  if (Array.isArray(tablePayload?.records)) {
    return tablePayload.records;
  }

  return [];
}

function getBackupTableNames(payload) {
  const tables = payload?.tables || {};
  const allowedTables = new Set(backupTables);

  return Object.keys(tables).filter((tableName) => allowedTables.has(tableName));
}

function resolveRestoreTables(payload, requestedTables) {
  const availableTables = getBackupTableNames(payload);

  if (!availableTables.length) {
    throw new Error("Backup file does not contain supported SISTECH table data.");
  }

  if (!requestedTables || requestedTables === "all") {
    return restoreTableOrder.filter((tableName) => availableTables.includes(tableName));
  }

  const selectedTables = requestedTables
    .split(",")
    .map((tableName) => tableName.trim())
    .filter(Boolean);
  const allowedTables = new Set(backupTables);
  const availableTableSet = new Set(availableTables);
  const invalidTables = selectedTables.filter((tableName) => !allowedTables.has(tableName));
  const missingTables = selectedTables.filter((tableName) => !availableTableSet.has(tableName));

  if (invalidTables.length) {
    throw new Error(`Invalid restore table selected: ${invalidTables.join(", ")}.`);
  }

  if (missingTables.length) {
    throw new Error(`Selected table is not available in backup file: ${missingTables.join(", ")}.`);
  }

  return restoreTableOrder.filter((tableName) => selectedTables.includes(tableName));
}

function sanitizeRestoreRows(tableName, rows) {
  const excludedColumns = new Set(restoreColumnExcludes[tableName] || []);

  return rows
    .filter((row) => row && typeof row === "object" && !Array.isArray(row))
    .map((row) =>
      Object.fromEntries(
        Object.entries(row).filter(([key, value]) => !excludedColumns.has(key) && value !== undefined)
      )
    );
}

function chunkRows(rows, size = 500) {
  const chunks = [];

  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }

  return chunks;
}

async function readRestorePayload(request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file.text !== "function") {
      throw new Error("Upload a valid SISTECH JSON backup file.");
    }

    const text = await file.text();
    return {
      payload: JSON.parse(text),
      requestedTables: String(formData.get("tables") || "all")
    };
  }

  const body = await request.json();
  return {
    payload: body?.payload || body,
    requestedTables: body?.tables || "all"
  };
}

export async function POST(request) {
  const requestedAt = new Date().toISOString();

  try {
    const { user, profile, error } = await requireAdminProfile();

    if (error) {
      return error;
    }

    const { payload, requestedTables } = await readRestorePayload(request);

    if (payload?.meta?.app && payload.meta.app !== "SISTECH") {
      return NextResponse.json({ error: "This file is not a SISTECH backup." }, { status: 400 });
    }

    const selectedTables = resolveRestoreTables(payload, requestedTables);
    const serviceClient = createServiceClient();
    const results = [];

    for (const tableName of selectedTables) {
      const rows = sanitizeRestoreRows(tableName, getRecordsFromBackupTable(payload.tables?.[tableName]));
      const result = {
        table: tableName,
        label: getBackupTableLabel(tableName),
        restored_rows: 0,
        skipped_rows: 0,
        status: "restored"
      };

      if (!rows.length) {
        results.push({ ...result, status: "skipped" });
        continue;
      }

      try {
        for (const chunk of chunkRows(rows)) {
          const { error: upsertError } = await serviceClient
            .from(tableName)
            .upsert(chunk, { onConflict: "id" });

          if (upsertError) {
            throw upsertError;
          }

          result.restored_rows += chunk.length;
        }
      } catch (restoreError) {
        result.status = "failed";
        result.error = restoreError.message || "Restore failed.";
      }

      results.push(result);
    }

    const failedTables = results.filter((result) => result.status === "failed");
    const restoredRows = results.reduce((total, result) => total + result.restored_rows, 0);

    await serviceClient.from("audit_logs").insert({
      user_id: user.id,
      action: failedTables.length ? "restore_database_partial" : "restore_database",
      module: "Administration",
      table_name: "database_restore",
      metadata: {
        requested_at: requestedAt,
        backup_generated_at: payload?.meta?.generated_at || payload?.meta?.requested_at || null,
        tables: selectedTables,
        restored_rows: restoredRows,
        failed_tables: failedTables.map((result) => result.table)
      }
    });

    return NextResponse.json(
      {
        success: failedTables.length === 0,
        message: failedTables.length
          ? "Restore completed with some failed tables."
          : "Restore completed successfully.",
        restored_at: requestedAt,
        restored_by: {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          role: profile.role
        },
        table_count: selectedTables.length,
        restored_rows: restoredRows,
        results,
        notes: [
          "Restore uses upsert by id, so existing records with the same id are updated.",
          "Supabase Auth users are not recreated by this restore. Recreate Auth users first when restoring profiles to a new project."
        ]
      },
      { status: failedTables.length ? 207 : 200 }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message || "Restore failed." }, { status: 500 });
  }
}
