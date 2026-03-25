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

interface TemplateDetail {
  id: number;
  name: string;
  fields: FormField[];
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

interface ResponseData {
  templates: TemplateInfo[];
  activeTemplate: TemplateDetail | null;
  responses: IntakeResponse[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

const PAGE_SIZE = 20;

// ── 回答値の表示変換 ──────────────────────────────────

function formatAnswer(field: FormField, value: string | undefined): string {
  if (value === undefined || value === null || value === "") return "—";
  if (field.options) {
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
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // APIキー
  const apiKey = useMemo(() => {
    const params = new URLSearchParams({
      page: String(currentPage),
      limit: String(PAGE_SIZE),
    });
    if (selectedTemplateId) params.set("template_id", selectedTemplateId);
    return `/api/admin/intake-responses?${params.toString()}`;
  }, [currentPage, selectedTemplateId]);

  const { data, isLoading, error } = useSWR<ResponseData>(apiKey);

  // テンプレートのフィールド（heading除外）
  const displayFields = useMemo(() => {
    if (!data?.activeTemplate?.fields) return [];
    return (data.activeTemplate.fields as FormField[])
      .filter((f) => f.type !== "heading")
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [data?.activeTemplate]);

  // テーブル表示用のメインフィールド（最大4つ）
  const tableFields = useMemo(() => displayFields.slice(0, 4), [displayFields]);

  // テンプレート切替
  const handleTemplateChange = (id: string) => {
    setSelectedTemplateId(id);
    setCurrentPage(1);
    setExpandedId(null);
  };

  // 行の展開/折りたたみ
  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // ── ページネーション ──────────────────────────────

  const Pagination = () => {
    const pagination = data?.pagination;
    if (!pagination || pagination.totalPages <= 1) return null;

    const { page, totalCount, totalPages } = pagination;
    const start = (page - 1) * PAGE_SIZE + 1;
    const end = Math.min(page * PAGE_SIZE, totalCount);

    return (
      <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {totalCount}件中 {start}〜{end}件を表示
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            前へ
          </button>
          <span className="text-sm text-gray-600">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            次へ
          </button>
        </div>
      </div>
    );
  };

  // ── ローディング/エラー ──────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-500">問診回答の取得に失敗しました</div>
      </div>
    );
  }

  const templates = data?.templates || [];
  const responses = data?.responses || [];
  const activeTemplate = data?.activeTemplate;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <a
              href="/admin/intake-form"
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              問診設定
            </a>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            問診回答一覧
            {activeTemplate && (
              <span className="text-lg font-normal text-gray-500 ml-2">
                — {activeTemplate.name}
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            提出済みの問診回答を確認できます
            {data?.pagination && (
              <span className="ml-2">（全{data.pagination.totalCount}件）</span>
            )}
          </p>
        </div>

        {/* テンプレート選択 */}
        {templates.length > 1 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {templates.map((tpl) => {
              const isSelected = activeTemplate
                ? String(activeTemplate.id) === String(tpl.id)
                : false;
              return (
                <button
                  key={tpl.id}
                  onClick={() => handleTemplateChange(String(tpl.id))}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                    isSelected
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {tpl.name}
                  {tpl.isActive && (
                    <span className="ml-1.5 text-xs opacity-75">（使用中）</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* テーブル */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {responses.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              問診回答がありません
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                        患者名
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                        提出日
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                        ステータス
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                        予約日
                      </th>
                      {tableFields.map((field) => (
                        <th
                          key={field.id}
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap max-w-[200px] truncate"
                          title={field.label}
                        >
                          {field.label.length > 15
                            ? field.label.slice(0, 15) + "…"
                            : field.label}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                        詳細
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {responses.map((res) => (
                      <>
                        <tr
                          key={res.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => toggleExpand(res.id)}
                        >
                          <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                            {res.patientName || "未登録"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                            {res.createdAt
                              ? new Date(res.createdAt).toLocaleDateString("ja-JP", {
                                  year: "numeric",
                                  month: "2-digit",
                                  day: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            <StatusBadge status={res.status} />
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                            {res.reservedDate || "—"}
                          </td>
                          {tableFields.map((field) => (
                            <td
                              key={field.id}
                              className="px-4 py-3 text-sm text-gray-700 max-w-[200px] truncate"
                              title={formatAnswer(field, res.answers[field.id])}
                            >
                              {formatAnswer(field, res.answers[field.id])}
                            </td>
                          ))}
                          <td className="px-4 py-3 text-sm text-indigo-600 whitespace-nowrap">
                            {expandedId === res.id ? "閉じる" : "詳細"}
                          </td>
                        </tr>
                        {expandedId === res.id && (
                          <tr key={`${res.id}-detail`}>
                            <td
                              colSpan={5 + tableFields.length}
                              className="px-4 py-4 bg-gray-50"
                            >
                              <ExpandedDetail
                                response={res}
                                fields={displayFields}
                              />
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ステータスバッジ ──────────────────────────────────

function StatusBadge({ status }: { status: string | null }) {
  if (status === "pending") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        保留中
      </span>
    );
  }
  if (status === null || status === undefined) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        NG
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
      {status}
    </span>
  );
}

// ── 展開詳細 ──────────────────────────────────────────

function ExpandedDetail({
  response,
  fields,
}: {
  response: IntakeResponse;
  fields: FormField[];
}) {
  return (
    <div className="space-y-4">
      {/* 基本情報 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <span className="text-xs text-gray-500">患者名</span>
          <p className="text-sm font-medium text-gray-900">
            {response.patientName || "未登録"}
          </p>
        </div>
        <div>
          <span className="text-xs text-gray-500">電話番号</span>
          <p className="text-sm text-gray-900">{response.patientTel || "—"}</p>
        </div>
        <div>
          <span className="text-xs text-gray-500">予約日</span>
          <p className="text-sm text-gray-900">{response.reservedDate || "—"}</p>
        </div>
        <div>
          <span className="text-xs text-gray-500">処方メニュー</span>
          <p className="text-sm text-gray-900">
            {response.prescriptionMenu || "—"}
          </p>
        </div>
      </div>

      {/* 備考 */}
      {response.note && (
        <div>
          <span className="text-xs text-gray-500">備考</span>
          <p className="text-sm text-gray-900 bg-white p-2 rounded border border-gray-200">
            {response.note}
          </p>
        </div>
      )}

      {/* 回答一覧 */}
      <div>
        <span className="text-xs text-gray-500 block mb-2">回答内容</span>
        <div className="bg-white rounded border border-gray-200 divide-y divide-gray-100">
          {fields.map((field) => {
            const value = response.answers[field.id];
            // 条件分岐で表示不要な項目はスキップ
            if (field.conditional) {
              const parentValue = response.answers[field.conditional.when];
              if (parentValue !== field.conditional.value) return null;
            }
            return (
              <div key={field.id} className="px-3 py-2 flex flex-col sm:flex-row sm:items-start gap-1">
                <span className="text-xs text-gray-500 sm:w-1/3 sm:flex-shrink-0">
                  {field.label}
                </span>
                <span className="text-sm text-gray-900 sm:w-2/3 whitespace-pre-wrap">
                  {formatAnswer(field, value)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
