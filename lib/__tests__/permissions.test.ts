// lib/__tests__/permissions.test.ts — 細粒度権限管理のテスト
import { describe, it, expect } from "vitest";
import {
  hasPermission,
  getRequiredPermission,
  ROLE_PERMISSIONS,
  type Permission,
} from "@/lib/permissions";

describe("hasPermission", () => {
  describe("owner ロール", () => {
    it("全ての権限を持つ", () => {
      const allPermissions: Permission[] = [
        "dashboard.view",
        "patients.view", "patients.edit",
        "karte.view", "karte.edit",
        "reservations.view", "reservations.edit",
        "shipping.view", "shipping.edit",
        "billing.view", "billing.edit",
        "settings.view", "settings.edit",
        "members.view", "members.edit",
        "analytics.view", "analytics.export",
        "friends.view", "friends.edit",
        "broadcast.view", "broadcast.send",
        "richmenu.view", "richmenu.edit",
        "ai_reply.view", "ai_reply.edit",
      ];
      for (const perm of allPermissions) {
        expect(hasPermission("owner", perm)).toBe(true);
      }
    });
  });

  describe("admin ロール", () => {
    it("メンバー編集権限を持たない", () => {
      expect(hasPermission("admin", "members.edit")).toBe(false);
    });

    it("メンバー閲覧権限は持つ", () => {
      expect(hasPermission("admin", "members.view")).toBe(true);
    });

    it("設定編集権限を持つ", () => {
      expect(hasPermission("admin", "settings.edit")).toBe(true);
    });

    it("患者編集権限を持つ", () => {
      expect(hasPermission("admin", "patients.edit")).toBe(true);
    });
  });

  describe("editor ロール", () => {
    it("設定編集権限を持たない", () => {
      expect(hasPermission("editor", "settings.edit")).toBe(false);
    });

    it("設定閲覧権限を持たない", () => {
      expect(hasPermission("editor", "settings.view")).toBe(false);
    });

    it("メンバー管理権限を持たない", () => {
      expect(hasPermission("editor", "members.view")).toBe(false);
      expect(hasPermission("editor", "members.edit")).toBe(false);
    });

    it("患者編集権限を持つ", () => {
      expect(hasPermission("editor", "patients.edit")).toBe(true);
    });

    it("カルテ編集権限を持つ", () => {
      expect(hasPermission("editor", "karte.edit")).toBe(true);
    });

    it("配信送信権限を持つ", () => {
      expect(hasPermission("editor", "broadcast.send")).toBe(true);
    });
  });

  describe("viewer ロール", () => {
    it("全ての閲覧権限を持つ", () => {
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

    it("全ての編集権限を持たない", () => {
      const editPermissions: Permission[] = [
        "patients.edit",
        "karte.edit",
        "reservations.edit",
        "shipping.edit",
        "billing.edit",
        "settings.edit",
        "members.edit",
        "analytics.export",
        "friends.edit",
        "broadcast.send",
        "richmenu.edit",
        "ai_reply.edit",
      ];
      for (const perm of editPermissions) {
        expect(hasPermission("viewer", perm)).toBe(false);
      }
    });
  });

  describe("不明なロール", () => {
    it("全ての権限を持たない", () => {
      expect(hasPermission("unknown", "dashboard.view")).toBe(false);
      expect(hasPermission("", "dashboard.view")).toBe(false);
    });
  });
});

describe("getRequiredPermission", () => {
  describe("除外パス", () => {
    it("ログインAPIはnullを返す", () => {
      expect(getRequiredPermission("/api/admin/login", "POST")).toBeNull();
    });

    it("ログアウトAPIはnullを返す", () => {
      expect(getRequiredPermission("/api/admin/logout", "POST")).toBeNull();
    });

    it("セッションAPIはnullを返す", () => {
      expect(getRequiredPermission("/api/admin/session", "GET")).toBeNull();
    });

    it("チャット既読APIはnullを返す", () => {
      expect(getRequiredPermission("/api/admin/chat-reads", "PUT")).toBeNull();
    });

    it("アカウントAPIはnullを返す", () => {
      expect(getRequiredPermission("/api/admin/account", "PUT")).toBeNull();
    });
  });

  describe("admin API以外", () => {
    it("患者向けAPIはnullを返す", () => {
      expect(getRequiredPermission("/api/checkout", "POST")).toBeNull();
    });

    it("webhookはnullを返す", () => {
      expect(getRequiredPermission("/api/line/webhook", "POST")).toBeNull();
    });
  });

  describe("患者管理API", () => {
    it("GETは patients.view を返す", () => {
      expect(getRequiredPermission("/api/admin/patients", "GET")).toBe("patients.view");
    });

    it("POSTは patients.edit を返す", () => {
      expect(getRequiredPermission("/api/admin/patients/bulk/action", "POST")).toBe("patients.edit");
    });

    it("PUTは patients.edit を返す", () => {
      expect(getRequiredPermission("/api/admin/patients/123/fields", "PUT")).toBe("patients.edit");
    });
  });

  describe("カルテAPI", () => {
    it("GETは karte.view を返す", () => {
      expect(getRequiredPermission("/api/admin/karte", "GET")).toBe("karte.view");
    });

    it("POSTは karte.edit を返す", () => {
      expect(getRequiredPermission("/api/admin/karte", "POST")).toBe("karte.edit");
    });
  });

  describe("予約API", () => {
    it("GETは reservations.view を返す", () => {
      expect(getRequiredPermission("/api/admin/reservations", "GET")).toBe("reservations.view");
    });

    it("POSTは reservations.edit を返す", () => {
      expect(getRequiredPermission("/api/admin/weekly_rules", "POST")).toBe("reservations.edit");
    });
  });

  describe("発送管理API", () => {
    it("GETは shipping.view を返す", () => {
      expect(getRequiredPermission("/api/admin/shipping/pending", "GET")).toBe("shipping.view");
    });

    it("POSTは shipping.edit を返す", () => {
      expect(getRequiredPermission("/api/admin/shipping/notify-shipped", "POST")).toBe("shipping.edit");
    });
  });

  describe("決済管理API", () => {
    it("GETは billing.view を返す", () => {
      expect(getRequiredPermission("/api/admin/reorders", "GET")).toBe("billing.view");
    });

    it("POSTは billing.edit を返す", () => {
      expect(getRequiredPermission("/api/admin/reorders/approve", "POST")).toBe("billing.edit");
    });
  });

  describe("設定API", () => {
    it("GETは settings.view を返す", () => {
      expect(getRequiredPermission("/api/admin/settings", "GET")).toBe("settings.view");
    });

    it("PUTは settings.edit を返す", () => {
      expect(getRequiredPermission("/api/admin/settings", "PUT")).toBe("settings.edit");
    });
  });

  describe("LINE機能API", () => {
    it("配信GETは broadcast.view を返す", () => {
      expect(getRequiredPermission("/api/admin/line/broadcast", "GET")).toBe("broadcast.view");
    });

    it("配信POSTは broadcast.send を返す", () => {
      expect(getRequiredPermission("/api/admin/line/broadcast", "POST")).toBe("broadcast.send");
    });

    it("リッチメニューGETは richmenu.view を返す", () => {
      expect(getRequiredPermission("/api/admin/line/richmenu", "GET")).toBe("richmenu.view");
    });

    it("一般LINE APIのGETは friends.view を返す", () => {
      expect(getRequiredPermission("/api/admin/line/friends", "GET")).toBe("friends.view");
    });
  });

  describe("メンバー管理API", () => {
    it("GETは members.view を返す", () => {
      expect(getRequiredPermission("/api/admin/users", "GET")).toBe("members.view");
    });

    it("POSTは members.edit を返す", () => {
      expect(getRequiredPermission("/api/admin/users", "POST")).toBe("members.edit");
    });
  });

  describe("未定義パス", () => {
    it("GETはdashboard.viewを返す", () => {
      expect(getRequiredPermission("/api/admin/unknown-endpoint", "GET")).toBe("dashboard.view");
    });

    it("POSTはnullを返す", () => {
      expect(getRequiredPermission("/api/admin/unknown-endpoint", "POST")).toBeNull();
    });
  });
});

describe("ROLE_PERMISSIONS 構造", () => {
  it("4つのロールが定義されている", () => {
    expect(Object.keys(ROLE_PERMISSIONS)).toHaveLength(4);
    expect(ROLE_PERMISSIONS).toHaveProperty("owner");
    expect(ROLE_PERMISSIONS).toHaveProperty("admin");
    expect(ROLE_PERMISSIONS).toHaveProperty("editor");
    expect(ROLE_PERMISSIONS).toHaveProperty("viewer");
  });

  it("権限は上位ロールが下位ロールを包含する", () => {
    const viewerPerms = new Set(ROLE_PERMISSIONS.viewer);
    const editorPerms = new Set(ROLE_PERMISSIONS.editor);
    const adminPerms = new Set(ROLE_PERMISSIONS.admin);
    const ownerPerms = new Set(ROLE_PERMISSIONS.owner);

    // viewer の全権限は editor に含まれる
    for (const perm of viewerPerms) {
      expect(editorPerms.has(perm)).toBe(true);
    }

    // editor の全権限は admin に含まれる
    for (const perm of editorPerms) {
      expect(adminPerms.has(perm)).toBe(true);
    }

    // admin の全権限は owner に含まれる
    for (const perm of adminPerms) {
      expect(ownerPerms.has(perm)).toBe(true);
    }
  });
});
