"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, CheckCircle2, RefreshCw } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { NOTIFICATION_SELECT, subscribeToNotificationChanges } from "@/lib/notifications";
import { fetchProfileByUserId } from "@/lib/profile";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

export default function NotificationsPage() {
  const [rows, setRows] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const supabase = useMemo(() => {
    try {
      return createSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

  const loadRows = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const { data, error: queryError } = await supabase
      .from("notifications")
      .select(NOTIFICATION_SELECT)
      .order("created_at", { ascending: false });

    if (queryError) {
      setError(queryError.message);
      setRows([]);
    } else {
      setRows(data || []);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      if (!supabase) {
        return;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      const user = userData?.user;

      if (!active) {
        return;
      }

      if (userError || !user) {
        setError(userError?.message || "No active Supabase Auth session found.");
        return;
      }

      const { profile: currentProfile, error: profileError } = await fetchProfileByUserId(
        supabase,
        user.id
      );

      if (!active) {
        return;
      }

      if (profileError) {
        setError(profileError.message);
        setProfile(null);
      } else {
        setProfile(currentProfile);
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !profile?.id) {
      return undefined;
    }

    const channel = subscribeToNotificationChanges(supabase, {
      profile,
      channelName: `notifications-page-${profile.id}`,
      onChange: loadRows
    });

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [loadRows, profile, supabase]);

  async function markAsRead(id) {
    if (!supabase) {
      return;
    }

    const { error: updateError } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, is_read: true } : row))
    );
  }

  async function markAllAsRead() {
    if (!supabase) {
      return;
    }

    const unreadIds = rows.filter((row) => !row.is_read).map((row) => row.id);

    if (!unreadIds.length) {
      return;
    }

    const { error: updateError } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", unreadIds);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setRows((current) => current.map((row) => ({ ...row, is_read: true })));
  }

  const unreadCount = rows.filter((row) => !row.is_read).length;

  return (
    <AppLayout>
      <PageHeader
        title="Notifications"
        description="Role-based notifications from workflow status changes across divisions."
        eyebrow="System"
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={markAllAsRead}
              disabled={!unreadCount}
            >
              <CheckCircle2 className="h-4 w-4" />
              Mark all read
            </button>
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
              onClick={loadRows}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        }
      />

      {error ? (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="space-y-3">
        {loading ? (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">
            Loading notifications...
          </div>
        ) : rows.length ? (
          rows.map((row) => (
            <div
              key={row.id}
              className={`rounded-lg border bg-white p-4 shadow-sm ${
                row.is_read ? "border-slate-200" : "border-cyan-200 ring-1 ring-cyan-100"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-10 w-10 flex-none items-center justify-center rounded-lg ${
                    row.is_read ? "bg-slate-100 text-slate-500" : "bg-cyan-50 text-cyan-700"
                  }`}
                >
                  <Bell className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">{row.title}</p>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs capitalize text-slate-600">
                      {row.target_role || "user"}
                    </span>
                    {!row.is_read ? (
                      <span className="rounded-full bg-cyan-50 px-2 py-1 text-xs font-medium text-cyan-700">
                        New
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{row.message}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {row.action_url ? (
                      <Link
                        href={row.action_url}
                        className="inline-flex text-sm font-medium text-cyan-700 hover:text-cyan-800"
                      >
                        Open workflow
                      </Link>
                    ) : null}
                    {!row.is_read ? (
                      <button
                        type="button"
                        className="text-sm font-medium text-slate-600 hover:text-slate-950"
                        onClick={() => markAsRead(row.id)}
                      >
                        Mark as read
                      </button>
                    ) : null}
                    <span className="text-xs text-slate-400">
                      {new Date(row.created_at).toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            No notifications yet.
          </div>
        )}
      </div>
    </AppLayout>
  );
}
