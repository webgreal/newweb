"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check } from "lucide-react";
import {
  PLANS,
  TIERS,
  Tier,
  Cycle,
  PlanKey,
  formatUsd,
  perMonthCents,
  savePercent,
  MAX_SAVE_PERCENT,
} from "@/app/lib/plans";
import { startCheckout } from "@/app/lib/checkout";
import { useUser } from "@/app/components/useUser";
import { PLAN_COOKIE, EXIT_COOKIE } from "@/app/lib/onboarding";

function PlanCard({
  tier,
  cycle,
  onCheckout,
  busyPlan,
}: {
  tier: Tier;
  cycle: Cycle;
  onCheckout: (plan: PlanKey) => void;
  busyPlan: PlanKey | null;
}) {
  const p = PLANS[tier];
  const plan: PlanKey = `${tier}_${cycle}`;
  const monthly = cycle === "monthly";
  const bigPrice = monthly ? formatUsd(p.monthlyCents) : formatUsd(perMonthCents(p.yearlyCents));
  const smallPrint = monthly ? "Billed monthly" : `${formatUsd(p.yearlyCents)} billed annually`;

  return (
    <div className="glass-card p-8 flex flex-col relative">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-xl font-bold">{p.name}</h2>
        <span
          className={`text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap ${
            p.recommended
              ? "bg-green-100 text-green-700"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {p.badge}
        </span>
      </div>

      <div className="mt-6">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold tracking-tight">{bigPrice}</span>
          <span className="text-slate-500 font-medium">/ month</span>
        </div>
        <p className="text-sm text-slate-500 mt-1">{smallPrint}</p>
      </div>

      <ul className="mt-6 space-y-2.5 flex-1">
        {p.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
            <Check size={16} className="text-[#1a7bff] mt-0.5 shrink-0" />
            {f}
          </li>
        ))}
      </ul>

      <button
        onClick={() => onCheckout(plan)}
        disabled={busyPlan !== null}
        className="btn-primary w-full mt-8"
      >
        {busyPlan === plan ? "Starting checkout..." : "Get Started"}
      </button>
      <p className="text-xs text-slate-500 text-center mt-3">{p.note}</p>
    </div>
  );
}

export default function HostingPage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const [cycle, setCycle] = useState<Cycle>("yearly");
  const [busyPlan, setBusyPlan] = useState<PlanKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout(plan: PlanKey) {
    setError(null);

    if (!user) {
      document.cookie = `${PLAN_COOKIE}=${plan}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;
      router.push("/signup");
      return;
    }

    setBusyPlan(plan);
    try {
      await startCheckout(plan);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusyPlan(null);
    }
  }

  function handleExit() {
    document.cookie = `${EXIT_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    router.push("/dashboard");
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="text-center max-w-2xl mx-auto">
        <p className="micro-label">Hosting plans</p>
        <h1 className="text-4xl font-bold mt-2 tracking-tight">
          Everything your website needs, in one plan
        </h1>
        <p className="text-slate-600 mt-4 text-lg leading-relaxed">
          Pick the level of care your site deserves. Switch or cancel whenever you like.
        </p>
      </div>

      <div className="flex justify-center mt-8">
        <div className="inline-flex bg-slate-100 rounded-full p-1" role="tablist">
          <button
            role="tab"
            aria-selected={cycle === "monthly"}
            onClick={() => setCycle("monthly")}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
              cycle === "monthly" ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Monthly
          </button>
          <button
            role="tab"
            aria-selected={cycle === "yearly"}
            onClick={() => setCycle("yearly")}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
              cycle === "yearly" ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Yearly · Save {MAX_SAVE_PERCENT}%
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-6 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2 text-center max-w-md mx-auto">
          {error}
        </p>
      )}

      <div className="grid md:grid-cols-2 gap-6 mt-10">
        {TIERS.map((tier) => (
          <PlanCard
            key={tier}
            tier={tier}
            cycle={cycle}
            onCheckout={handleCheckout}
            busyPlan={busyPlan}
          />
        ))}
      </div>

      <div className="text-center mt-10">
        <Link
          href="/dashboard"
          onClick={handleExit}
          className="text-sm text-slate-500 hover:text-[#1a7bff] transition-colors"
        >
          Exit — go to my dashboard
        </Link>
      </div>
    </div>
  );
}
