// app/api/admin/report-settings/route.ts — 定期レポート設定API
import { NextRequest, NextResponse } from "next/server";
import { unauthorized, serverError, badRequest } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId } from "@/lib/tenant";
import { getSetting, setSetting } from "@/lib/settings";
import { generateWeeklyReport } from "@/lib/report-generator";
import { sendEmail } from "@/lib/email";
import { z } from "zod";

// 設定取得
export async function GET(request: NextRequest) {
  const isAuthorized = await verifyAdminAuth(request);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantId(request);

  try {
    const [enabled, frequency, emails] = await Promise.all([
      getSetting("report", "enabled", tenantId ?? undefined),
      getSetting("report", "frequency", tenantId ?? undefined),
      getSetting("report", "emails", tenantId ?? undefined),
    ]);

    return NextResponse.json({
      enabled: enabled === "true",
      frequency: frequency || "weekly",
      emails: emails || "",
    });
  } catch (err) {
    console.error("[report-settings] GET error:", err);
    return serverError("設定の取得に失敗しました");
  }
}

// 設定保存
const updateSchema = z.object({
  enabled: z.boolean(),
  frequency: z.enum(["weekly", "monthly", "both"]),
  emails: z.string(),
  testSend: z.boolean().optional(),
});

export async function PUT(request: NextRequest) {
  const isAuthorized = await verifyAdminAuth(request);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantId(request);

  let body: z.infer<typeof updateSchema>;
  try {
    const raw = await request.json();
    body = updateSchema.parse(raw);
  } catch {
    return badRequest("不正なリクエスト形式です");
  }

  // メールアドレスのバリデーション
  const emailList = body.emails
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  if (body.enabled && emailList.length === 0) {
    return badRequest("レポートを有効にする場合、送信先メールアドレスを入力してください");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  for (const email of emailList) {
    if (!emailRegex.test(email)) {
      return badRequest(`無効なメールアドレスです: ${email}`);
    }
  }

  try {
    // テスト送信
    if (body.testSend) {
      if (emailList.length === 0) {
        return badRequest("テスト送信先のメールアドレスを入力してください");
      }
      const report = await generateWeeklyReport(tenantId, new Date());
      for (const email of emailList) {
        await sendEmail({
          to: email,
          subject: `[テスト] ${report.subject}`,
          html: report.html,
        });
      }
      return NextResponse.json({ ok: true, message: "テストメールを送信しました" });
    }

    // 設定保存
    const tid = tenantId ?? undefined;
    await Promise.all([
      setSetting("report", "enabled", body.enabled ? "true" : "false", tid),
      setSetting("report", "frequency", body.frequency, tid),
      setSetting("report", "emails", emailList.join(","), tid),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[report-settings] PUT error:", err);
    return serverError("設定の保存に失敗しました");
  }
}
