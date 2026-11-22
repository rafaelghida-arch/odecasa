import "server-only";

import { activeProvider } from "@/lib/server-env";
import { generateWithAnthropic, type GenerateOptions } from "./generate";
import { generateWithOpenAI } from "./openai";

export { AIBusyError, AIRefusalError, type HistoryTurn } from "./generate";

/** Gera a resposta com o provedor configurado (OpenAI por padrão). */
export async function generateReply(opts: GenerateOptions): Promise<string> {
  return activeProvider() === "anthropic" ? generateWithAnthropic(opts) : generateWithOpenAI(opts);
}
