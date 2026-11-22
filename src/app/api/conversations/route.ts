import { toSummary } from "@/lib/conversations";
import { json, jsonError } from "@/lib/http";
import { logError } from "@/lib/log";
import { getSessionUser } from "@/lib/supabase/server";

/** Lista as conversas da conta (somente as próprias). */
export async function GET() {
  const session = await getSessionUser();
  if (!session) return jsonError(401, "Entre na sua conta para ver o histórico.");
  const { data, error } = await session.supabase
    .from("conversations")
    .select("id, user_id, title, active_mode, updated_at")
    .eq("user_id", session.user.id)
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) {
    logError("conversations.list", error);
    return jsonError(500, "Não consegui carregar o histórico.");
  }
  return json({ conversations: (data ?? []).map(toSummary) });
}
