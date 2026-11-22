import Link from "next/link";
import { IconArrowRight, IconShield } from "@/components/icons";
import { TopicIcon } from "@/components/TopicIcon";
import { EXAMPLES } from "@/lib/examples";

export default function Home() {
  return (
    <div className="pt-safe pb-safe pl-safe pr-safe flex min-h-dvh flex-col">
      <header className="mx-auto flex h-14 w-full max-w-[960px] items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 rounded-lg text-[17px] font-semibold tracking-tight">
          <svg width="28" height="28" viewBox="0 0 64 64" aria-hidden="true">
            <rect width="64" height="64" rx="14" fill="#295647" />
            <path d="M16 31 32 18l16 13v15a2 2 0 0 1-2 2H18a2 2 0 0 1-2-2z" fill="none" stroke="#fff" strokeWidth="4" strokeLinejoin="round" />
            <circle cx="32" cy="36" r="5" fill="#fff" />
          </svg>
          Ô de Casa
        </Link>
        <Link
          href="/entrar"
          className="flex min-h-11 items-center rounded-full px-3 text-[15px] font-semibold text-brand hover:bg-surface"
        >
          Entrar
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-[960px] flex-1 flex-col px-4 sm:px-6">
        <section className="pb-10 pt-[9vh] sm:pt-[12vh]">
          <p className="text-[15px] font-medium text-brand">Uma mãozinha pra quem tá aprendendo a se virar</p>
          <h1 className="mt-3 max-w-[640px] text-[40px] font-semibold leading-[1.05] tracking-[-0.025em] sm:text-[56px]">
            O que tu quer resolver hoje?
          </h1>
          <p className="mt-4 max-w-[520px] text-[17px] leading-relaxed text-ink-2">
            Pergunte ou mande uma foto. A IA olha o que aparece e te dá o primeiro passo — no jeito Mãe ou no
            jeito Pai.
          </p>
          <Link
            href="/chat"
            className="mt-8 inline-flex min-h-[52px] items-center gap-2 rounded-full bg-brand px-6 text-[17px] font-semibold text-brand-ink shadow-[var(--shadow-lift)] transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.98]"
          >
            Começar conversa
            <IconArrowRight size={20} />
          </Link>
          <p className="mt-3 text-[13px] text-ink-3">Sem cadastro para experimentar.</p>
        </section>

        <section aria-labelledby="exemplos" className="pb-12">
          <h2 id="exemplos" className="text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-3">
            Experimente perguntar
          </h2>
          <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {EXAMPLES.map((ex) => (
              <li key={ex.topic}>
                <Link
                  href={`/chat?q=${encodeURIComponent(ex.prompt)}`}
                  className="group flex min-h-[76px] items-center gap-4 rounded-[20px] border border-line bg-surface px-4 py-4 shadow-[var(--shadow-soft)] transition-[border-color,box-shadow] duration-200 hover:border-line-strong hover:shadow-[var(--shadow-lift)]"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                    <TopicIcon topic={ex.topic} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium text-ink-3">{ex.label}</span>
                    <span className="block text-[16px] leading-snug text-ink">{ex.prompt}</span>
                  </span>
                  <IconArrowRight size={18} className="shrink-0 text-ink-3 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="grid gap-3 pb-12 sm:grid-cols-2">
          <div className="rounded-[20px] border border-line bg-surface p-5">
            <h2 className="text-[16px] font-semibold">Mãe ou Pai?</h2>
            <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">
              Dois modos da mesma IA. Mãe acolhe e acalma; Pai vai direto ao ponto. Os dois ajudam em qualquer
              tarefa, com o mesmo cuidado.
            </p>
          </div>
          <div className="rounded-[20px] border border-line bg-surface p-5">
            <h2 className="flex items-center gap-2 text-[16px] font-semibold">
              <IconShield size={18} className="text-brand" /> Privacidade
            </h2>
            <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">
              Fotos são usadas só para analisar a conversa e não ficam salvas. Com conta, guardamos apenas o
              texto — e você apaga quando quiser.{" "}
              <Link href="/privacidade" className="font-medium text-brand underline-offset-2 hover:underline">
                Saiba mais
              </Link>
            </p>
          </div>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-[960px] px-4 pb-6 text-[12.5px] text-ink-3 sm:px-6">
        Ô de Casa usa IA e pode errar. Em emergência: Bombeiros 193 · SAMU 192.
      </footer>
    </div>
  );
}
