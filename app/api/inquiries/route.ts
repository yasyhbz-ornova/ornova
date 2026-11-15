import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProductBySlug } from "@/lib/constants/products";
import { isSameOriginRequest } from "@/lib/auth/authorization";
import { parseProductPreferences, productConfigurationKey } from "@/lib/commerce/product-preferences";

const inquirySchema = z.object({
  customer_name: z.string().trim().min(1).max(80),
  message: z.string().trim().min(1).max(5000),
  contact: z.string().trim().min(1).max(320),
  items: z.array(z.object({
    product_slug: z.string().trim().min(1).max(120),
    quantity: z.number().int().min(1).max(20),
    preferences: z.unknown().optional(),
  })).max(50).default([]),
});

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 403 });
  }

  try {
    const body = inquirySchema.parse(await request.json());
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) return NextResponse.json({ error: "حساب کاربری فعلاً تأیید نشد." }, { status: 503 });
    if (!user) {
      return NextResponse.json({ error: "برای ثبت درخواست باید وارد حساب شوید." }, { status: 401 });
    }

    const slugs = [...new Set(body.items.map((item) => item.product_slug))];
    const catalog = slugs.length
      ? await supabase.from("catalog_products").select("slug,category_id").in("slug", slugs).eq("status", "published")
      : { data: [], error: null };
    if (catalog.error && !["42P01", "PGRST205"].includes(catalog.error.code ?? "")) {
      return NextResponse.json({ error: "کاتالوگ فعلاً در دسترس نیست." }, { status: 503 });
    }
    const categories = new Map((catalog.data ?? []).map((product) => [product.slug, product.category_id]));
    const items = body.items.map((item) => {
      const category = catalog.error ? getProductBySlug(item.product_slug)?.categoryId : categories.get(item.product_slug);
      if (!category) return null;
      const preferences = parseProductPreferences(item.preferences, category === "rings");
      return preferences.success ? { product_slug: item.product_slug, quantity: item.quantity, ...(preferences.value ? { preferences: preferences.value } : {}) } : null;
    });
    if (items.some((item) => item === null) || new Set(items.map((item) => item && productConfigurationKey(item.product_slug, item.preferences))).size !== body.items.length) {
      return NextResponse.json({ error: "یکی از قطعات یا مشخصات درخواست معتبر نیست؛ قطعات تکراری را هم بررسی کنید." }, { status: 400 });
    }

    // Never send configured items to the legacy RPC: it would silently drop preferences.
    const multipleConfigurations = new Set(body.items.map((item) => item.product_slug)).size < body.items.length;
    const rpcName = multipleConfigurations ? "create_inquiry_with_configurations" : items.some((item) => item?.preferences) ? "create_inquiry_with_preferences" : "create_inquiry_with_items";
    const { data: inquiryId, error: inquiryError } = await supabase.rpc(rpcName, {
      p_customer_name: body.customer_name,
      p_message: body.message,
      p_contact: body.contact,
      p_items: items.filter((item): item is NonNullable<typeof item> => item !== null),
    });

    if (inquiryError || !inquiryId) {
      return NextResponse.json({ error: "نتیجهٔ ثبت درخواست تأیید نشد؛ پیش از ارسال دوباره، پرونده‌های حساب را بررسی کنید." }, { status: 503 });
    }

    return NextResponse.json({ id: inquiryId }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "اطلاعات درخواست کامل یا معتبر نیست." }, { status: 400 });
    }
    return NextResponse.json({ error: "نتیجهٔ ثبت درخواست تأیید نشد؛ پیش از ارسال دوباره، پرونده‌های حساب را بررسی کنید." }, { status: 503 });
  }
}
