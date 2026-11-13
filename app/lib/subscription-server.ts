import { createClient } from "@/app/lib/supabase-server";

export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_my_subscription");
  if (error) return false;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.status) return false;
  return ["active", "trialing", "past_due"].includes(row.status);
}
