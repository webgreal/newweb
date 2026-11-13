import type { PlanKey } from "./plans";

export type OnboardingState = "needs_plan" | "exit" | "has_plan";

export const EXIT_COOKIE = "webgreal_exit";
export const PLAN_COOKIE = "webgreal_pending_plan";

/** Effective onboarding state: needs_plan | exit | has_plan. Server-safe. */
export function computeOnboardingState(opts: {
  hasActiveSubscription: boolean;
  exitCookieValue: string | undefined;
}): OnboardingState {
  if (opts.hasActiveSubscription) return "has_plan";
  if (opts.exitCookieValue === "1") return "exit";
  return "needs_plan";
}

/** Reads the pending plan from a cookie value (server) — plain parse, no side effects. */
export function readPendingPlan(cookieValue: string | undefined): PlanKey | null {
  if (!cookieValue) return null;
  return ["hosting_monthly", "hosting_yearly", "maintenance_monthly", "maintenance_yearly"].includes(
    cookieValue
  )
    ? (cookieValue as PlanKey)
    : null;
}
