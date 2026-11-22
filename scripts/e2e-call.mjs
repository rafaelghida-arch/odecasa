// Teste da ligação de voz com microfone e fala simulados (o navegador de teste não tem áudio).
// Uso: node scripts/e2e-call.mjs <pasta-das-capturas> scripts/fixtures/prateleira.jpg  (app em http://localhost:3000)
import { chromium, devices } from "playwright";
const [out, photo] = process.argv.slice(2);
const b = await chromium.launch();
const ctx = await b.newContext({ ...devices["iPhone 13"] });
await ctx.addInitScript(() => {
  // Falas que o "microfone" vai entregar, uma por vez.
  window.__script = ["Oi pai, comprei uma prateleira e as peças estão aqui. Por onde eu começo?", "Tá, separei. E agora?"];
  window.__spoken = [];
  class FakeRec {
    constructor() { this.onresult = null; this.onend = null; this.onerror = null; }
    start() {
      const text = window.__script.shift();
      setTimeout(() => {
        if (text && this.onresult) {
          const res = [{ isFinal: true, 0: { transcript: text } }];
          this.onresult({ resultIndex: 0, results: res });
        }
        if (!text) window.__idle = true;
        setTimeout(() => this.onend && this.onend(), text ? 50 : 1500);
      }, 600);
    }
    stop() {} abort() {}
  }
  window.webkitSpeechRecognition = FakeRec; window.SpeechRecognition = FakeRec;
  const synth = {
    speaking: false, _q: [],
    getVoices: () => [],
    cancel() { this._q = []; },
    speak(u) { if (!u.text) return; window.__spoken.push(u.text); setTimeout(() => u.onend && u.onend(), 300); },
  };
  Object.defineProperty(window, "speechSynthesis", { value: synth });
  window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
});
const p = await ctx.newPage();
const bodies = [];
p.on("request", (r) => { if (r.url().endsWith("/api/chat")) bodies.push(r.postData() ?? ""); });
await p.goto("http://localhost:3000/chat", { waitUntil: "networkidle" });
await p.getByRole("radio", { name: "Pai" }).click();
await p.waitForTimeout(400);
await p.screenshot({ path: `${out}/call-0-chat.png` });
await p.getByRole("button", { name: "Ligar para Pai" }).click();
await p.getByRole("dialog", { name: "Ligação com Pai" }).waitFor();
await p.waitForTimeout(500);
await p.screenshot({ path: `${out}/call-1-chamando.png` });
// foto durante a ligação (vai com a primeira fala)
await p.locator('[role=dialog] input[type="file"]').setInputFiles(photo);
await p.getByAltText("Foto que vai junto com a próxima fala").waitFor();
await p.waitForFunction(() => window.__spoken.length >= 3, null, { timeout: 90000 });
await p.screenshot({ path: `${out}/call-2-resposta1.png` });
await p.waitForFunction(() => window.__idle === true, null, { timeout: 120000 });
await p.waitForTimeout(800);
await p.screenshot({ path: `${out}/call-3-resposta2.png` });
const spoken = await p.evaluate(() => window.__spoken);
console.log("FALADO PELO PAI:\n- " + spoken.join("\n- "));
console.log("\nvoice:true nas requisições:", bodies.length, bodies.every((x) => x.includes('\\"voice\\":true') || x.includes('"voice":true')));
console.log("foto foi na 1ª fala:", bodies[0]?.includes('name="image"'), "| contexto na 2ª:", bodies[1]?.includes('name="contextImage"'));
await p.getByRole("button", { name: "Desligar a ligação" }).click();
await p.waitForTimeout(600);
const chat = await p.locator("ol[aria-label=Mensagens]").innerText();
console.log("\nconversa registrada no chat:", chat.includes("Por onde eu começo") && chat.includes("E agora"));
await p.screenshot({ path: `${out}/call-4-depois.png` });
await b.close();
