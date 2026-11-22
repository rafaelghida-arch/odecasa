"use client";

import { useRef } from "react";
import { MODES, MODE_LABEL, type Mode } from "@/lib/types";

/** Seletor segmentado Mãe | Pai (radiogroup acessível, setas do teclado). */
export function ModeSwitch({ value, onChange }: { value: Mode; onChange: (m: Mode) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next = (index + (e.key === "ArrowRight" ? 1 : -1) + MODES.length) % MODES.length;
    onChange(MODES[next]!);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label="Modo da IA: Mãe ou Pai"
      aria-describedby="mode-hint"
      className="relative grid grid-cols-2 rounded-[20px] border-2 border-white bg-white/70 p-1 shadow-[0_4px_0_rgb(120_170_200/0.35)]"
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-2xl bg-brand shadow-[0_3px_0_var(--brand-dark)] transition-transform duration-300 ease-[cubic-bezier(0.3,1.4,0.5,1)]"
        style={{ transform: value === "pai" ? "translateX(100%)" : "none" }}
      />
      {MODES.map((m, i) => {
        const selected = value === m;
        return (
          <button
            key={m}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(m)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`relative z-10 min-h-10 min-w-[78px] rounded-2xl px-4 text-[16px] font-black transition-colors duration-200 ${
              selected ? "text-brand-ink" : "text-ink-2 hover:text-ink"
            }`}
          >
            {MODE_LABEL[m]}
          </button>
        );
      })}
      <span id="mode-hint" className="sr-only">
        Mãe e Pai são dois modos da mesma IA. Mãe tem tom acolhedor; Pai, direto. Dá para trocar a qualquer momento.
      </span>
    </div>
  );
}
