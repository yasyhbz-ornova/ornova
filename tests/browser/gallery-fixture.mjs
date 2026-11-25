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

const staffUser = { ...user, id: "931ffb97-b062-4d9c-a8df-08ddbc9e47e0", email: "gallery-staff@example.invalid", app_metadata: { ornova_role: "staff" } };

export const galleryStaffSession = {
  ...galleryQA.session,
  access_token: `${encode({ typ: "JWT", alg: "HS256" })}.${encode({ exp: expires, sub: staffUser.id })}.c3RhZmY`,
  user: staffUser,
};

export function galleryStaffCookie() {
  return { ...galleryTestCookie(), value: `base64-${encode(galleryStaffSession)}` };
}

export const galleryStaffCatalog = [{
  slug: "lajvard-shab-ring", revision: 1, name: "انگشتر نقره «لاجورد شب»", category_id: "rings", category_label: "انگشتر", subtype_id: null,
  description: "نمونهٔ آزمایشی برای پیش‌نمایش کاتالوگ.", status: "published", image_fit: "contain", gallery_placement_verified: true,
  image_path: "/images/ornova/lajvard-shab-01.jpg", stand_image_path: "/images/ornova/gallery/products/lajvard-shab-stand-cutout-preview-v1.webp",
  gallery: [{ src: "/images/ornova/lajvard-shab-01.jpg", alt: "انگشتر لاجورد شب" }], packaging_gallery: [], turntable_video_path: null, room_placement: null,
  details: [
    { label: "جنس", value: "نقره" }, { label: "سنگ", value: "جزئیات پس از بررسی درخواست اعلام می‌شود" },
    { label: "رنگ سنگ", value: "آبی شبانه" }, { label: "وزن تقریبی", value: "پس از طراحی مشخص می‌شود" },
    { label: "ابعاد تقریبی", value: "پس از بررسی اعلام می‌شود" },
  ],
}];

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
