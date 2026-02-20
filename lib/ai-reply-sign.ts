// AI返信ドラフト修正ページの署名付きURL生成・検証

import crypto from "crypto";

const SECRET = process.env.SETTINGS_ENCRYPTION_KEY || "";

/** 署名生成（draftId + 有効期限） */
export function signDraftUrl(draftId: number, expiresAt: number): string {
  const payload = `${draftId}:${expiresAt}`;
  return crypto.createHmac("sha256", SECRET).update(payload).digest("hex").slice(0, 32);
}

/** 署名検証 */
export function verifyDraftSignature(draftId: number, expiresAt: number, sig: string): boolean {
  if (!sig || sig.length !== 32) return false;
  if (Date.now() > expiresAt) return false;
  const expected = signDraftUrl(draftId, expiresAt);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}

/** 署名付きURL生成（24時間有効） */
export function buildEditUrl(draftId: number, origin: string): string {
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  const sig = signDraftUrl(draftId, expiresAt);
  return `${origin}/ai-reply/edit?id=${draftId}&exp=${expiresAt}&sig=${sig}`;
}
