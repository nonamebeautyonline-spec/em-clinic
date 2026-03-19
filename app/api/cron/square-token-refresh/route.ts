// app/api/cron/square-token-refresh/route.ts — Square OAuthトークン自動更新
// 6時間ごとに実行し、有効期限7日以内のトークンをリフレッシュ
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { acquireLock } from "@/lib/distributed-lock";
import { refreshSquareToken } from "@/lib/square-oauth";
import { getSetting, setSetting } from "@/lib/settings";
import type { SquareAccount } from "@/lib/square-account";

export const runtime = "nodejs";
export const maxDuration = 60;

const REFRESH_BEFORE_DAYS = 7;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const lock = await acquireLock("cron:square-token-refresh", 300);
  if (!lock.acquired) {
    return NextResponse.json({ skipped: true, reason: "lock" });
  }

  try {
    // 全アクティブテナントを取得
    const { data: tenants } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("is_active", true)
      .is("deleted_at", null);

    if (!tenants || tenants.length === 0) {
      return NextResponse.json({ refreshed: 0, message: "テナントなし" });
    }

    let refreshedCount = 0;
    let errorCount = 0;
    const now = new Date();
    const thresholdMs = REFRESH_BEFORE_DAYS * 24 * 60 * 60 * 1000;

    for (const tenant of tenants) {
      try {
        const accountsJson = await getSetting("square", "accounts", tenant.id);
        if (!accountsJson) continue;

        const accounts: SquareAccount[] = JSON.parse(accountsJson);
        let updated = false;

        for (const account of accounts) {
          if (!account.oauth_connected || !account.refresh_token || !account.token_expires_at) {
            continue;
          }

          const expiresAt = new Date(account.token_expires_at);
          const timeUntilExpiry = expiresAt.getTime() - now.getTime();

          // 有効期限7日以内ならリフレッシュ
          if (timeUntilExpiry < thresholdMs) {
            try {
              const tokenResponse = await refreshSquareToken(account.refresh_token);
              account.access_token = tokenResponse.access_token;
              account.token_expires_at = tokenResponse.expires_at;
              if (tokenResponse.refresh_token) {
                account.refresh_token = tokenResponse.refresh_token;
              }
              updated = true;
              refreshedCount++;
              console.log(`[square-token-refresh] リフレッシュ成功: tenant=${tenant.id}, account=${account.id}`);
            } catch (e) {
              errorCount++;
              console.error(`[square-token-refresh] リフレッシュ失敗: tenant=${tenant.id}, account=${account.id}`, e);
            }
          }
        }

        if (updated) {
          await setSetting("square", "accounts", JSON.stringify(accounts), tenant.id);
        }
      } catch (e) {
        console.error(`[square-token-refresh] テナント処理エラー: tenant=${tenant.id}`, e);
      }
    }

    return NextResponse.json({ refreshed: refreshedCount, errors: errorCount });
  } finally {
    await lock.release();
  }
}
