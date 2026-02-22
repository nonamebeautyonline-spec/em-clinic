/**
 * k6 負荷テストシナリオ
 *
 * 対象API:
 *   - ダッシュボード統計 (GET /api/admin/dashboard-stats)
 *   - 予約一覧 (GET /api/admin/reservations)
 *   - LINE配信 (POST /api/admin/line/broadcast/preview)
 *
 * 実行方法:
 *   k6 run load-tests/k6-scenarios.js
 *
 * 環境変数:
 *   BASE_URL     - テスト対象のベースURL（デフォルト: http://localhost:3000）
 *   AUTH_COOKIE  - 管理画面認証用のセッションCookie値
 *   TENANT_ID    - テナントID（マルチテナント環境用）
 */

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";

// === カスタムメトリクス ===
const errorRate = new Rate("error_rate");
const dashboardDuration = new Trend("dashboard_duration", true);
const reservationsDuration = new Trend("reservations_duration", true);
const broadcastPreviewDuration = new Trend("broadcast_preview_duration", true);

// === 設定 ===
const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const AUTH_COOKIE = __ENV.AUTH_COOKIE || "";
const TENANT_ID = __ENV.TENANT_ID || "";

// === シナリオ定義 ===
// ステージ: 同時10→50→100ユーザーで段階的に負荷を増加
export const options = {
  scenarios: {
    // シナリオ1: ダッシュボードAPI（管理者が頻繁にアクセス）
    dashboard: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 10 },  // 30秒かけて10ユーザーまで増加
        { duration: "1m", target: 10 },    // 1分間10ユーザーで維持
        { duration: "30s", target: 50 },   // 30秒かけて50ユーザーまで増加
        { duration: "1m", target: 50 },    // 1分間50ユーザーで維持
        { duration: "30s", target: 100 },  // 30秒かけて100ユーザーまで増加
        { duration: "1m", target: 100 },   // 1分間100ユーザーで維持
        { duration: "30s", target: 0 },    // 30秒かけてクールダウン
      ],
      exec: "dashboardScenario",
      tags: { scenario: "dashboard" },
    },

    // シナリオ2: 予約API（予約一覧・当日予約の取得）
    reservations: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 10 },
        { duration: "1m", target: 10 },
        { duration: "30s", target: 50 },
        { duration: "1m", target: 50 },
        { duration: "30s", target: 100 },
        { duration: "1m", target: 100 },
        { duration: "30s", target: 0 },
      ],
      exec: "reservationsScenario",
      tags: { scenario: "reservations" },
    },

    // シナリオ3: LINE配信プレビュー（配信前の確認操作）
    broadcast_preview: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 5 },   // 配信は同時操作が少ないため控えめ
        { duration: "1m", target: 5 },
        { duration: "30s", target: 20 },
        { duration: "1m", target: 20 },
        { duration: "30s", target: 50 },
        { duration: "1m", target: 50 },
        { duration: "30s", target: 0 },
      ],
      exec: "broadcastPreviewScenario",
      tags: { scenario: "broadcast_preview" },
    },
  },

  // 全体の閾値（これを超えたらテスト失敗）
  thresholds: {
    // 全リクエストの95パーセンタイルが2秒以内
    http_req_duration: ["p(95)<2000"],
    // エラー率が5%未満
    error_rate: ["rate<0.05"],
    // ダッシュボードAPIは1秒以内（95パーセンタイル）
    dashboard_duration: ["p(95)<1000"],
    // 予約APIは1.5秒以内（95パーセンタイル）
    reservations_duration: ["p(95)<1500"],
    // 配信プレビューは2秒以内（95パーセンタイル）
    broadcast_preview_duration: ["p(95)<2000"],
  },
};

// === 共通ヘッダー ===
function getHeaders() {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  // 認証Cookieが設定されている場合はヘッダーに追加
  if (AUTH_COOKIE) {
    headers["Cookie"] = `session=${AUTH_COOKIE}`;
  }
  // テナントIDが設定されている場合はヘッダーに追加
  if (TENANT_ID) {
    headers["X-Tenant-Id"] = TENANT_ID;
  }
  return headers;
}

// === シナリオ1: ダッシュボード統計API ===
export function dashboardScenario() {
  group("ダッシュボード統計", () => {
    // ダッシュボード統計の取得
    const statsRes = http.get(`${BASE_URL}/api/admin/dashboard-stats`, {
      headers: getHeaders(),
      tags: { name: "GET /api/admin/dashboard-stats" },
    });

    dashboardDuration.add(statsRes.timings.duration);

    const statsOk = check(statsRes, {
      "ダッシュボード統計: ステータス200": (r) => r.status === 200,
      "ダッシュボード統計: レスポンスがJSON": (r) => {
        try {
          JSON.parse(r.body);
          return true;
        } catch {
          return false;
        }
      },
      "ダッシュボード統計: 応答時間1秒以内": (r) => r.timings.duration < 1000,
    });

    errorRate.add(!statsOk);

    // 日次売上の取得（ダッシュボードで同時に呼ばれる）
    const revenueRes = http.get(`${BASE_URL}/api/admin/daily-revenue`, {
      headers: getHeaders(),
      tags: { name: "GET /api/admin/daily-revenue" },
    });

    const revenueOk = check(revenueRes, {
      "日次売上: ステータス200": (r) => r.status === 200,
    });

    errorRate.add(!revenueOk);

    // 未読数の取得（管理画面のポーリング）
    const unreadRes = http.get(`${BASE_URL}/api/admin/unread-count`, {
      headers: getHeaders(),
      tags: { name: "GET /api/admin/unread-count" },
    });

    const unreadOk = check(unreadRes, {
      "未読数: ステータス200": (r) => r.status === 200,
    });

    errorRate.add(!unreadOk);
  });

  // リクエスト間にランダムな間隔を入れて実際のユーザー操作を模擬
  sleep(Math.random() * 3 + 1); // 1〜4秒
}

// === シナリオ2: 予約API ===
export function reservationsScenario() {
  group("予約一覧", () => {
    // 予約一覧の取得
    const listRes = http.get(`${BASE_URL}/api/admin/reservations`, {
      headers: getHeaders(),
      tags: { name: "GET /api/admin/reservations" },
    });

    reservationsDuration.add(listRes.timings.duration);

    const listOk = check(listRes, {
      "予約一覧: ステータス200": (r) => r.status === 200,
      "予約一覧: レスポンスがJSON": (r) => {
        try {
          JSON.parse(r.body);
          return true;
        } catch {
          return false;
        }
      },
      "予約一覧: 応答時間1.5秒以内": (r) => r.timings.duration < 1500,
    });

    errorRate.add(!listOk);

    // 当日予約の取得（管理画面で頻繁に確認される）
    const todayRes = http.get(`${BASE_URL}/api/admin/reservations/today`, {
      headers: getHeaders(),
      tags: { name: "GET /api/admin/reservations/today" },
    });

    const todayOk = check(todayRes, {
      "当日予約: ステータス200": (r) => r.status === 200,
      "当日予約: 応答時間1秒以内": (r) => r.timings.duration < 1000,
    });

    errorRate.add(!todayOk);

    // スケジュール取得（カレンダー表示用）
    const scheduleRes = http.get(`${BASE_URL}/api/admin/schedule`, {
      headers: getHeaders(),
      tags: { name: "GET /api/admin/schedule" },
    });

    const scheduleOk = check(scheduleRes, {
      "スケジュール: ステータス200": (r) => r.status === 200,
    });

    errorRate.add(!scheduleOk);
  });

  sleep(Math.random() * 2 + 1); // 1〜3秒
}

// === シナリオ3: LINE配信プレビューAPI ===
export function broadcastPreviewScenario() {
  group("LINE配信プレビュー", () => {
    // 配信プレビューのリクエスト（テキストメッセージ）
    const previewPayload = JSON.stringify({
      messages: [
        {
          type: "text",
          text: "【テスト配信】負荷テスト用のメッセージです。",
        },
      ],
      // フィルタなし（全員宛）
      filter: {},
    });

    const previewRes = http.post(
      `${BASE_URL}/api/admin/line/broadcast/preview`,
      previewPayload,
      {
        headers: getHeaders(),
        tags: { name: "POST /api/admin/line/broadcast/preview" },
      }
    );

    broadcastPreviewDuration.add(previewRes.timings.duration);

    const previewOk = check(previewRes, {
      "配信プレビュー: ステータス200": (r) => r.status === 200,
      "配信プレビュー: レスポンスがJSON": (r) => {
        try {
          JSON.parse(r.body);
          return true;
        } catch {
          return false;
        }
      },
      "配信プレビュー: 応答時間2秒以内": (r) => r.timings.duration < 2000,
    });

    errorRate.add(!previewOk);

    // 友だち一覧の取得（配信対象の確認に使用）
    const friendsRes = http.get(`${BASE_URL}/api/admin/line/friends-list`, {
      headers: getHeaders(),
      tags: { name: "GET /api/admin/line/friends-list" },
    });

    const friendsOk = check(friendsRes, {
      "友だち一覧: ステータス200": (r) => r.status === 200,
    });

    errorRate.add(!friendsOk);

    // LINEダッシュボードの取得（配信画面遷移時に呼ばれる）
    const lineDashRes = http.get(`${BASE_URL}/api/admin/line/dashboard`, {
      headers: getHeaders(),
      tags: { name: "GET /api/admin/line/dashboard" },
    });

    const lineDashOk = check(lineDashRes, {
      "LINEダッシュボード: ステータス200": (r) => r.status === 200,
    });

    errorRate.add(!lineDashOk);
  });

  sleep(Math.random() * 3 + 2); // 2〜5秒（配信操作はゆっくり）
}

// === テスト結果のサマリーハンドラー ===
export function handleSummary(data) {
  // テスト結果をコンソールとJSONファイルに出力
  const summary = {
    テスト実行日時: new Date().toISOString(),
    ベースURL: BASE_URL,
    全体結果: {
      合計リクエスト数: data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0,
      平均応答時間ms: data.metrics.http_req_duration
        ? Math.round(data.metrics.http_req_duration.values.avg)
        : 0,
      "95パーセンタイルms": data.metrics.http_req_duration
        ? Math.round(data.metrics.http_req_duration.values["p(95)"])
        : 0,
      エラー率: data.metrics.error_rate
        ? (data.metrics.error_rate.values.rate * 100).toFixed(2) + "%"
        : "0%",
    },
  };

  console.log("\n===== 負荷テスト結果サマリー =====");
  console.log(JSON.stringify(summary, null, 2));
  console.log("==================================\n");

  return {
    // JSON形式でレポートを出力
    "load-tests/results/summary.json": JSON.stringify(data, null, 2),
    // コンソールにも標準レポートを出力
    stdout: textSummary(data, { indent: "  ", enableColors: true }),
  };
}

// k6のテキストサマリー関数のインポート（k6 v0.30+）
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";
