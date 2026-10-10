// Compatibility shim — replaces Supabase with Vercel Postgres API calls
// All existing pages import from here and continue to work unchanged.
import * as dbClient from "@/lib/db-client";

export const isSupabaseConfigured = true;

// Drop-in replacement for supabase.from(table)
export const supabase = {
  from: dbClient.from,
  storage: dbClient.storage,
  auth: {
    getSession: async () => {
      const res = await fetch("/api/auth/me");
      const { user } = await res.json();
      return { data: { session: user ? { user: { id: user.id, email: user.email } } : null }, error: null };
    },
    onAuthStateChange: (_event: any, _cb: any) => ({
      data: { subscription: { unsubscribe: () => {} } },
    }),
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) return { error: { message: json.error } };
      return { data: { role: json.role }, error: null };
    },
    signUp: async ({ email, password, options }: any) => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, ...options?.data }),
      });
      const json = await res.json();
      if (!res.ok) return { data: null, error: { message: json.error } };
      return { data: { user: { id: json.id } }, error: null };
    },
    signOut: async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      return { error: null };
    },
  },
};

export const createBrowserClient = () => supabase;

export const signInWithCredentials = async (email: string, password: string) =>
  supabase.auth.signInWithPassword({ email, password });

export const signUpWithCredentials = async (email: string, password: string, userData: any = {}) =>
  supabase.auth.signUp({ email, password, options: { data: userData } });

export const signOut = async () => {
  await fetch("/api/auth/logout", { method: "POST" });
};
