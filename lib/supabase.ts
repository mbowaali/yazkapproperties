import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// True when the public (client) credentials were present at build time.
// Check this before touching `supabase` so an unconfigured deployment shows
// a setup notice instead of crashing the client bundle.
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const CONFIG_ERROR =
  "Supabase is not configured on this deployment. " +
  "The site owner must set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY " +
  "in the hosting platform's environment variables, then trigger a new deployment " +
  "(they are baked into the app at build time).";

// Create a function to initialize Supabase client
const initializeSupabaseClient = (): SupabaseClient => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(CONFIG_ERROR);
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
    global: {
      headers: {
        'X-Client-Info': 'yazkap-properties/1.0',
      },
    },
  });
};

// Lazily-initialized shared anon client. A Proxy keeps the module import safe
// on the server (no access until actually used — event handlers/effects only
// run in the browser) while ensuring the client exists by the first real call.
let anonInstance: SupabaseClient | null = null;

const getAnonClient = (): SupabaseClient => {
  if (!anonInstance) anonInstance = initializeSupabaseClient();
  return anonInstance;
};

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getAnonClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

// Client-side Supabase client with PKCE support for OAuth
export const createBrowserClient = (): SupabaseClient => {
  return getAnonClient();
};

// Service role client for server-side operations that require higher permissions
export const createServiceRoleClient = () => {
  if (typeof window !== 'undefined') {
    console.warn('Service role client should only be used on the server side');
    return null;
  }

  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      "Supabase service-role credentials are not set. " +
      "Set SUPABASE_SERVICE_ROLE_KEY (and NEXT_PUBLIC_SUPABASE_URL) in the server environment."
    );
    return null;
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false, // Service role doesn't need session persistence
    },
  });
};

// Import authentication helpers
export const signInWithCredentials = async (email: string, password: string) => {
  return await createBrowserClient().auth.signInWithPassword({
    email,
    password,
  });
};

export const signUpWithCredentials = async (email: string, password: string, userData: any = {}) => {
  return await createBrowserClient().auth.signUp({
    email,
    password,
    options: {
      data: userData,
    },
  });
};

export const signOut = async () => {
  return await createBrowserClient().auth.signOut();
};
