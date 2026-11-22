/**
 * Detecção simples de situações de risco. Serve para reforçar a instrução
 * ao modelo e para o modo demonstração. O modelo também é instruído a
 * reconhecer riscos que não aparecem nestas palavras.
 */
export type HazardKind = "gas" | "eletrica" | null;

const GAS = /(cheiro\s+de\s+g[aá]s|vazamento\s+de\s+g[aá]s|vazando\s+g[aá]s|g[aá]s\s+vazando|botij[aã]o.*(vaza|cheiro|chiando)|chiado.*g[aá]s)/i;
const ELETRICA = /(fio[s]?\s+(desencapado|exposto|solto|derretido)|fia[cç][aã]o\s+(exposta|derretida|queimada)|tomada\s+(soltando\s+fa[ií]sca|queimad|derretid|esquentando)|fa[ií]sca|choque\s+el[eé]trico|cheiro\s+de\s+queimado.*(tomada|fio|quadro))/i;

export function detectHazard(text: string): HazardKind {
  if (GAS.test(text)) return "gas";
  if (ELETRICA.test(text)) return "eletrica";
  return null;
}
