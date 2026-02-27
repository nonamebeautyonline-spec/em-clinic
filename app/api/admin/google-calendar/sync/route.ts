// app/api/admin/google-calendar/sync/route.ts
// Google Calendar 同期API
// POST: 指定医師のGoogleカレンダーを双方向同期
//   1. Googleカレンダーのイベントを取得 → doctor_date_overrides に「外部予定あり」として反映
//   2. em-clinicの予約 → Googleカレンダーにイベント追加

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import {
  listEvents,
  insertEvent,
  refreshAccessToken,
  calculateTokenExpiry,
  type GoogleCalendarEventInput,
} from "@/lib/google-calendar";

export async function POST(req: NextRequest) {
  try {
    // 管理者認証チェック
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json({ error: "テナントIDが取得できません" }, { status: 400 });
    }

    const body = await req.json();
    const { doctor_id } = body;

    if (!doctor_id) {
      return NextResponse.json(
        { error: "doctor_id は必須です" },
        { status: 400 }
      );
    }

    // 医師情報とGoogle連携トークンを取得
    const { data: doctor, error: doctorError } = await withTenant(
      supabaseAdmin
        .from("doctors")
        .select("doctor_id, doctor_name, google_calendar_id, google_access_token, google_refresh_token, google_token_expires_at")
        .eq("doctor_id", doctor_id)
        .single(),
      tenantId
    );

    if (doctorError || !doctor) {
      return NextResponse.json(
        { error: "医師が見つかりません" },
        { status: 404 }
      );
    }

    if (!doctor.google_refresh_token) {
      return NextResponse.json(
        { error: "Googleカレンダーが連携されていません。先にOAuth2認証を行ってください" },
        { status: 400 }
      );
    }

    // トークン有効期限チェック → 期限切れならリフレッシュ
    let accessToken = doctor.google_access_token;
    const expiresAt = doctor.google_token_expires_at
      ? new Date(doctor.google_token_expires_at)
      : new Date(0);

    if (expiresAt <= new Date()) {
      console.log(`[Google Calendar Sync] トークン期限切れ、リフレッシュ中: doctor_id=${doctor_id}`);
      try {
        const newTokens = await refreshAccessToken(doctor.google_refresh_token);
        accessToken = newTokens.access_token;
        const newExpiresAt = calculateTokenExpiry(newTokens.expires_in);

        // 新しいトークンをDBに保存
        await supabaseAdmin
          .from("doctors")
          .update({
            google_access_token: accessToken,
            google_token_expires_at: newExpiresAt,
            // リフレッシュトークンが新しく返された場合は更新
            ...(newTokens.refresh_token
              ? { google_refresh_token: newTokens.refresh_token }
              : {}),
          })
          .eq("doctor_id", doctor_id)
          .eq("tenant_id", tenantId);
      } catch (refreshError) {
        console.error("[Google Calendar Sync] トークンリフレッシュ失敗:", refreshError);
        return NextResponse.json(
          { error: "Googleトークンのリフレッシュに失敗しました。再度OAuth2認証を行ってください" },
          { status: 401 }
        );
      }
    }

    const calendarId = doctor.google_calendar_id || "primary";

    // 同期範囲: 今日から30日後まで
    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstNow = new Date(now.getTime() + jstOffset);
    const todayStr = jstNow.toISOString().slice(0, 10);
    const thirtyDaysLater = new Date(jstNow.getTime() + 30 * 24 * 60 * 60 * 1000);
    const endStr = thirtyDaysLater.toISOString().slice(0, 10);

    const timeMin = `${todayStr}T00:00:00+09:00`;
    const timeMax = `${endStr}T23:59:59+09:00`;

    // =============================================
    // 1. Google → em-clinic: 外部予定を doctor_date_overrides に反映
    // =============================================
    let googleEvents;
    try {
      googleEvents = await listEvents(accessToken!, calendarId, timeMin, timeMax);
    } catch (listError) {
      console.error("[Google Calendar Sync] イベント取得失敗:", listError);
      return NextResponse.json(
        { error: "Googleカレンダーのイベント取得に失敗しました" },
        { status: 502 }
      );
    }

    // Googleカレンダーの予定（キャンセル済み除外）を日付ごとに集約
    const externalEventsByDate = new Map<string, string[]>();
    for (const event of googleEvents) {
      if (event.status === "cancelled") continue;

      // 終日イベントはdate、時間指定はdateTimeから日付を取得
      const eventDate = event.start.date || event.start.dateTime?.slice(0, 10);
      if (!eventDate) continue;

      const summaries = externalEventsByDate.get(eventDate) || [];
      summaries.push(event.summary || "（無題）");
      externalEventsByDate.set(eventDate, summaries);
    }

    // 外部予定を doctor_date_overrides に反映
    let overridesCreated = 0;
    for (const [date, summaries] of externalEventsByDate) {
      // 既にGoogleカレンダー由来のoverrideがある場合は更新、なければ挿入
      const { data: existing } = await withTenant(
        supabaseAdmin
          .from("doctor_date_overrides")
          .select("id")
          .eq("doctor_id", doctor_id)
          .eq("date", date)
          .eq("type", "gcal_block")
          .limit(1),
        tenantId
      );

      const note = `Google予定: ${summaries.join(", ")}`;

      if (existing && existing.length > 0) {
        // 既存のoverrideを更新
        await supabaseAdmin
          .from("doctor_date_overrides")
          .update({ note })
          .eq("id", existing[0].id);
      } else {
        // 新規にoverrideを挿入（type: "gcal_block" で外部予定を識別）
        await withTenant(
          supabaseAdmin
            .from("doctor_date_overrides")
            .insert({
              doctor_id,
              date,
              type: "gcal_block",
              note,
              tenant_id: tenantId,
            }),
          tenantId
        );
        overridesCreated++;
      }
    }

    // =============================================
    // 2. em-clinic → Google: 予約をGoogleカレンダーに追加
    // =============================================
    const { data: reservations } = await withTenant(
      supabaseAdmin
        .from("reservations")
        .select("reserve_id, patient_name, reserved_date, reserved_time, status, prescription_menu")
        .gte("reserved_date", todayStr)
        .lte("reserved_date", endStr)
        .neq("status", "canceled"),
      tenantId
    );

    // 既存のGoogleカレンダーイベントのサマリーからreserve_idを検出（重複追加防止）
    const existingReserveIds = new Set<string>();
    for (const event of googleEvents) {
      // イベントのdescriptionにreserve_idを含めているものを検出
      if (event.description) {
        const match = event.description.match(/reserve_id:([A-Za-z0-9_-]+)/);
        if (match) {
          existingReserveIds.add(match[1]);
        }
      }
    }

    let eventsCreated = 0;
    for (const reservation of reservations || []) {
      // 既にGoogleカレンダーに追加済みの予約はスキップ
      if (existingReserveIds.has(reservation.reserve_id)) continue;

      // 予約時間をISO8601に変換
      const startDateTime = `${reservation.reserved_date}T${reservation.reserved_time}+09:00`;
      // 診察時間は30分と仮定
      const startDate = new Date(`${reservation.reserved_date}T${reservation.reserved_time}+09:00`);
      const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);
      const endDateTime = endDate.toISOString().replace("Z", "+09:00");

      const eventInput: GoogleCalendarEventInput = {
        summary: `[予約] ${reservation.patient_name || "名前なし"}`,
        description: `reserve_id:${reservation.reserve_id}\n処方: ${reservation.prescription_menu || "未定"}\nステータス: ${reservation.status}`,
        start: {
          dateTime: startDateTime,
          timeZone: "Asia/Tokyo",
        },
        end: {
          dateTime: endDateTime,
          timeZone: "Asia/Tokyo",
        },
      };

      try {
        await insertEvent(accessToken!, calendarId, eventInput);
        eventsCreated++;
      } catch (insertError) {
        // 個別イベントの追加失敗はログだけ出して継続
        console.error(
          `[Google Calendar Sync] イベント追加失敗 reserve_id=${reservation.reserve_id}:`,
          insertError
        );
      }
    }

    console.log(
      `[Google Calendar Sync] 同期完了: doctor_id=${doctor_id}, ` +
      `Google→em-clinic: ${overridesCreated}件, em-clinic→Google: ${eventsCreated}件`
    );

    return NextResponse.json({
      ok: true,
      doctor_id,
      sync: {
        google_to_clinic: {
          events_found: googleEvents.length,
          overrides_created: overridesCreated,
        },
        clinic_to_google: {
          reservations_found: (reservations || []).length,
          events_created: eventsCreated,
          already_synced: existingReserveIds.size,
        },
      },
    });
  } catch (error) {
    console.error("[Google Calendar Sync] エラー:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
