"use client";

import { useEffect, useRef } from "react";
import { Mascot } from "./Mascot";
import { IconCamera, IconClose, IconPaperclip, IconSend, IconShield } from "./icons";

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
          className="fade-in mb-2 flex items-center gap-2 rounded-[20px] border-2 border-[#f3c4b6] bg-danger-soft px-3 py-2 text-[14px] font-bold text-danger"
        >
          <Mascot mood="worried" size={34} compact animated={false} className="shrink-0" />
          <span>{error} Sua mensagem continua aqui.</span>
        </div>
      )}

      {attachment && (
        <div className="fade-in card-chunky mb-2 flex items-center gap-3 rounded-[22px] bg-white p-2 pr-3">
          <div className="relative shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={attachment.url}
              alt="Prévia da foto anexada"
              className="h-16 w-16 rounded-2xl object-cover"
            />
            <button
              type="button"
              onClick={onRemoveAttachment}
              aria-label="Remover foto"
              className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-line bg-white text-ink hover:bg-meadow"
            >
              <IconClose size={14} />
            </button>
          </div>
          <p className="flex items-start gap-1.5 text-[12.5px] font-semibold leading-snug text-ink-2">
            <IconShield size={16} className="mt-px shrink-0 text-brand" />
            <span>
              A foto vai pro Gemini (Google) só pra analisar. Não salvamos a imagem, mas no plano grátis o Google
              pode usar o conteúdo. Evite rostos e documentos.
            </span>
          </p>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSend) onSend();
        }}
        className="flex items-end gap-1.5 rounded-[26px] border-2 border-line-strong bg-white p-1.5 shadow-[0_5px_0_var(--line-strong)] focus-within:border-brand"
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
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#dcf2fd] text-[#1f6a90] transition-transform active:scale-95 disabled:opacity-40"
        >
          <IconCamera strokeWidth={2.2} />
        </button>
        <button
          type="button"
          onClick={() => galleryRef.current?.click()}
          disabled={sending}
          aria-label="Anexar foto da galeria"
          title="Anexar foto"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#fff2c7] text-[#8a6410] transition-transform active:scale-95 disabled:opacity-40"
        >
          <IconPaperclip strokeWidth={2.2} />
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
          className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-1.5 py-[11px] text-[16px] font-semibold leading-[22px] text-ink outline-none placeholder:text-ink-3 focus-visible:outline-none"
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label={sending ? "Enviando" : "Enviar mensagem"}
          className="btn-chunky flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand text-brand-ink disabled:bg-[#c8dcc3]"
        >
          <IconSend size={22} strokeWidth={3} />
        </button>
      </form>
    </div>
  );
}
