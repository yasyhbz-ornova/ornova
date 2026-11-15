// Explicit opt-in only. Build in a fresh local fixture; never launch desktop/operational data.
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawn, spawnSync } from "node:child_process";
import { randomBytes, createHash } from "node:crypto";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { verifyPcsSource, copyPcsSources, dotnetEnvironment } from "./pcs-engine-verification.mjs";

export async function withNativePricing(options, run) {
  if (!options.dotnet || !options.source || !options.packages) throw Error("Explicit dotnet/source/packages paths required");
  const source = verifyPcsSource(options.source);
  const workspace = mkdtempSync(join(tmpdir(), "ornova-native-pricing-"));
  const snapshot = copyPcsSources(source.root, join(workspace, "pcs"));
  const service = join(workspace, "service"); mkdirSync(service);
  for (const name of ["Ornova.Pricing.csproj", "Program.cs"]) copyFileSync(fileURLToPath(new URL(`../services/ornova-pricing/${name}`, import.meta.url)), join(service, name));
  const env = dotnetEnvironment(process.env, resolve(options.dotnet), workspace);
  const project = join(service, "Ornova.Pricing.csproj"), artifacts = join(workspace, "artifacts");
  const common = [project, "--artifacts-path", artifacts, `-p:PcsSourceRoot=${snapshot}`];
  for (const args of [["restore", ...common, "--source", resolve(options.packages), "-p:NuGetAudit=false", "--disable-parallel"], ["build", ...common, "--no-restore", "-c", "Release"]]) {
    const result = spawnSync(resolve(options.dotnet), args, { env, cwd: workspace, encoding: "utf8", timeout: 60000, windowsHide: true });
    if (result.status !== 0) throw Error(`Native build failed: ${(result.stdout + result.stderr).slice(-10000)}`);
  }
  const listener = createServer();
  await new Promise((ok, fail) => { listener.once("error", fail); listener.listen(0, "127.0.0.1", ok); });
  const port = listener.address().port;
  await new Promise((ok, fail) => listener.close(error => error ? fail(error) : ok()));
  const token = randomBytes(32).toString("hex"), url = `http://127.0.0.1:${port}/v1/preview`;
  const dll = join(artifacts, "bin", "Ornova.Pricing", "release", "Ornova.Pricing.dll");
  const processHandle = spawn(resolve(options.dotnet), [dll], { env: { ...env, ORNOVA_PRICING_TOKEN: token, ORNOVA_PRICING_LISTEN_PORT: String(port) }, cwd: workspace, stdio: "ignore", windowsHide: true });
  const exited = new Promise(done => { processHandle.once("exit", done); processHandle.once("error", done); });
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100 && processHandle.exitCode === null; attempt++) {
      try { const response = await fetch(url, { method: "POST", signal: AbortSignal.timeout(300) }); ready = response.status === 401; await response.body?.cancel(); } catch { /* Startup only. */ }
      if (ready) break;
      await new Promise(done => setTimeout(done, 100));
    }
    if (!ready) throw Error("Native loopback service did not become ready");
    await run({ url, token, evidenceDirectory: workspace });
    writeFileSync(join(workspace, "evidence.json"), JSON.stringify({ source_engine_sha256: source.engine_sha256, host_sha256: createHash("sha256").update(readFileSync(dll)).digest("hex"), completed_at: new Date().toISOString(), scope: "synthetic local preview assertions completed; no invoice or deployment" }, null, 2));
  } finally {
    if (processHandle.exitCode === null) processHandle.kill();
    await exited;
  }
}
