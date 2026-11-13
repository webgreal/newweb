"use client";

import { createClient } from "@/app/lib/supabase";
import { EXIT_COOKIE, PLAN_COOKIE } from "@/app/lib/onboarding";
import type { PlanKey } from "@/app/lib/plans";

/**
 * Where should the user go right after authenticating?
 * - picked a plan on /hosting -> straight to checkout
 * - exited onboarding before  -> /dashboard
 * - no active subscription    -> /hosting (onboarding)
 * - has one already           -> /dashboard
 */
export async function redirectAfterAuth(
  router: ReturnType<typeof import("next/navigation").useRouter>
): Promise<void> {
  const supabase = createClient();
  const pendingPlan = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${PLAN_COOKIE}=`))
    ?.split("=")[1] as PlanKey | undefined;

  const exited = document.cookie
    .split("; ")
    .some((c) => c.startsWith(`${EXIT_COOKIE}=1`));

  const { startCheckout } = await import("@/app/lib/checkout");

  if (pendingPlan) {
    document.cookie = `${PLAN_COOKIE}=; path=/; max-age=0; samesite=lax`;
    try {
      await startCheckout(pendingPlan);
      return; // navigates away to Stripe
    } catch {
      // fall through to normal routing
    }
  }

  let hasActive = false;
  const { data } = await supabase.rpc("get_my_subscription");
  const row = Array.isArray(data) ? data[0] : data;
  hasActive = !!row?.status && ["active", "trialing", "past_due"].includes(row.status);

  if (hasActive || exited) {
    router.push("/dashboard");
  } else {
    router.push("/hosting");
  }
  router.refresh();
}
