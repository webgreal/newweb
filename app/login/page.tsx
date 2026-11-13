"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/app/lib/supabase";
import { redirectAfterAuth } from "@/app/lib/redirect-after-auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (loginError) {
      setError(
        loginError.message === "Invalid login credentials"
          ? "Incorrect email or password."
          : loginError.message
      );
      setSubmitting(false);
      return;
    }

    await redirectAfterAuth(router);
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="glass-card p-8">
        <p className="micro-label">Welcome back</p>
        <h1 className="text-2xl font-bold mt-1 mb-6">Log in</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2">
              {error}
            </p>
          )}

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="text-sm text-slate-600 mt-4 text-center">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-[#1a7bff] font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
