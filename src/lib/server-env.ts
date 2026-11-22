import "server-only";

function int(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const serverEnv = {
  aiProvider: (process.env.AI_PROVIDER ?? "").toLowerCase(),
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiModel: process.env.OPENAI_MODEL || "gpt-5.4-mini",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  /** Lista separada por vírgula: o primeiro é o preferido; os outros entram quando ele está ocupado. */
  geminiModels: (process.env.GEMINI_MODEL || "gemini-3.5-flash,gemini-3.8-flash,gemini-3.5-flash-lite")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  anthropicModel: process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  rateLimitSalt: process.env.RATE_LIMIT_SALT || "odecasa-dev-salt",
  guestPerHour: int("RATE_LIMIT_GUEST_PER_HOUR", 12),
  userPerHour: int("RATE_LIMIT_USER_PER_HOUR", 60),
  forceDemo: process.env.AI_DEMO_MODE === "true",
};

export type AIProvider = "gemini" | "openai" | "anthropic";

/**
 * Provedor ativo: AI_PROVIDER, se definido; senão o que tiver chave
 * (Gemini, gratuito, primeiro). Sem nenhuma chave, retorna null (modo demonstração).
 */
export function activeProvider(): AIProvider | null {
  if (serverEnv.forceDemo) return null;
  if (serverEnv.aiProvider === "gemini") return serverEnv.geminiApiKey ? "gemini" : null;
  if (serverEnv.aiProvider === "openai") return serverEnv.openaiApiKey ? "openai" : null;
  if (serverEnv.aiProvider === "anthropic") return serverEnv.anthropicApiKey ? "anthropic" : null;
  if (serverEnv.geminiApiKey) return "gemini";
  if (serverEnv.openaiApiKey) return "openai";
  if (serverEnv.anthropicApiKey) return "anthropic";
  return null;
}

/** Modo demonstração: sem chave de IA, ou forçado por AI_DEMO_MODE=true. */
export function isDemoMode(): boolean {
  return activeProvider() === null;
}
