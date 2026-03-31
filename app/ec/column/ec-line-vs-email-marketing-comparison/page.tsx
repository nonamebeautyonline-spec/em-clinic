import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable, DonutChart } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "ec-line-vs-email-marketing-comparison")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/ec/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/ec/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "LINEとメールはどちらを優先すべきですか？", a: "即時性と開封率を重視するならLINE、長文コンテンツやSEO目的のニュースレターにはメールが適しています。最も効果的なのは両方を目的別に使い分けるハイブリッド運用です。" },
  { q: "LINE配信はメール配信より費用がかかりますか？", a: "1通あたりのコストはLINEの方が高い傾向ですが、開封率・クリック率が3〜5倍のため、CVあたりのコスト（CPA）で見るとLINEの方が効率的です。特にカゴ落ちリマインドではLINEのROIが圧倒的です。" },
  { q: "メール配信からLINEに完全移行すべきですか？", a: "完全移行は推奨しません。メールにはSEO効果やアーカイブ性といったLINEにない強みがあります。カゴ落ちリマインド・発送通知・緊急セールはLINE、週刊ニュースレター・ブランドストーリーはメールという使い分けが最適です。" },
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
  "LINE vs メールの開封率・クリック率・CV率をデータで徹底比較",
  "EC施策別の最適チャネル選定ガイド",
  "ハイブリッド運用で売上を最大化する方法",
];

const toc = [
  { id: "overview", label: "EC事業者のチャネル選定の課題" },
  { id: "data-comparison", label: "数値データで徹底比較" },
  { id: "use-case-comparison", label: "施策別の向き不向き" },
  { id: "cost-comparison", label: "コスト効率の比較" },
  { id: "hybrid-strategy", label: "ハイブリッド運用戦略" },
  { id: "migration-steps", label: "LINE導入のステップ" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="LINE vs メール比較" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">EC事業者にとってLINEとメールのどちらを優先すべきかは大きな関心事です。結論から言えば、LINEの開封率はメールの<strong>約3倍</strong>、カゴ落ち回収率は<strong>約3倍</strong>。ただし最適解は「使い分け」にあります。本記事では実データに基づく比較と具体的な運用戦略を解説します。</p>

      <section>
        <h2 id="overview" className="text-xl font-bold text-gray-800">EC事業者のチャネル選定の課題</h2>
        <p>多くのEC事業者は長年メールマーケティングを主軸としてきましたが、メールの開封率は年々低下しています。一方でLINEの普及率は国内最高水準に達し、新たなマーケティングチャネルとして注目を集めています。</p>

        <DonutChart percentage={60} label="LINE開封率" sublabel="メールの開封率15〜20%に対し、LINEは60〜80%を達成" />

        <Callout type="warning" title="メール開封率の低下トレンド">
          EC事業者のメール開封率は2020年の22%から2025年には15%まで低下。Gmailの「プロモーション」タブ振り分け強化やプライバシー保護による影響が大きく、今後も低下傾向が続くと予測されています。
        </Callout>
      </section>

      <section>
        <h2 id="data-comparison" className="text-xl font-bold text-gray-800">数値データで徹底比較</h2>

        <ComparisonTable
          headers={["指標", "メール", "LINE", "倍率"]}
          rows={[
            ["開封率", "15〜20%", "60〜80%", "3〜4倍"],
            ["クリック率", "2〜3%", "10〜25%", "5〜8倍"],
            ["CV率（配信起点）", "0.3〜0.5%", "1.5〜3.0%", "5〜6倍"],
            ["カゴ落ち回収率", "5〜8%", "15〜25%", "3倍"],
            ["到達率", "80〜90%", "98%以上", "—"],
            ["即時開封（1時間以内）", "10〜15%", "50〜60%", "4〜5倍"],
          ]}
        />

        <BarChart
          data={[
            { label: "開封率", value: 70, color: "#22c55e" },
            { label: "クリック率", value: 18, color: "#3b82f6" },
            { label: "CV率", value: 2.3, color: "#f59e0b" },
          ]}
          unit="%（LINE平均）"
        />

        <Callout type="success" title="特にカゴ落ち対策でLINEが圧倒的">
          カゴ落ちリマインドの回収率はメールの5〜8%に対しLINEは15〜25%。月商500万円のECサイトの場合、LINEカゴ落ち対策だけで月50〜100万円の売上回復が見込めます。
        </Callout>
      </section>

      <section>
        <h2 id="use-case-comparison" className="text-xl font-bold text-gray-800">施策別の向き不向き</h2>

        <ComparisonTable
          headers={["施策", "LINE", "メール", "推奨"]}
          rows={[
            ["カゴ落ちリマインド", true, false, "LINE"],
            ["発送・配達通知", true, false, "LINE"],
            ["タイムセール告知", true, false, "LINE"],
            ["再入荷通知", true, false, "LINE"],
            ["週刊ニュースレター", false, true, "メール"],
            ["ブランドストーリー", false, true, "メール"],
            ["商品レビュー依頼", true, true, "LINE優先"],
            ["誕生日クーポン", true, true, "LINE優先"],
          ]}
        />
      </section>

      <InlineCTA />

      <section>
        <h2 id="cost-comparison" className="text-xl font-bold text-gray-800">コスト効率の比較</h2>

        <ComparisonTable
          headers={["コスト項目", "メール", "LINE"]}
          rows={[
            ["1通あたり単価", "0.5〜2円", "3〜5円"],
            ["CV1件あたりコスト", "100〜300円", "50〜150円"],
            ["カゴ落ち回収1件あたり", "500〜1,000円", "150〜300円"],
            ["月額固定費", "3,000〜30,000円", "5,000〜15,000円"],
          ]}
        />

        <ResultCard before="500〜1,000円" after="150〜300円" metric="カゴ落ち回収1件あたりコスト" description="1通単価は高いが、CV効率はLINEが圧倒的" />
      </section>

      <section>
        <h2 id="hybrid-strategy" className="text-xl font-bold text-gray-800">ハイブリッド運用戦略</h2>
        <p>LINEとメールの両方を活用するハイブリッド運用が最もROIが高くなります。</p>

        <FlowSteps steps={[
          { title: "LINE担当施策", desc: "カゴ落ちリマインド・発送通知・タイムセール・再入荷通知・緊急告知。即時性と高開封率が必要な施策" },
          { title: "メール担当施策", desc: "週刊ニュースレター・ブランドストーリー・詳細な商品説明・長文コンテンツ。SEOとアーカイブ性が重要な施策" },
          { title: "両方活用", desc: "新商品ローンチ・大型セール告知。LINEで速報→メールで詳細を送る2段構え" },
        ]} />

        <Callout type="point" title="LINE単独よりハイブリッドが効果的">
          LINE単独運用の場合と比較して、ハイブリッド運用は売上貢献額が約30%高いというデータがあります。両チャネルの特性を理解し、施策ごとに使い分けることがポイントです。
        </Callout>
      </section>

      <section>
        <h2 id="migration-steps" className="text-xl font-bold text-gray-800">メール中心からLINE導入へのステップ</h2>

        <FlowSteps steps={[
          { title: "Phase 1: LINE公式アカウント開設", desc: "アカウント開設→ECカート連携→友だち獲得施策の開始" },
          { title: "Phase 2: カゴ落ちリマインドをLINEに移行", desc: "最もROIが高いカゴ落ち施策からLINE配信に切り替え" },
          { title: "Phase 3: 発送通知をLINEに移行", desc: "注文確認・発送完了・配達完了の通知をLINEで自動化" },
          { title: "Phase 4: セグメント配信の最適化", desc: "購買データに基づくLINEセグメント配信。メールは長文コンテンツに特化" },
        ]} />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <StatGrid stats={[
          { value: "3〜4", unit: "倍", label: "LINEの開封率優位" },
          { value: "3", unit: "倍", label: "カゴ落ち回収率の差" },
          { value: "30%", unit: "UP", label: "ハイブリッド運用の効果" },
        ]} />

        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>LINEは開封率・CV率でメールを圧倒</strong> — 特にカゴ落ち対策・発送通知で効果が顕著</li>
          <li><strong>コスト効率もLINE優位</strong> — 1通単価は高いが、CV1件あたりのコストはLINEの方が安い</li>
          <li><strong>最適解はハイブリッド運用</strong> — 即時性が必要な施策はLINE、長文コンテンツはメールと使い分け</li>
          <li><strong>カゴ落ち対策から移行を開始</strong> — 最もROIが高い施策からLINEに切り替えると効果を実感しやすい。具体的なカゴ落ち対策は<Link href="/ec/column/line-cart-abandonment-recovery-guide" className="text-blue-600 underline">カゴ落ち回収ガイド</Link>で解説しています</li>
        </ol>
        <p className="mt-4">Lオペ for ECは、LINEとメールのハイブリッド運用を支援する機能を標準搭載。<Link href="/ec/column/ec-line-official-account-guide-2026" className="text-blue-600 underline">EC×LINE活用入門</Link>も合わせてご覧ください。</p>
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
