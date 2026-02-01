import { NextRequest, NextResponse } from "next/server";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

interface ReminderData {
  lstep_id: string;
  patient_id: string;
  patient_name: string;
  reserved_time: string;
  phone: string;
  message: string;
}

export async function POST(req: NextRequest) {
  try {
    // 認証チェック
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { reminders, date } = body as { reminders: ReminderData[]; date: string };

    if (!reminders || !Array.isArray(reminders) || reminders.length === 0) {
      return NextResponse.json({ error: "リマインドデータが必要です" }, { status: 400 });
    }

    console.log(`[ReminderCSV] Generating CSV for ${reminders.length} reminders`);

    // CSV生成（Lステップメッセージ配信形式）
    const csvLines: string[] = [];

    // 1行目: ヘッダー
    csvLines.push("登録ID,メッセージ1");

    // 2行目以降: データ
    for (const reminder of reminders) {
      // CSVエスケープ処理（カンマやダブルクォートを含む場合）
      const escapeCSV = (str: string) => {
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      csvLines.push(`${reminder.lstep_id},${escapeCSV(reminder.message)}`);
    }

    const csvContent = csvLines.join("\n");

    // ファイル名に日付を含める
    const filename = `reminder_${date.replace(/-/g, "")}.csv`;

    console.log(`[ReminderCSV] Generated CSV: ${filename}, ${reminders.length} rows`);

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
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
