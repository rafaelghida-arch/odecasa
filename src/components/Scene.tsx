import type { ReactNode } from "react";

function Cloud({ className, scale = 1 }: { className?: string; scale?: number }) {
  return (
    <svg width={110 * scale} height={46 * scale} viewBox="0 0 110 46" aria-hidden="true" className={className}>
      <path
        d="M18 44 Q2 44 4 32 Q6 22 18 23 Q20 8 36 9 Q46 0 60 6 Q74 2 80 16 Q96 14 100 28 Q108 30 106 38 Q104 44 94 44 Z"
        fill="#fff"
      />
    </svg>
  );
}

function Sparkle({ className, color = "#f8c63d", size = 22 }: { className?: string; color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path className="twinkle" d="M12 1 Q13.5 10.5 23 12 Q13.5 13.5 12 23 Q10.5 13.5 1 12 Q10.5 10.5 12 1 Z" fill={color} />
    </svg>
  );
}

function Flower({ x, color }: { x: number; color: string }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <path d="M0 0 v-16" stroke="#3a8a45" strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="-5" cy="-8" rx="4" ry="2" fill="#4fa552" transform="rotate(-30 -5 -8)" />
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="0" cy="-22" rx="3.4" ry="5" fill={color} transform={`rotate(${a} 0 -17)`} />
      ))}
      <circle cx="0" cy="-17" r="3" fill="#ffd34d" />
    </g>
  );
}

/**
 * Cenário ilustrado: céu, nuvens, morrinhos e flores.
 * O conteúdo (mascote) fica em pé sobre o gramado.
 */
export function Scene({ children, height = 300, className = "" }: { children?: ReactNode; height?: number; className?: string }) {
  return (
    <div className={`sky relative overflow-hidden ${className}`} style={{ height }}>
      <Cloud className="drift absolute left-[4%] top-[14%] opacity-90" scale={0.9} />
      <Cloud className="drift absolute right-[2%] top-[6%] opacity-80 [animation-delay:-6s]" scale={1.15} />
      <Cloud className="drift absolute left-[44%] top-[2%] opacity-60 [animation-delay:-11s]" scale={0.6} />
      <Sparkle className="absolute right-[12%] top-[30%]" size={26} />
      <Sparkle className="absolute right-[6%] top-[42%]" size={14} color="#9ad37f" />
      <Sparkle className="absolute left-[9%] top-[46%]" size={14} color="#ffffff" />

      <svg
        className="absolute inset-x-0 bottom-0 w-full"
        height={height * 0.46}
        viewBox="0 0 400 140"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M0 52 Q70 10 150 40 Q230 70 300 30 Q360 0 400 24 V140 H0 Z" fill="#8fd47f" />
        <path d="M0 78 Q90 40 200 62 Q300 82 400 52 V140 H0 Z" fill="#6cc26a" />
        <path d="M0 112 Q120 92 220 104 Q320 116 400 100 V140 H0 Z" fill="#5db35c" />
      </svg>

      {/* arbustos e flores */}
      <svg className="absolute bottom-[16%] left-[6%]" width="70" height="40" viewBox="0 0 70 40" aria-hidden="true">
        <path d="M4 40 Q0 22 14 20 Q16 6 30 10 Q40 0 50 12 Q66 12 64 28 Q70 34 66 40 Z" fill="#4fa552" />
        <path d="M18 24 q4 -4 8 0 M40 18 q4 -4 8 0" stroke="#3a8a45" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </svg>
      <svg className="absolute bottom-[22%] right-[8%]" width="56" height="34" viewBox="0 0 70 40" aria-hidden="true">
        <path d="M4 40 Q0 22 14 20 Q16 6 30 10 Q40 0 50 12 Q66 12 64 28 Q70 34 66 40 Z" fill="#4fa552" />
      </svg>
      <svg className="absolute bottom-[8%] left-0 w-full" height="40" viewBox="0 0 400 40" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
        <g transform="translate(0 38)">
          <Flower x={40} color="#ff8fb8" />
          <Flower x={84} color="#fff" />
          <Flower x={318} color="#ffd34d" />
          <Flower x={356} color="#ff8fb8" />
        </g>
      </svg>

      <div className="absolute inset-x-0 bottom-[6%] flex justify-center">{children}</div>
    </div>
  );
}

export { Sparkle };
