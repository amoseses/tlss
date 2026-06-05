import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getSupabasePublishableEnv } from "@/lib/supabase/env";

const authRoutes = ["/login", "/signup"];

const protectedPrefixes = ["/account", "/orders"];

const adminPrefix = "/admin";
const managerPrefix = "/manager";

function isProtectedPath(pathname: string) {
  return protectedPrefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

function isAdminPath(pathname: string) {
  return pathname === adminPrefix || pathname.startsWith(`${adminPrefix}/`);
}

function isManagerPath(pathname: string) {
  return pathname === managerPrefix || pathname.startsWith(`${managerPrefix}/`);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let supabaseResponse = NextResponse.next({
    request,
  });

  const { url: supabaseUrl, anonKey: supabaseAnonKey } = getSupabasePublishableEnv();

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (authRoutes.some((r) => pathname === r || pathname.startsWith(`${r}/`))) {
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_banned")
        .eq("id", user.id)
        .single();

      if (profile?.is_banned) {
        await supabase.auth.signOut();
        return supabaseResponse;
      }

      const next = request.nextUrl.searchParams.get("next") || "/";
      return NextResponse.redirect(new URL(next, request.url));
    }
    return supabaseResponse;
  }

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_banned")
      .eq("id", user.id)
      .single();

    if (profile?.is_banned) {
      await supabase.auth.signOut();
      const login = new URL("/login", request.url);
      login.searchParams.set("banned", "1");
      return NextResponse.redirect(login);
    }

    if (isManagerPath(pathname)) {
      if (profile?.role !== "admin") {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }

    if (isAdminPath(pathname)) {
      if (profile?.role !== "admin") {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }
  }

  if ((isProtectedPath(pathname) || isAdminPath(pathname) || isManagerPath(pathname)) && !user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
