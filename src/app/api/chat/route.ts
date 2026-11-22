import { randomUUID } from "node:crypto";
import { AIBusyError, AIRefusalError, generateReply, type HistoryTurn } from "@/lib/ai";
import { demoReply } from "@/lib/ai/demo";
import { detectHazard } from "@/lib/ai/safety";
import { getOwnedConversation, listMessages } from "@/lib/conversations";
import { isUuid, json, jsonError, makeTitle } from "@/lib/http";
import { ImageValidationError, MAX_REQUEST_BYTES, readImage } from "@/lib/images";
import { logError } from "@/lib/log";
import { bucketFor, consumeRateLimit } from "@/lib/rate-limit";
import { isDemoMode } from "@/lib/server-env";
import { getSessionUser } from "@/lib/supabase/server";
import { isMode, type ChatMessage, type ChatResponse, type Mode } from "@/lib/types";

export const maxDuration = 60;

const MAX_TEXT = 4000;
const MAX_HISTORY_TURNS = 40;
const MAX_HISTORY_CHARS = 6000;

interface Payload {
  mode: Mode;
  text: string;
  conversationId: string | null;
  history: HistoryTurn[];
  voice: boolean;
}

function parsePayload(raw: FormDataEntryValue | null): Payload | null {
  if (typeof raw !== "string" || raw.length > 400_000) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (!isMode(d.mode)) return null;
  const text = typeof d.text === "string" ? d.text.trim() : "";
  if (text.length > MAX_TEXT) return null;
  const conversationId = d.conversationId == null ? null : isUuid(d.conversationId) ? d.conversationId : undefined;
  if (conversationId === undefined) return null;

  const history: HistoryTurn[] = [];
  if (Array.isArray(d.history)) {
    for (const item of d.history.slice(-MAX_HISTORY_TURNS)) {
      if (!item || typeof item !== "object") continue;
      const h = item as Record<string, unknown>;
      if ((h.role !== "user" && h.role !== "assistant") || typeof h.content !== "string") continue;
      const content = h.content.trim().slice(0, MAX_HISTORY_CHARS);
      if (!content) continue;
      history.push({ role: h.role, content, hasImage: h.hasImage === true });
    }
  }
  return { mode: d.mode, text, conversationId, history, voice: d.voice === true };
}

export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > MAX_REQUEST_BYTES) {
    return jsonError(413, "O envio ficou grande demais. Tenta uma foto menor.");
  }
  if (!(request.headers.get("content-type") ?? "").includes("multipart/form-data")) {
    return jsonError(415, "Formato de envio inválido.");
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError(400, "Não consegui ler o envio.");
  }

  const payload = parsePayload(form.get("payload"));
  if (!payload) return jsonError(400, "Mensagem inválida.");

  const session = await getSessionUser();
  const userId = session?.user.id ?? null;

  // Só contas podem continuar conversas salvas — e só as próprias.
  let conversation = null;
  if (payload.conversationId) {
    if (!session) return jsonError(401, "Entre na sua conta para continuar esta conversa.");
    conversation = await getOwnedConversation(session.supabase, session.user.id, payload.conversationId);
    if (!conversation) return jsonError(404, "Conversa não encontrada.");
  }

  const limit = await consumeRateLimit(bucketFor(userId, request.headers), !userId);
  if (!limit.allowed) {
    return jsonError(
      429,
      userId
        ? "Você chegou no limite de mensagens por hora. Tenta de novo daqui a pouco."
        : "Limite do modo visitante atingido por agora. Entre com seu e-mail para continuar ou tente mais tarde.",
      { resetAt: limit.resetAt.toISOString() },
    );
  }

  let newImage = null;
  let contextImage = null;
  try {
    newImage = await readImage(form.get("image"));
    contextImage = newImage ? null : await readImage(form.get("contextImage"));
  } catch (err) {
    if (err instanceof ImageValidationError) return jsonError(422, err.message);
    throw err;
  }

  if (!payload.text && !newImage) return jsonError(400, "Escreve uma mensagem ou anexa uma foto.");

  const history: HistoryTurn[] =
    session && conversation
      ? (await listMessages(session.supabase, session.user.id, conversation.id, MAX_HISTORY_TURNS * 2))
          .slice(-MAX_HISTORY_TURNS)
          .map((m) => ({ role: m.role, content: m.content, hasImage: m.hasImage }))
      : payload.history;

  const hazard = detectHazard(payload.text);
  const demo = isDemoMode();
  let reply: string;
  try {
    reply = demo
      ? demoReply({
          mode: payload.mode,
          text: payload.text,
          hasNewImage: Boolean(newImage),
          hasContextImage: Boolean(contextImage),
          previousUserTurns: history.filter((h) => h.role === "user").length,
          hazard,
        })
      : await generateReply({
          mode: payload.mode,
          history,
          text: payload.text,
          newImage,
          contextImage,
          hazard,
          voice: payload.voice,
        });
  } catch (err) {
    if (err instanceof AIRefusalError) {
      reply =
        "Esse pedido eu não consigo atender. Se for algo da casa, tenta me contar de outro jeito ou mandar uma foto.";
    } else {
      logError("chat.ai", err);
      const busy = err instanceof AIBusyError;
      return jsonError(
        502,
        busy ? "A IA está ocupada agora. Tenta de novo em instantes." : "Não consegui responder agora. Tenta de novo.",
      );
    }
  }

  const now = Date.now();
  const userMessage: ChatMessage = {
    id: randomUUID(),
    role: "user",
    content: payload.text || "(foto)",
    mode: payload.mode,
    hasImage: Boolean(newImage),
    createdAt: new Date(now).toISOString(),
  };
  const assistantMessage: ChatMessage = {
    id: randomUUID(),
    role: "assistant",
    content: reply,
    mode: payload.mode,
    hasImage: false,
    createdAt: new Date(now + 1).toISOString(),
    demo,
  };

  let conversationId: string | null = conversation?.id ?? null;
  let title: string | undefined;

  if (session) {
    try {
      if (!conversationId) {
        title = makeTitle(payload.text, Boolean(newImage));
        const { data, error } = await session.supabase
          .from("conversations")
          .insert({ user_id: session.user.id, title, active_mode: payload.mode })
          .select("id")
          .single();
        if (error) throw error;
        conversationId = data.id as string;
      } else {
        const { error } = await session.supabase
          .from("conversations")
          .update({ active_mode: payload.mode })
          .eq("id", conversationId)
          .eq("user_id", session.user.id);
        if (error) throw error;
      }
      const { error } = await session.supabase.from("messages").insert(
        [userMessage, assistantMessage].map((m) => ({
          id: m.id,
          conversation_id: conversationId,
          user_id: session.user.id,
          role: m.role,
          content: m.content,
          mode: m.mode,
          has_image: m.hasImage,
          created_at: m.createdAt,
        })),
      );
      if (error) throw error;
    } catch (err) {
      logError("chat.persist", err);
      return jsonError(500, "A resposta chegou, mas não consegui salvar. Tenta de novo.");
    }
  }

  const body: ChatResponse = { conversationId, userMessage, assistantMessage, demo, title };
  return json(body);
}
