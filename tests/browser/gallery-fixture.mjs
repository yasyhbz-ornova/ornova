const user = {
  id: "fc3d7435-9816-4354-b8f1-09fe4cb10046",
  email: "gallery-test@example.invalid",
  role: "authenticated",
  aud: "authenticated",
  app_metadata: {},
  user_metadata: {},
};
const expires = 2_208_988_800;
const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");

export const galleryQA = {
  app: "http://localhost:3108",
  backend: "http://127.0.0.1:54382",
  user,
  session: {
    access_token: `${encode({ typ: "JWT", alg: "HS256" })}.${encode({ exp: expires, sub: user.id })}.dGVzdA`,
    refresh_token: "local-gallery-fixture",
    token_type: "bearer",
    expires_at: expires,
    expires_in: 3600,
    user,
  },
};

export function galleryTestCookie() {
  return { name: "sb-127-auth-token", value: `base64-${encode(galleryQA.session)}`, url: galleryQA.app };
}

const firstOrderId = "acff0d42-4bed-42cf-9b89-f22741abdcdf";

export const galleryOrderHistory = {
  inquiries: [
    { id: firstOrderId, status: "quoted", created_at: "2026-11-25T10:00:00Z", message: "درخواست ساخت انگشتر با اندازهٔ ۵۴." },
    { id: "388e424d-42bc-4cca-8135-577d2344aa15", status: "reviewing", created_at: "2026-11-23T09:00:00Z", message: "آویز نقره با طرح اختصاصی\nبرای یک هدیه." },
    { id: "cb2a903b-c5cd-4abb-ad81-481c8a099705", status: "closed", created_at: "2026-11-19T08:00:00Z", message: "درخواست سفارش اثر آرشیو «سنجاق‌سینهٔ نواری مشبک» (عکس 07)" },
  ],
  items: [{ inquiry_id: firstOrderId, product_name: "انگشتر نقره «لاجورد شب»", quantity: 1 }],
  files: [],
  quotes: [{
    id: "f6d3132a-d9df-4396-86d9-8a8a67e21fd2", document_id: "b9678db4-8523-44ab-a805-f4c5a55dbd75", inquiry_id: firstOrderId,
    source_quote_no: "Q-DEMO-12", source_order_no: "O-DEMO-12", source_revision: 1,
    published_at: "2026-11-25T11:00:00Z", accepted_at: null, withdrawn_at: null,
    payload: { issued_at: "2026-11-25T11:00:00Z", valid_until: "2026-12-05T11:00:00Z", lines: [{ description: "انگشتر نقره «لاجورد شب»", quantity: 1, amount_rial: "34000000" }], discount_rial: "0", tax_rial: "0", total_rial: "34000000" },
  }],
  detailsError: false, quoteError: false, quoteReadAt: "2026-11-25T12:00:00Z",
};
