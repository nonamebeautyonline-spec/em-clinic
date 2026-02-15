import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { linkRichMenuToUser } from "@/lib/line-richmenu";

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
    let oldLinePatientId: string | null = null; // LINE_プレフィックスの仮IDを保持

    if (lineUserId) {
      const { data: existingByLine } = await supabaseAdmin
        .from("intake")
        .select("patient_id")
        .eq("line_id", lineUserId)
        .limit(1)
        .maybeSingle();

      if (existingByLine?.patient_id) {
        if (existingByLine.patient_id.startsWith("LINE_")) {
          // LINE_仮IDの場合は正式IDを新規発番する（後でデータ移行）
          oldLinePatientId = existingByLine.patient_id;
          console.log("[register/personal-info] Found LINE_ temp ID:", oldLinePatientId, "-> will assign new numeric ID");
        } else {
          patientId = existingByLine.patient_id;
          console.log("[register/personal-info] Existing patient by line_id:", patientId);
        }
      }
    }

    // 2) patient_id cookie から既存患者を取得
    if (!patientId) {
      const cookiePid = req.cookies.get("__Host-patient_id")?.value
        || req.cookies.get("patient_id")?.value;
      if (cookiePid && !cookiePid.startsWith("LINE_")) {
        patientId = cookiePid;
        console.log("[register/personal-info] Existing patient from cookie:", patientId);
      }
    }

    // 3) 新規患者 → patient_id を自動発行（既存最大値 + 1）
    if (!patientId) {
      // LINE_*プレフィックスの仮IDを除外して数値IDのみ取得
      // patient_idはテキスト型のため、LINE_*が降順ソートで先頭に来てしまう問題を回避
      const { data: maxRow } = await supabaseAdmin
        .from("answerers")
        .select("patient_id")
        .not("patient_id", "like", "LINE_%")
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

    // 4) LINE_仮IDがある場合、全テーブルの patient_id を実IDに統合更新
    if (oldLinePatientId && patientId) {
      console.log("[register/personal-info] Migrating", oldLinePatientId, "->", patientId);
      const allTables = ["intake", "answerers", "message_log", "patient_tags", "patient_marks", "friend_field_values"];
      await Promise.all(
        allTables.map(async (table) => {
          const { error } = await supabaseAdmin
            .from(table)
            .update({ patient_id: patientId })
            .eq("patient_id", oldLinePatientId);
          if (error) {
            console.error(`[register/personal-info] Migration ${table} failed:`, error.message);
          }
        })
      );
      console.log("[register/personal-info] Migration complete:", oldLinePatientId, "->", patientId);
    }

    // 5) answerers に個人情報を上書き保存（既存の tel 等はそのまま）
    const { data: existingAnswerer } = await supabaseAdmin
      .from("answerers")
      .select("patient_id")
      .eq("patient_id", patientId)
      .maybeSingle();

    if (existingAnswerer) {
      const { error } = await supabaseAdmin
        .from("answerers")
        .update({
          name: name.trim(),
          name_kana: name_kana.trim(),
          sex,
          birthday,
          line_id: lineUserId || null,
        })
        .eq("patient_id", patientId);
      if (error) console.error("[register/personal-info] Answerers update failed:", error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("answerers")
        .insert({
          patient_id: patientId,
          name: name.trim(),
          name_kana: name_kana.trim(),
          sex,
          birthday,
          line_id: lineUserId || null,
        });
      if (error) console.error("[register/personal-info] Answerers insert failed:", error.message);
    }

    // 6) intake の answers に個人情報をマージ（既存の問診・予約データはそのまま）
    const { data: existingIntake } = await supabaseAdmin
      .from("intake")
      .select("id, answers")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const personalAnswers = {
      氏名: name.trim(),
      name: name.trim(),
      カナ: name_kana.trim(),
      name_kana: name_kana.trim(),
      性別: sex,
      sex,
      生年月日: birthday,
      birth: birthday,
    };

    let intakeError: any = null;
    if (existingIntake) {
      const oldAnswers = (existingIntake.answers as Record<string, unknown>) || {};
      const { error } = await supabaseAdmin
        .from("intake")
        .update({
          patient_name: name.trim(),
          line_id: lineUserId || null,
          answers: { ...oldAnswers, ...personalAnswers },
        })
        .eq("id", existingIntake.id);
      intakeError = error;
    } else {
      const { error } = await supabaseAdmin
        .from("intake")
        .insert({
          patient_id: patientId,
          patient_name: name.trim(),
          line_id: lineUserId || null,
          answers: personalAnswers,
        });
      intakeError = error;
    }

    if (intakeError) {
      console.error("[register/personal-info] Intake upsert failed:", intakeError.message);
    }

    // 7) 「個人情報提出ずみ」タグを付与（tag_id=1）
    const { error: tagError } = await supabaseAdmin
      .from("patient_tags")
      .upsert(
        { patient_id: patientId, tag_id: 1, assigned_by: "register" },
        { onConflict: "patient_id,tag_id" }
      );
    if (tagError) {
      console.error("[register/personal-info] Tag assign failed:", tagError.message);
    }

    // 8) リッチメニューを「個人情報入力後」に切り替え
    if (lineUserId) {
      const { data: postMenu } = await supabaseAdmin
        .from("rich_menus")
        .select("line_rich_menu_id")
        .eq("name", "個人情報入力後")
        .maybeSingle();

      if (postMenu?.line_rich_menu_id) {
        const linked = await linkRichMenuToUser(lineUserId, postMenu.line_rich_menu_id);
        if (linked) {
          console.log("[register/personal-info] Rich menu switched to 個人情報入力後 for", lineUserId);
        } else {
          console.error("[register/personal-info] Failed to switch rich menu for", lineUserId);
        }
      }
    }

    // 9) Cookie設定 + レスポンス
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
