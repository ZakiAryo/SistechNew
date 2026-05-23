"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, LogOut, Menu, UserCircle } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

export default function Topbar({ onOpenSidebar, profile, profileError, profileLoading }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  function createClient() {
    try {
      return createSupabaseBrowserClient();
    } catch {
      return null;
    }
  }

  async function handleLogout() {
    const supabase = createClient();

    if (!supabase) {
      router.push("/login");
      return;
    }

    setLoading(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 lg:hidden"
            onClick={onOpenSidebar}
            aria-label="Open sidebar"
            title="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <p className="text-sm font-semibold text-slate-950">SISTECH</p>
            <p className="text-xs text-slate-500">Modern operations workspace</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="hidden h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 sm:inline-flex"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
          </button>
          <div className="hidden items-center gap-3 rounded-md border border-slate-200 px-3 py-2 md:flex">
            <UserCircle className="h-5 w-5 text-slate-500" />
            <div className="max-w-48">
              <p className="truncate text-sm font-medium text-slate-800">
                {profileLoading
                  ? "Loading profile"
                  : profile?.full_name || profile?.email || "Profile unavailable"}
              </p>
              <p
                className={`truncate text-xs capitalize ${
                  profileError ? "text-rose-600" : "text-slate-500"
                }`}
                title={profileError || undefined}
              >
                {profileLoading ? "Loading role" : profile?.role || "Role unavailable"}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            onClick={handleLogout}
            disabled={loading}
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">{loading ? "Signing out" : "Logout"}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
