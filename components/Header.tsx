"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase";

interface NavLink {
  href: string;
  label: string;
}

const LINKS: NavLink[] = [
  { href: "/", label: "Vacancies" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    let subscription: any = null;
    
    // Initialize Supabase client
    const supabaseClient = createBrowserClient();
    if (supabaseClient) {
      // Get current user session
      const getUserSession = async () => {
        const { data: { session } } = await supabaseClient.auth.getSession();
        setUser(session?.user || null);
        setLoading(false);
      };

      getUserSession();

      // Listen for auth changes
      const { data: subData } = supabaseClient.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user || null);
      });
      
      subscription = subData.subscription;
    } else {
      console.error('Supabase client not initialized');
      setLoading(false);
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75">
      <div className="container-page flex h-16 items-center justify-between gap-3">
        <Link href="/" onClick={() => setOpen(false)} className="shrink-0" aria-label="Yazkap Properties home">
          <Image src="/logo.svg" alt="Yazkap Properties" width={168} height={45} priority className="h-10 w-auto sm:h-11" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-primary-50 hover:text-primary ${
                pathname === l.href ? "text-primary" : "text-slate-600"
              }`}
            >
              {l.label}
            </Link>
          ))}
          
          {!loading && (
            <>
              {user ? (
                <Link href="/dashboard" className="btn-primary ml-2 !min-h-0 px-4 py-2">
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-primary-50 hover:text-primary">
                    Login
                  </Link>
                  <Link href="/register" className="btn-primary ml-2 !min-h-0 px-4 py-2">
                    Register
                  </Link>
                </>
              )}
            </>
          )}
        </nav>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label="Toggle menu"
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 transition hover:bg-slate-100 md:hidden"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? (
              <>
                <path d="M6 6l12 12M18 6L6 18" />
              </>
            ) : (
              <>
                <path d="M4 7h16M4 12h16M4 17h16" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <nav className="border-t border-slate-100 bg-white px-4 pb-4 pt-2 md:hidden">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`block rounded-lg px-3 py-3 text-sm font-medium ${
                pathname === l.href ? "bg-primary-50 text-primary" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {l.label}
            </Link>
          ))}
          
          {!loading && (
            <>
              {user ? (
                <Link href="/dashboard" onClick={() => setOpen(false)} className="btn-primary mt-2 w-full">
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link href="/login" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50">
                    Login
                  </Link>
                  <Link href="/register" onClick={() => setOpen(false)} className="btn-primary mt-2 w-full">
                    Register as Tenant
                  </Link>
                </>
              )}
            </>
          )}
        </nav>
      )}
    </header>
  );
}