import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());
const args = process.argv.slice(2);
const value = (key) => args.includes(key) ? args[args.indexOf(key) + 1] : undefined;
const credentialsFile = value("--credentials-file");
const env = { ...process.env };
if (credentialsFile) {
  const entries = Object.fromEntries(readFileSync(credentialsFile, "utf8").split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^\s*(OPENAI_API_KEY|OPENAI_BASE_URL)\s*=\s*(.*?)\s*$/);
    return match ? [[match[1], match[2].replace(/^(['"])(.*)\1$/, "$2")]] : [];
  }));
  env.ORNOVA_AI_API_KEY ||= entries.OPENAI_API_KEY;
  env.ORNOVA_AI_BASE_URL ||= entries.OPENAI_BASE_URL;
}
env.ORNOVA_AI_BASE_URL = value("--base-url") ?? env.ORNOVA_AI_BASE_URL ?? "http://127.0.0.1:20128/v1";
env.ORNOVA_AI_TEXT_MODEL = value("--model") ?? env.ORNOVA_AI_TEXT_MODEL;
env.ORNOVA_AI_IMAGE_MODEL = value("--image-model") ?? env.ORNOVA_AI_IMAGE_MODEL;

async function check() {
  if (!env.ORNOVA_AI_API_KEY) throw new Error("AI credentials are missing; no key was printed.");
  const base = new URL(env.ORNOVA_AI_BASE_URL);
  if (base.username || base.password || base.search || base.hash
    || (base.protocol !== "https:" && !(base.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname)))) {
    throw new Error("Use HTTPS, or loopback HTTP, without URL credentials.");
  }
  const endpoint = base.href.replace(/\/+$/, "");
  const headers = { Authorization: `Bearer ${env.ORNOVA_AI_API_KEY}` };
  for (const kind of ["models", "models/image"]) {
    const response = await fetch(`${endpoint}/${kind}`, { headers, redirect: "error", signal: AbortSignal.timeout(15_000) });
    if (!response.ok) { console.log(JSON.stringify({ probe: kind, status: response.status })); process.exitCode = 1; continue; }
    const data = await response.json();
    const ids = data.data?.map((item) => item.id) ?? [];
    console.log(JSON.stringify({ probe: kind, status: response.status, count: ids.length,
      ...(kind === "models/image" ? { models: ids } : { selectedModelAvailable: ids.includes(env.ORNOVA_AI_TEXT_MODEL) }) }));
  }
  if (args.includes("--infer")) {
    if (!env.ORNOVA_AI_TEXT_MODEL) throw new Error("Select a text model using --model.");
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: "POST", headers: { ...headers, "Content-Type": "application/json" }, redirect: "error",
      signal: AbortSignal.timeout(45_000),
      body: JSON.stringify({ model: env.ORNOVA_AI_TEXT_MODEL, stream: false, max_tokens: 40,
        messages: [{ role: "user", content: "Synthetic connection test. Reply only ORNOVA_CONNECTED." }] }),
    });
    if (!response.ok) { console.log(JSON.stringify({ probe: "inference", status: response.status })); process.exitCode = 1; return; }
    const result = await response.json();
    const answer = result.choices?.[0]?.message?.content;
    const passed = typeof answer === "string" && answer.trim() === "ORNOVA_CONNECTED";
    console.log(JSON.stringify({ probe: "inference", status: response.status, expectedAnswerReceived: passed }));
    if (!passed) process.exitCode = 1;
  }
  if (args.includes("--image-infer")) {
    if (!env.ORNOVA_AI_IMAGE_MODEL) throw new Error("Select an image model using --image-model.");
    const response = await fetch(`${endpoint}/images/generations`, {
      method: "POST", headers: { ...headers, "Content-Type": "application/json" }, redirect: "error",
      signal: AbortSignal.timeout(60_000),
      body: JSON.stringify({ model: env.ORNOVA_AI_IMAGE_MODEL, n: 1, size: "1024x1024", response_format: "b64_json",
        prompt: "Synthetic API connection test: a single plain gray cube on an ivory background, no text or jewelry." }),
    });
    if (!response.ok) { console.log(JSON.stringify({ probe: "image-inference", status: response.status })); process.exitCode = 1; return; }
    const result = await response.json();
    const encoded = result.data?.[0]?.b64_json;
    const received = typeof encoded === "string" && encoded.length > 100;
    console.log(JSON.stringify({ probe: "image-inference", status: response.status, imageReceived: received }));
    if (!received) process.exitCode = 1;
  }
}

try {
  if (args[0] === "dev" || args[0] === "start") {
    env.ORNOVA_AI_ENABLED = "true";
    const port = value("--port") ?? "3063";
    if (!/^\d{4,5}$/.test(port) || Number(port) > 65535) throw new Error("Invalid local port.");
    console.log(`Ornova preview: http://localhost:${port}`);
    const child = spawn(process.execPath, [resolve("node_modules/next/dist/bin/next"), args[0], "--hostname", "127.0.0.1", "--port", port],
      { env, stdio: "inherit", windowsHide: true });
    child.on("error", () => { console.error("Unable to start the local server."); process.exitCode = 1; });
    child.on("exit", (code) => { process.exitCode = code ?? 1; });
  } else { await check(); }
} catch {
  console.error("AI connection check failed. Inspect the gateway and local configuration; no credentials were printed.");
  process.exitCode = 1;
}
