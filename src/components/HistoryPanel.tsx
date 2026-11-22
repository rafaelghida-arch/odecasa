"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ConversationSummary } from "@/lib/types";
import { MODE_LABEL } from "@/lib/types";
import { IconClose, IconCompose, IconTrash } from "./icons";
import { Mascot } from "./Mascot";

interface Props {
  open: boolean;
  onClose: () => void;
  email: string | null;
  authAvailable: boolean;
  conversations: ConversationSummary[];
  loading: boolean;
  currentId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
  onNew: () => void;
}

function when(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString())
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function HistoryPanel(props: Props) {
  const { open, onClose, email, authAvailable, conversations, loading, currentId, onSelect, onDelete, onNew } = props;
  const closeRef = useRef<HTMLButtonElement>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const isMobile = window.matchMedia("(max-width: 1023px)").matches;
    if (isMobile) closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-black/20 transition-opacity duration-200 lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        id="history-panel"
        aria-label="Histórico de conversas"
        inert={!open}
        className={`pt-safe pb-safe pl-safe fixed inset-y-0 left-0 z-40 flex w-[300px] max-w-[86vw] flex-col border-r border-line bg-cream transition-[transform,width] duration-200 ease-out lg:static lg:z-auto lg:max-w-none lg:translate-x-0 lg:bg-cream ${
          open ? "translate-x-0 lg:w-[288px]" : "-translate-x-full lg:w-0 lg:overflow-hidden lg:border-r-0"
        }`}
      >
        <div className="flex h-14 shrink-0 items-center justify-between px-3">
          <h2 className="pl-2 text-[20px] font-black">Histórico</h2>
          <div className="flex items-center">
            <button
              type="button"
              onClick={onNew}
              aria-label="Nova conversa"
              className="btn-white flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-line bg-white text-ink"
            >
              <IconCompose size={20} />
            </button>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Fechar histórico"
              className="btn-white flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-line bg-white text-ink"
            >
              <IconClose size={20} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {!email ? (
            <div className="card-chunky mx-2 mt-2 rounded-[22px] bg-white p-4 text-[14px] font-semibold leading-relaxed text-ink-2">
              <Mascot size={64} compact animated={false} />
              <p className="mt-2 text-[16px] font-black text-ink">Seu histórico fica na sua conta.</p>
              <p className="mt-1">
                Como visitante, a conversa fica só neste aparelho. Entre com seu e-mail para salvar e retomar em
                qualquer lugar.
              </p>
              {authAvailable ? (
                <Link
                  href="/entrar"
                  className="btn-chunky mt-3 inline-flex min-h-11 items-center rounded-2xl bg-brand px-4 text-[15px] font-extrabold text-brand-ink"
                >
                  Entrar com e-mail
                </Link>
              ) : (
                <p className="mt-2 text-[13px] text-ink-3">Login indisponível: Supabase não configurado.</p>
              )}
            </div>
          ) : loading && conversations.length === 0 ? (
            <p className="px-3 py-4 text-[14px] text-ink-3">Carregando…</p>
          ) : conversations.length === 0 ? (
            <p className="px-3 py-4 text-[14px] text-ink-3">Nenhuma conversa salva ainda.</p>
          ) : (
            <ul className="space-y-2.5 px-1 pt-1">
              {conversations.map((c) => {
                const active = c.id === currentId;
                return (
                  <li key={c.id} className="group relative">
                    {confirming === c.id ? (
                      <div className="flex items-center gap-2 rounded-[18px] border-2 border-[#f3c4b6] bg-danger-soft px-3 py-2">
                        <span className="flex-1 text-[14px] text-danger">Apagar esta conversa?</span>
                        <button
                          type="button"
                          disabled={deleting === c.id}
                          onClick={async () => {
                            setDeleting(c.id);
                            await onDelete(c.id);
                            setDeleting(null);
                            setConfirming(null);
                          }}
                          className="min-h-9 rounded-xl bg-danger px-3 text-[13px] font-extrabold text-white disabled:opacity-60"
                        >
                          {deleting === c.id ? "Apagando…" : "Apagar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirming(null)}
                          className="min-h-9 rounded-full px-2 text-[13px] font-medium text-ink-2 hover:text-ink"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => onSelect(c.id)}
                          aria-current={active ? "true" : undefined}
                          className={`flex min-h-14 w-full flex-col justify-center rounded-[18px] border-2 py-2 pl-3.5 pr-12 text-left transition-colors ${
                            active ? "border-brand bg-brand-soft shadow-[0_3px_0_var(--brand)]" : "border-line bg-white shadow-[0_3px_0_var(--line)]"
                          }`}
                        >
                          <span className="line-clamp-1 text-[15px] font-extrabold text-ink">{c.title}</span>
                          <span className="text-[12.5px] font-bold text-ink-3">
                            {MODE_LABEL[c.activeMode]} · {when(c.updatedAt)}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirming(c.id)}
                          aria-label={`Apagar conversa: ${c.title}`}
                          className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-ink-3 opacity-100 hover:bg-danger-soft hover:text-danger focus-visible:opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                        >
                          <IconTrash size={18} />
                        </button>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {email && (
          <div className="shrink-0 border-t-2 border-line p-3">
            <div className="flex items-center gap-2 px-1">
              <Mascot size={34} compact animated={false} />
              <span className="min-w-0 flex-1 truncate text-[13.5px] font-bold text-ink-2">{email}</span>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="btn-white min-h-10 rounded-2xl border-2 border-line bg-white px-3 text-[14px] font-extrabold text-ink-2"
                >
                  Sair
                </button>
              </form>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
