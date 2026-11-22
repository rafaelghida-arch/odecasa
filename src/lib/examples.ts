export type ExampleTopic = "cozinha" | "limpeza" | "roupas" | "montagem";

export const EXAMPLES: { topic: ExampleTopic; label: string; prompt: string }[] = [
  { topic: "cozinha", label: "Cozinha", prompt: "Como eu sei se o arroz tá no ponto?" },
  { topic: "limpeza", label: "Limpeza", prompt: "Como tiro a gordura grudada do fogão?" },
  { topic: "roupas", label: "Roupas", prompt: "Posso lavar a calça jeans junto com a camiseta branca?" },
  { topic: "montagem", label: "Montagem", prompt: "Comprei uma prateleira para montar. Por onde eu começo?" },
];
