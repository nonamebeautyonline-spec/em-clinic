// 音声文字起こしAPI — Deepgram Nova-3（メイン）+ Groq Whisper-Turbo（フォールバック）
// 医療辞書は DB（medical_vocabulary）から取得し、Redis でキャッシュ（5分TTL）
// ?refine=true で Claude API による医学用語補正を有効化
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@deepgram/sdk";
import Groq from "groq-sdk";
import { VOICE_LIMITS } from "@/lib/validations/voice";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase";
import { redis } from "@/lib/redis";
import { refineMedicalText, type VocabTerm } from "@/lib/voice/medical-refine";

// --- 辞書キャッシュ ---
const VOCAB_CACHE_TTL = 300; // 5分

function vocabCacheKey(tenantId: string | null): string {
  return `vocab:${tenantId || "global"}`;
}

/** DB から医療辞書を取得し、Deepgram Keyterm Prompting 形式に変換 */
async function getKeywords(tenantId: string | null): Promise<string[]> {
  // Redis キャッシュ確認
  try {
    const cached = await redis.get<string[]>(vocabCacheKey(tenantId));
    if (cached) return cached;
  } catch {
    // Redis 障害時は無視
  }

  // DB から取得（テナント固有 + グローバル（tenant_id=null）の両方を取得）
  let query = supabaseAdmin
    .from("medical_vocabulary")
    .select("term, boost_weight");

  if (tenantId) {
    // テナント固有 OR グローバル辞書
    query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
  }
  // tenantId が null の場合はフィルタなし（全件）

  const { data } = await query;

  if (!data || data.length === 0) {
    // DB にデータがない場合はフォールバック用のデフォルトキーワード
    return FALLBACK_KEYWORDS;
  }

  // Deepgram Keyterm 形式: "用語:重み"
  const keywords = data.map(
    (row: { term: string; boost_weight: number }) => `${row.term}:${row.boost_weight}`
  );

  // Deepgram は最大100キーワード — 重みが高い順に100件
  const sorted = keywords
    .map((kw: string) => {
      const [term, weight] = kw.split(":");
      return { kw, weight: parseFloat(weight) || 1.5, term };
    })
    .sort((a: { weight: number }, b: { weight: number }) => b.weight - a.weight)
    .slice(0, 100)
    .map((item: { kw: string }) => item.kw);

  // Redis にキャッシュ
  try {
    await redis.set(vocabCacheKey(tenantId), sorted, { ex: VOCAB_CACHE_TTL });
  } catch {
    // Redis 障害時は無視
  }

  return sorted;
}

/** LLM 補正用の辞書用語を取得（term + reading） */
async function getVocabTerms(tenantId: string | null): Promise<VocabTerm[]> {
  let query = supabaseAdmin
    .from("medical_vocabulary")
    .select("term, reading");

  if (tenantId) {
    query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
  }

  const { data } = await query;
  return (data as VocabTerm[]) || [];
}

// DB 未設定時のフォールバックキーワード
const FALLBACK_KEYWORDS = [
  "マンジャロ:2",
  "フィナステリド:2",
  "ミノキシジル:2",
  "デュタステリド:2",
  "GLP-1:2",
  "ボトックス:2",
  "ヒアルロン酸:2",
  "処方:1.5",
  "副作用:1.5",
  "用量:1.5",
  "増量:1.5",
  "減量:1.5",
  "嘔気:1.5",
  "嘔吐:1.5",
  "低血糖:1.5",
];

// --- Deepgram クライアント ---
function getDeepgramClient() {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) throw new Error("DEEPGRAM_API_KEY が未設定です");
  return createClient(apiKey);
}

// --- Groq クライアント ---
function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  return new Groq({ apiKey });
}

// --- Deepgram で文字起こし ---
async function transcribeWithDeepgram(
  audioBuffer: Buffer,
  mimeType: string,
  keywords: string[]
): Promise<{ transcript: string; confidence: number }> {
  const client = getDeepgramClient();

  console.log("[voice/transcribe] Deepgram開始: size=%d, mime=%s, keywords=%d件", audioBuffer.length, mimeType, keywords.length);

  const { result, error: dgError } = await client.listen.prerecorded.transcribeFile(
    audioBuffer,
    {
      model: "nova-3",
      language: "ja",
      smart_format: true,
      punctuate: true,
      keywords: keywords.length > 0 ? keywords : undefined,
    }
  );

  if (dgError) {
    console.error("[voice/transcribe] Deepgramエラー:", dgError);
  }

  const channel = result?.results?.channels?.[0];
  const alt = channel?.alternatives?.[0];

  console.log("[voice/transcribe] Deepgram結果: transcript=%s, confidence=%s, channels=%d, model_info=%s",
    alt?.transcript?.substring(0, 100) || "(空)",
    alt?.confidence ?? "N/A",
    result?.results?.channels?.length ?? 0,
    JSON.stringify(result?.metadata?.model_info || {}).substring(0, 200)
  );

  // 詳細ログ（空結果時のデバッグ用）
  if (!alt?.transcript) {
    console.log("[voice/transcribe] Deepgram詳細: metadata=%s", JSON.stringify(result?.metadata || {}).substring(0, 500));
  }

  return {
    transcript: alt?.transcript || "",
    confidence: alt?.confidence || 0,
  };
}

// --- Groq Whisper-Turbo で文字起こし（フォールバック） ---
async function transcribeWithGroq(
  audioBuffer: Buffer,
  mimeType: string
): Promise<{ transcript: string; confidence: number }> {
  const client = getGroqClient();
  if (!client) throw new Error("GROQ_API_KEY が未設定です");

  // Groq の transcription API は File オブジェクトを要求
  const ext = mimeType.includes("webm") ? "webm" : mimeType.includes("mp4") ? "mp4" : "wav";
  const file = new File([audioBuffer as BlobPart], `audio.${ext}`, { type: mimeType });

  const result = await client.audio.transcriptions.create({
    file,
    model: "whisper-large-v3-turbo",
    language: "ja",
    response_format: "verbose_json",
  });

  return {
    transcript: result.text || "",
    // Groq は confidence を segments 内に持つ。全体平均を計算
    confidence: calculateGroqConfidence(result as unknown as Record<string, unknown>),
  };
}

// Groq の segments から平均 confidence を計算
function calculateGroqConfidence(result: Record<string, unknown>): number {
  const segments = result.segments as Array<{ avg_logprob?: number }> | undefined;
  if (!segments || segments.length === 0) return 0.8; // デフォルト
  const avgLogprob =
    segments.reduce((sum, s) => sum + (s.avg_logprob || 0), 0) / segments.length;
  // logprob を 0-1 の confidence に変換（近似）
  return Math.min(1, Math.max(0, 1 + avgLogprob));
}

// --- メインハンドラ ---
export async function POST(req: NextRequest) {
  try {
    // マルチテナント: リクエストからテナントIDを取得
    const tenantId = resolveTenantId(req);

    // FormData から音声ファイルを取得
    const formData = await req.formData();
    const audioFile = formData.get("audio");

    if (!audioFile || !(audioFile instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "音声ファイルが見つかりません" },
        { status: 400 }
      );
    }

    // ファイルサイズチェック
    if (audioFile.size > VOICE_LIMITS.MAX_FILE_SIZE) {
      return NextResponse.json(
        { ok: false, error: "ファイルサイズが上限（4MB）を超えています" },
        { status: 400 }
      );
    }

    // MIMEタイプチェック
    const mimeType = audioFile.type || "audio/webm";
    const isAllowed = VOICE_LIMITS.ALLOWED_MIME_TYPES.some((t) =>
      mimeType.startsWith(t)
    );
    if (!isAllowed) {
      return NextResponse.json(
        { ok: false, error: `非対応の音声形式です: ${mimeType}` },
        { status: 400 }
      );
    }

    // 音声データをバッファに変換
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    // 医療辞書キーワードを取得（DB + Redis キャッシュ）
    const keywords = await getKeywords(tenantId);

    // --- Step 1: Deepgram で文字起こし ---
    let transcript: string;
    let confidence: number;
    let modelUsed: string;

    try {
      const deepgramResult = await transcribeWithDeepgram(audioBuffer, mimeType, keywords);
      transcript = deepgramResult.transcript;
      confidence = deepgramResult.confidence;
      modelUsed = "deepgram-nova-3";

      // --- Step 2: 精度が低い場合は Groq にフォールバック ---
      if (confidence < VOICE_LIMITS.FALLBACK_CONFIDENCE_THRESHOLD && process.env.GROQ_API_KEY) {
        try {
          const groqResult = await transcribeWithGroq(audioBuffer, mimeType);
          // Groq の結果の方が良ければ採用
          if (groqResult.transcript && groqResult.confidence > confidence) {
            transcript = groqResult.transcript;
            confidence = groqResult.confidence;
            modelUsed = "groq-whisper-turbo";
          }
        } catch {
          // Groq フォールバック失敗は無視（Deepgram の結果を使う）
        }
      }
    } catch (deepgramError) {
      // Deepgram が失敗 → Groq でリトライ
      if (!process.env.GROQ_API_KEY) {
        throw deepgramError;
      }
      const groqResult = await transcribeWithGroq(audioBuffer, mimeType);
      transcript = groqResult.transcript;
      confidence = groqResult.confidence;
      modelUsed = "groq-whisper-turbo";
    }

    if (!transcript) {
      return NextResponse.json(
        { ok: false, error: "音声を認識できませんでした。もう一度お試しください。" },
        { status: 422 }
      );
    }

    // --- Step 3: Claude API による医学用語補正（オプション） ---
    const { searchParams } = new URL(req.url);
    const shouldRefine = searchParams.get("refine") !== "false"; // デフォルトON

    let refined: string | undefined;
    let corrections: string[] | undefined;

    if (shouldRefine) {
      try {
        const vocabTerms = await getVocabTerms(tenantId);
        const refineResult = await refineMedicalText(transcript, vocabTerms, tenantId);
        if (refineResult.was_modified) {
          refined = refineResult.refined;
          corrections = refineResult.corrections;
        }
      } catch {
        // 補正失敗は無視（STT結果をそのまま使う）
      }
    }

    return NextResponse.json({
      ok: true,
      transcript: refined || transcript,
      raw_transcript: refined ? transcript : undefined,
      confidence: Math.round(confidence * 1000) / 1000,
      model_used: modelUsed,
      refined: !!refined,
      corrections: corrections || undefined,
    });
  } catch (err) {
    console.error("[voice/transcribe] エラー:", err);
    const message = err instanceof Error ? err.message : "音声認識中にエラーが発生しました";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
