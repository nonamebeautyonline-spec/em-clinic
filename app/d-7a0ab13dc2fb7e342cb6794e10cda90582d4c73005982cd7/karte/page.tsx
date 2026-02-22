"use client";

import { useState, useMemo } from "react";
import { DEMO_RESERVATIONS, type DemoReservation } from "../_data/mock";

const STATUS_FILTERS = ["未診", "全て", "OK", "NG"] as const;

const statusColors: Record<string, string> = {
  "未診": "bg-pink-100 text-pink-700 border-pink-300",
  OK: "bg-emerald-100 text-emerald-700 border-emerald-300",
  NG: "bg-red-100 text-red-700 border-red-300",
  "キャンセル": "bg-slate-100 text-slate-500 border-slate-300",
};

const statusCardBg: Record<string, string> = {
  "未診": "border-l-pink-400",
  OK: "border-l-emerald-400",
  NG: "border-l-red-400",
  "キャンセル": "border-l-slate-400",
};

const DOSE_OPTIONS = ["マンジャロ 2.5mg", "マンジャロ 5mg", "マンジャロ 7.5mg", "マンジャロ 10mg", "マンジャロ 12.5mg", "マンジャロ 15mg"];

const QUICK_TEXTS: { label: string; text: string }[] = [
  { label: "日時", text: `診察日時: ${new Date().toLocaleDateString("ja-JP")}` },
  { label: "副作用説明", text: "主な副作用として吐き気・食欲低下・便秘がありますが、多くは1-2週間で軽減されます。" },
  { label: "使用方法", text: "週1回、同じ曜日に皮下注射してください。腹部・太もも・上腕のいずれかに注射します。" },
  { label: "処方許可", text: "副作用がなく、継続使用のため処方。" },
  { label: "不通", text: "架電するも不通。" },
];

type AiKarteState = "idle" | "recording" | "transcribing" | "generating" | "done";

export default function DemoKartePage() {
  const [statusFilter, setStatusFilter] = useState<string>("全て");
  const [selectedReservation, setSelectedReservation] = useState<DemoReservation | null>(null);
  const [karteText, setKarteText] = useState("");
  const [selectedDose, setSelectedDose] = useState("マンジャロ 2.5mg");
  const [reservations, setReservations] = useState<DemoReservation[]>(DEMO_RESERVATIONS);
  const [aiKarteState, setAiKarteState] = useState<AiKarteState>("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // 週間日付タブ
  const weekDates = useMemo(() => {
    const dates: { dateStr: string; label: string; dayOfWeek: string; isToday: boolean }[] = [];
    const today = new Date();
    for (let i = -3; i <= 3; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayOfWeek = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
      dates.push({
        dateStr,
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        dayOfWeek,
        isToday: i === 0,
      });
    }
    return dates;
  }, []);

  const [selectedDate, setSelectedDate] = useState(weekDates.find((d) => d.isToday)!.dateStr);

  const filteredReservations = reservations.filter((r) => {
    const matchDate = r.date === selectedDate;
    const matchStatus = statusFilter === "全て" || r.status === statusFilter;
    return matchDate && matchStatus;
  });

  const statusCounts = useMemo(() => {
    const dayRes = reservations.filter((r) => r.date === selectedDate);
    return {
      "未診": dayRes.filter((r) => r.status === "未診").length,
      "全て": dayRes.length,
      OK: dayRes.filter((r) => r.status === "OK").length,
      NG: dayRes.filter((r) => r.status === "NG").length,
    };
  }, [reservations, selectedDate]);

  const startAiKarte = () => {
    setAiKarteState("recording");
    setRecordingSeconds(0);
    let sec = 0;
    const timer = setInterval(() => {
      sec++;
      setRecordingSeconds(sec);
      if (sec >= 3) {
        clearInterval(timer);
        setAiKarteState("transcribing");
        setTimeout(() => {
          setAiKarteState("generating");
          setTimeout(() => {
            setAiKarteState("done");
            setKarteText(
              "S) 前回から体調変化なし。食欲低下は改善傾向。体重-2kg。\nO) バイタル安定。BMI 28.5。前回比-0.7。\nA) GLP-1による順調な体重減少。副作用なし。\nP) マンジャロ5mg 継続処方。次回1ヶ月後。"
            );
            setTimeout(() => setAiKarteState("idle"), 500);
          }, 1500);
        }, 1500);
      }
    }, 1000);
  };

  const openKarte = (res: DemoReservation) => {
    setSelectedReservation(res);
    setKarteText(res.karteNote || "");
    if (res.glp1History.includes("7.5mg")) setSelectedDose("マンジャロ 7.5mg");
    else if (res.glp1History.includes("5mg")) setSelectedDose("マンジャロ 5mg");
    else setSelectedDose("マンジャロ 2.5mg");
  };

  const handlePrescribe = (status: "OK" | "NG") => {
    if (!selectedReservation) return;
    setReservations((prev) =>
      prev.map((r) =>
        r.id === selectedReservation.id
          ? { ...r, status, karteNote: status === "OK" ? `${karteText}\n\n処方: ${selectedDose}` : karteText }
          : r
      )
    );
    setSelectedReservation(null);
    setKarteText("");
  };

  return (
    <div className="p-6 pb-16 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Drカルテ</h1>
        <p className="text-sm text-slate-500 mt-1">診察・処方管理</p>
      </div>

      {/* 週間カレンダータブ */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <div className="flex gap-1 overflow-x-auto">
          {weekDates.map((d) => (
            <button
              key={d.dateStr}
              onClick={() => { setSelectedDate(d.dateStr); setStatusFilter("全て"); }}
              className={`flex-1 min-w-[64px] px-3 py-2 rounded-lg text-center transition-colors ${
                selectedDate === d.dateStr
                  ? "bg-blue-500 text-white"
                  : d.isToday
                  ? "bg-blue-50 text-blue-700 border-2 border-blue-300"
                  : "hover:bg-slate-50 text-slate-700"
              }`}
            >
              <p className={`text-[10px] ${selectedDate === d.dateStr ? "text-blue-200" : d.dayOfWeek === "日" ? "text-red-500" : d.dayOfWeek === "土" ? "text-blue-500" : "text-slate-500"}`}>
                {d.dayOfWeek}
              </p>
              <p className="text-sm font-bold">{d.label}</p>
              {d.isToday && selectedDate !== d.dateStr && <p className="text-[9px] text-blue-500 font-bold">今日</p>}
            </button>
          ))}
        </div>
      </div>

      {/* ステータスフィルタ */}
      <div className="flex gap-2 mb-4">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter}
            onClick={() => setStatusFilter(filter)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              statusFilter === filter ? "bg-slate-800 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {filter}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              statusFilter === filter ? "bg-white/20" : "bg-slate-100"
            }`}>
              {statusCounts[filter as keyof typeof statusCounts]}
            </span>
          </button>
        ))}
      </div>

      {/* 予約カード一覧 */}
      <div className="space-y-3">
        {filteredReservations.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <p className="text-slate-400 text-sm">この日の予約はありません</p>
          </div>
        )}
        {filteredReservations.map((res) => (
          <button
            key={res.id}
            onClick={() => openKarte(res)}
            className={`w-full text-left bg-white rounded-xl border border-slate-200 border-l-4 ${statusCardBg[res.status]} p-4 hover:shadow-md transition-shadow`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-lg font-bold text-slate-800">{res.time}</span>
                  <span className="text-base font-medium text-slate-700">{res.patientName}</span>
                  <span className="text-xs text-slate-500">({res.patientKana})</span>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                  <p className="text-slate-500">
                    <span className="text-slate-400">性別: </span>{res.patientGender} / {res.patientAge}歳
                  </p>
                  <p className="text-slate-500">
                    <span className="text-slate-400">アレルギー: </span>{res.allergies}
                  </p>
                  <p className="text-slate-500">
                    <span className="text-slate-400">GLP-1歴: </span>{res.glp1History}
                  </p>
                  <p className="text-slate-500">
                    <span className="text-slate-400">内服: </span>{res.currentMeds}
                  </p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[res.status]}`}>
                {res.status}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* カルテ詳細モーダル */}
      {selectedReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedReservation(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-bold text-slate-800">カルテ詳細</h2>
              <button onClick={() => setSelectedReservation(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 患者基本情報 */}
              <div className="bg-slate-50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-slate-600 mb-3">患者情報</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">氏名</p>
                    <p className="font-medium text-slate-800">{selectedReservation.patientName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">カナ</p>
                    <p className="font-medium text-slate-800">{selectedReservation.patientKana}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">性別 / 年齢</p>
                    <p className="font-medium text-slate-800">{selectedReservation.patientGender} / {selectedReservation.patientAge}歳</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">生年月日</p>
                    <p className="font-medium text-slate-800">{selectedReservation.patientBirthDate}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">アレルギー</p>
                    <p className="font-medium text-slate-800">{selectedReservation.allergies}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">既往歴</p>
                    <p className="font-medium text-slate-800">{selectedReservation.medHistory}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">GLP-1使用歴</p>
                    <p className="font-medium text-slate-800">{selectedReservation.glp1History}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">現在の内服</p>
                    <p className="font-medium text-slate-800">{selectedReservation.currentMeds}</p>
                  </div>
                </div>
              </div>

              {/* 処方メニュー選択 */}
              <div>
                <h3 className="text-sm font-semibold text-slate-600 mb-2">処方メニュー</h3>
                <div className="grid grid-cols-3 gap-2">
                  {DOSE_OPTIONS.map((dose) => (
                    <button
                      key={dose}
                      onClick={() => setSelectedDose(dose)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                        selectedDose === dose
                          ? "bg-blue-500 text-white border-blue-500"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {dose.replace("マンジャロ ", "")}
                    </button>
                  ))}
                </div>
              </div>

              {/* カルテテキストエリア */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-600">カルテ</h3>
                </div>

                {/* AIカルテボタン */}
                {aiKarteState === "idle" && (
                  <button
                    onClick={startAiKarte}
                    className="mb-3 w-full py-2.5 px-4 border border-purple-300 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    AIカルテ
                  </button>
                )}
                {aiKarteState === "recording" && (
                  <div className="mb-3 w-full py-2.5 px-4 border border-red-300 bg-red-50 rounded-lg text-sm font-medium text-red-700 flex items-center justify-center gap-2">
                    <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    録音中... 0:{String(3 - recordingSeconds).padStart(2, "0")}
                  </div>
                )}
                {aiKarteState === "transcribing" && (
                  <div className="mb-3 w-full py-2.5 px-4 border border-slate-200 bg-slate-50 rounded-lg text-sm font-medium text-slate-600 flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    文字起こし中...
                  </div>
                )}
                {aiKarteState === "generating" && (
                  <div className="mb-3 w-full py-2.5 px-4 border border-slate-200 bg-slate-50 rounded-lg text-sm font-medium text-slate-600 flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    カルテ生成中...
                  </div>
                )}

                {/* 定型文ボタン */}
                <div className="flex gap-1.5 mb-2 flex-wrap">
                  {QUICK_TEXTS.map((qt) => (
                    <button
                      key={qt.label}
                      onClick={() => setKarteText((prev) => (prev ? prev + "\n" : "") + qt.text)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-xs text-slate-600 rounded-md transition-colors"
                    >
                      {qt.label}
                    </button>
                  ))}
                </div>
                <textarea
                  value={karteText}
                  onChange={(e) => setKarteText(e.target.value)}
                  rows={6}
                  placeholder="カルテ内容を入力..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* アクションボタン */}
              <div className="flex gap-3">
                <button
                  onClick={() => handlePrescribe("OK")}
                  className="flex-1 py-3 px-4 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors"
                >
                  この内容で処方する
                </button>
                <button
                  onClick={() => handlePrescribe("NG")}
                  className="py-3 px-6 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors"
                >
                  処方しない
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
