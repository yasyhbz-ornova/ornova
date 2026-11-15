const statusLabels: Record<string, string> = {
  received: "دریافت درخواست",
  reviewing: "در حال بررسی",
  needs_info: "نیاز به اطلاعات بیشتر",
  quoted: "پیشنهاد قیمت",
  approved: "تأیید درخواست",
  closed: "پرونده بسته شد",
};

const statusGuidance: Record<string, string> = {
  needs_info: "پیام‌های پرونده را ببینید؛ پاسخ را همان‌جا بفرستید.",
  quoted: "مبلغ و شرایط پیشنهاد در این صفحه نمایش داده نمی‌شود. اگر در پیام‌های پرونده ثبت نشده، پیش از تصمیم از Ornova بخواهید جزئیات را همان‌جا بنویسد.",
  approved: "جزئیات مورد تأیید را در پیام‌های پرونده مرور کنید؛ اگر روشن نیست، پیش از ادامه با Ornova هماهنگ کنید.",
  closed: "برای پیگیری تازه، می‌توانید درخواست جدیدی ثبت کنید.",
};

export function getInquiryStatusLabel(status: string): string {
  return statusLabels[status] ?? "وضعیت ثبت‌شده";
}

export function getInquiryStatusGuidance(status: string): string | null {
  return statusGuidance[status] ?? null;
}
