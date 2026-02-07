import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * 個人情報フォーム保存API
 * - 電話番号は不要（SMS認証は /mypage/init で行う）
 * - patient_id を Supabase 連番で自動発行
 * - line_user_id は cookie から取得
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const { name, name_kana, sex, birthday } = body as {
      name?: string;
      name_kana?: string;
      sex?: string;
      birthday?: string;
    };

    // バリデーション
    if (!name?.trim()) {
      return NextResponse.json({ error: "氏名は必須です" }, { status: 400 });
    }
    if (!name_kana?.trim()) {
      return NextResponse.json({ error: "氏名(カナ)は必須です" }, { status: 400 });
    }
    if (!sex) {
      return NextResponse.json({ error: "性別は必須です" }, { status: 400 });
    }
    if (!birthday) {
      return NextResponse.json({ error: "生年月日は必須です" }, { status: 400 });
    }

    const lineUserId = req.cookies.get("line_user_id")?.value || "";

    // 1) line_user_id で既存患者を検索（LINE再ログイン時のデータ更新用）
    let patientId: string | null = null;

    if (lineUserId) {
      const { data: existingByLine } = await supabaseAdmin
        .from("intake")
        .select("patient_id")
        .eq("line_id", lineUserId)
        .limit(1)
        .maybeSingle();

      if (existingByLine?.patient_id) {
        patientId = existingByLine.patient_id;
        console.log("[register/personal-info] Existing patient by line_id:", patientId);
      }
    }

    // 2) patient_id cookie から既存患者を取得
    if (!patientId) {
      const cookiePid = req.cookies.get("__Host-patient_id")?.value
        || req.cookies.get("patient_id")?.value;
      if (cookiePid) {
        patientId = cookiePid;
        console.log("[register/personal-info] Existing patient from cookie:", patientId);
      }
    }

    // 3) 新規患者 → patient_id を自動発行（既存最大値 + 1）
    if (!patientId) {
      const { data: maxRow } = await supabaseAdmin
        .from("answerers")
        .select("patient_id")
        .order("patient_id", { ascending: false })
        .limit(10);

      // 数値IDの最大値を取得
      let maxNumericId = 10000;
      if (maxRow) {
        for (const row of maxRow) {
          const num = Number(row.patient_id);
          if (!isNaN(num) && num > maxNumericId) {
            maxNumericId = num;
          }
        }
      }
      patientId = String(maxNumericId + 1);
      console.log("[register/personal-info] New patient_id:", patientId);
    }

    // 4) Supabase answerers テーブルに保存
    const { error: answererError } = await supabaseAdmin
      .from("answerers")
      .upsert({
        patient_id: patientId,
        name: name.trim(),
        name_kana: name_kana.trim(),
        sex,
        birthday,
        line_id: lineUserId || null,
      }, { onConflict: "patient_id" });

    if (answererError) {
      console.error("[register/personal-info] Answerers upsert failed:", answererError.message);
    }

    // 5) Supabase intake テーブルに保存
    const answers = {
      氏名: name.trim(),
      name: name.trim(),
      カナ: name_kana.trim(),
      name_kana: name_kana.trim(),
      性別: sex,
      sex,
      生年月日: birthday,
      birth: birthday,
    };

    const { error: intakeError } = await supabaseAdmin
      .from("intake")
      .upsert({
        patient_id: patientId,
        patient_name: name.trim(),
        line_id: lineUserId || null,
        answers,
      }, { onConflict: "patient_id" });

    if (intakeError) {
      console.error("[register/personal-info] Intake upsert failed:", intakeError.message);
    }

    // 6) Cookie設定 + レスポンス
    const res = NextResponse.json({ ok: true, patient_id: patientId });

    res.cookies.set("__Host-patient_id", patientId, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    res.cookies.set("patient_id", patientId, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    return res;
  } catch (error: any) {
    console.error("[register/personal-info] Unhandled error:", error?.message || error);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
