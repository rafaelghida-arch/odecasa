"use client";

import type { ChatMessage, Mode } from "@/lib/types";

const KEY = "odecasa:guest-conversation:v1";

export interface GuestConversation {
  mode: Mode;
  messages: ChatMessage[];
}

/** Conversa do visitante: só texto, só neste navegador. Fotos nunca são guardadas. */
export function loadGuest(): GuestConversation | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as GuestConversation;
    if (!Array.isArray(data.messages)) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveGuest(conv: GuestConversation): void {
  try {
    const messages = conv.messages.map((m) => ({ ...m, previewUrl: undefined }));
    localStorage.setItem(KEY, JSON.stringify({ mode: conv.mode, messages }));
  } catch {
    /* armazenamento indisponível: segue só em memória */
  }
}

export function clearGuest(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
