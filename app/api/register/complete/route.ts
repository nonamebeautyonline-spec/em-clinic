// app/api/register/complete/route.ts
// 電話認証完了時に answerers.tel を保存 + リッチメニュー切り替え
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const LINE_ACCESS_TOKEN =
  process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN ||
  process.env.LINE_NOTIFY_CHANNEL_ACCESS_TOKEN || "";

export async function POST(req: NextRequest) {
  try {
    const { phone } = (await req.json().catch(() => ({}))) as { phone?: string };
    if (!phone) {
      return NextResponse.json({ ok: false, error: "phone_required" }, { status: 400 });
    }

    const lineUserId = req.cookies.get("line_user_id")?.value || "";
    const cookiePatientId = req.cookies.get("__Host-patient_id")?.value
      || req.cookies.get("patient_id")?.value || "";

    let pid: string | null = null;

    // ============================================================
    // ステップ1: Supabaseで電話番号から既存患者を検索
    //   → スマホ/LINE変更時の再紐付け
    // ============================================================
    {
      const { data: byPhone } = await supabaseAdmin
        .from("answerers")
        .select("patient_id")
        .eq("tel", phone)
        .limit(1)
        .maybeSingle();

      if (byPhone?.patient_id) {
        pid = byPhone.patient_id;
        console.log("[register/complete] Found patient by phone in Supabase:", pid);
      }
    }

    // ============================================================
    // ステップ2: cookie の patient_id を使う
    //   → /register で事前発行された新規患者
    // ============================================================
    if (!pid && cookiePatientId) {
      // cookieのpatient_idが実在するか確認
      const { data: byCookie } = await supabaseAdmin
        .from("intake")
        .select("patient_id")
        .eq("patient_id", cookiePatientId)
        .limit(1)
        .maybeSingle();

      if (byCookie?.patient_id) {
        pid = byCookie.patient_id;
        console.log("[register/complete] Using patient from cookie:", pid);
      }
    }

    // どこにも見つからない
    if (!pid) {
      console.error("[register/complete] Patient not found anywhere for phone:", phone.slice(-4));
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 200 });
    }

    // ============================================================
    // ステップ3: 電話番号 + line_user_id を紐付け更新
    // ============================================================

    // answerers テーブルに電話番号を保存
    await supabaseAdmin
      .from("answerers")
      .upsert({
        patient_id: pid,
        tel: phone,
        ...(lineUserId ? { line_id: lineUserId } : {}),
      }, { onConflict: "patient_id" })
      .then(({ error }) => {
        if (error) console.error("[register/complete] Answerers update error:", error.message);
      });

    // intake テーブルに line_id + プロフィール情報を保存
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

      await supabaseAdmin
        .from("intake")
        .update({
          line_id: lineUserId,
          ...(lineDisplayName ? { line_display_name: lineDisplayName } : {}),
          ...(linePictureUrl ? { line_picture_url: linePictureUrl } : {}),
        })
        .eq("patient_id", pid)
        .then(({ error }) => {
          if (error) console.error("[register/complete] Intake update error:", error.message);
          else console.log("[register/complete] line_id + profile updated for", pid);
        });
    }

    // intake の answers に電話番号を追記
    const { data: intakeRow } = await supabaseAdmin
      .from("intake")
      .select("answers")
      .eq("patient_id", pid)
      .maybeSingle();

    if (intakeRow) {
      const existingAnswers = intakeRow.answers || {};
      await supabaseAdmin
        .from("intake")
        .update({
          answers: {
            ...existingAnswers,
            電話番号: phone,
            tel: phone,
          },
        })
        .eq("patient_id", pid);
    }

    // ============================================================
    // ステップ4: リッチメニュー切り替え（verify完了 → 適切なメニューに）
    // ============================================================
    if (LINE_ACCESS_TOKEN && lineUserId) {
      try {
        // ordersがあれば「処方後」、なければ「個人情報入力後」
        const { data: order } = await supabaseAdmin
          .from("orders")
          .select("id")
          .eq("patient_id", pid)
          .limit(1)
          .maybeSingle();

        const menuName = order ? "処方後" : "個人情報入力後";
        const { data: menu } = await supabaseAdmin
          .from("rich_menus")
          .select("line_rich_menu_id")
          .eq("name", menuName)
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
