import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";

const LINE_MESSAGING_API_TOKEN = process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN;

export async function GET(req: NextRequest) {
  try {
    // 認証チェック（クッキーまたはBearerトークン）
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!LINE_MESSAGING_API_TOKEN) {
      console.error("[LINE Followers] LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN not configured");
      return NextResponse.json(
        { error: "LINE API token not configured", followers: 0 },
        { status: 500 }
      );
    }

    // 昨日の日付を取得（統計APIは当日データがないため）
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD形式

    // LINE Messaging API - Get number of followers
    // https://developers.line.biz/en/reference/messaging-api/#get-number-of-followers
    const url = `https://api.line.me/v2/bot/insight/followers?date=${dateStr}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${LINE_MESSAGING_API_TOKEN}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[LINE Followers] API error:", response.status, errorText);
      return NextResponse.json(
        {
          error: `LINE API error: ${response.status}`,
          followers: 0,
          details: errorText,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // レスポンス例: { "status": "ready", "followers": 1000, "targetedReaches": 800, "blocks": 50 }
    if (data.status !== "ready") {
      console.warn("[LINE Followers] Data not ready:", data);
      return NextResponse.json(
        {
          error: "Statistics not ready",
          followers: 0,
          status: data.status,
        },
        { status: 503 }
      );
    }

    console.log(`[LINE Followers] Successfully retrieved: ${data.followers} followers (date: ${dateStr})`);

    return NextResponse.json({
      followers: data.followers || 0,
      targetedReaches: data.targetedReaches || 0,
      blocks: data.blocks || 0,
      date: dateStr,
      status: data.status,
    });
  } catch (error) {
    console.error("[LINE Followers] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Server error",
        followers: 0,
      },
      { status: 500 }
    );
  }
}
