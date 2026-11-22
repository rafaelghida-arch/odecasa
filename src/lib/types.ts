export type Mode = "mae" | "pai";
export const MODES: Mode[] = ["mae", "pai"];
export const MODE_LABEL: Record<Mode, string> = { mae: "Mãe", pai: "Pai" };

export function isMode(value: unknown): value is Mode {
  return value === "mae" || value === "pai";
}

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  mode: Mode;
  hasImage: boolean;
  createdAt: string;
  /** Somente no navegador, durante a sessão. Nunca é salvo. */
  previewUrl?: string;
  demo?: boolean;
}

export interface ConversationSummary {
  id: string;
  title: string;
  activeMode: Mode;
  updatedAt: string;
}

export interface ChatResponse {
  conversationId: string | null;
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  demo: boolean;
  title?: string;
}
