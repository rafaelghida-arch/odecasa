"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { clearGuest, loadGuest, saveGuest } from "@/lib/client/guest-store";
import { ClientImageError, hasCamera, prepareImage } from "@/lib/client/image";
import { useVisualViewportHeight } from "@/lib/client/viewport";
import { EXAMPLES } from "@/lib/examples";
import {
  MODE_LABEL,
  isMode,
  type ChatMessage,
  type ChatResponse,
  type ConversationSummary,
  type Mode,
} from "@/lib/types";
import { Composer, type Attachment } from "./Composer";
import { HistoryPanel } from "./HistoryPanel";
import { ModeSwitch } from "./ModeSwitch";
import { RichText } from "./RichText";
import { Mascot } from "./Mascot";
import { Scene } from "./Scene";
import { TOPIC_TILE, TopicIcon } from "./TopicIcon";
import { IconCompose, IconSidebar, IconUser } from "./icons";

interface Me {
  user: { id: string; email: string | null } | null;
  authAvailable: boolean;
  demo: boolean;
}

const UUID = /^[0-9a-f-]{36}$/i;

async function readJson(res: Response): Promise<Record<string, unknown> | null> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function ChatApp() {
  useVisualViewportHeight();
  const router = useRouter();
  const params = useSearchParams();
  const initialConversation = params.get("c");
  const initialModeParam = params.get("modo");
  const paramPrompt = params.get("q");

  const [me, setMe] = useState<Me | null>(null);
  const [mode, setMode] = useState<Mode>(() => (isMode(initialModeParam) ? initialModeParam : "mae"));
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [text, setText] = useState(paramPrompt?.slice(0, 4000) ?? "");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [pending, setPending] = useState<ChatMessage | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraAvailable, setCameraAvailable] = useState(true);
  const [unsavedGuest, setUnsavedGuest] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [loadingConversation, setLoadingConversation] = useState(false);

  /** Última foto desta sessão (só em memória) para dar contexto às próximas perguntas. */
  const contextImage = useRef<File | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const loggedIn = Boolean(me?.user);

  async function refreshList() {
    setListLoading(true);
    try {
      const res = await fetch("/api/conversations", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { conversations: ConversationSummary[] };
        setConversations(data.conversations);
      }
    } finally {
      setListLoading(false);
    }
  }

  async function openConversation(id: string) {
      setLoadingConversation(true);
      try {
        const res = await fetch(`/api/conversations/${id}`, { cache: "no-store" });
        if (!res.ok) {
          setNotice("Essa conversa não foi encontrada na sua conta.");
          router.replace("/chat");
          return;
        }
        const data = (await res.json()) as { conversation: ConversationSummary; messages: ChatMessage[] };
        setConversationId(data.conversation.id);
        setMessages(data.messages);
        setMode(data.conversation.activeMode);
        contextImage.current = null;
      } finally {
        setLoadingConversation(false);
      }
  }

  // Quem está usando: visitante ou conta. Depois, carrega a conversa certa.
  useEffect(() => {
    let cancelled = false;
    hasCamera().then((ok) => !cancelled && setCameraAvailable(ok));
    fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json() as Promise<Me>)
      .catch(() => ({ user: null, authAvailable: false, demo: true }) as Me)
      .then((data) => {
        if (cancelled) return;
        setMe(data);
        const guest = loadGuest();
        if (!data.user) {
          if (guest) {
            setMessages(guest.messages);
            if (!initialModeParam) setMode(guest.mode);
          }
          if (initialConversation) {
            setNotice("Entre na sua conta para abrir conversas salvas.");
            router.replace("/chat");
          }
          return;
        }
        if (window.matchMedia("(min-width: 1024px)").matches) setHistoryOpen(true);
        void refreshList();
        if (initialConversation && UUID.test(initialConversation)) {
          void openConversation(initialConversation);
        } else if (guest && guest.messages.length > 0) {
          setMessages(guest.messages);
          setMode(guest.mode);
          setUnsavedGuest(true);
        }
      });
    return () => {
      cancelled = true;
    };
    // Executa uma vez, com os parâmetros iniciais da URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Visitante: guarda o texto neste navegador.
  useEffect(() => {
    if (me && !me.user) saveGuest({ mode, messages });
  }, [me, mode, messages]);

  useEffect(() => {
    // Só rola até o fim quando há conversa; a tela vazia começa do topo.
    if (messages.length === 0 && !pending) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    endRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "end" });
  }, [messages, pending]);

  function changeMode(next: Mode) {
    setMode(next);
    if (conversationId && loggedIn) {
      void fetch(`/api/conversations/${conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeMode: next }),
      });
    }
  }

  async function pickFile(file: File) {
    setError(null);
    try {
      const prepared = await prepareImage(file);
      if (attachment) URL.revokeObjectURL(attachment.url);
      setAttachment({ file: prepared, url: URL.createObjectURL(prepared) });
    } catch (e) {
      setError(e instanceof ClientImageError ? e.message : "Não consegui abrir essa foto.");
    }
  }

  function removeAttachment() {
    if (attachment) URL.revokeObjectURL(attachment.url);
    setAttachment(null);
  }

  async function importGuest(): Promise<string | null> {
    const guest = loadGuest();
    if (!guest || guest.messages.length === 0) return null;
    const res = await fetch("/api/conversations/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activeMode: mode, messages: guest.messages }),
    });
    const data = await readJson(res);
    if (!res.ok || typeof data?.conversationId !== "string") {
      throw new Error((data?.error as string) ?? "Não consegui salvar a conversa.");
    }
    clearGuest();
    setUnsavedGuest(false);
    setConversationId(data.conversationId);
    router.replace(`/chat?c=${data.conversationId}`);
    void refreshList();
    return data.conversationId;
  }

  async function saveGuestConversation() {
    setSaving(true);
    setError(null);
    try {
      await importGuest();
      setNotice("Conversa salva na sua conta.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function discardGuest() {
    clearGuest();
    setUnsavedGuest(false);
    setMessages([]);
    contextImage.current = null;
  }

  function newConversation() {
    if (!loggedIn) clearGuest();
    setMessages([]);
    setConversationId(null);
    setUnsavedGuest(false);
    setError(null);
    setNotice(null);
    contextImage.current = null;
    router.replace("/chat");
    if (!window.matchMedia("(min-width: 1024px)").matches) setHistoryOpen(false);
  }

  function selectConversation(id: string) {
    setError(null);
    setNotice(null);
    setUnsavedGuest(false);
    router.push(`/chat?c=${id}`);
    void openConversation(id);
    if (!window.matchMedia("(min-width: 1024px)").matches) setHistoryOpen(false);
  }

  async function deleteConversation(id: string) {
    const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await readJson(res);
      setError((data?.error as string) ?? "Não consegui apagar a conversa.");
      return;
    }
    setConversations((list) => list.filter((c) => c.id !== id));
    if (id === conversationId) {
      setMessages([]);
      setConversationId(null);
      contextImage.current = null;
      router.replace("/chat");
    }
    setNotice("Conversa apagada.");
  }

  async function send() {
    const t = text.trim();
    const att = attachment;
    if (sending || (!t && !att)) return;
    setError(null);
    setNotice(null);
    setSending(true);
    setPending({
      id: "pending",
      role: "user",
      content: t || "(foto)",
      mode,
      hasImage: Boolean(att),
      previewUrl: att?.url,
      createdAt: new Date().toISOString(),
    });
    setText("");
    setAttachment(null);

    try {
      let convId = conversationId;
      if (loggedIn && unsavedGuest) convId = await importGuest();

      const history = convId
        ? []
        : messages.map((m) => ({ role: m.role, content: m.content, hasImage: m.hasImage }));
      const form = new FormData();
      form.append("payload", JSON.stringify({ mode, text: t, conversationId: convId, history }));
      if (att) form.append("image", att.file);
      else if (contextImage.current) form.append("contextImage", contextImage.current);

      let res: Response;
      try {
        res = await fetch("/api/chat", { method: "POST", body: form });
      } catch {
        throw new Error("Sem conexão. Confere a internet e tenta de novo.");
      }
      const data = (await readJson(res)) as (ChatResponse & { error?: string }) | null;
      if (!res.ok || !data?.assistantMessage) {
        throw new Error(data?.error ?? "Não consegui enviar agora. Tenta de novo.");
      }

      if (att) contextImage.current = att.file;
      setMessages((prev) => [...prev, { ...data.userMessage, previewUrl: att?.url }, data.assistantMessage]);
      if (data.conversationId) {
        if (data.conversationId !== convId) {
          setConversationId(data.conversationId);
                router.replace(`/chat?c=${data.conversationId}`);
        }
        void refreshList();
      }
    } catch (e) {
      // Preserva texto e prévia para tentar de novo.
      setText(t);
      setAttachment(att);
      setError((e as Error).message);
    } finally {
      setPending(null);
      setSending(false);
    }
  }

  const visible = pending ? [...messages, pending] : messages;
  const empty = visible.length === 0 && !loadingConversation;

  return (
    <div className="app-height flex overflow-hidden bg-meadow">
      <HistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        email={me?.user?.email ?? (me?.user ? "Sua conta" : null)}
        authAvailable={Boolean(me?.authAvailable)}
        conversations={conversations}
        loading={listLoading}
        currentId={conversationId}
        onSelect={selectConversation}
        onDelete={deleteConversation}
        onNew={newConversation}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="pt-safe pl-safe pr-safe relative z-10 shrink-0 bg-sky-top">
          <div className="grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-2 px-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setHistoryOpen((o) => !o)}
                aria-label={historyOpen ? "Fechar histórico" : "Abrir histórico"}
                aria-expanded={historyOpen}
                aria-controls="history-panel"
                className="btn-white flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-ink"
              >
                <IconSidebar size={20} />
              </button>
              <Link href="/" className="hidden text-[18px] font-black uppercase tracking-tight text-ink md:inline">
                Ô de Casa
              </Link>
            </div>
            <ModeSwitch value={mode} onChange={changeMode} />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={newConversation}
                aria-label="Nova conversa"
                className="btn-white flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-ink"
              >
                <IconCompose size={20} />
              </button>
              {me && !me.user && me.authAvailable && (
                <>
                  <Link
                    href="/entrar"
                    aria-label="Entrar"
                    className="btn-white flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-brand-dark min-[420px]:hidden"
                  >
                    <IconUser size={20} />
                  </Link>
                  <Link
                    href="/entrar"
                    className="btn-white hidden min-h-11 items-center rounded-2xl bg-white px-3 text-[14px] font-extrabold text-brand-dark min-[420px]:flex"
                  >
                    Entrar
                  </Link>
                </>
              )}
            </div>
          </div>
          <svg
            className="absolute inset-x-0 top-full h-4 w-full"
            viewBox="0 0 400 16"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d="M0 0 H400 V6 Q350 16 300 8 Q250 0 200 9 Q150 16 100 7 Q50 0 0 8 Z" fill="var(--sky-top)" />
          </svg>
        </header>

        <main className="pl-safe pr-safe min-h-0 flex-1 overflow-y-auto overscroll-contain" aria-live="polite">
          <div className="mx-auto w-full max-w-[720px] px-4 pb-6 pt-6 sm:px-6">
            {me?.demo && (
              <p className="mb-4 rounded-2xl border-2 border-[#f0dc95] bg-warn-soft px-3.5 py-2 text-center text-[13px] font-bold text-[#7a6216]">
                Modo demonstração: respostas de exemplo, sem IA de verdade.
              </p>
            )}

            {notice && (
              <p role="status" className="fade-in card-chunky mb-4 rounded-2xl bg-white px-4 py-3 text-[14.5px] font-bold text-brand-dark">
                {notice}
              </p>
            )}

            {empty && (
              <section className="fade-in flex flex-col items-center text-center">
                <Scene height={200} className="w-full rounded-[32px] border-4 border-white shadow-[0_6px_0_#c3e3ba]">
                  <Mascot mode={mode} size={112} />
                </Scene>
                <h1 className="mt-4 text-[28px] font-black leading-tight tracking-tight">
                  {mode === "mae" ? "Oi! Me conta o que tá rolando." : "Bora. Qual é a missão?"}
                </h1>
                <p className="mt-1.5 max-w-[440px] text-[15.5px] font-semibold leading-relaxed text-ink-2">
                  Escreve tua dúvida ou manda uma foto. Mãe e Pai são dois jeitos da mesma IA — troca quando quiser.
                </p>
                <div className="mt-5 grid w-full grid-cols-2 gap-3">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex.topic}
                      type="button"
                      onClick={() => {
                        setText(ex.prompt);
                        document.getElementById("composer-text")?.focus();
                      }}
                      className="card-chunky card-press flex flex-col items-start gap-1.5 rounded-[22px] bg-white p-3 text-left"
                    >
                      <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${TOPIC_TILE[ex.topic]}`}>
                        <TopicIcon topic={ex.topic} size={26} />
                      </span>
                      <span className="text-[11.5px] font-extrabold uppercase tracking-wide text-ink-3">{ex.label}</span>
                      <span className="text-[14px] font-bold leading-snug text-ink">{ex.prompt}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {loadingConversation && (
              <div className="flex flex-col items-center pt-10 text-[15px] font-bold text-ink-3">
                <Mascot mode={mode} mood="thinking" size={90} />
                Abrindo conversa…
              </div>
            )}

            <ol className="space-y-5" aria-label="Mensagens">
              {visible.map((m, i) => {
                const prevAssistant = visible.slice(0, i).reverse().find((x) => x.role === "assistant");
                const switched = m.role === "assistant" && prevAssistant && prevAssistant.mode !== m.mode;
                return (
                  <li key={m.id} className="fade-in">
                    {switched && (
                      <div className="mb-5 flex justify-center" role="separator">
                        <span className="card-chunky flex items-center gap-1.5 rounded-full bg-white py-1 pl-1.5 pr-3.5 text-[13px] font-extrabold text-ink-2">
                          <Mascot mode={m.mode} size={26} compact animated={false} />
                          Agora no modo {MODE_LABEL[m.mode]}
                        </span>
                      </div>
                    )}
                    {m.role === "user" ? (
                      <div className="flex flex-col items-end gap-2">
                        {m.previewUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={m.previewUrl}
                            alt="Foto que você enviou"
                            className="max-h-64 max-w-[75%] rounded-[22px] border-4 border-white object-cover shadow-[0_4px_0_#c3e3ba]"
                          />
                        ) : m.hasImage ? (
                          <span className="rounded-full border-2 border-line bg-white px-3 py-1 text-[12.5px] font-bold text-ink-3">
                            📷 Foto analisada (não fica salva)
                          </span>
                        ) : null}
                        {m.content !== "(foto)" && (
                          <div
                            className={`max-w-[85%] whitespace-pre-wrap rounded-[24px] rounded-br-lg bg-brand px-4 py-3 text-[16px] font-bold leading-relaxed text-brand-ink shadow-[0_4px_0_var(--brand-dark)] ${
                              m.id === "pending" ? "opacity-70" : ""
                            }`}
                          >
                            <span className="sr-only">Você: </span>
                            {m.content}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <Mascot mode={m.mode} size={40} compact animated={false} className="mt-6 shrink-0" />
                        <div className="flex min-w-0 flex-col items-start gap-1.5">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[12px] font-extrabold ${
                              m.mode === "mae" ? "bg-[#ffe3ee] text-[#a23a66]" : "bg-[#dcf2fd] text-[#1f6a90]"
                            }`}
                          >
                            {MODE_LABEL[m.mode]} · IA{m.demo ? " · demonstração" : ""}
                          </span>
                          <div className="card-chunky max-w-full rounded-[24px] rounded-tl-lg bg-white px-4 py-3 text-[16px] font-semibold leading-relaxed text-ink">
                            <RichText text={m.content} />
                          </div>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
              {pending && (
                <li className="flex items-start gap-2" aria-label="Escrevendo resposta">
                  <Mascot mode={mode} mood="thinking" size={40} compact className="mt-1 shrink-0" />
                  <div className="card-chunky dot-pulse flex gap-1.5 rounded-[24px] rounded-tl-lg bg-white px-5 py-4">
                    <span className="h-2.5 w-2.5 rounded-full bg-grass" />
                    <span className="h-2.5 w-2.5 rounded-full bg-grass" />
                    <span className="h-2.5 w-2.5 rounded-full bg-grass" />
                  </div>
                </li>
              )}
            </ol>
            <div ref={endRef} />
          </div>
        </main>

        <div className="pb-safe pl-safe pr-safe shrink-0 bg-gradient-to-t from-meadow via-meadow to-meadow/0 pt-2">
          {loggedIn && unsavedGuest && (
            <div className="mx-auto mb-2 w-full max-w-[720px] px-3 sm:px-4">
              <div className="fade-in card-chunky flex flex-wrap items-center gap-2 rounded-[22px] bg-white px-3 py-3">
                <Mascot mode={mode} size={36} compact animated={false} />
                <p className="min-w-[160px] flex-1 text-[14.5px] font-bold text-ink">
                  Você entrou! Quer salvar esta conversa na sua conta?
                </p>
                <button
                  type="button"
                  onClick={saveGuestConversation}
                  disabled={saving}
                  className="btn-chunky min-h-10 rounded-2xl bg-brand px-4 text-[14px] font-extrabold text-brand-ink disabled:opacity-60"
                >
                  {saving ? "Salvando…" : "Salvar conversa"}
                </button>
                <button
                  type="button"
                  onClick={discardGuest}
                  className="min-h-10 rounded-2xl px-3 text-[14px] font-bold text-ink-2 hover:text-ink"
                >
                  Descartar
                </button>
              </div>
            </div>
          )}
          <Composer
            text={text}
            onText={setText}
            attachment={attachment}
            onPickFile={pickFile}
            onRemoveAttachment={removeAttachment}
            onSend={send}
            sending={sending}
            error={error}
            cameraAvailable={cameraAvailable}
            autoFocus={Boolean(paramPrompt)}
          />
          <p className="mx-auto max-w-[720px] px-4 pb-2 pt-2 text-center text-[11.5px] font-bold text-ink-3">
            IA pode errar. Em risco (gás, fiação, fogo), pare e procure ajuda: 193 ou 192.
          </p>
        </div>
      </div>
    </div>
  );
}
