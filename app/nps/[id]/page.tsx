"use client";

import { useState, useEffect, use } from "react";

export default function NpsResponsePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: surveyId } = use(params);
  const [survey, setSurvey] = useState<any>(null);
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/nps/${surveyId}`)
      .then(r => r.json())
      .then(data => {
        if (data.survey) setSurvey(data.survey);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [surveyId]);

  const handleSubmit = async () => {
    if (score === null) return;
    setSubmitting(true);

    // URLからpatient_idを取得
    const urlParams = new URLSearchParams(window.location.search);
    const patientId = urlParams.get("pid") || "";

    try {
      const res = await fetch(`/api/nps/${surveyId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, comment, patient_id: patientId }),
      });
      if (res.ok) setSubmitted(true);
    } catch {
      alert("送信に失敗しました。もう一度お試しください。");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-green-500 border-t-transparent" />
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-8 text-center max-w-sm">
          <p className="text-gray-500">この調査は見つかりませんでした</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center max-w-sm">
          <div className="w-16 h-16 bg-green-100 rounded-full mx-auto flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">ご回答ありがとうございます</h2>
          <p className="text-sm text-gray-500">{survey.thank_you_message}</p>
        </div>
      </div>
    );
  }

  // NPSカラー
  const getScoreColor = (s: number) => {
    if (s <= 6) return { bg: "bg-red-500", text: "text-white" };
    if (s <= 8) return { bg: "bg-yellow-400", text: "text-gray-800" };
    return { bg: "bg-green-500", text: "text-white" };
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm w-full max-w-md">
        {/* ヘッダー */}
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-lg font-bold text-gray-900">{survey.title}</h1>
        </div>

        <div className="p-6 space-y-6">
          {/* 質問 */}
          <div>
            <p className="text-sm text-gray-700 font-medium mb-4">{survey.question_text}</p>

            {/* スコア選択 */}
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] text-gray-400 px-1">
                <span>全くおすすめしない</span>
                <span>非常におすすめ</span>
              </div>
              <div className="grid grid-cols-11 gap-1">
                {Array.from({ length: 11 }, (_, i) => {
                  const colors = getScoreColor(i);
                  const isSelected = score === i;
                  return (
                    <button
                      key={i}
                      onClick={() => setScore(i)}
                      className={`aspect-square rounded-lg flex items-center justify-center text-sm font-bold transition-all ${
                        isSelected
                          ? `${colors.bg} ${colors.text} scale-110 shadow-md`
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {i}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* コメント */}
          <div>
            <label className="text-sm text-gray-700 font-medium mb-2 block">
              {survey.comment_label}
            </label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={3}
              placeholder="ご自由にお書きください（任意）"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/30 resize-none"
            />
          </div>

          {/* 送信ボタン */}
          <button
            onClick={handleSubmit}
            disabled={score === null || submitting}
            className="w-full py-3 text-sm font-bold text-white bg-[#06C755] hover:bg-[#05b04a] disabled:bg-gray-300 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              "回答を送信"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
