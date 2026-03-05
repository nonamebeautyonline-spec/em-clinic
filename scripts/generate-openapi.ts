#!/usr/bin/env npx tsx
// scripts/generate-openapi.ts — OpenAPI仕様自動生成スクリプト
// 使用方法: npx tsx scripts/generate-openapi.ts
//
// Zodスキーマ → JSON Schema → OpenAPI 3.0 仕様を生成し public/openapi.json に出力
import { z } from "zod";
import { writeFileSync } from "fs";
import { resolve } from "path";
import { ROUTE_DEFINITIONS, type RouteDefinition } from "../lib/openapi/registry";

// Zod v4 の toJSONSchema を使用
function zodToJsonSchema(schema: z.ZodType): Record<string, unknown> {
  try {
    return z.toJSONSchema(schema) as Record<string, unknown>;
  } catch {
    return { type: "object" };
  }
}

// スキーママップ: パス+メソッド → Zodスキーマ
// 動的にインポートして紐付け
async function loadSchemas(): Promise<Map<string, z.ZodType>> {
  const map = new Map<string, z.ZodType>();

  try {
    const reservation = await import("../lib/validations/reservation");
    map.set("POST:/api/reservations:create", reservation.createReservationSchema);
    map.set("POST:/api/reservations:cancel", reservation.cancelReservationSchema);
    map.set("POST:/api/reservations:update", reservation.updateReservationSchema);
  } catch { /* スキップ */ }

  try {
    const reorder = await import("../lib/validations/reorder");
    map.set("POST:/api/reorder/apply", reorder.reorderApplySchema);
  } catch { /* スキップ */ }

  try {
    const reorderCancel = await import("../lib/validations/reorder-cancel");
    map.set("POST:/api/reorder/cancel", reorderCancel.reorderCancelSchema);
  } catch { /* スキップ */ }

  try {
    const checkout = await import("../lib/validations/checkout");
    map.set("POST:/api/checkout", checkout.checkoutSchema);
  } catch { /* スキップ */ }

  try {
    const patient = await import("../lib/validations/patient");
    map.set("POST:/api/register/personal-info", patient.personalInfoSchema);
    map.set("POST:/api/intake", patient.intakeSchema);
  } catch { /* スキップ */ }

  try {
    const register = await import("../lib/validations/register");
    map.set("POST:/api/register/complete", register.registerCompleteSchema);
  } catch { /* スキップ */ }

  try {
    const adminOps = await import("../lib/validations/admin-operations");
    map.set("PUT:/api/admin/settings", adminOps.settingsUpdateSchema);
  } catch { /* スキップ */ }

  try {
    const lineCommon = await import("../lib/validations/line-common");
    map.set("POST:/api/admin/line/rich-menus", lineCommon.createRichMenuSchema);
    map.set("POST:/api/admin/line/rich-menus/ai-generate", lineCommon.aiRichMenuGenerateSchema);
    map.set("POST:/api/admin/tags", lineCommon.createTagSchema);
  } catch { /* スキップ */ }

  try {
    const lineBroadcast = await import("../lib/validations/line-broadcast");
    map.set("POST:/api/admin/line/broadcast", lineBroadcast.broadcastSchema);
  } catch { /* スキップ */ }

  try {
    const doctor = await import("../lib/validations/doctor");
    map.set("POST:/api/doctor/reorders/approve", doctor.doctorReorderApproveSchema);
  } catch { /* スキップ */ }

  try {
    const payment = await import("../lib/validations/payment");
    map.set("POST:/api/admin/refunds", payment.refundSchema);
  } catch { /* スキップ */ }

  try {
    const shipping = await import("../lib/validations/shipping");
    map.set("POST:/api/admin/shipping", shipping.addToShippingSchema);
  } catch { /* スキップ */ }

  try {
    const adminOps = await import("../lib/validations/admin-operations");
    map.set("POST:/api/admin/products", adminOps.productCreateSchema);
  } catch { /* スキップ */ }

  try {
    const platformTenant = await import("../lib/validations/platform-tenant");
    map.set("POST:/api/platform/tenants", platformTenant.createTenantSchema);
  } catch { /* スキップ */ }

  try {
    const platformAuth = await import("../lib/validations/platform");
    map.set("POST:/api/platform/login", platformAuth.totpLoginSchema);
  } catch { /* スキップ */ }

  return map;
}

function buildAuthSecurity(auth?: string): Record<string, unknown>[] {
  switch (auth) {
    case "admin":
      return [{ adminCookie: [] }];
    case "patient":
      return [{ patientCookie: [] }];
    case "platform":
      return [{ platformCookie: [] }];
    default:
      return [];
  }
}

function buildOperation(route: RouteDefinition, schemas: Map<string, z.ZodType>) {
  const op: Record<string, unknown> = {
    summary: route.summary,
    tags: route.tags,
    responses: {
      "200": {
        description: route.responseDescription || "成功",
        content: {
          "application/json": {
            schema: { type: "object", properties: { ok: { type: "boolean" } } },
          },
        },
      },
      "401": { description: "認証エラー" },
      "500": { description: "サーバーエラー" },
    },
  };

  const security = buildAuthSecurity(route.auth);
  if (security.length > 0) {
    op.security = security;
  }

  // リクエストボディスキーマの紐付け
  if (route.method === "POST" || route.method === "PUT" || route.method === "PATCH") {
    const key = `${route.method}:${route.path}`;
    const schema = route.requestSchema || schemas.get(key);
    if (schema) {
      try {
        const jsonSchema = zodToJsonSchema(schema);
        // $schema プロパティを除去（OpenAPIでは不要）
        delete jsonSchema["$schema"];
        op.requestBody = {
          required: true,
          content: {
            "application/json": {
              schema: jsonSchema,
            },
          },
        };
      } catch {
        // スキーマ変換失敗時はスキップ
      }
    }
  }

  return op;
}

async function generateOpenApiSpec() {
  const schemas = await loadSchemas();

  const paths: Record<string, Record<string, unknown>> = {};

  for (const route of ROUTE_DEFINITIONS) {
    const pathKey = route.path;
    if (!paths[pathKey]) paths[pathKey] = {};
    paths[pathKey][route.method.toLowerCase()] = buildOperation(route, schemas);
  }

  const spec = {
    openapi: "3.0.3",
    info: {
      title: "Lオペ for CLINIC API",
      description: "クリニック特化LINE運用プラットフォーム — API仕様書",
      version: "1.0.0",
      contact: {
        name: "Lオペ for CLINIC",
      },
    },
    servers: [
      { url: "/", description: "Current server" },
    ],
    paths,
    components: {
      securitySchemes: {
        adminCookie: {
          type: "apiKey",
          in: "cookie",
          name: "admin_session",
          description: "管理画面セッションCookie",
        },
        patientCookie: {
          type: "apiKey",
          in: "cookie",
          name: "patient_id",
          description: "患者IDCookie（LINE認証後に自動付与）",
        },
        platformCookie: {
          type: "apiKey",
          in: "cookie",
          name: "platform_session",
          description: "プラットフォーム管理セッションCookie",
        },
      },
    },
    tags: [
      { name: "予約", description: "予約管理API" },
      { name: "再処方", description: "再処方申請・管理API" },
      { name: "決済", description: "決済関連API" },
      { name: "マイページ", description: "患者マイページAPI" },
      { name: "患者登録", description: "患者登録フローAPI" },
      { name: "問診", description: "問診関連API" },
      { name: "認証", description: "電話番号認証API" },
      { name: "システム", description: "システム運用API" },
      { name: "Dr操作", description: "医師向けAPI" },
      { name: "管理: 患者", description: "管理画面 患者管理API" },
      { name: "管理: 再処方", description: "管理画面 再処方管理API" },
      { name: "管理: 商品", description: "管理画面 商品管理API" },
      { name: "管理: 在庫", description: "管理画面 在庫管理API" },
      { name: "管理: 配送", description: "管理画面 配送管理API" },
      { name: "管理: スケジュール", description: "管理画面 予約枠管理API" },
      { name: "管理: 設定", description: "管理画面 テナント設定API" },
      { name: "管理: LINE", description: "管理画面 LINE管理API" },
      { name: "管理: カルテ", description: "管理画面 カルテ管理API" },
      { name: "管理: 決済", description: "管理画面 決済管理API" },
      { name: "管理: ダッシュボード", description: "管理画面 ダッシュボードAPI" },
      { name: "AI", description: "AI関連API" },
      { name: "Webhook", description: "Webhook受信API" },
      { name: "プラットフォーム", description: "プラットフォーム管理API" },
      { name: "プラットフォーム: 請求", description: "プラットフォーム請求管理API" },
    ],
  };

  const outputPath = resolve(__dirname, "../public/openapi.json");
  writeFileSync(outputPath, JSON.stringify(spec, null, 2), "utf-8");

  console.log(`OpenAPI仕様を生成しました: ${outputPath}`);
  console.log(`ルート数: ${ROUTE_DEFINITIONS.length}`);
  console.log(`スキーマ紐付け: ${schemas.size}件`);
}

generateOpenApiSpec().catch(console.error);
