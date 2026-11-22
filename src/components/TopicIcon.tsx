import type { ExampleTopic } from "@/lib/examples";

const O = "#5b3b28";

/** Ícones coloridos e arredondados de cada tema. */
export function TopicIcon({ topic, size = 28 }: { topic: ExampleTopic; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 32 32", "aria-hidden": true } as const;
  switch (topic) {
    case "cozinha":
      return (
        <svg {...common}>
          <path d="M5 15h18a0 0 0 0 1 0 0 9 9 0 0 1-9 9 9 9 0 0 1-9-9z" fill="#ff9a6b" stroke={O} strokeWidth="2" strokeLinejoin="round" />
          <path d="M23 17h5" stroke={O} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M10 11c0-2 2-2 2-4M15 11c0-2 2-2 2-4" stroke="#9aa7b0" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M8 18.5c1.5 1.8 3.5 2.5 5.5 2.5" stroke="#ffd2bd" strokeWidth="2" strokeLinecap="round" fill="none" />
        </svg>
      );
    case "limpeza":
      return (
        <svg {...common}>
          <rect x="8" y="12" width="12" height="16" rx="4" fill="#6cc3f0" stroke={O} strokeWidth="2" />
          <path d="M11 12V8h7l4 3h-4" fill="#fff" stroke={O} strokeWidth="2" strokeLinejoin="round" />
          <circle cx="25" cy="6" r="2" fill="#bfe8fb" stroke={O} strokeWidth="1.5" />
          <circle cx="27.5" cy="12" r="1.6" fill="#bfe8fb" stroke={O} strokeWidth="1.5" />
          <path d="M11 18h6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "roupas":
      return (
        <svg {...common}>
          <path
            d="M11 5 4 9l2.5 6L9 14v13h14V14l2.5 1L28 9l-7-4c-.5 2-2.5 3.5-5 3.5S11.5 7 11 5z"
            fill="#ff8fb8"
            stroke={O}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="16" cy="18" r="2.2" fill="#fff" />
        </svg>
      );
    case "montagem":
      return (
        <svg {...common}>
          <path d="m6 26 11-11" stroke={O} strokeWidth="6" strokeLinecap="round" />
          <path d="m6 26 11-11" stroke="#f8c63d" strokeWidth="2.6" strokeLinecap="round" />
          <path
            d="M19 6a6 6 0 0 0-2.5 7.5l2 2A6 6 0 0 0 26 13l-3-1-1-3 2.5-2.5A6 6 0 0 0 19 6z"
            fill="#b9c6cf"
            stroke={O}
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}

export const TOPIC_TILE: Record<ExampleTopic, string> = {
  cozinha: "bg-[#ffe8d9]",
  limpeza: "bg-[#dcf2fd]",
  roupas: "bg-[#ffe3ee]",
  montagem: "bg-[#fff2c7]",
};
