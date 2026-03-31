// lib/menu-permissions.ts — メニュー項目キー定義とパスマッピング

export interface MenuDef {
  key: string;
  label: string;
  section: string;
  paths: string[]; // このメニューがカバーするURLパスプレフィックス
}

// サイドバー全メニュー項目の定義
export const MENU_ITEMS: MenuDef[] = [
  { key: "dashboard", label: "ダッシュボード", section: "メイン", paths: ["/admin/dashboard"] },
  { key: "accounting", label: "売上管理", section: "メイン", paths: ["/admin/accounting"] },
  { key: "line", label: "LINE機能", section: "メイン", paths: ["/admin/line"] },
  { key: "reservations", label: "予約リスト", section: "予約・診察", paths: ["/admin/reservations"] },
  { key: "reorders", label: "再処方リスト", section: "予約・診察", paths: ["/admin/reorders"] },
  { key: "karte", label: "カルテ", section: "予約・診察", paths: ["/admin/karte", "/admin/kartesearch"] },
  { key: "doctor", label: "簡易カルテ", section: "予約・診察", paths: ["/admin/doctor"] },
  { key: "payments", label: "決済", section: "決済管理", paths: ["/admin/noname-master"] },
  { key: "bank_reconcile", label: "銀行振込照合", section: "決済管理", paths: ["/admin/bank-transfer"] },
  { key: "shipping", label: "発送", section: "発送管理", paths: ["/admin/shipping/pending"] },
  { key: "shipping_tracking", label: "追跡番号", section: "発送管理", paths: ["/admin/shipping/tracking"] },
  { key: "shipping_settings", label: "配送設定", section: "発送管理", paths: ["/admin/shipping/settings"] },
  { key: "view_mypage", label: "顧客マイページ確認", section: "顧客管理", paths: ["/admin/view-mypage"] },
  { key: "merge_patients", label: "顧客情報変更", section: "顧客管理", paths: ["/admin/merge-patients", "/admin/patient-data", "/admin/dedup-patients"] },
  { key: "intake_form", label: "問診設定", section: "業務管理", paths: ["/admin/intake-form"] },
  { key: "schedule", label: "予約設定", section: "業務管理", paths: ["/admin/schedule"] },
  { key: "notification_settings", label: "イベント通知", section: "業務管理", paths: ["/admin/notification-settings"] },
  { key: "products", label: "商品管理", section: "業務管理", paths: ["/admin/products"] },
  { key: "campaigns", label: "キャンペーン", section: "業務管理", paths: ["/admin/campaigns", "/admin/coupons"] },
  { key: "subscription_plans", label: "定期プラン", section: "決済管理", paths: ["/admin/subscription-plans"] },
  { key: "inventory", label: "在庫", section: "業務管理", paths: ["/admin/inventory"] },
  { key: "tracking_sources", label: "流入経路", section: "業務管理", paths: ["/admin/line/tracking-sources"] },
  // --- SALON専用メニュー ---
  { key: "stylists", label: "スタッフ管理", section: "予約・施術", paths: ["/admin/stylists"] },
  { key: "treatments", label: "施術メニュー", section: "予約・施術", paths: ["/admin/treatments"] },
  { key: "salon_karte", label: "施術カルテ", section: "予約・施術", paths: ["/admin/salon-karte"] },
  { key: "hotpepper", label: "HotPepper連携", section: "予約・施術", paths: ["/admin/hotpepper"] },
  { key: "stamp_cards", label: "スタンプカード", section: "業務管理", paths: ["/admin/stamp-cards"] },
  // --- EC専用メニュー ---
  { key: "ec_subscriptions", label: "定期購入管理", section: "注文管理", paths: ["/admin/ec-subscriptions"] },
  { key: "ec_settings", label: "EC連携設定", section: "注文管理", paths: ["/admin/ec-settings"] },
  { key: "rfm", label: "RFM分析", section: "注文管理", paths: ["/admin/rfm"] },
  // --- 共通 ---
  { key: "settings", label: "設定", section: "システム", paths: ["/admin/settings"] },
  { key: "help", label: "ヘルプ", section: "システム", paths: ["/admin/help"] },
];

// 全メニューキーの配列
export const ALL_MENU_KEYS = MENU_ITEMS.map((m) => m.key);

// 役職ラベル
export const ROLE_LABELS: Record<string, string> = {
  owner: "管理者",
  admin: "副管理者",
  editor: "運用者",
  viewer: "スタッフ",
};

// セクション別にグループ化
export function getMenuItemsBySection(): { section: string; items: MenuDef[] }[] {
  const sectionMap = new Map<string, MenuDef[]>();
  for (const item of MENU_ITEMS) {
    const list = sectionMap.get(item.section) || [];
    list.push(item);
    sectionMap.set(item.section, list);
  }
  return [...sectionMap.entries()].map(([section, items]) => ({ section, items }));
}

// パス → menu_key 逆引き（tracking_sourcesは/admin/line/tracking-sourcesなのでline より先にチェック）
const SORTED_MENU_ITEMS = [...MENU_ITEMS].sort(
  (a, b) => Math.max(...b.paths.map((p) => p.length)) - Math.max(...a.paths.map((p) => p.length)),
);

export function resolveMenuKeyFromPath(pathname: string): string | null {
  for (const item of SORTED_MENU_ITEMS) {
    if (item.paths.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
      return item.key;
    }
  }
  // /admin ルートはダッシュボード扱い
  if (pathname === "/admin" || pathname === "/admin/") return "dashboard";
  return null;
}

// 管理者/副管理者は全権限
export function isFullAccessRole(role: string): boolean {
  return role === "owner" || role === "admin";
}
