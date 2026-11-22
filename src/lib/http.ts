import "server-only";
import { NextResponse } from "next/server";

export function jsonError(status: number, error: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, ...extra }, { status, headers: { "Cache-Control": "no-store" } });
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID.test(v);
}

export function makeTitle(text: string, hasImage: boolean): string {
  const clean = text.replace(/\s+/g, " ").trim();
  const base = clean || (hasImage ? "Foto enviada" : "Nova conversa");
  return base.length > 60 ? `${base.slice(0, 57)}…` : base;
}
