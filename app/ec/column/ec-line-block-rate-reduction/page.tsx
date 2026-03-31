import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "ec-line-block-rate-reduction")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/ec/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/ec/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "ECサイトのLINEブロック率の適正値はどのくらいですか？", a: "月間ブロック率2%以下が健全な水準です。3〜5%なら改善の余地あり、5%を超えている場合は配信頻度や内容を早急に見直す必要があります。" },
  { q: "ブロックされた友だちを復帰させることはできますか？", a: "直接メッセージを送ることはできませんが、ECサイト上のバナーやメルマガで「LINEを再登録すると○○クーポンプレゼント」と案内することで、一部の顧客が再追加するケースがあります。" },
  { q: "配信頻度はどのくらいが最適ですか？", a: "週1〜2回が最適です。毎日配信するとブロック率が3倍に上昇するデータがあります。セグメント配信であれば、同じ頻度でもブロック率を低く抑えられます。" },
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
  "ブロック率が上がる5つの原因と具体的な改善策",
  "配信頻度・内容・セグメントの最適化でブロック率50%削減",
  "ブロック率のベンチマークと月次モニタリングの方法",
];

const toc = [
  { id: "block-causes", label: "ブロック率が上がる原因" },
  { id: "method1", label: "配信頻度の最適化" },
  { id: "method2", label: "セグメント精度の向上" },
  { id: "method3", label: "コンテンツの質を上げる" },
  { id: "method4", label: "配信時間帯の最適化" },
  { id: "method5", label: "オプトアウト選択肢の提供" },
  { id: "method6", label: "友だち追加時の期待値設定" },
  { id: "method7", label: "月次モニタリング" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="ブロック率改善" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">ECサイトのLINE配信で月間ブロック率が<strong>5%を超えている</strong>なら、配信戦略の見直しが急務です。本記事では、ブロック率を<strong>50%削減</strong>するための7つの具体的な方法を、データとともに解説します。</p>

      <section>
        <h2 id="block-causes" className="text-xl font-bold text-gray-800">ブロック率が上がる5つの原因</h2>

        <BarChart
          data={[
            { label: "配信頻度が高すぎる", value: 42, color: "#ef4444" },
            { label: "自分に関係ない内容", value: 28, color: "#f59e0b" },
            { label: "セール情報ばかり", value: 15, color: "#3b82f6" },
            { label: "深夜・早朝の配信", value: 9, color: "#8b5cf6" },
            { label: "クーポン目的で追加しただけ", value: 6, color: "#ec4899" },
          ]}
          unit="%（ブロック理由の内訳）"
        />

        <Callout type="warning" title="配信頻度が最大の原因">
          ブロック理由の42%は「配信頻度が高すぎる」こと。週3回以上の一斉配信は、友だちの4人に1人がブロックを検討するという調査結果があります。
        </Callout>
      </section>

      <section>
        <h2 id="method1" className="text-xl font-bold text-gray-800">方法1: 配信頻度の最適化</h2>

        <ComparisonTable
          headers={["配信頻度", "月間ブロック率", "評価"]}
          rows={[
            ["毎日", "8〜12%", "多すぎ"],
            ["週3回", "5〜8%", "やや多い"],
            ["週2回", "2〜4%", "適切"],
            ["週1回", "1〜2%", "最適"],
            ["月2回", "0.5〜1%", "少なめ"],
          ]}
        />

        <ResultCard before="毎日配信（ブロック率10%）" after="週1〜2回配信（ブロック率2%）" metric="月間ブロック率" description="配信頻度を下げるだけでブロック率80%削減" />
      </section>

      <section>
        <h2 id="method2" className="text-xl font-bold text-gray-800">方法2: セグメント精度の向上</h2>
        <p>「自分に関係ない内容」がブロック理由の28%を占めます。セグメント配信に切り替えるだけでブロック率を半減できます。</p>

        <FlowSteps steps={[
          { title: "購買カテゴリで分類", desc: "アパレル購入者にアパレル情報、食品購入者に食品情報。クロスカテゴリは送らない" },
          { title: "購入ステージで分類", desc: "新規・リピーター・VIP・休眠で配信内容を変える" },
          { title: "性別・年代で分類", desc: "メンズ商品購入者にレディース情報を送らない。基本中の基本" },
        ]} />

        <p>セグメント配信の詳しい設計方法は<Link href="/ec/column/ec-segment-delivery-purchase-data" className="text-blue-600 underline">購買データ活用のセグメント配信</Link>で解説しています。</p>
      </section>

      <section>
        <h2 id="method3" className="text-xl font-bold text-gray-800">方法3: コンテンツの質を上げる</h2>

        <ComparisonTable
          headers={["コンテンツ種類", "ブロック影響", "推奨比率"]}
          rows={[
            ["セール・割引情報", "高い（多すぎると離脱）", "30%以下"],
            ["新商品情報", "低い", "20〜30%"],
            ["お役立ちコンテンツ", "非常に低い", "30〜40%"],
            ["発送・注文通知", "なし（歓迎される）", "必要時"],
            ["レビュー・UGC", "低い", "10〜20%"],
          ]}
        />

        <Callout type="point" title="「7:3の法則」">
          配信内容の70%を「価値提供（お役立ち情報・新商品紹介・レビュー）」、30%を「販売促進（セール・クーポン）」にするのが黄金比です。セール情報ばかりだと「広告チャネル」と認識されブロックが増加します。
        </Callout>
      </section>

      <InlineCTA />

      <section>
        <h2 id="method4" className="text-xl font-bold text-gray-800">方法4: 配信時間帯の最適化</h2>

        <BarChart
          data={[
            { label: "8:00〜10:00", value: 12, color: "#3b82f6" },
            { label: "12:00〜13:00", value: 18, color: "#22c55e" },
            { label: "18:00〜20:00", value: 20, color: "#22c55e" },
            { label: "20:00〜22:00", value: 15, color: "#3b82f6" },
            { label: "22:00〜8:00", value: 3, color: "#ef4444" },
          ]}
          unit="%（時間帯別クリック率）"
        />

        <p>最もクリック率が高いのは<strong>18:00〜20:00</strong>と<strong>12:00〜13:00</strong>。22:00以降の配信はブロック率を2〜3倍に引き上げるため絶対に避けましょう。</p>
      </section>

      <section>
        <h2 id="method5" className="text-xl font-bold text-gray-800">方法5: オプトアウト選択肢の提供</h2>
        <p>「全てブロック」か「全て受信」の二択ではなく、配信頻度や内容を選べるオプションを提供します。</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>配信カテゴリの選択</strong> — 「セール情報のみ」「新商品情報のみ」等を選択可能に</li>
          <li><strong>配信頻度の選択</strong> — 「週1回」「月2回」等の頻度を選択可能に</li>
          <li><strong>一時停止オプション</strong> — 「1ヶ月間配信停止」の選択肢。ブロックよりも復帰率が高い</li>
        </ul>
      </section>

      <section>
        <h2 id="method6" className="text-xl font-bold text-gray-800">方法6: 友だち追加時の期待値設定</h2>
        <p>友だち追加時に「どんな情報がどのくらいの頻度で届くか」を明示しておくと、ミスマッチによるブロックを予防できます。</p>

        <Callout type="success" title="ウェルカムメッセージで期待値を設定">
          「週1回、新商品情報とLINE限定クーポンをお届けします」と初回メッセージで伝えるだけで、ブロック率が20%低下したという報告があります。
        </Callout>
      </section>

      <section>
        <h2 id="method7" className="text-xl font-bold text-gray-800">方法7: 月次モニタリング</h2>

        <ComparisonTable
          headers={["KPI", "健全水準", "要注意水準", "危険水準"]}
          rows={[
            ["月間ブロック率", "2%以下", "2〜5%", "5%以上"],
            ["配信あたりブロック率", "0.3%以下", "0.3〜1%", "1%以上"],
            ["累計ブロック率", "15%以下", "15〜30%", "30%以上"],
          ]}
        />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>配信頻度を週1〜2回に抑える</strong> — 毎日配信はブロック率10%超の原因</li>
          <li><strong>セグメント配信で「自分宛て」感を出す</strong> — 関係ない情報はブロック直結</li>
          <li><strong>7:3の法則でコンテンツ比率を守る</strong> — 価値提供70%、販売促進30%</li>
          <li><strong>月次でKPIをモニタリング</strong> — ブロック率の推移を追い続けることが重要。配信全体の改善は<Link href="/ec/column/ec-line-ab-test-best-practices" className="text-blue-600 underline">A/Bテスト実践ガイド</Link>で、リピート促進は<Link href="/ec/column/ec-repeat-purchase-scenario" className="text-blue-600 underline">リピート購入シナリオ</Link>も参照</li>
        </ol>
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
