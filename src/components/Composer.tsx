"use client";

import { useEffect, useRef } from "react";
import { IconAlert, IconCamera, IconClose, IconPaperclip, IconSend, IconShield } from "./icons";

export interface Attachment {
  file: File;
  url: string;
}

interface Props {
  text: string;
  onText: (t: string) => void;
  attachment: Attachment | null;
  onPickFile: (file: File) => void;
  onRemoveAttachment: () => void;
  onSend: () => void;
  sending: boolean;
  error: string | null;
  cameraAvailable: boolean;
  autoFocus?: boolean;
}

export function Composer({
  text,
  onText,
  attachment,
  onPickFile,
  onRemoveAttachment,
  onSend,
  sending,
  error,
  cameraAvailable,
  autoFocus,
}: Props) {
  const textRef = useRef<HTMLTextAreaElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  useEffect(() => {
    if (autoFocus) textRef.current?.focus();
  }, [autoFocus]);

  const canSend = !sending && (text.trim().length > 0 || attachment !== null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) onPickFile(file);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    if (e.key === "Enter" && !e.shiftKey && !isTouch && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (canSend) onSend();
    }
  }

  return (
    <div className="mx-auto w-full max-w-[720px] px-3 sm:px-4">
      {error && (
        <div
          role="alert"
          className="fade-in mb-2 flex items-start gap-2 rounded-2xl border border-[#efcfc6] bg-danger-soft px-3.5 py-2.5 text-[14px] text-danger"
        >
          <IconAlert size={18} className="mt-0.5 shrink-0" />
          <span>{error} Sua mensagem continua aqui.</span>
        </div>
      )}

      {attachment && (
        <div className="fade-in mb-2 flex items-center gap-3 rounded-2xl border border-line bg-surface p-2 pr-3 shadow-[var(--shadow-soft)]">
          <div className="relative shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={attachment.url}
              alt="Prévia da foto anexada"
              className="h-16 w-16 rounded-xl object-cover"
            />
            <button
              type="button"
              onClick={onRemoveAttachment}
              aria-label="Remover foto"
              className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-[var(--shadow-soft)] hover:bg-bg"
            >
              <IconClose size={14} />
            </button>
          </div>
          <p className="flex items-start gap-1.5 text-[13px] leading-snug text-ink-2">
            <IconShield size={16} className="mt-px shrink-0 text-brand" />
            <span>
              Ao enviar, a foto vai para a IA do Google (Gemini) para analisar esta conversa. A imagem não fica
              salva no Ô de Casa, mas no plano gratuito o Google pode usar o conteúdo para melhorar os serviços
              dele. Evite fotos com rostos, documentos ou endereço.
            </span>
          </p>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSend) onSend();
        }}
        className="flex items-end gap-1 rounded-[26px] border border-line-strong bg-surface p-1.5 shadow-[var(--shadow-lift)] focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20"
        aria-busy={sending}
      >
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={onFile}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={onFile}
        />
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          disabled={!cameraAvailable || sending}
          aria-label={cameraAvailable ? "Tirar foto com a câmera" : "Câmera indisponível — use a galeria"}
          title={cameraAvailable ? "Tirar foto" : "Câmera indisponível — use a galeria"}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-bg hover:text-ink disabled:opacity-35 disabled:hover:bg-transparent"
        >
          <IconCamera />
        </button>
        <button
          type="button"
          onClick={() => galleryRef.current?.click()}
          disabled={sending}
          aria-label="Anexar foto da galeria"
          title="Anexar foto"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-bg hover:text-ink disabled:opacity-35"
        >
          <IconPaperclip />
        </button>
        <label htmlFor="composer-text" className="sr-only">
          Mensagem
        </label>
        <textarea
          id="composer-text"
          ref={textRef}
          value={text}
          onChange={(e) => onText(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          maxLength={4000}
          enterKeyHint="send"
          placeholder={attachment ? "Pergunte sobre a foto…" : "Escreva sua dúvida…"}
          className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-1.5 py-[11px] text-[16px] leading-[22px] text-ink outline-none placeholder:text-ink-3 focus-visible:outline-none"
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label={sending ? "Enviando" : "Enviar mensagem"}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-brand-ink transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-95 disabled:bg-[#c9d3ce] disabled:active:scale-100"
        >
          <IconSend size={20} strokeWidth={2.25} />
        </button>
      </form>
    </div>
  );
}
