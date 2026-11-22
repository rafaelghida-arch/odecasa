"use client";

import { useEffect, useRef, useState } from "react";
import { ClientImageError, prepareImage } from "@/lib/client/image";
import { MODE_LABEL, type Mode } from "@/lib/types";
import type { Attachment } from "./Composer";
import { IconCamera, IconClose, IconMic, IconMicOff, IconPhone } from "./icons";
import { Mascot } from "./Mascot";
import { Scene } from "./Scene";

/* ---------- Tipos mínimos da Web Speech API (não estão no lib.dom do TS) ---------- */
interface RecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface RecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<RecognitionResultLike>;
}
interface RecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((e: RecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => RecognitionLike;

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function voiceCallSupported(): boolean {
  return Boolean(getRecognitionCtor()) && typeof window !== "undefined" && "speechSynthesis" in window;
}

/* ---------- Voz ---------- */
const FEMALE = /luciana|francisca|maria|vit[óo]ria|fernanda|thalita|let[íi]cia|helena|female|feminin|mulher/i;
const MALE = /daniel|felipe|ant[ôo]nio|ricardo|male|masculin|homem/i;

function pickVoice(mode: Mode): SpeechSynthesisVoice | null {
  const all = window.speechSynthesis.getVoices();
  const br = all.filter((v) => v.lang.toLowerCase().replace("_", "-").startsWith("pt-br"));
  const pt = br.length ? br : all.filter((v) => v.lang.toLowerCase().startsWith("pt"));
  if (!pt.length) return null;
  const want = mode === "mae" ? FEMALE : MALE;
  return pt.find((v) => want.test(v.name)) ?? pt[0] ?? null;
}

/** Tira marcação de texto e divide em frases (o Chrome corta falas longas). */
function toSpeechChunks(text: string): string[] {
  const clean = text
    .replace(/\*\*|__|\*|`|#+\s/g, "")
    .replace(/^\s*(\d+[.)]|[-•])\s+/gm, "")
    .replace(/\s*\n+\s*/g, ". ")
    .replace(/\.\s*\./g, ".")
    .trim();
  const parts = clean.match(/[^.!?…]+[.!?…]*/g) ?? [clean];
  const chunks: string[] = [];
  for (const p of parts.map((x) => x.trim()).filter(Boolean)) {
    const last = chunks[chunks.length - 1];
    if (last && last.length + p.length < 180) chunks[chunks.length - 1] = `${last} ${p}`;
    else chunks.push(p);
  }
  return chunks;
}

const GREETING: Record<Mode, string> = {
  mae: "Alô? Oi! Que bom que você ligou. Me conta, o que tá acontecendo aí?",
  pai: "Alô! E aí, tudo certo? Fala comigo, qual é a missão?",
};

type Phase = "ringing" | "speaking" | "listening" | "thinking" | "muted" | "error";

const STATUS: Record<Phase, string> = {
  ringing: "Chamando…",
  speaking: "Falando…",
  listening: "Ouvindo você…",
  thinking: "Pensando…",
  muted: "Microfone desligado",
  error: "Ops!",
};

interface Props {
  mode: Mode;
  onClose: () => void;
  /** Envia o que a pessoa falou (e a foto, se houver) e devolve o texto da resposta. */
  onUtterance: (text: string, image: Attachment | null) => Promise<string>;
}

export function VoiceCall({ mode, onClose, onUtterance }: Props) {
  const [phase, setPhase] = useState<Phase>("ringing");
  const [heard, setHeard] = useState("");
  const [reply, setReply] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [photo, setPhoto] = useState<Attachment | null>(null);

  const phaseRef = useRef<Phase>("ringing");
  const activeRef = useRef(true);
  const recRef = useRef<RecognitionLike | null>(null);
  const photoRef = useRef<Attachment | null>(null);
  const utterRef = useRef(onUtterance);
  const restartsRef = useRef(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const hangupRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    utterRef.current = onUtterance;
  }, [onUtterance]);

  function go(p: Phase) {
    phaseRef.current = p;
    setPhase(p);
  }

  function speak(text: string, after: () => void) {
    const synth = window.speechSynthesis;
    synth.cancel();
    const voice = pickVoice(mode);
    const chunks = toSpeechChunks(text);
    if (!chunks.length) return after();
    go("speaking");
    chunks.forEach((chunk, i) => {
      const u = new SpeechSynthesisUtterance(chunk);
      u.lang = "pt-BR";
      if (voice) u.voice = voice;
      u.pitch = mode === "mae" ? 1.15 : 0.8;
      u.rate = mode === "mae" ? 1.0 : 1.03;
      if (i === chunks.length - 1) {
        u.onend = () => activeRef.current && phaseRef.current === "speaking" && after();
        u.onerror = () => activeRef.current && phaseRef.current === "speaking" && after();
      }
      synth.speak(u);
    });
  }

  function listen() {
    if (!activeRef.current) return;
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    recRef.current?.abort();
    const rec = new Ctor();
    rec.lang = "pt-BR";
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    let finalText = "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]!;
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      setHeard((finalText + interim).trim());
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setProblem("Não tenho acesso ao microfone. Libera o microfone para este site nas configurações do navegador.");
        go("error");
      } else if (e.error === "network") {
        setProblem("O reconhecimento de voz precisa de internet. Confere a conexão.");
        go("error");
      }
      // "no-speech" e "aborted": o onend decide se volta a ouvir.
    };
    rec.onend = () => {
      if (!activeRef.current || phaseRef.current !== "listening") return;
      const said = finalText.trim();
      if (said) {
        restartsRef.current = 0;
        void handleSaid(said);
      } else if (restartsRef.current < 20) {
        restartsRef.current += 1;
        listen(); // silêncio: continua ouvindo
      } else {
        go("muted");
      }
    };
    recRef.current = rec;
    setHeard("");
    go("listening");
    try {
      rec.start();
    } catch {
      /* já iniciado */
    }
  }

  async function handleSaid(said: string) {
    go("thinking");
    const img = photoRef.current;
    photoRef.current = null;
    setPhoto(null);
    try {
      const answer = await utterRef.current(said, img);
      if (!activeRef.current) return;
      setReply(answer);
      speak(answer, listen);
    } catch (e) {
      if (!activeRef.current) return;
      const msg = (e as Error).message || "Não consegui responder agora.";
      setReply(msg);
      speak(msg, listen);
    }
  }

  function hangUp() {
    activeRef.current = false;
    recRef.current?.abort();
    window.speechSynthesis.cancel();
    onClose();
  }

  function toggleMute() {
    if (phaseRef.current === "muted" || phaseRef.current === "error") {
      setProblem(null);
      restartsRef.current = 0;
      listen();
    } else {
      recRef.current?.abort();
      window.speechSynthesis.cancel();
      go("muted");
    }
  }

  /** Toque no mascote enquanto fala: interrompe e passa a ouvir. */
  function interrupt() {
    if (phaseRef.current === "speaking") {
      window.speechSynthesis.cancel();
      listen();
    }
  }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const prepared = await prepareImage(file);
      const att = { file: prepared, url: URL.createObjectURL(prepared) };
      photoRef.current = att;
      setPhoto(att);
    } catch (err) {
      setProblem(err instanceof ClientImageError ? err.message : "Não consegui abrir essa foto.");
    }
  }

  // Início da ligação: toca, atende e cumprimenta.
  useEffect(() => {
    activeRef.current = true;
    hangupRef.current?.focus();
    window.speechSynthesis.getVoices(); // carrega a lista de vozes
    const t = window.setTimeout(() => {
      if (!activeRef.current) return;
      setReply(GREETING[mode]);
      speak(GREETING[mode], listen);
    }, 1600);
    const timer = window.setInterval(() => {
      if (phaseRef.current !== "ringing") setSeconds((s) => s + 1);
    }, 1000);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && hangUp();
    window.addEventListener("keydown", onKey);
    return () => {
      activeRef.current = false;
      window.clearTimeout(t);
      window.clearInterval(timer);
      window.removeEventListener("keydown", onKey);
      recRef.current?.abort();
      window.speechSynthesis.cancel();
    };
    // A ligação começa uma vez, com o modo escolhido.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const mood = phase === "thinking" ? "thinking" : phase === "error" ? "worried" : "happy";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Ligação com ${MODE_LABEL[mode]}`}
      className="fade-in fixed inset-0 z-50 flex flex-col bg-meadow"
    >
      <div className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0" aria-hidden="true">
          <Scene height="fill" />
        </div>

        <div className="pt-safe relative flex h-full flex-col items-center px-5 pt-8 text-center">
          <p className="rounded-full bg-white/80 px-3 py-1 text-[13px] font-extrabold text-ink-2">
            Ligação com a IA · modo {MODE_LABEL[mode]}
          </p>
          <h2 className="mt-3 text-[40px] font-black leading-none tracking-tight text-ink">{MODE_LABEL[mode]}</h2>
          <p className="mt-2 text-[17px] font-extrabold text-ink-2" aria-live="polite">
            {STATUS[phase]}
            {phase !== "ringing" && <span className="ml-2 tabular-nums text-ink-3">{mm}:{ss}</span>}
          </p>

          <button
            type="button"
            onClick={interrupt}
            aria-label={phase === "speaking" ? "Interromper e falar" : `${MODE_LABEL[mode]}`}
            className={`relative mt-6 rounded-full ${phase === "speaking" || phase === "listening" || phase === "ringing" ? "ring-pulse" : ""}`}
          >
            <span className={`block rounded-full bg-white/60 p-4 ${phase === "ringing" ? "wiggle" : ""}`}>
              <Mascot mode={mode} mood={mood} size={150} compact />
            </span>
          </button>
          {phase === "speaking" && (
            <p className="mt-3 text-[13px] font-bold text-ink-2">Toque na Casinha para interromper</p>
          )}

          <div className="mt-auto mb-4 w-full max-w-[520px] space-y-2" aria-live="polite">
            {problem && (
              <p className="card-chunky rounded-[20px] border-[#f3c4b6] bg-danger-soft px-4 py-3 text-[14.5px] font-bold text-danger">
                {problem}
              </p>
            )}
            {reply && (
              <p className="card-chunky max-h-36 overflow-y-auto rounded-[20px] bg-white px-4 py-3 text-left text-[15px] font-semibold leading-snug text-ink">
                <span className="font-black">{MODE_LABEL[mode]}: </span>
                {reply.replace(/\*\*/g, "")}
              </p>
            )}
            {(heard || phase === "listening") && (
              <p className="rounded-[20px] bg-brand px-4 py-3 text-left text-[15px] font-bold leading-snug text-brand-ink shadow-[0_4px_0_var(--brand-dark)]">
                <span className="font-black">Você: </span>
                {heard || "…"}
              </p>
            )}
            {photo && (
              <div className="card-chunky flex items-center gap-3 rounded-[20px] bg-white p-2 pr-3 text-left">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt="Foto que vai junto com a próxima fala" className="h-12 w-12 rounded-xl object-cover" />
                <span className="flex-1 text-[13.5px] font-bold text-ink-2">A foto vai junto com a sua próxima fala.</span>
                <button
                  type="button"
                  aria-label="Remover foto"
                  onClick={() => {
                    photoRef.current = null;
                    setPhoto(null);
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-line bg-white"
                >
                  <IconClose size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="pb-safe shrink-0 bg-meadow px-6 pb-6 pt-4">
        <div className="mx-auto flex max-w-[360px] items-center justify-between">
          <button
            type="button"
            onClick={toggleMute}
            aria-pressed={phase === "muted"}
            aria-label={phase === "muted" || phase === "error" ? "Ligar o microfone" : "Desligar o microfone"}
            className="btn-white flex h-16 w-16 items-center justify-center rounded-full border-2 border-line bg-white text-ink"
          >
            {phase === "muted" || phase === "error" ? <IconMicOff size={26} strokeWidth={2.2} /> : <IconMic size={26} strokeWidth={2.2} />}
          </button>
          <button
            ref={hangupRef}
            type="button"
            onClick={hangUp}
            aria-label="Desligar a ligação"
            className="flex h-20 w-20 items-center justify-center rounded-full bg-danger text-white shadow-[0_5px_0_#a33a24] transition-transform active:translate-y-1"
          >
            <IconPhone size={32} strokeWidth={2.4} className="rotate-[135deg]" />
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label="Mostrar uma foto na ligação"
            className="btn-white flex h-16 w-16 items-center justify-center rounded-full border-2 border-line bg-white text-ink"
          >
            <IconCamera size={26} strokeWidth={2.2} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={onPhoto}
          />
        </div>
        <p className="mx-auto mt-3 max-w-[420px] text-center text-[11.5px] font-bold text-ink-3">
          Sua voz vira texto pelo reconhecimento do navegador (Google no Chrome, Apple no Safari) e a conversa fica
          registrada no chat. Em risco, ligue 193 ou 192.
        </p>
      </div>
    </div>
  );
}
