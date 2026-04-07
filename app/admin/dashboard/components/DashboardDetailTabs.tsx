import dynamic from "next/dynamic";
import type { DashboardStats, TabType, WidgetSettings } from "../types";
import { TabButton } from "./ui/TabButton";
import { StatRow } from "./ui/StatRow";
import { StatCard } from "./ui/StatCard";

const SegmentWidget = dynamic(
  () => import("../widgets/segment-widget"),
  { ssr: false, loading: () => <SegmentWidgetSkeleton /> },
);

function SegmentWidgetSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 animate-pulse">
      <div className="h-4 w-32 bg-claude-sand rounded mb-4" />
      <div className="h-48 bg-claude-parchment rounded" />
    </div>
  );
}

interface DashboardDetailTabsProps {
  stats: DashboardStats | null;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  widgetSettings: WidgetSettings;
}

export function DashboardDetailTabs({ stats, activeTab, setActiveTab, widgetSettings }: DashboardDetailTabsProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100">
      <div className="border-b border-claude-border-cream px-4 pt-4">
        <nav className="flex gap-1">
          <TabButton
            active={activeTab === "overview"}
            onClick={() => setActiveTab("overview")}
            label="概要"
          />
          <TabButton
            active={activeTab === "reservations"}
            onClick={() => setActiveTab("reservations")}
            label="予約・配送"
          />
          <TabButton
            active={activeTab === "revenue"}
            onClick={() => setActiveTab("revenue")}
            label="売上・商品"
          />
          <TabButton
            active={activeTab === "patients"}
            onClick={() => setActiveTab("patients")}
            label="患者"
          />
        </nav>
      </div>

      <div className="p-6">
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 売上 */}
              <div>
                <h3 className="text-sm font-bold text-claude-near-black mb-4">売上</h3>
                <div className="space-y-1">
                  <div className="flex items-center justify-between py-3 border-b border-claude-border-cream">
                    <div>
                      <span className="text-sm font-medium text-claude-near-black">純売上</span>
                      <div className="text-xs text-claude-stone">返金後の金額</div>
                    </div>
                    <span className="text-xl font-bold text-claude-near-black">
                      ¥{(stats?.revenue.total || 0).toLocaleString()}
                    </span>
                  </div>
                  <StatRow label="総売上" value={`¥${(stats?.revenue.gross || 0).toLocaleString()}`} />
                  <StatRow label="カード決済" value={`¥${(stats?.revenue.square || 0).toLocaleString()}`} />
                  <StatRow label="銀行振込" value={`¥${(stats?.revenue.bankTransfer || 0).toLocaleString()}`} />
                  <StatRow label="返金" value={`-¥${(stats?.revenue.refunded || 0).toLocaleString()} (${stats?.revenue.refundCount || 0}件)`} highlight="red" />
                </div>
              </div>

              {/* 銀行振込状況 */}
              <div>
                <h3 className="text-sm font-bold text-claude-near-black mb-4">銀行振込状況</h3>
                <div className="space-y-1">
                  <div className="flex items-center justify-between py-3 border-b border-claude-border-cream">
                    <span className="text-sm text-claude-olive">入金待ち</span>
                    <span className="text-xl font-bold text-claude-coral">
                      {stats?.bankTransfer.pending || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-claude-border-cream last:border-b-0">
                    <span className="text-sm text-claude-olive">確認済み</span>
                    <span className="text-xl font-bold text-emerald-600">
                      {stats?.bankTransfer.confirmed || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* クイック統計 */}
              <div>
                <h3 className="text-sm font-bold text-claude-near-black mb-4">その他統計</h3>
                <div className="space-y-1">
                  <StatRow label="リピート率" value={`${stats?.patients.repeatRate || 0}%`} />
                  <StatRow label="総患者数" value={`${stats?.patients.total || 0}人`} />
                  <StatRow label="新規患者" value={`${stats?.patients.new || 0}人`} />
                  <StatRow label="キャンセル率" value={`${stats?.reservations.cancelRate || 0}%`} />
                </div>
              </div>
            </div>

          </div>
        )}

        {activeTab === "reservations" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-bold text-claude-near-black mb-4">予約</h3>
              <div className="space-y-1">
                <StatRow label="総予約数" value={`${stats?.reservations.total || 0}件`} />
                <StatRow label="診察済み" value={`${stats?.reservations.completed || 0}件`} />
                <StatRow label="キャンセル" value={`${stats?.reservations.cancelled || 0}件`} />
                <StatRow
                  label="キャンセル率"
                  value={`${stats?.reservations.cancelRate || 0}%`}
                  highlight="red"
                />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-claude-near-black mb-4">配送</h3>
              <div className="space-y-1">
                <StatRow label="総配送数" value={`${stats?.shipping.total || 0}件`} />
                <StatRow label="新規" value={`${stats?.shipping.first || 0}件`} />
                <StatRow label="再処方" value={`${stats?.shipping.reorder || 0}件`} />
                <StatRow
                  label="未発送"
                  value={`${stats?.shipping.pending || 0}件`}
                  highlight="orange"
                />
                <StatRow
                  label="遅延"
                  value={`${stats?.shipping.delayed || 0}件`}
                  highlight="red"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === "revenue" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white rounded-2xl border border-slate-100 p-5">
                <div className="text-xs font-medium text-claude-stone mb-1">純売上</div>
                <div className="text-xs text-claude-stone mb-2">返金後の金額</div>
                <div className="text-2xl font-bold text-claude-near-black">
                  ¥{(stats?.revenue.total || 0).toLocaleString()}
                </div>
              </div>
              <StatCard label="総売上" value={`¥${(stats?.revenue.gross || 0).toLocaleString()}`} />
              <StatCard label="カード決済" value={`¥${(stats?.revenue.square || 0).toLocaleString()}`} />
              <StatCard label="銀行振込" value={`¥${(stats?.revenue.bankTransfer || 0).toLocaleString()}`} />
              <div className="bg-white rounded-2xl border border-slate-100 p-5">
                <div className="text-xs font-medium text-claude-error mb-2">返金</div>
                <div className="text-2xl font-bold text-claude-error">
                  -¥{(stats?.revenue.refunded || 0).toLocaleString()}
                </div>
                <div className="text-xs text-claude-stone mt-1">{stats?.revenue.refundCount || 0}件</div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-claude-near-black mb-4">商品別売上</h3>
              <div className="space-y-1">
                {stats?.products.map((product) => (
                  <div
                    key={product.code}
                    className="flex items-center justify-between py-3 border-b border-claude-border-cream last:border-b-0 hover:bg-claude-parchment/50 transition-colors"
                  >
                    <div>
                      <div className="text-sm font-medium text-claude-near-black">{product.name}</div>
                      <div className="text-xs text-claude-stone">{product.code}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-claude-near-black">
                        ¥{product.revenue.toLocaleString()}
                      </div>
                      <div className="text-xs text-claude-stone">{product.count}件</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "patients" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <h3 className="text-sm font-bold text-claude-near-black mb-4">患者統計</h3>
                <div className="space-y-1">
                  <StatRow label="総患者数" value={`${stats?.patients.total || 0}人`} />
                  <StatRow label="アクティブ患者" value={`${stats?.patients.active || 0}人`} />
                  <StatRow label="新規患者" value={`${stats?.patients.new || 0}人`} />
                  <StatRow
                    label="リピート率"
                    value={`${stats?.patients.repeatRate || 0}%`}
                    highlight="green"
                  />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-claude-near-black mb-4">エンゲージメント</h3>
                <div className="space-y-1">
                  <StatRow label="LINE登録者" value={`${stats?.kpi.lineRegisteredCount || 0}人`} />
                  <StatRow
                    label="問診後の予約率"
                    value={`${stats?.kpi.reservationRateAfterIntake || 0}%`}
                  />
                  <StatRow
                    label="予約後の受診率"
                    value={`${stats?.kpi.consultationCompletionRate || 0}%`}
                  />
                </div>
              </div>

              {widgetSettings.segmentChart && <SegmentWidget />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
