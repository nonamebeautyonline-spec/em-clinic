import { redirect } from "next/navigation";

// 配送管理は pending ページに統合済み
export default function ShippingPage() {
  redirect("/admin/shipping/pending");
}
