# ORNOVA native pricing preview (private; off until configured)

This service is an isolated calculation preview, not an online accounting backend. It has no database, desktop initialization, catalog presets, invoice issuance or customer endpoints. No production configuration is enabled by this change.

## Reviewed behavior

- `cost-plus`: compiles the original PCS `StandardPricingEngine.cs`, `QuoteContracts.cs`, common result/error types and domain enums. Engine and contract SHA256 are checked by MSBuild. Source originals remain read-only; the verification runner builds from a fresh source-only copy.
- `gram-sale`: new pure C# extraction of working desktop quick pricing. The base uses milligram weight and integer rial/gram, then rounds to **whole toman, midpoint-to-even**. Light-piece thresholds remain `<2000mg`, `<4000mg`, otherwise0. All fee amounts are mandatory explicit inputs; no old template rates, contact details or preset prices are included.
- The gram method has no tax policy; its `tax_rial="0"` is NOT an assertion of tax exemption or an invoice tax decision. Its warning must not be suppressed in later UI.
- Neither method produces an accepted, stored or customer-safe quote. Policy version is an input label, not a server-approved pricing-policy registry. The response is a transient private calculation snapshot, not durable persistence.
- Money is exact, nonnegative integer-rial strings up to signed int64. Weight is a positive integer-milligram string; no implicit conversion of the UI's gram decimal occurs at this boundary. Overflow fails rather than clipping.
- Only staff may use the Next route. Result/inputs contain private costing and must not be forwarded to a customer, printed verbatim in an invoice or added to current quote-v1 JSON. Later publication must deliberately project reviewed customer lines and record the calculation revision separately.

## Repeatable local test (no global installation)

PowerShell, repository root; replace the explicit paths if the verified temporary SDK was moved:

```powershell
$env:ORNOVA_TEST_DOTNET='D:/Temp/ornova-dotnet10-https-20261031/sdk/dotnet.exe'
$env:ORNOVA_TEST_PCS_SOURCE='D:/ORNOVA_PCS_working_v1_3_3'
$env:ORNOVA_TEST_PACKAGES='C:/Users/Odyssey/.nuget/packages'
node --test tests/pricing-native.test.mjs
```

The script requires all three paths, copies source-only PCS files, restores offline using that package cache, builds in a fresh `ornova-native-pricing-*` temp directory, starts a literal127.0.0.1 service with a random test-only token and stops its own child in `finally`. Test reports include the retained directory. `evidence.json` is written only after the assertion callback succeeds; a native test group failure rejects that callback. No token is written to this file. Generated build artifacts are outside the repository. No automatic package download, PATH change, original-source overwrite or temp-directory deletion occurs. This is not an OS sandbox or a dependency security audit.

Ordinary `npm test` skips the opt-in native HTTP group when these variables are absent; a skipped group is not a native pass. Node contract/client/route tests still run normally. The68 pre-existing PCS tests remain a separate baseline gate in `scripts/pcs-engine-verification.mjs`.

## Manual local connection, later admin testing

The compiled DLL can run independently of PCS's desktop UI and operational database. It requires server-only `ORNOVA_PRICING_TOKEN` (32–256 ASCII letters/digits/underscore/hyphen, securely random) and `ORNOVA_PRICING_LISTEN_PORT`. It refuses missing configuration and binds only127.0.0.1. `ASPNETCORE_URLS` cannot broaden this explicit binding. An independently hosted same-machine TLS reverse proxy can forward to this loopback listener; the native host/bearer guard/formulas are unchanged.

For a Next server on the **same machine**, manually configure:

- `ORNOVA_PRICING_ENABLED=true`
- `ORNOVA_PRICING_URL=http://127.0.0.1:<chosen-port>/v1/preview`
- `ORNOVA_PRICING_TOKEN=<same-private-token>`

These values have NOT been inserted into `.env.local` or deployed. Never use `NEXT_PUBLIC_` for any of them. Default-off behavior returns a safe503 to authenticated staff when unconfigured. Without a transport setting (or with `ORNOVA_PRICING_TRANSPORT=loopback`) only literal127.0.0.1 HTTP with an explicit port is accepted. Do not configure Vercel to point at this PC's loopback: it cannot reach it.

## Explicit independently hosted HTTPS transport

The Next connector additionally accepts a deliberate operator-approved HTTPS origin. Server-only settings:

- `ORNOVA_PRICING_ENABLED=true`
- `ORNOVA_PRICING_TRANSPORT=https`
- `ORNOVA_PRICING_URL=https://<reviewed-service-host>/v1/preview`
- `ORNOVA_PRICING_ALLOWED_ORIGIN=https://<reviewed-service-host>` (same exact canonical origin, no trailing slash; include port if non-default)
- `ORNOVA_PRICING_TOKEN=<same-random-private-native-token>`

No real host/token has been configured. The origin must belong to the reviewed service; this pin is an operator assertion, not independent verification of domain ownership or a DNS-rebinding filter. Destinations cannot come from customer inputs. IP/localhost/private-suffix hosts, URL credentials/query/fragment, noncanonical URL/path, unknown transport and origin mismatch fail before sending a token. HTTPS certificate verification remains enabled; redirects fail, responses stay bounded64KiB/10seconds/no-store and strict request correlation is preserved. A host that resolves privately is not automatically classified by this name check; operator DNS/TLS/network/host review is still required before activation. Keys and private calculation inputs must never be logged or sent to an unreviewed proxy.

This prepares the connector for a separately hosted native process and TLS reverse proxy. It does not provision hosting, TLS certificates, lifecycle/health monitoring, confirmed source/rates, production configuration or billing/acceptance. Those remain activation requirements; no pricing or customer publication switch is enabled automatically.

## Opt-in real TLS/native verification

`tests/pricing-https-native.test.mjs` additionally needs explicit `ORNOVA_TEST_POWERSHELL` pointing to PowerShell7. With all4native paths it creates a private one-day certificate and local TLS reverse proxy in a fresh temporary directory, then uses actual Node fetch to the unchanged native C# service. DNS mapping and extra CA trust are confined to fresh fixture children; no OS hosts/DNS/trust or TLS-verification disable. It checks both methods/large integers, auth rejection, redirect refusal, oversized/swapped/private-error responses and certificate hostname/untrusted-CA rejection before HTTP. Final HTTPS evidence is written only after its proxy/native endpoints are closed. Fixture certificate/key are synthetic and retained only in that temporary test directory, never repository secrets or operational certs.

Verified2026-11-02: HTTPS native group1/1 (8scenarios) passed, evidence `D:\Temp\ornova-pricing-https-vmdSwu\evidence.json`; existing loopback native group7/7 passed at `D:\Temp\ornova-native-pricing-kGRpbR`. Default full Node266total/264pass/0fail/2opt-in skips is separate from those explicit native runs. No real host/domain/token or source/rates configured.

The old SDK cache was found missing its hostfxr/MSBuild/runtime DLLs on current inspection; its earlier success is historical. Current verified replacement is SDK10.0.402/runtime10.0.13 at the command above, freshly extracted from the official ZIP after matching Microsoft's live metadata SHA512 `ae4fd528cb7e9f6af6aaf7de36715a69f761f183744f1bb3025d19f5a92447090ec561410e46266c1d10a63781ed6f3de771760bc76c876d87daabc367b898cd`. Reuse this cache after checking files; no global installation/PATH/old-cache overwrite was made.

## Next slice

Build the Persian staff calculator UI around this contract: deliberate method selection, labelled units, explicit synthetic/not-yet-configured state, preserved warning/error states, and invalidation of a result when any input changes. Configure approved rates and durable revision storage in later separately verified slices before customer quotation/invoicing.
