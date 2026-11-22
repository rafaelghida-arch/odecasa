import type { Mode } from "@/lib/types";
import type { HazardKind } from "./safety";

/**
 * Respostas fixas do modo demonstração (sem credenciais de IA).
 * Sempre identificadas como demonstração na interface.
 */
export function demoReply(opts: {
  mode: Mode;
  text: string;
  hasNewImage: boolean;
  hasContextImage: boolean;
  previousUserTurns: number;
  hazard: HazardKind;
}): string {
  const { mode, hasNewImage, hasContextImage, previousUserTurns, hazard } = opts;
  const mae = mode === "mae";

  if (hazard === "gas") {
    return mae
      ? "Calma, mas vamos parar tudo agora. Com cheiro de gás:\n\n1. Não acenda fogo nem isqueiro e não mexa em interruptores.\n2. Feche o registro do gás, se der para fazer isso com segurança.\n3. Abra portas e janelas e saia do local.\n4. Lá de fora, ligue para os Bombeiros (193) ou para a distribuidora de gás.\n\n(Resposta de demonstração.)"
      : "Para tudo. Gás não é tarefa pra resolver sozinho:\n\n1. Nada de fogo, isqueiro ou interruptor.\n2. Fecha o registro se for seguro.\n3. Abre as janelas e sai.\n4. De fora, liga 193 ou para a distribuidora.\n\n(Resposta de demonstração.)";
  }
  if (hazard === "eletrica") {
    return mae
      ? "Ei, aqui é melhor não mexer. Fio exposto ou faísca é coisa para eletricista.\n\n1. Não toque no fio nem na tomada.\n2. Se der com segurança e mãos secas, desligue o disjuntor geral.\n3. Afaste água e chame um eletricista.\n\n(Resposta de demonstração.)"
      : "Esse não é pra tu mexer. Fio exposto é com eletricista.\n\n1. Não encosta.\n2. Desliga o disjuntor geral, se for seguro.\n3. Chama um eletricista qualificado.\n\n(Resposta de demonstração.)";
  }

  if (hasNewImage) {
    return mae
      ? "Que bom que você mandou a foto, assim fica mais fácil. *No modo demonstração eu não analiso a imagem de verdade*, mas o caminho seria este:\n\n1. Separe as peças por tipo e tamanho em cima de um pano ou papelão.\n2. Conte os parafusos e compare com a lista do manual.\n\nComeça pela separação e me conta como ficou."
      : "Boa, foto ajuda. *Modo demonstração: a imagem não é analisada de verdade.* Primeiro passo:\n\n1. Espalha as peças no chão, agrupadas por tipo.\n2. Confere os parafusos com a lista do manual.\n\nFeito isso, me chama.";
  }

  if (previousUserTurns > 0) {
    const ref = hasContextImage ? " das peças da foto" : "";
    return mae
      ? `Seguindo de onde paramos${ref}: agora encaixe a primeira peça grande na base, sem apertar demais os parafusos ainda. Ajuste tudo no fim.\n\n(Resposta de demonstração.)`
      : `Continuando${ref}: próximo passo é fixar a primeira peça na base. Aperta só de leve; o aperto final vem depois.\n\n(Resposta de demonstração.)`;
  }

  return mae
    ? "Oi! Tô aqui para te ajudar, com calma. Me conta um pouco mais do que você quer resolver — se puder, manda uma foto que eu te digo por onde começar.\n\n(Resposta de demonstração: configure ANTHROPIC_API_KEY para respostas reais.)"
    : "E aí! Bora resolver. Me diz o que tá acontecendo — se tiver foto, manda que fica mais rápido.\n\n(Resposta de demonstração: configure ANTHROPIC_API_KEY para respostas reais.)";
}
