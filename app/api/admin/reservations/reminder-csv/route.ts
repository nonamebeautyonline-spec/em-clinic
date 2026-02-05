import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as iconv from "iconv-lite";
import { verifyAdminAuth } from "@/lib/admin-auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ReminderData {
  lstep_id: string;
  patient_id: string;
  patient_name: string;
  reserved_time: string;
  phone: string;
  message: string;
  doctor_status: string;
  call_status: string;
  prescription_menu: string;
}

export async function POST(req: NextRequest) {
  try {
    // 認証チェック（クッキーまたはBearerトークン）
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { reminders, date } = body as { reminders: ReminderData[]; date: string };

    if (!reminders || !Array.isArray(reminders) || reminders.length === 0) {
      return NextResponse.json({ error: "リマインドデータが必要です" }, { status: 400 });
    }

    console.log(`[ReminderCSV] Generating CSV for ${reminders.length} reminders`);

    // CSV生成（Lステップタグ付与形式）
    const TAG_ATTR_ID = "9321522"; // 診療リマインドタグID
    const tagColName = `タグ_${TAG_ATTR_ID}`;
    const tagDesc = "診療リマインド";

    const csvLines: string[] = [];

    // 1行目: ヘッダー
    csvLines.push("登録ID," + tagColName);
    // 2行目: 説明
    csvLines.push("ID," + tagDesc);
    // 3行目以降: データ
    for (const reminder of reminders) {
      csvLines.push(`${reminder.lstep_id},1`);
    }

    const csvContent = csvLines.join("\n");

    // ★ Shift-JISエンコーディングに変換（Lステップ対応）
    const shiftJisBuffer = iconv.encode(csvContent, "shift-jis");
    const uint8Array = new Uint8Array(shiftJisBuffer);

    // ファイル名に日付を含める
    const filename = `reminder_tag_${date.replace(/-/g, "")}.csv`;

    console.log(`[ReminderCSV] Generated CSV: ${filename}, ${reminders.length} rows (Shift-JIS)`);

    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=shift-jis",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[ReminderCSV] API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
