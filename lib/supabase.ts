import { createClient } from "@supabase/supabase-js";

// Environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("Missing Supabase environment variables. Some functionality may not work properly.");
}

// Create a function to initialize Supabase client
const initializeSupabaseClient = () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Supabase URL and/or ANON key not set in environment variables");
    return null;
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

// Export the main client instance - this will be undefined on the server side
let supabaseInstance: any = null;

// Initialize the client only in the browser
if (typeof window !== 'undefined') {
  supabaseInstance = initializeSupabaseClient();
}

export { supabaseInstance as supabase };

// Client-side Supabase client with PKCE support for OAuth
export const createBrowserClient = () => {
  if (typeof window === 'undefined') {
    // Return null on the server side
    return null;
  }
  
  if (!supabaseInstance) {
    supabaseInstance = initializeSupabaseClient();
  }
  
  return supabaseInstance;
};

// Service role client for server-side operations that require higher permissions
export const createServiceRoleClient = () => {
  if (typeof window !== 'undefined') {
    console.warn('Service role client should only be used on the server side');
    return null;
  }
  
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Supabase URL and/or SERVICE ROLE key not set in environment variables");
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
  const supabaseClient = createBrowserClient();
  if (!supabaseClient) {
    throw new Error('Supabase client not initialized');
  }
  
  return await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });
};

export const signUpWithCredentials = async (email: string, password: string, userData: any = {}) => {
  const supabaseClient = createBrowserClient();
  if (!supabaseClient) {
    throw new Error('Supabase client not initialized');
  }
  
  return await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: userData,
    },
  });
};

export const signOut = async () => {
  const supabaseClient = createBrowserClient();
  if (!supabaseClient) {
    throw new Error('Supabase client not initialized');
  }
  
  return await supabaseClient.auth.signOut();
};