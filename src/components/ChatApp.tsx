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
import { TopicIcon } from "./TopicIcon";
import { IconCompose, IconShield, IconSidebar } from "./icons";

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
    <div className="app-height flex overflow-hidden bg-bg">
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
        <header className="pt-safe pl-safe pr-safe shrink-0 border-b border-line/70 bg-bg/90 backdrop-blur-md">
          <div className="grid h-14 grid-cols-[1fr_auto_1fr] items-center gap-2 px-2 sm:px-3">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setHistoryOpen((o) => !o)}
                aria-label={historyOpen ? "Fechar histórico" : "Abrir histórico"}
                aria-expanded={historyOpen}
                aria-controls="history-panel"
                className="flex h-11 w-11 items-center justify-center rounded-full text-ink-2 hover:bg-surface hover:text-ink"
              >
                <IconSidebar />
              </button>
              <Link
                href="/"
                className="hidden rounded-lg px-1 text-[16px] font-semibold tracking-tight text-ink md:inline"
              >
                Ô de Casa
              </Link>
            </div>
            <ModeSwitch value={mode} onChange={changeMode} />
            <div className="flex items-center justify-end gap-1">
              <button
                type="button"
                onClick={newConversation}
                aria-label="Nova conversa"
                className="flex h-11 w-11 items-center justify-center rounded-full text-ink-2 hover:bg-surface hover:text-ink"
              >
                <IconCompose />
              </button>
              {me && !me.user && me.authAvailable && (
                <Link
                  href="/entrar"
                  className="flex min-h-11 items-center rounded-full px-2.5 text-[15px] font-semibold text-brand hover:bg-surface sm:px-3"
                >
                  Entrar
                </Link>
              )}
            </div>
          </div>
        </header>

        <main className="pl-safe pr-safe min-h-0 flex-1 overflow-y-auto overscroll-contain" aria-live="polite">
          <div className="mx-auto w-full max-w-[720px] px-4 pb-6 pt-4 sm:px-6">
            {me?.demo && (
              <p className="mb-4 rounded-full border border-[#eadfbf] bg-warn-soft px-3.5 py-1.5 text-center text-[12.5px] text-[#6b5a22]">
                Modo demonstração: respostas de exemplo, sem IA de verdade.
              </p>
            )}

            {notice && (
              <p role="status" className="fade-in mb-4 rounded-2xl bg-brand-soft px-4 py-2.5 text-[14px] text-brand">
                {notice}
              </p>
            )}

            {empty && (
              <section className="fade-in flex flex-col items-center pt-[8vh] text-center">
                <h1 className="text-[26px] font-semibold tracking-tight sm:text-[30px]">
                  {mode === "mae" ? "Oi! Me conta o que tá rolando." : "Bora. Qual é a missão?"}
                </h1>
                <p className="mt-2 max-w-[440px] text-[15px] leading-relaxed text-ink-2">
                  Escreva sua dúvida ou mande uma foto. Mãe e Pai são dois modos da mesma IA — dá para trocar a
                  qualquer momento.
                </p>
                <div className="mt-7 grid w-full max-w-[520px] grid-cols-1 gap-2 sm:grid-cols-2">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex.topic}
                      type="button"
                      onClick={() => {
                        setText(ex.prompt);
                        document.getElementById("composer-text")?.focus();
                      }}
                      className="flex min-h-14 items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-left shadow-[var(--shadow-soft)] transition-colors hover:border-line-strong"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                        <TopicIcon topic={ex.topic} size={18} />
                      </span>
                      <span>
                        <span className="block text-[12.5px] font-medium text-ink-3">{ex.label}</span>
                        <span className="block text-[14.5px] leading-snug text-ink">{ex.prompt}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {loadingConversation && <p className="pt-10 text-center text-[14px] text-ink-3">Abrindo conversa…</p>}

            <ol className="space-y-5" aria-label="Mensagens">
              {visible.map((m, i) => {
                const prevAssistant = visible.slice(0, i).reverse().find((x) => x.role === "assistant");
                const switched = m.role === "assistant" && prevAssistant && prevAssistant.mode !== m.mode;
                return (
                  <li key={m.id} className="fade-in">
                    {switched && (
                      <div className="mb-4 flex items-center gap-3 text-[12px] text-ink-3" role="separator">
                        <span className="h-px flex-1 bg-line" />
                        Agora no modo {MODE_LABEL[m.mode]}
                        <span className="h-px flex-1 bg-line" />
                      </div>
                    )}
                    {m.role === "user" ? (
                      <div className="flex flex-col items-end gap-1.5">
                        {m.previewUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={m.previewUrl}
                            alt="Foto que você enviou"
                            className="max-h-64 max-w-[75%] rounded-2xl border border-line object-cover"
                          />
                        ) : m.hasImage ? (
                          <span className="rounded-full border border-line bg-surface px-3 py-1 text-[12.5px] text-ink-3">
                            Foto analisada (não fica salva)
                          </span>
                        ) : null}
                        {m.content !== "(foto)" && (
                          <div
                            className={`max-w-[85%] whitespace-pre-wrap rounded-[20px] rounded-br-md bg-brand px-4 py-2.5 text-[16px] leading-relaxed text-brand-ink ${
                              m.id === "pending" ? "opacity-70" : ""
                            }`}
                          >
                            <span className="sr-only">Você: </span>
                            {m.content}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-start gap-1.5">
                        <span className="pl-1 text-[12.5px] font-medium text-ink-3">
                          {MODE_LABEL[m.mode]} · IA{m.demo ? " · demonstração" : ""}
                        </span>
                        <div className="max-w-[92%] rounded-[20px] rounded-tl-md border border-line bg-surface px-4 py-3 text-[16px] leading-relaxed text-ink shadow-[var(--shadow-soft)]">
                          <RichText text={m.content} />
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
              {pending && (
                <li className="flex flex-col items-start gap-1.5" aria-label="Escrevendo resposta">
                  <span className="pl-1 text-[12.5px] font-medium text-ink-3">{MODE_LABEL[mode]} · IA</span>
                  <div className="dot-pulse flex gap-1 rounded-[20px] rounded-tl-md border border-line bg-surface px-4 py-4">
                    <span className="h-2 w-2 rounded-full bg-ink-3" />
                    <span className="h-2 w-2 rounded-full bg-ink-3" />
                    <span className="h-2 w-2 rounded-full bg-ink-3" />
                  </div>
                </li>
              )}
            </ol>
            <div ref={endRef} />
          </div>
        </main>

        <div className="pb-safe pl-safe pr-safe shrink-0 bg-gradient-to-t from-bg via-bg to-bg/0 pt-2">
          {loggedIn && unsavedGuest && (
            <div className="mx-auto mb-2 w-full max-w-[720px] px-3 sm:px-4">
              <div className="fade-in flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-3 shadow-[var(--shadow-soft)]">
                <IconShield size={18} className="shrink-0 text-brand" />
                <p className="min-w-[180px] flex-1 text-[14px] text-ink-2">
                  Você entrou. Quer salvar esta conversa na sua conta?
                </p>
                <button
                  type="button"
                  onClick={saveGuestConversation}
                  disabled={saving}
                  className="min-h-10 rounded-full bg-brand px-4 text-[14px] font-semibold text-brand-ink hover:opacity-90 disabled:opacity-60"
                >
                  {saving ? "Salvando…" : "Salvar conversa"}
                </button>
                <button
                  type="button"
                  onClick={discardGuest}
                  className="min-h-10 rounded-full px-3 text-[14px] font-medium text-ink-2 hover:text-ink"
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
          <p className="mx-auto max-w-[720px] px-4 pb-2 pt-1.5 text-center text-[11.5px] text-ink-3">
            IA pode errar. Em risco (gás, fiação, fogo), pare e procure ajuda: 193 ou 192.
          </p>
        </div>
      </div>
    </div>
  );
}
