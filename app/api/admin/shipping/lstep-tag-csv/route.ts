import { NextRequest, NextResponse } from "next/server";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const TAG_ATTR_ID = "9217653"; // タグID（GASと同じ）

export async function POST(req: NextRequest) {
  try {
    // 認証チェック
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    // Shift-JISエンコード（ブラウザでダウンロード時に変換）
    // ここではUTF-8で返し、フロントエンドでShift-JIS変換する
    // または、バックエンドでShift-JISに変換して返すことも可能

    console.log(`[LstepTagCSV] Generated CSV for ${uniqueIds.length} IDs`);

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
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
