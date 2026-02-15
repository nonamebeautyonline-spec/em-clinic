import { NextRequest, NextResponse } from "next/server";
import * as iconv from "iconv-lite";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId } from "@/lib/tenant";

const TAG_ATTR_ID = "9217653"; // タグID（GASと同じ）

export async function POST(req: NextRequest) {
  try {
    // 認証チェック（クッキーまたはBearerトークン）
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = resolveTenantId(req);

    const body = await req.json();
    const { lstepIds } = body as { lstepIds: string[] };

    if (!lstepIds || !Array.isArray(lstepIds) || lstepIds.length === 0) {
      return NextResponse.json({ error: "LステップIDリストが必要です" }, { status: 400 });
    }

    // 重複除去と数値チェック
    const uniqueIds = Array.from(new Set(lstepIds))
      .filter((id) => /^\d+$/.test(id)) // 数値のみ
      .sort(); // ソート（オプション）

    if (uniqueIds.length === 0) {
      return NextResponse.json({ error: "有効なLステップIDがありません" }, { status: 400 });
    }

    // CSV生成（GASと同じ形式）
    const tagColName = `タグ_${TAG_ATTR_ID}`;
    const tagDesc = "発送したよ";

    const csvLines: string[] = [];
    // 1行目: ヘッダー
    csvLines.push("登録ID," + tagColName);
    // 2行目: 説明
    csvLines.push("ID," + tagDesc);
    // 3行目以降: データ
    for (const id of uniqueIds) {
      csvLines.push(`${id},1`);
    }

    const csvContent = csvLines.join("\n");

    // ★ Shift-JISエンコーディングに変換（Lステップ対応）
    const shiftJisBuffer = iconv.encode(csvContent, "shift-jis");
    const uint8Array = new Uint8Array(shiftJisBuffer);

    console.log(`[LstepTagCSV] Generated CSV for ${uniqueIds.length} IDs (Shift-JIS)`);

    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=shift-jis",
        "Content-Disposition": `attachment; filename="lstep_tag_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("[LstepTagCSV] API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
