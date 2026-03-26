import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, {
  InlineCTA,
  Callout,
  ComparisonTable,
  BarChart,
  StatGrid,
  FlowSteps,
  ResultCard,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "clinic-line-message-cost-optimization")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: self.title,
  description: self.description,
  datePublished: self.date,
  dateModified: self.updatedDate || self.date,
  image: `${SITE_URL}/lp/column/${self.slug}/opengraph-image`,
  author: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL },
  publisher: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL, logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.png` } },
  mainEntityOfPage: `${SITE_URL}/lp/column/${self.slug}`,
};

const keyPoints = [
  "LINE公式アカウントの3つの料金プランと通数課金の仕組み",
  "無料メッセージ枠を最大限活用するための配信戦略",
  "セグメント配信で「無駄撃ち」を防ぎコストを削減する方法",
  "オンライン診療患者への通知メッセージ活用テクニック",
];

const toc = [
  { id: "pricing-plans", label: "LINE公式アカウントの料金プラン" },
  { id: "cost-structure", label: "通数課金の仕組みと注意点" },
  { id: "free-message", label: "無料メッセージ枠の効率的な使い方" },
  { id: "segment-cost", label: "セグメント配信でコスト削減" },
  { id: "online-notification", label: "オンライン患者の通知活用" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="業務改善" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        LINE公式アカウントは2023年6月の料金改定以降、メッセージ配信に通数課金が発生する仕組みに変更されました。友だち数が増えるほど配信コストが膨らむため、<strong>「誰に・何を・いつ送るか」を最適化する戦略</strong>が欠かせません。本記事では、クリニックがLINE通数課金を抑えながら効果的な配信を行う方法を解説します。
      </p>

      {/* ── 料金プラン ── */}
      <section>
        <h2 id="pricing-plans" className="text-xl font-bold text-gray-800">LINE公式アカウントの料金プラン</h2>
        <p>LINE公式アカウントには3つの料金プランがあり、月額固定費と無料メッセージ数が異なります。クリニックの友だち数と配信頻度に応じて最適なプランを選択しましょう。</p>

        <ComparisonTable
          headers={["項目", "コミュニケーション", "ライト", "スタンダード"]}
          rows={[
            ["月額費用", "0円", "5,000円", "15,000円"],
            ["無料メッセージ数", "200通/月", "5,000通/月", "30,000通/月"],
            ["追加メッセージ単価", "利用不可", "利用不可", "〜3円/通"],
          ]}
        />

        <Callout type="warning" title="コミュニケーションプラン・ライトプランの注意点">
          コミュニケーションプランとライトプランでは、無料枠を超えたメッセージは送信できません（追加購入不可）。友だち数が増えてきたら、スタンダードプランへの移行を検討してください。
        </Callout>

        <p>たとえば友だち数500人のクリニックが月4回配信する場合、単純計算で2,000通/月が必要です。ただし後述するセグメント配信を活用すれば、全員に送る必要はなく、実際の配信数は大幅に削減できます。</p>
      </section>

      {/* ── 通数課金の仕組み ── */}
      <section>
        <h2 id="cost-structure" className="text-xl font-bold text-gray-800">通数課金の仕組みと注意点</h2>
        <p>LINE公式アカウントの「通数」は、メッセージを送信した<strong>「人数」</strong>でカウントされます。1人に対して1回の配信で複数の吹き出し（最大3つ）を送っても「1通」としてカウントされる点を理解しておきましょう。</p>

        <StatGrid stats={[
          { value: "1", unit: "通", label: "= 1人への1回配信" },
          { value: "3", unit: "吹き出し", label: "1通あたり上限" },
          { value: "〜3", unit: "円", label: "追加メッセージ単価" },
          { value: "0", unit: "円", label: "応答メッセージ" },
        ]} />

        <h3 className="text-lg font-bold text-gray-800 mt-6">通数にカウントされないメッセージ</h3>
        <p>以下のメッセージは通数にカウントされません。これらを上手く活用することで、配信コストを抑えられます。</p>
        <ul className="space-y-2 text-gray-700">
          <li><strong>応答メッセージ</strong>：患者からのメッセージに対する自動応答（キーワード自動返信・AI自動返信含む）</li>
          <li><strong>あいさつメッセージ</strong>：友だち追加時に自動送信される最初のメッセージ</li>
          <li><strong>チャット（1:1トーク）</strong>：個別のやり取りは通数にカウントされません</li>
        </ul>

        <Callout type="success" title="チャットは無料">
          患者との1:1チャット（個別トーク）は通数に含まれません。予約確認や問い合わせ対応などの個別コミュニケーションは、コストを気にせず行えます。Lオペでは1:1トークと一斉配信を同じ画面で管理できます。
        </Callout>
      </section>

      {/* ── 無料メッセージ枠の活用 ── */}
      <section>
        <h2 id="free-message" className="text-xl font-bold text-gray-800">無料メッセージ枠の効率的な使い方</h2>
        <p>限られた無料メッセージ枠を最大限活用するためには、「配信の優先順位付け」が重要です。全ての情報を一斉配信するのではなく、ROIの高い配信から優先的に枠を使いましょう。</p>

        <BarChart data={[
          { label: "予約リマインド", value: 95, color: "#22c55e" },
          { label: "再診促進", value: 82, color: "#3b82f6" },
          { label: "健康情報", value: 45, color: "#6366f1" },
          { label: "キャンペーン", value: 38, color: "#8b5cf6" },
          { label: "お知らせ全般", value: 22, color: "#a855f7" },
        ]} unit="% 予約転換への貢献度" />

        <FlowSteps steps={[
          { title: "優先度1：予約リマインド", desc: "無断キャンセル防止に直結するため、最優先で枠を確保。通数にカウントされないチャットでの個別送信も検討します。" },
          { title: "優先度2：再診促進・フォローアップ", desc: "直接的な売上貢献が高いメッセージ。セグメント配信で対象を絞り、必要な患者にのみ送信します。" },
          { title: "優先度3：キャンペーン・お知らせ", desc: "関心の高い患者セグメントにのみ配信。タグやセグメント機能を活用して無駄な配信を削減します。" },
        ]} />

        <p><Link href="/lp/column/segment-delivery-repeat" className="text-sky-600 underline hover:text-sky-800">セグメント配信によるリピート率向上</Link>の記事では、配信対象の絞り込み方法を詳しく解説しています。</p>
      </section>

      <InlineCTA />

      {/* ── セグメント配信でコスト削減 ── */}
      <section>
        <h2 id="segment-cost" className="text-xl font-bold text-gray-800">セグメント配信でコスト削減</h2>
        <p>セグメント配信は、通数課金の最適化において最も効果的な施策です。「全員に同じメッセージを送る」一斉配信を、「必要な人に必要なメッセージだけ送る」セグメント配信に切り替えるだけで、配信コストを大幅に削減できます。</p>

        <ResultCard
          before="月間配信数 8,000通（一斉配信）"
          after="月間配信数 3,200通（セグメント配信）"
          metric="セグメント配信で配信コスト60%削減"
          description="友だち2,000人のクリニックで月4回配信の場合"
        />

        <h3 className="text-lg font-bold text-gray-800 mt-6">効果的なセグメント分類の例</h3>
        <ul className="space-y-2 text-gray-700">
          <li><strong>診療科目別</strong>：内科患者に皮膚科のキャンペーンを送らない</li>
          <li><strong>来院頻度別</strong>：定期通院中の患者と休眠患者でメッセージを変える</li>
          <li><strong>治療フェーズ別</strong>：初診・治療中・経過観察でフォロー内容を最適化</li>
          <li><strong>反応履歴別</strong>：過去の配信を開封した患者にのみ次の配信を送る</li>
        </ul>

        <Callout type="info" title="Lオペのセグメント機能">
          Lオペでは患者CRMのデータ（来院履歴・診療科・タグ・問診回答等）を使って柔軟にセグメントを作成できます。「最終来院日が60日以上前」「AGA治療中」といった条件を組み合わせて、ピンポイントな配信が可能です。
        </Callout>
      </section>

      {/* ── オンライン患者の通知活用 ── */}
      <section>
        <h2 id="online-notification" className="text-xl font-bold text-gray-800">オンライン患者の通知活用</h2>
        <p>オンライン診療の患者に対しては、通数にカウントされない<strong>通知メッセージ</strong>を活用することで、配信コストを抑えつつ手厚いフォローが可能です。</p>

        <p>具体的には、以下のタイミングで1:1チャット（通数カウント対象外）を活用できます。</p>
        <ul className="space-y-2 text-gray-700">
          <li><strong>決済完了通知</strong>：オンライン決済が完了した旨をチャットで通知</li>
          <li><strong>配送ステータス通知</strong>：処方薬の発送・到着予定をチャットで案内</li>
          <li><strong>処方薬の服用方法案内</strong>：個別メッセージとして服薬指導を送信</li>
          <li><strong>次回診察の予約案内</strong>：処方期間に合わせた個別リマインド</li>
        </ul>

        <BarChart data={[
          { label: "一斉配信（通数課金あり）", value: 100, color: "#ef4444" },
          { label: "セグメント配信", value: 40, color: "#f59e0b" },
          { label: "チャット活用併用", value: 25, color: "#22c55e" },
        ]} unit="% 相対コスト" />

        <p>オンライン診療の運営全体については<Link href="/lp/column/clinic-line-analytics" className="text-sky-600 underline hover:text-sky-800">LINE分析ダッシュボード活用ガイド</Link>で配信効果の測定方法を、<Link href="/lp/column/clinic-cost-reduction-30man" className="text-sky-600 underline hover:text-sky-800">コスト削減30万円の実践</Link>で総合的なコスト最適化を解説しています。</p>
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <p>LINE通数課金の最適化は、友だち数が増えるほど重要になるテーマです。料金プランの正しい理解に加え、セグメント配信とチャットの使い分けで配信コストを大幅に削減できます。</p>

        <Callout type="point" title="通数課金最適化の3つの鉄則">
          <ul className="space-y-1 text-gray-700">
            <li>通数カウント対象外のメッセージ（チャット・応答メッセージ）を最大活用する</li>
            <li>セグメント配信で「本当に必要な人」にだけメッセージを送る</li>
            <li>配信のROIを測定し、効果の低い配信は削減・改善する</li>
          </ul>
        </Callout>

        <p>Lオペのセグメント配信機能と患者CRMを活用すれば、配信対象の最適化を効率的に行えます。まずは現在の配信数と費用を棚卸しし、セグメント配信の導入から始めてみてください。</p>
      </section>
    </ArticleLayout>
  );
}
