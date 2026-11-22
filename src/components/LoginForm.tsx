"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { IconChevronLeft } from "./icons";
import { Mascot } from "./Mascot";
import { Scene } from "./Scene";

const ERRORS: Record<string, string> = {
  link: "Esse link expirou ou já foi usado. Peça um novo abaixo.",
  indisponivel: "Login indisponível no momento.",
};

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = getBrowserSupabase();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "sent">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(ERRORS[params.get("erro") ?? ""] ?? null);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: true,
      },
    });
    setBusy(false);
    if (error) {
      setError(
        error.status === 429
          ? "Muitos pedidos seguidos. Espera um minutinho e tenta de novo."
          : "Não consegui enviar o link. Confere o e-mail e tenta de novo.",
      );
      return;
    }
    setStep("sent");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
    setBusy(false);
    if (error) {
      setError("Código inválido ou expirado.");
      return;
    }
    router.replace("/chat?entrou=1");
    router.refresh();
  }

  return (
    <main className="pt-safe pb-safe mx-auto flex min-h-dvh max-w-[460px] flex-col px-5 py-5">
      <Link
        href="/chat"
        className="btn-white inline-flex min-h-11 w-fit items-center gap-1 rounded-2xl border-2 border-line bg-white px-3 text-[15px] font-extrabold text-brand-dark"
      >
        <IconChevronLeft size={18} /> Voltar para a conversa
      </Link>

      <Scene height={190} className="mt-5 rounded-[32px] border-4 border-white shadow-[0_6px_0_#c3e3ba]">
        <Mascot size={104} />
      </Scene>
      <div className="mt-5">
        <h1 className="text-[30px] font-black tracking-tight">Entrar no Ô de Casa</h1>
        <p className="mt-1.5 text-[16px] font-semibold leading-relaxed text-ink-2">
          Sem senha: mandamos um link para o seu e-mail. Assim suas conversas ficam salvas e você retoma em
          qualquer aparelho.
        </p>
      </div>

      {!supabase ? (
        <p className="card-chunky mt-6 rounded-[22px] bg-white p-4 text-[15px] font-semibold text-ink-2">
          O login não está configurado neste ambiente (faltam as variáveis do Supabase). Você ainda pode usar o
          chat como visitante.
        </p>
      ) : step === "email" ? (
        <form onSubmit={sendLink} className="mt-7 space-y-3">
          <label htmlFor="email" className="block text-[15px] font-extrabold text-ink">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@exemplo.com"
            className="block min-h-[56px] w-full rounded-[20px] border-2 border-line-strong bg-white px-4 text-[17px] font-bold shadow-[0_4px_0_var(--line-strong)] outline-none placeholder:text-ink-3 focus:border-brand"
          />
          <button
            type="submit"
            disabled={busy || !email}
            className="btn-chunky mt-2 min-h-[56px] w-full rounded-[20px] bg-brand text-[18px] font-black text-brand-ink disabled:opacity-60"
          >
            {busy ? "Enviando…" : "Enviar link de acesso"}
          </button>
        </form>
      ) : (
        <div className="mt-7 space-y-5">
          <div role="status" className="card-chunky rounded-[22px] bg-white p-4 text-[15px] font-semibold leading-relaxed text-brand-dark">
            Pronto! Enviamos um link para <strong>{email}</strong>. Abra o e-mail neste aparelho ou em outro e toque
            em “Entrar no Ô de Casa”.
          </div>
          <form onSubmit={verifyCode} className="space-y-3">
            <label htmlFor="code" className="block text-[15px] font-extrabold text-ink">
              Ou digite o código que veio no e-mail (se houver)
            </label>
            <input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6,10}"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="block min-h-[56px] w-full rounded-[20px] border-2 border-line-strong bg-white px-4 text-center text-[22px] font-black tracking-[0.3em] shadow-[0_4px_0_var(--line-strong)] outline-none focus:border-brand"
            />
            <button
              type="submit"
              disabled={busy || code.length < 6}
              className="btn-chunky mt-2 min-h-[56px] w-full rounded-[20px] bg-brand text-[18px] font-black text-brand-ink disabled:opacity-60"
            >
              {busy ? "Conferindo…" : "Entrar com código"}
            </button>
          </form>
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setCode("");
            }}
            className="min-h-11 text-[15px] font-extrabold text-ink-2 hover:text-ink"
          >
            Usar outro e-mail
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-[20px] border-2 border-[#f3c4b6] bg-danger-soft px-4 py-3 text-[14px] font-bold text-danger">
          {error}
        </p>
      )}
    </main>
  );
}
