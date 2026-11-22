# Ô de Casa

> Uma mãozinha pra quem tá aprendendo a se virar.

App em português brasileiro para quem mora sozinho ou está aprendendo a cuidar da casa. A pessoa escreve ou
fotografa o problema (cozinha, limpeza, roupas, montagem…) e uma IA multimodal responde em passos curtos, em
dois tons: **Mãe** (acolhedor) ou **Pai** (direto). Os dois são modos da mesma IA e podem ser trocados a
qualquer momento na mesma conversa.

- Next.js 16 (App Router) · TypeScript · Tailwind CSS 4
- Supabase Auth (link mágico / código por e-mail) + Postgres com Row Level Security
- Google Gemini no plano gratuito (padrão `gemini-2.5-flash`, com visão) chamado só pelo servidor — OpenAI e Anthropic como alternativas pagas — e modo demonstração sem credenciais
- Pronto para Vercel

![Celular](docs/screenshots/04-resposta-mae.png)

## Como funciona

| Parte | Onde |
| --- | --- |
| Tela inicial | `src/app/page.tsx` |
| Chat (Mãe \| Pai, câmera, galeria, histórico) | `src/components/ChatApp.tsx`, `Composer.tsx`, `HistoryPanel.tsx`, `ModeSwitch.tsx` |
| Login por link mágico / código | `src/app/entrar`, `src/components/LoginForm.tsx`, `src/app/auth/callback/route.ts` |
| Rota da IA | `src/app/api/chat/route.ts` → `src/lib/ai/*` |
| Histórico (listar, abrir, trocar modo, apagar, importar conversa de visitante) | `src/app/api/conversations/**` |
| Migrations SQL | `supabase/migrations/*.sql` |
| Renovação de sessão | `src/proxy.ts` (novo nome do middleware no Next 16) |

**Visitante:** usa o chat sem cadastro. O texto fica só no navegador (`localStorage`). Limite de 12 mensagens
por hora (configurável), contado por um hash do IP com sal.

**Conta:** entra com o e-mail (link ou código de 6 dígitos). Ao entrar, o app oferece salvar a conversa que
estava aberta. As conversas ficam no Postgres e reaparecem em qualquer aparelho.

**Fotos:** reduzidas no aparelho (até 1600 px, JPEG — o que também remove a localização EXIF), validadas no
servidor (tamanho ≤ 4 MB e formato real por assinatura de bytes: JPG, PNG, WEBP, GIF) e enviadas ao provedor de
IA só para aquela resposta. Nada de imagem ou URL de anexo é gravado; no banco fica apenas `has_image = true`.
Durante a sessão, a última foto fica só na memória do navegador e acompanha as próximas perguntas como
referência — é assim que “E agora?” continua da mesma etapa mesmo depois de trocar de Mãe para Pai.

**Segurança da orientação:** o prompt do sistema (`src/lib/ai/prompt.ts`) manda usar só o que a foto mostra,
pedir outro ângulo/medida/modelo quando faltar detalhe e interromper instruções em casos de risco (cheiro de
gás, fiação exposta, faísca, mistura de produtos, estrutura…), indicando 193/192, distribuidora ou
eletricista. Um detector simples (`src/lib/ai/safety.ts`) reforça o aviso ao modelo quando a mensagem fala de
gás ou risco elétrico.

**Modo demonstração:** sem nenhuma chave de IA (`GEMINI_API_KEY`, `OPENAI_API_KEY` ou `ANTHROPIC_API_KEY`) (ou com `AI_DEMO_MODE=true`) a rota devolve respostas fixas.
A interface mostra a faixa “Modo demonstração” e cada resposta leva o selo “demonstração”.

## Rodando localmente

Pré-requisitos: Node 20.9+, Docker (para o Supabase local).

```bash
npm install
```

```bash
npm run db:start
```

O comando aplica as migrations e imprime as chaves locais. Crie `.env.local` a partir do exemplo:

```bash
cp .env.example .env.local
```

```bash
npx supabase status -o env
```

Copie `API_URL` → `NEXT_PUBLIC_SUPABASE_URL`, `ANON_KEY` → `NEXT_PUBLIC_SUPABASE_ANON_KEY` e
`SERVICE_ROLE_KEY` → `SUPABASE_SERVICE_ROLE_KEY`. Deixe `GEMINI_API_KEY` vazio para o modo demonstração ou
coloque sua chave.

```bash
npm run dev
```

Abra http://localhost:3000. Os e-mails de login chegam no Mailpit local: http://127.0.0.1:54324.
O `supabase/config.toml` já usa o template em `supabase/templates/magic_link.html` e libera
`http://localhost:3000/auth/callback` como redirecionamento.

Sem Supabase configurado o app ainda funciona como visitante (o login aparece como indisponível).

## Publicando: Supabase

1. Crie um projeto em https://supabase.com/dashboard (região São Paulo, `sa-east-1`, fica mais perto do público).
2. Conecte a CLI e aplique as migrations:

   ```bash
   npx supabase login
   ```

   ```bash
   npx supabase link --project-ref SEU_PROJECT_REF
   ```

   ```bash
   npx supabase db push
   ```

   (Alternativa sem CLI: cole os arquivos de `supabase/migrations/` em ordem no SQL Editor.)
3. **Authentication → URL Configuration**
   - *Site URL*: `https://SEU-DOMINIO` (ex.: `https://odecasa.vercel.app`)
   - *Redirect URLs*: `https://SEU-DOMINIO/auth/callback`, `http://localhost:3000/auth/callback` e, se quiser
     login nas prévias da Vercel, `https://*-SEU-TIME.vercel.app/**`.
4. **Authentication → Sign In / Providers → Email**: deixe *Email* habilitado. O link mágico usa
   `signInWithOtp` e cria a conta no primeiro acesso.
5. **Authentication → Emails → Templates → Magic Link** (e também *Confirm signup*): troque o corpo pelo de
   `supabase/templates/magic_link.html`. Ele usa
   `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email`, que funciona mesmo quando o e-mail é
   aberto em outro aparelho, e mostra o código `{{ .Token }}` para digitar no app. (Com o template padrão o
   login também funciona, mas só no mesmo navegador que pediu o link — fluxo PKCE.)
6. **SMTP:** o envio padrão do Supabase tem limite baixo de e-mails por hora. Para produção, configure um SMTP
   próprio em *Authentication → Emails → SMTP Settings*.
7. Em **Project Settings → API** copie a *Project URL*, a chave *anon/publishable* e a *service_role/secret*.

## Publicando: provedor de IA

**Gratuito (padrão):** crie uma chave em https://aistudio.google.com/apikey (sem cartão) e defina
`GEMINI_API_KEY`. O app usa o endpoint do Gemini compatível com a API da OpenAI; o modelo padrão é
`gemini-2.5-flash` (troque com `GEMINI_MODEL`). No plano gratuito há limite de pedidos por minuto e por dia, e o
Google pode usar o conteúdo enviado para melhorar os serviços dele — o app avisa isso antes de enviar a foto.

**Pagos (opcional):** `AI_PROVIDER=openai` com `OPENAI_API_KEY` (modelo `OPENAI_MODEL`, padrão `gpt-5.4-mini`). A chave só é lida no servidor (`src/lib/server-env.ts` importa `server-only`), nunca chega ao
navegador. Para usar a Anthropic, defina `AI_PROVIDER=anthropic` e `ANTHROPIC_API_KEY` (modelo padrão
`claude-opus-5-5`, ajustável com `ANTHROPIC_MODEL`). Código: `src/lib/ai/openai.ts` e `src/lib/ai/generate.ts`.

## Publicando: Vercel

1. Suba o repositório para o GitHub e importe em https://vercel.com/new (framework detectado: Next.js).
2. Em *Settings → Environment Variables* defina, para Production (e Preview, se quiser):

   | Variável | Valor |
   | --- | --- |
   | `NEXT_PUBLIC_SITE_URL` | `https://SEU-DOMINIO` |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL do Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave anon/publishable |
   | `SUPABASE_SERVICE_ROLE_KEY` | chave service_role/secret (**sem** `NEXT_PUBLIC_`) |
   | `GEMINI_API_KEY` | chave gratuita do Google AI Studio |
   | `AI_PROVIDER` | `gemini` |
   | `RATE_LIMIT_SALT` | texto aleatório longo |
   | `RATE_LIMIT_GUEST_PER_HOUR` / `RATE_LIMIT_USER_PER_HOUR` | opcionais (12 / 60) |

3. *Deploy*. A rota `/api/chat` declara `maxDuration = 60`. O corpo de cada envio fica abaixo do limite de
   4,5 MB das funções da Vercel (foto reduzida no aparelho + checagem de 4,4 MB no servidor).
4. Volte ao Supabase e confira se *Site URL* e *Redirect URLs* apontam para o domínio final.

Pela CLI, como alternativa:

```bash
npx vercel link
```

```bash
npx vercel env add GEMINI_API_KEY production
```

```bash
npx vercel --prod
```

## Banco de dados e privacidade

- `conversations`: `user_id` (dono, `auth.users`, padrão `auth.uid()`), `title`, `active_mode` (`mae`/`pai`),
  `created_at`, `updated_at`. Índice `(user_id, updated_at desc)` para o histórico.
- `messages`: `conversation_id` (**on delete cascade**), `user_id`, `role`, `content`, `mode` (modo usado em
  cada resposta), `has_image`, `created_at`. Índice `(conversation_id, created_at)`.
- RLS habilitada e forçada nas duas tabelas, com políticas separadas de `select`, `insert`, `update` e
  `delete` restritas a `auth.uid() = user_id`. Inserir/editar mensagem exige também ser dono da conversa.
  Triggers impedem trocar `user_id` ou mover mensagem para outra conversa. `anon` não tem nenhum privilégio.
- `rate_limits` + função `consume_rate_limit`: sem acesso para `anon`/`authenticated`; só o servidor
  (service_role) chama. Guarda apenas `u:<id da conta>` ou `g:<hash do IP com sal>`.
- No servidor, toda rota valida a sessão com `supabase.auth.getUser()` e confere a propriedade
  (`id` + `user_id`) antes de ler, escrever, trocar modo ou apagar — além da RLS.
- O cliente privilegiado (`src/lib/supabase/admin.ts`) só existe no servidor e só é usado para o limite de uso.
- Logs (`src/lib/log.ts`) registram apenas escopo, nome e status do erro — nunca texto, imagem, URL ou e-mail.

## Verificações

```bash
npm run check
```

roda lint, tipos e build. Com o Supabase local e o app rodando (`npm run build && npm start`):

```bash
npm run test:isolation -- http://localhost:3000
```

```bash
npm run test:e2e
```

Resultados registrados em [`docs/VERIFICACAO.md`](docs/VERIFICACAO.md).
