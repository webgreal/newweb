import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase-server";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) redirect("/dashboard");

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <div className="glass-card p-10">
        <p className="micro-label">Admin</p>
        <h1 className="text-3xl font-bold mt-2">Admin panel</h1>
        <p className="text-slate-600 mt-3">
          Client management tools will appear here soon.
        </p>
      </div>
    </div>
  );
}
