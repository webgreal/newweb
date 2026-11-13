import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { computeOnboardingState, EXIT_COOKIE } from "@/app/lib/onboarding";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const protectedPaths = ["/dashboard", "/admin"];
  const isProtected = protectedPaths.some(
    (p) => path === p || path.startsWith(p + "/")
  );

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (path === "/hosting" && user) {
    let hasActive = false;
    try {
      const { data } = await supabase.rpc("get_my_subscription");
      const row = Array.isArray(data) ? data[0] : data;
      hasActive = !!row?.status && ["active", "trialing", "past_due"].includes(row.status);
    } catch {
      hasActive = false;
    }

    const state = computeOnboardingState({
      hasActiveSubscription: hasActive,
      exitCookieValue: request.cookies.get(EXIT_COOKIE)?.value,
    });

    if (state === "has_plan") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/hosting"],
};
