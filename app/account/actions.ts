"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { normalizeIranianPhone } from "@/lib/auth/inputs";
import { parseDesignNote } from "@/lib/account/profile-preferences";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ProfileActionState = {
  status: "idle" | "success" | "error";
  message: string;
  profile?: {
    display_name: string | null;
    phone: string | null;
    design_note: string | null;
    province: string | null;
    city: string | null;
    postal_code: string | null;
    address_line: string | null;
  };
};

export async function signOutCurrentSession() {
  let failed = false;
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) failed = true;
    else revalidatePath("/", "layout");
  } catch {
    failed = true;
  }
  if (failed) redirect("/?galleryPanel=account&signout=failed");
  redirect("/?galleryPanel=account");
}

const profileSchema = z.object({
  displayName: z.string().trim().max(80, "نام نباید بیشتر از ۸۰ نویسه باشد."),
  phone: z.string().trim().max(32),
  province: z.string().trim().max(80), city: z.string().trim().max(80),
  postalCode: z.string().trim().max(20), addressLine: z.string().trim().max(500),
});

export async function saveProfile(
  _previousState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName"),
    phone: formData.get("phone"),
    province: formData.get("province"), city: formData.get("city"),
    postalCode: formData.get("postalCode"), addressLine: formData.get("addressLine"),
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "اطلاعات را بررسی کنید." };
  }

  const designNote = parseDesignNote(formData.get("designNote"));
  if (!designNote.success) return { status: "error", message: designNote.message };

  const phone = parsed.data.phone ? normalizeIranianPhone(parsed.data.phone) : "";
  if (phone && !/^\+[1-9]\d{7,14}$/.test(phone)) {
    return { status: "error", message: "شماره تماس را با پیش‌شماره کشور وارد کنید؛ برای ایران از ۰۹ یا ۹۸ استفاده کنید." };
  }
  if (formData.get("requireAddress") === "true" && (!parsed.data.displayName || !phone || !parsed.data.province || !parsed.data.city || !parsed.data.addressLine)) {
    return { status: "error", message: "نام، شمارهٔ تماس، استان، شهر و نشانی کامل را برای ادامهٔ درخواست وارد کنید." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { status: "error", message: "برای ذخیره‌ی اطلاعات، ابتدا وارد حساب شوید." };

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      display_name: parsed.data.displayName || null,
      phone: phone || null,
      design_note: designNote.value,
      province: parsed.data.province || null,
      city: parsed.data.city || null,
      postal_code: parsed.data.postalCode || null,
      address_line: parsed.data.addressLine || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });

    if (error) return { status: "error", message: "ذخیره‌ی اطلاعات انجام نشد. کمی بعد دوباره تلاش کنید." };
    revalidatePath("/account");
    return {
      status: "success",
      message: "اطلاعات تماس شما ذخیره شد.",
      profile: {
        display_name: parsed.data.displayName || null,
        phone: phone || null,
        design_note: designNote.value,
        province: parsed.data.province || null,
        city: parsed.data.city || null,
        postal_code: parsed.data.postalCode || null,
        address_line: parsed.data.addressLine || null,
      },
    };
  } catch {
    return { status: "error", message: "ارتباط با فضای حساب برقرار نشد. اطلاعات تغییری نکرده است." };
  }
}
