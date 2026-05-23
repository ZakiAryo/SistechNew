export async function writeAuditLog(supabase, { userId, action, module, tableName, recordId, metadata = {} }) {
  if (!supabase || !userId) {
    return;
  }

  await supabase.from("audit_logs").insert({
    user_id: userId,
    action,
    module,
    table_name: tableName,
    record_id: recordId,
    metadata
  });
}
