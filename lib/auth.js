import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./supabaseServer";
import { fetchProfileByUserId } from "./profile";

export async function getCurrentUser(supabaseClient) {
  const supabase = supabaseClient || (await createSupabaseServerClient());
  const { data, error } = await supabase.auth.getUser();

  return {
    user: data?.user || null,
    error
  };
}

export async function getCurrentProfile(supabaseClient) {
  const supabase = supabaseClient || (await createSupabaseServerClient());
  const { user, error: userError } = await getCurrentUser(supabase);

  if (userError || !user) {
    return {
      user,
      profile: null,
      error: userError || new Error("No active Supabase Auth session found. Please login again.")
    };
  }

  const { profile, error } = await fetchProfileByUserId(supabase, user.id);

  return {
    user,
    profile,
    error
  };
}

export async function requireUser() {
  const { user } = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
