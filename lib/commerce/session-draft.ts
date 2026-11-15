type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function shareSessionDraftWithNextTab(
  session: DraftStorage,
  persistent: DraftStorage,
  sourceKey: string,
  handoffKey: string,
  expiresAt: number,
): boolean {
  try {
    const serialized = session.getItem(sourceKey);
    if (!serialized) return false;
    const value: unknown = JSON.parse(serialized);
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    persistent.setItem(handoffKey, JSON.stringify({ ...value, crossTabExpiresAt: expiresAt }));
    return true;
  } catch {
    return false;
  }
}

export function consumeCrossTabDraft(
  session: DraftStorage,
  persistent: DraftStorage,
  handoffKey: string,
  targetKey: string,
  now = Date.now(),
): string | null {
  let serialized: string | null = null;
  try {
    serialized = persistent.getItem(handoffKey);
    if (!serialized) return null;

    const value: unknown = JSON.parse(serialized);
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const expiresAt = (value as { crossTabExpiresAt?: unknown }).crossTabExpiresAt;
    if (typeof expiresAt !== "number" || !Number.isFinite(expiresAt) || expiresAt <= now) return null;

    const draft = { ...(value as Record<string, unknown>) };
    delete draft.crossTabExpiresAt;
    const restored = JSON.stringify(draft);
    session.setItem(targetKey, restored);
    return restored;
  } catch {
    return null;
  } finally {
    try { persistent.removeItem(handoffKey); } catch { /* do not retain a consumed or invalid handoff intentionally */ }
  }
}

export function readSessionDraft(session: DraftStorage, persistent: DraftStorage, key: string): string | null {
  try {
    const current = session.getItem(key);
    if (current !== null) {
      try { persistent.removeItem(key); } catch { /* keep the tab draft available */ }
      return current;
    }
  } catch {
    return null;
  }

  try {
    const legacy = persistent.getItem(key);
    if (legacy === null) return null;
    session.setItem(key, legacy);
    persistent.removeItem(key);
    return legacy;
  } catch {
    return null;
  }
}

export function saveSessionDraft(session: DraftStorage, key: string, value: string): boolean {
  try {
    session.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeSessionDraft(session: DraftStorage, persistent: DraftStorage, key: string): void {
  try { session.removeItem(key); } catch { /* storage may be unavailable */ }
  try { persistent.removeItem(key); } catch { /* clear any pre-session legacy copy */ }
}
