// lib/__tests__/menu-permissions.test.ts
// メニュー権限ユーティリティ（lib/menu-permissions.ts）のテスト
import { describe, it, expect } from "vitest";
import {
  MENU_ITEMS,
  ALL_MENU_KEYS,
  ROLE_LABELS,
  resolveMenuKeyFromPath,
  isFullAccessRole,
  getMenuItemsBySection,
} from "@/lib/menu-permissions";

// ======================================
// resolveMenuKeyFromPath: パスからメニューキーを逆引き
// ======================================
describe("resolveMenuKeyFromPath", () => {
  it("完全一致パスで正しいキーを返す", () => {
    expect(resolveMenuKeyFromPath("/admin/dashboard")).toBe("dashboard");
    expect(resolveMenuKeyFromPath("/admin/line")).toBe("line");
    expect(resolveMenuKeyFromPath("/admin/reservations")).toBe("reservations");
    expect(resolveMenuKeyFromPath("/admin/karte")).toBe("karte");
    expect(resolveMenuKeyFromPath("/admin/settings")).toBe("settings");
  });

  it("サブパス付きで正しいキーを返す（プレフィックスマッチ）", () => {
    expect(resolveMenuKeyFromPath("/admin/dashboard/stats")).toBe("dashboard");
    expect(resolveMenuKeyFromPath("/admin/line/talk")).toBe("line");
    expect(resolveMenuKeyFromPath("/admin/shipping/pending/detail")).toBe("shipping");
    expect(resolveMenuKeyFromPath("/admin/karte/edit/123")).toBe("karte");
  });

  it("tracking_sourcesはlineよりも優先される（長いパスが優先）", () => {
    // /admin/line/tracking-sources は tracking_sources キーに解決されるべき
    expect(resolveMenuKeyFromPath("/admin/line/tracking-sources")).toBe("tracking_sources");
    expect(resolveMenuKeyFromPath("/admin/line/tracking-sources/new")).toBe("tracking_sources");
  });

  it("kartesearchはkarteキーに解決される", () => {
    expect(resolveMenuKeyFromPath("/admin/kartesearch")).toBe("karte");
    expect(resolveMenuKeyFromPath("/admin/kartesearch/q")).toBe("karte");
  });

  it("/admin ルートはダッシュボードとして扱う", () => {
    expect(resolveMenuKeyFromPath("/admin")).toBe("dashboard");
    expect(resolveMenuKeyFromPath("/admin/")).toBe("dashboard");
  });

  it("未知のパスは null を返す", () => {
    expect(resolveMenuKeyFromPath("/admin/unknown-page")).toBeNull();
    expect(resolveMenuKeyFromPath("/some/other/path")).toBeNull();
    expect(resolveMenuKeyFromPath("/")).toBeNull();
  });

  it("merge_patientsの複数パスが全て同じキーに解決される", () => {
    expect(resolveMenuKeyFromPath("/admin/merge-patients")).toBe("merge_patients");
    expect(resolveMenuKeyFromPath("/admin/patient-data")).toBe("merge_patients");
    expect(resolveMenuKeyFromPath("/admin/dedup-patients")).toBe("merge_patients");
  });
});

// ======================================
// isFullAccessRole: 全権限ロール判定
// ======================================
describe("isFullAccessRole", () => {
  it("owner は true", () => {
    expect(isFullAccessRole("owner")).toBe(true);
  });

  it("admin は true", () => {
    expect(isFullAccessRole("admin")).toBe(true);
  });

  it("editor は false", () => {
    expect(isFullAccessRole("editor")).toBe(false);
  });

  it("viewer は false", () => {
    expect(isFullAccessRole("viewer")).toBe(false);
  });

  it("空文字・不明ロールは false", () => {
    expect(isFullAccessRole("")).toBe(false);
    expect(isFullAccessRole("superadmin")).toBe(false);
    expect(isFullAccessRole("unknown")).toBe(false);
  });
});

// ======================================
// getMenuItemsBySection: セクション別グループ化
// ======================================
describe("getMenuItemsBySection", () => {
  it("セクション配列を返す", () => {
    const sections = getMenuItemsBySection();
    expect(Array.isArray(sections)).toBe(true);
    expect(sections.length).toBeGreaterThan(0);
  });

  it("各セクションにsectionとitemsが含まれる", () => {
    const sections = getMenuItemsBySection();
    for (const s of sections) {
      expect(typeof s.section).toBe("string");
      expect(Array.isArray(s.items)).toBe(true);
      expect(s.items.length).toBeGreaterThan(0);
    }
  });

  it("期待されるセクション名が含まれる", () => {
    const sections = getMenuItemsBySection();
    const sectionNames = sections.map((s) => s.section);
    expect(sectionNames).toContain("メイン");
    expect(sectionNames).toContain("予約・診察");
    expect(sectionNames).toContain("決済管理");
    expect(sectionNames).toContain("発送管理");
    expect(sectionNames).toContain("顧客管理");
    expect(sectionNames).toContain("業務管理");
    expect(sectionNames).toContain("システム");
  });

  it("全メニュー項目がいずれかのセクションに含まれる", () => {
    const sections = getMenuItemsBySection();
    const allKeys = sections.flatMap((s) => s.items.map((i) => i.key));
    for (const key of ALL_MENU_KEYS) {
      expect(allKeys).toContain(key);
    }
  });

  it("MENU_ITEMSの順序が保持される（同セクション内）", () => {
    const sections = getMenuItemsBySection();
    const mainSection = sections.find((s) => s.section === "メイン");
    expect(mainSection).toBeDefined();
    const keys = mainSection!.items.map((i) => i.key);
    expect(keys).toEqual(["dashboard", "accounting", "line"]);
  });
});

// ======================================
// ALL_MENU_KEYS: 全メニューキー配列
// ======================================
describe("ALL_MENU_KEYS", () => {
  it("MENU_ITEMSと同じ数のキーを含む", () => {
    expect(ALL_MENU_KEYS.length).toBe(MENU_ITEMS.length);
  });

  it("主要なキーが含まれる", () => {
    const expectedKeys = [
      "dashboard",
      "accounting",
      "line",
      "reservations",
      "reorders",
      "karte",
      "doctor",
      "payments",
      "shipping",
      "settings",
      "help",
    ];
    for (const key of expectedKeys) {
      expect(ALL_MENU_KEYS).toContain(key);
    }
  });

  it("重複がない", () => {
    const unique = new Set(ALL_MENU_KEYS);
    expect(unique.size).toBe(ALL_MENU_KEYS.length);
  });
});

// ======================================
// ROLE_LABELS: 役職ラベル
// ======================================
describe("ROLE_LABELS", () => {
  it("4つのロールが定義されている", () => {
    expect(Object.keys(ROLE_LABELS)).toHaveLength(4);
  });

  it("正しい日本語ラベルが設定されている", () => {
    expect(ROLE_LABELS.owner).toBe("管理者");
    expect(ROLE_LABELS.admin).toBe("副管理者");
    expect(ROLE_LABELS.editor).toBe("運用者");
    expect(ROLE_LABELS.viewer).toBe("スタッフ");
  });
});
