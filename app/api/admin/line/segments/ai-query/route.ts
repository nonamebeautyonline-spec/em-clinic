// app/api/admin/line/segments/ai-query/route.ts — AIセグメントクエリAPI
// 自然言語でセグメント条件を記述し、Claude APIでSQLフィルター条件に変換して患者を抽出する

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { getSettingOrEnv } from "@/lib/settings";
import { supabaseAdmin } from "@/lib/supabase";
import { parseBody } from "@/lib/validations/helpers";

// ── バリデーション ──────────────────────────────────────────

const aiQuerySchema = z.object({
  query: z.string().min(1, "クエリは必須です").max(500, "クエリは500文字以内で入力してください"),
  execute: z.boolean().default(false),
  sql: z.string().optional(), // execute=true時に生成済みSQLを渡す
});

// ── 安全性チェック ──────────────────────────────────────────

// 許可テーブル
const ALLOWED_TABLES = ["patients", "orders", "intake", "reservations", "reorders"];

// 禁止キーワード（大文字小文字を問わない）
const FORBIDDEN_KEYWORDS = [
  "DELETE", "UPDATE", "INSERT", "DROP", "ALTER", "TRUNCATE",
  "CREATE", "GRANT", "REVOKE", "EXECUTE", "EXEC",
  "INTO", "SET", "MERGE",
  // コメント攻撃防止
  "--", "/*", "*/",
  // 関数呼び出し防止
  "pg_sleep", "pg_terminate", "lo_import", "lo_export",
];

/**
 * 生成されたSQLの安全性を検証する
 * - SELECT文のみ許可
 * - 許可テーブルのみ参照可能
 * - 危険なキーワードを禁止
 */
export function validateGeneratedSQL(sql: string): { valid: boolean; reason?: string } {
  const trimmed = sql.trim();

  // SELECT文で始まるか確認
  if (!/^SELECT\s/i.test(trimmed)) {
    return { valid: false, reason: "SELECT文のみ許可されています" };
  }

  // 禁止キーワードのチェック
  const upperSQL = trimmed.toUpperCase();
  for (const keyword of FORBIDDEN_KEYWORDS) {
    // 単語境界を考慮したチェック（INTO, SET等がカラム名に含まれる場合を許容するため正規表現使用）
    const pattern = keyword.includes("-") || keyword.includes("/") || keyword.includes("*")
      ? keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") // 記号はそのままエスケープ
      : `\\b${keyword}\\b`;
    if (new RegExp(pattern, "i").test(trimmed)) {
      return { valid: false, reason: `禁止キーワード "${keyword}" が含まれています` };
    }
  }

  // セミコロンの複数文防止（末尾のセミコロンは1つだけ許可）
  const withoutTrailingSemicolon = trimmed.replace(/;\s*$/, "");
  if (withoutTrailingSemicolon.includes(";")) {
    return { valid: false, reason: "複数のSQL文は許可されていません" };
  }

  // テーブル参照のチェック（FROM句・JOIN句のテーブル名を抽出）
  const tablePattern = /\bFROM\s+(\w+)|\bJOIN\s+(\w+)/gi;
  let match;
  while ((match = tablePattern.exec(trimmed)) !== null) {
    const tableName = (match[1] || match[2]).toLowerCase();
    if (!ALLOWED_TABLES.includes(tableName)) {
      return { valid: false, reason: `テーブル "${tableName}" は参照できません（許可: ${ALLOWED_TABLES.join(", ")}）` };
    }
  }

  return { valid: true };
}

// ── システムプロンプト ──────────────────────────────────────────

const SYSTEM_PROMPT = `あなたはクリニック管理システムの患者セグメンテーションAIです。
ユーザーが自然言語で入力した患者の検索条件を、PostgreSQL（Supabase）のSELECT文に変換してください。

## 利用可能なテーブルとカラム

### patients（患者マスタ）
- patient_id: TEXT（主キー）
- name: TEXT（氏名）
- name_kana: TEXT（フリガナ）
- tel: TEXT（電話番号）
- line_id: TEXT（LINE UID）
- gender: TEXT（性別: 'male', 'female', etc.）
- birth_date: DATE（生年月日）
- created_at: TIMESTAMPTZ（登録日時）
- tenant_id: UUID

### orders（注文・決済）
- id: UUID（主キー）
- patient_id: TEXT（外部キー→patients）
- payment_status: TEXT（'pending', 'paid', 'failed', 'refunded'）
- shipping_status: TEXT（'pending', 'preparing', 'shipped', 'delivered'）
- payment_method: TEXT（'credit_card', 'bank_transfer'）
- total_amount: INTEGER（合計金額・円）
- paid_at: TIMESTAMPTZ（決済日時）
- created_at: TIMESTAMPTZ
- tenant_id: UUID

### intake（問診）
- id: UUID（主キー）
- patient_id: TEXT（外部キー→patients）
- answers: JSONB（問診回答データ）
- status: TEXT（'OK', 'NG', null）
- reserve_id: TEXT（予約ID）
- created_at: TIMESTAMPTZ
- tenant_id: UUID

### reservations（予約）
- id: UUID（主キー）
- patient_id: TEXT（外部キー→patients）
- reserve_id: TEXT（予約ID）
- reserved_date: DATE（予約日）
- reserved_time: TEXT（予約時間）
- status: TEXT（'confirmed', 'canceled'）
- prescription_menu: TEXT（処方メニュー名）
- created_at: TIMESTAMPTZ
- tenant_id: UUID

### reorders（再処方）
- id: UUID（主キー）
- patient_id: TEXT（外部キー→patients）
- status: TEXT（'pending', 'confirmed', 'paid', 'shipped', 'canceled'）
- total_amount: INTEGER（合計金額・円）
- karte_note: JSONB（再処方カルテ）
- paid_at: TIMESTAMPTZ
- created_at: TIMESTAMPTZ
- tenant_id: UUID

## ルール

1. **必ず SELECT 文のみ**を生成してください。DELETE, UPDATE, INSERT, DROP 等は絶対に含めないでください。
2. **結果は必ず patients.patient_id, patients.name を含めてください**（患者特定のため）。
3. テーブル結合が必要な場合は LEFT JOIN / INNER JOIN を使用してください。
4. 集計が必要な場合（来院回数、合計金額等）は GROUP BY + HAVING を使ってください。
5. 日付条件は CURRENT_DATE や INTERVAL を使用してください。
6. **tenant_id のフィルターは含めないでください**（アプリケーション側で自動付与します）。
7. 年齢計算: EXTRACT(YEAR FROM AGE(patients.birth_date))
8. 処方内容の検索: reservations.prescription_menu に薬名が含まれます（ILIKE '%薬名%'）
9. LIMITは含めないでください（アプリケーション側で制御します）。
10. **必ずSQLのみを出力**してください。説明やマークダウンは不要です。SQLコードブロックも不要です。

## 出力例

入力: "3ヶ月以内に2回以上来院した患者"
出力:
SELECT p.patient_id, p.name
FROM patients p
INNER JOIN reservations r ON r.patient_id = p.patient_id
WHERE r.reserved_date >= CURRENT_DATE - INTERVAL '3 months'
  AND r.status = 'confirmed'
GROUP BY p.patient_id, p.name
HAVING COUNT(r.id) >= 2

入力: "マンジャロを処方された30代の患者"
出力:
SELECT DISTINCT p.patient_id, p.name
FROM patients p
INNER JOIN reservations r ON r.patient_id = p.patient_id
WHERE r.prescription_menu ILIKE '%マンジャロ%'
  AND EXTRACT(YEAR FROM AGE(p.birth_date)) >= 30
  AND EXTRACT(YEAR FROM AGE(p.birth_date)) < 40

入力: "合計購入金額が5万円以上の患者"
出力:
SELECT p.patient_id, p.name
FROM patients p
INNER JOIN orders o ON o.patient_id = p.patient_id
WHERE o.payment_status = 'paid'
GROUP BY p.patient_id, p.name
HAVING SUM(o.total_amount) >= 50000`;

// ── POST ハンドラ ──────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 認証チェック
  const ok = await verifyAdminAuth(req);
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = resolveTenantId(req);

  // バリデーション
  const parsed = await parseBody(req, aiQuerySchema);
  if ("error" in parsed) return parsed.error;
  const { query, execute, sql: providedSQL } = parsed.data;

  // ── Step 1: SQL生成（execute=false または sql未指定時） ──

  if (!execute || !providedSQL) {
    // APIキー取得
    const apiKey = await getSettingOrEnv(
      "general",
      "anthropic_api_key",
      "ANTHROPIC_API_KEY",
      tenantId || undefined,
    );
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "ANTHROPIC_API_KEYが設定されていません" },
        { status: 500 },
      );
    }

    // Claude APIでSQL生成
    const client = new Anthropic({ apiKey });
    let generatedSQL: string;

    try {
      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: query }],
      });

      const text =
        response.content[0].type === "text" ? response.content[0].text : "";
      // コードブロックが含まれている場合は中身を抽出
      const codeBlockMatch = text.match(/```(?:sql)?\s*([\s\S]*?)\s*```/);
      generatedSQL = (codeBlockMatch ? codeBlockMatch[1] : text).trim();
    } catch (err) {
      console.error("[ai-query] Claude API エラー:", err);
      return NextResponse.json(
        { ok: false, error: "AI APIの呼び出しに失敗しました" },
        { status: 500 },
      );
    }

    // 安全性チェック
    const validation = validateGeneratedSQL(generatedSQL);
    if (!validation.valid) {
      console.error("[ai-query] SQL検証失敗:", validation.reason, generatedSQL);
      return NextResponse.json(
        {
          ok: false,
          error: `生成されたSQLが安全性チェックに失敗しました: ${validation.reason}`,
          sql: generatedSQL,
        },
        { status: 400 },
      );
    }

    // execute=falseならプレビューのみ
    if (!execute) {
      return NextResponse.json({
        ok: true,
        sql: generatedSQL,
        preview: true,
      });
    }

    // execute=trueかつsql未指定の場合、生成したSQLを直接実行
    return await executeQuery(generatedSQL, tenantId);
  }

  // ── Step 2: 提供されたSQLで実行（execute=true && sql指定時） ──

  // 再度安全性チェック（改ざん防止）
  const validation = validateGeneratedSQL(providedSQL);
  if (!validation.valid) {
    return NextResponse.json(
      {
        ok: false,
        error: `SQLが安全性チェックに失敗しました: ${validation.reason}`,
      },
      { status: 400 },
    );
  }

  return await executeQuery(providedSQL, tenantId);
}

// ── SQL実行 ──────────────────────────────────────────

async function executeQuery(
  sql: string,
  tenantId: string | null,
): Promise<NextResponse> {
  try {
    // テナントフィルターを注入（WHEREまたはJOIN条件に追加）
    const filteredSQL = injectTenantFilter(sql, tenantId);

    // LIMIT追加（安全策: 最大1000件）
    const limitedSQL = filteredSQL.replace(/;\s*$/, "") + " LIMIT 1000";

    // Supabase RPC (read-only) で実行
    const { data, error } = await supabaseAdmin.rpc("exec_readonly_query", {
      query_text: limitedSQL,
    });

    if (error) {
      console.error("[ai-query] SQL実行エラー:", error);
      // Supabase RPCが存在しない場合のフォールバック
      if (error.message?.includes("exec_readonly_query")) {
        return await executeQueryDirect(limitedSQL);
      }
      return NextResponse.json(
        {
          ok: false,
          error: `SQL実行エラー: ${error.message}`,
        },
        { status: 500 },
      );
    }

    const patients = (data as { patient_id: string; name: string | null }[]) || [];
    return NextResponse.json({
      ok: true,
      patients: patients.map((p) => ({
        patient_id: p.patient_id,
        name: p.name || "未登録",
      })),
      count: patients.length,
      sql,
    });
  } catch (err) {
    console.error("[ai-query] 実行エラー:", err);
    return NextResponse.json(
      { ok: false, error: "クエリの実行に失敗しました" },
      { status: 500 },
    );
  }
}

/**
 * RPC不在時のフォールバック: Supabase PostgREST経由の直接クエリ
 * patientsテーブルのquery builder方式でフィルタリング
 */
async function executeQueryDirect(sql: string): Promise<NextResponse> {
  // PostgRESTではraw SQLを直接実行できないため、
  // Supabase管理クライアントのrpc呼び出しを試みる
  // フォールバックとしてエラーメッセージを返す
  console.warn("[ai-query] exec_readonly_query RPCが存在しません。Supabaseで以下のRPCを作成してください:");
  console.warn(`
CREATE OR REPLACE FUNCTION exec_readonly_query(query_text TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  -- SELECT文のみ許可
  IF NOT (UPPER(TRIM(query_text)) LIKE 'SELECT%') THEN
    RAISE EXCEPTION 'SELECT文のみ許可されています';
  END IF;

  EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || query_text || ') t'
    INTO result;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;
  `);

  return NextResponse.json(
    {
      ok: false,
      error: "SQLの直接実行にはデータベースRPC (exec_readonly_query) の設定が必要です。管理者にお問い合わせください。",
      setup_required: true,
    },
    { status: 501 },
  );
}

// ── テナントフィルター注入 ──────────────────────────────────

/**
 * SQLにテナントフィルター条件を注入する
 * 各テーブルのエイリアスに対して tenant_id = 'xxx' を追加
 */
function injectTenantFilter(sql: string, tenantId: string | null): string {
  if (!tenantId) return sql;

  // FROM/JOIN句のテーブル名とエイリアスを抽出
  const tableAliases: { table: string; alias: string }[] = [];
  const fromPattern = /\bFROM\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?/gi;
  const joinPattern = /\bJOIN\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?/gi;

  let m;
  while ((m = fromPattern.exec(sql)) !== null) {
    tableAliases.push({
      table: m[1],
      alias: m[2] || m[1],
    });
  }
  while ((m = joinPattern.exec(sql)) !== null) {
    tableAliases.push({
      table: m[1],
      alias: m[2] || m[1],
    });
  }

  if (tableAliases.length === 0) return sql;

  // WHERE句が存在するかチェック
  const hasWhere = /\bWHERE\b/i.test(sql);

  // テナントフィルター条件を構築
  const tenantConditions = tableAliases
    .filter((ta) => ALLOWED_TABLES.includes(ta.table.toLowerCase()))
    .map((ta) => `${ta.alias}.tenant_id = '${tenantId}'`)
    .join(" AND ");

  if (!tenantConditions) return sql;

  if (hasWhere) {
    // WHERE句の直後にAND条件を追加
    return sql.replace(/\bWHERE\b/i, `WHERE ${tenantConditions} AND`);
  } else {
    // GROUP BY/ORDER BY/HAVING の前にWHEREを挿入
    const insertBefore = sql.match(/\b(GROUP\s+BY|ORDER\s+BY|HAVING|LIMIT)\b/i);
    if (insertBefore && insertBefore.index !== undefined) {
      return (
        sql.slice(0, insertBefore.index) +
        `WHERE ${tenantConditions} ` +
        sql.slice(insertBefore.index)
      );
    }
    // 末尾にWHEREを追加
    return sql.replace(/;\s*$/, "") + ` WHERE ${tenantConditions}`;
  }
}
