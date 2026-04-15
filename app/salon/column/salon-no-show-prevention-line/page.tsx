import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, FlowSteps, BarChart, ResultCard, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "salon-no-show-prevention-line")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/salon/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/salon/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "リマインドメッセージの最適な配信タイミングは？", a: "前日の18〜20時が最も効果的です。お客様が翌日のスケジュールを確認する時間帯に届けることで、忘れ防止と心の準備を促せます。これに加え、3日前にも1通送ると事前キャンセル→再販売の機会が増えます。" },
  { q: "リマインド送りすぎるとブロックされませんか？", a: "予約に関するリマインドは「自分宛の確認通知」として受け取られるため、ブロック率はほぼ上がりません。ただし、リマインドに販促メッセージを混ぜるとブロックの原因になるので、純粋な予約確認のみにしましょう。" },
  { q: "キャンセルポリシーはLINEでどう伝えるべきですか？", a: "予約確定時の自動メッセージにキャンセルポリシー（前日18時まで無料、当日は50%、無断100%など）を明記しましょう。リマインドメッセージにも「変更・キャンセルはこちら」のリンクを設置し、無断キャンセルではなく事前連絡を促す設計にします。" },
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
  "LINEの自動リマインドで無断キャンセル率を12%→3%に改善する方法",
  "リマインドのタイミング・内容・頻度のベストプラクティス",
  "キャンセルポリシーの設計とキャンセル枠の再販売戦略",
];

const toc = [
  { id: "cost-of-no-show", label: "無断キャンセルがサロンに与える損失" },
  { id: "why-line-remind", label: "LINEリマインドが効果的な理由" },
  { id: "timing", label: "リマインドのタイミングと内容" },
  { id: "cancel-policy", label: "キャンセルポリシーの設計" },
  { id: "resale", label: "キャンセル枠の再販売" },
  { id: "results", label: "導入効果" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="無断キャンセル防止" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">サロンの無断キャンセル（ノーショー）率は一般的に<strong>8〜12%と言われています</strong>。月間予約200件のサロンなら<strong>毎月16〜24件の売上損失</strong>が発生しています。LINEの自動リマインドを活用すれば、来店率を95%以上に引き上げることが可能です。</p>

      <section>
        <h2 id="cost-of-no-show" className="text-xl font-bold text-gray-800">無断キャンセルがサロンに与える損失</h2>

        <StatGrid stats={[
          { value: "8〜12%", label: "サロン業界の平均無断キャンセル率" },
          { value: "月16〜24件", label: "月間予約200件のサロンの損失件数" },
          { value: "年96〜192万円", label: "客単価8,000円のサロンの年間損失" },
        ]} />

        <p>無断キャンセルの損失は、単にその時間の売上が失われるだけではありません。スタッフの待機時間、材料の準備ロス、他のお客様を断った機会損失まで含めると、表面上の金額以上のダメージがあります。</p>

        <Callout type="warning" title="無断キャンセルは繰り返される">
          無断キャンセルをするお客様の約60%は過去にも同じ行動をしており、対策をしなければ繰り返されます。仕組みによる防止策が不可欠です。
        </Callout>
      </section>

      <section>
        <h2 id="why-line-remind" className="text-xl font-bold text-gray-800">LINEリマインドが効果的な理由</h2>

        <ComparisonTable
          headers={["リマインド方法", "到達率", "確認率", "コスト"]}
          rows={[
            ["LINEメッセージ", "99%", "85%", "無料〜低コスト"],
            ["メール", "90%", "20〜30%", "無料"],
            ["SMS", "95%", "70%", "1通8〜15円"],
            ["電話", "60%", "60%", "スタッフ人件費"],
          ]}
        />

        <p>LINEは到達率99%、確認率85%と他のリマインド手段を圧倒しています。お客様が日常的に開くアプリで通知が届くため、見逃しが少なくなります。</p>
      </section>

      <section>
        <h2 id="timing" className="text-xl font-bold text-gray-800">リマインドのタイミングと内容</h2>

        <FlowSteps steps={[
          { title: "3日前リマインド", desc: "「ご予約の確認です。日時：〇月〇日 14:00〜 / メニュー：カット＋カラー / 変更・キャンセルはこちら」" },
          { title: "前日リマインド（18〜20時）", desc: "「明日のご予約をお待ちしております。場所：〇〇駅徒歩3分 / 駐車場：〇台あり / お気をつけてお越しください」" },
          { title: "当日リマインド（来店1時間前）", desc: "「本日14:00〜ご予約のお客様へ。お気をつけてお越しください。何かございましたらこちらにご連絡ください」" },
        ]} />

        <BarChart
          data={[
            { label: "リマインドなし", value: 12, color: "#ef4444" },
            { label: "前日のみ", value: 6, color: "#f59e0b" },
            { label: "3日前+前日", value: 3, color: "#22c55e" },
            { label: "3日前+前日+当日", value: 2, color: "#3b82f6" },
          ]}
          unit="%"
        />
      </section>

      <InlineCTA />

      <section>
        <h2 id="cancel-policy" className="text-xl font-bold text-gray-800">キャンセルポリシーの設計</h2>
        <p>リマインドと合わせて、明確なキャンセルポリシーを設定することが重要です。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">推奨キャンセルポリシー</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>2日前まで</strong> — キャンセル料なし</li>
          <li><strong>前日</strong> — 施術料金の30%</li>
          <li><strong>当日</strong> — 施術料金の50%</li>
          <li><strong>無断キャンセル</strong> — 施術料金の100%</li>
        </ul>

        <Callout type="point" title="ポリシーは「見せる」ことが目的">
          実際にキャンセル料を請求するケースは少なくても、ポリシーを明示するだけで抑止力になります。予約確定メッセージにポリシーを記載し、3日前リマインドで「変更・キャンセルはお早めにご連絡ください」と案内しましょう。
        </Callout>
      </section>

      <section>
        <h2 id="resale" className="text-xl font-bold text-gray-800">キャンセル枠の再販売</h2>
        <p>事前キャンセルが発生した場合、空いた枠を再販売する仕組みを用意しておくと損失を最小化できます。</p>

        <FlowSteps steps={[
          { title: "キャンセル待ちリスト", desc: "人気の時間帯にキャンセル待ちのお客様を登録しておく" },
          { title: "空き通知の自動配信", desc: "キャンセル発生時に「本日〇時に空きが出ました」とセグメント配信" },
          { title: "直前割引クーポン", desc: "当日の空き枠に10〜20%OFFのクーポンを配信して埋める" },
        ]} />

        <p className="mt-4">LINE予約の設定方法は<Link href="/salon/column/salon-line-reservation-setup-guide" className="text-blue-600 underline">LINE予約設定ガイド</Link>、クーポン設計は<Link href="/salon/column/salon-line-coupon-design-best-practices" className="text-blue-600 underline">クーポン設計ベストプラクティス</Link>をご参照ください。</p>
      </section>

      <section>
        <h2 id="results" className="text-xl font-bold text-gray-800">導入効果</h2>

        <ResultCard before="12%" after="3%" metric="無断キャンセル率" description="3日前＋前日のダブルリマインドで改善" />

        <StatGrid stats={[
          { value: "95%", unit: "以上", label: "来店率" },
          { value: "年72万円", label: "損失削減額（客単価8,000円・月200件）" },
          { value: "0分", label: "リマインド業務のスタッフ作業時間" },
        ]} />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>無断キャンセルは年間で100万円規模の損失</strong> — 仕組みで防止する必要がある</li>
          <li><strong>LINEリマインドは到達率・確認率ともに最高</strong> — 3日前＋前日の2回送信が最適</li>
          <li><strong>キャンセルポリシーの明示が抑止力</strong> — 請求しなくても効果あり</li>
          <li><strong>キャンセル枠の再販売で損失を最小化</strong> — 空き通知＋直前割引の仕組み</li>
        </ol>
        <p className="mt-4">Lオペ for SALONの自動リマインド機能は、予約確定→3日前→前日→当日のリマインドを完全自動化。無断キャンセルによる売上損失を大幅に削減できます。</p>
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
