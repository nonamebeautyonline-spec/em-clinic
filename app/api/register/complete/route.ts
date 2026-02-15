// app/api/register/complete/route.ts
// 電話認証完了時に answerers.tel を保存 + リッチメニュー切り替え
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizeJPPhone } from "@/lib/phone";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { getSettingOrEnv } from "@/lib/settings";

export async function POST(req: NextRequest) {
  try {
    const tenantId = resolveTenantId(req);
    const LINE_ACCESS_TOKEN = await getSettingOrEnv("line", "channel_access_token", "LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN", tenantId ?? undefined) || "";
    const { phone: rawPhone } = (await req.json().catch(() => ({}))) as { phone?: string };
    if (!rawPhone) {
      return NextResponse.json({ ok: false, error: "phone_required" }, { status: 400 });
    }
    // +81形式 → 0始まり国内形式に正規化
    const phone = normalizeJPPhone(rawPhone);

    const lineUserId = req.cookies.get("line_user_id")?.value || "";
    const cookiePatientId = req.cookies.get("__Host-patient_id")?.value
      || req.cookies.get("patient_id")?.value || "";

    let pid: string | null = null;

    // ============================================================
    // ステップ1: LINE UID で patients を検索（最優先）
    //   → LINE連携済みユーザーの確実な紐付け
    // ============================================================
    if (!pid && lineUserId) {
      const { data: byLine } = await withTenant(supabaseAdmin
        .from("patients")
        .select("patient_id")
        .eq("line_id", lineUserId), tenantId)
        .limit(1)
        .maybeSingle();

      if (byLine?.patient_id) {
        pid = byLine.patient_id;
        console.log("[register/complete] Found patient by LINE UID:", pid);
      }
    }

    // ============================================================
    // ステップ2: cookie の patient_id を使う
    //   → /register で事前発行された新規患者
    // ============================================================
    if (!pid && cookiePatientId) {
      const { data: byCookie } = await withTenant(supabaseAdmin
        .from("intake")
        .select("patient_id")
        .eq("patient_id", cookiePatientId), tenantId)
        .limit(1)
        .maybeSingle();

      if (byCookie?.patient_id) {
        pid = byCookie.patient_id;
        console.log("[register/complete] Using patient from cookie:", pid);
      }
    }

    // ============================================================
    // ステップ3: 電話番号で answerers を検索（フォールバック）
    //   → スマホ/LINE変更時の再紐付け
    // ============================================================
    if (!pid) {
      const { data: byPhone } = await withTenant(supabaseAdmin
        .from("patients")
        .select("patient_id")
        .eq("tel", phone), tenantId)
        .limit(1)
        .maybeSingle();

      if (byPhone?.patient_id) {
        pid = byPhone.patient_id;
        console.log("[register/complete] Found patient by phone:", pid);
      }
    }

    // どこにも見つからない
    if (!pid) {
      console.error("[register/complete] Patient not found. lineUid:", lineUserId ? lineUserId.slice(-6) : "none", "cookie:", cookiePatientId || "none", "phone:", phone.slice(-4));
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 200 });
    }

    // ============================================================
    // ステップ3: 電話番号 + line_user_id を紐付け更新
    // ============================================================

    // answerers テーブルに電話番号を保存（select→insert/update パターン）
    const { data: existingAnswerer } = await withTenant(supabaseAdmin
      .from("patients")
      .select("patient_id")
      .eq("patient_id", pid), tenantId)
      .maybeSingle();

    if (existingAnswerer) {
      const { error } = await withTenant(supabaseAdmin
        .from("patients")
        .update({
          tel: phone,
          ...(lineUserId ? { line_id: lineUserId } : {}),
        })
        .eq("patient_id", pid), tenantId);
      if (error) console.error("[register/complete] Answerers update error:", error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("patients")
        .insert({
          patient_id: pid,
          tel: phone,
          ...(lineUserId ? { line_id: lineUserId } : {}),
          ...tenantPayload(tenantId),
        });
      if (error) console.error("[register/complete] Answerers insert error:", error.message);
    }

    // intake テーブルにプロフィール情報を保存（line_id は patients が正）
    if (lineUserId) {
      let lineDisplayName: string | null = null;
      let linePictureUrl: string | null = null;
      if (LINE_ACCESS_TOKEN) {
        try {
          const profileRes = await fetch(`https://api.line.me/v2/bot/profile/${lineUserId}`, {
            headers: { Authorization: `Bearer ${LINE_ACCESS_TOKEN}` },
            cache: "no-store",
          });
          if (profileRes.ok) {
            const profile = await profileRes.json();
            lineDisplayName = profile.displayName || null;
            linePictureUrl = profile.pictureUrl || null;
          }
        } catch (e) {
          console.error("[register/complete] LINE profile fetch error:", e);
        }
      }

      if (lineDisplayName || linePictureUrl) {
        await withTenant(supabaseAdmin
          .from("patients")
          .update({
            ...(lineDisplayName ? { line_display_name: lineDisplayName } : {}),
            ...(linePictureUrl ? { line_picture_url: linePictureUrl } : {}),
          })
          .eq("patient_id", pid), tenantId)
          .then(({ error }) => {
            if (error) console.error("[register/complete] Patient profile update error:", error.message);
            else console.log("[register/complete] profile updated for", pid);
          });
      }
    }

    // intake の answers に電話番号を追記（最新レコードを対象）
    const { data: intakeRow } = await withTenant(supabaseAdmin
      .from("intake")
      .select("id, answers")
      .eq("patient_id", pid), tenantId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (intakeRow) {
      const existingAnswers = (intakeRow.answers as Record<string, unknown>) || {};
      const { error } = await withTenant(supabaseAdmin
        .from("intake")
        .update({
          answers: {
            ...existingAnswers,
            電話番号: phone,
            tel: phone,
          },
        })
        .eq("id", intakeRow.id), tenantId);
      if (error) console.error("[register/complete] Intake answers update error:", error.message);
    }

    // ============================================================
    // ステップ4: リッチメニュー切り替え（verify完了 → 適切なメニューに）
    // ============================================================
    if (LINE_ACCESS_TOKEN && lineUserId) {
      try {
        // ordersがあれば「処方後」、なければ「個人情報入力後」
        const { data: order } = await withTenant(supabaseAdmin
          .from("orders")
          .select("id")
          .eq("patient_id", pid), tenantId)
          .limit(1)
          .maybeSingle();

        const menuName = order ? "処方後" : "個人情報入力後";
        const { data: menu } = await withTenant(supabaseAdmin
          .from("rich_menus")
          .select("line_rich_menu_id")
          .eq("name", menuName), tenantId)
          .maybeSingle();

        if (menu?.line_rich_menu_id) {
          const currentRes = await fetch(`https://api.line.me/v2/bot/user/${lineUserId}/richmenu`, {
            headers: { Authorization: `Bearer ${LINE_ACCESS_TOKEN}` },
          });
          const current = currentRes.ok ? await currentRes.json() : null;
          if (current?.richMenuId !== menu.line_rich_menu_id) {
            await fetch(`https://api.line.me/v2/bot/user/${lineUserId}/richmenu/${menu.line_rich_menu_id}`, {
              method: "POST",
              headers: { Authorization: `Bearer ${LINE_ACCESS_TOKEN}` },
            });
            console.log(`[register/complete] switched rich menu to ${menuName} for ${pid}`);
          }
        }
      } catch (err) {
        console.error("[register/complete] rich menu switch error:", err);
      }
    }

    // ============================================================
    // ステップ5: Cookie設定 + レスポンス
    // ============================================================
    const res = NextResponse.json({ ok: true }, { status: 200 });

    res.cookies.set("__Host-patient_id", pid, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    res.cookies.set("patient_id", pid, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    return res;
  } catch (e) {
    console.error("[register/complete] Exception:", e);
    return NextResponse.json({ ok: false, error: "register_failed" }, { status: 500 });
  }
}
