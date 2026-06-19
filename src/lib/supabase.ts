import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Null in demo mode — every hook degrades gracefully without a backend. */
export const supabase = url && anon ? createClient(url, anon) : null;

export const FUNCTIONS_BASE = url ? `${url}/functions/v1` : null;
