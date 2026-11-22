import { isUuid, json, jsonError, makeTitle } from "@/lib/http";
import { logError } from "@/lib/log";
import { getSessionUser } from "@/lib/supabase/server";
import { isMode, type Mode } from "@/lib/types";

const MAX_MESSAGES = 200;
const MAX_CHARS = 20000;

/** Salva na conta uma conversa feita no modo visitante (somente texto). */
export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) return jsonError(401, "Entre na sua conta para salvar a conversa.");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Conversa inválida.");
  }
  const b = (body ?? {}) as Record<string, unknown>;
  if (!isMode(b.activeMode) || !Array.isArray(b.messages)) return jsonError(400, "Conversa inválida.");

  const messages: { id?: string; role: "user" | "assistant"; content: string; mode: Mode; hasImage: boolean }[] = [];
  for (const raw of b.messages.slice(0, MAX_MESSAGES)) {
    const m = (raw ?? {}) as Record<string, unknown>;
    if ((m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string" || !isMode(m.mode)) continue;
    const content = m.content.trim().slice(0, MAX_CHARS);
    if (!content) continue;
    messages.push({ role: m.role, content, mode: m.mode, hasImage: m.hasImage === true });
  }
  if (messages.length === 0) return jsonError(400, "Não há mensagens para salvar.");

  const firstUser = messages.find((m) => m.role === "user");
  const title = makeTitle(firstUser?.content ?? "", Boolean(firstUser?.hasImage));

  const { data: conv, error: convError } = await session.supabase
    .from("conversations")
    .insert({ user_id: session.user.id, title, active_mode: b.activeMode })
    .select("id")
    .single();
  if (convError || !conv || !isUuid(conv.id)) {
    logError("conversations.import", convError);
    return jsonError(500, "Não consegui salvar a conversa.");
  }

  const start = Date.now() - messages.length;
  const { error } = await session.supabase.from("messages").insert(
    messages.map((m, i) => ({
      conversation_id: conv.id,
      user_id: session.user.id,
      role: m.role,
      content: m.content,
      mode: m.mode,
      has_image: m.hasImage,
      created_at: new Date(start + i).toISOString(),
    })),
  );
  if (error) {
    logError("conversations.import.messages", error);
    await session.supabase.from("conversations").delete().eq("id", conv.id).eq("user_id", session.user.id);
    return jsonError(500, "Não consegui salvar a conversa.");
  }
  return json({ conversationId: conv.id, title }, 201);
}
