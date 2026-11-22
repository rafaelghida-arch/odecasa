import type { Metadata } from "next";
import Link from "next/link";
import { IconChevronLeft } from "@/components/icons";

export const metadata: Metadata = { title: "Privacidade" };

export default function Privacidade() {
  return (
    <main className="pt-safe pb-safe mx-auto max-w-[640px] px-5 py-8">
      <Link href="/" className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-[15px] text-brand">
        <IconChevronLeft size={18} /> Início
      </Link>
      <h1 className="mt-4 text-[30px] font-semibold tracking-tight">Privacidade</h1>
      <div className="mt-5 space-y-4 text-[16px] leading-relaxed text-ink-2">
        <p>
          <strong className="text-ink">Fotos.</strong> Quando você anexa uma foto, ela é reduzida no seu aparelho e
          enviada ao provedor de IA (OpenAI) apenas para responder a esta conversa. O Ô de Casa não grava a
          imagem nem um link para ela. Durante a sessão, a última foto fica só na memória do navegador para dar
          contexto às próximas perguntas.
        </p>
        <p>
          <strong className="text-ink">Texto.</strong> Como visitante, a conversa fica só neste navegador. Com
          conta, salvamos o texto das mensagens e o modo (Mãe ou Pai) para você retomar em outro aparelho. Cada
          conta só acessa as próprias conversas.
        </p>
        <p>
          <strong className="text-ink">Apagar.</strong> No histórico, toque no ícone de lixeira para apagar uma
          conversa e todas as mensagens dela.
        </p>
        <p>
          <strong className="text-ink">Registros.</strong> Não registramos o conteúdo das mensagens, imagens ou
          e-mails em logs. Para limitar abuso, contamos mensagens por hora usando um código anônimo.
        </p>
        <p>
          <strong className="text-ink">IA.</strong> Mãe e Pai são modos de uma inteligência artificial. Ela pode
          errar; em situação de risco, procure ajuda profissional.
        </p>
      </div>
    </main>
  );
}
