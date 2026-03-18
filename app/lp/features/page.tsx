import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = "https://l-ope.jp";

export const metadata: Metadata = {
  title: "機能一覧 | Lオペ for CLINIC — LINE公式アカウント クリニック運用プラットフォーム",
  description:
    "Lオペ for CLINICの全40機能以上を一覧で紹介。患者CRM・セグメント配信・リッチメニュー・オンライン問診・予約管理・AI自動返信・音声カルテ・決済管理・配送管理・在庫管理・NPS調査・フロービルダーなど、LINE公式アカウントでクリニック業務をDX化する全機能を解説。",
  alternates: { canonical: `${SITE_URL}/lp/features` },
  openGraph: {
    title: "機能一覧（40機能以上）| Lオペ for CLINIC",
    description:
      "LINE公式アカウントでクリニック業務をDX化。患者CRM・AI・予約・決済・配送・分析まで、40以上の機能をオールインワンで提供。",
    url: `${SITE_URL}/lp/features`,
    siteName: "Lオペ for CLINIC",
    locale: "ja_JP",
    type: "website",
  },
};

/* ────────────────────────────────────────── */
/*  機能データ（9カテゴリ・42機能）             */
/* ────────────────────────────────────────── */

const featureCategories = [
  {
    category: "患者CRM",
    color: "blue",
    icon: "users",
    description: "LINE友だちを「患者」として一元管理。タグ・マーク・カスタムフィールドで診療に必要な情報を整理し、セグメント配信の基盤を構築します。",
    features: [
      { name: "LINEトーク管理", icon: "chat", desc: "患者との1対1チャットを管理画面で一元管理。問診・処方歴・タグ情報を確認しながらリアルタイムで対応。", tags: ["リアルタイム", "患者情報連動"] },
      { name: "タグ管理", icon: "tag", desc: "10色のカラー付きタグで患者を自由に分類。「初診」「美容」「ダイエット」など、診療内容・属性ごとにセグメント配信の基盤を構築。友だち追加時の自動タグ付けにも対応。", tags: ["10色カラー", "自動タグルール", "一括タグ付け"] },
      { name: "対応マーク（ステータス管理）", icon: "status", desc: "「未対応」「対応中」「完了」「重要」「保留」など、患者ごとの対応状況を色付きマークで可視化。スタッフ間の引き継ぎ漏れを防止。", tags: ["6段階ステータス", "カスタムラベル", "色分け表示"] },
      { name: "カスタムフィールド", icon: "field", desc: "患者ごとに自由な情報フィールドを定義・蓄積。「前回処方薬」「アレルギー」「希望メニュー」など、クリニック独自の管理項目をLINE CRMに統合。", tags: ["フィールド自由定義", "Webhook連動"] },
      { name: "患者重複排除・統合", icon: "merge", desc: "重複患者を自動検出し、ワンクリックでマージ処理を実行。名前・電話番号・LINE IDなどの類似度スコアリングでデータの整合性を維持。", tags: ["自動検出", "類似度スコア", "ワンクリックマージ"] },
    ],
  },
  {
    category: "メッセージ配信",
    color: "green",
    icon: "send",
    description: "セグメント配信・ステップシナリオ・A/Bテストなど、患者一人ひとりに最適なメッセージを最適なタイミングで届けます。",
    features: [
      { name: "セグメント配信", icon: "segment", desc: "タグ・マーク・友だち情報の組み合わせで、配信対象を精密に絞り込み。「3ヶ月未受診の美容タグ患者のみ」といった高度なターゲティングが可能。", tags: ["AND/OR条件", "除外条件", "配信前プレビュー"] },
      { name: "ステップシナリオ", icon: "flow", desc: "友だち追加→問診→予約→フォローアップまでの一連の流れを自動化。トリガーに応じたステップ配信で、患者との関係構築を自動化。", tags: ["7種トリガー", "効果測定", "登録者管理"] },
      { name: "テンプレート管理", icon: "template", desc: "よく使うメッセージをテンプレート化してカテゴリ別に整理。変数（{name}・{date}）の自動挿入で、パーソナライズされたメッセージを瞬時に送信。", tags: ["カテゴリフォルダ", "変数置換", "テスト送信"] },
      { name: "予約リマインド自動配信", icon: "remind", desc: "予約日前に自動でLINEリマインドを送信。無断キャンセルの削減と来院率の向上を実現。送信結果もリアルタイムで追跡。", tags: ["個別/一括", "タイミング設定", "送信ステータス管理"] },
      { name: "フォローアップ自動配信", icon: "followup", desc: "診察後や処方後に、最適なタイミングで自動フォローアップを配信。副作用確認・満足度調査・再診促進を自動化。", tags: ["処方X日後配信", "処方薬別テンプレート", "再診促進"] },
      { name: "A/Bテスト", icon: "ab", desc: "メッセージの複数バリアントを自動分割配信し、開封率・CV率を比較検証。データドリブンで配信内容を最適化。", tags: ["バリアント自動分割", "成功率比較", "チャート可視化"] },
      { name: "キーワード自動返信", icon: "keyword", desc: "患者が送信したキーワードに応じて自動返信。部分一致・完全一致・正規表現に対応し、テンプレートやアクション実行も設定可能。", tags: ["3種マッチ", "優先度設定", "統計データ"] },
    ],
  },
  {
    category: "ノーコード構築",
    color: "purple",
    icon: "build",
    description: "リッチメニュー・Flexメッセージ・フォーム・チャットボットをGUI操作で構築。エンジニア不要で現場スタッフが運用可能。",
    features: [
      { name: "リッチメニュービルダー", icon: "menu", desc: "ドラッグ操作でLINEリッチメニューのボタン配置を自由に設計。URL・電話・メッセージ送信・タグ操作・メニュー切替など複雑なアクションを設定可能。", tags: ["ビジュアルエディタ", "自由配置", "条件分岐アクション"] },
      { name: "Flex Messageビルダー", icon: "flex", desc: "LINE Flex Message（カード型リッチメッセージ）をノーコードで作成。カルーセル・ボタン・画像をプリセットから選んでそのまま配信。", tags: ["プリセット", "ウィザード形式", "カルーセル対応"] },
      { name: "回答フォームビルダー", icon: "form", desc: "問診票・アンケート・同意書などのフォームをGUIで作成。患者はLINE上からワンタップでアクセスし回答。回答データは管理画面に自動集約。", tags: ["フォルダ整理", "公開URL自動生成", "ファイルアップロード"] },
      { name: "チャットボットビルダー", icon: "bot", desc: "会話フロー（シナリオ）をビジュアルエディタで設計。メッセージ・質問・アクション・条件分岐ノードを組み合わせて自動対話を構築。", tags: ["ビジュアルフロー", "条件分岐", "シナリオテンプレート"] },
      { name: "フロービルダー", icon: "workflow", desc: "複雑な患者対応フローをビジュアルエディタで構築。友だち追加→問診→予約→フォローアップまでの一連の流れをドラッグ&ドロップで設計。", tags: ["条件分岐", "遅延・並列処理", "テンプレート即構築"] },
      { name: "アクション自動化", icon: "action", desc: "友だち追加→挨拶メッセージ→タグ付与→リッチメニュー切替のようなワークフローをステップ形式で構築。条件分岐にも対応。", tags: ["ステップ実行", "条件分岐", "遅延送信"] },
    ],
  },
  {
    category: "AI機能",
    color: "amber",
    icon: "ai",
    description: "AI自動返信・音声カルテ・リッチメニュー自動生成など、AIで診療業務とLINE運用を大幅効率化。",
    features: [
      { name: "AI自動返信", icon: "ai-reply", desc: "AIが患者からの問い合わせ内容を理解し、クリニックのFAQ・処方情報を踏まえた返信文を自動生成。スタッフ確認後に送信するフローで品質を担保。", tags: ["返信候補自動生成", "修正→再生成", "自動送信モード"] },
      { name: "AI自動学習（RAG）", icon: "rag", desc: "スタッフの修正送信・手動返信をAIが自動学習。embeddingベクトルで類似事例を蓄積し、使うほど返信精度が向上。", tags: ["修正から自動学習", "類似事例参照", "学習例管理画面"] },
      { name: "音声カルテ自動生成", icon: "voice", desc: "診察中の会話をワンタップ録音。AIが音声を文字起こしし、SOAP形式のカルテを自動生成。カルテ作成時間を1件あたり数分に短縮。", tags: ["SOAP自動生成", "医療用語自動抽出", "テンプレート連携"] },
      { name: "AIリッチメニュー自動生成", icon: "ai-menu", desc: "クリニックの業種・テーマ・カラーを指定するだけで、AIがプロ品質のリッチメニューデザインを自動生成。デザイナー不要で数分で完成。", tags: ["業種・カラー指定のみ", "SVG→PNG自動生成", "再生成可能"] },
      { name: "AIモデル切替", icon: "model", desc: "用途やコストに応じて、管理画面からAIモデルを自由に選択。高精度モデルと高速モデルを使い分けて最適なバランスで運用。", tags: ["管理画面から即切替", "コスト最適化"] },
    ],
  },
  {
    category: "予約・診察",
    color: "cyan",
    icon: "calendar",
    description: "予約管理・オンライン問診・カルテまで、診療の一連の流れをLINE起点で完結。複数医師の並列管理にも対応。",
    features: [
      { name: "予約・スケジュール管理", icon: "schedule", desc: "月別・週別の予約カレンダーに加え、複数医師の並列スケジュール管理・医師別フィルタ・休日設定・日付オーバーライドに対応。", tags: ["月/週ビュー", "複数医師並列", "予約ステータス追跡"] },
      { name: "オンライン問診", icon: "questionnaire", desc: "友だち追加後にLINEで問診フォームを自動送信。来院前に問診完了し、待ち時間を短縮。条件分岐・NG判定（禁忌チェック）にも対応。", tags: ["条件分岐", "NG判定", "リアルタイム反映"] },
      { name: "カルテ管理（SOAP対応）", icon: "karte", desc: "診察内容をSOAP形式で構造化記録。処方タイムライン・来院履歴を一画面で確認。テンプレートで入力効率化。同時編集ロック機能搭載。", tags: ["SOAP構造化", "処方タイムライン", "同時編集ロック"] },
      { name: "キャンセル待ち自動通知", icon: "waitlist", desc: "予約キャンセルが発生すると、待ちリストの患者へLINEで自動通知。空き枠を無駄なく活用し、予約充足率を向上。", tags: ["待ちリスト自動管理", "LINE自動通知", "先着順マッチング"] },
      { name: "EHR連携（電子カルテ連携）", icon: "ehr", desc: "外部電子カルテシステムと患者・カルテデータをCSV/APIで双方向同期。スケジュール実行・エラー再試行・同期ログで運用を安定化。", tags: ["CSV/API双方向同期", "スケジュール実行", "エラーリトライ"] },
    ],
  },
  {
    category: "決済・配送",
    color: "emerald",
    icon: "payment",
    description: "Square/GMO決済連携から配送管理・在庫管理まで、クリニックの金流と物流をワンストップで管理。",
    features: [
      { name: "会計・決済管理", icon: "credit", desc: "Square/GMO決済連携による売上追跡・銀行振込の消込処理・返金管理まで一元可視化。LINE経由でシームレスにオンライン決済を完結。", tags: ["Square/GMO連携", "振込消込", "返金処理"] },
      { name: "配送・発送管理", icon: "truck", desc: "ヤマトB2形式のCSV出力・追跡番号管理・配送ラベル印刷まで対応。処方薬の発送漏れを防止し、患者へ追跡リンクも自動共有。", tags: ["ヤマトB2 CSV", "追跡番号一括更新", "配送ステータス管理"] },
      { name: "未払い自動督促", icon: "alert", desc: "未払いが発生すると、3日後・7日後・14日後の3段階でLINE自動通知。回収率を向上させながらスタッフの督促業務をゼロに。", tags: ["3段階自動通知", "LINE送信", "Cron自動実行"] },
      { name: "再処方管理", icon: "refill", desc: "再処方申請・承認フローをシステム化。待機中・全件フィルタ、用量別マッピング、商品マスタ連携で再処方業務を効率化。", tags: ["申請・承認フロー", "用量マッピング", "LINE自動通知"] },
    ],
  },
  {
    category: "在庫・商品管理",
    color: "orange",
    icon: "inventory",
    description: "処方薬・施術メニュー・消耗品の在庫と商品情報をまとめて管理。ポイント自動付与でリピート促進も。",
    features: [
      { name: "在庫管理・在庫台帳", icon: "stock", desc: "処方薬・消耗品の在庫をリアルタイムで把握。入出庫の自動記録、在庫台帳で推移を可視化。要発注アラートで欠品防止。", tags: ["入出庫自動記録", "在庫推移グラフ", "要発注アラート"] },
      { name: "商品マスタ管理", icon: "product", desc: "処方薬・施術メニュー・消耗品の商品情報をまとめて管理。価格・在庫連動・決済連携設定まで一元管理。", tags: ["商品・価格一括管理", "在庫・決済連動", "商品別売上分析"] },
      { name: "ポイント自動付与", icon: "point", desc: "購入金額・初回購入・累計額に応じたポイントルールを設定。決済Webhook連動でポイントを自動付与し、リピート促進を自動化。", tags: ["3種ルール", "決済Webhook連動", "マイページ表示"] },
    ],
  },
  {
    category: "分析・レポート",
    color: "indigo",
    icon: "chart",
    description: "リアルタイムダッシュボード・LTV分析・配信分析・NPS調査まで、経営判断に必要なデータをすべて可視化。",
    features: [
      { name: "リアルタイムダッシュボード", icon: "dashboard", desc: "予約数・売上・新規/リピート比率・LINE友だち推移など13項目のKPIをリアルタイム表示。ドラッグ&ドロップで自由にカスタマイズ。", tags: ["D&DカスタムKPI", "コンバージョンファネル", "期間比較"] },
      { name: "売上分析・LTV分析", icon: "ltv", desc: "患者ごとのLTV（顧客生涯価値）を自動算出。売上推移・コホート分析・商品別ランキング・月次レポートをCSV出力。", tags: ["LTV自動算出", "コホート分析", "CSV出力"] },
      { name: "配信分析", icon: "analytics", desc: "LINE配信の開封率・クリック率・予約転換率を可視化。どのメッセージが効果的かをデータで把握し、配信戦略を最適化。", tags: ["開封率", "CTR", "CV率"] },
      { name: "流入経路トラッキング", icon: "tracking", desc: "LINE友だち追加の流入経路をUTM別に計測。広告・SNS・店頭QRなど、どの経路からの友だち追加が多いかをデータで可視化。", tags: ["UTM計測", "日別トレンド", "CV分析"] },
      { name: "NPS調査", icon: "nps", desc: "LINEで患者満足度を定期的に自動調査。NPSスコア（推奨者/中立者/批判者）を自動計算し、トレンドグラフで推移を把握。", tags: ["スコア自動計算", "トレンドグラフ", "コメント集約"] },
      { name: "クーポン管理・分析", icon: "coupon", desc: "割引クーポンの発行・配布・利用状況を一元管理。固定額・パーセンテージ割引、利用回数上限、有効期限設定に対応。", tags: ["発行数・利用率分析", "割引総額集計", "有効期限管理"] },
    ],
  },
  {
    category: "運用・セキュリティ",
    color: "slate",
    icon: "shield",
    description: "セキュリティ・バックアップ・監査ログなど、安全で安定した運用を支える基盤機能。",
    features: [
      { name: "メッセージ配信ログ", icon: "log", desc: "全メッセージの送受信履歴を一元管理。個別・一斉・リマインド・ステップ配信など種類別に検索可能。送信成功/失敗のステータスで配信品質を監視。", tags: ["方向別ログ", "ステータス追跡", "エラー詳細表示"] },
      { name: "メディアライブラリ", icon: "media", desc: "リッチメニュー画像・テンプレート画像・PDFなどのメディアファイルをフォルダ管理。各機能から横断的に利用可能。", tags: ["フォルダ整理", "画像・PDF対応", "リッチメニュー連携"] },
      { name: "セキュリティ・監査ログ", icon: "security", desc: "Row-Level Security・セッション管理・CSRF保護・暗号化通信を標準搭載。全操作を監査ログに記録し、コンプライアンスに対応。", tags: ["RLS", "監査ログ", "CSRF保護"] },
      { name: "初期設定ウィザード", icon: "setup", desc: "LINE連携→決済設定→商品登録→スケジュール設定まで、ステップバイステップの初期設定ウィザード。導入時の負担を最小化。", tags: ["ステップガイド", "進捗チェック", "スキップ対応"] },
    ],
  },
];

/* カテゴリカラーマップ */
const colorMap: Record<string, { bg: string; border: string; badge: string; text: string; iconBg: string; tagBg: string; tagText: string }> = {
  blue:    { bg: "bg-blue-50",    border: "border-blue-100",    badge: "bg-blue-600",    text: "text-blue-600",    iconBg: "bg-blue-100",    tagBg: "bg-blue-50",    tagText: "text-blue-600" },
  green:   { bg: "bg-emerald-50", border: "border-emerald-100", badge: "bg-emerald-600", text: "text-emerald-600", iconBg: "bg-emerald-100", tagBg: "bg-emerald-50", tagText: "text-emerald-600" },
  purple:  { bg: "bg-violet-50",  border: "border-violet-100",  badge: "bg-violet-600",  text: "text-violet-600",  iconBg: "bg-violet-100",  tagBg: "bg-violet-50",  tagText: "text-violet-600" },
  amber:   { bg: "bg-amber-50",   border: "border-amber-100",   badge: "bg-amber-500",   text: "text-amber-600",   iconBg: "bg-amber-100",   tagBg: "bg-amber-50",   tagText: "text-amber-600" },
  cyan:    { bg: "bg-cyan-50",    border: "border-cyan-100",    badge: "bg-cyan-600",    text: "text-cyan-600",    iconBg: "bg-cyan-100",    tagBg: "bg-cyan-50",    tagText: "text-cyan-600" },
  emerald: { bg: "bg-teal-50",    border: "border-teal-100",    badge: "bg-teal-600",    text: "text-teal-600",    iconBg: "bg-teal-100",    tagBg: "bg-teal-50",    tagText: "text-teal-600" },
  orange:  { bg: "bg-orange-50",  border: "border-orange-100",  badge: "bg-orange-500",  text: "text-orange-600",  iconBg: "bg-orange-100",  tagBg: "bg-orange-50",  tagText: "text-orange-600" },
  indigo:  { bg: "bg-indigo-50",  border: "border-indigo-100",  badge: "bg-indigo-600",  text: "text-indigo-600",  iconBg: "bg-indigo-100",  tagBg: "bg-indigo-50",  tagText: "text-indigo-600" },
  slate:   { bg: "bg-gray-50",    border: "border-gray-200",    badge: "bg-gray-600",    text: "text-gray-600",    iconBg: "bg-gray-100",    tagBg: "bg-gray-50",    tagText: "text-gray-600" },
};

/* カテゴリアイコンSVG */
function CategoryIcon({ type, className }: { type: string; className?: string }) {
  const cn = className || "w-6 h-6";
  switch (type) {
    case "users": return <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>;
    case "send": return <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>;
    case "build": return <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.657-5.657a8 8 0 1111.314 0l-5.657 5.657zm0 0L6.75 21h10.5l-4.83-5.83z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75h4.5" /></svg>;
    case "ai": return <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>;
    case "calendar": return <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>;
    case "payment": return <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>;
    case "inventory": return <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>;
    case "chart": return <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>;
    case "shield": return <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>;
    default: return <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" /></svg>;
  }
}

/* 機能カード内アイコン（シンプルなドットアイコン） */
function FeatureIcon({ color }: { color: string }) {
  const c = colorMap[color] || colorMap.blue;
  return (
    <div className={`${c.iconBg} ${c.text} flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl`}>
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    </div>
  );
}

/* JSON-LD */
const totalFeatures = featureCategories.reduce((sum, c) => sum + c.features.length, 0);
const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Lオペ for CLINIC 機能一覧",
    description: `LINE公式アカウントでクリニック業務をDX化するLオペ for CLINICの全${totalFeatures}機能`,
    numberOfItems: totalFeatures,
    itemListElement: featureCategories.flatMap((cat, ci) =>
      cat.features.map((f, fi) => ({
        "@type": "ListItem",
        position: ci * 10 + fi + 1,
        name: f.name,
        description: f.desc,
      }))
    ),
  },
  /* Offer — 料金プラン構造化データ */
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Lオペ for CLINIC",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: [
      {
        "@type": "Offer",
        name: "スタンダードプラン",
        price: "71500",
        priceCurrency: "JPY",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: "71500",
          priceCurrency: "JPY",
          unitText: "月額",
          referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "MON" },
        },
        description: "予約・カルテ・問診まで診療業務をカバー。全機能利用可・ユーザー数無制限。",
        url: `${SITE_URL}/lp#pricing`,
      },
      {
        "@type": "Offer",
        name: "プロプラン",
        price: "121000",
        priceCurrency: "JPY",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: "121000",
          priceCurrency: "JPY",
          unitText: "月額",
          referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "MON" },
        },
        description: "決済・配送・分析まで業務をまるごとDX化。全機能利用可・ユーザー数無制限。",
        url: `${SITE_URL}/lp#pricing`,
      },
    ],
  },
];

/* サイドバー目次用 */
const tocItems = featureCategories.map((cat) => ({
  id: cat.category,
  label: cat.category,
  count: cat.features.length,
  color: cat.color,
}));

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-800">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ヒーローセクション */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 pb-16 pt-24">
        {/* 背景装飾 */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-white" />
          <div className="absolute bottom-0 left-10 h-60 w-60 rounded-full bg-white" />
          <div className="absolute top-1/2 left-1/3 h-40 w-40 rounded-full bg-white" />
        </div>

        <div className="relative mx-auto max-w-6xl px-5">
          {/* パンくず */}
          <nav aria-label="パンくずリスト" className="mb-8">
            <ol className="flex items-center gap-1.5 text-[12px] text-blue-200 list-none m-0 p-0">
              <li><a href="https://l-ope.jp" className="hover:text-white transition">ホーム</a></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/lp" className="hover:text-white transition">Lオペ for CLINIC</Link></li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-white font-medium">機能一覧</li>
            </ol>
          </nav>

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-[13px] font-medium text-blue-100 backdrop-blur-sm mb-6">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6z" /><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" /></svg>
              全{totalFeatures}機能搭載
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-5xl leading-tight">
              クリニック運営に必要な<br />
              <span className="text-blue-200">すべての機能</span>をオールインワンで
            </h1>
            <p className="mt-5 text-[16px] leading-relaxed text-blue-100 max-w-2xl">
              患者CRM・メッセージ配信・AI自動返信・予約管理・決済・配送・分析まで。
              汎用LINEツールにはない、医療現場に最適化された{totalFeatures}の機能群です。
            </p>
          </div>

          {/* カテゴリ数サマリー */}
          <div className="mt-10 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
            {featureCategories.map((cat) => (
              <a
                key={cat.category}
                href={`#${cat.category}`}
                className="group flex flex-col items-center gap-2 rounded-2xl bg-white/10 px-3 py-4 backdrop-blur-sm transition hover:bg-white/20"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20 text-white group-hover:bg-white/30 transition">
                  <CategoryIcon type={cat.icon} className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-medium text-blue-100 text-center leading-tight">{cat.category}</span>
                <span className="text-[10px] text-blue-300">{cat.features.length}機能</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* メインコンテンツ: 2カラム */}
      <div className="mx-auto max-w-7xl px-5 py-16">
        <div className="flex gap-10">
          {/* サイドバー（デスクトップのみ） */}
          <aside className="hidden lg:block w-56 flex-shrink-0">
            <div className="sticky top-24">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4">カテゴリ目次</p>
              <nav className="flex flex-col gap-1">
                {tocItems.map((item) => {
                  const c = colorMap[item.color] || colorMap.blue;
                  return (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className="group flex items-center justify-between rounded-lg px-3 py-2.5 text-[13px] text-gray-600 transition hover:bg-gray-100"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${c.badge}`} />
                        <span className="group-hover:text-gray-900 transition">{item.label}</span>
                      </div>
                      <span className="text-[11px] text-gray-400">{item.count}</span>
                    </a>
                  );
                })}
              </nav>

              {/* サイドバーCTA */}
              <div className="mt-8 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-5 text-white">
                <p className="text-[14px] font-bold">全機能を体験</p>
                <p className="mt-1 text-[12px] text-blue-200 leading-relaxed">貴院の課題に合わせたデモをご案内します。</p>
                <a href="/lp/contact" className="mt-4 block rounded-xl bg-white px-4 py-2.5 text-center text-[13px] font-bold text-blue-600 transition hover:bg-blue-50">
                  無料で資料請求
                </a>
              </div>
            </div>
          </aside>

          {/* メインカラム */}
          <main className="flex-1 min-w-0">
            {featureCategories.map((cat, catIdx) => {
              const c = colorMap[cat.color] || colorMap.blue;
              return (
                <section key={cat.category} id={cat.category} className={catIdx > 0 ? "mt-20" : ""}>
                  {/* カテゴリヘッダー */}
                  <div className={`${c.bg} ${c.border} border rounded-2xl p-6 md:p-8`}>
                    <div className="flex items-start gap-4">
                      <div className={`${c.iconBg} ${c.text} flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl`}>
                        <CategoryIcon type={cat.icon} />
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h2 className="text-xl font-extrabold text-gray-900 md:text-2xl">{cat.category}</h2>
                          <span className={`${c.badge} rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white`}>{cat.features.length}機能</span>
                        </div>
                        <p className="mt-2 text-[14px] leading-relaxed text-gray-600">{cat.description}</p>
                      </div>
                    </div>
                  </div>

                  {/* 機能カード */}
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {cat.features.map((f) => (
                      <article
                        key={f.name}
                        className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition hover:border-blue-200 hover:shadow-lg hover:-translate-y-1"
                      >
                        <div className="flex items-start gap-3">
                          <FeatureIcon color={cat.color} />
                          <div className="flex-1 min-w-0">
                            <h3 className="text-[15px] font-bold text-gray-900">{f.name}</h3>
                            <p className="mt-2 text-[13px] leading-relaxed text-gray-500">{f.desc}</p>
                            {f.tags && (
                              <div className="mt-3 flex flex-wrap gap-1.5">
                                {f.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className={`${c.tagBg} ${c.tagText} rounded-md px-2 py-0.5 text-[10px] font-medium`}
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              );
            })}

            {/* 機能数サマリー */}
            <section className="mt-20">
              <div className="rounded-2xl border border-gray-200 bg-white p-8 md:p-10">
                <h2 className="text-center text-xl font-extrabold text-gray-900 md:text-2xl">
                  全{totalFeatures}機能を{featureCategories.length}カテゴリで提供
                </h2>
                <p className="mt-3 text-center text-[14px] text-gray-500">
                  すべての機能がスタンダードプランから利用可能。ユーザー数無制限・アップデート無料。
                </p>
                <div className="mt-8 grid grid-cols-3 gap-4 sm:grid-cols-5 lg:grid-cols-9">
                  {featureCategories.map((cat) => {
                    const c = colorMap[cat.color] || colorMap.blue;
                    return (
                      <div key={cat.category} className="flex flex-col items-center gap-2">
                        <div className={`${c.iconBg} ${c.text} flex items-center justify-center w-12 h-12 rounded-xl`}>
                          <CategoryIcon type={cat.icon} />
                        </div>
                        <span className="text-[12px] font-medium text-gray-700 text-center leading-tight">{cat.category}</span>
                        <span className={`${c.text} text-[18px] font-extrabold`}>{cat.features.length}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* CTA */}
            <section className="mt-16 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 p-10 text-center text-white md:p-14">
              <h2 className="text-2xl font-extrabold md:text-3xl">これらの機能をすべて体験しませんか？</h2>
              <p className="mt-3 text-[15px] text-blue-100">貴院の課題に合わせたデモのご案内も可能です。お気軽にお問い合わせください。</p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <a href="/lp/contact" className="rounded-full bg-white px-10 py-4 text-[14px] font-bold text-blue-600 shadow-lg transition hover:shadow-xl hover:scale-105">
                  無料で資料請求
                </a>
                <Link href="/lp#pricing" className="rounded-full border-2 border-white/40 px-10 py-4 text-[14px] font-bold text-white transition hover:bg-white/10">
                  料金プランを見る
                </Link>
              </div>
            </section>
          </main>
        </div>
      </div>

      {/* フッターリンク */}
      <footer className="border-t border-gray-100 py-8 text-center text-[13px] text-gray-400">
        <div className="flex flex-wrap justify-center gap-6">
          <Link href="/lp" className="hover:text-blue-600 transition">Lオペ for CLINIC トップ</Link>
          <Link href="/lp/about" className="hover:text-blue-600 transition">Lオペとは</Link>
          <Link href="/lp/column" className="hover:text-blue-600 transition">コラム</Link>
          <Link href="/lp/contact" className="hover:text-blue-600 transition">お問い合わせ</Link>
        </div>
      </footer>
    </div>
  );
}
