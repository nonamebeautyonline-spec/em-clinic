// クーポン管理 → キャンペーン管理のクーポンタブにリダイレクト
import { redirect } from "next/navigation";

export default function CouponsPage() {
  redirect("/admin/campaigns?tab=coupon");
}
