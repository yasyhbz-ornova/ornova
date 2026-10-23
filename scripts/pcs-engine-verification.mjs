// Opt-in local C# verification. Never imports operational data or modifies PCS source.
import { createHash } from "node:crypto";
import { constants, copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import { delimiter, dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ENGINE_SHA256 = "48c17189fd76f18db89f290b1981e448d0faed7770ec4f7bdc870dab0220819a";
const projects = ["src/Ornova.PCS.Domain", "src/Ornova.PCS.Application", "src/Ornova.PCS.Infrastructure", "src/Ornova.PCS.Reporting", "tests/Ornova.PCS.Tests"];
const rootFiles = ["Directory.Build.props", "Directory.Packages.props", "global.json"];
const engineFile = "src/Ornova.PCS.Infrastructure/Quotes/StandardPricingEngine.cs";

function regularFile(path) {
  const stat = lstatSync(path);
  if (stat.isSymbolicLink() || !stat.isFile()) throw Error("PCS source marker must be a regular file");
}

function sourceFiles(root) {
  const files = [];
  for (const name of rootFiles) {
    regularFile(join(root, name));
    files.push(name);
  }
  function visit(directory) {
    for (const entry of readdirSync(join(root, directory), { withFileTypes: true })) {
      if (entry.name.startsWith(".") || ["bin", "obj"].includes(entry.name.toLowerCase())) continue;
      const path = join(directory, entry.name);
      if (entry.isSymbolicLink()) throw Error("PCS source links are not copied");
      if (entry.isDirectory()) visit(path);
      else if ([".cs", ".csproj"].includes(extname(entry.name).toLowerCase())) {
        regularFile(join(root, path));
        files.push(path);
      }
    }
  }
  for (const project of projects) {
    const stat = lstatSync(join(root, project));
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw Error("PCS project must be a source directory");
    regularFile(join(root, project, `${project.split("/").at(-1)}.csproj`));
    visit(project);
  }
  return files;
}

export function verifyPcsSource(root) {
  const canonical = realpathSync(root);
  sourceFiles(canonical); // Require all project/build markers before accepting provenance.
  regularFile(join(canonical, engineFile));
  const hash = createHash("sha256").update(readFileSync(join(canonical, engineFile))).digest("hex");
  if (hash !== ENGINE_SHA256) throw Error("PCS engine provenance hash differs; review source before changing the pin");
  return { root: canonical, engine_sha256: hash };
}

function contains(parent, child) {
  const path = relative(parent, child);
  return path === "" || (!isAbsolute(path) && path !== ".." && !path.startsWith(`..${sep}`));
}

export function copyPcsSources(source, target) {
  const root = realpathSync(source);
  const requested = resolve(target);
  // Resolve a linked parent too: a fresh-looking target cannot point back into the source.
  const destination = join(realpathSync(dirname(requested)), requested.slice(dirname(requested).length + 1));
  if (contains(root, destination) || contains(destination, root)) throw Error("PCS fixture must not overlap source");
  if (existsSync(destination)) throw Error("PCS fixture destination already exists; refusing overwrite");
  const files = sourceFiles(root);
  mkdirSync(destination);
  for (const file of files) {
    const output = join(destination, file);
    mkdirSync(dirname(output), { recursive: true });
    copyFileSync(join(root, file), output, constants.COPYFILE_EXCL);
  }
  return destination;
}

export function readPassingCounters(xml) {
  if (typeof xml !== "string" || xml.length > 16 * 1024 * 1024 || !/<TestRun\b/.test(xml)) throw Error("Invalid PCS test report");
  const summaries = [...xml.matchAll(/<ResultSummary\b[^>]*\boutcome="([^"]+)"/g)];
  const matches = [...xml.matchAll(/<Counters\b([^>]*)\/>/g)];
  if (summaries.length !== 1 || !["Completed", "Passed"].includes(summaries[0][1]) || matches.length !== 1) throw Error("Missing or ambiguous PCS result summary");
  const attributes = [...matches[0][1].matchAll(/([A-Za-z][A-Za-z0-9]*)="(\d+)"/g)];
  if (matches[0][1].replace(/([A-Za-z][A-Za-z0-9]*)="(\d+)"/g, "").trim()) throw Error("Invalid PCS test counters");
  const values = Object.fromEntries(attributes.map(([, key, value]) => [key, Number(value)]));
  if (attributes.length !== Object.keys(values).length || Object.values(values).some(value => !Number.isSafeInteger(value))) throw Error("Invalid PCS counter values");
  for (const required of ["total", "executed", "passed", "failed", "error", "timeout", "aborted", "notExecuted"]) if (!(required in values)) throw Error("Incomplete PCS test counters");
  if (values.total < 1 || values.total !== values.executed || values.total !== values.passed || Object.entries(values).some(([key, value]) => !["total", "executed", "passed"].includes(key) && value !== 0)) throw Error("PCS test run was not entirely passing");
  return { total: values.total, executed: values.executed, passed: values.passed };
}

export function dotnetEnvironment(parent, sdk, workspace) {
  const allowed = new Set(["systemroot", "windir", "comspec", "temp", "tmp", "userprofile", "localappdata", "appdata", "programfiles", "programfiles(x86)", "programdata", "systemdrive", "homedrive", "homepath", "os", "pathext", "number_of_processors", "processor_architecture", "lang", "lc_all"]);
  const environment = Object.fromEntries(Object.entries(parent).filter(([key]) => allowed.has(key.toLowerCase())));
  const previousPath = Object.entries(parent).find(([key]) => key.toLowerCase() === "path")?.[1] ?? "";
  return {
    ...environment,
    PATH: `${dirname(sdk)}${delimiter}${previousPath}`,
    DOTNET_ROOT: dirname(sdk),
    DOTNET_HOST_PATH: sdk,
    DOTNET_CLI_HOME: join(workspace, "cli-home"),
    DOTNET_CLI_TELEMETRY_OPTOUT: "1",
    DOTNET_NOLOGO: "1",
    DOTNET_GENERATE_ASPNET_CERTIFICATE: "false",
    DOTNET_CLI_WORKLOAD_UPDATE_NOTIFY_DISABLE: "1",
  };
}

function sourceFingerprint(root) {
  const hash = createHash("sha256");
  for (const name of sourceFiles(root).sort()) {
    hash.update(name.split(sep).join("/"));
    hash.update("\0");
    hash.update(createHash("sha256").update(readFileSync(join(root, name))).digest());
  }
  return hash.digest("hex");
}

const usage = "Usage: node scripts/pcs-engine-verification.mjs --dotnet ABSOLUTE_SDK_HOST --source PCS_ROOT --packages LOCAL_NUGET_CACHE";

function main(args) {
  if (args.length === 1 && args[0] === "--help") { console.log(usage); return; }
  const options = {};
  for (let n = 0; n < args.length; n += 2) {
    const key = args[n];
    if (!["--dotnet", "--source", "--packages"].includes(key) || key in options || !args[n + 1] || args[n + 1].startsWith("--")) throw Error(`Invalid arguments. ${usage}`);
    options[key] = args[n + 1];
  }
  if (Object.keys(options).length !== 3 || Object.values(options).some(path => !isAbsolute(path))) throw Error(`Explicit absolute arguments are required. ${usage}`);
  const source = verifyPcsSource(options["--source"]);
  const sdk = realpathSync(options["--dotnet"]), packages = realpathSync(options["--packages"]);
  regularFile(sdk);
  if (!lstatSync(packages).isDirectory()) throw Error("Local NuGet cache directory is required");
  const fingerprint = sourceFingerprint(source.root);
  const workspace = mkdtempSync(join(tmpdir(), "ornova-pcs-engine-"));
  const fixture = copyPcsSources(source.root, join(workspace, "source"));
  verifyPcsSource(fixture);
  if (sourceFingerprint(fixture) !== fingerprint) throw Error("PCS source changed while preparing its fixture");
  const environment = { ...dotnetEnvironment(process.env, sdk, workspace), NUGET_PACKAGES: packages };
  function dotnet(command) {
    const result = spawnSync(sdk, command, { cwd: fixture, env: environment, encoding: "utf8", windowsHide: true, shell: false, timeout: 180000, maxBuffer: 8 * 1024 * 1024 });
    if (result.status !== 0 || result.error) {
      throw Error(`PCS verification command failed (${command[0]}). Fixture retained: ${workspace}\n${result.error?.message ?? ""}\n${result.stdout ?? ""}\n${result.stderr ?? ""}`);
    }
    return result.stdout.trim();
  }
  const version = dotnet(["--version"]);
  if (!/^10\.0\.\d+$/.test(version)) throw Error(`PCS requires a .NET10 SDK; fixture retained: ${workspace}`);
  const project = "tests/Ornova.PCS.Tests/Ornova.PCS.Tests.csproj";
  const artifacts = join(workspace, "artifacts"), results = join(workspace, "results");
  console.log(`PCS isolated verification with SDK${version}; fixture: ${workspace}`);
  let counters;
  try {
    console.log(dotnet(["restore", project, "--source", packages, "--artifacts-path", artifacts, "-p:NuGetAudit=false", "--disable-parallel"]));
    console.log(dotnet(["test", project, "--no-restore", "--artifacts-path", artifacts, "--logger", "console;verbosity=minimal", "--logger", "trx;LogFileName=pcs.trx", "--results-directory", results]));
    counters = readPassingCounters(readFileSync(join(results, "pcs.trx"), "utf8"));
  } finally {
    if (sourceFingerprint(source.root) !== fingerprint) throw Error("Original PCS source fingerprint changed during verification; do not accept this run");
  }
  const evidence = { sdk_version: version, source_root: source.root, engine_sha256: source.engine_sha256, source_fingerprint: fingerprint, counters, report: join(results, "pcs.trx"), note: "Source-only offline baseline; not an OS sandbox, dependency security audit, quick-method parity or live website connection." };
  writeFileSync(join(workspace, "evidence.json"), `${JSON.stringify(evidence, null, 2)}\n`, { flag: "wx" });
  console.log(JSON.stringify(evidence, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error instanceof Error ? error.message : "PCS verification failed"); process.exitCode = 1; }
}
