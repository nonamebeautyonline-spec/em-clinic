"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";

// ── 型定義 ──────────────────────────────────────────

interface TemplateInfo {
  id: number;
  name: string;
  isActive: boolean;
}

interface FormField {
  id: string;
  type: string;
  label: string;
  options?: { label: string; value: string }[];
  sort_order: number;
  conditional?: { when: string; value: string };
}

interface IntakeResponse {
  id: string;
  patientId: string;
  patientName: string | null;
  patientTel: string | null;
  reservedDate: string | null;
  prescriptionMenu: string | null;
  status: string | null;
  answers: Record<string, string>;
  note: string | null;
  createdAt: string | null;
}

interface ListData {
  templates: TemplateInfo[];
  activeTemplate: { id: number; name: string; fields: FormField[] } | null;
  responses: IntakeResponse[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

interface FieldStat {
  fieldId: string;
  label: string;
  type: string;
  counts: { value: string; label: string; count: number }[];
  totalAnswered: number;
}

interface StatsData {
  templates: TemplateInfo[];
  activeTemplate: { id: number; name: string; fields: FormField[]; createdAt: string } | null;
  totalCount: number;
  fieldStats: FieldStat[];
}

type TabType = "overview" | "responses";

const PAGE_SIZE = 20;

// ── 回答値の表示変換 ──────────────────────────────────

function formatAnswer(field: FormField, value: string | undefined): string {
  if (value === undefined || value === null || value === "") return "—";
  if (field.options) {
    // チェックボックス（カンマ区切り）対応
    if (field.type === "checkbox") {
      return value
        .split(",")
        .map((v) => {
          const opt = field.options!.find((o) => o.value === v.trim());
          return opt ? opt.label : v.trim();
        })
        .join("、");
    }
    const opt = field.options.find((o) => o.value === value);
    return opt ? opt.label : value;
  }
  return value;
}

// ── メインコンポーネント ──────────────────────────────

export default function IntakeResponsesPage() {
  const searchParams = useSearchParams();
  const initialTemplateId = searchParams.get("template_id");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(initialTemplateId);
  const [activeTab, setActiveTab] = useState<TabType>("responses");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 回答一覧API
  const listKey = useMemo(() => {
    const params = new URLSearchParams({ page: String(currentPage), limit: String(PAGE_SIZE) });
    if (selectedTemplateId) params.set("template_id", selectedTemplateId);
    return `/api/admin/intake-responses?${params.toString()}`;
  }, [currentPage, selectedTemplateId]);

  // 統計API
  const statsKey = useMemo(() => {
    const params = new URLSearchParams({ mode: "stats" });
    if (selectedTemplateId) params.set("template_id", selectedTemplateId);
    return `/api/admin/intake-responses?${params.toString()}`;
  }, [selectedTemplateId]);

  const { data: listData, isLoading: listLoading, error: listError } = useSWR<ListData>(
    activeTab === "responses" ? listKey : null,
  );
  const { data: statsData, isLoading: statsLoading, error: statsError } = useSWR<StatsData>(
    activeTab === "overview" ? statsKey : null,
  );

  // テンプレートのフィールド（heading除外）
  const displayFields = useMemo(() => {
    const fields = listData?.activeTemplate?.fields || statsData?.activeTemplate?.fields || [];
    return (fields as FormField[])
      .filter((f) => f.type !== "heading")
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [listData?.activeTemplate, statsData?.activeTemplate]);

  const templates = listData?.templates || statsData?.templates || [];
  const activeTemplate = listData?.activeTemplate || statsData?.activeTemplate;

  // テンプレート切替
  const handleTemplateChange = (id: string) => {
    setSelectedTemplateId(id);
    setCurrentPage(1);
    setExpandedId(null);
  };

  // タブ切替
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setExpandedId(null);
  };

  const isLoading = activeTab === "responses" ? listLoading : statsLoading;
  const hasError = activeTab === "responses" ? listError : statsError;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* パンくず */}
        <a
          href="/admin/intake-form"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          問診設定に戻る
        </a>

        {/* タイトル */}
        <h1 className="text-xl font-bold text-gray-800 mb-1">
          {activeTemplate ? activeTemplate.name : "問診回答"}
        </h1>

        {/* テンプレート選択 */}
        {templates.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {templates.map((tpl) => {
              const isSelected = activeTemplate ? String(activeTemplate.id) === String(tpl.id) : false;
              return (
                <button
                  key={tpl.id}
                  onClick={() => handleTemplateChange(String(tpl.id))}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all border ${
                    isSelected
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {tpl.name}
                  {tpl.isActive && <span className="ml-1 opacity-75">(使用中)</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* タブ */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-0 -mb-px">
            {([
              { key: "overview" as TabType, label: "概要" },
              { key: "responses" as TabType, label: "回答一覧" },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* コンテンツ */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-7 h-7 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : hasError ? (
          <div className="text-center py-20 text-red-500 text-sm">問診回答の取得に失敗しました</div>
        ) : activeTab === "overview" ? (
          <OverviewTab statsData={statsData!} />
        ) : (
          <ResponsesTab
            listData={listData!}
            displayFields={displayFields}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            expandedId={expandedId}
            setExpandedId={setExpandedId}
          />
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// 概要タブ
// ════════════════════════════════════════════════════════

function OverviewTab({ statsData }: { statsData: StatsData }) {
  const { totalCount, fieldStats, activeTemplate } = statsData;

  return (
    <div className="space-y-6">
      {/* 登録日・回答数サマリー */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {activeTemplate && "createdAt" in activeTemplate && (
          <div className="flex border-b border-gray-200">
            <div className="w-48 px-4 py-3 bg-gray-50 text-sm font-medium text-gray-600 border-r border-gray-200">
              登録日
            </div>
            <div className="px-4 py-3 text-sm text-gray-800">
              {new Date((activeTemplate as StatsData["activeTemplate"] & { createdAt: string })!.createdAt).toLocaleDateString("ja-JP", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        )}
        <div className="px-4 py-5">
          <h3 className="text-sm font-bold text-gray-700 mb-3">回答数カウンター</h3>
          <div className="bg-white border border-gray-200 rounded overflow-hidden">
            <div className="flex border-b border-gray-200">
              <div className="w-48 px-4 py-2.5 bg-gray-50 text-sm font-medium text-gray-600 border-r border-gray-200">
                フォーム回答数
              </div>
              <div className="px-4 py-2.5 text-sm font-bold text-gray-900">{totalCount.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* フィールド別回答統計 */}
      {fieldStats.map((stat) => (
        <div key={stat.fieldId} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-bold text-gray-700">{stat.label}</h3>
          </div>
          {stat.counts.length > 0 ? (
            <table className="w-full">
              <tbody>
                {stat.counts.map((c) => (
                  <tr key={c.value} className="border-b border-gray-100 last:border-b-0">
                    <td className="px-4 py-2.5 text-sm text-gray-800">{c.label}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-600 text-right whitespace-nowrap">
                      {c.count.toLocaleString()} / 最大 –
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-4 py-2.5 text-sm text-gray-500">
              回答数: {stat.totalAnswered.toLocaleString()}件（テキスト入力）
            </div>
          )}
        </div>
      ))}

      {fieldStats.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">
          テンプレートにフィールドが定義されていません
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// 回答一覧タブ
// ════════════════════════════════════════════════════════

function ResponsesTab({
  listData,
  displayFields,
  currentPage,
  setCurrentPage,
  expandedId,
  setExpandedId,
}: {
  listData: ListData;
  displayFields: FormField[];
  currentPage: number;
  setCurrentPage: (fn: (p: number) => number) => void;
  expandedId: string | null;
  setExpandedId: (fn: (prev: string | null) => string | null) => void;
}) {
  const { responses, pagination } = listData;

  if (responses.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400 text-sm">問診回答がありません</div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 件数表示 */}
      <div className="text-sm text-gray-500">
        全{pagination.totalCount.toLocaleString()}件中{" "}
        {((currentPage - 1) * PAGE_SIZE + 1).toLocaleString()}〜
        {Math.min(currentPage * PAGE_SIZE, pagination.totalCount).toLocaleString()}件を表示
      </div>

      {/* 回答カード一覧 */}
      {responses.map((res) => {
        const isExpanded = expandedId === res.id;
        return (
          <div
            key={res.id}
            className="bg-white border border-gray-200 rounded-lg overflow-hidden"
          >
            {/* カードヘッダー（クリックで展開） */}
            <button
              onClick={() => setExpandedId((prev) => (prev === res.id ? null : res.id))}
              className="w-full px-4 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
            >
              {/* アバター */}
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                </svg>
              </div>

              {/* 回答者情報 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-blue-600">
                    {res.patientName || "未登録"}
                  </span>
                  <StatusBadge status={res.status} />
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  (回答日{res.createdAt
                    ? new Date(res.createdAt).toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })
                    : "不明"})
                </div>
              </div>

              {/* 展開アイコン */}
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* 展開コンテンツ */}
            {isExpanded && (
              <div className="border-t border-gray-200">
                <div className="flex flex-col lg:flex-row">
                  {/* 左: 回答者情報 */}
                  <div className="lg:w-56 flex-shrink-0 p-4 bg-gray-50 border-b lg:border-b-0 lg:border-r border-gray-200">
                    <h4 className="text-xs font-bold text-gray-500 mb-3 tracking-wide">回答者</h4>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                        </svg>
                      </div>
                      <span className="text-sm font-semibold text-blue-600">
                        {res.patientName || "未登録"}
                      </span>
                    </div>
                    <div className="space-y-2 text-xs text-gray-500">
                      <div>
                        <span className="block text-gray-400">回答日</span>
                        {res.createdAt
                          ? new Date(res.createdAt).toLocaleDateString("ja-JP", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })
                          : "—"}
                      </div>
                      {res.patientTel && (
                        <div>
                          <span className="block text-gray-400">電話番号</span>
                          {res.patientTel}
                        </div>
                      )}
                      {res.reservedDate && (
                        <div>
                          <span className="block text-gray-400">予約日</span>
                          {res.reservedDate}
                        </div>
                      )}
                      {res.prescriptionMenu && (
                        <div>
                          <span className="block text-gray-400">処方メニュー</span>
                          {res.prescriptionMenu}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 右: フォームの回答 */}
                  <div className="flex-1 p-4">
                    <h4 className="text-xs font-bold text-gray-500 mb-3 tracking-wide">フォームの回答</h4>
                    <table className="w-full">
                      <tbody>
                        {displayFields.map((field) => {
                          // 条件分岐で表示不要な項目はスキップ
                          if (field.conditional) {
                            const parentValue = res.answers[field.conditional.when];
                            if (parentValue !== field.conditional.value) return null;
                          }
                          return (
                            <tr key={field.id} className="border-b border-gray-100 last:border-b-0">
                              <td className="py-2.5 pr-4 text-sm font-medium text-gray-700 align-top whitespace-nowrap">
                                {field.label}
                              </td>
                              <td className="py-2.5 text-sm text-gray-900 whitespace-pre-wrap">
                                {formatAnswer(field, res.answers[field.id])}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {res.note && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <span className="text-xs text-gray-400">備考</span>
                        <p className="text-sm text-gray-700 mt-0.5">{res.note}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* ページネーション */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <div className="text-sm text-gray-500">
            {pagination.page} / {pagination.totalPages} ページ
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={pagination.page <= 1}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              前へ
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              次へ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ステータスバッジ ──────────────────────────────────

function StatusBadge({ status }: { status: string | null }) {
  if (status === "pending") {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-800">
        保留中
      </span>
    );
  }
  if (status === null || status === undefined) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-800">
        NG
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800">
      {status}
    </span>
  );
}
