import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { pushMessage } from "@/lib/line-push";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";
import { logAudit } from "@/lib/audit";

// 登録済みメディアPDFをFlex MessageでLINE送信するAPI
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const body = await req.json();
  const { patient_id, pdf_url, pdf_name } = body;

  if (!patient_id || !pdf_url) {
    return badRequest("patient_id と pdf_url は必須です");
  }

  // 患者のLINE UIDを取得
  const { data: patient } = await strictWithTenant(
    supabaseAdmin.from("patients").select("name, line_id").eq("patient_id", patient_id),
    tenantId
  ).maybeSingle();

  if (!patient?.line_id) {
    return badRequest("LINE UIDが見つかりません");
  }

  const displayName = pdf_name || "PDF";

  // Flex Messageでダウンロードリンクを送信（LINEはPDF直接送信非対応のため）
  const res = await pushMessage(patient.line_id, [
    {
      type: "flex",
      altText: `${displayName} を送信しました`,
      contents: {
        type: "bubble",
        size: "kilo",
        body: {
          type: "box",
          layout: "horizontal",
          contents: [
            {
              type: "box",
              layout: "vertical",
              contents: [
                {
                  type: "text",
                  text: "\u{1F4C4}",
                  size: "lg",
                  align: "center",
                },
              ],
              width: "36px",
              height: "36px",
              backgroundColor: "#FFF3E0",
              cornerRadius: "18px",
              justifyContent: "center",
              alignItems: "center",
            },
            {
              type: "box",
              layout: "vertical",
              contents: [
                {
                  type: "text",
                  text: displayName,
                  weight: "bold",
                  size: "sm",
                  color: "#1a1a1a",
                  wrap: true,
                  maxLines: 2,
                },
                {
                  type: "text",
                  text: "タップしてPDFを表示",
                  size: "xs",
                  color: "#888888",
                  margin: "xs",
                },
              ],
              flex: 1,
              paddingStart: "12px",
            },
          ],
          alignItems: "center",
          paddingAll: "16px",
        },
        footer: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "button",
              action: {
                type: "uri",
                label: "PDFを開く",
                uri: pdf_url,
              },
              style: "primary",
              color: "#FF8C00",
              height: "sm",
            },
          ],
          paddingAll: "12px",
          paddingTop: "0px",
        },
      },
    },
  ], tenantId ?? undefined);

  const status = res?.ok ? "sent" : "failed";

  // メッセージログに記録
  const flexJson = JSON.stringify({
    type: "bubble",
    body: { pdf_name: displayName, pdf_url },
  });

  const { data: pdfLog } = await supabaseAdmin.from("message_log").insert({
    ...tenantPayload(tenantId),
    patient_id,
    line_uid: patient.line_id,
    event_type: "message",
    message_type: "individual",
    content: `[PDF] ${displayName}`,
    flex_json: flexJson,
    status,
    direction: "outgoing",
  }).select("id, sent_at").single();

  logAudit(req, "message.send_media_pdf", "message", String(patient_id));
  return NextResponse.json({
    ok: status === "sent",
    status,
    messageId: pdfLog?.id,
    sentAt: pdfLog?.sent_at,
    pdfName: displayName,
  });
}
