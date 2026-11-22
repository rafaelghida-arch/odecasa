import type { Mode } from "@/lib/types";

export type MascotMood = "happy" | "thinking" | "worried";

interface Props {
  mode?: Mode;
  mood?: MascotMood;
  size?: number;
  animated?: boolean;
  className?: string;
  /** Mostra só a cabeça/casinha, sem pezinhos e sombra (para avatar). */
  compact?: boolean;
}

const OUTLINE = "#8a5a3c";

/**
 * Mascote do Ô de Casa: uma casinha com carinha.
 * Mãe usa florzinha e cílios; Pai usa bigode. Ilustração original em SVG.
 */
export function Mascot({ mode = "mae", mood = "happy", size = 160, animated = true, className, compact }: Props) {
  const lookUp = mood === "thinking";
  const pupilDy = lookUp ? -4 : 0;
  const pupilDx = lookUp ? 3 : 0;
  const viewBox = compact ? "18 18 164 172" : "0 0 200 220";

  return (
    <svg
      width={size}
      height={size * (compact ? 172 / 164 : 1.1)}
      viewBox={viewBox}
      role="img"
      aria-label={mode === "mae" ? "Casinha, mascote do Ô de Casa, no modo Mãe" : "Casinha, mascote do Ô de Casa, no modo Pai"}
      className={className}
    >
      {!compact && <ellipse cx="100" cy="206" rx="58" ry="8" fill="#000" opacity="0.12" />}
      <g className={animated ? "bob" : undefined}>
        {/* pezinhos */}
        {!compact && (
          <>
            <ellipse cx="78" cy="196" rx="15" ry="9" fill="#f4b98f" stroke={OUTLINE} strokeWidth="3" />
            <ellipse cx="122" cy="196" rx="15" ry="9" fill="#f4b98f" stroke={OUTLINE} strokeWidth="3" />
          </>
        )}
        {/* bracinhos */}
        <path d="M40 140 q-16 6 -14 22" fill="none" stroke={OUTLINE} strokeWidth="9" strokeLinecap="round" />
        <path d="M40 140 q-16 6 -14 22" fill="none" stroke="#ffe3c6" strokeWidth="4" strokeLinecap="round" />
        <path d="M160 140 q16 6 14 22" fill="none" stroke={OUTLINE} strokeWidth="9" strokeLinecap="round" />
        <path d="M160 140 q16 6 14 22" fill="none" stroke="#ffe3c6" strokeWidth="4" strokeLinecap="round" />

        {/* chaminé */}
        <rect x="128" y="40" width="20" height="34" rx="6" fill="#e8705a" stroke={OUTLINE} strokeWidth="3" />
        {/* parede */}
        <rect x="38" y="78" width="124" height="112" rx="34" fill="#ffe7cc" stroke={OUTLINE} strokeWidth="3.5" />
        {/* telhado */}
        <path
          d="M30 98 Q30 88 40 80 L90 40 Q100 32 110 40 L160 80 Q170 88 170 98 Q170 106 160 104 L100 92 L40 104 Q30 106 30 98 Z"
          fill="#f2805f"
          stroke={OUTLINE}
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        <path d="M58 82 L96 52" stroke="#ffb59a" strokeWidth="5" strokeLinecap="round" opacity="0.8" />

        {/* olhos */}
        <g className={animated ? "blink" : undefined}>
          <ellipse cx="78" cy="132" rx="10" ry="12" fill="#2a1d16" />
          <ellipse cx="122" cy="132" rx="10" ry="12" fill="#2a1d16" />
          <circle cx={81 + pupilDx} cy={127 + pupilDy} r="3.6" fill="#fff" />
          <circle cx={125 + pupilDx} cy={127 + pupilDy} r="3.6" fill="#fff" />
        </g>
        {mode === "mae" && (
          <g stroke="#2a1d16" strokeWidth="2.6" strokeLinecap="round">
            <path d="M68 124 l-5 -4" />
            <path d="M71 120 l-3 -5" />
            <path d="M132 124 l5 -4" />
            <path d="M129 120 l3 -5" />
          </g>
        )}
        {mood === "worried" && (
          <g stroke="#2a1d16" strokeWidth="3" strokeLinecap="round" fill="none">
            <path d="M68 112 q8 -6 16 -2" />
            <path d="M132 112 q-8 -6 -16 -2" />
          </g>
        )}

        {/* bochechas */}
        <ellipse cx="62" cy="152" rx="10" ry="6.5" fill="#ff9e9e" opacity="0.6" />
        <ellipse cx="138" cy="152" rx="10" ry="6.5" fill="#ff9e9e" opacity="0.6" />

        {/* boca */}
        {mood === "happy" && (
          <path d="M90 152 q10 10 20 0" fill="#c2453a" stroke="#2a1d16" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {mood === "thinking" && <ellipse cx="104" cy="156" rx="5" ry="4.5" fill="#2a1d16" />}
        {mood === "worried" && (
          <path d="M88 158 q6 -5 12 0 q6 5 12 0" fill="none" stroke="#2a1d16" strokeWidth="3" strokeLinecap="round" />
        )}

        {/* acessórios do modo */}
        {mode === "pai" && (
          <path
            d="M100 146 q-6 -6 -14 -4 q-8 2 -12 8 q8 2 14 0 q6 -2 12 -4 q6 2 12 4 q6 2 14 0 q-4 -6 -12 -8 q-8 -2 -14 4 z"
            fill="#6b4632"
          />
        )}
        {mode === "mae" && (
          <g transform="translate(52 66)">
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse key={a} cx="0" cy="-9" rx="6.5" ry="9" fill="#ff8fb8" stroke={OUTLINE} strokeWidth="2" transform={`rotate(${a})`} />
            ))}
            <circle r="5.5" fill="#ffd34d" stroke={OUTLINE} strokeWidth="2" />
          </g>
        )}
        {mood === "thinking" && (
          <g fill="#fff" stroke={OUTLINE} strokeWidth="2.5">
            <circle cx="172" cy="56" r="5" />
            <circle cx="184" cy="38" r="8" />
          </g>
        )}
      </g>
    </svg>
  );
}
