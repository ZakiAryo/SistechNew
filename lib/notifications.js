import { normalizeRole } from "./profile";

export const NOTIFICATION_SELECT =
  "id, user_id, target_role, module, record_id, action_url, title, message, is_read, created_at";

export function subscribeToNotificationChanges(supabase, { profile, channelName, onChange }) {
  if (!supabase || !profile?.id || typeof onChange !== "function") {
    return null;
  }

  const role = normalizeRole(profile.role);
  const channel = supabase.channel(channelName || `notifications-${profile.id}`);

  if (role === "admin") {
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "notifications" },
      onChange
    );
  } else {
    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${profile.id}`
        },
        onChange
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `target_role=eq.${role}`
        },
        onChange
      );
  }

  channel.subscribe();
  return channel;
}
