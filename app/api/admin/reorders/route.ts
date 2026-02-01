import { NextRequest, NextResponse } from "next/server";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const GAS_REORDER_URL = process.env.GAS_REORDER_URL;

export async function GET(req: NextRequest) {
  try {
    // 認証チェック
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!GAS_REORDER_URL) {
      return NextResponse.json(
        { error: "GAS_REORDER_URL is not configured" },
        { status: 500 }
      );
    }

    // クエリパラメータ: include_all=true で全件取得、デフォルトはpendingのみ
    const searchParams = req.nextUrl.searchParams;
    const includeAll = searchParams.get("include_all") === "true";

    const gasRes = await fetch(GAS_REORDER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "listAll",
        include_all: includeAll,
      }),
      cache: "no-store",
    });

    const gasText = await gasRes.text().catch(() => "");
    let gasJson: any = {};
    try {
      gasJson = gasText ? JSON.parse(gasText) : {};
    } catch {
      gasJson = {};
    }

    if (!gasRes.ok || gasJson.ok === false) {
      console.error("GAS reorder listAll error:", gasJson.error || gasRes.status);
      return NextResponse.json(
        { error: gasJson.error || "GAS error" },
        { status: 500 }
      );
    }

    const reorders = Array.isArray(gasJson.reorders) ? gasJson.reorders : [];

    return NextResponse.json({ reorders });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
