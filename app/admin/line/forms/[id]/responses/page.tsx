"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface FormField {
  id: string;
  type: string;
  label: string;
}

interface Response {
  id: number;
  line_user_id: string | null;
  respondent_name: string | null;
  answers: Record<string, unknown>;
  submitted_at: string;
}

export default function FormResponsesPage() {
  const { id } = useParams<{ id: string }>();
  const [formName, setFormName] = useState("");
  const [fields, setFields] = useState<FormField[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/line/forms/${id}/responses`, { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        if (data.form) {
          setFormName(data.form.name);
          const allFields = (data.form.fields || []) as FormField[];
          setFields(allFields.filter(f => f.type !== "heading_sm" && f.type !== "heading_md"));
        }
        if (data.responses) setResponses(data.responses);
        setLoading(false);
      });
  }, [id]);

  const downloadCsv = () => {
    window.open(`/api/admin/line/forms/${id}/responses?format=csv`, "_blank");
  };

  const formatValue = (val: unknown): string => {
    if (val === null || val === undefined) return "";
    if (Array.isArray(val)) return val.join(", ");
    if (typeof val === "object" && "name" in (val as Record<string, unknown>)) return (val as { name: string }).name;
    return String(val);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-[#00B900] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href={`/admin/line/forms/${id}`} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-800">回答一覧</h1>
            <p className="text-sm text-gray-400 mt-0.5">{formName} ({responses.length}件)</p>
          </div>
        </div>
        <button
          onClick={downloadCsv}
          className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          CSV出力
        </button>
      </div>

      {/* テーブル */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">回答日時</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">回答者</th>
              {fields.map(f => (
                <th key={f.id} className="text-left px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap max-w-[200px]">
                  {f.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {responses.length === 0 ? (
              <tr>
                <td colSpan={2 + fields.length} className="text-center py-16 text-gray-300">
                  まだ回答がありません
                </td>
              </tr>
            ) : (
              responses.map(r => (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {r.submitted_at?.replace("T", " ").slice(0, 16)}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                    {r.respondent_name || r.line_user_id?.slice(0, 10) || "-"}
                  </td>
                  {fields.map(f => (
                    <td key={f.id} className="px-4 py-3 text-xs text-gray-600 max-w-[200px] truncate">
                      {formatValue(r.answers?.[f.id])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
