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
      className="relative grid grid-cols-2 rounded-full border border-line bg-[#efefea] p-1"
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-brand shadow-[var(--shadow-soft)] transition-transform duration-200 ease-out"
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
            className={`relative z-10 min-h-9 min-w-[76px] rounded-full px-4 text-[15px] font-semibold transition-colors duration-200 ${
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
