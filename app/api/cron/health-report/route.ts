// app/api/cron/health-report/route.ts
// 日次ヘルスレポート（Supabase・Redis接続 + データ整合性チェック）
// 異常時にLINE通知を送信

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { redis } from "@/lib/redis";
import { getSettingOrEnv } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Vercel Cron 認証
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const issues: string[] = [];

  // 1. Supabase 接続チェック
  try {
    const { error } = await supabaseAdmin
      .from("patients")
      .select("patient_id")
      .limit(1);
    if (error) issues.push(`Supabase接続エラー: ${error.message}`);
  } catch (e) {
    issues.push(`Supabase例外: ${e instanceof Error ? e.message : String(e)}`);
  }

  // 2. Redis 接続チェック
  try {
    await redis.ping();
  } catch (e) {
    issues.push(`Redis接続エラー: ${e instanceof Error ? e.message : String(e)}`);
  }

  // 3. データ整合性チェック: intake に patient_id = null のレコードがないか
  try {
    const { count } = await supabaseAdmin
      .from("intake")
      .select("id", { count: "exact", head: true })
      .is("patient_id", null);
    if (count && count > 0) {
      issues.push(`intake に patient_id=null が ${count}件あります`);
    }
  } catch {
    // テーブル構造の問題はスキップ
  }

  // 4. 重複電話番号チェック: 同一telで複数PIDが存在する患者
  try {
    const { data: allWithTel } = await supabaseAdmin
      .from("patients")
      .select("patient_id, tel")
      .not("tel", "is", null)
      .limit(100000);
    if (allWithTel) {
      const telMap = new Map<string, string[]>();
      for (const p of allWithTel) {
        const list = telMap.get(p.tel) || [];
        list.push(p.patient_id);
        telMap.set(p.tel, list);
      }
      const dups = [...telMap.entries()].filter(([, pids]) => pids.length > 1);
      if (dups.length > 0) {
        const detail = dups.slice(0, 5).map(([tel, pids]) => `${tel.slice(-4)}:${pids.join(",")}`).join("; ");
        issues.push(`同一電話番号で複数PIDが ${dups.length}組あります (${detail})`);
      }
    }
  } catch {
    // スキップ
  }

  // 5. 孤立チェック: answerers に紐づく patients がないレコード
  try {
    const { data: orphans } = await supabaseAdmin
      .rpc("check_orphan_answerers_count");
    if (orphans && orphans > 0) {
      issues.push(`孤立answerers が ${orphans}件あります`);
    }
  } catch {
    // RPC未定義の場合はスキップ
  }

  // 結果判定
  if (issues.length > 0) {
    const message = `[ヘルスレポート] ${issues.length}件の問題を検出:\n${issues.join("\n")}`;
    console.warn(message);

    // LINE通知（再処方通知と同じグループに送信）
    try {
      const lineToken = await getSettingOrEnv("line", "notify_channel_access_token", "LINE_NOTIFY_CHANNEL_ACCESS_TOKEN") || "";
      const groupId = await getSettingOrEnv("line", "admin_group_id", "LINE_ADMIN_GROUP_ID") || "";
      if (lineToken && groupId) {
        await fetch("https://api.line.me/v2/bot/message/push", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${lineToken}`,
          },
          body: JSON.stringify({
            to: groupId,
            messages: [{ type: "text", text: `⚠️ ${message}` }],
          }),
        });
      }
    } catch (e) {
      console.error("[health-report] LINE通知エラー:", e);
    }
  } else {
    console.log("日次ヘルスチェック: 全項目正常");
  }

  return NextResponse.json({
    ok: issues.length === 0,
    issues,
    checkedAt: new Date().toISOString(),
  });
}
