import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export const updateSession = async (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Verify Supabase Auth Session
  let authUser = null;
  try {
    const { data } = await supabase.auth.getUser();
    authUser = data?.user || null;
  } catch {
    // Session refresh error or unauthenticated
  }

  // Also check explicit session cookie
  const sessionCookie = request.cookies.get("nesale_session")?.value;
  const isAuthenticated = !!(authUser || sessionCookie);

  const { pathname } = request.nextUrl;

  // 1. Guard Protected Routes: /dashboard and /onboarding
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding")) {
    if (!isAuthenticated) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("notice", "auth_required");
      redirectUrl.searchParams.set("next", pathname);

      const redirectResponse = NextResponse.redirect(redirectUrl);
      redirectResponse.cookies.delete("nesale_session");
      return redirectResponse;
    }
  }

  // 2. Prevent logged-in users from seeing /login or /register unless intentionally switching/logging out
  if (isAuthenticated && (pathname === "/login" || pathname === "/register")) {
    const notice = request.nextUrl.searchParams.get("notice");
    if (notice !== "logged_out" && notice !== "switch_account") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/dashboard";
      return NextResponse.redirect(redirectUrl);
    }
  }

  return supabaseResponse;
};
