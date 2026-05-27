import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { canProfileAccessPath, canRoleAccessPath } from "./lib/menuConfig";

const protectedRoutes = [
  "/dashboard",
  "/master-data",
  "/marketing",
  "/engineering",
  "/purchasing",
  "/finance",
  "/reports",
  "/notifications",
  "/users"
];

export async function middleware(request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const pathname = request.nextUrl.pathname;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  const isLoginRoute = pathname === "/login";
  const isRootRoute = pathname === "/";
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  if (user && (isLoginRoute || isRootRoute)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!user && (isProtectedRoute || isRootRoute)) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (user && isProtectedRoute && pathname !== "/dashboard") {
    let { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, is_active, menu_access")
      .eq("id", user.id)
      .single();

    if (profileError?.message?.includes("menu_access") || profileError?.message?.includes("is_active")) {
      const fallbackResult = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      profile = fallbackResult.data ? { ...fallbackResult.data, is_active: true, menu_access: [] } : null;
      profileError = fallbackResult.error;
    }

    if (
      !profileError &&
      profile?.role &&
      !canProfileAccessPath(profile, pathname) &&
      !canRoleAccessPath(profile.role, pathname)
    ) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
};
