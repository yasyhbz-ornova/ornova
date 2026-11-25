import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { galleryQA, galleryStaffCatalog, galleryStaffSession } from "../tests/browser/gallery-fixture.mjs";

const command = process.argv[2] ?? "start";
if (command !== "build" && command !== "start") throw new Error("Expected build or start");

// The test process is isolated from the configured Supabase project and accepts reads only.
const fixture = createServer((request, response) => {
  const { pathname, searchParams } = new URL(request.url, galleryQA.backend);
  const authorized = request.headers.authorization === `Bearer ${galleryQA.session.access_token}`;
  const staffAuthorized = request.headers.authorization === `Bearer ${galleryStaffSession.access_token}`;
  response.setHeader("Access-Control-Allow-Origin", galleryQA.app);
  response.setHeader("Access-Control-Allow-Headers", request.headers["access-control-request-headers"] ?? "authorization,apikey,content-type");
  response.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS");
  function send(status, body) {
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(body === undefined ? undefined : JSON.stringify(body));
  }

  if (request.method === "OPTIONS") return send(204);
  if (request.method !== "GET" && request.method !== "HEAD") return send(405);
  if (pathname === "/auth/v1/user") {
    if (staffAuthorized) return send(200, galleryStaffSession.user);
    return authorized ? send(200, galleryQA.user) : send(401);
  }
  if (pathname === "/rest/v1/catalog_products" && staffAuthorized && searchParams.get("select") === "*") return send(200, galleryStaffCatalog);
  if (pathname === "/rest/v1/catalog_products") return send(404, { code: "PGRST205", message: "Use the bundled catalog" });
  if (!authorized) return send(401);
  if (pathname === "/rest/v1/profiles") {
    const profile = {
      display_name: "بازدیدکنندهٔ آزمایشی", phone: "+989120000000", province: "تهران", city: "تهران",
      postal_code: null, address_line: "نشانی آزمایشی", design_note: null,
    };
    return send(200, searchParams.get("id") === `eq.${galleryQA.user.id}` ? [profile] : []);
  }
  if (pathname === "/rest/v1/inquiries") return send(200, []);
  return send(404);
});

const address = new URL(galleryQA.backend);
fixture.listen(Number(address.port), address.hostname, () => {
  const flags = command === "start" ? ["--hostname", "127.0.0.1", "--port", "3108"] : [];
  const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", command, ...flags], {
    stdio: "inherit",
    env: {
      ...process.env,
      ORNOVA_PREVIEW: "1",
      NEXT_PUBLIC_SUPABASE_URL: galleryQA.backend,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "gallery-qa-public-fixture",
      NEXT_PUBLIC_AUTH_GOOGLE_ENABLED: "false",
      SUPABASE_SERVICE_ROLE_KEY: "",
    },
  });
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => { fixture.close(); next.kill(); });
  next.on("error", (error) => { console.error(error); fixture.close(); process.exitCode = 1; });
  next.on("exit", (code) => { fixture.close(); process.exitCode = code ?? 1; });
});
