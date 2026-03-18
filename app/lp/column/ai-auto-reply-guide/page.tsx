import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable, DonutChart } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles[14];

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
  dateModified: self.date,
  image: `${SITE_URL}/lp/opengraph-image`,
  author: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL },
  publisher: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL, logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.png` } },
  mainEntityOfPage: `${SITE_URL}/lp/column/${self.slug}`,
};

const keyPoints = [
  "夜間・休日の問い合わせ対応が新患獲得に直結する理由とデータ",
  "ルールベースとAI自動返信の違いおよび精度を上げる方法",
  "導入ステップからエスカレーション設計、効果測定までの実践ガイド",
];

const toc = [
  { id: "why-after-hours", label: "営業時間外対応が重要な理由" },
  { id: "rule-vs-ai", label: "AI自動返信の仕組み" },
  { id: "inquiry-types", label: "対応できる問い合わせの種類" },
  { id: "improve-accuracy", label: "AI自動返信の精度を上げる方法" },
  { id: "implementation-steps", label: "導入ステップ" },
  { id: "escalation-design", label: "エスカレーション設計" },
  { id: "results", label: "導入効果" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="AI自動返信" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section>
        <h2 id="why-after-hours" className="text-xl font-bold text-gray-800">夜間・休日の問い合わせ対応が重要な理由</h2>
        <p>クリニックを探している患者の多くは、仕事や家事が落ち着いた夜間や、時間に余裕のある休日に情報収集を行います。</p>

        <DonutChart percentage={70} label="営業時間外" sublabel="初回問い合わせの70%が営業時間外に発生" />

        <Callout type="warning" title="営業時間外の機会損失">
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li><strong>他院への流出</strong> — 即座に返信がないと次のクリニックを検索。最初に返信したクリニックが選ばれる傾向</li>
            <li><strong>予約の先延ばし</strong> — 「明日電話しよう」と思っても翌日には忘れてしまう</li>
            <li><strong>患者の不安放置</strong> — 施術後の相談に即座に対応できず、満足度が大幅に低下</li>
          </ul>
        </Callout>

        <Callout type="success" title="AI自動返信で解決">
          24時間365日の問い合わせ対応が実現し、患者が「聞きたい」と思ったその瞬間に回答を返すことで、新患獲得率とリピート率の両方を向上させることが可能です。新患獲得の前段としてLINE友だちを増やす方法は<Link href="/lp/column/clinic-line-friends-growth" className="text-blue-600 underline">LINE友だち集め月100人増やす7つの施策</Link>で解説しています。
        </Callout>
      </section>

      <section>
        <h2 id="rule-vs-ai" className="text-xl font-bold text-gray-800">AI自動返信の仕組み — ルールベース vs AI</h2>
        <p>LINE公式アカウントの自動返信には、大きく分けて2つの方式があります。</p>

        <ComparisonTable
          headers={["比較項目", "ルールベース方式", "AI方式"]}
          rows={[
            ["仕組み", "キーワード一致で定型文返信", "自然言語理解で回答を生成"],
            ["表記ゆれ対応", false, true],
            ["複雑な質問", false, true],
            ["設定の手軽さ", true, false],
            ["誤回答リスク", "低い", "あり（改善可能）"],
            ["コスト", "安い", "やや高い"],
            ["向いているケース", "FAQ 5〜10パターン程度", "多様な問い合わせがあるクリニック"],
          ]}
        />

        <Callout type="point" title="ハイブリッド方式がおすすめ">
          予約リンクやアクセス情報などの定型回答はルールベースで即座に返し、複雑な質問や曖昧な問い合わせはAIが対応。正確性とコストのバランスを最適化できます。
        </Callout>
      </section>

      <section>
        <h2 id="inquiry-types" className="text-xl font-bold text-gray-800">クリニックのAI自動返信で対応できる問い合わせの種類</h2>

        <BarChart
          data={[
            { label: "AI対応可能", value: 60, color: "#22c55e" },
            { label: "条件付きAI対応", value: 25, color: "#f59e0b" },
            { label: "人間対応が必要", value: 15, color: "#ef4444" },
          ]}
          unit="%"
        />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">AI対応可能な問い合わせ（全体の約60%）</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>診療時間・休診日</strong> — 「土曜日は何時まで開いていますか？」</li>
          <li><strong>アクセス・駐車場</strong> — 「駐車場はありますか？」</li>
          <li><strong>予約方法</strong> — 「予約は必要ですか？」「当日予約はできますか？」</li>
          <li><strong>対応診療内容</strong> — 「二重整形はやっていますか？」</li>
          <li><strong>費用の目安</strong> — 「初診料はいくらですか？」</li>
          <li><strong>持ち物・準備</strong> — 「初診で何を持っていけばいいですか？」</li>
        </ul>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">条件付きでAI対応可能（全体の約25%）</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>施術の詳細質問</strong> — ナレッジベースに情報があれば回答可能</li>
          <li><strong>施術後の経過相談</strong> — 一般的な回答はAI、個別判断はスタッフへ</li>
          <li><strong>保険適用の確認</strong> — 一般論はAI、個別判断は医師へ</li>
        </ul>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">人間対応が必要（全体の約15%）</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>医療的な判断が必要な相談</strong> — 症状の診断に関わる質問</li>
          <li><strong>クレーム・苦情</strong> — 感情的な対応が必要なケース</li>
          <li><strong>複雑な予約変更</strong> — 複数の条件を調整する必要があるケース</li>
          <li><strong>個人情報に関わる対応</strong> — カルテ情報の照会、検査結果の通知</li>
        </ul>

        <Callout type="success" title="スタッフの業務を半分以上削減">
          AI対応可能な問い合わせが全体の60%を占めるということは、スタッフの問い合わせ対応業務の半分以上をAIに任せられるということです。AI自動返信と組み合わせて<Link href="/lp/column/rich-menu-design" className="text-blue-600 underline">リッチメニュー設計</Link>を最適化すると、患者のセルフサービス率をさらに高められます。
        </Callout>
      </section>

      <InlineCTA />

      <section>
        <h2 id="improve-accuracy" className="text-xl font-bold text-gray-800">AI自動返信の精度を上げる方法</h2>
        <p>AI自動返信の成功は、回答の精度にかかっています。的外れな回答を返せば、患者の信頼を失い、ブロックにもつながります。</p>

        <FlowSteps steps={[
          { title: "ナレッジベースの整備", desc: "診療時間・メニュー詳細・FAQ・注意事項など正確で最新の情報を構造化して登録" },
          { title: "スタッフ修正フィードバック", desc: "AIの自動返信をスタッフが確認・修正。修正パターンをAIの学習データとして蓄積" },
          { title: "回答できない場合のハンドリング", desc: "「スタッフが確認のうえ返信します」と案内。緊急時は電話番号を提示" },
        ]} />

        <ResultCard before="70%" after="90%+" metric="AI回答の正答率" description="スタッフ修正フィードバックの蓄積で3ヶ月で大幅改善" />

        <Callout type="point" title="ナレッジベースの品質が最重要">
          「多ければ多いほどよい」わけではありません。正確で最新の情報を、構造化された形式で整理することが重要です。情報が古かったり矛盾していると、AIの回答精度が低下します。
        </Callout>
      </section>

      <section>
        <h2 id="implementation-steps" className="text-xl font-bold text-gray-800">導入ステップ — ナレッジ整備からテスト、段階リリースまで</h2>
        <p>AI自動返信の導入は、一度に全機能を有効化するのではなく、段階的に進めることがポイントです。</p>

        <FlowSteps steps={[
          { title: "ステップ1: ナレッジベース整備（1〜2週間）", desc: "過去の問い合わせ分析→FAQ作成→クリニック情報の構造化→医師・スタッフによるレビュー" },
          { title: "ステップ2: テスト運用（2〜4週間）", desc: "スタッフが様々なパターンで質問→AIの回答を検証→精度80%以上になるまで調整" },
          { title: "ステップ3: 段階リリース（1〜2ヶ月）", desc: "営業時間外のみ有効化→FAQ対応を切替→対応範囲を徐々に拡大" },
          { title: "ステップ4: 継続改善（運用開始後〜）", desc: "週次で回答ログ確認・修正→ナレッジ更新→月次で正答率・満足度を分析" },
        ]} />
      </section>

      <section>
        <h2 id="escalation-design" className="text-xl font-bold text-gray-800">AIが対応できない場合のエスカレーション設計</h2>

        <Callout type="warning" title="エスカレーション設計の重要性">
          エスカレーション設計を誤ると、医療事故やクレームにつながるリスクがあります。AIが対応すべきでない場合に確実に人間にバトンタッチする仕組みが最も重要です。
        </Callout>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">即座にエスカレーションすべきケース</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>緊急性の高い症状相談</strong> — 大量出血、激しい痛みなど</li>
          <li><strong>医療的判断が必要な質問</strong> — 薬の併用可否など</li>
          <li><strong>感情的なメッセージ</strong> — クレーム・不満・怒りを含むメッセージ</li>
          <li><strong>個人情報に関わる問い合わせ</strong> — 検査結果・処方内容の照会</li>
        </ul>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">エスカレーションフロー</h3>

        <FlowSteps steps={[
          { title: "AIが判断", desc: "メッセージ内容から自動対応可能かエスカレーション必要かを判定" },
          { title: "患者への即時応答", desc: "「確認してご返信いたします」と即座に応答。放置感を与えない" },
          { title: "スタッフへの通知", desc: "管理画面に通知を表示。緊急の場合はSlackやLINEにも通知" },
          { title: "対応期限の設定", desc: "緊急: 30分以内、通常: 営業時間内、低優先: 24時間以内" },
          { title: "対応完了の記録", desc: "スタッフの対応内容をログに記録。AIの学習データとしても活用" },
        ]} />
      </section>

      <section>
        <h2 id="results" className="text-xl font-bold text-gray-800">導入効果: 新患獲得率・対応コストの改善</h2>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">ケース1: 美容皮膚科クリニック（友だち数2,800人）</h3>

        <StatGrid stats={[
          { value: "0→88%", label: "夜間問い合わせ即時対応率" },
          { value: "60%", unit: "増", label: "新患の予約率（20→32件/月）" },
          { value: "18h→2h", label: "問い合わせ→予約の平均時間" },
        ]} />

        <ResultCard before="1日2時間" after="1日40分" metric="スタッフの問い合わせ対応時間" description="AI対応で対応工数を約67%削減" />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">ケース2: 内科クリニック（友だち数1,500人）</h3>

        <StatGrid stats={[
          { value: "62%", label: "AI自動対応率" },
          { value: "73→92%", label: "AI正答率（1ヶ月→3ヶ月）" },
          { value: "4.2", unit: "/5", label: "患者満足度（スタッフ4.3とほぼ同等）" },
        ]} />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">ROI（投資対効果）の試算</h3>

        <BarChart
          data={[
            { label: "AI自動返信の月額コスト", value: 2, color: "#ef4444" },
            { label: "新患獲得による売上増", value: 12, color: "#22c55e" },
            { label: "スタッフ工数削減効果", value: 6, color: "#3b82f6" },
          ]}
          unit="万円"
        />

        <Callout type="success" title="投資の9倍のリターン">
          月額コスト約2万円に対し、合計効果は月18万円。投資の9倍のリターンが期待できます。
        </Callout>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ: AI自動返信で24時間対応を実現</h2>

        <StatGrid stats={[
          { value: "70%", label: "営業時間外の問い合わせ比率" },
          { value: "60%", label: "AIで対応可能な問い合わせ" },
          { value: "9", unit: "倍", label: "投資対効果（ROI）" },
        ]} />

        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>営業時間外対応が新患獲得の鍵</strong> — 問い合わせの70%が営業時間外。即時対応で他院への流出を防ぐ</li>
          <li><strong>ハイブリッド方式で精度とコストを最適化</strong> — 定型回答はルールベース、複雑な質問はAIで対応</li>
          <li><strong>スタッフ修正フィードバックで精度向上</strong> — 運用しながら学習データを蓄積し、3ヶ月で正答率90%以上へ。的外れな回答によるブロックを防ぐコツは<Link href="/lp/column/line-block-rate-reduction" className="text-blue-600 underline">ブロック率を下げる5つの鉄則</Link>も参考になります</li>
          <li><strong>段階的に導入</strong> — いきなり全面導入ではなく、営業時間外→FAQ→対応範囲拡大と段階的にリリース</li>
          <li><strong>エスカレーション設計が最重要</strong> — AIが対応すべきでないケースを明確に定義し、確実に人間にバトンタッチ</li>
        </ol>
        <p className="mt-4">Lオペ for CLINICのAI自動返信は、クリニック向けに最適化されたナレッジベースとスタッフ修正フィードバック機能を標準搭載。導入から運用改善まで一貫してサポートします。24時間の問い合わせ対応で、新患獲得を最大化しませんか。</p>
      </section>
    </ArticleLayout>
  );
}
