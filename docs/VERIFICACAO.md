# Registro de verificação — 22/11/2026

Ambiente: Node 22, Next.js 16.4.6 (build de produção, `next start`), Supabase local via CLI 3.2
(Postgres 17, GoTrue, PostgREST, Kong, Mailpit), Chromium/Playwright. Sem `ANTHROPIC_API_KEY`:
a IA rodou em **modo demonstração**.

## Lint, tipos e build

| Comando | Resultado |
| --- | --- |
| `npm run lint` | ok, 0 problemas |
| `npm run typecheck` | ok |
| `npm run build` | ok — páginas estáticas `/`, `/chat`, `/entrar`, `/privacidade`; rotas dinâmicas `/api/*`, `/auth/*`; proxy |

## Isolamento entre contas — `npm run test:isolation -- http://localhost:3000`

**30/30 verificações passaram.** Duas contas reais (A e B) criadas no Supabase local; B tenta acessar os
dados de A por chamadas diretas ao Supabase (PostgREST com o token de B) e pelas rotas do app:

- B não lê conversas nem mensagens de A; a listagem de B só traz o que é de B.
- B não insere mensagem na conversa de A (nem forjando `user_id` de A) e não cria conversa em nome de A (42501).
- B não edita conversa nem mensagem de A (0 linhas afetadas); não move a própria mensagem para a conversa de A
  nem transfere a própria conversa para A (bloqueado por trigger).
- B não apaga conversa nem mensagem de A; os dados de A seguem intactos.
- Visitante (anon) não lê nem insere conversas/mensagens, não lê `rate_limits` e não chama
  `consume_rate_limit`; conta comum também não chama essa função.
- Rotas do app com a sessão de B: abrir, apagar, trocar modo e escrever via `/api/chat` na conversa de A → 404;
  histórico de B não inclui a conversa de A. Visitante → 401 no histórico e ao abrir conversa. A abre a
  própria → 200.
- Apagar a conversa remove as mensagens (cascata).

## Validação no servidor (curl)

| Caso | Resposta |
| --- | --- |
| Arquivo de texto enviado como `image/jpeg` | 422 “Formato não aceito…” (checa bytes, não o tipo declarado) |
| Envio de 5 MB | 413 |
| `mode` inválido | 400 |
| Corpo JSON em vez de multipart | 415 |
| Visitante, 14 envios seguidos do mesmo IP | 12× 200, depois 429 |
| Logs do servidor | nenhum conteúdo de mensagem, imagem, URL ou e-mail |

## Fluxo ponta a ponta — `scripts/e2e-flow.mjs` (FLUXO OK)

1. **iPhone 13** abre o app, toca “Começar conversa”, escolhe **Mãe**, fotografa as peças da prateleira
   (input da câmera) — aparece a prévia com o aviso de envio ao provedor de IA — e pergunta
   “Por onde eu começo?”.
2. Primeira tentativa com a rede cortada: aparece o erro e **texto e prévia continuam no campo**.
3. Reenvio: resposta “Mãe · IA” com o primeiro passo.
4. Troca para **Pai** e pergunta “E agora?”: aparece o divisor “Agora no modo Pai” e a resposta continua
   “das peças da foto” — o servidor recebeu a foto da sessão como contexto, sem novo anexo.
5. Com a altura reduzida (teclado aberto), o campo de mensagem continua visível.
6. Login por **link mágico** (e-mail capturado no Mailpit, link `…/auth/callback?token_hash=…&type=email`) →
   oferta “Quer salvar esta conversa na sua conta?” → **Salvar** → URL `/chat?c=<id>`.
7. Volta ao `/chat`, abre o histórico, reabre a conversa: as duas perguntas, as respostas com “Mãe · IA” e
   “Pai · IA”, o selo “Foto analisada (não fica salva)” e o modo ativo Pai restaurado.
8. **Outro aparelho (desktop 1280×820)**: login pelo **código de 6 dígitos**, histórico lateral aberto,
   mesma conversa.
9. Visitante (Pixel 7) abrindo o link da conversa: bloqueado (“Entre na sua conta…”).
10. Apagar a conversa pelo histórico: confirmação e remoção.

No banco ficaram apenas texto, modo e `has_image = true` — nenhuma imagem ou URL.

## Checagens extras

- Câmera indisponível (sem `videoinput`): botão da câmera desativado com rótulo “Câmera indisponível — use a
  galeria”; galeria e texto funcionam; foto anexada pode ser removida.
- `prefers-reduced-motion: reduce`: animações com duração ~0.
- Seletor Mãe | Pai é um `radiogroup`: setas do teclado trocam o modo.
- Mensagem com “cheiro de gás”: a resposta interrompe a tarefa e orienta sair, ventilar e ligar 193/
  distribuidora.

Capturas de tela em [`docs/screenshots/`](screenshots/).

## Depende de credenciais (não verificado aqui)

- **Respostas reais da IA** (análise da foto, continuidade Mãe → Pai com o modelo, tom de cada modo,
  interrupção em riscos pelo próprio modelo): precisa de `ANTHROPIC_API_KEY`. A integração está pronta em
  `src/lib/ai/generate.ts`; só o modo demonstração foi exercitado.
- **Supabase na nuvem**: migrations, RLS e auth foram verificados no Supabase local (mesmas imagens da
  plataforma). Em produção é preciso aplicar as migrations, configurar URLs e o template do link mágico, e
  de preferência um SMTP próprio (README).
- **Deploy na Vercel**: build de produção verificado localmente; a publicação exige a conta/projeto Vercel e
  as variáveis de ambiente.
- Câmera física em aparelho real (iOS/Android): o teste usou o `<input capture>` do navegador automatizado.
