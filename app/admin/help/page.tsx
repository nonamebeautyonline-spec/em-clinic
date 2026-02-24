"use client";

import { useState, useCallback } from "react";

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
    id: "setup",
    icon: "⚡",
    title: "初期設定・基本操作",
    description: "LINE連携・決済・商品登録など初期設定の手順",
    gradient: "from-blue-500 to-indigo-600",
    iconBg: "bg-blue-100 text-blue-600",
    faqs: [
      {
        question: "LINE連携の設定方法は？",
        answer:
          "「設定」→「LINE」タブを開き、LINE Developersコンソールで取得したチャネルアクセストークンとチャネルシークレットを入力してください。Webhook URLは画面に自動表示されるので、そのままLINE Developersコンソールに貼り付けてください。設定後、テストメッセージを送信して疎通確認をお勧めします。",
      },
      {
        question: "決済設定（Square/GMO）の連携方法は？",
        answer:
          "「設定」→「決済」タブから、ご利用の決済サービスを選択します。Squareの場合はSquare DeveloperダッシュボードからアプリケーションIDとアクセストークンを取得して入力します。GMOの場合はショップIDとショップパスワードが必要です。テスト環境での動作確認後に本番切り替えをお勧めします。",
      },
      {
        question: "商品の登録方法は？",
        answer:
          "サイドメニューの「商品管理」から「新規追加」をクリックします。商品コード・商品名・価格・用量・月数を入力してください。在庫管理が必要な場合は在庫数も設定します。割引設定や並び順も同画面で調整可能です。登録した商品は問診フォームや決済フローに自動反映されます。",
      },
      {
        question: "ダッシュボードのウィジェットを並べ替えたい",
        answer:
          "ダッシュボード右上の「カスタマイズ」ボタンをクリックするとカスタマイズパネルが開きます。ウィジェットをドラッグ&ドロップで並べ替えたり、表示/非表示を切り替えできます。非表示にしたウィジェットは「非表示のウィジェット」セクションから再追加できます。設定は自動保存されます。",
      },
      {
        question: "スタッフ（管理者アカウント）を追加するには？",
        answer:
          "プラットフォーム管理画面のテナント詳細から「メンバー追加」で新しい管理者を追加できます。ロールは「オーナー」「管理者」「エディター」「ビューアー」の4段階です。追加されたスタッフには招待メールが届き、パスワード設定後にログインできます。",
      },
      {
        question: "パスワードを忘れた場合は？",
        answer:
          "ログイン画面の「パスワードをお忘れの方」リンクをクリックし、登録メールアドレスを入力してください。リセットリンクが記載されたメールが届きます（24時間有効）。新しいパスワードは8文字以上で、大文字・小文字・数字・記号をそれぞれ1文字以上含む必要があります。",
      },
      {
        question: "パスワードの有効期限について",
        answer:
          "セキュリティのため、パスワードは90日ごとに変更が必要です。期限切れの場合、ログイン時にパスワード変更画面に自動リダイレクトされます。また、直近5回以内に使用したパスワードは再利用できません。",
      },
    ],
  },
  {
    id: "friends",
    icon: "👥",
    title: "LINE友だち管理",
    description: "友だち一覧・タグ・マーク・カスタムフィールドの使い方",
    gradient: "from-green-500 to-emerald-600",
    iconBg: "bg-green-100 text-green-600",
    faqs: [
      {
        question: "友だち一覧の見方は？",
        answer:
          "サイドメニュー「LINE機能」→「友だち一覧」を開きます。友だちの名前・タグ・マーク・最終メッセージ日時が一覧表示されます。上部の検索バーで名前・電話番号・患者IDで検索でき、タグやマークでのフィルタリングも可能です。表示列は「列設定」ボタンからカスタマイズできます。",
      },
      {
        question: "友だちにタグを付けるには？",
        answer:
          "友だち一覧で対象の友だちをクリックして詳細を開き、「タグ」セクションから追加します。複数の友だちに一括でタグを付けたい場合は、友だち一覧でチェックボックスで選択し、上部の「一括操作」→「タグ追加」を選択してください。タグ自体の作成・編集は「タグ管理」画面から行えます。",
      },
      {
        question: "マークとタグの違いは？",
        answer:
          "タグは分類用のラベルで、配信対象の絞り込みやセグメントに使います（例：「初診」「再診」「VIP」）。マークは視覚的な目印で、色付きアイコンとして友だち一覧に表示されます（例：赤=要対応、青=対応中）。どちらも友だちに複数設定可能です。",
      },
      {
        question: "カスタムフィールドとは？",
        answer:
          "友だちに任意の情報を追加できるフィールドです。「友だち一覧」→「カスタムフィールド設定」で項目を作成します（例：「アレルギー」「来院目的」）。友だち詳細画面で値を入力でき、一覧でフィルタ条件としても使えます。",
      },
      {
        question: "ブロックされた友だちの確認方法は？",
        answer:
          "友だち一覧で「ブロック」フィルタを使うと、ブロック中の友だちが表示されます。ブロックされた友だちにはメッセージを送信できません。ブロック解除は友だち側の操作が必要です。解除されると自動的にブロック表示が消えます。",
      },
      {
        question: "重複した友だち（患者）を統合するには？",
        answer:
          "「患者名寄せ」画面で重複候補が自動検出されます。名前・電話番号の類似度スコアが表示されるので、確認の上「統合」ボタンで1つの患者レコードにまとめられます。手動統合は「患者情報変更・統合」画面から患者IDを指定して行えます。統合後も全ての履歴（問診・予約・注文・メッセージ）が引き継がれます。",
      },
    ],
  },
  {
    id: "talk",
    icon: "💬",
    title: "トーク・メッセージ",
    description: "個別チャット・テンプレート・送信履歴",
    gradient: "from-purple-500 to-violet-600",
    iconBg: "bg-purple-100 text-purple-600",
    faqs: [
      {
        question: "友だちとの個別トークの方法は？",
        answer:
          "「LINE機能」→「トーク」を開くと、友だちごとのチャット画面が表示されます。左側の友だちリストから対象を選択し、右側の入力欄からメッセージを送信します。テキスト・画像・テンプレートの送信が可能です。未読メッセージにはバッジが表示されます。",
      },
      {
        question: "テンプレートを使ってメッセージを送るには？",
        answer:
          "トーク画面のメッセージ入力欄の右にある「テンプレート」ボタンをクリックすると、登録済みテンプレートの一覧が表示されます。選択するとメッセージが挿入されるので、必要に応じて編集して送信してください。テンプレートの作成・編集は「テンプレート管理」画面から行えます。",
      },
      {
        question: "メッセージ送信履歴の確認方法は？",
        answer:
          "「LINE機能」→「送信履歴」で全メッセージのログを確認できます。送信方向（受信/送信）、メッセージタイプ（テキスト/画像/Flex等）でフィルタ可能です。送信エラーが発生した場合もここで確認できます。",
      },
      {
        question: "画像を送信するには？",
        answer:
          "トーク画面で画像アイコンをクリックし、画像をアップロードして送信します。メディアライブラリに登録済みの画像を選択することも可能です。画像はJPEG/PNG形式に対応しています。",
      },
    ],
  },
  {
    id: "broadcast",
    icon: "📡",
    title: "一斉配信・自動配信",
    description: "ブロードキャスト・ステップ配信・リマインダー",
    gradient: "from-orange-500 to-amber-600",
    iconBg: "bg-orange-100 text-orange-600",
    faqs: [
      {
        question: "一斉配信の方法は？",
        answer:
          "「LINE機能」→「配信」→「新規作成」で配信メッセージを作成します。テキスト・画像・Flexメッセージに対応しています。配信対象はタグやセグメント（VIP・アクティブ・休眠等）で絞り込み可能です。即時配信のほか、日時を指定した予約配信もできます。",
      },
      {
        question: "配信結果の確認方法は？",
        answer:
          "「配信履歴」画面で各配信の送信数・成功率・開封数を確認できます。配信ごとの詳細レポートではメッセージごとのクリック数も表示されます。",
      },
      {
        question: "ステップ配信（シナリオ配信）の設定は？",
        answer:
          "「ステップシナリオ」画面で新規シナリオを作成します。まずトリガー条件を設定します（友だち追加時、特定タグ付与時、キーワード受信時等）。次にステップを追加し、各ステップの「待機時間」と「配信メッセージ」を設定します。例：友だち追加→1日後に挨拶→3日後にクーポン→7日後に来院促進、のように自動配信を組み立てられます。",
      },
      {
        question: "キーワード応答の設定は？",
        answer:
          "「キーワード応答」画面から設定します。キーワード（完全一致/部分一致を選択）、応答メッセージ（テキスト/テンプレート/アクション）を登録します。例：「予約」と送られたら予約ページのURLを返す、「営業時間」と送られたら診療時間を返す、などの自動応答が設定できます。",
      },
      {
        question: "リマインダー（予約リマインド）の設定は？",
        answer:
          "「リマインダー設定」で予約前のリマインドルールを作成します。「予約日の〇日前 / 〇時間前に送信」のように条件を設定し、送信するメッセージテンプレートを選択します。複数ルールの設定が可能で、例えば「3日前にリマインド」「当日朝にリマインド」のように重ねられます。",
      },
      {
        question: "フォローアップルールとは？",
        answer:
          "来院後や処方後に自動でフォローメッセージを送る機能です。「フォローアップルール」画面でトリガー（初回来院後、再処方承認後等）と配信タイミング（◯日後）を設定します。患者の状況に合わせた自動フォローで離脱防止に活用できます。",
      },
      {
        question: "ABテストの方法は？",
        answer:
          "「ABテスト」画面から2つのメッセージパターンを作成し、配信対象を自動でランダム分割して送信できます。結果画面で各パターンの開封率・クリック率を比較し、効果の高いメッセージを特定できます。",
      },
    ],
  },
  {
    id: "richmenu",
    icon: "🎨",
    title: "リッチメニュー・クーポン・NPS",
    description: "リッチメニュー作成・クーポン配布・満足度調査",
    gradient: "from-pink-500 to-rose-600",
    iconBg: "bg-pink-100 text-pink-600",
    faqs: [
      {
        question: "リッチメニューの作成方法は？",
        answer:
          "「リッチメニュー」画面で「新規作成」をクリックします。メニュー画像をアップロードし、各エリアにアクション（URL遷移、テキスト送信、リッチメニュー切替等）を設定します。複数のリッチメニューを作成し、デフォルトメニューを設定できます。",
      },
      {
        question: "友だちごとにリッチメニューを切り替えるには？",
        answer:
          "「メニュールール」画面で、タグ条件に基づくリッチメニューの自動切り替えルールを設定します。例：「初診」タグ→初診用メニュー、「会員」タグ→会員用メニュー、のように友だちの属性に応じて自動で切り替えられます。",
      },
      {
        question: "クーポンの作成・配布方法は？",
        answer:
          "「クーポン管理」画面で「新規作成」からクーポンを作成します。クーポン名・割引内容・有効期限・使用回数制限を設定します。作成したクーポンは一斉配信やステップ配信で配布でき、利用状況（配布数・使用数・使用率）は同画面で追跡できます。",
      },
      {
        question: "NPS調査（満足度アンケート）の方法は？",
        answer:
          "「NPS調査」画面で「新規作成」からアンケートを作成します。0-10のスコア質問と自由記述を設定し、友だちに配信します。回答結果はNPSスコア（推奨者-批判者の割合）として自動集計され、月別推移グラフで変化を追跡できます。",
      },
    ],
  },
  {
    id: "reservations",
    icon: "📅",
    title: "予約管理",
    description: "診療スケジュール・予約受付・リマインド",
    gradient: "from-cyan-500 to-teal-600",
    iconBg: "bg-cyan-100 text-cyan-600",
    faqs: [
      {
        question: "診療スケジュールの設定方法は？",
        answer:
          "「スケジュール管理」→「予約スロット設定」で曜日ごとの診療時間枠を設定します。各枠の開始時間・終了時間・1枠あたりの予約可能人数を指定できます。医師が複数いる場合は医師ごとにスケジュールを設定できます。",
      },
      {
        question: "休診日・臨時休診の設定は？",
        answer:
          "「スケジュール管理」→「休診日設定」から特定の日付を休診に設定できます。祝日や臨時休診に使用します。休診日に設定すると、その日の予約枠は自動的に閉鎖されます。",
      },
      {
        question: "翌月の予約受付はいつ始まりますか？",
        answer:
          "デフォルトでは毎月5日に翌月の予約枠が自動開放されます。管理者が「予約管理」画面から手動で早期開放することも可能です。開放タイミングは設定で変更できます。",
      },
      {
        question: "予約のキャンセル・変更方法は？",
        answer:
          "「予約リスト」画面で該当の予約をクリックし、「キャンセル」または「日時変更」を選択します。患者側からもマイページで操作可能です。キャンセルされた予約枠は自動で空き枠に戻ります。",
      },
      {
        question: "予約リマインドの送信方法は？",
        answer:
          "「予約リスト」画面で日付を選択し、「リマインド送信」ボタンでその日の予約者全員にLINEリマインドを送信できます。自動リマインドは「リマインダー設定」で事前に設定しておけば、指定日時に自動送信されます。",
      },
      {
        question: "患者の予約フローは？",
        answer:
          "患者はLINEから問診記入→予約の順で手続きします（問診が予約より先です）。問診完了後にマイページから空き枠を選んで予約できます。予約完了時にLINE通知が自動送信され、リッチメニューも予約済み用に自動切替されます。",
      },
    ],
  },
  {
    id: "karte",
    icon: "📋",
    title: "カルテ・診察",
    description: "簡易カルテ・SOAP入力・音声入力・テンプレート",
    gradient: "from-emerald-500 to-green-600",
    iconBg: "bg-emerald-100 text-emerald-600",
    faqs: [
      {
        question: "簡易カルテとカルテの違いは？",
        answer:
          "「簡易Drカルテ」は医師の診察時に素早くメモを取るための簡略画面で、音声入力にも対応しています。「カルテ」はSOAP構造化入力・写真管理・テンプレート・検索機能を備えた詳細カルテです。日常の診察は簡易カルテ、詳細な記録にはカルテ画面をお使いください。",
      },
      {
        question: "カルテの音声入力の使い方は？",
        answer:
          "簡易Drカルテ画面でマイクボタンをクリックすると音声入力が開始されます。口述した内容がリアルタイムでテキスト変換されます。変換結果は手動で修正・編集できます。音声入力の辞書設定は「設定」→「音声入力設定」で専門用語を追加登録できます。",
      },
      {
        question: "カルテテンプレートの作成・利用方法は？",
        answer:
          "「設定」→「カルテテンプレート」で、SOAP項目ごとのテンプレートを作成できます。よく使う定型文を登録しておけば、カルテ記入時にワンクリックで挿入できます。例：「副作用なし、経過良好。継続処方。」のような定型文を登録しておくと便利です。",
      },
      {
        question: "過去のカルテを検索するには？",
        answer:
          "「カルテ検索」画面から患者名・日付範囲・キーワードでカルテを横断検索できます。特定の処方内容や症状を含むカルテを素早く見つけられます。",
      },
      {
        question: "再処方カルテはどこで確認できますか？",
        answer:
          "再処方承認時のカルテは、患者の来院履歴画面に「再処方希望」として表示されます。初回問診のカルテと再処方カルテが時系列で統合表示されるので、処方の変遷を一覧で確認できます。",
      },
    ],
  },
  {
    id: "reorders",
    icon: "🔄",
    title: "再処方",
    description: "再処方申請・承認/却下・用量変更",
    gradient: "from-indigo-500 to-blue-600",
    iconBg: "bg-indigo-100 text-indigo-600",
    faqs: [
      {
        question: "再処方申請の承認・却下方法は？",
        answer:
          "「再処方リスト」画面に申請中の再処方が一覧表示されます。各申請をクリックすると、前回の処方内容・用量比較・患者情報が表示されます。内容を確認し「承認」または「却下」ボタンで処理します。承認時は自動でカルテが生成され、患者にLINE通知が送信されます。",
      },
      {
        question: "用量が変更された場合のカルテ記載は？",
        answer:
          "再処方承認時に用量変更がある場合、カルテに自動で理由が記載されます。増量の場合は「副作用がなく、効果を感じづらくなり増量処方」、減量の場合は「副作用がなく、効果も十分にあったため減量処方」、同量の場合は「副作用がなく、継続使用のため処方」と記録されます。",
      },
      {
        question: "再処方の決済はどう処理されますか？",
        answer:
          "再処方が承認されると、患者のマイページに決済リンクが表示されます（LINE通知でも案内されます）。患者がカード決済または銀行振込で支払い完了後、発送フローに進みます。",
      },
    ],
  },
  {
    id: "payment-shipping",
    icon: "💳",
    title: "決済・発送・在庫",
    description: "カード決済・銀行振込・返金・発送・追跡番号",
    gradient: "from-yellow-500 to-orange-600",
    iconBg: "bg-yellow-100 text-yellow-700",
    faqs: [
      {
        question: "カード決済の確認方法は？",
        answer:
          "「カード決済」画面でSquare経由の決済オーダーを確認できます。決済ステータス（成功/失敗/保留）、金額、患者名が一覧表示されます。決済マスター画面ではSquare・銀行振込・GMOの全決済を統合して確認できます。",
      },
      {
        question: "銀行振込の入金確認方法は？",
        answer:
          "「銀行振込照合」画面で銀行の入金CSV（全銀形式）をアップロードすると、オーダーとの自動照合が行われます。マッチしたオーダーはプレビュー表示され、確認後に一括で入金確認処理できます。手動照合も「銀行振込管理」画面から個別に行えます。",
      },
      {
        question: "返金処理の方法は？",
        answer:
          "「返金一覧」画面で返金処理を行います。Square決済の場合はAPI経由で自動返金されます。銀行振込の場合は手動振込が必要で、返金ステータスを「完了」に更新してください。",
      },
      {
        question: "発送の手順は？",
        answer:
          "「本日発送予定」画面で発送待ちオーダーを確認 → 梱包・出荷処理 → 「追跡番号付与」画面でヤマトB2等の追跡番号CSVを登録 → 「発送通知送信」ボタンで患者にLINE通知を一斉送信。追跡番号は患者のマイページにも自動反映されます。",
      },
      {
        question: "在庫管理の使い方は？",
        answer:
          "「在庫」画面で商品ごとの現在庫数を確認・更新できます。入出荷の記録はジャーナルに自動記録されます。発送処理時に在庫が自動で減算されます。在庫切れの場合はアラートが表示されます。",
      },
    ],
  },
  {
    id: "intake",
    icon: "📝",
    title: "問診",
    description: "問診フォーム設計・回答確認・患者フロー",
    gradient: "from-teal-500 to-cyan-600",
    iconBg: "bg-teal-100 text-teal-600",
    faqs: [
      {
        question: "問診フォームのカスタマイズ方法は？",
        answer:
          "「問診設定」画面のフォームビルダーで質問項目を追加・編集・並び替えできます。テキスト入力・選択肢・チェックボックス・画像アップロードなど多様な質問タイプに対応しています。条件分岐（前の回答に応じて次の質問を変える）も設定可能です。",
      },
      {
        question: "患者の問診フローは？",
        answer:
          "患者はLINE友だち追加→個人情報登録→電話番号認証→問診記入→予約の順で手続きします。問診の記入はマイページから行い、完了すると予約が可能になります。管理画面では問診回答を患者詳細画面やカルテ画面で確認できます。",
      },
      {
        question: "問診回答の確認・フォーム回答の確認方法は？",
        answer:
          "問診回答はカルテ画面や患者詳細画面で確認できます。LINEフォーム（アンケート等）の回答は「フォーム管理」→対象フォーム→「回答一覧」で確認でき、CSV出力も可能です。",
      },
    ],
  },
  {
    id: "reports",
    icon: "📊",
    title: "分析・レポート",
    description: "KPI・売上分析・セグメント・CSV出力",
    gradient: "from-violet-500 to-purple-600",
    iconBg: "bg-violet-100 text-violet-600",
    faqs: [
      {
        question: "ダッシュボードで確認できる指標は？",
        answer:
          "ダッシュボードでは予約数・配送数・売上・リピート率のKPI、診療後決済率・問診後予約率・予約後受診率のコンバージョンKPI、LINE登録数・アクティブ予約・本日決済・顧客単価の当日KPI、日別売上推移グラフ、セグメント分布が表示されます。各ウィジェットの表示/非表示・並び順はカスタマイズ可能です。",
      },
      {
        question: "売上の詳細分析は？",
        answer:
          "「売上管理」画面で日別・月別の売上推移、商品別売上ランキング、LTV（顧客生涯価値）分析、コホート分析を確認できます。期間を指定してフィルタリングでき、CSVエクスポートも可能です。",
      },
      {
        question: "LINE配信の効果分析は？",
        answer:
          "「LINE分析」画面で配信の成功率・ブロック率推移・ブロードキャストごとのパフォーマンスを確認できます。「クリック分析」画面では追跡リンクを作成してメッセージ内のURL別クリック数を計測できます。",
      },
      {
        question: "セグメント分析（RFM）とは？",
        answer:
          "「セグメント」画面でRFM分析（最終購入日・購入頻度・購入金額）に基づく自動セグメント分類が確認できます。VIP・アクティブ・離脱リスク・休眠・新規の5段階に自動分類され、セグメントごとの人数推移やターゲティング配信に活用できます。",
      },
      {
        question: "CSVエクスポートの方法は？",
        answer:
          "各管理画面のエクスポートボタンから対象データをCSV形式でダウンロードできます。「売上管理」画面からは期間指定の売上CSV、「友だち一覧」からは友だちデータCSV、「フォーム回答」からは回答CSVを出力できます。全テナントデータの一括エクスポートは設定画面の「全データエクスポート」から実行できます。",
      },
    ],
  },
  {
    id: "ai",
    icon: "🤖",
    title: "AI機能",
    description: "AI自動返信・音声入力・効果測定",
    gradient: "from-fuchsia-500 to-pink-600",
    iconBg: "bg-fuchsia-100 text-fuchsia-600",
    faqs: [
      {
        question: "AI自動返信の設定方法は？",
        answer:
          "「AI返信設定」画面でAI自動返信のON/OFFを切り替えます。知識ベース（クリニック情報、よくある質問への回答パターン）を登録すると、AIがその情報を基に自動返信します。承認ルールを「自動送信」にすると即時返信、「手動承認」にすると送信前にスタッフが確認・編集できます。",
      },
      {
        question: "AI返信の統計・効果の確認方法は？",
        answer:
          "「AI返信統計」画面でAIの使用回数・自動送信率・承認率・学習効果の推移を確認できます。AIが適切に回答できなかったケースを分析し、知識ベースの改善に活用してください。",
      },
      {
        question: "音声入力はどこで使えますか？",
        answer:
          "音声入力は「簡易Drカルテ」画面で利用できます。マイクボタンをクリックして口述すると、リアルタイムでテキスト変換されます。医療用語の認識精度を上げるために「設定」→「音声入力設定」で専門用語辞書をカスタマイズできます。",
      },
    ],
  },
  {
    id: "security",
    icon: "🔒",
    title: "セキュリティ・アカウント",
    description: "権限管理・監査ログ・セッション・データ保護",
    gradient: "from-slate-600 to-gray-700",
    iconBg: "bg-slate-100 text-slate-600",
    faqs: [
      {
        question: "管理者の権限レベルは？",
        answer:
          "4段階の権限があります。「オーナー」は全機能にアクセス可能、「管理者」はメンバー管理以外の全機能、「エディター」は設定・メンバー管理以外の閲覧と編集、「ビューアー」は閲覧のみ可能です。権限はプラットフォーム管理画面のメンバー設定で変更できます。",
      },
      {
        question: "操作ログ（監査ログ）の確認方法は？",
        answer:
          "管理画面での全操作は監査ログに自動記録されます。誰が・いつ・何をしたかをプラットフォーム管理画面の監査ログ画面で確認できます。ログは3年間保存後に自動アーカイブされ、5年経過後に自動削除されます。",
      },
      {
        question: "同時ログインの制限は？",
        answer:
          "1つの管理者アカウントで同時にログインできるのは最大3セッションまでです。4つ目のデバイスでログインすると、最も古いセッションが自動的にログアウトされます。",
      },
      {
        question: "データのエクスポート・バックアップ方法は？",
        answer:
          "全テナントデータの一括エクスポートが可能です。設定画面の「全データエクスポート」から実行すると、患者・問診・予約・注文・再処方・メッセージログ・タグのCSVが一括生成されます。処理完了後にダウンロード可能です。定期的なエクスポートをお勧めします。",
      },
    ],
  },
  {
    id: "troubleshooting",
    icon: "🛠",
    title: "よくあるトラブル",
    description: "メッセージ不達・決済エラー・表示不具合の解決策",
    gradient: "from-red-500 to-rose-600",
    iconBg: "bg-red-100 text-red-600",
    faqs: [
      {
        question: "LINEメッセージが届かない場合は？",
        answer:
          "「設定」→「LINE」でWebhook URLが正しく設定されているか確認 → LINE Developersコンソールで「Webhook送信」がONか確認 → チャネルアクセストークンの有効期限を確認 → 相手にブロックされていないか友だち一覧で確認。以上で解決しない場合はサポートへお問い合わせください。",
      },
      {
        question: "患者がマイページにアクセスできない場合は？",
        answer:
          "患者のLINE連携が完了しているか確認（友だち一覧に表示されているか） → 個人情報登録と電話番号認証が完了しているか確認 → 「マイページ確認」画面で患者ID指定でプレビュー表示し、表示状態を確認できます。",
      },
      {
        question: "予約が取れない（枠が表示されない）場合は？",
        answer:
          "「スケジュール管理」で該当日のスロットが設定されているか確認 → 休診日設定で該当日がブロックされていないか確認 → 翌月の予約が開放されているか確認（毎月5日に自動開放、または手動で早期開放） → 各枠の定員が満員でないか確認。",
      },
      {
        question: "決済エラーが発生した場合は？",
        answer:
          "Square決済エラーの場合は、Squareダッシュボードで詳細エラーを確認してください。よくある原因：カード有効期限切れ、利用限度額超過、不正利用検知。返金一覧で返金ステータスを確認し、必要に応じて手動対応してください。",
      },
      {
        question: "ダッシュボードのデータが更新されない場合は？",
        answer:
          "ダッシュボードはリアルタイム更新（SSE）に対応していますが、ブラウザのタブを長時間放置すると接続が切れることがあります。ページをリロードするか、ブラウザのキャッシュをクリアしてください。",
      },
      {
        question: "CSVファイルが文字化けする場合は？",
        answer:
          "エクスポートされるCSVはBOM付きUTF-8形式です。Excel 2016以降であれば正常に開けます。古いExcelの場合は、「データ」→「テキストから」で文字コード「UTF-8」を指定してインポートしてください。Google スプレッドシートにアップロードする方法でも正常に表示されます。",
      },
    ],
  },
];

// ── アニメーション付きアコーディオン（CSS Grid方式） ──
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

  // 検索ヒット時のハイライト
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
          isOpen
            ? "bg-white"
            : "bg-white/60 hover:bg-white"
        }`}
      >
        {/* 質問番号バッジ */}
        <span
          className={`flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mt-0.5 transition-colors duration-200 ${
            isOpen
              ? "bg-blue-600 text-white"
              : "bg-slate-200 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600"
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
          <div className="ml-9 pl-4 border-l-2 border-blue-200">
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
      {/* カテゴリヘッダー */}
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-4 px-6 py-5 text-left transition-all duration-300 ${
          isOpen
            ? `bg-gradient-to-r ${category.gradient} text-white`
            : "bg-white hover:bg-slate-50/80"
        }`}
      >
        {/* アイコン */}
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

        {/* 矢印アイコン */}
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

      {/* FAQ リスト */}
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
export default function HelpPage() {
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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
      {/* アニメーション用CSS */}
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

      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          {/* ── ヘッダー ── */}
          <div className="text-center mb-10 animate-fadeIn">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-2xl mb-5 shadow-lg shadow-blue-500/25">
              📖
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              ヘルプセンター
            </h1>
            <p className="text-slate-500 text-sm sm:text-base mt-2 max-w-md mx-auto leading-relaxed">
              Lオペ for CLINIC の操作ガイド・よくある質問を
              <br className="hidden sm:block" />
              カテゴリ別にまとめています
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              {CATEGORIES.length}カテゴリ / 全{totalFaqs}件のFAQ
            </div>
          </div>

          {/* ── 検索バー ── */}
          <div className="mb-8 animate-slideDown" style={{ animationDelay: "100ms" }}>
            <div className="relative max-w-2xl mx-auto">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg
                  className="w-5 h-5 text-slate-400"
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
              </div>
              <input
                type="text"
                placeholder="キーワードで質問を検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all duration-200 placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="text-center text-xs text-slate-500 mt-2 animate-fadeIn">
                「{searchQuery}」の検索結果：
                <span className="font-semibold text-blue-600 ml-1">
                  {filteredFaqCount}件
                </span>
              </p>
            )}
          </div>

          {/* ── カテゴリリスト ── */}
          <div className="space-y-4">
            {filteredCategories.map((category, idx) => (
              <div
                key={category.id}
                className="animate-slideDown"
                style={{ animationDelay: `${150 + idx * 50}ms` }}
              >
                <CategoryAccordion
                  category={category}
                  isOpen={searchQuery ? true : openCategory === category.id}
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

          {/* 検索結果なし */}
          {filteredCategories.length === 0 && (
            <div className="text-center py-16 animate-fadeIn">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 text-slate-400 text-2xl mb-4">
                🔍
              </div>
              <p className="text-slate-600 font-medium">
                「{searchQuery}」に一致する質問が見つかりませんでした
              </p>
              <p className="text-sm text-slate-400 mt-1">
                別のキーワードで検索してみてください
              </p>
              <button
                onClick={() => setSearchQuery("")}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                検索をクリア
              </button>
            </div>
          )}

          {/* ── サポートカード ── */}
          <div
            className="mt-12 animate-slideDown"
            style={{ animationDelay: `${150 + filteredCategories.length * 50 + 100}ms` }}
          >
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-8 text-white shadow-xl shadow-blue-600/20">
              {/* 装飾パターン */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

              <div className="relative">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center text-xl">
                    💡
                  </div>
                  <div>
                    <h2 className="text-lg font-bold mb-1.5">
                      お探しの回答が見つかりませんか？
                    </h2>
                    <p className="text-sm text-white/80 leading-relaxed max-w-lg">
                      FAQで解決しない場合は、管理画面右下のチャットサポートからお気軽にお問い合わせください。
                      平日 10:00〜18:00 で専任スタッフが対応いたします。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
