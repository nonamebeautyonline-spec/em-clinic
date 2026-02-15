import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { pushMessage } from "@/lib/line-push";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";

/**
 * フォーム送信後のアクション実行
 * actions テーブルの steps JSONB を順番に実行
 */
async function executeFormAction(actionId: number, patientId: string, lineUid: string, tenantId: string | null) {
  const { data: action } = await withTenant(
    supabaseAdmin
      .from("actions")
      .select("id, name, steps")
      .eq("id", actionId)
      .single(),
    tenantId
  );

  if (!action?.steps) return;

  const steps = Array.isArray(action.steps) ? action.steps : [];

  for (const step of steps) {
    try {
      switch (step.type) {
        case "send_text":
          if (step.content && lineUid) {
            await pushMessage(lineUid, [{ type: "text", text: step.content }], tenantId ?? undefined);
          }
          break;

        case "send_template":
          if (step.template_id && lineUid) {
            const { data: tpl } = await withTenant(
              supabaseAdmin
                .from("message_templates")
                .select("content")
                .eq("id", step.template_id)
                .single(),
              tenantId
            );
            if (tpl?.content) {
              await pushMessage(lineUid, [{ type: "text", text: tpl.content }], tenantId ?? undefined);
            }
          }
          break;

        case "tag_add":
          if (step.tag_id && patientId) {
            await supabaseAdmin
              .from("patient_tags")
              .upsert(
                { ...tenantPayload(tenantId), patient_id: patientId, tag_id: step.tag_id, assigned_by: "form_action" },
                { onConflict: "patient_id,tag_id" }
              );
          }
          break;

        case "tag_remove":
          if (step.tag_id && patientId) {
            await withTenant(
              supabaseAdmin
                .from("patient_tags")
                .delete()
                .eq("patient_id", patientId)
                .eq("tag_id", step.tag_id),
              tenantId
            );
          }
          break;

        case "mark_change":
          if (step.mark !== undefined && patientId) {
            await withTenant(
              supabaseAdmin
                .from("patients")
                .update({ mark: step.mark })
                .eq("patient_id", patientId),
              tenantId
            );
          }
          break;
      }
    } catch (e) {
      console.error(`[form-action] step ${step.type} 実行エラー:`, e);
    }
  }
}

// 回答送信（認証不要）
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const tenantId = resolveTenantId(req);

  // フォーム取得
  const { data: form, error: formErr } = await withTenant(
    supabaseAdmin
      .from("forms")
      .select("id, fields, settings, is_published")
      .eq("slug", slug)
      .single(),
    tenantId
  );

  if (formErr || !form) {
    return NextResponse.json({ error: "フォームが見つかりません" }, { status: 404 });
  }

  if (!form.is_published) {
    return NextResponse.json({ error: "このフォームは現在公開されていません" }, { status: 403 });
  }

  const settings = (form.settings || {}) as Record<string, unknown>;

  // 期限チェック
  if (settings.deadline) {
    const deadline = new Date(settings.deadline as string);
    if (deadline < new Date()) {
      return NextResponse.json({ error: "回答期限を過ぎています" }, { status: 403 });
    }
  }

  // 先着チェック
  if (settings.max_responses) {
    const { count } = await withTenant(
      supabaseAdmin
        .from("form_responses")
        .select("id", { count: "exact", head: true })
        .eq("form_id", form.id),
      tenantId
    );
    if (count !== null && count >= (settings.max_responses as number)) {
      return NextResponse.json({ error: "回答数の上限に達しました" }, { status: 403 });
    }
  }

  const body = await req.json();
  const { answers, line_user_id, respondent_name } = body as {
    answers: Record<string, unknown>;
    line_user_id?: string;
    respondent_name?: string;
  };

  // 1人あたりの回答数チェック
  if (settings.responses_per_person && line_user_id) {
    const { count } = await withTenant(
      supabaseAdmin
        .from("form_responses")
        .select("id", { count: "exact", head: true })
        .eq("form_id", form.id)
        .eq("line_user_id", line_user_id),
      tenantId
    );
    if (count !== null && count >= (settings.responses_per_person as number)) {
      return NextResponse.json({ error: "回答回数の上限に達しています" }, { status: 403 });
    }
  }

  // バリデーション
  const fields = (form.fields || []) as Array<Record<string, unknown>>;
  const errors: string[] = [];

  for (const field of fields) {
    if (field.hidden) continue;
    if (field.type === "heading_sm" || field.type === "heading_md") continue;

    const val = answers?.[field.id as string];

    // 必須チェック
    if (field.required) {
      if (val === undefined || val === null || val === "") {
        errors.push(`「${field.label}」は必須です`);
        continue;
      }
      if (Array.isArray(val) && val.length === 0) {
        errors.push(`「${field.label}」は必須です`);
        continue;
      }
    }

    // 文字数チェック
    if (typeof val === "string" && val.length > 0) {
      if (field.min_length && val.length < (field.min_length as number)) {
        errors.push(`「${field.label}」は${field.min_length}文字以上で入力してください`);
      }
      if (field.max_length && val.length > (field.max_length as number)) {
        errors.push(`「${field.label}」は${field.max_length}文字以下で入力してください`);
      }
    }
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join("\n") }, { status: 400 });
  }

  // IPアドレスとUA
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
  const userAgent = req.headers.get("user-agent") || null;

  // 回答保存
  const { data: response, error: insertErr } = await supabaseAdmin
    .from("form_responses")
    .insert({
      ...tenantPayload(tenantId),
      form_id: form.id,
      line_user_id: line_user_id || null,
      respondent_name: respondent_name || null,
      answers,
      ip_address: ip,
      user_agent: userAgent,
    })
    .select("id")
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  // LINE UID → patient_id 取得（後続処理で共有）
  let patientId: string | null = null;
  if (line_user_id) {
    const { data: patientData } = await withTenant(
      supabaseAdmin
        .from("intake")
        .select("patient_id")
        .eq("line_id", line_user_id)
        .limit(1)
        .maybeSingle(),
      tenantId
    );
    patientId = patientData?.patient_id || null;
  }

  // 登録先処理（save_target）— 友だち情報欄への保存
  if (patientId) {
    const fieldUpserts: { patient_id: string; field_id: number; value: string; updated_at: string }[] = [];
    const now = new Date().toISOString();

    for (const field of fields) {
      if (!field.save_target || !answers?.[field.id as string]) continue;

      if (field.save_target === "friend_field" && field.save_target_field_id) {
        const val = answers[field.id as string];
        const strVal = Array.isArray(val) ? (val as string[]).join(", ") : String(val);
        fieldUpserts.push({
          patient_id: patientId,
          field_id: parseInt(field.save_target_field_id as string),
          value: strVal,
          updated_at: now,
        });
      }
    }

    if (fieldUpserts.length > 0) {
      const upsertData = fieldUpserts.map(f => ({ ...tenantPayload(tenantId), ...f }));
      const { error: fieldErr } = await supabaseAdmin
        .from("friend_field_values")
        .upsert(upsertData, { onConflict: "patient_id,field_id" });
      if (fieldErr) {
        console.error("[form-submit] friend_field_values upsert error:", fieldErr.message);
      }
    }
  }

  // 送信後アクション（post_actions）実行
  if (Array.isArray(settings.post_actions) && (settings.post_actions as number[]).length > 0 && patientId && line_user_id) {
    for (const actionId of settings.post_actions as number[]) {
      try {
        await executeFormAction(actionId, patientId, line_user_id, tenantId);
      } catch (e) {
        console.error(`[form-submit] post_action ${actionId} 実行エラー:`, e);
      }
    }
  }

  // フォーム名を取得してシステムイベントログを記録
  if (line_user_id) {
    const { data: formInfo } = await withTenant(
      supabaseAdmin
        .from("forms")
        .select("name")
        .eq("id", form.id)
        .maybeSingle(),
      tenantId
    );

    // 回答された項目名を収集
    const answeredFields = fields
      .filter((f: Record<string, unknown>) => f.type !== "heading_sm" && f.type !== "heading_md" && !f.hidden && answers?.[f.id as string])
      .map((f: Record<string, unknown>) => f.label as string);

    const detail = answeredFields.length > 0
      ? `${answeredFields.join("・")}が変更されました`
      : "";

    await supabaseAdmin.from("message_log").insert({
      ...tenantPayload(tenantId),
      patient_id: patientId,
      line_uid: line_user_id,
      event_type: "system",
      message_type: "event",
      content: `フォーム${formInfo?.name || slug}に回答しました${detail ? "\n" + detail : ""}`,
      status: "received",
      direction: "incoming",
    });
  }

  return NextResponse.json({
    ok: true,
    response_id: response?.id,
    thanks_message: settings.thanks_message || "回答を受け付けました。",
    thanks_url: settings.thanks_url || null,
  });
}
