import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import type { Mode } from "@/lib/types";
import type { ValidImage } from "@/lib/images";
import { serverEnv } from "@/lib/server-env";
import { BASE_SYSTEM_PROMPT, systemPromptFor } from "./prompt";
import type { HazardKind } from "./safety";

export interface HistoryTurn {
  role: "user" | "assistant";
  content: string;
  hasImage: boolean;
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: serverEnv.anthropicApiKey, maxRetries: 2 });
  return client;
}

export class AIRefusalError extends Error {}

const HAZARD_HINT: Record<Exclude<HazardKind, null>, string> = {
  gas: "possível vazamento de gás",
  eletrica: "risco elétrico (fiação exposta, faísca ou similar)",
};

/** Monta a conversa no formato da API, garantindo alternância user/assistant. */
function buildMessages(
  history: HistoryTurn[],
  text: string,
  newImage: ValidImage | null,
  contextImage: ValidImage | null,
): Anthropic.Beta.BetaMessageParam[] {
  const messages: Anthropic.Beta.BetaMessageParam[] = [];
  for (const turn of history) {
    const content = turn.hasImage && turn.role === "user" ? `[foto enviada]\n${turn.content}` : turn.content;
    const last = messages[messages.length - 1];
    if (last && last.role === turn.role && typeof last.content === "string") {
      last.content = `${last.content}\n\n${content}`;
    } else {
      messages.push({ role: turn.role, content });
    }
  }
  if (messages[0]?.role === "assistant") messages.shift();

  const blocks: Anthropic.Beta.BetaContentBlockParam[] = [];
  const image = newImage ?? contextImage;
  if (image) {
    blocks.push({
      type: "image",
      source: { type: "base64", media_type: image.mediaType, data: image.base64 },
    });
    if (!newImage) {
      blocks.push({ type: "text", text: "(Foto enviada antes nesta conversa, anexada só como referência.)" });
    }
  }
  blocks.push({ type: "text", text: text || "O que você vê nesta foto e por onde eu começo?" });

  const last = messages[messages.length - 1];
  if (last && last.role === "user") {
    // Evita duas mensagens seguidas da pessoa (ex.: falha anterior sem resposta).
    const prev = typeof last.content === "string" ? last.content : "";
    messages[messages.length - 1] = { role: "user", content: [{ type: "text", text: prev }, ...blocks] };
  } else {
    messages.push({ role: "user", content: blocks });
  }
  return messages;
}

export async function generateReply(opts: {
  mode: Mode;
  history: HistoryTurn[];
  text: string;
  newImage: ValidImage | null;
  contextImage: ValidImage | null;
  hazard: HazardKind;
}): Promise<string> {
  const anthropic = getClient();
  const stream = anthropic.beta.messages.stream({
    model: serverEnv.anthropicModel,
    max_tokens: 8000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium" },
    system: [
      { type: "text", text: BASE_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      { type: "text", text: systemPromptFor(opts.mode, opts.hazard ? HAZARD_HINT[opts.hazard] : null) },
    ],
    messages: buildMessages(opts.history, opts.text, opts.newImage, opts.contextImage),
  });
  const message = await stream.finalMessage();

  if (message.stop_reason === "refusal") throw new AIRefusalError("refusal");

  const text = message.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
  if (!text) throw new AIRefusalError("empty");
  return text;
}
