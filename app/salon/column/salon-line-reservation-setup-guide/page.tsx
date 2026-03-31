import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, FlowSteps, BarChart, ComparisonTable, ResultCard } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "salon-line-reservation-setup-guide")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/salon/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/salon/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "LINE予約とホットペッパー予約は併用できますか？", a: "はい、併用可能です。ただし、ダブルブッキングを防ぐために予約枠の一元管理が必要です。Lオペ for SALONでは、ホットペッパーとLINEの予約枠を連携させてダブルブッキングを自動防止できます。" },
  { q: "LINE予約の自動リマインドは何日前に送るのが効果的ですか？", a: "前日の18〜20時が最も効果的です。これに加え、3日前にも1回リマインドを送ると無断キャンセル率がさらに低下します。リマインドの内容は日時・メニュー・担当者・アクセス情報を含めましょう。" },
  { q: "スタッフの指名予約もLINEで受けられますか？", a: "はい、メニュー選択後にスタッフを選択できる導線を設計できます。リッチメニューのスタッフ紹介ページからそのまま指名予約に進める仕組みも構築可能です。" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

const keyPoints = [
  "LINE予約の設定手順からメニュー・スタッフシフト連携まで完全解説",
  "自動リマインド配信で無断キャンセル率を大幅削減",
  "電話予約からLINE予約への段階的移行戦略",
];

const toc = [
  { id: "why-line-reservation", label: "LINE予約が選ばれる理由" },
  { id: "setup", label: "LINE予約の設定手順" },
  { id: "menu-staff", label: "メニューとスタッフシフトの連携" },
  { id: "auto-remind", label: "自動リマインド配信の設定" },
  { id: "migration", label: "電話予約からの移行戦略" },
  { id: "results", label: "導入効果" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="LINE予約設定ガイド" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">サロンの予約受付をLINEに移行すると、<strong>電話対応の負荷削減</strong>と<strong>予約率の向上</strong>を同時に実現できます。本記事では、メニュー設定からスタッフシフト連携、自動リマインド配信まで、LINE予約の導入方法を完全解説します。</p>

      <section>
        <h2 id="why-line-reservation" className="text-xl font-bold text-gray-800">LINE予約が選ばれる理由</h2>

        <StatGrid stats={[
          { value: "70%", label: "サロン利用者がLINE予約を希望" },
          { value: "24時間", label: "いつでも予約受付が可能" },
          { value: "50%", unit: "減", label: "電話対応の削減幅" },
        ]} />

        <p>お客様にとってLINE予約の最大のメリットは「いつでも・どこでも・待たずに」予約できることです。施術中に電話対応が必要なスタッフの負荷も大幅に軽減されます。</p>

        <BarChart
          data={[
            { label: "LINE予約希望", value: 70, color: "#22c55e" },
            { label: "Web予約希望", value: 18, color: "#3b82f6" },
            { label: "電話予約希望", value: 12, color: "#f59e0b" },
          ]}
          unit="%"
        />
      </section>

      <section>
        <h2 id="setup" className="text-xl font-bold text-gray-800">LINE予約の設定手順</h2>

        <FlowSteps steps={[
          { title: "予約メニューの作成", desc: "カット・カラー・パーマ等のメニューを登録。所要時間・価格・説明文を設定" },
          { title: "予約枠の設定", desc: "営業時間・定休日・予約受付可能枠を設定。スタッフ数に応じた同時予約数を制限" },
          { title: "スタッフ登録", desc: "担当スタッフの名前・対応メニュー・シフトを登録。指名予約の可否を設定" },
          { title: "リマインド設定", desc: "前日18時と3日前の自動リマインドメッセージを設定" },
          { title: "リッチメニュー連携", desc: "リッチメニューに「予約する」ボタンを配置し、予約ページへの導線を設計" },
        ]} />
      </section>

      <section>
        <h2 id="menu-staff" className="text-xl font-bold text-gray-800">メニューとスタッフシフトの連携</h2>
        <p>LINE予約の使いやすさは、メニューとスタッフシフトの連携精度で決まります。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">メニュー設定のポイント</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>メニュー数は10個以内に絞る</strong> — 選択肢が多すぎると離脱率が上がる</li>
          <li><strong>セットメニューを用意</strong> — 「カット＋カラー」「カット＋トリートメント」など人気の組み合わせ</li>
          <li><strong>所要時間を正確に設定</strong> — カウンセリング・仕上げ時間も含めて設定</li>
          <li><strong>写真付きで視覚的に訴求</strong> — 特にカラーやネイルのデザインメニュー</li>
        </ul>

        <Callout type="warning" title="所要時間の設定ミスに注意">
          所要時間を短く設定すると予約の詰め込みが発生し、次のお客様を待たせる原因になります。実際の施術時間＋片付け・準備時間（10〜15分）を加えた時間で設定しましょう。
        </Callout>
      </section>

      <InlineCTA />

      <section>
        <h2 id="auto-remind" className="text-xl font-bold text-gray-800">自動リマインド配信の設定</h2>
        <p>自動リマインドは無断キャンセル対策に最も効果的な機能です。</p>

        <ComparisonTable
          headers={["タイミング", "内容", "効果"]}
          rows={[
            ["3日前", "予約確認＋変更受付案内", "事前キャンセルを促し空き枠を再販売"],
            ["前日18時", "日時・メニュー・担当・アクセス", "当日の無断キャンセルを防止"],
            ["当日（来店1時間前）", "「お待ちしております」メッセージ", "来店モチベーション向上"],
          ]}
        />

        <ResultCard before="12%" after="3%" metric="無断キャンセル率" description="3日前＋前日のダブルリマインドで大幅改善" />

        <p className="mt-4">無断キャンセル防止の詳細は<Link href="/salon/column/salon-no-show-prevention-line" className="text-blue-600 underline">LINEリマインドで無断キャンセルを防ぐ方法</Link>で解説しています。</p>
      </section>

      <section>
        <h2 id="migration" className="text-xl font-bold text-gray-800">電話予約からLINE予約への移行戦略</h2>

        <FlowSteps steps={[
          { title: "並行運用（1〜2ヶ月）", desc: "電話予約とLINE予約の両方を受付。電話のお客様にも「次回からLINEで予約できます」と案内" },
          { title: "LINE優遇（3ヶ月目〜）", desc: "LINE予約のお客様にはポイント2倍やクーポン等の優遇特典を付与" },
          { title: "電話予約の縮小（6ヶ月目〜）", desc: "LINE予約率が70%を超えたら電話予約は「受付のみ」に変更" },
        ]} />
      </section>

      <section>
        <h2 id="results" className="text-xl font-bold text-gray-800">導入効果</h2>

        <StatGrid stats={[
          { value: "50%", unit: "減", label: "電話対応件数" },
          { value: "25%", unit: "増", label: "予約件数" },
          { value: "3%", label: "無断キャンセル率（12%→3%）" },
        ]} />

        <p>ホットペッパーとの連携で予約チャネルを一元管理する方法は<Link href="/salon/column/hotpepper-line-integration-guide" className="text-blue-600 underline">ホットペッパーとLINE連携ガイド</Link>、予約チャネル全体の最適化は<Link href="/salon/column/salon-reservation-channel-optimization" className="text-blue-600 underline">予約チャネル最適化ガイド</Link>をご参照ください。</p>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>LINE予約は顧客満足度と業務効率の両方を向上</strong> — 24時間受付で取りこぼしをゼロに</li>
          <li><strong>メニュー設定は10個以内に絞る</strong> — シンプルな選択肢で離脱を防ぐ</li>
          <li><strong>自動リマインドで無断キャンセル率3%以下</strong> — 3日前＋前日のダブルリマインド</li>
          <li><strong>段階的に移行</strong> — 電話予約との並行運用から始めて徐々にLINE中心へ</li>
        </ol>
        <p className="mt-4">Lオペ for SALONは、LINE予約の設定から自動リマインド、ホットペッパー連携までワンストップで提供。サロンの予約管理を劇的に効率化します。</p>
      </section>

      <section id="faq">
        <h2 className="text-2xl font-bold mt-12 mb-6">よくある質問</h2>
        {faqItems.map((item, i) => (
          <div key={i} className="mb-6 rounded-lg border border-gray-200 p-5">
            <h3 className="font-bold text-lg mb-2">Q. {item.q}</h3>
            <p className="text-gray-700 leading-relaxed">{item.a}</p>
          </div>
        ))}
      </section>
    </ArticleLayout>
  );
}
