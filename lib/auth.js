import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./supabaseServer";

export async function getCurrentUser(supabaseClient) {
  const supabase = supabaseClient || await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  return {
    user: data?.user || null,
    error
  };
}

export async function getCurrentProfile(supabaseClient) {
  const supabase = supabaseClient || await createSupabaseServerClient();
  const { user, error: userError } = await getCurrentUser(supabase);

  if (userError || !user) {
    return {
      user,
      profile: null,
      error: userError
    };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", user.id)
    .maybeSingle();

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
