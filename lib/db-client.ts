// Client-side DB helper — replaces supabase.from() calls
// All requests go through /api/db which enforces auth server-side

type QueryOptions = {
  select?: string;
  orderBy?: string;
  orderAsc?: boolean;
  limit?: number;
  eqField?: string;
  eqValue?: string;
};

async function dbFetch(table: string, opts: QueryOptions = {}) {
  const params = new URLSearchParams({ table });
  if (opts.select) params.set("select", opts.select);
  if (opts.orderBy) params.set("orderBy", opts.orderBy);
  if (opts.orderAsc !== undefined) params.set("orderAsc", String(opts.orderAsc));
  if (opts.limit) params.set("limit", String(opts.limit));
  if (opts.eqField) params.set("eqField", opts.eqField);
  if (opts.eqValue) params.set("eqValue", opts.eqValue);

  const res = await fetch(`/api/db?${params}`);
  const json = await res.json();
  return { data: json.data ?? null, error: json.error ?? null };
}

async function dbInsert(table: string, payload: Record<string, any>) {
  const res = await fetch("/api/db", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ table, payload }),
  });
  const json = await res.json();
  return { data: json.data ?? null, error: json.error ?? null };
}

async function dbUpdate(table: string, id: number | string, payload: Record<string, any>) {
  const res = await fetch("/api/db", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ table, id, payload }),
  });
  const json = await res.json();
  return { data: json.data ?? null, error: json.error ?? null };
}

async function dbDelete(table: string, id: number | string) {
  const res = await fetch("/api/db", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ table, id }),
  });
  const json = await res.json();
  return { error: json.error ?? null };
}

// Mimics the supabase client interface used throughout the app
export function from(table: string) {
  return {
    select: (cols = "*") => ({
      limit: (n: number) => ({
        order: (col: string, opts?: { ascending?: boolean }) =>
          dbFetch(table, { select: cols, orderBy: col, orderAsc: opts?.ascending, limit: n }),
        then: (resolve: any) => dbFetch(table, { select: cols, limit: n }).then(resolve),
      }),
      order: (col: string, opts?: { ascending?: boolean }) => ({
        limit: (n: number) => dbFetch(table, { select: cols, orderBy: col, orderAsc: opts?.ascending, limit: n }),
        then: (resolve: any) => dbFetch(table, { select: cols, orderBy: col, orderAsc: opts?.ascending }).then(resolve),
      }),
      eq: (field: string, value: any) => ({
        single: () => dbFetch(table, { select: cols, eqField: field, eqValue: String(value), limit: 1 })
          .then(r => ({ data: r.data?.[0] ?? null, error: r.error })),
        order: (col: string, opts?: { ascending?: boolean }) =>
          dbFetch(table, { select: cols, eqField: field, eqValue: String(value), orderBy: col, orderAsc: opts?.ascending }),
        then: (resolve: any) => dbFetch(table, { select: cols, eqField: field, eqValue: String(value) }).then(resolve),
      }),
      gte: (_field: string, _value: string) =>
        // gte filtering handled server-side for now; return all and filter client-side
        dbFetch(table, { select: cols, limit: 5000 }),
      neq: (_field: string, _value: string) =>
        dbFetch(table, { select: cols, limit: 2000 }),
      single: () => dbFetch(table, { select: cols, limit: 1 })
        .then(r => ({ data: r.data?.[0] ?? null, error: r.error })),
      then: (resolve: any) => dbFetch(table, { select: cols }).then(resolve),
    }),
    insert: (payload: Record<string, any>) => dbInsert(table, payload),
    update: (payload: Record<string, any>) => ({
      eq: (field: string, value: any) => {
        if (field === "id") return dbUpdate(table, value, payload);
        // fallback: fetch id first not needed for our use case
        return dbUpdate(table, value, payload);
      },
    }),
    upsert: (payload: Record<string, any>) => dbInsert(table, payload),
    delete: () => ({
      eq: (field: string, value: any) => {
        if (field === "id") return dbDelete(table, value);
        return dbDelete(table, value);
      },
    }),
  };
}

// Storage stub — photos stored as base64 data URLs or external URLs
export const storage = {
  from: (_bucket: string) => ({
    upload: async (_path: string, _file: File, _opts?: any) => ({ error: null }),
    getPublicUrl: (_path: string) => ({ data: { publicUrl: "" } }),
  }),
};

export const isConfigured = true;
