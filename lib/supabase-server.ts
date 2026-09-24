import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

// Server component client for server-side operations
export const createSupabaseServerClient = () => {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          try {
            cookieStore.set(name, value, options as never);
          } catch {
            // Called from a Server Component — safe to ignore when middleware
            // refreshes sessions.
          }
        },
        remove(name: string, options: Record<string, unknown>) {
          try {
            cookieStore.set(name, "", { ...options, maxAge: 0 } as never);
          } catch {
            // Called from a Server Component — safe to ignore when middleware
            // refreshes sessions.
          }
        },
      },
    }
  );
};

// Cached server function to get user session
export const getCurrentUser = cache(async () => {
  const supabase = createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user || null;
});

export const getUserRole = cache(async (userId: string) => {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user role:', error);
    return null;
  }

  return data?.role || null;
});
