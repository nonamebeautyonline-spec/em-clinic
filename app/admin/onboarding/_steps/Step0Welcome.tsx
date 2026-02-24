"use client";

// Step 0: ようこそ画面

interface SetupStatus {
  completedCount: number;
  totalCount: number;
  steps: {
    line: boolean;
    payment: boolean;
    products: boolean;
    schedule: boolean;
    staff: boolean;
    richMenu: boolean;
  };
}

interface Props {
  tenantName: string | null;
  setupStatus: SetupStatus | null;
  onNext: () => void;
}

const WIZARD_STEPS = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    label: "LINE連携設定",
    desc: "LINE Messaging APIの認証情報を登録",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    label: "決済設定",
    desc: "Square / GMOの決済サービスを連携",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    label: "商品登録",
    desc: "処方商品を登録（デフォルト商品のインポート可）",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    label: "診療スケジュール",
    desc: "医師と診療可能な曜日・時間を設定",
  },
];

export default function Step0Welcome({ tenantName, setupStatus, onNext }: Props) {
  // ウィザード対象4ステップの完了数
  const wizardCompleted = setupStatus
    ? [
        setupStatus.steps.line,
        setupStatus.steps.payment,
        setupStatus.steps.products,
        setupStatus.steps.schedule,
      ].filter(Boolean).length
    : 0;

  return (
    <div className="p-6 sm:p-8">
      {/* ヘッダー */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">
          {tenantName ? `${tenantName}へようこそ` : "ようこそ"}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          初期セットアップを完了して、すぐに運用を開始しましょう。
          <br className="hidden sm:block" />
          約10分で完了します。
        </p>
      </div>

      {/* 進捗表示（途中再開の場合） */}
      {wizardCompleted > 0 && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800 font-medium">
            {wizardCompleted}/4 ステップが完了済みです。残りのステップから続けます。
          </p>
        </div>
      )}

      {/* ステップ一覧 */}
      <div className="space-y-3 mb-8">
        {WIZARD_STEPS.map((s, idx) => {
          const stepKeys = ["line", "payment", "products", "schedule"] as const;
          const completed = setupStatus?.steps[stepKeys[idx]] ?? false;
          return (
            <div
              key={idx}
              className={`flex items-center gap-4 p-4 rounded-lg border ${
                completed
                  ? "bg-green-50 border-green-200 opacity-60"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                  completed
                    ? "bg-green-100 text-green-600"
                    : "bg-white text-slate-500 shadow-sm"
                }`}
              >
                {completed ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  s.icon
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${completed ? "text-green-700" : "text-slate-900"}`}>
                  {s.label}
                  {completed && <span className="ml-2 text-xs text-green-600">完了</span>}
                </p>
                <p className={`text-xs mt-0.5 ${completed ? "text-green-600" : "text-slate-500"}`}>
                  {s.desc}
                </p>
              </div>
              <span className="flex-shrink-0 text-xs font-medium text-slate-400">
                Step {idx + 1}
              </span>
            </div>
          );
        })}
      </div>

      {/* 開始ボタン */}
      <div className="text-center">
        <button
          onClick={onNext}
          className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          {wizardCompleted > 0 ? "セットアップを続ける" : "セットアップを開始する"}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <p className="mt-3 text-xs text-slate-400">
          各ステップは後から設定ページで変更できます
        </p>
      </div>
    </div>
  );
}
