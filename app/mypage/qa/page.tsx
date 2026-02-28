"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

// ── 型定義 ──
interface FAQ {
  question: string;
  answer: string;
}

interface Category {
  id: string;
  icon: string;
  title: string;
  description: string;
  gradient: string;
  iconBg: string;
  faqs: FAQ[];
}

// ── カテゴリ定義 ──
const CATEGORIES: Category[] = [
  {
    id: "getting-started",
    icon: "🏥",
    title: "はじめての方へ",
    description: "ご利用の流れ・マイページへのアクセス方法",
    gradient: "from-pink-400 to-rose-500",
    iconBg: "bg-pink-100 text-pink-600",
    faqs: [
      {
        question: "ご利用の流れを教えてください",
        answer:
          "以下のステップでご利用いただけます。\n\n①個人情報入力\nLINEメニューの「マイページ」から個人情報を入力します。\n\n②LINEログイン＋SMS認証\nLINEログインとSMS認証を完了すると、マイページが表示されます。\n\n③問診提出\nマイページから問診にお答えください。\n\n④予約選択\nマイページから診察の予約日時を選択します。\n\n⑤診察\n予約時間に090から始まる番号よりお電話いたします。\n\n⑥決済\n診察後、マイページから決済のお手続きをお願いします。\n\n⑦発送\nマイページから配送状況をご確認いただけます。",
      },
      {
        question: "マイページにアクセスするにはどうすればいいですか？",
        answer:
          "LINEのトーク画面下部にあるメニューから「マイページ」をタップしてください。初回はLINEログインとSMS認証（電話番号の確認）が必要です。2回目以降はLINEログインのみでアクセスできます。",
      },
      {
        question: "ログインできません",
        answer:
          "以下をお試しください。\n\n・LINEアプリが最新バージョンか確認してください\n・ブラウザのキャッシュとCookieを削除してから再度お試しください\n・LINEの「設定」→「アカウント」→「ログイン許可」がONになっているか確認してください\n\nそれでも解決しない場合は、LINEメッセージでお問い合わせください。",
      },
    ],
  },
  {
    id: "sms-account",
    icon: "🔐",
    title: "SMS認証・アカウント",
    description: "SMS認証・電話番号・個人情報の変更",
    gradient: "from-violet-400 to-purple-500",
    iconBg: "bg-violet-100 text-violet-600",
    faqs: [
      {
        question: "SMS認証コードが届きません",
        answer:
          "以下をご確認ください。\n\n・入力した電話番号に誤りがないか確認してください\n・SMSの受信拒否設定がONになっていないか確認してください\n・海外からのSMSをブロックしている場合は、一時的に解除してください\n・電波状況が悪い場合は、場所を変えてお試しください\n・数分経っても届かない場合は「再送信」ボタンをタップしてください\n\nそれでも届かない場合は、LINEメッセージでお問い合わせください。",
      },
      {
        question: "電話番号やLINEアカウントを変更したい",
        answer:
          "電話番号やLINEアカウントの変更をご希望の場合は、LINEメッセージでご相談ください。本人確認のうえ、変更の手続きをいたします。",
      },
      {
        question: "登録した個人情報を修正したい",
        answer:
          "氏名などの個人情報の修正は、LINEメッセージでスタッフにお知らせください。確認のうえ修正いたします。",
      },
    ],
  },
  {
    id: "intake",
    icon: "📋",
    title: "問診について",
    description: "問診の入力方法・注意事項",
    gradient: "from-emerald-400 to-teal-500",
    iconBg: "bg-emerald-100 text-emerald-600",
    faqs: [
      {
        question: "問診の入力方法を教えてください",
        answer:
          "マイページにログイン後、「問診に回答する」ボタンから問診フォームにお進みください。現在の体調や服用中のお薬などについての質問にお答えいただきます。すべての項目に回答後、「送信」ボタンで提出してください。",
      },
      {
        question: "問診を途中で中断した場合、続きから入力できますか？",
        answer:
          "申し訳ございませんが、途中保存には対応しておりません。ブラウザを閉じた場合は最初から入力し直しとなります。お時間に余裕のある時にご入力をお願いいたします。",
      },
    ],
  },
  {
    id: "reservation",
    icon: "📅",
    title: "予約・診察について",
    description: "予約の取り方・変更・診察の流れ",
    gradient: "from-sky-400 to-blue-500",
    iconBg: "bg-sky-100 text-sky-600",
    faqs: [
      {
        question: "予約の取り方を教えてください",
        answer:
          "問診の提出後、マイページに「予約する」ボタンが表示されます。ご希望の日時を選択して予約を確定してください。予約が確定するとLINEに確認メッセージが届きます。",
      },
      {
        question: "予約の変更・キャンセルはできますか？",
        answer:
          "はい、マイページから変更・キャンセルが可能です。予約一覧から該当の予約を選び、「変更」または「キャンセル」ボタンをタップしてください。\n\nなお、診察時間の直前のキャンセルが続くと、次回以降のご予約が取りづらくなる場合がございます。変更・キャンセルはお早めにお手続きをお願いします。",
      },
      {
        question: "診察はどのように行われますか？",
        answer:
          "予約時間枠の間に、090から始まる番号よりお電話いたします。電話での診察となりますので、通話できる環境でお待ちください。\n\n知らない番号からの着信を受け取れない設定にしている場合は、事前にLINEメッセージでお知らせいただくか、設定を一時的に解除してください。",
      },
      {
        question: "予約時間に電話に出られなかった場合はどうなりますか？",
        answer:
          "予約時間枠内に数回おかけ直しいたします。それでもご対応いただけなかった場合は、次回以降のご予約が取りづらくなる可能性がございます。\n\nご都合が悪くなった場合は、事前にマイページからキャンセルまたは日時変更をお願いいたします。",
      },
    ],
  },
  {
    id: "payment",
    icon: "💳",
    title: "決済について",
    description: "決済方法・入金確認・届け先について",
    gradient: "from-amber-400 to-orange-500",
    iconBg: "bg-amber-100 text-amber-600",
    faqs: [
      {
        question: "どのような決済方法がありますか？",
        answer:
          "クレジットカード決済と銀行振込の2種類に対応しております。\n\n※ PayPay・後払い等には対応しておりません。",
      },
      {
        question: "マイページから決済できますか？",
        answer:
          "はい。診察完了後、マイページに決済ボタンが表示されます。そちらからクレジットカード決済または銀行振込をお選びいただき、お手続きをお願いします。",
      },
      {
        question: "入金確認にはどのくらいかかりますか？",
        answer:
          "銀行振込の場合、発送直前に入金確認を行います。お振込み後、特に連絡の必要はありません。\n\nクレジットカード決済の場合は、決済完了と同時に自動で確認されます。",
      },
      {
        question: "決済がエラーになります",
        answer:
          "以下をご確認ください。\n\n・クレジットカードの有効期限が切れていないか確認してください\n・カードの利用限度額を超えていないか確認してください\n・カード会社のセキュリティ設定でブロックされている場合があります\n\n解決しない場合は、別のカードでのお支払いまたは銀行振込をお試しください。それでもうまくいかない場合は、LINEメッセージでお問い合わせください。",
      },
      {
        question: "決済前に届け先を変更したい",
        answer:
          "銀行振込の場合は、振込完了後に表示される配送先入力フォームでご希望の届け先をご入力ください。\n\nクレジットカード決済の場合は、決済完了後にマイページの注文詳細から届け先を設定・変更できます。",
      },
    ],
  },
  {
    id: "shipping",
    icon: "📦",
    title: "発送・配送について",
    description: "配送業者・追跡確認・届け先変更・保管方法",
    gradient: "from-cyan-400 to-teal-500",
    iconBg: "bg-cyan-100 text-cyan-600",
    faqs: [
      {
        question: "配送業者はどこですか？",
        answer:
          "ヤマト運輸のクール便（チルド）でお届けします。冷蔵保存が必要な医薬品のため、温度管理を徹底しています。\n\n土日祝日も発送対応しております。12時までの決済が確認できれば当日発送、それ以降は翌日発送となります。",
      },
      {
        question: "発送状況はどこで確認できますか？",
        answer:
          "発送が完了するとLINEで追跡番号付きの通知が届きます。通知内のリンクからヤマト運輸のサイトで配送状況をリアルタイムで確認できます。\n\nまた、マイページの注文詳細からも追跡番号と配送ステータスをご確認いただけます。",
      },
      {
        question: "決済後に届け先を変更したい",
        answer:
          "マイページの注文詳細から「届け先を変更」ボタンで変更可能です。\n\nただし、当日12時以降は発送準備に入るため、変更が必要な場合はLINEメッセージでお問い合わせください。\n\n発送済みの場合は、追跡番号からヤマト運輸のサイトで届け先変更・営業所留めのお手続きが可能です。",
      },
      {
        question: "お薬の保管方法を教えてください",
        answer:
          "冷蔵庫（2〜8℃）で保管してください。\n\n冷凍保存は絶対にしないでください。薬液が凍結したり、効果が低下してしまいます。\n\n直射日光や高温を避け、お子様の手の届かない場所で保管をお願いいたします。",
      },
    ],
  },
  {
    id: "reorder",
    icon: "🔄",
    title: "再処方について",
    description: "再処方の申請方法・承認・キャンセル",
    gradient: "from-indigo-400 to-blue-500",
    iconBg: "bg-indigo-100 text-indigo-600",
    faqs: [
      {
        question: "再処方の申請方法を教えてください",
        answer:
          "マイページの「再処方申請」ボタンから申請できます。ご希望の用量・月数を選択して申請してください。\n\n医師が内容を確認し、承認されるとLINEで通知が届きます。その後、マイページから決済のお手続きをお願いします。",
      },
      {
        question: "承認までどのくらいかかりますか？",
        answer:
          "通常、申請後1〜2営業日以内に医師が確認いたします。承認または確認事項がある場合はLINEでご連絡いたします。",
      },
      {
        question: "申請のキャンセルはできますか？",
        answer:
          "承認前（申請中）であればキャンセル可能です。マイページの再処方申請一覧からキャンセルの手続きを行ってください。\n\n承認後・決済後のキャンセルについては、LINEメッセージでご相談ください。",
      },
      {
        question: "用量の変更はできますか？",
        answer:
          "再処方申請時に、前回と異なる用量を選択することが可能です。ただし、用量の変更については医師の判断が必要となりますので、承認までにお時間をいただく場合がございます。\n\nご不安な点がありましたら、事前にLINEメッセージでご相談ください。",
      },
    ],
  },
];

// ── アニメーション付きアコーディオン ──
function AnimatedCollapse({
  isOpen,
  children,
}: {
  isOpen: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="grid transition-[grid-template-rows,opacity] duration-300 ease-in-out"
      style={{
        gridTemplateRows: isOpen ? "1fr" : "0fr",
        opacity: isOpen ? 1 : 0,
      }}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

// ── 個別FAQ項目 ──
function FAQItem({
  faq,
  index,
  searchQuery,
}: {
  faq: FAQ;
  index: number;
  searchQuery: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const highlight = useCallback(
    (text: string) => {
      if (!searchQuery) return text;
      const regex = new RegExp(
        `(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
        "gi",
      );
      const parts = text.split(regex);
      return parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="bg-yellow-200 text-yellow-900 rounded-sm px-0.5"
          >
            {part}
          </mark>
        ) : (
          part
        ),
      );
    },
    [searchQuery],
  );

  return (
    <div
      className="group animate-fadeSlideIn"
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-start gap-3 px-5 py-4 text-left transition-all duration-200 ${
          isOpen ? "bg-white" : "bg-white/60 hover:bg-white"
        }`}
      >
        <span
          className={`flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mt-0.5 transition-colors duration-200 ${
            isOpen
              ? "bg-pink-500 text-white"
              : "bg-slate-200 text-slate-500 group-hover:bg-pink-100 group-hover:text-pink-600"
          }`}
        >
          Q
        </span>

        <span
          className={`flex-1 text-sm leading-relaxed transition-colors duration-200 ${
            isOpen
              ? "font-semibold text-slate-900"
              : "font-medium text-slate-700 group-hover:text-slate-900"
          }`}
        >
          {highlight(faq.question)}
        </span>

        <svg
          className={`w-4 h-4 flex-shrink-0 mt-1 text-slate-400 transition-transform duration-300 ease-out ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      <AnimatedCollapse isOpen={isOpen}>
        <div className="px-5 pb-5 pt-0">
          <div className="ml-9 pl-4 border-l-2 border-pink-200">
            <p className="text-sm text-slate-600 leading-[1.8] whitespace-pre-line">
              {highlight(faq.answer)}
            </p>
          </div>
        </div>
      </AnimatedCollapse>
    </div>
  );
}

// ── カテゴリアコーディオン ──
function CategoryAccordion({
  category,
  isOpen,
  onToggle,
  searchQuery,
}: {
  category: Category;
  isOpen: boolean;
  onToggle: () => void;
  searchQuery: string;
}) {
  return (
    <div
      className={`rounded-2xl overflow-hidden transition-all duration-300 ${
        isOpen
          ? "shadow-lg shadow-slate-200/60 ring-1 ring-slate-200"
          : "shadow-sm hover:shadow-md ring-1 ring-slate-100 hover:ring-slate-200"
      }`}
    >
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-4 px-6 py-5 text-left transition-all duration-300 ${
          isOpen
            ? `bg-gradient-to-r ${category.gradient} text-white`
            : "bg-white hover:bg-slate-50/80"
        }`}
      >
        <span
          className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all duration-300 ${
            isOpen ? "bg-white/20 scale-110" : category.iconBg
          }`}
        >
          {category.icon}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <span
              className={`text-base font-bold transition-colors duration-300 ${
                isOpen ? "text-white" : "text-slate-900"
              }`}
            >
              {category.title}
            </span>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full transition-all duration-300 ${
                isOpen
                  ? "bg-white/20 text-white"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {category.faqs.length}件
            </span>
          </div>
          <p
            className={`text-xs mt-0.5 transition-colors duration-300 ${
              isOpen ? "text-white/80" : "text-slate-500"
            }`}
          >
            {category.description}
          </p>
        </div>

        <div
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
            isOpen ? "bg-white/20 rotate-180" : "bg-slate-100"
          }`}
        >
          <svg
            className={`w-4 h-4 transition-colors duration-300 ${
              isOpen ? "text-white" : "text-slate-400"
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      <AnimatedCollapse isOpen={isOpen}>
        <div className="bg-slate-50/50 divide-y divide-slate-100">
          {category.faqs.map((faq, idx) => (
            <FAQItem
              key={idx}
              faq={faq}
              index={idx}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      </AnimatedCollapse>
    </div>
  );
}

// ── メインページ ──
export default function PatientQAPage() {
  return (
    <Suspense>
      <PatientQAPageInner />
    </Suspense>
  );
}

function PatientQAPageInner() {
  const searchParams = useSearchParams();
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // URLパラメータ ?c=categoryId からカテゴリを自動展開
  useEffect(() => {
    const c = searchParams.get("c");
    if (c && CATEGORIES.some((cat) => cat.id === c)) {
      setOpenCategory(c);
      // 該当カテゴリまでスクロール
      setTimeout(() => {
        document.getElementById(`qa-${c}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    }
  }, [searchParams]);

  // 検索フィルタ
  const filteredCategories = searchQuery
    ? CATEGORIES.map((cat) => ({
        ...cat,
        faqs: cat.faqs.filter(
          (faq) =>
            faq.question.includes(searchQuery) ||
            faq.answer.includes(searchQuery),
        ),
      })).filter((cat) => cat.faqs.length > 0)
    : CATEGORIES;

  const totalFaqs = CATEGORIES.reduce((sum, cat) => sum + cat.faqs.length, 0);
  const filteredFaqCount = filteredCategories.reduce(
    (sum, cat) => sum + cat.faqs.length,
    0,
  );

  return (
    <>
      <style jsx global>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeSlideIn {
          animation: fadeSlideIn 0.3s ease-out both;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out both;
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.4s ease-out both;
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-b from-pink-50/50 to-white">
        <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
          {/* ── ヘッダー ── */}
          <div className="text-center mb-10 animate-fadeIn">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-400 to-rose-500 text-white text-2xl mb-5 shadow-lg shadow-pink-500/25">
              💬
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              よくある質問
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              マイページ・予約・決済・配送などについてのQ&Aをまとめました
            </p>
            <div className="flex items-center justify-center gap-3 mt-4">
              <span className="inline-flex items-center gap-1.5 bg-pink-100 text-pink-700 text-xs font-semibold px-3 py-1 rounded-full">
                {CATEGORIES.length}カテゴリ
              </span>
              <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 text-xs font-semibold px-3 py-1 rounded-full">
                全{totalFaqs}件
              </span>
            </div>
          </div>

          {/* ── 検索バー ── */}
          <div className="relative mb-8 animate-slideDown" style={{ animationDelay: "100ms" }}>
            <div className="relative">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="キーワードで検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-10 py-3.5 rounded-2xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-300 shadow-sm transition-shadow duration-200 focus:shadow-md"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center hover:bg-slate-300 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="mt-2 text-xs text-slate-500 text-center">
                {filteredFaqCount > 0
                  ? `${filteredFaqCount}件の質問が見つかりました`
                  : "該当する質問が見つかりませんでした"}
              </p>
            )}
          </div>

          {/* ── カテゴリ一覧 ── */}
          {filteredCategories.length > 0 ? (
            <div className="space-y-4">
              {filteredCategories.map((category, idx) => (
                <div
                  key={category.id}
                  id={`qa-${category.id}`}
                  className="animate-slideDown"
                  style={{ animationDelay: `${(idx + 2) * 60}ms` }}
                >
                  <CategoryAccordion
                    category={category}
                    isOpen={
                      searchQuery
                        ? true
                        : openCategory === category.id
                    }
                    onToggle={() =>
                      setOpenCategory(
                        openCategory === category.id ? null : category.id,
                      )
                    }
                    searchQuery={searchQuery}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 text-slate-400 text-2xl mb-4">
                🔍
              </div>
              <p className="text-slate-500 font-medium">
                「{searchQuery}」に一致する質問が見つかりませんでした
              </p>
              <button
                onClick={() => setSearchQuery("")}
                className="mt-3 text-sm text-pink-600 hover:text-pink-700 font-medium"
              >
                検索をクリア
              </button>
            </div>
          )}

          {/* ── サポートフッター ── */}
          <div className="mt-12 animate-fadeIn" style={{ animationDelay: "600ms" }}>
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 p-6 sm:p-8 text-white shadow-lg">
              <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10" />
              <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5" />
              <div className="relative">
                <h3 className="text-lg font-bold mb-2">解決しない場合は</h3>
                <p className="text-sm text-white/90 leading-relaxed mb-4">
                  LINEのトーク画面からいつでもスタッフにご相談いただけます。お気軽にメッセージをお送りください。
                </p>
                <Link
                  href="/mypage"
                  className="inline-flex items-center gap-2 bg-white text-pink-600 font-semibold text-sm px-5 py-2.5 rounded-full hover:bg-pink-50 transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  マイページに戻る
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
