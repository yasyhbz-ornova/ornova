using System.Globalization;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Ornova.PCS.Application.Quotes;
using Ornova.PCS.Domain.Enums;
using Ornova.PCS.Infrastructure.Quotes;

// Local-only preview host. No desktop startup, DB, catalog presets or customer files.
var token = Environment.GetEnvironmentVariable("ORNOVA_PRICING_TOKEN") ?? "";
var portText = Environment.GetEnvironmentVariable("ORNOVA_PRICING_LISTEN_PORT") ?? "";
if (!Regex.IsMatch(token, @"\A[a-zA-Z0-9_-]{32,256}\z") || !int.TryParse(portText, out var port) || port is < 1 or > 65535)
    throw new InvalidOperationException("Explicit local pricing token and port required.");
var expectedAuth = SHA256.HashData(Encoding.UTF8.GetBytes("Bearer " + token));
var builder = WebApplication.CreateBuilder(new WebApplicationOptions { Args = [] });
builder.Logging.ClearProviders();
builder.WebHost.UseUrls($"http://127.0.0.1:{port}");
builder.WebHost.ConfigureKestrel(server => server.Limits.MaxRequestBodySize = 65536);
var app = builder.Build();
app.MapPost("/v1/preview", async (HttpContext context) =>
{
    context.Response.Headers.CacheControl = "no-store";
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    if (context.Connection.RemoteIpAddress is not { } address || !IPAddress.IsLoopback(address) ||
        !CryptographicOperations.FixedTimeEquals(expectedAuth, SHA256.HashData(Encoding.UTF8.GetBytes(context.Request.Headers.Authorization.ToString()))))
        return Results.Json(new { code = "UNAUTHORIZED" }, statusCode: 401);
    try
    {
        if (!context.Request.HasJsonContentType()) throw new InvalidInput();
        using var deadline = CancellationTokenSource.CreateLinkedTokenSource(context.RequestAborted);
        deadline.CancelAfter(TimeSpan.FromSeconds(10));
        using var body = new MemoryStream();
        var buffer = new byte[4096];
        int read;
        while ((read = await context.Request.Body.ReadAsync(buffer, deadline.Token)) > 0)
        {
            if (body.Length + read > 65536) return Results.Json(new { code = "BODY_LIMIT" }, statusCode: 413);
            body.Write(buffer, 0, read);
        }
        using var document = JsonDocument.Parse(body.ToArray(), new JsonDocumentOptions { MaxDepth = 8 });
        var request = document.RootElement;
        Boundary.Keys(request, "schema_version", "request_id", "method", "policy_version", "input");
        if (Boundary.Integer(request, "schema_version", 1, 1) != 1) throw new InvalidInput();
        if (!Guid.TryParseExact(Boundary.Text(request, "request_id"), "D", out _)) throw new InvalidInput();
        if (!Regex.IsMatch(Boundary.Text(request, "policy_version"), @"\A[a-zA-Z0-9_.-]{1,80}\z")) throw new InvalidInput();
        var method = Boundary.Text(request, "method");
        var input = request.GetProperty("input");
        object result = method switch
        {
            "cost-plus" => CalculateCost(input),
            "gram-sale" => CalculateGram(input),
            _ => throw new InvalidInput()
        };
        return Results.Json(new
        {
            schema_version = 1, request_id = Boundary.Text(request, "request_id"), method,
            policy_version = Boundary.Text(request, "policy_version"), input = input.Clone(),
            algorithm_version = method == "cost-plus" ? "pcs-standard-48c17189-v1" : "pcs-gram-explicit-fees-v1",
            result
        });
    }
    catch (InvalidInput) { return Results.Json(new { code = "INVALID_INPUT" }, statusCode: 400); }
    catch (JsonException) { return Results.Json(new { code = "INVALID_INPUT" }, statusCode: 400); }
    catch (BadHttpRequestException error) when (error.StatusCode == 413) { return Results.Json(new { code = "BODY_LIMIT" }, statusCode: 413); }
    catch (PricingFailure error) { return Results.Json(new { code = error.Code }, statusCode: 422); }
    catch (OverflowException) { return Results.Json(new { code = "NUMERIC_RANGE" }, statusCode: 422); }
    catch (OperationCanceledException) { return Results.Json(new { code = "UNAVAILABLE" }, statusCode: 503); }
});
await app.RunAsync();

static object CalculateCost(JsonElement input)
{
    Boundary.Keys(input, "true_cost_rial", "mandatory_buffer_rial", "profit_method", "profit_bp", "rounding", "rounding_step_rial", "tax_bp", "override_pre_tax_rial", "override_reason");
    var profit = Boundary.Text(input, "profit_method") switch { "margin" => ProfitMethod.Margin, "markup" => ProfitMethod.Markup, _ => throw new InvalidInput() };
    var profitBp = Boundary.Integer(input, "profit_bp", 0, 2147473647); // No native int overflow in 10000 + bp.
    if (profit == ProfitMethod.Margin && profitBp >= 10000) throw new InvalidInput();
    var rounding = Boundary.Text(input, "rounding") switch { "none" => RoundingMode.None, "nearest" => RoundingMode.Nearest, "up" => RoundingMode.Up, "down" => RoundingMode.Down, _ => throw new InvalidInput() };
    var step = Boundary.Money(input, "rounding_step_rial");
    if (rounding != RoundingMode.None && step == 0) throw new InvalidInput();
    var reasonElement = input.GetProperty("override_reason");
    string? reason = null;
    if (reasonElement.ValueKind != JsonValueKind.Null)
    {
        reason = Boundary.Text(input, "override_reason");
        if (string.IsNullOrWhiteSpace(reason) || reason.Length > 500) throw new InvalidInput();
    }
    long? priceOverride = input.GetProperty("override_pre_tax_rial").ValueKind == JsonValueKind.Null ? null : Boundary.Money(input, "override_pre_tax_rial", true);
    var calculation = new StandardPricingEngine().Calculate(new PricingInput(
        Boundary.Money(input, "true_cost_rial", true), Boundary.Money(input, "mandatory_buffer_rial"),
        profit, profitBp, rounding, step, Boundary.Integer(input, "tax_bp", 0, 10000), priceOverride, reason));
    if (calculation.IsFailure) throw new PricingFailure(calculation.Error.Code == "BELOW_FLOOR" ? "BELOW_FLOOR" : calculation.Error.Code == "VAL_REQUIRED" ? "REASON_REQUIRED" : "CALCULATION_REJECTED");
    var value = calculation.Value;
    return new
    {
        cost_floor_rial = Boundary.Rial(value.CostFloorRial), target_rial = Boundary.Rial(value.TargetPricePreTaxRial),
        pre_tax_rial = Boundary.Rial(value.FinalPricePreTaxRial), tax_rial = Boundary.Rial(value.TaxRial), total_rial = Boundary.Rial(value.FinalPriceRial),
        effective_margin_bp = value.EffectiveMarginBasisPoints, warnings = value.Warnings
    };
}

static object CalculateGram(JsonElement input)
{
    Boundary.Keys(input, "weight_mg", "rate_per_gram_rial", "under_2g_fee_rial", "under_4g_fee_rial", "stone_total_rial", "stone_count", "setting_per_stone_rial", "packaging_rial", "logistics_rial", "design_rial");
    var weight = Boundary.Money(input, "weight_mg", true);
    var rate = Boundary.Money(input, "rate_per_gram_rial", true);
    // Desktop quick method rounds BASE to whole toman with .NET's default ToEven.
    // Fee amounts are explicit, never silently imported from static legacy presets.
    var baseRial = checked(decimal.ToInt64(decimal.Round((weight / 1000m) * (rate / 10m), 0, MidpointRounding.ToEven)) * 10);
    var under2 = Boundary.Money(input, "under_2g_fee_rial");
    var under4 = Boundary.Money(input, "under_4g_fee_rial");
    var light = weight < 2000 ? under2 : weight < 4000 ? under4 : 0;
    var stone = Boundary.Money(input, "stone_total_rial");
    var setting = checked(Boundary.Integer(input, "stone_count", 0, int.MaxValue) * Boundary.Money(input, "setting_per_stone_rial"));
    var total = checked(baseRial + light + stone + setting + Boundary.Money(input, "packaging_rial") + Boundary.Money(input, "logistics_rial") + Boundary.Money(input, "design_rial"));
    return new { base_rial = Boundary.Rial(baseRial), light_piece_rial = Boundary.Rial(light), setting_rial = Boundary.Rial(setting), pre_tax_rial = Boundary.Rial(total), tax_rial = "0", total_rial = Boundary.Rial(total), warnings = new[] { "GRAM_SALE_HAS_NO_TAX_POLICY" } };
}

sealed class InvalidInput : Exception;
sealed class PricingFailure(string code) : Exception { public string Code { get; } = code; }
static class Boundary
{
    public static void Keys(JsonElement value, params string[] names)
    {
        if (value.ValueKind != JsonValueKind.Object) throw new InvalidInput();
        var keys = value.EnumerateObject().Select(property => property.Name).ToArray();
        if (keys.Length != names.Length || keys.Distinct(StringComparer.Ordinal).Count() != keys.Length || names.Any(name => !keys.Contains(name, StringComparer.Ordinal))) throw new InvalidInput();
    }
    public static string Text(JsonElement value, string name)
    {
        var element = value.GetProperty(name);
        return element.ValueKind == JsonValueKind.String ? element.GetString()! : throw new InvalidInput();
    }
    public static long Money(JsonElement value, string name, bool positive = false)
    {
        var text = Text(value, name);
        if (!Regex.IsMatch(text, @"\A(0|[1-9][0-9]{0,18})\z") || !long.TryParse(text, NumberStyles.None, CultureInfo.InvariantCulture, out var number) || (positive && number == 0)) throw new InvalidInput();
        return number;
    }
    public static int Integer(JsonElement value, string name, int min, int max)
    {
        var element = value.GetProperty(name);
        if (element.ValueKind != JsonValueKind.Number || !element.TryGetInt32(out var number) || number < min || number > max) throw new InvalidInput();
        return number;
    }
    public static string Rial(long value) => value.ToString(CultureInfo.InvariantCulture);
}
