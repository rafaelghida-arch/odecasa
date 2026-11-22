#!/usr/bin/env node
/**
 * Verifica o isolamento entre contas (RLS + checagens no servidor).
 *
 * Uso:
 *   node --env-file=.env.local scripts/verify-isolation.mjs [APP_URL]
 *
 * Precisa de NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY e
 * SUPABASE_SERVICE_ROLE_KEY (só para criar/remover as duas contas de teste).
 * Se APP_URL for informado (ex.: http://localhost:3000), também testa as rotas do app.
 * Use num projeto de desenvolvimento: cria e apaga dois usuários de teste.
 */
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { randomUUID } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const appUrl = process.argv[2];

if (!url || !anonKey || !serviceKey) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY ou SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(2);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

async function makeUser(label) {
  const email = `isolamento-${label}-${randomUUID().slice(0, 8)}@example.test`;
  const password = `Senha-${randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: s, error: e2 } = await client.auth.signInWithPassword({ email, password });
  if (e2) throw e2;
  return { id: data.user.id, email, client, session: s.session };
}

/** Gera os cookies de sessão no mesmo formato que o app (@supabase/ssr) lê. */
async function cookieHeaderFor(session) {
  const jar = new Map();
  const ssr = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (list) => list.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  await ssr.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
  return [...jar].map(([n, v]) => `${n}=${v}`).join("; ");
}

const a = await makeUser("a");
const b = await makeUser("b");
const anon = createClient(url, anonKey, { auth: { persistSession: false } });

try {
  // Conta A cria dados.
  const { data: convA, error: cErr } = await a.client
    .from("conversations")
    .insert({ title: "Conversa da A", active_mode: "mae" })
    .select()
    .single();
  check("A cria a própria conversa", !cErr && convA?.user_id === a.id, cErr?.message);
  const { data: msgA, error: mErr } = await a.client
    .from("messages")
    .insert({ conversation_id: convA.id, role: "user", content: "segredo da A", mode: "mae" })
    .select()
    .single();
  check("A cria mensagem na própria conversa", !mErr && msgA, mErr?.message);

  // Conta B tenta LER.
  const r1 = await b.client.from("conversations").select("*").eq("id", convA.id);
  check("B não lê conversa da A", !r1.error && r1.data.length === 0);
  const r2 = await b.client.from("messages").select("*").eq("conversation_id", convA.id);
  check("B não lê mensagens da A", !r2.error && r2.data.length === 0);
  const r2b = await b.client.from("conversations").select("*");
  check("Listagem de B não traz dados da A", !r2b.error && r2b.data.every((c) => c.user_id === b.id));

  // Conta B tenta INSERIR.
  const r3 = await b.client
    .from("messages")
    .insert({ conversation_id: convA.id, role: "user", content: "invasão", mode: "pai" });
  check("B não insere mensagem na conversa da A", Boolean(r3.error), r3.error?.code);
  const r3b = await b.client
    .from("messages")
    .insert({ conversation_id: convA.id, user_id: a.id, role: "user", content: "invasão", mode: "pai" });
  check("B não insere mensagem fingindo ser A", Boolean(r3b.error), r3b.error?.code);
  const r4 = await b.client.from("conversations").insert({ user_id: a.id, title: "forjada", active_mode: "pai" });
  check("B não cria conversa em nome da A", Boolean(r4.error), r4.error?.code);

  // Conta B tenta EDITAR.
  const r5 = await b.client.from("conversations").update({ title: "hackeado" }).eq("id", convA.id).select();
  const r6 = await b.client.from("messages").update({ content: "hackeado" }).eq("id", msgA.id).select();
  check("B não edita conversa da A", !r5.error && r5.data.length === 0);
  check("B não edita mensagem da A", !r6.error && r6.data.length === 0);

  // B tenta mover a própria mensagem para a conversa da A.
  const { data: convB } = await b.client
    .from("conversations")
    .insert({ title: "Conversa da B", active_mode: "pai" })
    .select()
    .single();
  const { data: msgB } = await b.client
    .from("messages")
    .insert({ conversation_id: convB.id, role: "user", content: "oi", mode: "pai" })
    .select()
    .single();
  const r7 = await b.client.from("messages").update({ conversation_id: convA.id }).eq("id", msgB.id).select();
  check("B não move mensagem para a conversa da A", Boolean(r7.error) || r7.data.length === 0, r7.error?.code);
  const r7b = await b.client.from("conversations").update({ user_id: a.id }).eq("id", convB.id).select();
  check("B não transfere a própria conversa para A", Boolean(r7b.error) || r7b.data.length === 0, r7b.error?.code);

  // Conta B tenta APAGAR.
  const r8 = await b.client.from("messages").delete().eq("id", msgA.id).select();
  const r9 = await b.client.from("conversations").delete().eq("id", convA.id).select();
  check("B não apaga mensagem da A", !r8.error && r8.data.length === 0);
  check("B não apaga conversa da A", !r9.error && r9.data.length === 0);

  // A continua íntegra.
  const { data: still } = await a.client.from("conversations").select("title").eq("id", convA.id).single();
  const { data: stillMsg } = await a.client.from("messages").select("content").eq("id", msgA.id).single();
  check("Dados da A seguem intactos", still?.title === "Conversa da A" && stillMsg?.content === "segredo da A");

  // Visitante (anon).
  const v1 = await anon.from("conversations").select("*");
  check("Visitante não lê conversas", Boolean(v1.error) || v1.data.length === 0, v1.error?.code);
  const v2 = await anon.from("messages").select("*");
  check("Visitante não lê mensagens", Boolean(v2.error) || v2.data.length === 0, v2.error?.code);
  const v3 = await anon.from("conversations").insert({ user_id: a.id, title: "x", active_mode: "mae" });
  check("Visitante não insere conversa", Boolean(v3.error), v3.error?.code);
  const v4 = await anon.from("rate_limits").select("*");
  check("Visitante não lê limites de uso", Boolean(v4.error) || v4.data.length === 0, v4.error?.code);
  const v5 = await anon.rpc("consume_rate_limit", { p_bucket: "x", p_limit: 1, p_window_seconds: 60 });
  check("Visitante não chama função de limite", Boolean(v5.error), v5.error?.code);
  const v6 = await b.client.rpc("consume_rate_limit", { p_bucket: "x", p_limit: 1, p_window_seconds: 60 });
  check("Conta comum não chama função de limite", Boolean(v6.error), v6.error?.code);

  // Rotas do app (validação de sessão e propriedade no servidor).
  if (appUrl) {
    const cookieB = await cookieHeaderFor(b.session);
    const cookieA = await cookieHeaderFor(a.session);
    const g = (path, cookie, init = {}) =>
      fetch(`${appUrl}${path}`, { ...init, headers: { ...(init.headers ?? {}), ...(cookie ? { cookie } : {}) } });

    const s1 = await g(`/api/conversations/${convA.id}`, cookieB);
    check("API: B recebe 404 ao abrir conversa da A", s1.status === 404, `status ${s1.status}`);
    const s2 = await g(`/api/conversations/${convA.id}`, cookieB, { method: "DELETE" });
    check("API: B recebe 404 ao apagar conversa da A", s2.status === 404, `status ${s2.status}`);
    const s3 = await g(`/api/conversations/${convA.id}`, cookieB, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ activeMode: "pai" }),
    });
    check("API: B recebe 404 ao trocar modo da conversa da A", s3.status === 404, `status ${s3.status}`);
    const form = new FormData();
    form.append("payload", JSON.stringify({ mode: "pai", text: "oi", conversationId: convA.id, history: [] }));
    const s4 = await g(`/api/chat`, cookieB, { method: "POST", body: form });
    check("API: B não escreve na conversa da A pelo chat", s4.status === 404, `status ${s4.status}`);
    const s5 = await g(`/api/conversations`, cookieB);
    const list = s5.ok ? (await s5.json()).conversations : [];
    check("API: histórico de B não inclui a conversa da A", s5.ok && !list.some((c) => c.id === convA.id));
    const s6 = await g(`/api/conversations`, null);
    check("API: visitante recebe 401 no histórico", s6.status === 401, `status ${s6.status}`);
    const s7 = await g(`/api/conversations/${convA.id}`, null);
    check("API: visitante recebe 401 ao abrir conversa", s7.status === 401, `status ${s7.status}`);
    const s8 = await g(`/api/conversations/${convA.id}`, cookieA);
    check("API: A abre a própria conversa", s8.status === 200, `status ${s8.status}`);
  }

  // Exclusão em cascata.
  const del = await a.client.from("conversations").delete().eq("id", convA.id).select();
  const { count } = await admin
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", convA.id);
  check("Apagar conversa apaga as mensagens (cascata)", !del.error && del.data.length === 1 && count === 0);
} finally {
  await admin.auth.admin.deleteUser(a.id);
  await admin.auth.admin.deleteUser(b.id);
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} verificações passaram.`);
process.exit(failed.length ? 1 : 0);
