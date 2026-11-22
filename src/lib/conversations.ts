import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatMessage, ConversationSummary, Mode } from "@/lib/types";

interface ConversationRow {
  id: string;
  user_id: string;
  title: string;
  active_mode: Mode;
  updated_at: string;
}
interface MessageRow {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode: Mode;
  has_image: boolean;
  created_at: string;
}

export function toMessage(r: MessageRow): ChatMessage {
  return {
    id: r.id,
    role: r.role,
    content: r.content,
    mode: r.mode,
    hasImage: r.has_image,
    createdAt: r.created_at,
  };
}

export function toSummary(r: ConversationRow): ConversationSummary {
  return { id: r.id, title: r.title, activeMode: r.active_mode, updatedAt: r.updated_at };
}

/**
 * Busca a conversa garantindo a propriedade no servidor, além da RLS:
 * filtra por id E user_id da sessão validada.
 */
export async function getOwnedConversation(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
): Promise<ConversationRow | null> {
  const { data, error } = await supabase
    .from("conversations")
    .select("id, user_id, title, active_mode, updated_at")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data || data.user_id !== userId) return null;
  return data as ConversationRow;
}

export async function listMessages(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
  limit = 200,
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("id, role, content, mode, has_image, created_at")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error || !data) return [];
  return (data as MessageRow[]).map(toMessage);
}
