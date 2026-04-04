// オンボーディングAIコンシェルジュ — ストリーミング詳細解説API
// 「もっと詳しく」ボタン押下時にClaude APIをストリーミングで呼び出す

import { NextRequest } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import Anthropic from "@anthropic-ai/sdk";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow } from "@/lib/tenant";
import { getSettingOrEnv } from "@/lib/settings";
import {
  type OnboardingStep,
  DETAIL_PROMPTS,
  CONCIERGE_SYSTEM_PROMPT,
} from "@/lib/onboarding-concierge";

const VALID_STEPS: OnboardingStep[] = ["line", "payment", "products", "schedule"];

export async function POST(req: NextRequest) {
  // 認証チェック
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return unauthorized();
  }

  const tenantId = resolveTenantIdOrThrow(req);

  // リクエストボディ解析
  let body: { step?: string };
  try {
    body = await req.json();
  } catch {
    return badRequest("リクエストボディが不正です");
  }

  const step = body.step as OnboardingStep;
  if (!step || !VALID_STEPS.includes(step)) {
    return badRequest("step は line / payment / products / schedule のいずれかです");
  }

  // APIキー取得
  const tid = tenantId ?? undefined;
  const apiKey =
    (await getSettingOrEnv("general", "anthropic_api_key", "ANTHROPIC_API_KEY")) || "";
  if (!apiKey) {
    return serverError("ANTHROPIC_API_KEY が未設定です");
  }

  const userPrompt = DETAIL_PROMPTS[step];

  // ReadableStreamでClaude SDKのストリーミングをラップ
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        const client = new Anthropic({ apiKey });
        const response = client.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          system: CONCIERGE_SYSTEM_PROMPT,
          messages: [{ role: "user", content: userPrompt }],
        });

        for await (const event of response) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const data = JSON.stringify({ text: event.delta.text });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "AI応答の生成に失敗しました";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`),
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
