// lib/voice/medical-refine.ts — Claude API による医学用語補正
// STT の認識結果を医療辞書と照合し、誤認識を補正する
import Anthropic from "@anthropic-ai/sdk";
import { getSettingOrEnv } from "@/lib/settings";

/** 補正結果 */
export interface RefineResult {
  refined: string;       // 補正後テキスト
  corrections: string[]; // 補正箇所のリスト（例: "まんじゃろ → マンジャロ"）
  was_modified: boolean; // 変更があったか
}

/** 補正に使う辞書用語（term のみ渡す） */
export type VocabTerm = { term: string; reading?: string | null };

/**
 * STT 結果を Claude API で医学用語補正する
 * - 辞書にある用語を優先して認識誤りを修正
 * - 元の文意を変えないように最小限の補正のみ行う
 */
export async function refineMedicalText(
  transcript: string,
  vocabulary: VocabTerm[],
  tenantId?: string | null
): Promise<RefineResult> {
  // API キー取得（DB → 環境変数フォールバック）
  const apiKey = await getSettingOrEnv("general", "ANTHROPIC_API_KEY", "ANTHROPIC_API_KEY", tenantId || undefined);
  if (!apiKey) {
    // API キー未設定の場合は補正なしで返す
    return { refined: transcript, corrections: [], was_modified: false };
  }

  // 辞書が空の場合も補正なし
  if (vocabulary.length === 0) {
    return { refined: transcript, corrections: [], was_modified: false };
  }

  const client = new Anthropic({ apiKey });

  // 辞書テキスト生成（用語一覧）
  const vocabList = vocabulary
    .map((v) => v.reading ? `${v.term}（${v.reading}）` : v.term)
    .join("、");

  const systemPrompt = `あなたは医療カルテの音声認識補正アシスタントです。
音声認識（STT）の結果テキストを受け取り、医療用語の誤認識を補正してください。

## ルール
1. 以下の医療辞書に含まれる用語と音が近い誤認識を正しい用語に置き換える
2. 元の文意や構造は絶対に変えない（用語の置き換えのみ）
3. 辞書にない一般的な日本語は変更しない
4. 句読点や助詞はそのまま維持する
5. 補正が不要な場合は原文をそのまま返す

## 医療辞書
${vocabList}

## 出力形式
以下のJSON形式で出力してください:
{
  "refined": "補正後のテキスト",
  "corrections": ["誤認識 → 正しい用語", ...]
}
corrections が空の場合は補正なしです。`;

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: transcript }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    // JSON 抽出（コードブロック or 直接JSON）
    const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    const jsonMatch = codeBlockMatch || text.match(/(\{[\s\S]*\})/);
    if (!jsonMatch) {
      return { refined: transcript, corrections: [], was_modified: false };
    }

    const parsed = JSON.parse(jsonMatch[1]);
    const refined = parsed.refined || transcript;
    const corrections = Array.isArray(parsed.corrections) ? parsed.corrections : [];

    return {
      refined,
      corrections,
      was_modified: refined !== transcript,
    };
  } catch (err) {
    console.error("[medical-refine] Claude API エラー:", err);
    // エラー時は補正なしで原文を返す
    return { refined: transcript, corrections: [], was_modified: false };
  }
}
