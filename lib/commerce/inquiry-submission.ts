import type { RequestItem } from "./request-basket";
import { createInquiryReceipt, type InquiryReceipt } from "./inquiry-receipt";

type SubmissionOutcome =
  | { kind: "confirmed"; receipt: InquiryReceipt }
  | { kind: "rejected"; message: string }
  | { kind: "uncertain" };

export function classifyInquirySubmission(status: number | null, body: unknown, items: RequestItem[]): SubmissionOutcome {
  if (status === 200 || status === 201) {
    const receipt = createInquiryReceipt(body, items);
    if (receipt) return { kind: "confirmed", receipt };
  }
  if (status === 401) return { kind: "rejected", message: "برای ثبت درخواست، وارد حساب شوید." };
  if (status === 400) return { kind: "rejected", message: "اطلاعات یا انتخاب‌های درخواست معتبر نیست؛ آن‌ها را مرور کنید." };
  if (status === 403) return { kind: "rejected", message: "اجازهٔ ثبت این درخواست تأیید نشد؛ صفحه و ورود به حساب را بررسی کنید." };
  return { kind: "uncertain" };
}

export function hasUncertainInquiryDraft(value: unknown): boolean {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && "submissionUncertain" in value && value.submissionUncertain === true);
}

export function canClearSubmittedRing(snapshot: string | null, current: string | null, included: boolean): boolean {
  return included && snapshot !== null && snapshot === current;
}

export function canReplacePendingUpload(stored: string | null, target: string): boolean {
  return stored === null || stored === target;
}
