import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { logError } from "@/lib/log";
import { getServerSupabase } from "@/lib/supabase/server";

const OTP_TYPES: EmailOtpType[] = ["email", "magiclink", "signup", "invite", "recovery", "email_change"];

function safeNext(value: string | null): string {
  // Só caminhos internos, para evitar redirecionamento aberto.
  if (value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\")) return value;
  return "/chat?entrou=1";
}

/**
 * Recebe o link mágico. Aceita:
 * - token_hash + type (template recomendado; funciona em outro aparelho)
 * - code (fluxo PKCE padrão; funciona no mesmo navegador)
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNext(url.searchParams.get("next"));
  const supabase = await getServerSupabase();
  if (!supabase) return NextResponse.redirect(new URL("/entrar?erro=indisponivel", url.origin));

  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const code = url.searchParams.get("code");

  try {
    if (tokenHash && type && OTP_TYPES.includes(type)) {
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
      if (error) throw error;
    } else if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
    } else {
      return NextResponse.redirect(new URL("/entrar?erro=link", url.origin));
    }
  } catch (err) {
    logError("auth.callback", err);
    return NextResponse.redirect(new URL("/entrar?erro=link", url.origin));
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
