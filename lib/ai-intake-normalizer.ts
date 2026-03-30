// AI Intake Normalizer
// 各チャネルのraw入力を統一 NormalizedIntake 型に変換する

// チャネル種別
export type ChannelType = "line" | "email" | "form" | "slack" | "phone";

// 統一入力型
export interface NormalizedIntake {
  text: string;
  channelType: ChannelType;
  senderName?: string;
  senderEmail?: string;
  senderPhone?: string;
  patientId?: string;
  metadata: Record<string, unknown>; // チャネル固有情報
}

// メール入力
export interface EmailRawInput {
  subject: string;
  body: string;
  from: string;
  fromName?: string;
  to: string;
  cc?: string[];
  attachments?: Array<{ name: string; mimeType: string; size: number }>;
  receivedAt: string;
}

// フォーム入力
export interface FormRawInput {
  formId: string;
  formName?: string;
  fields: Record<string, string>;
  submitterEmail?: string;
  submitterName?: string;
  submittedAt: string;
}

// Slack入力
export interface SlackRawInput {
  channelId: string;
  channelName?: string;
  userId: string;
  userName?: string;
  text: string;
  threadTs?: string;
  ts: string;
}

// LINE入力（既存互換）
export interface LineRawInput {
  text: string;
  lineUid: string;
  displayName?: string;
  patientId?: string;
}

// 電話入力
export interface PhoneRawInput {
  transcript: string;
  callerPhone: string;
  callerName?: string;
  duration: number; // 秒
  recordedAt: string;
}

/**
 * メール入力を正規化
 * subject + body を結合してテキスト化、添付情報はmetadataに保持
 */
export function normalizeEmailIntake(raw: EmailRawInput): NormalizedIntake {
  const subjectLine = raw.subject ? `件名: ${raw.subject}\n` : "";
  const text = `${subjectLine}${raw.body}`.trim();

  return {
    text,
    channelType: "email",
    senderName: raw.fromName,
    senderEmail: raw.from,
    metadata: {
      subject: raw.subject,
      to: raw.to,
      cc: raw.cc ?? [],
      attachments: raw.attachments ?? [],
      receivedAt: raw.receivedAt,
    },
  };
}

/**
 * フォーム入力を正規化
 * fields を key: value 形式でテキスト化
 */
export function normalizeFormIntake(raw: FormRawInput): NormalizedIntake {
  // フィールドをテキストに変換
  const fieldLines = Object.entries(raw.fields)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");

  const formLabel = raw.formName ? `フォーム: ${raw.formName}\n` : "";
  const text = `${formLabel}${fieldLines}`.trim();

  return {
    text,
    channelType: "form",
    senderName: raw.submitterName,
    senderEmail: raw.submitterEmail,
    metadata: {
      formId: raw.formId,
      formName: raw.formName,
      fields: raw.fields,
      submittedAt: raw.submittedAt,
    },
  };
}

/**
 * Slack入力を正規化
 */
export function normalizeSlackIntake(raw: SlackRawInput): NormalizedIntake {
  return {
    text: raw.text,
    channelType: "slack",
    senderName: raw.userName,
    metadata: {
      channelId: raw.channelId,
      channelName: raw.channelName,
      userId: raw.userId,
      threadTs: raw.threadTs,
      ts: raw.ts,
    },
  };
}

/**
 * LINE入力を正規化
 */
export function normalizeLineIntake(raw: LineRawInput): NormalizedIntake {
  return {
    text: raw.text,
    channelType: "line",
    senderName: raw.displayName,
    patientId: raw.patientId,
    metadata: {
      lineUid: raw.lineUid,
    },
  };
}

/**
 * 電話入力を正規化
 */
export function normalizePhoneIntake(raw: PhoneRawInput): NormalizedIntake {
  return {
    text: raw.transcript,
    channelType: "phone",
    senderName: raw.callerName,
    senderPhone: raw.callerPhone,
    metadata: {
      duration: raw.duration,
      recordedAt: raw.recordedAt,
    },
  };
}

/**
 * チャネル種別に応じて適切な正規化関数を呼び出す統一エントリポイント
 */
export function normalizeIntake(channelType: ChannelType, raw: unknown): NormalizedIntake {
  switch (channelType) {
    case "email":
      return normalizeEmailIntake(raw as EmailRawInput);
    case "form":
      return normalizeFormIntake(raw as FormRawInput);
    case "slack":
      return normalizeSlackIntake(raw as SlackRawInput);
    case "line":
      return normalizeLineIntake(raw as LineRawInput);
    case "phone":
      return normalizePhoneIntake(raw as PhoneRawInput);
    default:
      throw new Error(`未対応のチャネル種別: ${channelType}`);
  }
}
