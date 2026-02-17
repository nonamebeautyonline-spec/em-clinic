"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";

interface NpsSurvey {
  id: number;
  title: string;
  question_text: string;
  comment_label: string;
  thank_you_message: string;
  is_active: boolean;
  auto_send_after: string | null;
  auto_send_delay_hours: number;
  response_count: number;
  created_at: string;
}

interface NpsStats {
  total: number;
  npsScore: number | null;
  promoters: number;
  passives: number;
  detractors: number;
  promoterRate: number;
  detractorRate: number;
}

interface NpsResponse {
  id: number;
  score: number;
  comment: string;
  patient_id: string;
  created_at: string;
}

const NPS_COLORS = { promoter: "#22c55e", passive: "#eab308", detractor: "#ef4444" };

export default function NpsPage() {
  const [surveys, setSurveys] = useState<NpsSurvey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editSurvey, setEditSurvey] = useState<NpsSurvey | null>(null);
  const [detailSurvey, setDetailSurvey] = useState<number | null>(null);
  const [detailData, setDetailData] = useState<{
    stats: NpsStats;
    distribution: { score: number; count: number }[];
    monthly: { month: string; nps: number; total: number }[];
    responses: NpsResponse[];
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/line/nps", { credentials: "include" });
    const data = await res.json();
    if (data.surveys) setSurveys(data.surveys);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadDetail = async (surveyId: number) => {
    setDetailSurvey(surveyId);
    const res = await fetch(`/api/admin/line/nps/${surveyId}`, { credentials: "include" });
    const data = await res.json();
    setDetailData({
      stats: data.stats,
      distribution: data.distribution,
      monthly: data.monthly,
      responses: data.responses,
    });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("この調査を削除しますか？回答データも削除されます。")) return;
    await fetch(`/api/admin/line/nps?id=${id}`, { method: "DELETE", credentials: "include" });
    setSurveys(prev => prev.filter(s => s.id !== id));
    if (detailSurvey === id) { setDetailSurvey(null); setDetailData(null); }
  };

  const handleDistribute = async (surveyId: number) => {
    if (!confirm("全対象者にNPS調査を送信しますか？")) return;
    const res = await fetch(`/api/admin/line/nps/${surveyId}/distribute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ filter_rules: {} }),
    });
    const data = await res.json();
    alert(`${data.sent || 0}人に送信しました`);
  };

  const totalResponses = surveys.reduce((sum, s) => sum + s.response_count, 0);
  const activeCount = surveys.filter(s => s.is_active).length;

  /* ==================== 詳細ダッシュボード ==================== */
  if (detailSurvey && detailData) {
    const survey = surveys.find(s => s.id === detailSurvey);
    const { stats, distribution, monthly, responses } = detailData;
    const pieData = [
      { name: "推奨者(9-10)", value: stats.promoters, color: NPS_COLORS.promoter },
      { name: "中立者(7-8)", value: stats.passives, color: NPS_COLORS.passive },
      { name: "批判者(0-6)", value: stats.detractors, color: NPS_COLORS.detractor },
    ].filter(d => d.value > 0);

    return (
      <div className="min-h-full bg-gray-50/50">
        {/* ヘッダー */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
            <button
              onClick={() => { setDetailSurvey(null); setDetailData(null); }}
              className="text-sm text-gray-400 hover:text-indigo-600 mb-3 flex items-center gap-1 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              一覧に戻る
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{survey?.title}</h1>
                <p className="text-sm text-gray-400 mt-0.5">回答数: {stats.total}件</p>
              </div>
            </div>

            {/* NPSスコアカード */}
            <div className="grid grid-cols-4 gap-4 mt-6">
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100/50 text-center">
                <div className={`text-3xl font-bold ${
                  stats.npsScore === null ? "text-gray-300" :
                  stats.npsScore >= 50 ? "text-green-600" :
                  stats.npsScore >= 0 ? "text-yellow-600" : "text-red-600"
                }`}>
                  {stats.npsScore !== null ? stats.npsScore : "-"}
                </div>
                <div className="text-xs text-indigo-500 mt-0.5">NPSスコア</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100/50 text-center">
                <div className="text-2xl font-bold text-green-700">{stats.promoters}</div>
                <div className="text-xs text-green-500 mt-0.5">推奨者 (9-10) {stats.promoterRate}%</div>
              </div>
              <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-4 border border-yellow-100/50 text-center">
                <div className="text-2xl font-bold text-yellow-700">{stats.passives}</div>
                <div className="text-xs text-yellow-600 mt-0.5">中立者 (7-8) {stats.total > 0 ? Math.round((stats.passives / stats.total) * 100) : 0}%</div>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-4 border border-red-100/50 text-center">
                <div className="text-2xl font-bold text-red-700">{stats.detractors}</div>
                <div className="text-xs text-red-500 mt-0.5">批判者 (0-6) {stats.detractorRate}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* チャートエリア */}
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ドーナツチャート */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-all duration-200">
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                回答分布
              </h3>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => `${value}件`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-sm text-gray-300">データなし</div>
              )}
              <div className="flex justify-center gap-4 mt-2">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5 text-[11px]">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-gray-500">{d.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* スコア分布 */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-all duration-200">
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                スコア分布
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={distribution}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="score" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                  <Tooltip formatter={(value: any) => `${value}件`} />
                  <Bar dataKey="count" fill="url(#indigo-gradient)" radius={[4, 4, 0, 0]} />
                  <defs>
                    <linearGradient id="indigo-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#818cf8" />
                      <stop offset="100%" stopColor="#6366f1" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 月次推移 */}
          {monthly.length > 1 && (
            <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-all duration-200">
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                NPSスコア推移
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} domain={[-100, 100]} />
                  <Tooltip formatter={(value: any) => value} />
                  <Line type="monotone" dataKey="nps" stroke="#6366f1" strokeWidth={2} dot={{ r: 4, fill: "#6366f1" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* コメント一覧 */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              最新の回答
            </h3>
            {responses.length === 0 ? (
              <p className="text-sm text-gray-300 text-center py-8">まだ回答がありません</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {responses.map(r => (
                  <div key={r.id} className="flex items-start gap-3 p-3 bg-gray-50/80 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white ${
                      r.score >= 9 ? "bg-gradient-to-br from-green-400 to-emerald-500" :
                      r.score >= 7 ? "bg-gradient-to-br from-yellow-300 to-amber-400 text-gray-800" :
                      "bg-gradient-to-br from-red-400 to-rose-500"
                    }`}>
                      {r.score}
                    </div>
                    <div className="flex-1 min-w-0">
                      {r.comment && <p className="text-sm text-gray-700">{r.comment}</p>}
                      <p className="text-[11px] text-gray-400 mt-1">
                        {r.patient_id && `患者ID: ${r.patient_id} / `}
                        {new Date(r.created_at).toLocaleString("ja-JP")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ==================== 調査一覧 ==================== */
  return (
    <div className="min-h-full bg-gray-50/50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                NPS調査
              </h1>
              <p className="text-sm text-gray-400 mt-1">患者満足度を計測し、改善ポイントを把握します</p>
            </div>
            <button
              onClick={() => { setEditSurvey(null); setShowEditor(true); }}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-sm font-medium hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/25 transition-all duration-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              調査作成
            </button>
          </div>

          {/* サマリーカード */}
          {surveys.length > 0 && (
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100/50">
                <div className="text-2xl font-bold text-indigo-700">{surveys.length}</div>
                <div className="text-xs text-indigo-500 mt-0.5">調査数</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100/50">
                <div className="text-2xl font-bold text-green-700">{activeCount}</div>
                <div className="text-xs text-green-500 mt-0.5">稼働中</div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl p-4 border border-blue-100/50">
                <div className="text-2xl font-bold text-blue-700">{totalResponses}</div>
                <div className="text-xs text-blue-500 mt-0.5">総回答数</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 調査一覧 */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
              <span className="text-sm text-gray-400">読み込み中...</span>
            </div>
          </div>
        ) : surveys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm">NPS調査がありません</p>
            <p className="text-gray-300 text-xs mt-1">患者満足度を定期的に計測しましょう</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {surveys.map(survey => (
              <div
                key={survey.id}
                className={`bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition-all duration-200 group ${
                  !survey.is_active ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  {/* 左: 情報 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        survey.is_active
                          ? "bg-gradient-to-br from-indigo-500 to-purple-600"
                          : "bg-gray-200"
                      }`}>
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div>
                        <button
                          onClick={() => loadDetail(survey.id)}
                          className="text-[15px] font-semibold text-gray-900 hover:text-indigo-600 transition-colors truncate block"
                        >
                          {survey.title}
                        </button>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-gray-400">
                            {new Date(survey.created_at).toLocaleDateString("ja-JP")} 作成
                          </span>
                          {survey.auto_send_after && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-600">
                              自動: {survey.auto_send_after === "visit" ? "来院後" : "購入後"} {survey.auto_send_delay_hours}h
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 統計バー */}
                    <div className="flex items-center gap-5 mt-3 ml-10">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        <span className="text-[11px] text-gray-400">回答</span>
                        <span className="text-[11px] font-bold text-gray-700">{survey.response_count}件</span>
                      </div>
                    </div>
                  </div>

                  {/* 右: 操作 */}
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleDistribute(survey.id)}
                      className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100 flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      送信
                    </button>
                    <button
                      onClick={() => loadDetail(survey.id)}
                      className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      分析
                    </button>
                    <button
                      onClick={() => { setEditSurvey(survey); setShowEditor(true); }}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-300 hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(survey.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 作成/編集モーダル */}
      {showEditor && (
        <SurveyEditor
          survey={editSurvey}
          onSave={async (data) => {
            if (editSurvey) {
              await fetch("/api/admin/line/nps", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ ...data, id: editSurvey.id }),
              });
            } else {
              await fetch("/api/admin/line/nps", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(data),
              });
            }
            setShowEditor(false);
            setEditSurvey(null);
            load();
          }}
          onClose={() => { setShowEditor(false); setEditSurvey(null); }}
        />
      )}
    </div>
  );
}

/* ==================== 調査作成/編集モーダル ==================== */
function SurveyEditor({
  survey,
  onSave,
  onClose,
}: {
  survey: NpsSurvey | null;
  onSave: (data: Partial<NpsSurvey>) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(survey?.title || "");
  const [questionText, setQuestionText] = useState(survey?.question_text || "この施設を友人や知人にどの程度おすすめしたいですか？");
  const [commentLabel, setCommentLabel] = useState(survey?.comment_label || "ご意見・ご感想があればお聞かせください");
  const [thankYou, setThankYou] = useState(survey?.thank_you_message || "ご回答ありがとうございます");
  const [autoSend, setAutoSend] = useState(survey?.auto_send_after || "");
  const [delayHours, setDelayHours] = useState(survey?.auto_send_delay_hours || 24);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              {survey ? "調査編集" : "NPS調査作成"}
            </h2>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">調査タイトル</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="例: 2026年2月 患者満足度調査"
              className="w-full px-3 py-2 text-sm border border-gray-200/75 rounded-xl bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">質問文</label>
            <textarea
              value={questionText}
              onChange={e => setQuestionText(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200/75 rounded-xl bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">コメント欄ラベル</label>
            <input
              type="text"
              value={commentLabel}
              onChange={e => setCommentLabel(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200/75 rounded-xl bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">完了メッセージ</label>
            <input
              type="text"
              value={thankYou}
              onChange={e => setThankYou(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200/75 rounded-xl bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">自動送信トリガー</label>
              <select
                value={autoSend}
                onChange={e => setAutoSend(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200/75 rounded-xl bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300"
              >
                <option value="">手動のみ</option>
                <option value="visit">来院後</option>
                <option value="purchase">購入後</option>
              </select>
            </div>
            {autoSend && (
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">遅延(時間)</label>
                <input
                  type="number"
                  value={delayHours}
                  onChange={e => setDelayHours(Number(e.target.value))}
                  min={1}
                  className="w-full px-3 py-2 text-sm border border-gray-200/75 rounded-xl bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300"
                />
              </div>
            )}
          </div>
        </div>

        <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
            キャンセル
          </button>
          <button
            onClick={() => onSave({
              title, question_text: questionText, comment_label: commentLabel,
              thank_you_message: thankYou,
              auto_send_after: autoSend || null,
              auto_send_delay_hours: delayHours,
            })}
            disabled={!title.trim()}
            className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-300 rounded-xl shadow-lg shadow-indigo-500/25 transition-all duration-200"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
