// app/api/admin/dashboard-sse/route.ts — ダッシュボードSSEエンドポイント
// Edge Runtimeでポーリングベースの差分検出 → クライアントにSSE送信

import { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { createClient } from "@supabase/supabase-js";
import {
  formatSSEEvent,
  createPingEvent,
  detectChanges,
  SSE_HEADERS,
  SSE_CONFIG,
  type DashboardSnapshot,
} from "@/lib/sse";

export const runtime = "edge";

// Edge RuntimeではNode.jsモジュールが使えないため、直接Supabaseクライアントを生成
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * Edge Runtime用の認証チェック
 * jose の jwtVerify のみ使用（Node.jsのcryptoに依存しない）
 */
async function verifyAuthEdge(
  request: NextRequest,
): Promise<{ authorized: boolean; tenantId: string | null }> {
  const jwtSecret = process.env.JWT_SECRET || process.env.ADMIN_TOKEN;
  if (!jwtSecret) {
    return { authorized: false, tenantId: null };
  }

  // 1. クッキーベースのセッション認証
  const sessionCookie = request.cookies.get("admin_session")?.value;
  if (sessionCookie) {
    try {
      const secret = new TextEncoder().encode(jwtSecret);
      const { payload } = await jwtVerify(sessionCookie, secret);
      const tenantId =
        (payload as { tenantId?: string | null }).tenantId || null;
      return { authorized: true, tenantId };
    } catch {
      // クッキー無効、次の方式を試す
    }
  }

  // 2. Bearerトークン認証（後方互換性）
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    if (token === process.env.ADMIN_TOKEN) {
      // Bearerトークン認証の場合、ヘッダーからテナントIDを取得
      const tenantId = request.headers.get("x-tenant-id") || null;
      return { authorized: true, tenantId };
    }
  }

  return { authorized: false, tenantId: null };
}

/**
 * 現在のJST日付範囲（今日0:00〜明日0:00）のISO文字列を返す
 */
function getTodayRange(): { startISO: string; endISO: string; startDate: string; endDate: string } {
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstNowMs = now.getTime() + jstOffset;
  const jstNow = new Date(jstNowMs);

  const year = jstNow.getUTCFullYear();
  const month = jstNow.getUTCMonth();
  const date = jstNow.getUTCDate();

  const start = new Date(Date.UTC(year, month, date, 0, 0, 0) - jstOffset);
  const end = new Date(Date.UTC(year, month, date + 1, 0, 0, 0) - jstOffset);

  // reserved_date はJST日付（DATE型）で保存
  const jstStartForDate = new Date(start.getTime() + jstOffset);
  const jstEndForDate = new Date(end.getTime() + jstOffset);

  return {
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    startDate: jstStartForDate.toISOString().split("T")[0],
    endDate: jstEndForDate.toISOString().split("T")[0],
  };
}

/**
 * データベースから現在のスナップショットを取得
 */
async function fetchSnapshot(
  tenantId: string | null,
): Promise<DashboardSnapshot> {
  const supabase = getSupabaseClient();
  const { startISO, endISO, startDate, endDate } = getTodayRange();

  // テナントフィルター付きクエリのヘルパー
  const withTenant = <T>(query: T): T => {
    if (tenantId) {
      return (query as any).eq("tenant_id", tenantId);
    }
    return query;
  };

  // 並列でデータ取得（パフォーマンス最適化）
  const [
    reservationResult,
    cancelledResult,
    paidResult,
    newPatientResult,
    latestReservation,
    latestPaid,
    latestPatient,
  ] = await Promise.all([
    // 今日の予約数
    withTenant(
      supabase
        .from("reservations")
        .select("*", { count: "exact", head: true })
        .gte("reserved_date", startDate)
        .lt("reserved_date", endDate),
    ),
    // 今日のキャンセル数
    withTenant(
      supabase
        .from("reservations")
        .select("*", { count: "exact", head: true })
        .gte("reserved_date", startDate)
        .lt("reserved_date", endDate)
        .eq("status", "canceled"),
    ),
    // 今日の決済数
    withTenant(
      supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .not("paid_at", "is", null)
        .gte("paid_at", startISO)
        .lt("paid_at", endISO),
    ),
    // 今日の新規患者数
    withTenant(
      supabase
        .from("intake")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startISO)
        .lt("created_at", endISO),
    ),
    // 最新予約のタイムスタンプ
    withTenant(
      supabase
        .from("reservations")
        .select("created_at")
        .gte("reserved_date", startDate)
        .lt("reserved_date", endDate)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ),
    // 最新決済のタイムスタンプ
    withTenant(
      supabase
        .from("orders")
        .select("paid_at")
        .not("paid_at", "is", null)
        .gte("paid_at", startISO)
        .lt("paid_at", endISO)
        .order("paid_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ),
    // 最新患者のタイムスタンプ
    withTenant(
      supabase
        .from("intake")
        .select("created_at")
        .gte("created_at", startISO)
        .lt("created_at", endISO)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ),
  ]);

  return {
    reservationCount: reservationResult.count ?? 0,
    cancelledCount: cancelledResult.count ?? 0,
    paidCount: paidResult.count ?? 0,
    newPatientCount: newPatientResult.count ?? 0,
    latestReservationAt: latestReservation.data?.created_at ?? null,
    latestPaidAt: latestPaid.data?.paid_at ?? null,
    latestPatientAt: latestPatient.data?.created_at ?? null,
  };
}

export async function GET(request: NextRequest) {
  // 認証チェック
  const { authorized, tenantId } = await verifyAuthEdge(request);
  if (!authorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // SSEストリームを生成
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let previousSnapshot: DashboardSnapshot | null = null;
      let lastPingTime = Date.now();
      const streamStartTime = Date.now();
      let aborted = false;

      // クライアント切断検出
      request.signal.addEventListener("abort", () => {
        aborted = true;
      });

      /**
       * イベントをストリームに書き込む
       */
      const sendEvent = (eventText: string) => {
        try {
          controller.enqueue(encoder.encode(eventText));
        } catch {
          // ストリームが閉じている場合は無視
          aborted = true;
        }
      };

      try {
        // 初回スナップショット取得・送信
        previousSnapshot = await fetchSnapshot(tenantId);
        sendEvent(
          formatSSEEvent({
            type: "ping",
            data: {
              message: "connected",
              snapshot: previousSnapshot,
            },
            timestamp: new Date().toISOString(),
          }),
        );

        // メインループ: ポーリングでデータベースの変更を検出
        while (!aborted) {
          const elapsed = Date.now() - streamStartTime;

          // ストリーム最大寿命チェック（Vercelタイムアウト対策）
          if (elapsed >= SSE_CONFIG.MAX_STREAM_DURATION_MS) {
            // 再接続を促すコメント送信
            sendEvent(": stream timeout, please reconnect\n\n");
            break;
          }

          // ポーリング間隔待機
          await sleep(SSE_CONFIG.POLL_INTERVAL_MS);

          if (aborted) break;

          // スナップショット取得・差分検出
          try {
            const currentSnapshot = await fetchSnapshot(tenantId);
            const events = detectChanges(previousSnapshot!, currentSnapshot);

            // 差分イベント送信
            for (const event of events) {
              sendEvent(formatSSEEvent(event));
            }

            previousSnapshot = currentSnapshot;
          } catch (err) {
            // DB接続エラー等は無視して次のポーリングへ
            console.error("[dashboard-sse] ポーリングエラー:", err);
          }

          // キープアライブpingチェック
          if (Date.now() - lastPingTime >= SSE_CONFIG.KEEPALIVE_INTERVAL_MS) {
            sendEvent(formatSSEEvent(createPingEvent()));
            lastPingTime = Date.now();
          }
        }
      } catch (err) {
        console.error("[dashboard-sse] ストリームエラー:", err);
      } finally {
        try {
          controller.close();
        } catch {
          // 既にクローズ済みの場合は無視
        }
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: SSE_HEADERS,
  });
}

/**
 * Edge Runtime互換のスリープ
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
