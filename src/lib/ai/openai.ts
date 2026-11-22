import "server-only";

import OpenAI from "openai";
import type { ChatCompletionContentPart, ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { ValidImage } from "@/lib/images";
import { serverEnv } from "@/lib/server-env";
import { AIBusyError, AIRefusalError, HAZARD_HINT, type GenerateOptions, type HistoryTurn } from "./generate";
import { BASE_SYSTEM_PROMPT, systemPromptFor } from "./prompt";

/** Gemini usa o endpoint compatível com a API da OpenAI. */
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/";

type Flavor = "openai" | "gemini";
const clients: Partial<Record<Flavor, OpenAI>> = {};
function getClient(flavor: Flavor): OpenAI {
  if (!clients[flavor]) {
    clients[flavor] =
      flavor === "gemini"
        ? new OpenAI({ apiKey: serverEnv.geminiApiKey, baseURL: GEMINI_BASE_URL, maxRetries: 0, timeout: 30_000 })
        : new OpenAI({ apiKey: serverEnv.openaiApiKey, maxRetries: 2, timeout: 55_000 });
  }
  return clients[flavor]!;
}

function dataUrl(image: ValidImage): string {
  return `data:${image.mediaType};base64,${image.base64}`;
}

function buildMessages(
  flavor: Flavor,
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
    parts.push({
      type: "image_url",
      image_url: flavor === "openai" ? { url: dataUrl(image), detail: "high" } : { url: dataUrl(image) },
    });
    if (!newImage) {
      parts.push({ type: "text", text: "(Foto enviada antes nesta conversa, anexada só como referência.)" });
    }
  }
  parts.push({ type: "text", text: text || "O que você vê nesta foto e por onde eu começo?" });
  messages.push({ role: "user", content: parts });
  return messages;
}

function isBusy(err: unknown): boolean {
  return (
    err instanceof OpenAI.RateLimitError ||
    err instanceof OpenAI.InternalServerError ||
    err instanceof OpenAI.APIConnectionError // inclui tempo esgotado
  );
}

function readText(completion: OpenAI.Chat.Completions.ChatCompletion): string {
  const choice = completion.choices[0];
  if (!choice || choice.message.refusal) throw new AIRefusalError("refusal");
  const text = (choice.message.content ?? "").trim();
  if (!text) throw new AIRefusalError("empty");
  return text;
}

/** OpenAI ou Gemini (via endpoint compatível). */
export async function generateWithOpenAI(opts: GenerateOptions, flavor: Flavor = "openai"): Promise<string> {
  const system = `${BASE_SYSTEM_PROMPT}\n\n${systemPromptFor(opts.mode, opts.hazard ? HAZARD_HINT[opts.hazard] : null, opts.voice)}`;
  const messages = buildMessages(flavor, system, opts.history, opts.text, opts.newImage, opts.contextImage);

  if (flavor === "openai") {
    try {
      return readText(
        await getClient("openai").chat.completions.create({
          model: serverEnv.openaiModel,
          messages,
          max_completion_tokens: 6000,
        }),
      );
    } catch (err) {
      if (isBusy(err)) throw new AIBusyError("busy", { cause: err });
      throw err;
    }
  }

  // Gemini gratuito: tenta os modelos em ordem quando um está sobrecarregado,
  // sem passar do tempo máximo da função na Vercel (60 s).
  const started = Date.now();
  let lastErr: unknown = null;
  for (const model of serverEnv.geminiModels) {
    const remaining = 52_000 - (Date.now() - started);
    if (remaining < 8_000) break;
    try {
      return readText(
        await getClient("gemini").chat.completions.create(
          { model, messages, max_tokens: 6000 },
          { timeout: Math.min(30_000, remaining), maxRetries: 0 },
        ),
      );
    } catch (err) {
      if (!isBusy(err) && !(err instanceof OpenAI.NotFoundError)) throw err;
      lastErr = err;
    }
  }
  throw new AIBusyError("busy", { cause: lastErr });
}
