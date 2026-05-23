"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import RouteTabs from "./RouteTabs";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { fetchProfileByUserId } from "@/lib/profile";

export default function AppLayout({ children }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRouteSettling, setIsRouteSettling] = useState(false);
  const [profileState, setProfileState] = useState({
    profile: null,
    loading: true,
    error: ""
  });

  const supabase = useMemo(() => {
    try {
      return createSupabaseBrowserClient();
    } catch (error) {
      return { setupError: error.message };
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadProfileFromSession(session) {
      if (!active) {
        return;
      }

      const user = session?.user;

      if (!user) {
        setProfileState({
          profile: null,
          loading: false,
          error: "No active Supabase Auth session found. Please login again."
        });
        return;
      }

      const { profile, error } = await fetchProfileByUserId(supabase, user.id);

      if (!active) {
        return;
      }

      setProfileState({
        profile,
        loading: false,
        error: error?.message || ""
      });
    }

    async function loadCurrentProfile() {
      if (supabase?.setupError) {
        setProfileState({
          profile: null,
          loading: false,
          error: supabase.setupError
        });
        return;
      }

      const { data, error } = await supabase.auth.getSession();

      if (!active) {
        return;
      }

      if (error) {
        setProfileState({
          profile: null,
          loading: false,
          error: `Unable to read Supabase Auth session. ${error.message}`
        });
        return;
      }

      await loadProfileFromSession(data?.session);
    }

    loadCurrentProfile();

    if (supabase?.setupError) {
      return () => {
        active = false;
      };
    }

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setProfileState((current) => ({
        ...current,
        loading: true,
        error: ""
      }));
      loadProfileFromSession(session);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    setIsRouteSettling(true);
    const timer = window.setTimeout(() => setIsRouteSettling(false), 450);

    return () => window.clearTimeout(timer);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div
        className={`fixed left-0 top-0 z-[70] h-0.5 bg-cyan-600 route-progress ${
          isRouteSettling ? "route-progress-active" : ""
        }`}
      />
      <Sidebar
        open={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        profile={profileState.profile}
        profileError={profileState.error}
        profileLoading={profileState.loading}
      />
      <div className="min-h-screen lg:pl-72">
        <Topbar
          onOpenSidebar={() => setIsSidebarOpen(true)}
          profile={profileState.profile}
          profileError={profileState.error}
          profileLoading={profileState.loading}
        />
        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <div key={pathname} className="mx-auto max-w-7xl page-transition">
            {profileState.error ? (
              <div className="mb-5 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {profileState.error}
              </div>
            ) : null}
            <RouteTabs role={profileState.profile?.role} />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
