import Link from "next/link";
import { Mascot } from "@/components/Mascot";
import { Scene } from "@/components/Scene";
import { TOPIC_TILE, TopicIcon } from "@/components/TopicIcon";
import { EXAMPLES } from "@/lib/examples";

export default function Home() {
  return (
    <div className="sky min-h-dvh sm:py-8">
      <div className="mx-auto flex min-h-dvh max-w-[560px] flex-col overflow-hidden bg-[#5db35c] sm:min-h-0 sm:rounded-[44px] sm:border-[6px] sm:border-white sm:shadow-[0_20px_60px_rgb(40_90_40/0.18)]">
        <div className="relative">
          <Scene height={340}>
            <Mascot mode="mae" size={172} />
          </Scene>
          <header className="pt-safe absolute inset-x-0 top-0 flex items-center justify-between px-5 pt-4">
            <span className="w-[76px]" aria-hidden="true" />
            <p className="text-[26px] font-black uppercase tracking-tight text-ink drop-shadow-[0_2px_0_rgba(255,255,255,0.7)]">
              Ô de Casa
            </p>
            <Link
              href="/entrar"
              className="btn-white flex min-h-10 w-[76px] items-center justify-center rounded-full bg-white text-[14px] font-extrabold text-brand-dark"
            >
              Entrar
            </Link>
          </header>
        </div>

        <main className="pb-safe flex-1 px-5 pb-8 pt-2">
          <p className="text-center text-[15px] font-extrabold text-[#1d4a22]">
            Uma mãozinha pra quem tá aprendendo a se virar
          </p>
          <h1 className="mt-2 text-center text-[38px] font-black leading-[1.02] tracking-tight text-ink sm:text-[44px]">
            O que tu quer resolver hoje?
          </h1>

          <Link
            href="/chat"
            className="btn-sun mt-6 flex min-h-[60px] items-center justify-center gap-2 rounded-[22px] bg-sun text-[20px] font-black text-ink"
          >
            Começar conversa
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <p className="mt-3 text-center text-[13px] font-bold text-[#1d4a22]/80">Sem cadastro para experimentar.</p>

          <h2 className="mt-8 text-[18px] font-black text-ink">Experimente perguntar</h2>
          <ul className="mt-3 grid grid-cols-2 gap-3">
            {EXAMPLES.map((ex) => (
              <li key={ex.topic}>
                <Link
                  href={`/chat?q=${encodeURIComponent(ex.prompt)}`}
                  className="card-grass card-press flex h-full min-h-[132px] flex-col gap-2 rounded-[24px] p-3.5"
                >
                  <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${TOPIC_TILE[ex.topic]}`}>
                    <TopicIcon topic={ex.topic} />
                  </span>
                  <span className="text-[12px] font-extrabold uppercase tracking-wide text-[#1d4a22]">{ex.label}</span>
                  <span className="text-[15px] font-bold leading-snug text-ink">{ex.prompt}</span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="card-grass mt-4 flex items-center gap-3 rounded-[24px] p-4">
            <div className="flex shrink-0 -space-x-4">
              <Mascot mode="mae" size={50} compact animated={false} />
              <Mascot mode="pai" size={50} compact animated={false} />
            </div>
            <p className="text-[14.5px] font-bold leading-snug text-ink">
              <span className="font-black">Mãe ou Pai?</span> Dois jeitos da mesma IA. Mãe acolhe e acalma; Pai vai direto
              ao ponto.
            </p>
          </div>

          <div className="card-grass mt-3 rounded-[24px] p-4">
            <p className="text-[14.5px] font-bold leading-snug text-ink">
              <span className="font-black">Privacidade:</span> as fotos não ficam salvas no Ô de Casa. Com conta, guardamos
              só o texto, e você apaga quando quiser.{" "}
              <Link href="/privacidade" className="font-black text-[#1d4a22] underline underline-offset-2">
                Saiba mais
              </Link>
            </p>
          </div>

          <p className="mt-6 text-center text-[12.5px] font-bold text-[#1d4a22]/80">
            Ô de Casa usa IA e pode errar. Em emergência: Bombeiros 193 · SAMU 192.
          </p>
        </main>
      </div>
    </div>
  );
}
