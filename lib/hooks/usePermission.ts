// lib/hooks/usePermission.ts — クライアントサイド権限チェックhook
"use client";

import { useState, useEffect } from "react";
import { hasPermission, type Permission } from "@/lib/permissions";

/**
 * JWTのtenantRoleからROLE_PERMISSIONSを参照して権限チェック
 * サイドバーメニュー表示制御に使用
 */
export function usePermission(permission: Permission): boolean {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    async function checkRole() {
      try {
        const res = await fetch("/api/admin/session", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          const role = data.user?.tenantRole || "admin";
          setAllowed(hasPermission(role, permission));
        }
      } catch {
        setAllowed(false);
      }
    }
    checkRole();
  }, [permission]);

  return allowed;
}
