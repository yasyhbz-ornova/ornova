import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const script = new URL("../scripts/pcs-engine-verification.mjs", import.meta.url);
const gate = existsSync(script) ? await import(script.href) : {};
const projects = ["src/Ornova.PCS.Domain", "src/Ornova.PCS.Application", "src/Ornova.PCS.Infrastructure", "src/Ornova.PCS.Reporting", "tests/Ornova.PCS.Tests"];
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "ornova-pcs-gate-unit-"));
  for (const project of projects) {
    mkdirSync(join(root, project), { recursive: true });
    writeFileSync(join(root, project, `${project.split("/").at(-1)}.csproj`), "<Project />");
    writeFileSync(join(root, project, "Example.cs"), "// source fixture");
  }
  for (const file of ["Directory.Build.props", "Directory.Packages.props", "global.json"]) writeFileSync(join(root, file), "{}");
  return root;
}
function counters(overrides = {}) {
  const values = { total: "68", executed: "68", passed: "68", failed: "0", error: "0", timeout: "0", aborted: "0", notExecuted: "0", warning: "0", ...overrides };
  return `<TestRun><ResultSummary outcome="Completed"><Counters ${Object.entries(values).map(([k,v]) => `${k}="${v}"`).join(" ")} /></ResultSummary></TestRun>`;
}

test("PCS fixture copies build source but never database, configuration, binaries or generated source", () => {
  assert.equal(typeof gate.copyPcsSources, "function");
  const source = fixture(), parent = mkdtempSync(join(tmpdir(), "ornova-pcs-gate-output-")), target = join(parent, "copy");
  const domain = join(source, projects[0]);
  for (const directory of ["bin", "obj", ".private"]) {
    mkdirSync(join(domain, directory));
    writeFileSync(join(domain, directory, "Leak.cs"), "do not copy");
  }
  for (const file of ["customers.db", "customers.sqlite", ".env.local", "appsettings.json", "image.jpg"]) writeFileSync(join(domain, file), "private");
  gate.copyPcsSources(source, target);
  assert.equal(readFileSync(join(target, projects[0], "Example.cs"), "utf8"), "// source fixture");
  assert.deepEqual(readdirSync(join(target, projects[0])).sort(), ["Example.cs", "Ornova.PCS.Domain.csproj"]);
  assert.equal(readFileSync(join(domain, "customers.db"), "utf8"), "private");
  assert.ok(existsSync(join(target, "tests/Ornova.PCS.Tests/Ornova.PCS.Tests.csproj")));
});

test("PCS fixture refuses existing and source-overlapping destinations without overwriting", () => {
  assert.equal(typeof gate.copyPcsSources, "function");
  const source = fixture(), existing = mkdtempSync(join(tmpdir(), "ornova-pcs-gate-existing-"));
  writeFileSync(join(existing, "keep.txt"), "owner");
  assert.throws(() => gate.copyPcsSources(source, existing));
  assert.equal(readFileSync(join(existing, "keep.txt"), "utf8"), "owner");
  assert.throws(() => gate.copyPcsSources(source, join(source, "nested-copy")));
  assert.equal(existsSync(join(source, "nested-copy")), false);
});

test("PCS source validation rejects missing markers and an engine whose provenance changed", () => {
  assert.equal(typeof gate.verifyPcsSource, "function");
  const source = fixture();
  assert.throws(() => gate.verifyPcsSource(source));
  const engines = join(source, "src/Ornova.PCS.Infrastructure/Quotes");
  mkdirSync(engines);
  writeFileSync(join(engines, "StandardPricingEngine.cs"), "// different calculation");
  assert.throws(() => gate.verifyPcsSource(source), /hash|provenance/i);
});

test("PCS test report must be nonempty and entirely executed/passed, not merely contain a passing summary", () => {
  assert.equal(typeof gate.readPassingCounters, "function");
  assert.deepEqual(gate.readPassingCounters(counters()), { total: 68, executed: 68, passed: 68 });
  for (const report of ["", counters({ total: "0", passed: "0", executed: "0" }), counters({ failed: "1" }), counters({ executed: "67" }), counters({ passed: "67", notExecuted: "1" }), counters({ aborted: "1" }), counters({ warning: "1" }), counters({ total: "NaN" }), counters()+counters()]) assert.throws(() => gate.readPassingCounters(report));
});

test("PCS compiler/test child receives the selected SDK, not application credentials or the parent's dotnet host", () => {
  assert.equal(typeof gate.dotnetEnvironment, "function");
  const parent = { PATH: "existing", SystemRoot: "C:/Windows", SUPABASE_SERVICE_ROLE_KEY: "not-for-tests", ORNOVA_AI_API_KEY: "not-for-tests", DOTNET_HOST_PATH: "wrong", NUGET_AUTH_TOKEN: "not-for-tests" };
  const result = gate.dotnetEnvironment(parent, "D:/temporary-sdk/dotnet.exe", "D:/temporary-test");
  assert.equal(result.DOTNET_HOST_PATH, "D:/temporary-sdk/dotnet.exe");
  assert.equal(result.SystemRoot, "C:/Windows");
  assert.equal(result.SUPABASE_SERVICE_ROLE_KEY, undefined);
  assert.equal(result.ORNOVA_AI_API_KEY, undefined);
  assert.equal(result.NUGET_AUTH_TOKEN, undefined);
  assert.equal(parent.DOTNET_HOST_PATH, "wrong");
  assert.equal(result.DOTNET_CLI_TELEMETRY_OPTOUT, "1");
});

test("PCS CLI refuses missing or unknown arguments instead of silently succeeding", () => {
  for (const args of [[], ["--unknown", "value"], ["--dotnet", "missing"]]) {
    const result = spawnSync(process.execPath, [fileURLToPath(script), ...args], { encoding: "utf8", timeout: 10000, windowsHide: true });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /usage|arguments/i);
  }
});
