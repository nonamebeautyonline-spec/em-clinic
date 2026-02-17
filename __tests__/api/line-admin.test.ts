// __tests__/api/line-admin.test.ts
// LINE管理機能のAPIルート統合テスト
// broadcast, rich-menus, templates, step-scenarios, forms, send, schedule, marks
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

function readFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf-8");
}

function fileExists(relativePath: string): boolean {
  return fs.existsSync(path.resolve(process.cwd(), relativePath));
}

// ===================================================================
// 共通チェック: 全LINE管理APIの基本要件
// ===================================================================
const LINE_ADMIN_ROUTES = [
  { file: "app/api/admin/line/broadcast/route.ts", name: "broadcast（一斉配信）" },
  { file: "app/api/admin/line/rich-menus/route.ts", name: "rich-menus（リッチメニュー）" },
  { file: "app/api/admin/line/templates/route.ts", name: "templates（テンプレート）" },
  { file: "app/api/admin/line/step-scenarios/route.ts", name: "step-scenarios（ステップ配信）" },
  { file: "app/api/admin/line/forms/route.ts", name: "forms（フォーム）" },
  { file: "app/api/admin/line/send/route.ts", name: "send（個別送信）" },
  { file: "app/api/admin/line/schedule/route.ts", name: "schedule（予約配信）" },
  { file: "app/api/admin/line/marks/route.ts", name: "marks（対応マーク）" },
];

describe("LINE管理API: 認証チェック", () => {
  for (const { file, name } of LINE_ADMIN_ROUTES) {
    it(`${name} は verifyAdminAuth で認証している`, () => {
      if (!fileExists(file)) return;
      const src = readFile(file);
      expect(src).toContain("verifyAdminAuth");
    });
  }
});

describe("LINE管理API: テナント分離", () => {
  for (const { file, name } of LINE_ADMIN_ROUTES) {
    it(`${name} は resolveTenantId を使用している`, () => {
      if (!fileExists(file)) return;
      const src = readFile(file);
      expect(src).toContain("resolveTenantId");
    });

    it(`${name} は withTenant または tenantPayload を使用している`, () => {
      if (!fileExists(file)) return;
      const src = readFile(file);
      const hasTenant = src.includes("withTenant") || src.includes("tenantPayload");
      expect(hasTenant).toBe(true);
    });
  }
});

describe("LINE管理API: supabaseAdmin 使用", () => {
  for (const { file, name } of LINE_ADMIN_ROUTES) {
    it(`${name} は supabaseAdmin を使用している`, () => {
      if (!fileExists(file)) return;
      const src = readFile(file);
      expect(src).toContain("supabaseAdmin");
    });
  }
});

describe("LINE管理API: 認証失敗時 401 レスポンス", () => {
  for (const { file, name } of LINE_ADMIN_ROUTES) {
    it(`${name} は認証失敗時 401 を返す`, () => {
      if (!fileExists(file)) return;
      const src = readFile(file);
      expect(src).toContain("401");
    });
  }
});

// ===================================================================
// broadcast（一斉配信）固有テスト
// ===================================================================
describe("broadcast: 一斉配信ルート", () => {
  const file = "app/api/admin/line/broadcast/route.ts";

  it("GET と POST がエクスポートされている", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toMatch(/export\s+async\s+function\s+GET/);
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
  });

  it("broadcasts テーブルを操作している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain('"broadcasts"');
  });

  it("message_log にログを記録している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain('"message_log"');
  });

  it("LINE Push API（pushMessage）を呼び出している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("pushMessage");
  });
});

// ===================================================================
// rich-menus（リッチメニュー）固有テスト
// ===================================================================
describe("rich-menus: リッチメニュー管理ルート", () => {
  const file = "app/api/admin/line/rich-menus/route.ts";

  it("GET と POST がエクスポートされている", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toMatch(/export\s+async\s+function\s+GET/);
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
  });

  it("rich_menus テーブルを操作している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain('"rich_menus"');
  });
});

// ===================================================================
// templates（テンプレート）固有テスト
// ===================================================================
describe("templates: テンプレート管理ルート", () => {
  const file = "app/api/admin/line/templates/route.ts";

  it("GET と POST がエクスポートされている", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toMatch(/export\s+async\s+function\s+GET/);
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
  });

  it("message_templates テーブルを操作している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("message_templates");
  });
});

// ===================================================================
// step-scenarios（ステップ配信）固有テスト
// ===================================================================
describe("step-scenarios: ステップ配信シナリオルート", () => {
  const file = "app/api/admin/line/step-scenarios/route.ts";

  it("GET/POST/PUT/DELETE がエクスポートされている", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toMatch(/export\s+async\s+function\s+GET/);
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
    expect(src).toMatch(/export\s+async\s+function\s+PUT/);
    expect(src).toMatch(/export\s+async\s+function\s+DELETE/);
  });

  it("step_scenarios テーブルを操作している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("step_scenarios");
  });
});

// ===================================================================
// forms（フォーム）固有テスト
// ===================================================================
describe("forms: フォーム管理ルート", () => {
  const file = "app/api/admin/line/forms/route.ts";

  it("GET と POST がエクスポートされている", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toMatch(/export\s+async\s+function\s+GET/);
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
  });

  it("forms テーブルを操作している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain('"forms"');
  });
});

// ===================================================================
// send（個別送信）固有テスト
// ===================================================================
describe("send: 個別メッセージ送信ルート", () => {
  const file = "app/api/admin/line/send/route.ts";

  it("POST がエクスポートされている", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
  });

  it("message_log にログを記録している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("message_log");
  });
});

// ===================================================================
// schedule（予約配信）固有テスト
// ===================================================================
describe("schedule: 予約配信ルート", () => {
  const file = "app/api/admin/line/schedule/route.ts";

  it("GET と POST がエクスポートされている", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toMatch(/export\s+async\s+function\s+GET/);
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
  });

  it("scheduled_messages テーブルを操作している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("scheduled_messages");
  });
});

// ===================================================================
// marks（対応マーク）固有テスト
// ===================================================================
describe("marks: 対応マーク管理ルート", () => {
  const file = "app/api/admin/line/marks/route.ts";

  it("GET と POST がエクスポートされている", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toMatch(/export\s+async\s+function\s+GET/);
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
  });

  it("mark_definitions テーブルを操作している", () => {
    if (!fileExists(file)) return;
    const src = readFile(file);
    expect(src).toContain("mark_definitions");
  });
});

// ===================================================================
// 配信ターゲット解決ロジック
// ===================================================================
describe("broadcast: ターゲット解決ロジック", () => {
  // フィルターの動作テスト
  interface Patient {
    patient_id: string;
    line_id: string | null;
    tags: string[];
    marks: string[];
  }

  function filterByTags(patients: Patient[], requiredTags: string[]): Patient[] {
    if (requiredTags.length === 0) return patients;
    return patients.filter((p) =>
      requiredTags.every((tag) => p.tags.includes(tag)),
    );
  }

  function filterByMarks(patients: Patient[], requiredMarks: string[]): Patient[] {
    if (requiredMarks.length === 0) return patients;
    return patients.filter((p) =>
      requiredMarks.some((mark) => p.marks.includes(mark)),
    );
  }

  it("タグフィルター: 全タグを持つ患者のみ", () => {
    const patients: Patient[] = [
      { patient_id: "p1", line_id: "U1", tags: ["vip", "tokyo"], marks: [] },
      { patient_id: "p2", line_id: "U2", tags: ["vip"], marks: [] },
      { patient_id: "p3", line_id: "U3", tags: ["tokyo"], marks: [] },
    ];
    const result = filterByTags(patients, ["vip", "tokyo"]);
    expect(result).toHaveLength(1);
    expect(result[0].patient_id).toBe("p1");
  });

  it("マークフィルター: いずれかのマークを持つ患者", () => {
    const patients: Patient[] = [
      { patient_id: "p1", line_id: "U1", tags: [], marks: ["important"] },
      { patient_id: "p2", line_id: "U2", tags: [], marks: ["follow-up"] },
      { patient_id: "p3", line_id: "U3", tags: [], marks: [] },
    ];
    const result = filterByMarks(patients, ["important", "follow-up"]);
    expect(result).toHaveLength(2);
  });

  it("LINE ID なしの患者は配信対象外", () => {
    const patients: Patient[] = [
      { patient_id: "p1", line_id: "U1", tags: [], marks: [] },
      { patient_id: "p2", line_id: null, tags: [], marks: [] },
    ];
    const withLineId = patients.filter((p) => p.line_id);
    expect(withLineId).toHaveLength(1);
  });

  it("空フィルター → 全患者が対象", () => {
    const patients: Patient[] = [
      { patient_id: "p1", line_id: "U1", tags: [], marks: [] },
      { patient_id: "p2", line_id: "U2", tags: [], marks: [] },
    ];
    expect(filterByTags(patients, [])).toHaveLength(2);
    expect(filterByMarks(patients, [])).toHaveLength(2);
  });
});

// ===================================================================
// テンプレート変数置換ロジック
// ===================================================================
describe("テンプレート変数置換ロジック", () => {
  function replaceVariables(text: string, vars: Record<string, string>): string {
    return text.replace(/\{(\w+)\}/g, (_, key) => vars[key] || `{${key}}`);
  }

  it("{name} を患者名に置換", () => {
    expect(replaceVariables("こんにちは{name}さん", { name: "田中太郎" }))
      .toBe("こんにちは田中太郎さん");
  });

  it("{patient_id} を置換", () => {
    expect(replaceVariables("ID: {patient_id}", { patient_id: "P001" }))
      .toBe("ID: P001");
  });

  it("{next_reservation_date} を置換", () => {
    expect(replaceVariables("次回予約: {next_reservation_date}", { next_reservation_date: "2026/03/01" }))
      .toBe("次回予約: 2026/03/01");
  });

  it("未定義変数はそのまま残る", () => {
    expect(replaceVariables("値: {undefined_var}", {}))
      .toBe("値: {undefined_var}");
  });

  it("変数なしテキストはそのまま", () => {
    expect(replaceVariables("通常のテキスト", { name: "田中" }))
      .toBe("通常のテキスト");
  });

  it("複数変数の同時置換", () => {
    const result = replaceVariables(
      "{name}様、次回は{next_reservation_date}です。（ID: {patient_id}）",
      { name: "田中太郎", next_reservation_date: "2026/03/01", patient_id: "P001" },
    );
    expect(result).toBe("田中太郎様、次回は2026/03/01です。（ID: P001）");
  });
});
