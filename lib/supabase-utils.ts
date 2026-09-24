import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Type definitions
export type Database = {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: number;
          code: string;
          full_name: string;
          phone: string | null;
          email: string | null;
          emergency_contact: string | null;
          entry_date: string | null;
          monthly_rent: number | null;
          status: string | null;
          space_type: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          code: string;
          full_name: string;
          phone?: string | null;
          email?: string | null;
          emergency_contact?: string | null;
          entry_date?: string | null;
          monthly_rent?: number | null;
          status?: string | null;
          space_type?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          code?: string;
          full_name?: string;
          phone?: string | null;
          email?: string | null;
          emergency_contact?: string | null;
          entry_date?: string | null;
          monthly_rent?: number | null;
          status?: string | null;
          space_type?: string | null;
          created_at?: string;
        };
      };
      units: {
        Row: {
          id: number;
          label: string;
          type: string;
          rent: number | null;
          currency: string;
          status: string;
          advertised: boolean;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          label: string;
          type: string;
          rent?: number | null;
          currency?: string;
          status?: string;
          advertised?: boolean;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          label?: string;
          type?: string;
          rent?: number | null;
          currency?: string;
          status?: string;
          advertised?: boolean;
          notes?: string | null;
          created_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          email: string | null;
          emirates_id: string | null;
          employer: string | null;
          job_title: string | null;
          role: string;
          approved: boolean;
          id_document_url: string | null;
          work_contract_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          email?: string | null;
          emirates_id?: string | null;
          employer?: string | null;
          job_title?: string | null;
          role?: string;
          approved?: boolean;
          id_document_url?: string | null;
          work_contract_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone?: string | null;
          email?: string | null;
          emirates_id?: string | null;
          employer?: string | null;
          job_title?: string | null;
          role?: string;
          approved?: boolean;
          id_document_url?: string | null;
          work_contract_url?: string | null;
          created_at?: string;
        };
      };
      tenancies: {
        Row: {
          id: number;
          tenant_id: string;
          unit_id: number | null;
          rent: number | null;
          currency: string;
          start_date: string | null;
          end_date: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          tenant_id: string;
          unit_id?: number | null;
          rent?: number | null;
          currency?: string;
          start_date?: string | null;
          end_date?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          tenant_id?: string;
          unit_id?: number | null;
          rent?: number | null;
          currency?: string;
          start_date?: string | null;
          end_date?: string | null;
          status?: string;
          created_at?: string;
        };
      };
      transactions: {
        Row: {
          id: number;
          tenancy_id: number | null;
          tenant_name: string | null;
          date: string | null;
          type: string;
          amount: number;
          currency: string;
          method: string | null;
          status: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          tenancy_id?: number | null;
          tenant_name?: string | null;
          date?: string | null;
          type?: string;
          amount: number;
          currency?: string;
          method?: string | null;
          status?: string;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          tenancy_id?: number | null;
          tenant_name?: string | null;
          date?: string | null;
          type?: string;
          amount?: number;
          currency?: string;
          method?: string | null;
          status?: string;
          note?: string | null;
          created_at?: string;
        };
      };
      invoices: {
        Row: {
          id: number;
          invoice_no: string;
          tenancy_id: number | null;
          total: number;
          due_date: string | null;
          status: string;
          pdf_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          invoice_no: string;
          tenancy_id?: number | null;
          total: number;
          due_date?: string | null;
          status?: string;
          pdf_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          invoice_no?: string;
          tenancy_id?: number | null;
          total?: number;
          due_date?: string | null;
          status?: string;
          pdf_url?: string | null;
          created_at?: string;
        };
      };
      announcements: {
        Row: {
          id: number;
          title: string;
          body: string | null;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: number;
          title: string;
          body?: string | null;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: number;
          title?: string;
          body?: string | null;
          active?: boolean;
          created_at?: string;
        };
      };
      expenses: {
        Row: {
          id: number;
          date: string | null;
          year: number | null;
          month: string | null;
          category: string;
          description: string | null;
          amount: number;
          method: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          date?: string | null;
          year?: number | null;
          month?: string | null;
          category?: string;
          description?: string | null;
          amount: number;
          method?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          date?: string | null;
          year?: number | null;
          month?: string | null;
          category?: string;
          description?: string | null;
          amount?: number;
          method?: string | null;
          notes?: string | null;
          created_at?: string;
        };
      };
      landlord_payments: {
        Row: {
          id: number;
          date: string | null;
          year: number | null;
          month: string | null;
          amount: number;
          method: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          date?: string | null;
          year?: number | null;
          month?: string | null;
          amount: number;
          method?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          date?: string | null;
          year?: number | null;
          month?: string | null;
          amount?: number;
          method?: string | null;
          note?: string | null;
          created_at?: string;
        };
      };
    };
  };
  storage: {
    Tables: {
      buckets: {
        Row: {
          id: string;
          name: string;
          owner: string | null;
          created_at: string | null;
          updated_at: string | null;
          public: boolean | null;
          avif_autodetection: boolean | null;
          file_size_limit: number | null;
          allowed_mime_types: string[] | null;
        };
        Insert: {
          id: string;
          name: string;
          owner?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          public?: boolean | null;
          avif_autodetection?: boolean | null;
          file_size_limit?: number | null;
          allowed_mime_types?: string[] | null;
        };
        Update: {
          id?: string;
          name?: string;
          owner?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          public?: boolean | null;
          avif_autodetection?: boolean | null;
          file_size_limit?: number | null;
          allowed_mime_types?: string[] | null;
        };
      };
      objects: {
        Row: {
          id: string;
          bucket_id: string | null;
          name: string | null;
          owner: string | null;
          created_at: string | null;
          updated_at: string | null;
          last_accessed_at: string | null;
          metadata: Record<string, unknown> | null;
        };
        Insert: {
          id?: string;
          bucket_id?: string | null;
          name?: string | null;
          owner?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          last_accessed_at?: string | null;
          metadata?: Record<string, unknown> | null;
        };
        Update: {
          id?: string;
          bucket_id?: string | null;
          name?: string | null;
          owner?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          last_accessed_at?: string | null;
          metadata?: Record<string, unknown> | null;
        };
      };
    };
  };
};

export type SupabaseTypedClient = SupabaseClient<Database>;

// Environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("Missing Supabase environment variables. Some functionality may not work properly.");
}

// Create clients
const createAnonClient = (): SupabaseTypedClient => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase URL and/or ANON key not set in environment variables");
  }
  
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
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

const createServiceRoleClient = (): SupabaseTypedClient => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase URL and/or SERVICE ROLE key not set in environment variables");
  }
  
  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false, // Service role doesn't need session persistence
    },
  });
};

// Export singleton instances
export const supabaseAnon = createAnonClient();
export const supabaseService = createServiceRoleClient();

// Authentication helpers
export const signInWithCredentials = async (email: string, password: string) => {
  return await supabaseAnon.auth.signInWithPassword({
    email,
    password,
  });
};

export const signUpWithCredentials = async (email: string, password: string, userData: any = {}) => {
  return await supabaseAnon.auth.signUp({
    email,
    password,
    options: {
      data: userData,
    },
  });
};

export const signOut = async () => {
  return await supabaseAnon.auth.signOut();
};

// Storage helpers
export const uploadFile = async (bucket: string, filePath: string, file: File, options?: any) => {
  return await supabaseAnon.storage
    .from(bucket)
    .upload(filePath, file, options);
};

export const getFileUrl = async (bucket: string, filePath: string) => {
  const { data } = await supabaseAnon.storage
    .from(bucket)
    .getPublicUrl(filePath);
  
  return data?.publicUrl || null;
};

// Type guard functions
export const isAdmin = (role: string | null): boolean => {
  return role === 'admin';
};

export const isTenant = (role: string | null): boolean => {
  return role === 'tenant';
};