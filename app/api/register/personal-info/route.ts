import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { linkRichMenuToUser } from "@/lib/line-richmenu";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { MERGE_TABLES } from "@/lib/merge-tables";

/**
 * 個人情報フォーム保存API
 * - 電話番号は不要（SMS認証は /mypage/init で行う）
 * - patient_id を Supabase 連番で自動発行
 * - line_user_id は cookie から取得
 */
export async function POST(req: NextRequest) {
  try {
    const tenantId = resolveTenantId(req);
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
      const { data: existingByLine } = await withTenant(supabaseAdmin
        .from("patients")
        .select("patient_id")
        .eq("line_id", lineUserId), tenantId)
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

    // 3) 新規患者 → patient_id を自動発行（SEQUENCE → MAX+1 フォールバック）
    if (!patientId) {
      // SEQUENCE（next_patient_id RPC）で採番（レースコンディション防止）
      const { data: seqId, error: seqError } = await supabaseAdmin.rpc("next_patient_id");
      if (!seqError && seqId) {
        patientId = seqId;
        console.log("[register/personal-info] New patient_id (SEQUENCE):", patientId);
      } else {
        // フォールバック: 従来の MAX+1 方式
        if (seqError) console.warn("[register/personal-info] SEQUENCE fallback:", seqError.message);
        const { data: maxRow } = await withTenant(supabaseAdmin
          .from("patients")
          .select("patient_id")
          .not("patient_id", "like", "LINE_%")
          .not("patient_id", "like", "TEST_%"), tenantId)
          .order("patient_id", { ascending: false })
          .limit(10);

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
        console.log("[register/personal-info] New patient_id (MAX+1 fallback):", patientId);
      }
    }

    // 4) LINE_仮IDがある場合、全テーブルの patient_id を実IDに統合更新
    if (oldLinePatientId && patientId) {
      console.log("[register/personal-info] Migrating", oldLinePatientId, "->", patientId);
      const allTables = ["intake", "patients", ...MERGE_TABLES] as const;
      await Promise.all(
        allTables.map(async (table) => {
          const { error } = await withTenant(supabaseAdmin
            .from(table)
            .update({ patient_id: patientId })
            .eq("patient_id", oldLinePatientId), tenantId);
          if (error && error.code !== "23505") {
            console.error(`[register/personal-info] Migration ${table} failed:`, error.message);
          }
        })
      );
      console.log("[register/personal-info] Migration complete:", oldLinePatientId, "->", patientId);
    }

    // 5) answerers に個人情報を上書き保存（既存の tel 等はそのまま）
    const { data: existingAnswerer } = await withTenant(supabaseAdmin
      .from("patients")
      .select("patient_id")
      .eq("patient_id", patientId), tenantId)
      .maybeSingle();

    if (existingAnswerer) {
      const { error } = await withTenant(supabaseAdmin
        .from("patients")
        .update({
          name: name.trim(),
          name_kana: name_kana.trim(),
          sex,
          birthday,
          // line_id は取得できた場合のみ更新（空文字で既存値を null に上書きしない）
          ...(lineUserId ? { line_id: lineUserId } : {}),
        })
        .eq("patient_id", patientId), tenantId);
      if (error) console.error("[register/personal-info] Answerers update failed:", error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("patients")
        .insert({
          patient_id: patientId,
          name: name.trim(),
          name_kana: name_kana.trim(),
          sex,
          birthday,
          line_id: lineUserId || null,
          ...tenantPayload(tenantId),
        });
      if (error) {
        if (error.code === "23505") {
          // UNIQUE違反 → patient_id 衝突（レースコンディション）→ UPDATE にフォールバック
          console.warn("[register/personal-info] UNIQUE violation on insert, falling back to update:", error.message);
          const { error: updateErr } = await withTenant(supabaseAdmin
            .from("patients")
            .update({
              name: name.trim(),
              name_kana: name_kana.trim(),
              sex,
              birthday,
              ...(lineUserId ? { line_id: lineUserId } : {}),
            })
            .eq("patient_id", patientId), tenantId);
          if (updateErr) console.error("[register/personal-info] Fallback update failed:", updateErr.message);
        } else {
          console.error("[register/personal-info] Answerers insert failed:", error.message);
        }
      }
    }

    // 6) intake の answers に個人情報をマージ（既存の問診・予約データはそのまま）
    const { data: existingIntake } = await withTenant(supabaseAdmin
      .from("intake")
      .select("id, answers")
      .eq("patient_id", patientId), tenantId)
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
      const { error } = await withTenant(supabaseAdmin
        .from("intake")
        .update({
          answers: { ...oldAnswers, ...personalAnswers },
        })
        .eq("id", existingIntake.id), tenantId);
      intakeError = error;
    } else {
      const { error } = await supabaseAdmin
        .from("intake")
        .insert({
          patient_id: patientId,
          answers: personalAnswers,
          ...tenantPayload(tenantId),
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
        { patient_id: patientId, tag_id: 1, assigned_by: "register", ...tenantPayload(tenantId) },
        { onConflict: "patient_id,tag_id" }
      );
    if (tagError) {
      console.error("[register/personal-info] Tag assign failed:", tagError.message);
    }

    // 8) リッチメニューを「個人情報入力後」に切り替え
    if (lineUserId) {
      const { data: postMenu } = await withTenant(supabaseAdmin
        .from("rich_menus")
        .select("line_rich_menu_id")
        .eq("name", "個人情報入力後"), tenantId)
        .maybeSingle();

      if (postMenu?.line_rich_menu_id) {
        const linked = await linkRichMenuToUser(lineUserId, postMenu.line_rich_menu_id, tenantId ?? undefined);
        if (linked) {
          console.log("[register/personal-info] Rich menu switched to 個人情報入力後 for", lineUserId);
        } else {
          console.error("[register/personal-info] Failed to switch rich menu for", lineUserId);
        }
      }
    }

    // 9) Cookie設定 + レスポンス
    if (!patientId) {
      return NextResponse.json({ ok: false, error: "患者IDの取得に失敗しました" }, { status: 500 });
    }
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
