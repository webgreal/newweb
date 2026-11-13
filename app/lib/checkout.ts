import { createClient } from "@/app/lib/supabase";
import type { PlanKey } from "@/app/lib/plans";

export async function startCheckout(plan: PlanKey): Promise<void> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Please log in first.");

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-checkout-session`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ plan }),
    }
  );
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.url) {
    throw new Error(body?.error ?? "Could not start checkout. Please try again.");
  }
  window.location.href = body.url as string;
}

export async function openBillingPortal(): Promise<void> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Please log in first.");

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-portal-session`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
    }
  );
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.url) {
    throw new Error(body?.error ?? "Could not open the billing portal.");
  }
  window.location.href = body.url as string;
}
