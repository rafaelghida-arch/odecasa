// Fluxo ponta a ponta: celular -> Mãe + foto -> Pai "E agora?" -> login -> salvar -> reencontrar histórico.
// Requer: app rodando em http://localhost:3000, Supabase local (supabase start) com Mailpit e Playwright.
// Uso: node scripts/e2e-flow.mjs docs/screenshots scripts/fixtures/prateleira.jpg
import { chromium, devices } from "playwright";
import { randomUUID } from "node:crypto";

const APP = "http://localhost:3000";
const MAILPIT = "http://127.0.0.1:54324";
const OUT = process.argv[2] ?? "docs/screenshots";
const PHOTO = process.argv[3] ?? "scripts/fixtures/prateleira.jpg";
const log = (...a) => console.log(...a);
const fail = (m) => {
  console.error("FAIL:", m);
  process.exitCode = 1;
};

async function latestMailFor(email) {
  for (let i = 0; i < 30; i++) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
    const data = await res.json();
    if (data.messages?.length) {
      const id = data.messages[0].ID;
      const msg = await (await fetch(`${MAILPIT}/api/v1/message/${id}`)).json();
      return msg.HTML;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("e-mail não chegou");
}

const browser = await chromium.launch();
const email = `pessoa-${randomUUID().slice(0, 6)}@example.test`;

// ---------- Celular ----------
const phone = await browser.newContext({ ...devices["iPhone 13"] });
const page = await phone.newPage();
const chatRequests = [];
page.on("request", (r) => {
  if (r.url().endsWith("/api/chat") && r.method() === "POST") chatRequests.push(r.postDataBuffer()?.toString("latin1") ?? "");
});

await page.goto(APP);
await page.getByRole("heading", { name: "O que tu quer resolver hoje?" }).waitFor();
await page.waitForTimeout(450); await page.screenshot({ path: `${OUT}/01-inicio-celular.png` });
await page.getByRole("link", { name: "Começar conversa" }).click();
await page.waitForURL("**/chat");
await page.getByRole("radio", { name: "Mãe" }).click();
if ((await page.getByRole("radio", { name: "Mãe" }).getAttribute("aria-checked")) !== "true") fail("Mãe não selecionada");

// Foto (câmera se disponível; senão, galeria)
const cameraBtn = page.getByRole("button", { name: /Tirar foto|Câmera indisponível/ });
const cameraOk = await cameraBtn.isEnabled();
log("câmera disponível no navegador de teste:", cameraOk);
const inputs = page.locator('input[type="file"]');
await (cameraOk ? inputs.nth(0) : inputs.nth(1)).setInputFiles(PHOTO);
await page.getByAltText("Prévia da foto anexada").waitFor();
await page.getByText("a foto vai para o provedor de IA").waitFor();
await page.getByRole("textbox", { name: "Mensagem" }).fill("Por onde eu começo?");
await page.waitForTimeout(450); await page.screenshot({ path: `${OUT}/02-previa-foto.png` });

// Falha de envio: texto e prévia precisam continuar.
await page.route("**/api/chat", (route) => route.abort("internetdisconnected"), { times: 1 });
await page.getByRole("button", { name: "Enviar mensagem" }).click();
await page.getByRole("alert").filter({ hasText: "Sem conexão" }).waitFor();
const keptText = await page.getByRole("textbox", { name: "Mensagem" }).inputValue();
const keptPreview = await page.getByAltText("Prévia da foto anexada").isVisible();
log("após falha -> texto mantido:", keptText, "| prévia mantida:", keptPreview);
if (keptText !== "Por onde eu começo?" || !keptPreview) fail("falha não preservou texto/prévia");
await page.waitForTimeout(450); await page.screenshot({ path: `${OUT}/03-falha-preservada.png` });

// Envio de verdade.
await page.getByRole("button", { name: "Enviar mensagem" }).click();
await page.getByRole("button", { name: "Enviar mensagem" }).waitFor();
await page.locator("ol[aria-label=Mensagens] > li").filter({ hasText: "Mãe · IA" }).last().waitFor();
const reply1 = await page.locator("ol[aria-label=Mensagens] > li").last().innerText();
log("\nResposta 1 (Mãe):\n", reply1);
await page.waitForTimeout(450); await page.screenshot({ path: `${OUT}/04-resposta-mae.png` });

// Troca para Pai e continua.
await page.getByRole("radio", { name: "Pai" }).click();
await page.getByRole("textbox", { name: "Mensagem" }).fill("E agora?");
await page.getByRole("button", { name: "Enviar mensagem" }).click();
await page.locator("ol[aria-label=Mensagens] > li").filter({ hasText: "Pai · IA ·" }).last().waitFor();
const reply2 = await page.locator("ol[aria-label=Mensagens] > li").last().innerText();
log("\nResposta 2 (Pai):\n", reply2);
await page.getByText("Agora no modo Pai").waitFor();
await page.waitForTimeout(450); await page.screenshot({ path: `${OUT}/05-resposta-pai.png` });
// No modo demonstração, "das peças da foto" só aparece se o servidor recebeu a foto da sessão.
log("2ª requisição levou a foto da sessão como contexto:", reply2.includes("da foto"));
if (!reply2.includes("da foto")) fail("contexto da foto não foi enviado");

// Teclado: campo continua visível com viewport reduzida (simula teclado aberto).
await page.setViewportSize({ width: 390, height: 420 });
await page.getByRole("textbox", { name: "Mensagem" }).focus();
const box = await page.getByRole("textbox", { name: "Mensagem" }).boundingBox();
log("campo visível com 'teclado' aberto:", box && box.y + box.height <= 420);
await page.waitForTimeout(450); await page.screenshot({ path: `${OUT}/06-teclado.png` });
await page.setViewportSize({ width: 390, height: 664 });

// Login por link mágico.
await page.getByRole("link", { name: "Entrar", exact: true }).click();
await page.getByLabel("E-mail").fill(email);
await page.getByRole("button", { name: "Enviar link de acesso" }).click();
await page.getByText("Pronto! Enviamos um link").waitFor();
await page.waitForTimeout(450); await page.screenshot({ path: `${OUT}/07-link-enviado.png` });
const html = await latestMailFor(email);
const link = html.match(/href="([^"]+auth\/callback[^"]+)"/)[1].replaceAll("&amp;", "&");
log("\nlink mágico recebido:", link.replace(/token_hash=[^&]+/, "token_hash=…"));
await page.goto(link);
await page.waitForURL("**/chat?entrou=1");
await page.getByText("Quer salvar esta conversa na sua conta?").waitFor();
await page.waitForTimeout(450); await page.screenshot({ path: `${OUT}/08-oferta-salvar.png` });
await page.getByRole("button", { name: "Salvar conversa" }).click();
await page.waitForURL(/\/chat\?c=/);
await page.getByText("Conversa salva na sua conta.").waitFor();
const savedUrl = page.url();
log("conversa salva:", savedUrl);

// Voltar depois: nova aba/recarregar.
await page.goto(`${APP}/chat`);
await page.getByRole("button", { name: "Abrir histórico" }).click();
await page.locator("#history-panel").getByRole("button", { name: /^Por onde eu começo\?/ }).click();
await page.getByText("E agora?").waitFor();
await page.getByText("Foto analisada (não fica salva)").waitFor();
const texts = await page.locator("ol[aria-label=Mensagens]").innerText();
log("\nhistórico reaberto contém as duas perguntas:", texts.includes("Por onde eu começo?") && texts.includes("E agora?"));
log("modos gravados (Mãe e Pai):", texts.includes("Mãe · IA") && texts.includes("Pai · IA"));
log("modo ativo restaurado:", await page.getByRole("radio", { name: "Pai" }).getAttribute("aria-checked"));
await page.waitForTimeout(450); await page.screenshot({ path: `${OUT}/09-historico-reaberto.png` });

// ---------- Outro aparelho (desktop), login por código ----------
const desk = await browser.newContext({ viewport: { width: 1280, height: 820 } });
const dp = await desk.newPage();
await dp.goto(`${APP}/entrar`);
await dp.getByLabel("E-mail").fill(email);
await new Promise((r) => setTimeout(r, 1200));
await fetch(`${MAILPIT}/api/v1/messages`, { method: "DELETE" });
await dp.getByRole("button", { name: "Enviar link de acesso" }).click();
await dp.getByText("Pronto! Enviamos um link").waitFor();
const html2 = await latestMailFor(email);
const code = html2.match(/<strong>(\d{6,10})<\/strong>/)[1];
await dp.getByLabel(/código que veio no e-mail/).fill(code);
await dp.getByRole("button", { name: "Entrar com código" }).click();
await dp.waitForURL("**/chat?entrou=1");
await dp.locator("#history-panel").getByRole("button", { name: /^Por onde eu começo\?/ }).click();
await dp.getByText("E agora?").waitFor();
log("\ndesktop (outro aparelho) vê o histórico:", true);
await dp.waitForTimeout(450); await dp.screenshot({ path: `${OUT}/10-desktop-historico.png` });
await dp.goto(APP);
await dp.waitForTimeout(450); await dp.screenshot({ path: `${OUT}/11-inicio-desktop.png` });

// Visitante em outro contexto não vê nada.
const guest = await browser.newContext({ ...devices["Pixel 7"] });
const gp = await guest.newPage();
await gp.goto(savedUrl);
await gp.getByText("Entre na sua conta para abrir conversas salvas.").waitFor();
log("visitante bloqueado ao abrir link da conversa:", true);
await gp.waitForTimeout(450); await gp.screenshot({ path: `${OUT}/12-visitante-bloqueado.png` });

// Apagar conversa (desktop).
await dp.goto(`${APP}/chat`);
await dp.getByRole("button", { name: /Apagar conversa:/ }).first().click();
await dp.getByRole("button", { name: "Apagar", exact: true }).click();
await dp.getByText("Conversa apagada.").waitFor();
log("conversa apagada pelo histórico:", true);

await browser.close();
log(process.exitCode ? "\nFLUXO COM FALHAS" : "\nFLUXO OK");
