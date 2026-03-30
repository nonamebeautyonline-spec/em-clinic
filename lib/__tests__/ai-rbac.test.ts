// AI RBAC権限チェックのテスト（純ロジック、mock不要）
import { describe, it, expect } from "vitest";
import {
  checkAIPermission,
  getAIPermissions,
  getAIRoleLevel,
  listAIRoles,
  type AIRole,
} from "@/lib/ai-rbac";

describe("checkAIPermission", () => {
  it("ai_viewer はタスク閲覧が可能", () => {
    expect(checkAIPermission("ai_viewer", "tasks:view")).toBe(true);
    expect(checkAIPermission("ai_viewer", "metrics:view")).toBe(true);
  });

  it("ai_viewer はフィードバック追加が不可", () => {
    expect(checkAIPermission("ai_viewer", "feedback:add")).toBe(false);
    expect(checkAIPermission("ai_viewer", "policy:edit")).toBe(false);
  });

  it("ai_operator はフィードバック追加・アサインが可能", () => {
    expect(checkAIPermission("ai_operator", "feedback:add")).toBe(true);
    expect(checkAIPermission("ai_operator", "tasks:assign")).toBe(true);
  });

  it("ai_operator はポリシー編集が不可", () => {
    expect(checkAIPermission("ai_operator", "policy:edit")).toBe(false);
  });

  it("ai_config_editor はポリシー編集・変更リクエストが可能", () => {
    expect(checkAIPermission("ai_config_editor", "policy:edit")).toBe(true);
    expect(checkAIPermission("ai_config_editor", "config:change_request")).toBe(true);
  });

  it("ai_config_editor は承認/却下が不可", () => {
    expect(checkAIPermission("ai_config_editor", "config:approve")).toBe(false);
    expect(checkAIPermission("ai_config_editor", "config:reject")).toBe(false);
  });

  it("ai_approver は承認/却下が可能", () => {
    expect(checkAIPermission("ai_approver", "config:approve")).toBe(true);
    expect(checkAIPermission("ai_approver", "config:reject")).toBe(true);
  });

  it("ai_approver はロールバック・システム管理が不可", () => {
    expect(checkAIPermission("ai_approver", "config:rollback")).toBe(false);
    expect(checkAIPermission("ai_approver", "system:admin")).toBe(false);
  });

  it("ai_admin は全権限を持つ", () => {
    expect(checkAIPermission("ai_admin", "tasks:view")).toBe(true);
    expect(checkAIPermission("ai_admin", "config:approve")).toBe(true);
    expect(checkAIPermission("ai_admin", "config:rollback")).toBe(true);
    expect(checkAIPermission("ai_admin", "system:admin")).toBe(true);
  });

  it("存在しないアクションはfalse", () => {
    expect(checkAIPermission("ai_admin", "nonexistent:action")).toBe(false);
  });

  it("不正なロールはfalse", () => {
    expect(checkAIPermission("invalid_role" as AIRole, "tasks:view")).toBe(false);
  });
});

describe("getAIPermissions", () => {
  it("ai_viewer の権限一覧を取得", () => {
    const perms = getAIPermissions("ai_viewer");
    expect(perms).toContain("tasks:view");
    expect(perms).toContain("metrics:view");
    expect(perms).not.toContain("feedback:add");
  });

  it("ai_admin は最も多くの権限を持つ", () => {
    const viewerPerms = getAIPermissions("ai_viewer");
    const adminPerms = getAIPermissions("ai_admin");
    expect(adminPerms.length).toBeGreaterThan(viewerPerms.length);
  });

  it("上位ロールは下位ロールの権限を全て含む", () => {
    const viewerPerms = getAIPermissions("ai_viewer");
    const operatorPerms = getAIPermissions("ai_operator");
    const editorPerms = getAIPermissions("ai_config_editor");

    for (const perm of viewerPerms) {
      expect(operatorPerms).toContain(perm);
    }
    for (const perm of operatorPerms) {
      expect(editorPerms).toContain(perm);
    }
  });
});

describe("getAIRoleLevel", () => {
  it("ロールレベルが正しい順序", () => {
    expect(getAIRoleLevel("ai_viewer")).toBeLessThan(getAIRoleLevel("ai_operator"));
    expect(getAIRoleLevel("ai_operator")).toBeLessThan(getAIRoleLevel("ai_config_editor"));
    expect(getAIRoleLevel("ai_config_editor")).toBeLessThan(getAIRoleLevel("ai_approver"));
    expect(getAIRoleLevel("ai_approver")).toBeLessThan(getAIRoleLevel("ai_admin"));
  });

  it("不正なロールはレベル0", () => {
    expect(getAIRoleLevel("unknown" as AIRole)).toBe(0);
  });
});

describe("listAIRoles", () => {
  it("全5ロールを返す", () => {
    const roles = listAIRoles();
    expect(roles).toHaveLength(5);
  });

  it("各ロールにラベルとレベルが含まれる", () => {
    const roles = listAIRoles();
    for (const r of roles) {
      expect(r.role).toBeDefined();
      expect(r.label).toBeDefined();
      expect(r.level).toBeGreaterThan(0);
    }
  });
});
