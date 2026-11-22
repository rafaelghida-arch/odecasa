import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/server-env";

let admin: SupabaseClient | null = null;

/**
 * Cliente privilegiado (service_role). Só existe no servidor e só é usado
 * para o controle de limites de uso. Nunca é usado para ler conversas.
 */
export function getAdminSupabase(): SupabaseClient | null {
  if (!publicEnv.supabaseUrl || !serverEnv.serviceRoleKey) return null;
  if (!admin) {
    admin = createClient(publicEnv.supabaseUrl, serverEnv.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return admin;
}
