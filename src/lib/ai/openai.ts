import "server-only";

import OpenAI from "openai";
import type { ChatCompletionContentPart, ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { ValidImage } from "@/lib/images";
import { serverEnv } from "@/lib/server-env";
import { AIBusyError, AIRefusalError, HAZARD_HINT, type GenerateOptions, type HistoryTurn } from "./generate";
import { BASE_SYSTEM_PROMPT, systemPromptFor } from "./prompt";

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!client) client = new OpenAI({ apiKey: serverEnv.openaiApiKey, maxRetries: 2, timeout: 55_000 });
  return client;
}

function dataUrl(image: ValidImage): string {
  return `data:${image.mediaType};base64,${image.base64}`;
}

function buildMessages(
  system: string,
  history: HistoryTurn[],
  text: string,
  newImage: ValidImage | null,
  contextImage: ValidImage | null,
): ChatCompletionMessageParam[] {
  const messages: ChatCompletionMessageParam[] = [{ role: "system", content: system }];
  for (const turn of history) {
    const content = turn.hasImage && turn.role === "user" ? `[foto enviada]\n${turn.content}` : turn.content;
    messages.push({ role: turn.role, content });
  }

  const parts: ChatCompletionContentPart[] = [];
  const image = newImage ?? contextImage;
  if (image) {
    parts.push({ type: "image_url", image_url: { url: dataUrl(image), detail: "high" } });
    if (!newImage) {
      parts.push({ type: "text", text: "(Foto enviada antes nesta conversa, anexada só como referência.)" });
    }
  }
  parts.push({ type: "text", text: text || "O que você vê nesta foto e por onde eu começo?" });
  messages.push({ role: "user", content: parts });
  return messages;
}

export async function generateWithOpenAI(opts: GenerateOptions): Promise<string> {
  const system = `${BASE_SYSTEM_PROMPT}\n\n${systemPromptFor(opts.mode, opts.hazard ? HAZARD_HINT[opts.hazard] : null)}`;
  try {
    const completion = await getClient().chat.completions.create({
      model: serverEnv.openaiModel,
      messages: buildMessages(system, opts.history, opts.text, opts.newImage, opts.contextImage),
      max_completion_tokens: 6000,
    });
    const choice = completion.choices[0];
    if (!choice || choice.message.refusal) throw new AIRefusalError("refusal");
    const text = (choice.message.content ?? "").trim();
    if (!text) throw new AIRefusalError("empty");
    return text;
  } catch (err) {
    if (
      err instanceof OpenAI.RateLimitError ||
      err instanceof OpenAI.InternalServerError ||
      err instanceof OpenAI.APIConnectionError
    ) {
      throw new AIBusyError("busy", { cause: err });
    }
    throw err;
  }
}
