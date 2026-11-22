import type { Metadata } from "next";
import Link from "next/link";
import { IconChevronLeft } from "@/components/icons";
import { Mascot } from "@/components/Mascot";

export const metadata: Metadata = { title: "Privacidade" };

export default function Privacidade() {
  return (
    <main className="pt-safe pb-safe mx-auto max-w-[640px] px-5 py-6">
      <Link href="/" className="btn-white inline-flex min-h-11 items-center gap-1 rounded-2xl border-2 border-line bg-white px-3 text-[15px] font-extrabold text-brand-dark">
        <IconChevronLeft size={18} /> Início
      </Link>
      <div className="mt-5 flex items-center gap-3">
        <Mascot size={70} compact animated={false} />
        <h1 className="text-[32px] font-black tracking-tight">Privacidade</h1>
      </div>
      <div className="mt-5 space-y-3 text-[16px] font-semibold leading-relaxed text-ink-2">
        <p className="card-chunky rounded-[22px] bg-white p-4">
          <strong className="font-black text-ink">Fotos.</strong> Quando você anexa uma foto, ela é reduzida no seu aparelho e
          enviada à IA do Google (Gemini, plano gratuito) para responder a esta conversa. No plano gratuito, o Google pode usar o texto e as fotos enviados para melhorar os serviços dele, por isso evite fotos com rostos, documentos ou endereço. O Ô de Casa não grava a
          imagem nem um link para ela. Durante a sessão, a última foto fica só na memória do navegador para dar
          contexto às próximas perguntas.
        </p>
        <p className="card-chunky rounded-[22px] bg-white p-4">
          <strong className="font-black text-ink">Texto.</strong> Como visitante, a conversa fica só neste navegador. Com
          conta, salvamos o texto das mensagens e o modo (Mãe ou Pai) para você retomar em outro aparelho. Cada
          conta só acessa as próprias conversas.
        </p>
        <p className="card-chunky rounded-[22px] bg-white p-4">
          <strong className="font-black text-ink">Apagar.</strong> No histórico, toque no ícone de lixeira para apagar uma
          conversa e todas as mensagens dela.
        </p>
        <p className="card-chunky rounded-[22px] bg-white p-4">
          <strong className="font-black text-ink">Registros.</strong> Não registramos o conteúdo das mensagens, imagens ou
          e-mails em logs. Para limitar abuso, contamos mensagens por hora usando um código anônimo.
        </p>
        <p className="card-chunky rounded-[22px] bg-white p-4">
          <strong className="font-black text-ink">IA.</strong> Mãe e Pai são modos de uma inteligência artificial. Ela pode
          errar; em situação de risco, procure ajuda profissional.
        </p>
      </div>
    </main>
  );
}
