import { isSupabaseConfigured } from "@/lib/env";
import { json } from "@/lib/http";
import { isDemoMode } from "@/lib/server-env";
import { getSessionUser } from "@/lib/supabase/server";

export async function GET() {
  const session = await getSessionUser();
  return json({
    user: session ? { id: session.user.id, email: session.user.email ?? null } : null,
    authAvailable: isSupabaseConfigured(),
    demo: isDemoMode(),
  });
}
