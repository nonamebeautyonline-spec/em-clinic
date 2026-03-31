import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "line-friends-0-to-1000-growth-strategy")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/line/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/line/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "友だち0人から1000人までどのくらいの期間がかかる？", a: "業種や既存顧客基盤の有無によりますが、店舗ビジネスであれば3〜6ヶ月、ECやWebサービスでは6〜12ヶ月が一般的な目安です。既存顧客リスト（メルマガなど）がある場合は、初月で100〜300人の友だち追加が期待できます。" },
  { q: "友だちが少ない段階でも配信は行うべき？", a: "はい。友だちが少ない段階でこそ、1:1のチャット対応や丁寧なコンテンツ配信を行い、初期ユーザーとの関係を深めましょう。初期ユーザーの満足度が高ければ口コミでの拡散が期待でき、成長の加速につながります。" },
  { q: "友だち1000人を達成したら次の目標は？", a: "次の目標は5000人です。1000人を超えると、セグメント配信の精度が上がり、A/Bテストの統計的な信頼性も高まります。友だち数の成長と並行して、ブロック率20%以下の維持と開封率60%以上のキープを目標にしましょう。" },
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
  "友だち0→1000人を4つのフェーズに分けた段階別ロードマップ",
  "各フェーズで実施すべき具体的な施策と達成目標",
  "立ち上げ期に陥りがちな落とし穴と回避策",
];

const toc = [
  { id: "roadmap-overview", label: "0→1000人ロードマップの全体像" },
  { id: "phase-1", label: "Phase 1: 0→100人（基盤構築期）" },
  { id: "phase-2", label: "Phase 2: 100→300人（拡大準備期）" },
  { id: "phase-3", label: "Phase 3: 300→600人（成長加速期）" },
  { id: "phase-4", label: "Phase 4: 600→1000人（安定成長期）" },
  { id: "pitfalls", label: "立ち上げ期の落とし穴と回避策" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <ArticleLayout slug={self.slug} breadcrumbLabel="成長戦略" keyPoints={keyPoints} toc={toc}>

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        LINE公式アカウントを開設したものの、「友だちが全然増えない」「何から始めればいいか分からない」という声は非常に多いです。友だち数が<strong>1000人</strong>を超えると、セグメント配信やA/Bテストが実用的になり、LINE運用の成果が本格的に見えてきます。本記事では、友だち0人から1000人達成までを<strong>4つのフェーズ</strong>に分け、各段階で実施すべき施策と達成目標を具体的なロードマップとして解説します。
      </p>

      <section>
        <h2 id="roadmap-overview" className="text-xl font-bold text-gray-800">0→1000人ロードマップの全体像</h2>

        <ComparisonTable
          headers={["フェーズ", "目標友だち数", "期間目安", "注力施策"]}
          rows={[
            ["Phase 1", "0→100人", "1〜2ヶ月", "既存顧客・身内からの追加"],
            ["Phase 2", "100→300人", "2〜3ヶ月", "オンライン導線の整備"],
            ["Phase 3", "300→600人", "2〜3ヶ月", "広告・キャンペーン展開"],
            ["Phase 4", "600→1000人", "2〜3ヶ月", "口コミ・紹介の仕組み化"],
          ]}
        />

        <Callout type="point" title="1000人達成の重要性">
          友だち1000人はLINE運用の「損益分岐点」ともいえる数字です。1000人を超えると配信のインパクトが目に見えて大きくなり、A/Bテストの統計的信頼性も確保できるため、データドリブンな改善サイクルが回り始めます。
        </Callout>
      </section>

      <section>
        <h2 id="phase-1" className="text-xl font-bold text-gray-800">Phase 1: 0→100人（基盤構築期）</h2>
        <p>最初の100人は最も難しく、最も重要なフェーズです。この段階では「量」よりも「運用基盤の構築」と「初期ユーザーとの関係構築」に注力します。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">やるべきこと</h3>
        <FlowSteps steps={[
          { title: "アカウント設定の最適化", desc: "プロフィール・あいさつメッセージ・リッチメニューを整備。「追加してよかった」と思わせる初期体験を設計" },
          { title: "既存顧客への案内", desc: "メルマガ・SNS・店頭で既存顧客にLINE追加を呼びかけ。最初の友だちは既知の顧客から" },
          { title: "スタッフ・関係者の追加", desc: "社内メンバーやパートナーにも追加依頼。配信テストの観点でも有益" },
          { title: "初回配信の実施", desc: "友だちが50人を超えたら最初の配信を実施。反応を見て配信の方向性を調整" },
        ]} />

        <StatGrid stats={[
          { value: "100人", label: "Phase 1の目標" },
          { value: "1〜2ヶ月", label: "達成期間の目安" },
          { value: "15%以下", label: "ブロック率の目標" },
        ]} />
      </section>

      <section>
        <h2 id="phase-2" className="text-xl font-bold text-gray-800">Phase 2: 100→300人（拡大準備期）</h2>
        <p>100人を超えたら、オンライン上の友だち追加導線を整備し、自然流入を増やす段階に入ります。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">やるべきこと</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Webサイトへのバナー設置</strong> — ヘッダー・フッター・記事末尾にLINE友だち追加バナーを設置</li>
          <li><strong>SNSプロフィールの活用</strong> — Instagram・X・TikTokのプロフィールにLINEリンクを設置</li>
          <li><strong>Googleビジネスプロフィール連携</strong> — 店舗ビジネスの場合、Googleマップからの導線を構築</li>
          <li><strong>追加特典の設計</strong> — 友だち追加で受け取れる特典（クーポン・限定コンテンツ）を用意</li>
          <li><strong>配信コンテンツの確立</strong> — 週1回の定期配信を開始し、配信スタイルを確立</li>
        </ul>

        <ResultCard before="100人" after="300人" metric="友だち数" description="Webサイト・SNS連携で月50〜80人の自然流入を実現" />
      </section>

      <InlineCTA />

      <section>
        <h2 id="phase-3" className="text-xl font-bold text-gray-800">Phase 3: 300→600人（成長加速期）</h2>
        <p>300人を超えたら、有料施策も視野に入れて友だち獲得を加速させます。同時に、セグメント配信の導入で配信の質も高めましょう。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">やるべきこと</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>LINE友だち追加広告</strong> — LINE上で直接友だち追加が完了する広告を出稿</li>
          <li><strong>キャンペーン展開</strong> — 友だち追加キャンペーン（限定クーポン・抽選プレゼント）を実施</li>
          <li><strong>セグメント配信の開始</strong> — 友だち追加時のアンケートやタグ情報を活用した配信を開始</li>
          <li><strong>店頭施策の強化</strong> — 店舗ビジネスの場合、レジ声かけの徹底とPOPの最適化</li>
        </ul>

        <p className="text-sm font-semibold text-gray-600 mb-1">Phase 3で効果的な施策（友だち追加数/月）</p>
        <BarChart
          data={[
            { label: "LINE広告", value: 120 },
            { label: "キャンペーン", value: 80 },
            { label: "店頭声かけ", value: 60 },
            { label: "Webサイト", value: 40 },
            { label: "SNS連携", value: 20 },
          ]}
          unit="人"
        />

        <Callout type="warning" title="広告出稿時の注意">
          LINE広告は友だちの「量」は集まりやすいですが、「質」の管理が重要です。広告経由の友だちはブロック率が高くなりがちなので、友だち追加直後のあいさつメッセージと初回配信の質を徹底しましょう。
        </Callout>
      </section>

      <section>
        <h2 id="phase-4" className="text-xl font-bold text-gray-800">Phase 4: 600→1000人（安定成長期）</h2>
        <p>600人を超えたら、口コミ・紹介の仕組みを構築し、有機的な成長エンジンを作ります。同時にKPI管理を本格化し、運用の精度を高める段階です。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">やるべきこと</h3>
        <FlowSteps steps={[
          { title: "紹介プログラムの構築", desc: "友だち紹介で特典が得られる仕組みを構築。紹介コード付きURLで追跡" },
          { title: "口コミ促進", desc: "満足度の高いユーザーにSNSシェアやGoogle口コミを依頼" },
          { title: "KPIダッシュボード構築", desc: "友だち数・ブロック率・開封率・CVRを一元管理するダッシュボードを構築" },
          { title: "A/Bテスト開始", desc: "500人以上のセグメントでA/Bテストが統計的に有意になるため、本格的な最適化を開始" },
        ]} />

        <ResultCard before="600人" after="1000人" metric="友だち数" description="紹介プログラム＋継続施策で月80〜120人の安定成長を実現" />

        <p>KPIダッシュボードの構築方法は<Link href="/line/column/line-kpi-dashboard-analytics-guide" className="text-sky-600 underline hover:text-sky-800">LINE分析KPIダッシュボードガイド</Link>で詳しく解説しています。</p>
      </section>

      <section>
        <h2 id="pitfalls" className="text-xl font-bold text-gray-800">立ち上げ期の落とし穴と回避策</h2>
        <p>友だち1000人を達成する前に挫折するケースには、共通するパターンがあります。</p>

        <ComparisonTable
          headers={["落とし穴", "原因", "回避策"]}
          rows={[
            ["友だちが増えない", "導線が不十分 / 特典が弱い", "既存顧客からのスタート＋導線の複数展開"],
            ["ブロック率が高い", "配信頻度過多 / コンテンツ品質低い", "週1配信から開始＋有益情報中心の配信"],
            ["配信ネタが尽きる", "属人的な運用 / 計画なし", "月間配信カレンダーを事前に作成"],
            ["成果が見えない", "KPI未設定 / 計測環境未整備", "最低限の3指標から計測を開始"],
            ["運用が続かない", "担当者1人に依存", "チーム体制の構築＋ツールによる自動化"],
          ]}
        />

        <p>ブロック率対策は<Link href="/line/column/line-block-rate-reduction-7-methods" className="text-sky-600 underline hover:text-sky-800">ブロック率を下げる7つの方法</Link>、友だち集めの施策全体は<Link href="/line/column/line-friends-collection-15-strategies" className="text-sky-600 underline hover:text-sky-800">友だち集め施策15選</Link>をあわせてご覧ください。</p>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ: 4つのフェーズで友だち1000人を達成する</h2>
        <p>友だち0人から1000人への道のりは、一足飛びではなく段階的なアプローチが鍵です。各フェーズで適切な施策を実行し、基盤→拡大→加速→安定成長のサイクルを着実に進めましょう。</p>

        <FlowSteps steps={[
          { title: "Phase 1（0→100人）", desc: "アカウント基盤を整備し、既存顧客から友だちを集める" },
          { title: "Phase 2（100→300人）", desc: "オンライン導線を整備し、自然流入を増やす" },
          { title: "Phase 3（300→600人）", desc: "広告・キャンペーンで成長を加速" },
          { title: "Phase 4（600→1000人）", desc: "口コミ・紹介の仕組みで安定成長" },
        ]} />
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
    </>
  );
}
