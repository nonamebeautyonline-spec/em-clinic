import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, FlowSteps, ComparisonTable, ResultCard } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "salon-line-crm-setup-guide")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/salon/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/salon/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "紙カルテからの移行はどのくらい時間がかかりますか？", a: "全件を一度に移行する必要はありません。新規客からLINE管理を開始し、既存客は来店時に順次移行する方法なら、追加の作業時間はほぼゼロです。3ヶ月で主要顧客の80%は移行できます。" },
  { q: "LINE CRMで管理できる顧客情報は？", a: "名前、来店履歴、施術メモ、施術写真、タグ（メニュー・来店回数・属性）、メモ（好み・アレルギー・会話内容）など。紙カルテに書いている情報はほぼすべてデジタルで管理可能です。" },
  { q: "スタッフ間で情報共有できますか？", a: "はい、管理画面からすべてのスタッフが顧客情報を閲覧できます。担当スタッフが休みの日でも、他のスタッフが過去の施術内容や好みを確認できるため、一貫した接客が可能です。" },
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
  "紙カルテからLINE CRMへの段階的な移行手順",
  "タグ設計・来店履歴・施術メモの運用方法",
  "パーソナル接客の基盤となる顧客データ活用術",
];

const toc = [
  { id: "why-crm", label: "サロンに顧客管理が必要な理由" },
  { id: "paper-vs-digital", label: "紙カルテ vs LINE CRM" },
  { id: "tag-design", label: "タグ設計のルール" },
  { id: "migration", label: "紙カルテからの移行手順" },
  { id: "data-usage", label: "顧客データの活用方法" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="LINE CRM構築ガイド" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">「あのお客様、前回何のメニューだったかな？」——紙カルテを探す時間がなくなる日は、<strong>LINE CRM</strong>で実現できます。本記事では、紙カルテからLINEベースの顧客管理への移行手順を解説します。</p>

      <section>
        <h2 id="why-crm" className="text-xl font-bold text-gray-800">サロンに顧客管理が必要な理由</h2>

        <StatGrid stats={[
          { value: "2〜3分", label: "紙カルテの平均検索時間" },
          { value: "1日30分", label: "カルテ検索にかかる合計時間" },
          { value: "25%", unit: "向上", label: "パーソナル接客によるリピート率改善" },
        ]} />

        <p>「前回のカラーの色味」「好きな雑誌」「お子さんの年齢」——こうした情報を把握して接客できるサロンは、お客様の満足度とリピート率が圧倒的に高くなります。</p>
      </section>

      <section>
        <h2 id="paper-vs-digital" className="text-xl font-bold text-gray-800">紙カルテ vs LINE CRM</h2>

        <ComparisonTable
          headers={["比較項目", "紙カルテ", "LINE CRM"]}
          rows={[
            ["検索速度", "2〜3分", "3秒"],
            ["スタッフ間共有", "難しい", "リアルタイム"],
            ["写真の保存", "プリント貼付", "スマホで撮影→自動保存"],
            ["保管スペース", "年々増加", "不要"],
            ["紛失リスク", "あり", "なし"],
            ["来店履歴の分析", "不可能", "自動集計"],
            ["セグメント配信", "不可能", "タグベースで即実行"],
          ]}
        />
      </section>

      <section>
        <h2 id="tag-design" className="text-xl font-bold text-gray-800">タグ設計のルール</h2>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">必須タグカテゴリ</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>来店回数</strong> — 新規/2回目/3〜5回/6回以上/VIP</li>
          <li><strong>主要メニュー</strong> — カット/カラー/パーマ/トリートメント/ネイル等</li>
          <li><strong>来店頻度</strong> — 月1/2ヶ月に1回/3ヶ月に1回/休眠</li>
          <li><strong>担当スタッフ</strong> — 指名スタッフのタグ</li>
          <li><strong>属性</strong> — 誕生月/年代/好みのスタイル</li>
        </ul>

        <Callout type="warning" title="タグを増やしすぎない">
          タグの数は30個以内に収めましょう。多すぎると管理が煩雑になり、スタッフがタグ付けを怠るようになります。最初は10個程度から始めて、必要に応じて追加するのがおすすめです。
        </Callout>
      </section>

      <InlineCTA />

      <section>
        <h2 id="migration" className="text-xl font-bold text-gray-800">紙カルテからの移行手順</h2>

        <FlowSteps steps={[
          { title: "フェーズ1：新規客からスタート", desc: "本日以降の新規客はすべてLINE CRMで管理。紙カルテは作成しない" },
          { title: "フェーズ2：来店時に既存客を移行", desc: "既存客が来店したタイミングで、紙カルテの情報をLINEに入力" },
          { title: "フェーズ3：VIP客を優先移行", desc: "売上上位20%のVIP客の情報を優先的にデジタル化" },
          { title: "フェーズ4：紙カルテの保管→廃棄", desc: "3ヶ月後に80%移行完了→紙カルテは一定期間保管後に廃棄" },
        ]} />

        <ResultCard before="1日30分" after="1日5分" metric="カルテ検索・管理にかかる時間" description="LINE CRM移行で作業時間を83%削減" />
      </section>

      <section>
        <h2 id="data-usage" className="text-xl font-bold text-gray-800">顧客データの活用方法</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>セグメント配信</strong> — タグに基づいて最適なメッセージを配信</li>
          <li><strong>パーソナル接客</strong> — 前回の施術内容・好みを確認して来店時の接客に活用</li>
          <li><strong>休眠顧客の検出</strong> — 最終来店日から自動で休眠顧客をリストアップ</li>
          <li><strong>VIP分析</strong> — 売上貢献度の高いお客様を特定し特別対応</li>
        </ul>

        <p className="mt-4">セグメント設計の詳細は<Link href="/salon/column/salon-customer-segmentation-strategy" className="text-blue-600 underline">顧客セグメント設計</Link>、VIP管理は<Link href="/salon/column/salon-vip-customer-management" className="text-blue-600 underline">VIP顧客管理</Link>、DXの全体像は<Link href="/salon/column/salon-digital-transformation-line" className="text-blue-600 underline">サロンのDXはLINEから始める</Link>をご参照ください。</p>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>紙カルテは検索・共有・分析のすべてが非効率</strong> — LINE CRMで解決</li>
          <li><strong>タグ設計は30個以内、5カテゴリから開始</strong> — 来店回数・メニュー・頻度・担当・属性</li>
          <li><strong>移行は新規客からスタート</strong> — 既存客は来店時に順次移行</li>
          <li><strong>データはセグメント配信・パーソナル接客・休眠検出に活用</strong></li>
        </ol>
        <p className="mt-4">Lオペ for SALONは、サロン専用のCRM機能を搭載。タグ・来店履歴・施術メモの管理からセグメント配信まで、ワンストップで顧客管理を実現します。</p>
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
