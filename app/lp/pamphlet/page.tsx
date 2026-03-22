"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";

/* ═══════════════════════════════════════════════════════════════════════════
   Lオペ for CLINIC — 機能パンフレット（15-20ページ PDF対応）
   パスワード保護 + 印刷/PDF最適化（A4縦）
   ═══════════════════════════════════════════════════════════════════════════ */

/* ═══════════════════ パスワードゲート ═══════════════════ */

function PasswordGate({ onVerified }: { onVerified: () => void }) {
  const searchParams = useSearchParams();
  const [code, setCode] = useState(searchParams.get("code") || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoChecked, setAutoChecked] = useState(false);

  const verify = async (c: string) => {
    if (!c.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/lp/pamphlet-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: c.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        onVerified();
      } else {
        setError(data.message || "無効なコードです");
      }
    } catch {
      setError("通信エラーが発生しました");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!autoChecked && searchParams.get("code")) {
      setAutoChecked(true);
      verify(searchParams.get("code")!);
    }
  }, [autoChecked, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl shadow-blue-100/30">
        <div className="text-center">
          <Image src="/images/l-ope-logo.png" alt="Lオペ" width={64} height={64} className="mx-auto mb-4" />
          <h1 className="text-lg font-bold text-gray-900">Lオペ for CLINIC</h1>
          <p className="mt-1 text-sm text-gray-500">機能パンフレット</p>
        </div>
        <div className="mt-8">
          <label className="mb-2 block text-xs font-medium text-gray-600">アクセスコード</label>
          <input
            type="text"
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && verify(code)}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center font-mono text-lg tracking-widest focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="XXXX-XXXX"
            autoFocus
          />
          {error && <p className="mt-2 text-center text-xs text-red-500">{error}</p>}
          <button
            onClick={() => verify(code)}
            disabled={loading || !code.trim()}
            className="mt-4 w-full rounded-lg bg-blue-600 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "確認中..." : "パンフレットを表示"}
          </button>
        </div>
        <p className="mt-6 text-center text-xs text-gray-400">コードは担当者よりお送りしております</p>
      </div>
    </div>
  );
}

/* ═══════════════════ 共通コンポーネント ═══════════════════ */

function PageBreak() {
  return <div className="print:break-after-page" />;
}

function SectionPage({ label, title, subtitle, children }: {
  label: string; title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <section className="px-12 py-14 print:py-10 print:break-inside-avoid">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">{label}</p>
        <h2 className="mt-2 text-2xl font-black text-gray-900">{title}</h2>
        {subtitle && <p className="mt-2 text-sm leading-relaxed text-gray-500">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

/** CSSモックアップ — 管理画面風のUI表現 */
function MockUI({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg shadow-gray-100/50">
      {/* ウィンドウバー */}
      <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2.5">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
          <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
        </div>
        {title && <span className="ml-2 text-[10px] text-gray-400">{title}</span>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function FeatureCard({ name, desc, accent }: { name: string; desc: string; accent: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-4 print:break-inside-avoid">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
        <div>
          <h4 className="text-[13px] font-bold text-gray-800">{name}</h4>
          <p className="mt-1 text-[11px] leading-relaxed text-gray-500">{desc}</p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════ パンフレット本体 ═══════════════════ */

function PamphletContent() {
  return (
    <>
      {/* 印刷ボタン */}
      <div className="fixed right-6 top-6 z-50 print:hidden">
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg hover:bg-blue-700"
        >
          PDF / 印刷
        </button>
      </div>

      <div className="pamphlet-wrapper mx-auto max-w-[210mm] bg-white">

        {/* ═══════════════════════════════════════════
            PAGE 1: 表紙
            ═══════════════════════════════════════════ */}
        <section className="flex min-h-screen flex-col items-center justify-center px-12 py-20 text-center print:min-h-0 print:py-[60mm]">
          <Image src="/images/l-ope-logo.png" alt="Lオペ" width={100} height={100} className="mb-8" />
          <h1 className="text-4xl font-black tracking-tight text-gray-900">
            Lオペ <span className="text-blue-600">for CLINIC</span>
          </h1>
          <p className="mt-4 text-lg font-medium text-gray-500">
            クリニック特化 LINE運用プラットフォーム
          </p>
          <p className="mt-2 text-sm text-gray-400">サービス資料</p>

          <div className="mt-12 inline-flex items-center gap-4 rounded-2xl border border-blue-100 bg-blue-50/50 px-8 py-5">
            <div className="text-center">
              <div className="text-3xl font-black text-blue-600">9</div>
              <div className="text-[10px] font-medium text-gray-500">カテゴリ</div>
            </div>
            <div className="h-8 w-px bg-blue-200" />
            <div className="text-center">
              <div className="text-3xl font-black text-blue-600">50+</div>
              <div className="text-[10px] font-medium text-gray-500">機能</div>
            </div>
            <div className="h-8 w-px bg-blue-200" />
            <div className="text-center">
              <div className="text-3xl font-black text-blue-600">All-in-One</div>
              <div className="text-[10px] font-medium text-gray-500">オールインワン</div>
            </div>
          </div>

          <p className="mx-auto mt-10 max-w-lg text-sm leading-[1.9] text-gray-400">
            患者CRM・予約管理・メッセージ配信・AI自動返信・決済・配送・分析まで、
            LINE公式アカウント1つでクリニック業務をまるごとDX化。
            スタッフの手作業を大幅に削減し、患者体験と経営効率を同時に向上させます。
          </p>
        </section>

        <PageBreak />

        {/* ═══════════════════════════════════════════
            PAGE 2: Lオペとは / 3つの価値
            ═══════════════════════════════════════════ */}
        <SectionPage label="ABOUT" title="Lオペとは" subtitle="LINE公式アカウントを活用したクリニック専用の業務DXプラットフォームです。患者が日常的に使うLINEを接点にすることで、予約から決済・フォローアップまでをシームレスに繋ぎます。">
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { icon: "⚡", color: "bg-amber-50 border-amber-200", title: "業務効率化", points: ["予約・問診・配信・決済を自動化", "スタッフの手作業を最大80%削減", "24時間AI自動対応で負担軽減"] },
              { icon: "💬", color: "bg-blue-50 border-blue-200", title: "患者体験の向上", points: ["LINEで問診・予約・決済が完結", "リマインドで無断キャンセル防止", "パーソナライズされたフォロー"] },
              { icon: "📈", color: "bg-green-50 border-green-200", title: "経営の可視化", points: ["売上・LTV・NPSをリアルタイム表示", "配信効果・流入経路を自動分析", "データドリブンな意思決定を支援"] },
            ].map((v) => (
              <div key={v.title} className={`rounded-xl border ${v.color} p-6`}>
                <div className="text-3xl">{v.icon}</div>
                <h3 className="mt-3 text-sm font-bold text-gray-900">{v.title}</h3>
                <ul className="mt-3 space-y-2">
                  {v.points.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-xs text-gray-600">
                      <span className="mt-0.5 text-blue-500">•</span>{p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* 導入実績的な数字 */}
          <div className="mt-10 grid grid-cols-4 gap-4 rounded-xl bg-gray-900 p-6 text-center text-white">
            {[
              { num: "50+", label: "搭載機能数" },
              { num: "14", label: "外部サービス連携" },
              { num: "2週間", label: "最短導入期間" },
              { num: "0円", label: "スタッフ研修費" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-xl font-black text-blue-400">{s.num}</div>
                <div className="mt-1 text-[10px] text-gray-400">{s.label}</div>
              </div>
            ))}
          </div>
        </SectionPage>

        <PageBreak />

        {/* ═══════════════════════════════════════════
            PAGE 3: 患者フロー全体像
            ═══════════════════════════════════════════ */}
        <SectionPage label="PATIENT FLOW" title="患者フローの全体像" subtitle="友だち追加からフォローアップまで、すべてのステップがLINE上で完結。患者は別アプリのインストール不要。">
          <div className="space-y-4">
            {[
              { step: "01", title: "友だち追加", desc: "QRコード・広告・店頭POPから友だち追加。UTMトラッキングで流入経路を自動計測。", color: "bg-blue-600" },
              { step: "02", title: "個人情報登録", desc: "LINE上で氏名・電話番号・生年月日を入力。SMS認証で本人確認を完了。", color: "bg-blue-500" },
              { step: "03", title: "問診記入", desc: "診療分野に応じた問診フォームを自動表示。条件分岐・NG判定（禁忌チェック）にも対応。", color: "bg-sky-500" },
              { step: "04", title: "予約", desc: "空き枠をリアルタイム表示。希望日時を選択するだけで予約完了。自動リマインドで無断キャンセルを防止。", color: "bg-cyan-500" },
              { step: "05", title: "診察", desc: "カルテ管理（SOAP対応）で診察内容を構造化記録。音声入力・AIカルテ自動生成にも対応。", color: "bg-teal-500" },
              { step: "06", title: "決済", desc: "Square/GMO連携でLINE上からオンライン決済。銀行振込の自動消込にも対応。", color: "bg-emerald-500" },
              { step: "07", title: "配送", desc: "ヤマトB2形式CSV出力・追跡番号管理・配送通知の自動送信まで一気通貫。", color: "bg-green-500" },
              { step: "08", title: "フォローアップ", desc: "診察後の経過確認・満足度調査・再診促進をステップ配信で自動化。再処方申請もLINEで完結。", color: "bg-lime-600" },
            ].map((s) => (
              <div key={s.step} className="flex items-start gap-4 print:break-inside-avoid">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.color} text-sm font-black text-white`}>
                  {s.step}
                </div>
                <div className="flex-1 border-b border-gray-100 pb-4">
                  <h3 className="text-sm font-bold text-gray-800">{s.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-gray-500">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionPage>

        <PageBreak />

        {/* ═══════════════════════════════════════════
            PAGE 4-5: 患者CRM
            ═══════════════════════════════════════════ */}
        <SectionPage label="FEATURE 01" title="患者CRM" subtitle="LINE友だちを「患者」として一元管理。タグ・マーク・カスタムフィールドで診療に必要な情報を整理し、セグメント配信の基盤を構築します。">
          {/* CRMモックUI */}
          <MockUI title="Lオペ — 友だち管理">
            <div className="flex gap-3">
              {/* サイドバー */}
              <div className="w-36 shrink-0 space-y-1">
                {["友だち一覧", "タグ管理", "マーク管理", "カスタムフィールド", "重複チェック"].map((m, i) => (
                  <div key={m} className={`rounded-lg px-3 py-2 text-[10px] ${i === 0 ? "bg-blue-50 font-bold text-blue-700" : "text-gray-500"}`}>{m}</div>
                ))}
              </div>
              {/* メインコンテンツ */}
              <div className="flex-1">
                <div className="mb-3 flex items-center gap-2">
                  <div className="rounded-lg border border-gray-200 px-3 py-1.5 text-[10px] text-gray-400">🔍 患者名・電話番号で検索...</div>
                  <div className="flex gap-1">
                    <span className="rounded bg-blue-100 px-2 py-0.5 text-[8px] text-blue-700">美容</span>
                    <span className="rounded bg-green-100 px-2 py-0.5 text-[8px] text-green-700">初診</span>
                    <span className="rounded bg-purple-100 px-2 py-0.5 text-[8px] text-purple-700">VIP</span>
                  </div>
                </div>
                {/* テーブル */}
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <div className="grid grid-cols-5 bg-gray-50 px-3 py-1.5 text-[9px] font-bold text-gray-500">
                    <span>氏名</span><span>電話番号</span><span>タグ</span><span>マーク</span><span>最終来院</span>
                  </div>
                  {[
                    { name: "田中 花子", tel: "090-****-1234", tags: ["美容", "VIP"], mark: "🟢 完了", date: "2026/03/15" },
                    { name: "山田 太郎", tel: "080-****-5678", tags: ["初診"], mark: "🟡 対応中", date: "2026/03/20" },
                    { name: "佐藤 美咲", tel: "070-****-9012", tags: ["美容", "リピート"], mark: "🔴 未対応", date: "2026/03/18" },
                  ].map((r) => (
                    <div key={r.name} className="grid grid-cols-5 items-center border-t border-gray-100 px-3 py-2 text-[9px] text-gray-600">
                      <span className="font-medium text-gray-800">{r.name}</span>
                      <span>{r.tel}</span>
                      <span className="flex gap-1">{r.tags.map((t) => <span key={t} className="rounded bg-blue-50 px-1 text-[7px] text-blue-600">{t}</span>)}</span>
                      <span>{r.mark}</span>
                      <span>{r.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </MockUI>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <FeatureCard accent="#2563eb" name="LINEトーク管理" desc="患者との1対1チャットを管理画面で一元管理。問診・処方歴・タグ情報を確認しながらリアルタイムで対応。" />
            <FeatureCard accent="#2563eb" name="タグ管理" desc="10色のカラー付きタグで患者を自由に分類。友だち追加時の自動タグ付けにも対応。" />
            <FeatureCard accent="#2563eb" name="対応マーク" desc="「未対応」「対応中」「完了」など、患者ごとの対応状況を色付きマークで可視化。" />
            <FeatureCard accent="#2563eb" name="カスタムフィールド" desc="「前回処方薬」「アレルギー」など、クリニック独自の管理項目を自由に定義。" />
            <FeatureCard accent="#2563eb" name="患者重複排除・統合" desc="重複患者を自動検出し、ワンクリックでマージ。名前・電話番号の類似度スコアリング。" />
          </div>
        </SectionPage>

        <PageBreak />

        {/* ═══════════════════════════════════════════
            PAGE 6-7: メッセージ配信
            ═══════════════════════════════════════════ */}
        <SectionPage label="FEATURE 02" title="メッセージ配信" subtitle="セグメント配信・ステップシナリオ・A/Bテストなど、患者一人ひとりに最適なメッセージを最適なタイミングで届けます。">
          <MockUI title="Lオペ — セグメント配信">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-gray-600">配信対象:</span>
                <div className="flex gap-1">
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] text-blue-700">タグ: 美容</span>
                  <span className="text-[9px] text-gray-400">AND</span>
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-[9px] text-green-700">最終来院: 30日以上前</span>
                </div>
                <span className="ml-auto rounded bg-blue-600 px-3 py-1 text-[9px] font-bold text-white">128名に配信</span>
              </div>
              {/* メッセージプレビュー */}
              <div className="flex gap-4">
                <div className="flex-1 rounded-lg border border-gray-200 p-3">
                  <div className="text-[9px] font-bold text-gray-500">メッセージ内容</div>
                  <div className="mt-2 rounded-lg bg-green-50 p-3 text-[10px] text-gray-700">
                    <div className="font-bold">🌸 春の美容キャンペーン</div>
                    <div className="mt-1 text-[9px] text-gray-500">{"{{name}}"}様、いつもご利用ありがとうございます。...</div>
                  </div>
                </div>
                <div className="w-32 rounded-lg border border-gray-200 p-3">
                  <div className="text-[9px] font-bold text-gray-500">配信予測</div>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-[9px]"><span className="text-gray-500">開封率</span><span className="font-bold text-blue-600">78%</span></div>
                    <div className="flex justify-between text-[9px]"><span className="text-gray-500">CV率</span><span className="font-bold text-green-600">12%</span></div>
                  </div>
                </div>
              </div>
            </div>
          </MockUI>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <FeatureCard accent="#059669" name="セグメント配信" desc="タグ・決済履歴・診察ステータスの組み合わせで精密ターゲティング。AND/OR・除外条件対応。" />
            <FeatureCard accent="#059669" name="ステップシナリオ" desc="友だち追加→問診→予約→フォローアップまでの流れを7種類のトリガーで自動化。" />
            <FeatureCard accent="#059669" name="テンプレート管理" desc="変数の自動挿入でパーソナライズされたメッセージをカテゴリ別に管理・即時送信。" />
            <FeatureCard accent="#059669" name="予約リマインド自動配信" desc="予約日前に自動でLINEリマインド。無断キャンセルを削減し来院率を向上。" />
            <FeatureCard accent="#059669" name="フォローアップ自動配信" desc="診察後に副作用確認・満足度調査・再診促進を自動配信。" />
            <FeatureCard accent="#059669" name="A/Bテスト" desc="複数バリアントの開封率・CV率を自動比較検証。データドリブンで配信最適化。" />
            <FeatureCard accent="#059669" name="キーワード自動返信" desc="部分一致・完全一致・正規表現に対応。テンプレート・アクション実行も設定可能。" />
            <FeatureCard accent="#059669" name="高度なセグメント条件" desc="最終決済日・商品購入履歴・診察ステータスで精密ターゲティング。" />
          </div>
        </SectionPage>

        <PageBreak />

        {/* ═══════════════════════════════════════════
            PAGE 8-9: ノーコード構築
            ═══════════════════════════════════════════ */}
        <SectionPage label="FEATURE 03" title="ノーコード構築" subtitle="リッチメニュー・Flexメッセージ・フォーム・チャットボットをGUI操作で構築。エンジニア不要で現場スタッフが運用可能。">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* リッチメニュービルダーモック */}
            <MockUI title="リッチメニュービルダー">
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-1">
                  {["予約する", "問診を開始", "マイページ", "クーポン", "よくある質問", "電話する"].map((b) => (
                    <div key={b} className="flex items-center justify-center rounded bg-gradient-to-b from-blue-500 to-blue-600 py-3 text-[8px] font-bold text-white">{b}</div>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-[8px] text-gray-400">
                  <span className="rounded border px-1.5 py-0.5">URL</span>
                  <span className="rounded border px-1.5 py-0.5">電話</span>
                  <span className="rounded border px-1.5 py-0.5">メッセージ</span>
                  <span className="rounded border px-1.5 py-0.5">タグ操作</span>
                  <span className="rounded border px-1.5 py-0.5">メニュー切替</span>
                </div>
              </div>
            </MockUI>

            {/* フォームビルダーモック */}
            <MockUI title="問診フォームビルダー">
              <div className="space-y-2">
                {[
                  { type: "テキスト", label: "お名前", req: true },
                  { type: "選択肢", label: "ご希望の施術", req: true },
                  { type: "テキストエリア", label: "アレルギー歴", req: false },
                ].map((f) => (
                  <div key={f.label} className="flex items-center gap-2 rounded border border-dashed border-gray-200 p-2">
                    <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[7px] font-bold text-purple-600">{f.type}</span>
                    <span className="flex-1 text-[9px] text-gray-600">{f.label}</span>
                    {f.req && <span className="text-[7px] text-red-400">必須</span>}
                    <span className="cursor-grab text-[9px] text-gray-300">⋮⋮</span>
                  </div>
                ))}
                <div className="rounded border-2 border-dashed border-gray-200 py-2 text-center text-[9px] text-gray-300">
                  ＋ 項目を追加
                </div>
              </div>
            </MockUI>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <FeatureCard accent="#7c3aed" name="リッチメニュービルダー" desc="D&Dでボタン配置・URL・電話・メッセージ送信・タグ操作・メニュー切替を自由に設計。" />
            <FeatureCard accent="#7c3aed" name="Flex Messageビルダー" desc="カード型リッチメッセージをノーコードで作成。カルーセル・ボタン・画像をプリセットから選択。" />
            <FeatureCard accent="#7c3aed" name="回答フォームビルダー" desc="問診票・アンケート・同意書をGUIで作成。回答データは管理画面に自動集約。" />
            <FeatureCard accent="#7c3aed" name="チャットボットビルダー" desc="メッセージ・質問・アクション・条件分岐ノードを組み合わせて自動対話を構築。" />
            <FeatureCard accent="#7c3aed" name="フロービルダー" desc="患者対応フローをビジュアルエディタで構築。ドラッグ&ドロップで設計。" />
            <FeatureCard accent="#7c3aed" name="アクション自動化" desc="友だち追加→挨拶メッセージ→タグ付与→リッチメニュー切替のワークフローを構築。" />
            <FeatureCard accent="#7c3aed" name="問診フォーム複数対応" desc="診療分野ごとに複数テンプレート管理。条件分岐・NGブロック・プレビュー対応。" />
          </div>
        </SectionPage>

        <PageBreak />

        {/* ═══════════════════════════════════════════
            PAGE 10: AI機能
            ═══════════════════════════════════════════ */}
        <SectionPage label="FEATURE 04" title="AI機能" subtitle="AI自動返信・音声カルテなど、AIの力で診療業務とLINE運用を大幅に効率化します。">
          <MockUI title="Lオペ — AI自動返信">
            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <div className="text-[9px] font-bold text-gray-500">患者からの問い合わせ</div>
                <div className="rounded-lg bg-gray-100 p-3 text-[10px] text-gray-700">
                  先日処方していただいた薬の飲み方を確認したいのですが、食前と食後どちらですか？
                </div>
                <div className="text-[9px] font-bold text-gray-500">AIが生成した返信案</div>
                <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-3 text-[10px] text-gray-700">
                  <div className="mb-1 flex items-center gap-1 text-[8px] text-blue-600"><span>🤖</span> AI生成</div>
                  お問い合わせありがとうございます。処方薬は食後に服用してください。詳しくは次回の診察時にご説明させていただきます。
                </div>
                <div className="flex gap-2">
                  <span className="rounded bg-green-100 px-2 py-0.5 text-[8px] font-bold text-green-700">✓ 承認して送信</span>
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-[8px] text-gray-500">✏️ 編集</span>
                </div>
              </div>
              <div className="w-32 space-y-2">
                <div className="rounded-lg border border-gray-200 p-2 text-center">
                  <div className="text-[8px] text-gray-400">類似事例</div>
                  <div className="mt-1 text-lg font-black text-blue-600">5件</div>
                  <div className="text-[8px] text-gray-400">一致度 94%</div>
                </div>
                <div className="rounded-lg border border-gray-200 p-2 text-center">
                  <div className="text-[8px] text-gray-400">学習データ</div>
                  <div className="mt-1 text-lg font-black text-green-600">482</div>
                  <div className="text-[8px] text-gray-400">蓄積事例数</div>
                </div>
              </div>
            </div>
          </MockUI>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <FeatureCard accent="#d97706" name="AI自動返信" desc="FAQ・予約・決済・発送状況を加味した返信文を自動生成。スタッフ確認後に送信するフローで品質を担保。" />
            <FeatureCard accent="#d97706" name="AI自動学習（RAG）" desc="スタッフの修正送信・手動返信をembeddingベクトルで蓄積。使うほど返信精度が向上。" />
            <FeatureCard accent="#d97706" name="音声カルテ自動生成" desc="診察中の会話をワンタップ録音。AIが文字起こし→SOAP形式カルテを自動生成。" />
            <FeatureCard accent="#d97706" name="AIモデル切替" desc="用途やコストに応じて管理画面からAIモデルを自由に選択。高精度と高速を使い分け。" />
          </div>
        </SectionPage>

        <PageBreak />

        {/* ═══════════════════════════════════════════
            PAGE 11-12: 予約・診察
            ═══════════════════════════════════════════ */}
        <SectionPage label="FEATURE 05" title="予約・診察" subtitle="予約管理・オンライン問診・カルテまで、診療の一連の流れをLINE起点で完結。複数医師の並列管理にも対応。">
          <MockUI title="Lオペ — 予約カレンダー">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-700">2026年3月</span>
                <div className="flex gap-1">
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-[8px] text-blue-600">田中Dr.</span>
                  <span className="rounded bg-green-100 px-2 py-0.5 text-[8px] text-green-600">山田Dr.</span>
                  <span className="rounded bg-purple-100 px-2 py-0.5 text-[8px] text-purple-600">佐藤Dr.</span>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-gray-200 bg-gray-200">
                {["月", "火", "水", "木", "金", "土", "日"].map((d) => (
                  <div key={d} className="bg-gray-50 py-1 text-center text-[8px] font-bold text-gray-500">{d}</div>
                ))}
                {Array.from({ length: 14 }, (_, i) => i + 17).map((d) => (
                  <div key={d} className="bg-white p-1">
                    <div className="text-[8px] text-gray-600">{d}</div>
                    {d % 3 !== 0 && <div className="mt-0.5 rounded bg-blue-50 px-1 text-[6px] text-blue-600">3/5枠</div>}
                    {d % 4 === 0 && <div className="mt-0.5 rounded bg-green-50 px-1 text-[6px] text-green-600">2/4枠</div>}
                  </div>
                ))}
              </div>
            </div>
          </MockUI>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <FeatureCard accent="#0891b2" name="予約・スケジュール管理" desc="月別・週別カレンダー、複数医師の並列管理・医師別フィルタ・休日設定・日付オーバーライド対応。" />
            <FeatureCard accent="#0891b2" name="オンライン問診" desc="友だち追加後にLINE問診フォームを自動送信。条件分岐・NG判定（禁忌チェック）対応。" />
            <FeatureCard accent="#0891b2" name="カルテ管理（SOAP対応）" desc="SOAP形式で構造化記録。処方タイムライン・来院履歴・テンプレート・同時編集ロック搭載。" />
            <FeatureCard accent="#0891b2" name="キャンセル待ち自動通知" desc="キャンセル発生時に待ちリスト患者へ自動通知。空き枠を無駄なく活用。" />
            <FeatureCard accent="#0891b2" name="EHR連携" desc="外部電子カルテとCSV/APIで双方向同期。スケジュール実行・エラー再試行対応。" />
            <FeatureCard accent="#0891b2" name="業務時間管理" desc="医師ごとの月間業務時間を一覧で確認・修正。リソース稼働状況を可視化。" />
            <FeatureCard accent="#0891b2" name="Google Calendar連携" desc="予約データとGoogle Calendarを双方向で自動同期。医師ごとに異なるカレンダーにも対応。" />
          </div>
        </SectionPage>

        <PageBreak />

        {/* ═══════════════════════════════════════════
            PAGE 13: 決済・配送 + 在庫・商品管理
            ═══════════════════════════════════════════ */}
        <SectionPage label="FEATURE 06-07" title="決済・配送 / 在庫・商品管理" subtitle="Square/GMO決済連携から配送管理まで、クリニックの金流と物流をワンストップで管理。">
          <div className="grid gap-4 sm:grid-cols-2">
            <MockUI title="売上管理">
              <div className="space-y-2">
                <div className="flex items-end gap-1">
                  {[40, 65, 55, 80, 72, 90, 85].map((h, i) => (
                    <div key={i} className="flex-1">
                      <div className="rounded-t bg-blue-500" style={{ height: `${h * 0.5}px` }} />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[7px] text-gray-400">
                  <span>月</span><span>火</span><span>水</span><span>木</span><span>金</span><span>土</span><span>日</span>
                </div>
                <div className="flex gap-4 text-center">
                  <div><div className="text-xs font-black text-gray-800">¥1,280,000</div><div className="text-[8px] text-gray-400">今月売上</div></div>
                  <div><div className="text-xs font-black text-green-600">+18%</div><div className="text-[8px] text-gray-400">前月比</div></div>
                  <div><div className="text-xs font-black text-blue-600">¥42,000</div><div className="text-[8px] text-gray-400">平均単価</div></div>
                </div>
              </div>
            </MockUI>

            <MockUI title="配送管理">
              <div className="space-y-1.5">
                {[
                  { id: "SH-001", name: "田中 花子", status: "発送済み", track: "4912-3456-7890", color: "text-green-600 bg-green-50" },
                  { id: "SH-002", name: "山田 太郎", status: "準備中", track: "—", color: "text-yellow-600 bg-yellow-50" },
                  { id: "SH-003", name: "佐藤 美咲", status: "未発送", track: "—", color: "text-gray-500 bg-gray-50" },
                ].map((s) => (
                  <div key={s.id} className="flex items-center gap-2 rounded border border-gray-100 p-2 text-[9px]">
                    <span className="font-mono text-gray-400">{s.id}</span>
                    <span className="font-medium text-gray-700">{s.name}</span>
                    <span className={`ml-auto rounded px-1.5 py-0.5 text-[8px] font-bold ${s.color}`}>{s.status}</span>
                  </div>
                ))}
              </div>
            </MockUI>
          </div>

          <div className="mt-8">
            <h3 className="mb-3 text-xs font-bold text-gray-700">決済・配送</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <FeatureCard accent="#0d9488" name="会計・決済管理" desc="Square/GMO連携・銀行振込消込・返金管理まで一元可視化。LINE経由でオンライン決済完結。" />
              <FeatureCard accent="#0d9488" name="配送・発送管理" desc="ヤマトB2形式CSV出力・追跡番号管理・配送ラベル印刷・追跡リンク自動共有。" />
              <FeatureCard accent="#0d9488" name="再処方管理" desc="再処方申請・承認フロー・用量マッピング・商品マスタ連携で効率化。" />
            </div>
          </div>

          <div className="mt-6">
            <h3 className="mb-3 text-xs font-bold text-gray-700">在庫・商品管理</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <FeatureCard accent="#ea580c" name="在庫管理・在庫台帳" desc="リアルタイム在庫把握・入出庫記録・在庫台帳で推移可視化・要発注アラート。" />
              <FeatureCard accent="#ea580c" name="商品マスタ管理" desc="処方薬・施術メニューの価格・在庫・決済連携設定をまとめて管理。" />
              <FeatureCard accent="#ea580c" name="ポイント自動付与" desc="購入金額・初回購入・累計額に応じたポイントルールを設定。自動付与。" />
            </div>
          </div>
        </SectionPage>

        <PageBreak />

        {/* ═══════════════════════════════════════════
            PAGE 14: 分析・レポート
            ═══════════════════════════════════════════ */}
        <SectionPage label="FEATURE 08" title="分析・レポート" subtitle="リアルタイムダッシュボード・LTV分析・配信分析・NPS調査まで、経営判断に必要なデータをすべて可視化。">
          <MockUI title="Lオペ — ダッシュボード">
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "今月売上", value: "¥3,240,000", sub: "+23%", subColor: "text-green-600" },
                { label: "新規患者", value: "48名", sub: "+12名", subColor: "text-blue-600" },
                { label: "予約数", value: "186件", sub: "充足率 92%", subColor: "text-cyan-600" },
                { label: "NPS", value: "72", sub: "+8pt", subColor: "text-purple-600" },
              ].map((d) => (
                <div key={d.label} className="rounded-lg border border-gray-100 p-3 text-center">
                  <div className="text-[8px] text-gray-400">{d.label}</div>
                  <div className="mt-1 text-sm font-black text-gray-800">{d.value}</div>
                  <div className={`text-[8px] font-bold ${d.subColor}`}>{d.sub}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-3">
              <div className="flex-1 rounded-lg border border-gray-100 p-3">
                <div className="text-[8px] font-bold text-gray-500">月別売上推移</div>
                <div className="mt-2 flex items-end gap-1" style={{ height: 60 }}>
                  {[35, 42, 38, 55, 48, 62, 58, 70, 65, 78, 72, 85].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-blue-500 to-blue-400" style={{ height: `${h * 0.7}px` }} />
                  ))}
                </div>
              </div>
              <div className="w-36 rounded-lg border border-gray-100 p-3">
                <div className="text-[8px] font-bold text-gray-500">LTV分布</div>
                <div className="mt-2 space-y-1">
                  {[
                    { label: "VIP", pct: 15, color: "bg-purple-500" },
                    { label: "アクティブ", pct: 35, color: "bg-blue-500" },
                    { label: "リピート", pct: 30, color: "bg-cyan-500" },
                    { label: "新規", pct: 20, color: "bg-gray-300" },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                        <div className={`h-full rounded-full ${s.color}`} style={{ width: `${s.pct}%` }} />
                      </div>
                      <span className="text-[7px] text-gray-500">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </MockUI>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <FeatureCard accent="#4f46e5" name="リアルタイムダッシュボード" desc="13項目のKPIをリアルタイム表示。ドラッグ&ドロップで自由にカスタマイズ。" />
            <FeatureCard accent="#4f46e5" name="売上分析・LTV分析" desc="患者ごとのLTV自動算出。コホート分析・商品別ランキング・月次レポートCSV出力。" />
            <FeatureCard accent="#4f46e5" name="配信分析" desc="開封率・クリック率・予約転換率を可視化。配信戦略をデータで最適化。" />
            <FeatureCard accent="#4f46e5" name="流入経路トラッキング" desc="UTM・QRコード別に友だち追加の流入経路を計測。広告効果をデータで可視化。" />
            <FeatureCard accent="#4f46e5" name="NPS調査" desc="LINEで患者満足度を定期調査。NPSスコア自動計算・トレンドグラフで推移把握。" />
            <FeatureCard accent="#4f46e5" name="クーポン管理・分析" desc="割引クーポンの発行・配布・利用状況を一元管理。固定額・%割引・有効期限対応。" />
          </div>
        </SectionPage>

        <PageBreak />

        {/* ═══════════════════════════════════════════
            PAGE 15: 運用・セキュリティ
            ═══════════════════════════════════════════ */}
        <SectionPage label="FEATURE 09" title="運用・セキュリティ" subtitle="堅牢なセキュリティ基盤と柔軟な運用機能で、安全で効率的なクリニック運営を支えます。">
          <div className="grid gap-4 sm:grid-cols-2">
            <MockUI title="スタッフ・ロール権限設定">
              <div className="space-y-1.5">
                {[
                  { role: "オーナー", color: "bg-red-100 text-red-700", perms: "全権限" },
                  { role: "副管理者", color: "bg-orange-100 text-orange-700", perms: "設定以外すべて" },
                  { role: "運用者", color: "bg-blue-100 text-blue-700", perms: "配信・予約・患者管理" },
                  { role: "スタッフ", color: "bg-gray-100 text-gray-600", perms: "トーク・予約閲覧のみ" },
                ].map((r) => (
                  <div key={r.role} className="flex items-center gap-3 rounded border border-gray-100 p-2">
                    <span className={`rounded-full px-2 py-0.5 text-[8px] font-bold ${r.color}`}>{r.role}</span>
                    <span className="text-[9px] text-gray-500">{r.perms}</span>
                  </div>
                ))}
              </div>
            </MockUI>

            <MockUI title="セキュリティ対策">
              <div className="space-y-2">
                {[
                  { icon: "🔒", title: "Row-Level Security", desc: "テナント間のデータ完全分離" },
                  { icon: "🛡️", title: "CSRF保護", desc: "Double Submit Cookieで防御" },
                  { icon: "📋", title: "監査ログ", desc: "全操作を自動記録・追跡可能" },
                  { icon: "🔑", title: "セッション管理", desc: "JWT + Redis キャッシュ" },
                ].map((s) => (
                  <div key={s.title} className="flex items-center gap-2 text-[9px]">
                    <span>{s.icon}</span>
                    <span className="font-bold text-gray-700">{s.title}</span>
                    <span className="text-gray-400">— {s.desc}</span>
                  </div>
                ))}
              </div>
            </MockUI>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <FeatureCard accent="#475569" name="メッセージ配信ログ" desc="全送受信履歴を一元管理。種類別検索・送信ステータス監視。" />
            <FeatureCard accent="#475569" name="メディアライブラリ" desc="画像・PDF等のメディアファイルをフォルダ管理。各機能から横断利用。" />
            <FeatureCard accent="#475569" name="初期設定ウィザード" desc="LINE連携→決済→商品→スケジュールまで4ステップの初期設定ガイド。" />
            <FeatureCard accent="#475569" name="マルチ診療分野対応" desc="複数診療分野の問診・商品・NG判定を分野別管理。1アカウントで複数分野を運用。" />
            <FeatureCard accent="#475569" name="スマホ管理・LINE通知bot" desc="レスポンシブ管理画面でスマホ操作可能。システム通知をLINEグループに自動送信。" />
            <FeatureCard accent="#475569" name="スタッフ・ロール権限管理" desc="4段階ロール＋画面単位アクセス権限。必要な機能だけを開放。" />
          </div>
        </SectionPage>

        <PageBreak />

        {/* ═══════════════════════════════════════════
            PAGE 16: 外部連携
            ═══════════════════════════════════════════ */}
        <SectionPage label="INTEGRATIONS" title="外部サービス連携" subtitle="14の外部サービスとシームレスに連携。既存のワークフローを崩さず導入できます。">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { name: "LINE Messaging API", cat: "メッセージ", color: "bg-green-50 border-green-200" },
              { name: "Square", cat: "決済", color: "bg-blue-50 border-blue-200" },
              { name: "GMO", cat: "決済", color: "bg-orange-50 border-orange-200" },
              { name: "Stripe", cat: "決済", color: "bg-purple-50 border-purple-200" },
              { name: "ヤマト運輸 B2", cat: "配送", color: "bg-yellow-50 border-yellow-200" },
              { name: "Google Calendar", cat: "カレンダー", color: "bg-red-50 border-red-200" },
              { name: "OpenAI / Claude", cat: "AI", color: "bg-cyan-50 border-cyan-200" },
              { name: "Supabase", cat: "データベース", color: "bg-emerald-50 border-emerald-200" },
              { name: "Redis", cat: "キャッシュ", color: "bg-red-50 border-red-200" },
              { name: "Vercel", cat: "ホスティング", color: "bg-gray-50 border-gray-200" },
              { name: "Twilio", cat: "SMS認証", color: "bg-pink-50 border-pink-200" },
              { name: "AWS S3", cat: "ストレージ", color: "bg-amber-50 border-amber-200" },
            ].map((s) => (
              <div key={s.name} className={`rounded-lg border ${s.color} p-3 text-center`}>
                <div className="text-[11px] font-bold text-gray-800">{s.name}</div>
                <div className="mt-0.5 text-[9px] text-gray-400">{s.cat}</div>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-xl bg-gray-50 p-6">
            <h3 className="text-sm font-bold text-gray-800">対応診療科</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {["美容皮膚科", "美容外科", "皮膚科", "内科", "婦人科", "歯科", "眼科", "耳鼻咽喉科", "整形外科", "小児科", "心療内科", "泌尿器科"].map((s) => (
                <span key={s} className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-600">{s}</span>
              ))}
            </div>
          </div>
        </SectionPage>

        <PageBreak />

        {/* ═══════════════════════════════════════════
            PAGE 17: 料金プラン
            ═══════════════════════════════════════════ */}
        <SectionPage label="PRICING" title="料金プラン" subtitle="貴院の規模・運用体制に合わせた最適プランをご提案します。全プラン、ユーザー数無制限・アップデート無料。">
          {/* 機能プラン */}
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                name: "スタンダード",
                price: "¥71,500",
                initial: "初期費用 ¥330,000（税込）",
                desc: "予約・カルテ・問診まで診療業務をカバー",
                features: ["LINE配信・CRM", "予約管理・問診", "カルテ・患者管理", "リッチメニュービルダー", "自動リマインド", "キーワード自動返信", "セグメント配信", "テンプレート管理"],
              },
              {
                name: "プロ",
                price: "¥121,000",
                initial: "初期費用 ¥550,000（税込）",
                desc: "決済・配送・分析まで業務をまるごとDX化",
                features: ["スタンダードの全機能", "決済管理（Square/GMO/Stripe）", "配送管理・在庫管理", "D&Dダッシュボード", "売上分析・LTV分析", "NPS調査", "クーポン管理", "ポイント自動付与"],
                pop: true,
              },
            ].map((p) => (
              <div
                key={p.name}
                className={`rounded-2xl border-2 p-6 ${p.pop ? "border-blue-500 relative shadow-lg shadow-blue-100/30" : "border-gray-200"}`}
              >
                {p.pop && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-4 py-1 text-[10px] font-bold text-white">
                    おすすめ
                  </span>
                )}
                <h3 className="text-base font-bold text-gray-800">{p.name}</h3>
                <div className="mt-3">
                  <span className="text-3xl font-black text-gray-900">{p.price}</span>
                  <span className="text-sm text-gray-500"> /月（税込）</span>
                </div>
                <p className="mt-1 text-xs text-gray-400">{p.initial}</p>
                <p className="mt-3 text-xs text-gray-500">{p.desc}</p>
                <ul className="mt-4 space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[8px] text-blue-600">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* メッセージ通数 + AIオプション */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="mb-3 text-xs font-bold text-gray-700">メッセージ通数プラン（税込/月）</h3>
              <div className="space-y-1.5">
                {[
                  { name: "5,000通", price: "¥4,400" },
                  { name: "30,000通", price: "¥26,400", pop: true },
                  { name: "100,000通", price: "¥74,800" },
                  { name: "1,000,000通", price: "¥173,800" },
                ].map((p) => (
                  <div key={p.name} className={`flex items-center justify-between rounded-lg border px-4 py-2.5 ${p.pop ? "border-blue-300 bg-blue-50" : "border-gray-200"}`}>
                    <span className="text-xs font-medium text-gray-700">{p.name}</span>
                    <span className="text-xs font-bold text-gray-900">{p.price}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-xs font-bold text-gray-700">オプション（税込/月）</h3>
              <div className="space-y-1.5">
                {[
                  { name: "AI自動返信", price: "¥22,000" },
                  { name: "音声カルテ", price: "¥16,500" },
                ].map((o) => (
                  <div key={o.name} className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-2.5">
                    <span className="text-xs font-medium text-gray-700">{o.name}</span>
                    <span className="text-xs font-bold text-gray-900">{o.price}</span>
                  </div>
                ))}
              </div>
              <h3 className="mb-3 mt-6 text-xs font-bold text-gray-700">構築オプション（税込/一括）</h3>
              <div className="space-y-1.5">
                {[
                  { name: "LINE公式アカウント初期構築", price: "¥110,000" },
                  { name: "リッチメニュー作成", price: "¥27,500" },
                  { name: "データ移行", price: "¥110,000" },
                ].map((o) => (
                  <div key={o.name} className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-2.5">
                    <span className="text-xs font-medium text-gray-700">{o.name}</span>
                    <span className="text-xs font-bold text-gray-900">{o.price}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SectionPage>

        <PageBreak />

        {/* ═══════════════════════════════════════════
            PAGE 18: 導入の流れ
            ═══════════════════════════════════════════ */}
        <SectionPage label="ONBOARDING" title="導入の流れ" subtitle="最短2週間で運用開始。初期設定サポートからスタッフ研修まで無料で対応します。">
          <div className="space-y-6">
            {[
              { num: "01", title: "お問い合わせ・ヒアリング", desc: "フォームまたはお電話でご連絡ください。貴院の課題・診療科・運用体制をヒアリングし、最適なプランをご提案します。デモ環境でのご体験も可能です。", days: "Day 1-3" },
              { num: "02", title: "契約・アカウント発行", desc: "プランの確定後、テナントアカウントを発行。管理画面のURLとログイン情報をお送りします。", days: "Day 3-5" },
              { num: "03", title: "初期設定", desc: "初期設定ウィザードに沿ってLINE連携・決済設定・商品登録・スケジュール設定を行います。担当者がオンラインでサポートします。", days: "Day 5-10" },
              { num: "04", title: "スタッフ研修・テスト運用", desc: "スタッフ向けの操作研修を実施（オンライン/オフライン対応）。テスト環境で実際の運用フローを確認します。", days: "Day 10-14" },
              { num: "05", title: "本番運用開始", desc: "テスト完了後、本番環境に切り替えて運用を開始します。導入後も定期フォローアップとサポートを継続。", days: "Day 14~" },
            ].map((s, i) => (
              <div key={s.num} className="flex gap-5 print:break-inside-avoid">
                <div className="flex flex-col items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-lg font-black text-white">{s.num}</div>
                  {i < 4 && <div className="mt-1 h-full w-px bg-blue-200" />}
                </div>
                <div className="flex-1 pb-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-bold text-gray-800">{s.title}</h3>
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">{s.days}</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-gray-500">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionPage>

        <PageBreak />

        {/* ═══════════════════════════════════════════
            PAGE 19: 運営会社
            ═══════════════════════════════════════════ */}
        <section className="flex min-h-[50vh] flex-col justify-center px-12 py-16 print:min-h-0 print:py-20">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">COMPANY</p>
            <h2 className="mt-2 text-2xl font-black text-gray-900">運営会社</h2>
          </div>

          <div className="mx-auto mt-10 w-full max-w-md">
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100">
                  {[
                    ["会社名", "株式会社ORDIX"],
                    ["所在地", "東京都"],
                    ["事業内容", "クリニック向けSaaS開発・運用"],
                    ["サービス", "Lオペ for CLINIC"],
                    ["URL", "ordix.co.jp"],
                  ].map(([k, v]) => (
                    <tr key={k}>
                      <td className="bg-gray-50 px-4 py-3 text-xs font-medium text-gray-500 w-28">{k}</td>
                      <td className="px-4 py-3 text-xs text-gray-700">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-16 text-center">
            <Image src="/images/l-ope-logo.png" alt="Lオペ" width={60} height={60} className="mx-auto mb-4" />
            <p className="text-sm font-bold text-gray-700">Lオペ for CLINIC</p>
            <p className="mt-1 text-xs text-gray-400">クリニック特化 LINE運用プラットフォーム</p>
            <p className="mt-8 text-[10px] text-gray-300">
              © {new Date().getFullYear()} ORDIX Inc. All rights reserved.
            </p>
          </div>
        </section>

      </div>

      {/* ── 印刷用スタイル ── */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .pamphlet-wrapper {
            max-width: 100% !important;
          }
        }
      `}</style>
    </>
  );
}

/* ═══════════════════ メインコンポーネント ═══════════════════ */

function PamphletPageInner() {
  const searchParams = useSearchParams();
  const [verified, setVerified] = useState(
    process.env.NODE_ENV === "development" && searchParams.get("preview") === "1"
  );

  if (!verified) {
    return <PasswordGate onVerified={() => setVerified(true)} />;
  }

  return <PamphletContent />;
}

export default function PamphletPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-gray-400">読み込み中...</div>}>
      <PamphletPageInner />
    </Suspense>
  );
}
