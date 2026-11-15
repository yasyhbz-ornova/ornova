export const MAX_CUSTOM_DESIGN_NOTE_LENGTH = 500;

export function buildCustomDesignBrief(preserveValue: unknown, avoidValue: unknown) {
  if (typeof preserveValue !== "string" || typeof avoidValue !== "string") {
    return { success: false as const, message: "راهنمای طراحی را به‌صورت متن وارد کنید." };
  }

  const preserve = preserveValue.replace(/\r\n?/g, "\n").trim();
  const avoid = avoidValue.replace(/\r\n?/g, "\n").trim();
  if (preserve.length > MAX_CUSTOM_DESIGN_NOTE_LENGTH || avoid.length > MAX_CUSTOM_DESIGN_NOTE_LENGTH) {
    return { success: false as const, message: "هر بخش از راهنمای طراحی نباید بیشتر از ۵۰۰ نویسه باشد." };
  }

  const notes = [
    preserve ? `- در طرح حفظ شود: ${preserve}` : "",
    avoid ? `- از این موارد پرهیز شود: ${avoid}` : "",
  ].filter(Boolean);

  return {
    success: true as const,
    value: notes.length ? `راهنمای طراحی اختصاصی:\n${notes.join("\n")}` : "",
  };
}
