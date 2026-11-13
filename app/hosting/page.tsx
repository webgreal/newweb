import Link from "next/link";

export default function HostingPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <div className="glass-card p-10 text-center">
        <p className="micro-label">Hosting</p>
        <h1 className="text-3xl font-bold mt-2 mb-3">Plans coming soon</h1>
        <p className="text-slate-600">
          Our hosting plans are on the way. Check back shortly.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/signup" className="btn-primary">
            Create an account
          </Link>
          <Link
            href="/dashboard"
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
