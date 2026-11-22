import "server-only";

/**
 * Log seguro: registra só o escopo e metadados técnicos.
 * Nunca recebe conteúdo de mensagens, imagens, URLs de anexo ou e-mails.
 */
export function logError(scope: string, err: unknown): void {
  const e = err as { name?: string; status?: number; code?: string };
  console.error(
    JSON.stringify({
      level: "error",
      scope,
      name: e?.name ?? "Error",
      status: e?.status,
      code: e?.code,
    }),
  );
}
