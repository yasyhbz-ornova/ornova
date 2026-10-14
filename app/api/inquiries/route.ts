import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProductBySlug } from "@/lib/constants/products";

const inquirySchema = z.object({
  message: z.string().trim().min(1).max(5000),
  contact: z.string().trim().min(1).max(320),
  items: z.array(z.object({
    product_slug: z.string().trim().min(1).max(120),
    quantity: z.number().int().min(1).max(20),
  })).max(50).default([]),
});

export async function POST(request: Request) {
  try {
    const body = inquirySchema.parse(await request.json());
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "برای ثبت درخواست باید وارد حساب شوید." }, { status: 401 });
    }

    const items = body.items.map((item) => {
      const product = getProductBySlug(item.product_slug);
      return product ? { product_slug: product.slug, product_name: product.name, quantity: item.quantity } : null;
    });
    if (items.some((item) => item === null)) {
      return NextResponse.json({ error: "یکی از قطعات درخواست معتبر نیست." }, { status: 400 });
    }

    const { data: inquiry, error: inquiryError } = await supabase
      .from("inquiries")
      .insert({ user_id: user.id, message: body.message, contact: body.contact })
      .select("id")
      .single();

    if (inquiryError || !inquiry) {
      return NextResponse.json({ error: "ثبت درخواست انجام نشد." }, { status: 500 });
    }

    if (body.items.length > 0) {
      const { error: itemsError } = await supabase.from("inquiry_items").insert(items.filter((item): item is NonNullable<typeof item> => item !== null).map((item) => ({ ...item, inquiry_id: inquiry.id })));
      if (itemsError) {
        return NextResponse.json({ error: "قطعات درخواست ثبت نشدند." }, { status: 500 });
      }
    }

    return NextResponse.json({ id: inquiry.id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "اطلاعات درخواست کامل یا معتبر نیست." }, { status: 400 });
    }
    return NextResponse.json({ error: "سرویس درخواست فعلاً در دسترس نیست." }, { status: 503 });
  }
}
