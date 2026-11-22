import "server-only";

function int(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const serverEnv = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  anthropicModel: process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  rateLimitSalt: process.env.RATE_LIMIT_SALT || "odecasa-dev-salt",
  guestPerHour: int("RATE_LIMIT_GUEST_PER_HOUR", 12),
  userPerHour: int("RATE_LIMIT_USER_PER_HOUR", 60),
  forceDemo: process.env.AI_DEMO_MODE === "true",
};

/** Modo demonstração: sem chave da IA, ou forçado por AI_DEMO_MODE=true. */
export function isDemoMode(): boolean {
  return serverEnv.forceDemo || !serverEnv.anthropicApiKey;
}
