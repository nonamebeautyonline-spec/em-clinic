import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "line-beauty-salon-operation-guide")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/line/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/line/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "美容サロンのLINE運用で最も効果的な施策は何ですか？", a: "予約の自動化とリマインド配信が最も効果的です。LINE上で予約が完結する仕組みを構築すると予約率が平均2倍に向上し、前日リマインドで無断キャンセルを80%削減できます。次に効果が高いのは施術後フォローメッセージで、次回予約率を35%向上させた事例があります。" },
  { q: "美容サロンの友だち数はどのくらいを目指すべきですか？", a: "個人サロンで300〜500人、中規模サロンで1,000〜3,000人、大規模サロンで5,000人以上が目安です。友だち数を増やすことも大切ですが、既存友だちのリピート率を高めることの方がLTV（顧客生涯価値）への影響は大きいです。" },
  { q: "施術写真のビフォーアフターをLINEで配信しても大丈夫ですか？", a: "お客様の同意を得た上であれば配信可能です。ただし、景品表示法の観点から「効果を保証するような表現」は避けてください。同意書のテンプレートを用意し、施術前に書面で許可を得るのがベストプラクティスです。" },
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
  "美容サロン特有のLINE活用戦略（予約自動化・施術後フォロー・誕生日クーポン）",
  "リピート率を向上させるシナリオ配信設計と顧客管理の方法",
  "ヘアサロン・エステ・ネイルなど業態別の成功パターン",
];

const toc = [
  { id: "why-beauty-line", label: "美容サロンがLINEを活用すべき理由" },
  { id: "reservation-automation", label: "予約の自動化" },
  { id: "after-care", label: "施術後フォロー設計" },
  { id: "repeat-promotion", label: "リピート促進施策" },
  { id: "segment-design", label: "セグメント配信の設計" },
  { id: "success-cases", label: "業態別の成功事例" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="美容サロンLINE運用" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">美容サロン（美容室・エステ・ネイル）のLINE運用は、<strong>予約管理の効率化とリピート率向上</strong>に直結します。予約受付の自動化、施術後フォローの自動配信、誕生日クーポンなど、美容業界に特化した施策を組み合わせることで、リピート率の大幅な改善が可能です。本記事では、美容サロンのLINE運用を予約管理からリピート促進まで完全解説します。</p>

      <section>
        <h2 id="why-beauty-line" className="text-xl font-bold text-gray-800">美容サロンがLINEを活用すべき理由</h2>

        <StatGrid stats={[
          { value: "60%", label: "次回予約しない顧客のうち「忘れていた」割合" },
          { value: "80%削減", label: "LINE予約導入後の無断キャンセル" },
          { value: "35%向上", label: "施術後フォローによるリピート率改善" },
        ]} />

        <Callout type="point" title="美容サロンにLINEが最適な理由">
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li><strong>予約管理の一元化</strong> — 電話・Web・LINEの予約を一つの管理画面で</li>
            <li><strong>リピート促進の自動化</strong> — 施術後フォロー・次回予約促進を自動配信</li>
            <li><strong>1:1コミュニケーション</strong> — スタイル相談・施術後の不安対応に最適</li>
            <li><strong>ビジュアル訴求</strong> — リッチメッセージでスタイル写真を効果的に配信</li>
          </ul>
        </Callout>
      </section>

      <section>
        <h2 id="reservation-automation" className="text-xl font-bold text-gray-800">予約の自動化</h2>
        <p>美容サロンにとって予約管理はLINE活用の最優先事項です。LINE上で予約が完結する仕組みを構築することで、電話対応の削減と予約率の向上を同時に実現できます。</p>

        <BarChart
          data={[
            { label: "電話予約", value: 30, color: "#94a3b8" },
            { label: "ホットペッパー", value: 45, color: "#3b82f6" },
            { label: "LINE予約", value: 72, color: "#22c55e" },
          ]}
          unit="%"
        />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">LINE予約で実現できること</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>スタッフ指名予約</strong> — 担当スタイリストの空き枠を表示して予約</li>
          <li><strong>メニュー別の予約枠設定</strong> — カット・カラー・パーマなど施術時間に応じた枠管理</li>
          <li><strong>自動リマインド</strong> — 前日の予約確認メッセージを自動送信</li>
          <li><strong>変更・キャンセルもLINEで完結</strong> — 電話不要で予約変更が可能</li>
        </ul>

        <p>予約システムの選び方と導入方法は<Link href="/line/column/line-reservation-system-integration" className="text-blue-600 underline">LINE予約システム導入ガイド</Link>で詳しく解説しています。</p>
      </section>

      <section>
        <h2 id="after-care" className="text-xl font-bold text-gray-800">施術後フォロー設計</h2>
        <p>施術後のフォローメッセージは、顧客満足度とリピート率を同時に向上させる強力な施策です。</p>

        <FlowSteps steps={[
          { title: "施術当日", desc: "「本日はありがとうございました。仕上がりはいかがでしょうか？」＋ホームケアのアドバイス" },
          { title: "施術3日後", desc: "「スタイリングのコツ」や「お手入れ方法」など役立つ情報を配信" },
          { title: "施術2週間後", desc: "「カラーの持ちはいかがですか？」など経過確認＋スタイル写真の共有" },
          { title: "施術1ヶ月後", desc: "「そろそろメンテナンスの時期です」＋次回予約リンク＋10%OFFクーポン" },
        ]} />

        <ResultCard before="フォローなし" after="4段階の自動フォロー" metric="60日以内リピート率" description="42% → 68%に向上（+26ポイント）" />

        <Callout type="success" title="自動化がポイント">
          施術日をトリガーにしたシナリオ配信を設定すれば、スタッフの手間をかけずに全顧客に一貫したフォローが実現します。拡張ツールのステップ配信機能を活用しましょう。
        </Callout>
      </section>

      <InlineCTA />

      <section>
        <h2 id="repeat-promotion" className="text-xl font-bold text-gray-800">リピート促進施策</h2>

        <ComparisonTable
          headers={["施策", "タイミング", "効果"]}
          rows={[
            ["施術後フォロー", "来店後1日〜1ヶ月", "リピート率+26ポイント"],
            ["誕生日クーポン", "誕生月の月初", "特別感でロイヤルティ向上"],
            ["季節のおすすめ", "季節の変わり目", "新メニューへの興味喚起"],
            ["休眠顧客復帰", "60日以上未来店", "休眠顧客の25%を復帰"],
            ["紹介キャンペーン", "施術後の満足度が高い時", "新規顧客の獲得コスト削減"],
          ]}
        />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">誕生日クーポンの設計</h3>
        <p>誕生月のお客様に特別クーポン（施術料20%OFF等）を自動配信します。「お誕生日おめでとうございます」のメッセージとともに送ることで、特別感を演出し、来店動機を強力に喚起します。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">休眠顧客の掘り起こし</h3>
        <p>60日以上来店のない顧客を「休眠顧客」として自動タグ付けし、特別オファー（初回来店時の料金で再施術等）を配信します。「お久しぶりです。最近のトレンドスタイルをご紹介します」のような再アプローチが効果的です。</p>
      </section>

      <section>
        <h2 id="segment-design" className="text-xl font-bold text-gray-800">セグメント配信の設計</h2>
        <p>美容サロンでは、以下のセグメントで配信を最適化すると効果的です。</p>

        <ComparisonTable
          headers={["セグメント", "配信内容の例", "期待効果"]}
          rows={[
            ["新規顧客", "サロン紹介・初回クーポン・スタッフ紹介", "2回目来店率の向上"],
            ["リピーター（月1回来店）", "新メニュー案内・季節のケア情報", "来店頻度の維持"],
            ["VIP（月2回以上来店）", "VIP限定メニュー・先行案内", "ロイヤルティ強化"],
            ["休眠顧客（60日以上未来店）", "復帰クーポン・トレンド情報", "休眠顧客の復帰"],
            ["メニュー別（カラー/パーマ等）", "メニュー特化のケア情報・クーポン", "クロスセルの促進"],
          ]}
        />

        <p>セグメント配信の基本設計は<Link href="/line/column/line-broadcast-vs-segment-delivery" className="text-blue-600 underline">一斉配信vsセグメント配信</Link>で比較解説しています。</p>
      </section>

      <section>
        <h2 id="success-cases" className="text-xl font-bold text-gray-800">業態別の成功事例</h2>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">ヘアサロン（友だち数2,500人）</h3>
        <StatGrid stats={[
          { value: "68%", label: "60日以内リピート率（42%→68%）" },
          { value: "月45万円", label: "LINE経由の売上増加" },
          { value: "85%", label: "LINE予約比率" },
        ]} />
        <p>施術後4段階フォロー+LINE予約+誕生日クーポンの3施策で、ホットペッパー依存からの脱却に成功。集客コストを月15万円削減しながらリピート率を大幅に改善しました。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">エステサロン（友だち数800人）</h3>
        <StatGrid stats={[
          { value: "3.2倍", label: "初回体験からの本契約率" },
          { value: "25%", label: "休眠顧客の復帰率" },
          { value: "月20万円", label: "広告費の削減" },
        ]} />
        <p>初回体験後のシナリオ配信（3日後にお肌の変化確認→7日後に効果説明→14日後に本契約クーポン）で、初回体験からの本契約率を3.2倍に向上。休眠顧客への限定オファーでも高い復帰率を実現しました。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">ネイルサロン（友だち数1,200人）</h3>
        <StatGrid stats={[
          { value: "42%", label: "デザインギャラリー経由の予約率" },
          { value: "2.1倍", label: "リピート率の向上" },
          { value: "90%", label: "リマインドによる来店率" },
        ]} />
        <p>リッチメニューにデザインギャラリーを設置し、最新ネイルデザインを定期配信。気に入ったデザインからそのまま予約できるフローが高い予約率につながりました。</p>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>予約自動化が最優先</strong> — LINE予約でCVR2倍、無断キャンセル80%削減を実現</li>
          <li><strong>施術後フォローの自動化</strong> — 4段階のシナリオ配信でリピート率+26ポイント</li>
          <li><strong>誕生日クーポン+休眠復帰施策</strong> — ロイヤルティ向上と休眠顧客の掘り起こし</li>
          <li><strong>5セグメントで配信を最適化</strong> — 新規・リピーター・VIP・休眠・メニュー別</li>
          <li><strong>ビジュアル訴求を活用</strong> — スタイル写真・デザインギャラリーで予約動機を喚起</li>
        </ol>
        <p className="mt-4">美容サロンのリッチメニュー設計例は<Link href="/line/column/line-rich-menu-design-examples-20" className="text-blue-600 underline">デザイン事例20選</Link>の美容サロン事例、配信タイミングの最適化は<Link href="/line/column/line-delivery-best-time-frequency" className="text-blue-600 underline">最適な配信頻度・時間帯</Link>もご参照ください。</p>
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
