import { buildStudioBrief } from "./conversation";

// Existing InquiryForm tab-draft contract; never write the persistent legacy key.
const inquiryDraftKey = "ornova-inquiry-draft";
type TabDraftStorage = Pick<Storage, "getItem" | "setItem">;
type LegacyStorage = Pick<Storage, "getItem">;

export function transferStudioInquiry(answers: string[], session: TabDraftStorage, persistent: LegacyStorage): { success: true } | { success: false; error: string } {
  const brief = buildStudioBrief(answers);
  if (!brief) return { success: false, error: "ابتدا پاسخ‌ها را کامل و خلاصهٔ ایده را بررسی کن." };
  try {
    if (session.getItem(inquiryDraftKey) !== null || persistent.getItem(inquiryDraftKey) !== null) {
      return { success: false, error: "پیش‌نویس درخواست دیگری در این مرورگر هست. ابتدا آن را در فرم درخواست بررسی کن؛ ایدهٔ تازه جایگزینش نشده است." };
    }
    session.setItem(inquiryDraftKey, JSON.stringify({ message: brief, sourceContext: "custom-design" }));
    return { success: true };
  } catch {
    return { success: false, error: "انتقال ایده در این مرورگر انجام نشد. خلاصه را کپی کن و در فرم درخواست قرار بده." };
  }
}
