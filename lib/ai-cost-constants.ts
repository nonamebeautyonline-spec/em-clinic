// AI返信コスト関連の共通定数

// Sonnet基準の概算。Case Routing導入後もSonnetで上限見積もりする方が安全
export const ESTIMATED_COST_PER_INPUT_TOKEN = 0.000003; // ~$3.00/1M tokens
export const ESTIMATED_COST_PER_OUTPUT_TOKEN = 0.000015; // ~$15.00/1M tokens

// ブロック理由コード（stats/ログ/UIで共通使用）
export const BLOCK_REASONS = {
  rate_limit: "rate_limit",
  repeat_message: "repeat_message",
  cost_limit: "cost_limit",
  skip_pattern: "skip_pattern",
  cooldown: "cooldown",
  too_short: "too_short",
  not_text: "not_text",
} as const;
export type BlockReason = (typeof BLOCK_REASONS)[keyof typeof BLOCK_REASONS];
