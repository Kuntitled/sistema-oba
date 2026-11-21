import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const PLACEHOLDER_SERVICE_KEY = "your-service-role-key-here";

export function isServiceRoleConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return Boolean(url && key && key !== PLACEHOLDER_SERVICE_KEY);
}

/**
 * Cliente Supabase com Service Role (exclusivo para uso em servidor).
 * Nunca importar este arquivo em Client Components.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey || serviceRoleKey === PLACEHOLDER_SERVICE_KEY) {
    return null;
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
