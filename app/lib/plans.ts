export type PlanKey =
  | "hosting_monthly"
  | "hosting_yearly"
  | "maintenance_monthly"
  | "maintenance_yearly";

export type Cycle = "monthly" | "yearly";
export type Tier = "hosting" | "maintenance";

export const PLANS: Record<
  Tier,
  {
    name: string;
    badge: string;
    recommended?: boolean;
    monthlyCents: number;
    yearlyCents: number;
    features: string[];
    note: string;
  }
> = {
  hosting: {
    name: "Website Hosting",
    badge: "Best for basic websites",
    monthlyCents: 2400,
    yearlyCents: 20000,
    features: [
      "Website hosting",
      "SSL certificate",
      "Domain management",
      "Website uptime monitoring",
      "Backups and security",
      "Technical maintenance",
      "Website status monitoring",
    ],
    note: "No commitment · Cancel anytime",
  },
  maintenance: {
    name: "Website Hosting + Maintenance",
    badge: "Recommended",
    recommended: true,
    monthlyCents: 9900,
    yearlyCents: 98400,
    features: [
      "Everything in Hosting, plus:",
      "Monthly website updates",
      "Product and content additions",
      "Website changes and improvements",
      "Priority technical support",
      "Basic SEO optimization",
      "Performance optimization",
      "Monthly website checks",
      "Ongoing website assistance",
    ],
    note: "No commitment · Cancel anytime",
  },
};

export const TIERS: Tier[] = ["hosting", "maintenance"];

export function formatUsd(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString("en-US")}`;
}

export function perMonthCents(yearlyTotalCents: number): number {
  return Math.round(yearlyTotalCents / 12);
}

export function savePercent(tier: Tier): number {
  const p = PLANS[tier];
  return Math.round((1 - p.yearlyCents / (p.monthlyCents * 12)) * 100);
}

export const MAX_SAVE_PERCENT = Math.max(...TIERS.map(savePercent));

export function planKeyFor(tier: Tier, cycle: Cycle): PlanKey {
  return `${tier}_${cycle}` as PlanKey;
}

export const PLAN_LABELS: Record<PlanKey, string> = {
  hosting_monthly: "Website Hosting — Monthly",
  hosting_yearly: "Website Hosting — Yearly",
  maintenance_monthly: "Website Hosting + Maintenance — Monthly",
  maintenance_yearly: "Website Hosting + Maintenance — Yearly",
};

export function planPrice(plan: PlanKey | null | undefined): {
  label: string;
  sub: string;
} {
  if (!plan) return { label: "No plan yet", sub: "" };
  const tier: Tier = plan.startsWith("hosting") ? "hosting" : "maintenance";
  const cycle: Cycle = plan.endsWith("yearly") ? "yearly" : "monthly";
  const p = PLANS[tier];
  if (cycle === "monthly") {
    return { label: `${formatUsd(p.monthlyCents)} / month`, sub: "Billed monthly" };
  }
  return {
    label: `${formatUsd(perMonthCents(p.yearlyCents))} / month`,
    sub: `${formatUsd(p.yearlyCents)} billed annually`,
  };
}

export const ACTIVE_STATUSES = ["active", "trialing", "past_due"];
