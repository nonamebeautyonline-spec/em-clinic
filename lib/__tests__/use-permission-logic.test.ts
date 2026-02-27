import { describe, it, expect } from "vitest";
import { hasPermission, ROLE_PERMISSIONS, type Permission } from "../permissions";

// usePermission.ts の内部ロジック:
// const role = data.user?.tenantRole || "admin";
// setAllowed(hasPermission(role, permission));
// → tenantRole未設定時は "admin" にフォールバックする

// hasPermission は純粋関数なので直接テスト可能

describe("hasPermission", () => {
  // ================================================================
  // admin ロール
  // ================================================================
  describe("adminロール", () => {
    it("patients.viewを持つ", () => {
      expect(hasPermission("admin", "patients.view")).toBe(true);
    });

    it("patients.editを持つ", () => {
      expect(hasPermission("admin", "patients.edit")).toBe(true);
    });

    it("dashboard.viewを持つ", () => {
      expect(hasPermission("admin", "dashboard.view")).toBe(true);
    });

    it("settings.editを持つ", () => {
      expect(hasPermission("admin", "settings.edit")).toBe(true);
    });

    it("members.editを持たない（ownerのみ）", () => {
      expect(hasPermission("admin", "members.edit")).toBe(false);
    });

    it("members.viewは持つ", () => {
      expect(hasPermission("admin", "members.view")).toBe(true);
    });
  });

  // ================================================================
  // owner ロール（全権限）
  // ================================================================
  describe("ownerロール", () => {
    it("全権限を持つ", () => {
      const allPermissions = ROLE_PERMISSIONS.owner;
      for (const perm of allPermissions) {
        expect(hasPermission("owner", perm)).toBe(true);
      }
    });

    it("members.editを持つ（adminとの差分）", () => {
      expect(hasPermission("owner", "members.edit")).toBe(true);
    });
  });

  // ================================================================
  // viewer ロール
  // ================================================================
  describe("viewerロール", () => {
    it("patients.viewを持つ", () => {
      expect(hasPermission("viewer", "patients.view")).toBe(true);
    });

    it("patients.editを持たない", () => {
      expect(hasPermission("viewer", "patients.edit")).toBe(false);
    });

    it("karte.editを持たない", () => {
      expect(hasPermission("viewer", "karte.edit")).toBe(false);
    });

    it("settings.editを持たない", () => {
      expect(hasPermission("viewer", "settings.edit")).toBe(false);
    });

    it("閲覧系権限は全て持つ", () => {
      const viewPermissions: Permission[] = [
        "dashboard.view",
        "patients.view",
        "karte.view",
        "reservations.view",
        "shipping.view",
        "billing.view",
        "analytics.view",
        "friends.view",
        "broadcast.view",
        "richmenu.view",
        "ai_reply.view",
      ];
      for (const perm of viewPermissions) {
        expect(hasPermission("viewer", perm)).toBe(true);
      }
    });
  });

  // ================================================================
  // editor ロール
  // ================================================================
  describe("editorロール", () => {
    it("patients.editを持つ", () => {
      expect(hasPermission("editor", "patients.edit")).toBe(true);
    });

    it("settings.editを持たない", () => {
      expect(hasPermission("editor", "settings.edit")).toBe(false);
    });

    it("members.viewを持たない", () => {
      expect(hasPermission("editor", "members.view")).toBe(false);
    });

    it("billing.editを持たない", () => {
      expect(hasPermission("editor", "billing.edit")).toBe(false);
    });
  });

  // ================================================================
  // 存在しないロール
  // ================================================================
  describe("存在しないロール", () => {
    it("falseを返す", () => {
      expect(hasPermission("nonexistent", "patients.view")).toBe(false);
      expect(hasPermission("", "patients.view")).toBe(false);
      expect(hasPermission("superadmin", "dashboard.view")).toBe(false);
    });
  });

  // ================================================================
  // usePermission のデフォルトロールフォールバック
  // ================================================================
  describe("tenantRole未設定時のデフォルト'admin'フォールバック", () => {
    // usePermission.ts: const role = data.user?.tenantRole || "admin";
    // tenantRoleが未設定/falsy時は"admin"が使われるため、
    // hasPermission("admin", ...)で検証

    it("デフォルトadminロールでpatients.view/editが許可される", () => {
      expect(hasPermission("admin", "patients.view")).toBe(true);
      expect(hasPermission("admin", "patients.edit")).toBe(true);
    });

    it("デフォルトadminロールでsettings.editが許可される", () => {
      expect(hasPermission("admin", "settings.edit")).toBe(true);
    });

    it("デフォルトadminロールでmembers.editは拒否される", () => {
      expect(hasPermission("admin", "members.edit")).toBe(false);
    });
  });
});

// ================================================================
// ROLE_PERMISSIONS の整合性
// ================================================================
describe("ROLE_PERMISSIONS 整合性", () => {
  it("owner権限はadmin権限を包含する", () => {
    for (const perm of ROLE_PERMISSIONS.admin) {
      expect(ROLE_PERMISSIONS.owner).toContain(perm);
    }
  });

  it("admin権限はeditor権限を包含する", () => {
    for (const perm of ROLE_PERMISSIONS.editor) {
      expect(ROLE_PERMISSIONS.admin).toContain(perm);
    }
  });

  it("editor権限はviewer権限を包含する", () => {
    for (const perm of ROLE_PERMISSIONS.viewer) {
      expect(ROLE_PERMISSIONS.editor).toContain(perm);
    }
  });
});
