export const PROFILE_SELECT = "id, email, full_name, role";

export function normalizeRole(role) {
  return typeof role === "string" ? role.trim().toLowerCase() : "";
}

export function buildProfileError(userId, profile, queryError) {
  if (queryError) {
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
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", userId)
    .single();

  const profileError = buildProfileError(userId, profile, error);

  return {
    profile: profileError ? null : profile,
    error: profileError
  };
}
