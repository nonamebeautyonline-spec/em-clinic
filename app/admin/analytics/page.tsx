import { redirect } from "next/navigation";

// 売上分析は売上管理ページに統合済み
export default function AnalyticsRedirect() {
  redirect("/admin/accounting");
}
