// app/api/register/complete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const GAS_REGISTER_URL = process.env.GAS_REGISTER_URL;

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
    // ステップ1: GASで既存患者を検索（既存Lステップ経由の患者用）
    // ============================================================
    if (GAS_REGISTER_URL) {
      try {
        const gasRes = await fetch(GAS_REGISTER_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, line_user_id: lineUserId }),
          cache: "no-store",
        });

        if (gasRes.ok) {
          const text = await gasRes.text().catch(() => "");
          let data: any = {};
          try { data = text ? JSON.parse(text) : {}; } catch {}

          const gasPid = data?.pid ?? data?.patient_id ?? data?.Patient_ID ?? null;
          if (gasPid && !(data?.ok === false && (data?.message === "not_found" || data?.error === "not_found"))) {
            pid = String(gasPid);
            console.log("[register/complete] Found patient via GAS:", pid);
          }
        }
      } catch (e) {
        console.error("[register/complete] GAS lookup failed:", e);
      }
    }

    // ============================================================
    // ステップ2: Supabaseで電話番号から既存患者を検索
    //   → スマホ/LINE変更時の再紐付け
    // ============================================================
    if (!pid) {
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
    // ステップ3: cookie の patient_id を使う
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
    // ステップ4: 電話番号 + line_user_id を紐付け更新
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

    // intake テーブルに line_id を保存
    if (lineUserId) {
      await supabaseAdmin
        .from("intake")
        .update({ line_id: lineUserId })
        .eq("patient_id", pid)
        .then(({ error }) => {
          if (error) console.error("[register/complete] Intake line_id update error:", error.message);
          else console.log("[register/complete] line_id updated for", pid);
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
