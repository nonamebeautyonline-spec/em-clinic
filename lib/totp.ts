// lib/totp.ts — RFC 6238準拠 TOTP生成・検証ヘルパー
// Node.js crypto のみ使用（外部依存なし）
import crypto from "crypto";

// ── Base32 エンコード/デコード ──

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** バッファをBase32文字列にエンコード */
export function base32Encode(buffer: Buffer): string {
  let bits = "";
  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, "0");
  }
  // 5ビットずつ区切ってBase32文字に変換
  let result = "";
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, "0");
    result += BASE32_ALPHABET[parseInt(chunk, 2)];
  }
  return result;
}

/** Base32文字列をバッファにデコード */
export function base32Decode(str: string): Buffer {
  const cleaned = str.replace(/=+$/, "").toUpperCase();
  let bits = "";
  for (const char of cleaned) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) throw new Error(`無効なBase32文字: ${char}`);
    bits += index.toString(2).padStart(5, "0");
  }
  // 8ビットずつ区切ってバイトに変換
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

// ── HOTP / TOTP ──

/** HMAC-SHA1ベースのHOTP生成（RFC 4226） */
function generateHOTP(secret: string, counter: number): string {
  const key = base32Decode(secret);

  // カウンターを8バイトのビッグエンディアンバッファに変換
  const counterBuffer = Buffer.alloc(8);
  for (let i = 7; i >= 0; i--) {
    counterBuffer[i] = counter & 0xff;
    counter = Math.floor(counter / 256);
  }

  // HMAC-SHA1
  const hmac = crypto.createHmac("sha1", key);
  hmac.update(counterBuffer);
  const hash = hmac.digest();

  // Dynamic Truncation
  const offset = hash[hash.length - 1] & 0x0f;
  const code =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  // 6桁に切り詰め
  return (code % 1_000_000).toString().padStart(6, "0");
}

// ── エクスポート関数 ──

/** Base32エンコードされたランダムシークレットを生成（20バイト） */
export function generateSecret(): string {
  const buffer = crypto.randomBytes(20);
  return base32Encode(buffer);
}

/** Google Authenticator等で読み取るotpauth URI を生成 */
export function generateTOTPUri(secret: string, email: string): string {
  const issuer = "Lope Platform";
  const label = `${issuer}:${email}`;
  return `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&digits=6&period=30`;
}

/**
 * TOTPコードを検証（現在のウィンドウ +/- 1 で検証）
 * 30秒のタイムステップ、前後1ウィンドウの誤差を許容
 */
export function verifyTOTP(secret: string, token: string): boolean {
  const now = Math.floor(Date.now() / 1000);
  const timeStep = 30;

  for (let i = -1; i <= 1; i++) {
    const counter = Math.floor(now / timeStep) + i;
    const expected = generateHOTP(secret, counter);
    // タイミング攻撃対策: 定数時間比較
    if (
      expected.length === token.length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token))
    ) {
      return true;
    }
  }

  return false;
}

/** 8個の8桁ランダムバックアップコードを生成 */
export function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 8; i++) {
    // 8桁のランダム数字
    const num = crypto.randomInt(0, 100_000_000);
    codes.push(num.toString().padStart(8, "0"));
  }
  return codes;
}
