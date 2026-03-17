"use client";

import { useState } from "react";

/* ═══════════════════════════════════════════════════════════════════════════
   SEO分析ダッシュボード — LP（l-ope.jp/lp）のSEOステータスを一覧管理
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── 構造化データチェック項目 ── */
const structuredDataChecks = [
  { name: "Organization", path: "layout.tsx", status: "active" as const, desc: "サービス提供者情報" },
  { name: "SoftwareApplication", path: "layout.tsx", status: "active" as const, desc: "SaaS製品情報・機能リスト" },
  { name: "WebSite", path: "layout.tsx", status: "active" as const, desc: "サイト基本情報" },
  { name: "BreadcrumbList", path: "layout.tsx", status: "active" as const, desc: "パンくずリスト" },
  { name: "FAQPage", path: "FAQ.tsx", status: "active" as const, desc: "FAQ 8項目のリッチリザルト" },
  { name: "Service (Pricing)", path: "Pricing.tsx", status: "active" as const, desc: "サービス情報（価格非公開）" },
  { name: "Service (Global)", path: "layout.tsx", status: "active" as const, desc: "B2Bサービス情報・対象エリア" },
  { name: "ItemList", path: "features/page.tsx", status: "active" as const, desc: "機能一覧ページの構造化リスト" },
];

/* ── メタデータチェック項目 ── */
const metaChecks = [
  { name: "title", status: "ok" as const, value: "Lオペ for CLINIC | LINE公式アカウントでクリニック業務をDX化" },
  { name: "description", status: "ok" as const, value: "LINE公式アカウントを活用したクリニック業務のDX化…" },
  { name: "canonical", status: "ok" as const, value: "https://l-ope.jp/lp" },
  { name: "og:title", status: "ok" as const, value: "設定済み" },
  { name: "og:description", status: "ok" as const, value: "設定済み" },
  { name: "og:image", status: "ok" as const, value: "opengraph-image.tsx（next/og動的生成 1200×630）" },
  { name: "twitter:card", status: "ok" as const, value: "summary_large_image" },
  { name: "robots.txt", status: "ok" as const, value: "設定済み（管理画面Disallow）" },
  { name: "sitemap.xml", status: "ok" as const, value: "4ページ登録済み" },
];

/* ── SEOスコア算出 ── */
const seoItems = [
  { category: "テクニカルSEO", items: [
    { name: "SSR（Server Component）", done: true },
    { name: "robots.txt", done: true },
    { name: "sitemap.xml", done: true },
    { name: "canonical URL", done: true },
    { name: "OGP画像配置", done: true },
    { name: "Core Web Vitals最適化", done: true },
  ]},
  { category: "構造化データ", items: [
    { name: "Organization JSON-LD", done: true },
    { name: "SoftwareApplication JSON-LD", done: true },
    { name: "FAQPage JSON-LD", done: true },
    { name: "Product JSON-LD", done: true },
    { name: "BreadcrumbList JSON-LD", done: true },
  ]},
  { category: "セマンティックHTML", items: [
    { name: "見出し階層（h1→h2→h3）", done: true },
    { name: "main タグ", done: true },
    { name: "ARIA属性（FAQ）", done: true },
    { name: "ARIA属性（タブ）", done: true },
    { name: "nav / footer セマンティクス", done: true },
    { name: "ol/li（導入フロー）", done: true },
  ]},
  { category: "コンテンツSEO", items: [
    { name: "ターゲットKW設定", done: true },
    { name: "メタディスクリプション最適化", done: true },
    { name: "Twitter Card設定", done: true },
    { name: "OGP設定", done: true },
    { name: "キーワード密度確認", done: true },
    { name: "内部リンク最適化", done: true },
    { name: "機能一覧サブページ", done: true },
  ]},
  { category: "アクセシビリティ", items: [
    { name: "skip-to-contentリンク", done: true },
    { name: "ダッシュボードモック aria-label", done: true },
    { name: "問題リスト セマンティック化", done: true },
    { name: "UseCases articleタグ", done: true },
  ]},
];

const totalItems = seoItems.reduce((sum, c) => sum + c.items.length, 0);
const doneItems = seoItems.reduce((sum, c) => sum + c.items.filter((i) => i.done).length, 0);
const seoScore = Math.round((doneItems / totalItems) * 100);

/* ── ターゲットキーワード ── */
const targetKeywords = [
  { keyword: "Lオペ", cluster: "ブランド", priority: "高" },
  { keyword: "LINE公式アカウント クリニック", cluster: "ピラー", priority: "高" },
  { keyword: "クリニック LINE", cluster: "ピラー", priority: "高" },
  { keyword: "クリニック DX", cluster: "ピラー", priority: "高" },
  { keyword: "医療 LINE公式", cluster: "LINE運用", priority: "中" },
  { keyword: "クリニック 予約管理", cluster: "業務効率化", priority: "中" },
  { keyword: "クリニック 患者CRM", cluster: "業務効率化", priority: "中" },
  { keyword: "医療 AI自動返信", cluster: "業務効率化", priority: "中" },
  { keyword: "クリニック LINE 費用", cluster: "導入検討", priority: "高" },
  { keyword: "クリニック LINE 導入", cluster: "導入検討", priority: "中" },
  { keyword: "Lステップ クリニック", cluster: "競合比較", priority: "中" },
  { keyword: "Liny クリニック", cluster: "競合比較", priority: "中" },
  { keyword: "クリニック LINE配信ツール 比較", cluster: "競合比較", priority: "中" },
];

export default function PlatformSEOPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "meta" | "structured" | "keywords">("overview");
  const tabs = [
    { id: "overview" as const, label: "概要" },
    { id: "meta" as const, label: "メタデータ" },
    { id: "structured" as const, label: "構造化データ" },
    { id: "keywords" as const, label: "キーワード" },
  ];

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">SEO分析</h1>
        <p className="mt-1 text-sm text-slate-500">LP（l-ope.jp/lp）のSEO対策ステータスを管理</p>
      </div>

      {/* SEOスコア */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-400">SEOスコア</div>
          <div className={`mt-1 text-3xl font-extrabold ${seoScore >= 80 ? "text-emerald-600" : seoScore >= 60 ? "text-amber-600" : "text-red-600"}`}>{seoScore}<span className="text-sm font-normal text-slate-400">%</span></div>
          <div className="mt-2 h-2 rounded-full bg-slate-100"><div className={`h-full rounded-full ${seoScore >= 80 ? "bg-emerald-500" : seoScore >= 60 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${seoScore}%` }} /></div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-400">実装済み項目</div>
          <div className="mt-1 text-3xl font-extrabold text-blue-600">{doneItems}<span className="text-sm font-normal text-slate-400">/{totalItems}</span></div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-400">構造化データ</div>
          <div className="mt-1 text-3xl font-extrabold text-violet-600">{structuredDataChecks.length}<span className="text-sm font-normal text-slate-400">種類</span></div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-400">ターゲットKW</div>
          <div className="mt-1 text-3xl font-extrabold text-amber-600">{targetKeywords.length}<span className="text-sm font-normal text-slate-400">個</span></div>
        </div>
      </div>

      {/* タブ */}
      <div className="border-b border-slate-200">
        <div className="flex gap-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`pb-3 text-sm font-semibold transition ${activeTab === t.id ? "border-b-2 border-amber-500 text-amber-700" : "text-slate-400 hover:text-slate-600"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* タブコンテンツ */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {seoItems.map((cat) => (
            <div key={cat.category} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-bold text-slate-700">{cat.category}</h3>
              <div className="space-y-2">
                {cat.items.map((item) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${item.done ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                      {item.done ? "✓" : "−"}
                    </span>
                    <span className={`text-sm ${item.done ? "text-slate-700" : "text-slate-400"}`}>{item.name}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-xs text-slate-400">
                {cat.items.filter((i) => i.done).length}/{cat.items.length} 完了
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "meta" && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="divide-y divide-slate-100">
            {metaChecks.map((m) => (
              <div key={m.name} className="flex items-center gap-4 px-5 py-3.5">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  m.status === "ok" ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                }`}>
                  {m.status === "ok" ? "✓" : "!"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-700">{m.name}</div>
                  <div className="truncate text-xs text-slate-400">{m.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "structured" && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="divide-y divide-slate-100">
            {structuredDataChecks.map((s) => (
              <div key={s.name} className="flex items-center gap-4 px-5 py-3.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-600">✓</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-700">{s.name}</div>
                  <div className="text-xs text-slate-400">{s.desc}</div>
                </div>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{s.path}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "keywords" && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-5 py-3 font-semibold text-slate-500">キーワード</th>
                <th className="px-5 py-3 font-semibold text-slate-500">クラスター</th>
                <th className="px-5 py-3 font-semibold text-slate-500">優先度</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {targetKeywords.map((kw) => (
                <tr key={kw.keyword} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3 font-medium text-slate-700">{kw.keyword}</td>
                  <td className="px-5 py-3">
                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">{kw.cluster}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      kw.priority === "高" ? "bg-red-50 text-red-700" : kw.priority === "中" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"
                    }`}>
                      {kw.priority}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 未完了タスク */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <h3 className="mb-3 text-sm font-bold text-amber-800">未完了のSEO施策</h3>
        <ul className="space-y-2">
          {seoItems.flatMap((c) => c.items.filter((i) => !i.done).map((i) => ({ ...i, category: c.category }))).map((item) => (
            <li key={item.name} className="flex items-center gap-2 text-sm text-amber-700">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span className="font-medium">{item.category}</span>: {item.name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
