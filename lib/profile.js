export const PROFILE_SELECT = "id, email, full_name, role, is_active, menu_access";
const FALLBACK_PROFILE_SELECT = "id, email, full_name, role";

export function normalizeRole(role) {
  return typeof role === "string" ? role.trim().toLowerCase() : "";
}

export function buildProfileError(userId, profile, queryError) {
  if (queryError) {
    if (queryError.message?.toLowerCase().includes("permission denied")) {
      return new Error(
        `Cannot read public.profiles for authenticated user ${userId}. Grant authenticated access and check RLS policy for public.profiles. Supabase error: ${queryError.message}`
      );
    }

    return new Error(
      `Profile not found for authenticated user ${userId}. Create a matching row in public.profiles with id = auth.users.id. Supabase error: ${queryError.message}`
    );
  }

  if (!profile) {
    return new Error(
      `Profile not found for authenticated user ${userId}. Create a matching row in public.profiles with id = auth.users.id.`
    );
  }

  if (!normalizeRole(profile.role)) {
    return new Error(
      `Profile role is empty for authenticated user ${userId}. Update public.profiles.role before opening the dashboard.`
    );
  }

  return null;
}

export async function fetchProfileByUserId(supabase, userId) {
  let { data: profile, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", userId)
    .single();

  if (error?.message?.includes("menu_access") || error?.message?.includes("is_active")) {
    const fallbackResult = await supabase
      .from("profiles")
      .select(FALLBACK_PROFILE_SELECT)
      .eq("id", userId)
      .single();

    profile = fallbackResult.data ? { ...fallbackResult.data, is_active: true, menu_access: [] } : null;
    error = fallbackResult.error;
  }

  const profileError = buildProfileError(userId, profile, error);

  return {
    profile: profileError ? null : profile,
    error: profileError
  };
}
