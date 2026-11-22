import "server-only";

import { activeProvider } from "@/lib/server-env";
import { generateWithAnthropic, type GenerateOptions } from "./generate";
import { generateWithOpenAI } from "./openai";

export { AIBusyError, AIRefusalError, type HistoryTurn } from "./generate";

/** Gera a resposta com o provedor configurado (Gemini, gratuito, por padrão). */
export async function generateReply(opts: GenerateOptions): Promise<string> {
  const provider = activeProvider();
  if (provider === "anthropic") return generateWithAnthropic(opts);
  return generateWithOpenAI(opts, provider === "openai" ? "openai" : "gemini");
}
