// app/intake/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type QuestionType = "text" | "textarea" | "choice" | "radio";

type Option = { label: string; value: string };

type QuestionItem = {
  id: string;
  title: string;
  description?: string;
  type: QuestionType;
  required?: boolean;
  options?: Option[];
  conditional?: { when: string; value: string };
  placeholder?: string;
};

const QUESTION_ITEMS: QuestionItem[] = [
  // 1. 禁忌チェック
  {
    id: "ng_check",
    title: "【以下のいずれかに該当する方は処方できません】",
    description:
      "・1型糖尿病の既往がある\n・妊娠中・授乳中である\n・重症ケトーシス／糖尿病性昏睡・前昏睡／重症感染症・重篤な外傷がある\n・手術前後2週間以内である\n・現在、糖尿病治療中である\n・18歳未満、または65歳以上である\n・拒食症など重度の栄養障害の既往がある\n（女性）妊娠を直近1ヶ月以内で希望している",
    type: "radio",
    required: true,
    options: [
      { label: "以上のいずれにも該当しません", value: "no" },
      { label: "該当する項目があります", value: "yes" },
    ],
  },

  // 2. 現在治療中の病気
  {
    id: "current_disease_yesno",
    title: "現在治療中、または過去に大きな病気はありますか？",
    type: "radio",
    required: true,
    options: [
      { label: "はい", value: "yes" },
      { label: "いいえ", value: "no" },
    ],
  },
  {
    id: "current_disease_detail",
    title: "上記で「はい」と答えた方は疾患名や状況をご記入ください",
    type: "textarea",
    required: true,
    conditional: { when: "current_disease_yesno", value: "yes" },
    placeholder: "例）高血圧で内科通院中／過去に肺炎で入院 など",
  },

  // 3. GLP-1/GIP 製剤の使用歴
  {
    id: "glp_history",
    title:
      "GLP-1/GIP製剤（マンジャロ、リベルサス、オゼンピックなど）の使用歴があればご記入ください",
    type: "textarea",
    required: false,
    placeholder:
      "例）マンジャロ7.5mg 使用中／オゼンピック1mg 2024年8月まで など",
  },

  // 4. 内服薬の有無
  {
    id: "med_yesno",
    title: "現在、内服中のお薬はありますか？",
    type: "radio",
    required: true,
    options: [
      { label: "はい", value: "yes" },
      { label: "いいえ", value: "no" },
    ],
  },
  {
    id: "med_detail",
    title: "上記で「はい」と答えた方は薬剤名をご記入ください",
    description:
      "常用薬の他、リベルサスやマンジャロなどメディカルダイエット薬も含めてご記入ください",
    type: "textarea",
    required: true,
    conditional: { when: "med_yesno", value: "yes" },
  },

  // 5. アレルギー
  {
    id: "allergy_yesno",
    title: "アレルギーはありますか？",
    type: "radio",
    required: true,
    options: [
      { label: "はい", value: "yes" },
      { label: "いいえ", value: "no" },
    ],
  },
  {
    id: "allergy_detail",
    title: "上記で「はい」と答えた方はアレルギー名をご記入ください",
    type: "textarea",
    required: true,
    conditional: { when: "allergy_yesno", value: "yes" },
  },

  // 6. 申し込み経路
  {
    id: "entry_route",
    title: "今回のお申し込みは何を見てされましたか？",
    type: "choice",
    required: true,
    options: [
      { label: "Twitter", value: "twitter" },
      { label: "Instagram", value: "instagram" },
      { label: "ホームページ", value: "homepage" },
      { label: "検索サイト", value: "search" },
      { label: "知人からの紹介", value: "friend" },
      { label: "その他", value: "other" },
    ],
  },
  {
    id: "entry_other",
    title: "「その他」を選んだ方は具体的にご記入ください",
    type: "text",
    required: true,
    conditional: { when: "entry_route", value: "other" },
  },
];

type AnswerMap = Record<string, string>;

type PatientBasic = {
  customer_id?: string;
  name?: string;
  kana?: string;
  sex?: string;
  birth?: string;
  phone?: string;
};

export default function IntakePage() {
  const router = useRouter();
  const [basic, setBasic] = useState<PatientBasic | null>(null);

  const [answers, setAnswers] = useState<AnswerMap>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = QUESTION_ITEMS.length;
  const current = QUESTION_ITEMS[currentIndex];

  // patient_basic を localStorage から読む
  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = window.localStorage.getItem("patient_basic");
    if (!raw) {
      setError(
        "患者情報が取得できませんでした。お手数ですが一度マイページに戻ってください。"
      );
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      setBasic(parsed);
    } catch {
      setError(
        "患者情報の読み込みに失敗しました。お手数ですが一度マイページに戻ってください。"
      );
    }
  }, []);

  const isVisible = (q: QuestionItem) => {
    if (!q.conditional) return true;
    return answers[q.conditional.when] === q.conditional.value;
  };

  const validate = () => {
    if (!current.required) return true;
    if (!isVisible(current)) return true;

    const v = answers[current.id]?.trim();
    return !!v;
  };

  const getNextIndex = (index: number) => {
    let next = index + 1;
    while (next < total && !isVisible(QUESTION_ITEMS[next])) {
      next++;
    }
    return next;
  };

  const getPrevIndex = (index: number) => {
    let prev = index - 1;
    while (prev >= 0 && !isVisible(QUESTION_ITEMS[prev])) {
      prev--;
    }
    return prev;
  };

  const isLastVisible = getNextIndex(currentIndex) >= total;
  const progressPercent = ((currentIndex + 1) / total) * 100;

  const goToMypage = () => {
    router.push("/mypage");
  };

  const handleNext = async () => {
    if (!validate()) {
      setError("入力が必要です");
      return;
    }
    setError(null);

    // 禁忌（ng_check）チェック
    if (current.id === "ng_check" && answers["ng_check"] === "yes") {
      setBlocked(true);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }

    const nextIndex = getNextIndex(currentIndex);
    const isLast = nextIndex >= total;

    if (isLast) {
      if (submitting) return;
      setSubmitting(true);

      try {
        // 患者情報を localStorage から取得
        let cid = basic?.customer_id || "";
        let nm  = basic?.name || "";
        let kn  = basic?.kana || "";
        let sx  = basic?.sex || "";
        let br  = basic?.birth || "";
        let ph  = basic?.phone || "";

        if (typeof window !== "undefined") {
          const raw = window.localStorage.getItem("patient_basic");
          if (raw) {
            try {
              const s = JSON.parse(raw);
              cid = cid || s.customer_id || "";
              nm  = nm  || s.name        || "";
              kn  = kn  || s.kana        || "";
              sx  = sx  || s.sex         || "";
              br  = br  || s.birth       || "";
              ph  = ph  || s.phone       || "";
            } catch {
              // 無視
            }
          }
        }

        // ★ LINEログイン時にセットされている line_user_id クッキーを取得
// LINEログインで付与された line_user_id を cookie から取得
let lineUserId = "";
if (typeof document !== "undefined") {
  const cookieStr = document.cookie || "";
  const found = cookieStr.split("; ").find((c) => c.startsWith("line_user_id="));
  if (found) lineUserId = decodeURIComponent(found.split("=")[1] || "");
}

// /api/intake に問診保存
const res = await fetch("/api/intake", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    type: "intake",
    reserveId: "", 
    answers,
    submittedAt: new Date().toISOString(),

    // ★ 個人情報
    name: nm,
    sex: sx,
    birth: br,
    name_kana: kn,
    tel: ph,
    patient_id: cid,

    // ★ LINE ID（これは絶対にPIDではない）
    line_id: lineUserId,
  }),
});


        if (!res.ok) throw new Error("failed");
        const data = await res.json().catch(() => ({} as any));
        if (!data.ok) throw new Error("failed");

        // 問診完了フラグ → 予約画面へ
        if (typeof window !== "undefined") {
          window.localStorage.setItem("has_intake", "1");
        }
        router.push("/reserve");
      } catch (e) {
        console.error(e);
        alert("送信に失敗しました。時間をおいて再度お試しください。");
      } finally {
        setSubmitting(false);
      }

      return;
    }


    // 次の設問へ
    setCurrentIndex(nextIndex);
  };

  const handlePrev = () => {
    const prev = getPrevIndex(currentIndex);
    if (prev >= 0) setCurrentIndex(prev);
  };

  const renderInput = () => {
    switch (current.type) {
      case "textarea":
        return (
          <textarea
            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm"
            rows={4}
            placeholder={current.placeholder}
            value={answers[current.id] || ""}
            onChange={(e) =>
              setAnswers({ ...answers, [current.id]: e.target.value })
            }
          />
        );
      case "text":
        return (
          <input
            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm"
            placeholder={current.placeholder}
            value={answers[current.id] || ""}
            onChange={(e) =>
              setAnswers({ ...answers, [current.id]: e.target.value })
            }
          />
        );
      case "radio":
      case "choice":
        return (
          <div className="flex flex-col gap-2">
            {current.options?.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-2 text-sm"
              >
                <input
                  type="radio"
                  name={current.id}
                  value={opt.value}
                  checked={answers[current.id] === opt.value}
                  onChange={() =>
                    setAnswers({ ...answers, [current.id]: opt.value })
                  }
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  // 🔴 禁忌に該当した場合の画面
  if (blocked) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold">オンライン処方の対象外です</h1>
        </header>

        <main className="flex-1 px-4 py-6">
          <div className="bg-white rounded-xl shadow-sm p-4 text-sm text-gray-700 space-y-3">
            <p>
              恐れ入りますが、問診項目のいずれかに該当する場合は
              オンラインでの処方ができかねます。
            </p>
            <p>
              お手数ですが、対面診療が可能な医療機関でのご相談をご検討ください。
            </p>
          </div>
        </main>

        <footer className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-3">
          <button
            type="button"
            onClick={goToMypage}
            className="w-full rounded-full bg-blue-600 px-3 py-2 text-sm font-medium text-white active:bg-blue-700"
          >
            マイページに戻る
          </button>
        </footer>
      </div>
    );
  }

  // 患者情報が取れないときのエラー
  if (error && !basic) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm p-4 text-sm text-gray-700 max-w-md">
          <p className="text-rose-600 font-medium mb-2">{error}</p>
          <button
            type="button"
            onClick={goToMypage}
            className="mt-3 w-full rounded-full bg-blue-600 px-3 py-2 text-sm font-medium text-white active:bg-blue-700"
          >
            マイページに戻る
          </button>
        </div>
      </div>
    );
  }

  // ✅ 通常の問診画面
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">問診</h1>
        </div>
        <div className="text-right text-xs text-gray-500">
          <span className="block">平均回答時間 1〜2分程度</span>
          <span className="block mt-1">
            質問 {currentIndex + 1} / {total}
          </span>
        </div>
      </header>

      {/* 進捗バー */}
      <div className="h-1.5 bg-gray-200">
        <div
          className="h-1.5 bg-blue-500 transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* 本文 */}
      <main className="flex-1 px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="text-base font-semibold whitespace-pre-line">
            {current.title}
          </h2>

          {current.description && (
            <p className="mt-2 text-xs text-gray-600 whitespace-pre-line">
              {current.description}
            </p>
          )}

          <div className="mt-4">{renderInput()}</div>

          {error && (
            <p className="mt-2 text-xs text-red-600 font-medium">{error}</p>
          )}
        </div>
      </main>

      {/* フッター */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-3 flex gap-3">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className={`flex-1 rounded-full border px-3 py-2 text-sm font-medium ${
            currentIndex === 0
              ? "border-gray-200 text-gray-300 bg-gray-50"
              : "border-gray-300 text-gray-700 bg-white active:bg-gray-100"
          }`}
        >
          戻る
        </button>

        <button
          onClick={handleNext}
          disabled={submitting}
          className={`
            flex-1 rounded-full px-3 py-2 text-sm font-medium text-white
            ${
              submitting
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 active:bg-blue-700"
            }
          `}
        >
          {submitting ? (
            <div className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              送信中…
            </div>
          ) : isLastVisible ? (
            "回答を送信する"
          ) : (
            "次へ"
          )}
        </button>
      </footer>
    </div>
  );
}
