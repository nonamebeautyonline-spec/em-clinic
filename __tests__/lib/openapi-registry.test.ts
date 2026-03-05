// __tests__/lib/openapi-registry.test.ts
// OpenAPI レジストリと生成ロジックのテスト
import { describe, it, expect } from "vitest";
import { ROUTE_DEFINITIONS, type RouteDefinition } from "@/lib/openapi/registry";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

describe("OpenAPI Registry", () => {
  it("ルート定義が1件以上存在する", () => {
    expect(ROUTE_DEFINITIONS.length).toBeGreaterThan(0);
  });

  it("全ルートに必須フィールドが設定されている", () => {
    for (const route of ROUTE_DEFINITIONS) {
      expect(route.path).toBeTruthy();
      expect(["GET", "POST", "PUT", "DELETE", "PATCH"]).toContain(route.method);
      expect(route.summary).toBeTruthy();
      expect(route.tags.length).toBeGreaterThan(0);
    }
  });

  it("パスは / で始まる", () => {
    for (const route of ROUTE_DEFINITIONS) {
      expect(route.path.startsWith("/")).toBe(true);
    }
  });

  it("同じpath+methodの重複がない", () => {
    const seen = new Set<string>();
    for (const route of ROUTE_DEFINITIONS) {
      const key = `${route.method}:${route.path}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it("主要APIルートが含まれている", () => {
    const paths = ROUTE_DEFINITIONS.map(r => `${r.method}:${r.path}`);
    expect(paths).toContain("GET:/api/reservations");
    expect(paths).toContain("POST:/api/reservations");
    expect(paths).toContain("POST:/api/reorder/apply");
    expect(paths).toContain("POST:/api/checkout");
    expect(paths).toContain("GET:/api/admin/patients");
    expect(paths).toContain("GET:/api/health");
  });

  it("認証タイプが正しく設定されている", () => {
    const healthRoute = ROUTE_DEFINITIONS.find(r => r.path === "/api/health");
    expect(healthRoute?.auth).toBe("none");

    const adminRoute = ROUTE_DEFINITIONS.find(r => r.path === "/api/admin/patients");
    expect(adminRoute?.auth).toBe("admin");

    const patientRoute = ROUTE_DEFINITIONS.find(r => r.path === "/api/reservations" && r.method === "GET");
    expect(patientRoute?.auth).toBe("patient");
  });
});

describe("生成されたopenapi.json", () => {
  const openapiPath = resolve(__dirname, "../../public/openapi.json");

  it("ファイルが存在する", () => {
    expect(existsSync(openapiPath)).toBe(true);
  });

  it("有効なOpenAPI 3.0仕様である", () => {
    const content = JSON.parse(readFileSync(openapiPath, "utf-8"));
    expect(content.openapi).toBe("3.0.3");
    expect(content.info.title).toBeTruthy();
    expect(content.paths).toBeDefined();
    expect(Object.keys(content.paths).length).toBeGreaterThan(0);
  });

  it("セキュリティスキームが定義されている", () => {
    const content = JSON.parse(readFileSync(openapiPath, "utf-8"));
    expect(content.components.securitySchemes.adminCookie).toBeDefined();
    expect(content.components.securitySchemes.patientCookie).toBeDefined();
    expect(content.components.securitySchemes.platformCookie).toBeDefined();
  });

  it("タグが定義されている", () => {
    const content = JSON.parse(readFileSync(openapiPath, "utf-8"));
    expect(content.tags.length).toBeGreaterThan(0);
    const tagNames = content.tags.map((t: { name: string }) => t.name);
    expect(tagNames).toContain("予約");
    expect(tagNames).toContain("再処方");
    expect(tagNames).toContain("決済");
  });

  it("リクエストボディスキーマが含まれるルートがある", () => {
    const content = JSON.parse(readFileSync(openapiPath, "utf-8"));
    const paths = content.paths;
    let hasRequestBody = false;
    for (const pathObj of Object.values(paths)) {
      for (const opObj of Object.values(pathObj as Record<string, unknown>)) {
        if ((opObj as Record<string, unknown>).requestBody) {
          hasRequestBody = true;
          break;
        }
      }
    }
    expect(hasRequestBody).toBe(true);
  });
});
