import { getOwnedConversation, listMessages, toSummary } from "@/lib/conversations";
import { isUuid, json, jsonError } from "@/lib/http";
import { logError } from "@/lib/log";
import { getSessionUser } from "@/lib/supabase/server";
import { isMode } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!isUuid(id)) return jsonError(404, "Conversa não encontrada.");
  const session = await getSessionUser();
  if (!session) return jsonError(401, "Entre na sua conta para abrir esta conversa.");
  const conv = await getOwnedConversation(session.supabase, session.user.id, id);
  if (!conv) return jsonError(404, "Conversa não encontrada.");
  const messages = await listMessages(session.supabase, session.user.id, id);
  return json({ conversation: toSummary(conv), messages });
}

/** Troca o modo ativo (Mãe/Pai) da conversa. */
export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  if (!isUuid(id)) return jsonError(404, "Conversa não encontrada.");
  const session = await getSessionUser();
  if (!session) return jsonError(401, "Entre na sua conta.");
  const body = (await request.json().catch(() => null)) as { activeMode?: unknown } | null;
  if (!body || !isMode(body.activeMode)) return jsonError(400, "Modo inválido.");
  const conv = await getOwnedConversation(session.supabase, session.user.id, id);
  if (!conv) return jsonError(404, "Conversa não encontrada.");
  const { error } = await session.supabase
    .from("conversations")
    .update({ active_mode: body.activeMode })
    .eq("id", id)
    .eq("user_id", session.user.id);
  if (error) {
    logError("conversations.patch", error);
    return jsonError(500, "Não consegui trocar o modo.");
  }
  return json({ ok: true });
}

/** Apaga a conversa; as mensagens vão junto (on delete cascade). */
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!isUuid(id)) return jsonError(404, "Conversa não encontrada.");
  const session = await getSessionUser();
  if (!session) return jsonError(401, "Entre na sua conta.");
  const conv = await getOwnedConversation(session.supabase, session.user.id, id);
  if (!conv) return jsonError(404, "Conversa não encontrada.");
  const { error } = await session.supabase
    .from("conversations")
    .delete()
    .eq("id", id)
    .eq("user_id", session.user.id);
  if (error) {
    logError("conversations.delete", error);
    return jsonError(500, "Não consegui apagar a conversa.");
  }
  return json({ ok: true });
}
