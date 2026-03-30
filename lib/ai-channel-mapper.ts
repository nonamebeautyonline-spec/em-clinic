// AI Channel Mapper
// チャネル種別ごとの特性マッピングとデフォルトworkflow決定

import type { ChannelType } from "./ai-intake-normalizer";

/** チャネルの能力・特性定義 */
export interface ChannelCapability {
  canReply: boolean; // 返信可能か
  isRealtime: boolean; // リアルタイムか
  supportsAttachment: boolean; // 添付ファイル対応か
  supportsRichContent: boolean; // リッチコンテンツ（Flex等）対応か
  defaultWorkflow: string; // デフォルトの workflow type
}

/** チャネル別の特性定義マップ */
const CHANNEL_MAP: Record<ChannelType, ChannelCapability> = {
  line: {
    canReply: true,
    isRealtime: true,
    supportsAttachment: true,
    supportsRichContent: true,
    defaultWorkflow: "line-reply",
  },
  email: {
    canReply: true,
    isRealtime: false,
    supportsAttachment: true,
    supportsRichContent: false,
    defaultWorkflow: "email-intake",
  },
  form: {
    canReply: false, // フォームには直接返信できない
    isRealtime: false,
    supportsAttachment: false,
    supportsRichContent: false,
    defaultWorkflow: "form-intake",
  },
  slack: {
    canReply: true,
    isRealtime: true,
    supportsAttachment: true,
    supportsRichContent: true, // Slack Block Kit
    defaultWorkflow: "support-intake",
  },
  phone: {
    canReply: false, // 音声通話への自動返信は不可
    isRealtime: false, // 文字起こし後の非同期処理
    supportsAttachment: false,
    supportsRichContent: false,
    defaultWorkflow: "support-intake",
  },
};

/**
 * チャネル種別から特性情報を取得
 */
export function getChannelCapability(channelType: ChannelType): ChannelCapability {
  const capability = CHANNEL_MAP[channelType];
  if (!capability) {
    // 未知のチャネルはフォールバック
    return {
      canReply: false,
      isRealtime: false,
      supportsAttachment: false,
      supportsRichContent: false,
      defaultWorkflow: "support-intake",
    };
  }
  return capability;
}

/**
 * チャネル種別からデフォルトのworkflow typeを取得
 */
export function getDefaultWorkflow(channelType: ChannelType): string {
  return getChannelCapability(channelType).defaultWorkflow;
}

/**
 * チャネルが返信可能かどうかを判定
 */
export function canReplyToChannel(channelType: ChannelType): boolean {
  return getChannelCapability(channelType).canReply;
}

/**
 * 対応チャネル一覧を返す
 */
export function getSupportedChannels(): ChannelType[] {
  return Object.keys(CHANNEL_MAP) as ChannelType[];
}
