import "server-only";

import { createHash } from "node:crypto";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/server-env";
import { logError } from "@/lib/log";

export interface RateResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

const WINDOW_SECONDS = 60 * 60;
const memory = new Map<string, { windowStart: number; count: number }>();

function memoryConsume(bucket: string, limit: number): RateResult {
  const now = Date.now();
  const windowStart = Math.floor(now / (WINDOW_SECONDS * 1000)) * WINDOW_SECONDS * 1000;
  const entry = memory.get(bucket);
  const count = entry && entry.windowStart === windowStart ? entry.count + 1 : 1;
  memory.set(bucket, { windowStart, count });
  if (memory.size > 5000) {
    for (const [k, v] of memory) if (v.windowStart < windowStart) memory.delete(k);
  }
  return {
    allowed: count <= limit,
    remaining: Math.max(limit - count, 0),
    resetAt: new Date(windowStart + WINDOW_SECONDS * 1000),
  };
}

export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}

/** Chave anônima: hash do IP com sal. O IP nunca é gravado em claro. */
export function bucketFor(userId: string | null, headers: Headers): string {
  if (userId) return `u:${userId}`;
  const hash = createHash("sha256")
    .update(`${serverEnv.rateLimitSalt}:${clientIp(headers)}`)
    .digest("hex")
    .slice(0, 32);
  return `g:${hash}`;
}

/**
 * Consome uma unidade do limite por hora. Usa o Postgres (compartilhado entre
 * instâncias) quando há SUPABASE_SERVICE_ROLE_KEY; senão, memória local.
 */
export async function consumeRateLimit(bucket: string, isGuest: boolean): Promise<RateResult> {
  const limit = isGuest ? serverEnv.guestPerHour : serverEnv.userPerHour;
  const admin = getAdminSupabase();
  if (admin) {
    const { data, error } = await admin.rpc("consume_rate_limit", {
      p_bucket: bucket,
      p_limit: limit,
      p_window_seconds: WINDOW_SECONDS,
    });
    if (!error && Array.isArray(data) && data[0]) {
      const row = data[0] as { allowed: boolean; remaining: number; reset_at: string };
      return { allowed: row.allowed, remaining: row.remaining, resetAt: new Date(row.reset_at) };
    }
    logError("rate-limit", error);
  }
  return memoryConsume(bucket, limit);
}
