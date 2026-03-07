// app/api/admin/google-calendar/webhook/route.ts
// Google Calendar push通知（webhook）受信エンドポイント
// GCalでイベント変更が発生するとGoogleからPOSTが送信される

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { withTenant } from "@/lib/tenant";
import { processGcalChanges } from "@/lib/google-calendar-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // Google push通知のヘッダーからチャンネル情報を取得
    const channelId = req.headers.get("x-goog-channel-id");
    const resourceState = req.headers.get("x-goog-resource-state");

    // sync通知（チャンネル確認応答）は200を返すだけ
    if (resourceState === "sync") {
      return NextResponse.json({ ok: true });
    }

    if (!channelId) {
      return NextResponse.json({ error: "チャンネルIDなし" }, { status: 400 });
    }

    // channelIdからテナントを特定
    const { data: syncToken } = await supabaseAdmin
      .from("google_calendar_sync_tokens")
      .select("tenant_id")
      .eq("channel_id", channelId)
      .maybeSingle();

    if (!syncToken) {
      console.warn("[gcal-webhook] 不明なチャンネルID:", channelId);
      return NextResponse.json({ ok: true }); // 200を返して再送防止
    }

    // GCalの変更を処理
    console.log(
      `[gcal-webhook] push通知受信: tenant=${syncToken.tenant_id}, channel=${channelId}, state=${resourceState}`
    );

    const result = await processGcalChanges(syncToken.tenant_id);

    console.log(
      `[gcal-webhook] 処理完了: processed=${result.processed}, errors=${result.errors}`
    );

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[gcal-webhook] エラー:", err);
    // Googleへは200を返してリトライ防止（エラーはログで追跡）
    return NextResponse.json({ ok: true });
  }
}
