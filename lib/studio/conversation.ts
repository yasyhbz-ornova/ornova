export const STUDIO_QUESTIONS = [
  { label: "نوع قطعه", question: "دوست داری چه قطعه‌ای طراحی کنیم؟", choices: ["انگشتر", "گوشواره", "آویز", "دستبند", "بروچ", "چارم", "اکسسوری مو"] },
  { label: "ایده و فرم", question: "چه فرمی در ذهن داری؟ چند کلمه یا یک توضیح کوتاه کافی است.", choices: [] },
  { label: "جنس و سنگ دلخواه", question: "برای جنس، سنگ یا رنگ چه ترجیحی داری؟ اگر هنوز نمی‌دانی، همین را بنویس.", choices: ["نقره، بدون سنگ", "نقره و سنگ آبی", "هنوز مطمئن نیستم"] },
  { label: "اندازه و جزئیات", question: "اندازه یا جزئیات مهم دیگری هست؟ برای انگشتر، سایز اروپایی را بنویس؛ ندانستن اندازه هم مانعی ندارد.", choices: ["اندازه را بعداً مشخص می‌کنم"] },
] as const;
export const isStudioId = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export type StudioDraft = { version: 1; id: string; ownerId: string | null; expiresAt: number; answers: string[]; input: string };

function validAnswers(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= 4 && value.every((answer) => typeof answer === "string" && answer.trim().length > 0 && answer.length <= 450);
}

export function buildStudioBrief(answers: string[]): string | null {
  if (!validAnswers(answers) || answers.length !== 4) return null;
  const brief = answers.map((answer, index) => `${STUDIO_QUESTIONS[index].label}: ${answer.trim()}`).join("\n");
  return brief.length <= 1500 ? brief : null;
}

export function parseStudioDraft(raw: string | null, id: string, userId: string | null, now = Date.now()): StudioDraft | null {
  if (!raw || raw.length > 12000 || !isStudioId(id)) return null;
  try {
    const d = JSON.parse(raw);
    if (!d || d.version !== 1 || d.id !== id || !validAnswers(d.answers)
      || typeof d.input !== "string" || d.input.length > 450
      || !Number.isFinite(d.expiresAt) || d.expiresAt <= now || d.expiresAt > now + 24 * 60 * 60 * 1000
      || !(d.ownerId === null || (typeof d.ownerId === "string" && d.ownerId === userId))) return null;
    return { version: 1, id, ownerId: d.ownerId, expiresAt: d.expiresAt, answers: d.answers, input: d.input };
  } catch { return null; }
}

export function studioLoginPath(id: string) {
  if (!isStudioId(id)) throw new Error("Invalid studio continuation");
  return `/login?${new URLSearchParams({ next: `/custom-design?draft=${id}` })}`;
}
