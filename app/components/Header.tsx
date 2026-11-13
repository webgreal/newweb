"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User as UserIcon, LogOut, LayoutDashboard, Menu, X } from "lucide-react";
import { createClient } from "@/app/lib/supabase";
import { useUser } from "./useUser";

export default function Header() {
  const { user, loading } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setMenuOpen(false);
    setMobileOpen(false);
    router.push("/hosting");
    router.refresh();
  }

  const navLinks = (
    <>
      <Link
        href="/hosting"
        className="text-sm text-slate-600 hover:text-[#1a7bff] transition-colors"
        onClick={() => setMobileOpen(false)}
      >
        Home
      </Link>
      <Link
        href="/hosting"
        className="text-sm text-slate-600 hover:text-[#1a7bff] transition-colors"
        onClick={() => setMobileOpen(false)}
      >
        Hosting
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/hosting" className="text-xl font-bold text-[#1a7bff]">
          Webgreal
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">{navLinks}</nav>

        <div className="hidden md:block">
          {loading ? (
            <div className="w-9 h-9 rounded-full bg-slate-100 animate-pulse" />
          ) : user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                aria-label="Account menu"
                onClick={() => setMenuOpen((v) => !v)}
                className="w-9 h-9 rounded-full bg-[#e8f1ff] flex items-center justify-center text-[#1a7bff] hover:bg-[#d6e7ff] transition-colors"
              >
                <UserIcon size={18} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white shadow-lg border border-slate-100 py-2 z-50">
                  <div className="px-4 py-2 text-sm text-slate-500 truncate border-b border-slate-100">
                    {user.email}
                  </div>
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    <LayoutDashboard size={16} /> Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <LogOut size={16} /> Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              aria-label="Log in"
              className="w-9 h-9 rounded-full bg-[#e8f1ff] flex items-center justify-center text-[#1a7bff] hover:bg-[#d6e7ff] transition-colors"
            >
              <UserIcon size={18} />
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          aria-label="Menu"
          className="md:hidden w-9 h-9 flex items-center justify-center text-slate-700"
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 py-4 flex flex-col gap-4">
          {navLinks}
          {loading ? null : user ? (
            <>
              <div className="text-sm text-slate-500 truncate">{user.email}</div>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-sm text-slate-700"
                onClick={() => setMobileOpen(false)}
              >
                <LayoutDashboard size={16} /> Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm text-slate-700"
              >
                <LogOut size={16} /> Log out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2 text-sm text-slate-700"
              onClick={() => setMobileOpen(false)}
            >
              <UserIcon size={16} /> Log in
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
