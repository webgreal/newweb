"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/app/lib/supabase";
import { redirectAfterAuth } from "@/app/lib/redirect-after-auth";

type DomainType = "existing" | "new";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [domainType, setDomainType] = useState<DomainType>("new");
  const [domain, setDomain] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validateDomain(value: string): string | null {
    if (!value) return "Please enter a domain.";
    if (/\s/.test(value)) return "The domain must not contain spaces.";
    if (/^https?:\/\//i.test(value))
      return "Enter just the domain, without http:// or https://.";
    if (!value.includes(".")) return "The domain must contain a dot (e.g. mybusiness.com).";
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const domainError = validateDomain(domain.trim());
    if (domainError) {
      setError(domainError);
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { error: signupError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          phone: phone.trim(),
          business_name: businessName.trim(),
          domain_type: domainType,
          requested_domain: domain.trim().toLowerCase(),
        },
      },
    });

    if (signupError) {
      setError(
        signupError.message === "User already registered"
          ? "An account with this email already exists. Try logging in."
          : signupError.message
      );
      setSubmitting(false);
      return;
    }

    await redirectAfterAuth(router);
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="glass-card p-8">
        <p className="micro-label">Get started</p>
        <h1 className="text-2xl font-bold mt-1 mb-6">Create your account</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 mb-1">
              Full name
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">
              Phone
            </label>
            <input
              id="phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label htmlFor="businessName" className="block text-sm font-medium text-slate-700 mb-1">
              Business name
            </label>
            <input
              id="businessName"
              type="text"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="input-field"
            />
          </div>

          <fieldset className="border border-slate-200 rounded-2xl p-4">
            <legend className="text-sm font-medium text-slate-700 px-2">Domain</legend>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="domainType"
                  checked={domainType === "existing"}
                  onChange={() => setDomainType("existing")}
                  className="accent-[#1a7bff]"
                />
                I already have a domain
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="domainType"
                  checked={domainType === "new"}
                  onChange={() => setDomainType("new")}
                  className="accent-[#1a7bff]"
                />
                I need a new domain
              </label>
            </div>
            <div className="mt-3">
              <label htmlFor="domain" className="block text-sm font-medium text-slate-700 mb-1">
                {domainType === "existing" ? "Your domain" : "Domain you want us to register"}
              </label>
              <input
                id="domain"
                type="text"
                required
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder={domainType === "existing" ? "yourbusiness.com" : "mybusiness.com"}
                className="input-field"
              />
              <p className="text-xs text-slate-500 mt-1">
                We will check availability and confirm with you before registering.
              </p>
            </div>
          </fieldset>

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
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
            />
            <p className="text-xs text-slate-500 mt-1">At least 8 characters.</p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2">
              {error}
            </p>
          )}

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="text-sm text-slate-600 mt-4 text-center">
          Already have an account?{" "}
          <Link href="/login" className="text-[#1a7bff] font-medium hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
