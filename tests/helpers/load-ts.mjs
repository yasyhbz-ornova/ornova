import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { posix } from "node:path";
const require = createRequire(import.meta.url), ts = require("typescript");
export function loadTs(path, dependencies = {}) {
  const file = new URL(`../../${path}`, import.meta.url), loaded = { exports: {} };
  if (!existsSync(file)) return loaded.exports;
  const resolve = (name) => Object.hasOwn(dependencies, name) ? dependencies[name] : name.startsWith("@/") ? loadTs(name.slice(2) + ".ts", dependencies) : name.startsWith(".") ? loadTs(posix.join(posix.dirname(path), name) + ".ts", dependencies) : require(name);
  new Function("require", "exports", ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText)(resolve, loaded.exports);
  return loaded.exports;
}
