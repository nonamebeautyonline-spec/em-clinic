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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#06C755] border-t-transparent" />
      </div>
    );
  }

  // 詳細ダッシュボード表示
  if (detailSurvey && detailData) {
    const survey = surveys.find(s => s.id === detailSurvey);
    const { stats, distribution, monthly, responses } = detailData;
    const pieData = [
      { name: "推奨者(9-10)", value: stats.promoters, color: NPS_COLORS.promoter },
      { name: "中立者(7-8)", value: stats.passives, color: NPS_COLORS.passive },
      { name: "批判者(0-6)", value: stats.detractors, color: NPS_COLORS.detractor },
    ].filter(d => d.value > 0);

    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <button
          onClick={() => { setDetailSurvey(null); setDetailData(null); }}
          className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          一覧に戻る
        </button>

        <h1 className="text-xl font-bold text-gray-900 mb-1">{survey?.title}</h1>
        <p className="text-sm text-gray-500 mb-6">回答数: {stats.total}件</p>

        {/* NPSスコアカード */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">NPSスコア</p>
            <p className={`text-3xl font-bold ${
              stats.npsScore === null ? "text-gray-300" :
              stats.npsScore >= 50 ? "text-green-600" :
              stats.npsScore >= 0 ? "text-yellow-600" : "text-red-600"
            }`}>
              {stats.npsScore !== null ? stats.npsScore : "-"}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">推奨者 (9-10)</p>
            <p className="text-2xl font-bold text-green-600">{stats.promoters}</p>
            <p className="text-[11px] text-gray-400">{stats.promoterRate}%</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">中立者 (7-8)</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.passives}</p>
            <p className="text-[11px] text-gray-400">{stats.total > 0 ? Math.round((stats.passives / stats.total) * 100) : 0}%</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">批判者 (0-6)</p>
            <p className="text-2xl font-bold text-red-600">{stats.detractors}</p>
            <p className="text-[11px] text-gray-400">{stats.detractorRate}%</p>
          </div>
        </div>

        {/* チャート */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* ドーナツチャート */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-bold text-gray-700 mb-3">回答分布</h3>
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
              <div className="h-[200px] flex items-center justify-center text-sm text-gray-400">データなし</div>
            )}
            <div className="flex justify-center gap-4 mt-2">
              {pieData.map(d => (
                <div key={d.name} className="flex items-center gap-1.5 text-[11px]">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-gray-600">{d.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* スコア分布 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-bold text-gray-700 mb-3">スコア分布</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={distribution}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="score" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip formatter={(value: any) => `${value}件`} />
                <Bar dataKey="count" fill="#06C755" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 月次推移 */}
        {monthly.length > 1 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
            <h3 className="text-sm font-bold text-gray-700 mb-3">NPSスコア推移</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[-100, 100]} />
                <Tooltip formatter={(value: any) => value} />
                <Line type="monotone" dataKey="nps" stroke="#06C755" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* コメント一覧 */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">最新の回答</h3>
          {responses.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">まだ回答がありません</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {responses.map(r => (
                <div key={r.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                    r.score >= 9 ? "bg-green-500" : r.score >= 7 ? "bg-yellow-400 text-gray-800" : "bg-red-500"
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
    );
  }

  // 調査一覧
  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">NPS調査</h1>
          <p className="text-sm text-gray-500 mt-1">患者満足度を計測し、改善ポイントを把握します</p>
        </div>
        <button
          onClick={() => { setEditSurvey(null); setShowEditor(true); }}
          className="px-4 py-2 text-xs font-medium text-white bg-[#06C755] hover:bg-[#05b04a] rounded-lg transition-colors flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          調査作成
        </button>
      </div>

      {surveys.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 bg-indigo-50 rounded-full mx-auto flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-sm text-gray-500">NPS調査がありません</p>
          <p className="text-xs text-gray-400 mt-1">患者満足度を定期的に計測しましょう</p>
        </div>
      ) : (
        <div className="space-y-3">
          {surveys.map(survey => (
            <div key={survey.id} className={`bg-white rounded-xl border p-4 transition-all ${
              survey.is_active ? "border-gray-200" : "border-gray-100 opacity-60"
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex-1 cursor-pointer" onClick={() => loadDetail(survey.id)}>
                  <h3 className="text-sm font-bold text-gray-900 hover:text-[#06C755] transition-colors">
                    {survey.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-500">
                    <span>回答: {survey.response_count}件</span>
                    {survey.auto_send_after && (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded">
                        自動送信: {survey.auto_send_after === "visit" ? "来院後" : "購入後"} {survey.auto_send_delay_hours}h
                      </span>
                    )}
                    <span>{new Date(survey.created_at).toLocaleDateString("ja-JP")}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleDistribute(survey.id)}
                    className="px-3 py-1.5 text-[11px] font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                  >
                    送信
                  </button>
                  <button
                    onClick={() => loadDetail(survey.id)}
                    className="px-3 py-1.5 text-[11px] font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    分析
                  </button>
                  <button
                    onClick={() => { setEditSurvey(survey); setShowEditor(true); }}
                    className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(survey.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{survey ? "調査編集" : "NPS調査作成"}</h2>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">調査タイトル</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="例: 2026年2月 患者満足度調査"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">質問文</label>
            <textarea
              value={questionText}
              onChange={e => setQuestionText(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">コメント欄ラベル</label>
            <input
              type="text"
              value={commentLabel}
              onChange={e => setCommentLabel(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">完了メッセージ</label>
            <input
              type="text"
              value={thankYou}
              onChange={e => setThankYou(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">自動送信トリガー</label>
              <select
                value={autoSend}
                onChange={e => setAutoSend(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
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
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
            )}
          </div>
        </div>

        <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
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
            className="px-4 py-2 text-sm font-medium text-white bg-[#06C755] hover:bg-[#05b04a] disabled:bg-gray-300 rounded-lg transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
