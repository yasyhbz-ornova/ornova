const DESIGN_NOTE_LIMIT = 500;

export type DesignNoteResult =
  | { success: true; value: string | null }
  | { success: false; message: string };

export function parseDesignNote(input: unknown): DesignNoteResult {
  if (typeof input !== "string") {
    return { success: false, message: "یادداشت سلیقه را به‌صورت متن وارد کنید." };
  }

  const value = input.replace(/\r\n?/g, "\n").trim();
  if (value.length > DESIGN_NOTE_LIMIT) {
    return { success: false, message: "یادداشت سلیقه نباید بیشتر از ۵۰۰ نویسه باشد." };
  }

  return { success: true, value: value || null };
}
