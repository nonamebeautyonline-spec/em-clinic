import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "line-auto-reply-setup-guide")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/line/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/line/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "自動応答とチャットは同時に使えますか？", a: "はい、LINE公式アカウントでは「スマートチャット」モードを使うことで、営業時間内はチャット対応、営業時間外は自動応答という使い分けが可能です。拡張ツールを使えば、キーワード応答と手動チャットの併用もできます。" },
  { q: "キーワード応答で設定すべき最低限のキーワードは？", a: "業種を問わず「営業時間」「アクセス」「予約」「料金」「メニュー」の5つは必須です。これらのキーワードで問い合わせの60〜70%をカバーできます。運用しながら、よくある質問を追加していくのが効果的です。" },
  { q: "AI応答の精度が低い場合はどうすればいいですか？", a: "まずはナレッジベース（FAQ・営業情報・メニュー情報等）を充実させることが最優先です。次に、AIの回答をスタッフが確認・修正するフィードバックループを構築し、学習データを蓄積します。通常1〜3ヶ月で精度が大幅に向上します。" },
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
  "LINE公式アカウントの3つの自動応答タイプ（一律/キーワード/AI）の使い分け",
  "キーワード応答の設定方法と効果的なキーワード設計のコツ",
  "AI応答の導入手順と精度を高めるためのフィードバック設計",
];

const toc = [
  { id: "auto-reply-types", label: "自動応答の3つのタイプ" },
  { id: "keyword-setup", label: "キーワード応答の設定" },
  { id: "ai-response", label: "AI応答の導入" },
  { id: "time-based", label: "時間帯別の応答切り替え" },
  { id: "rich-menu-linkage", label: "リッチメニュー連動" },
  { id: "improvement", label: "応答精度の改善サイクル" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="自動応答設定" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">LINE公式アカウントの自動応答機能を活用すれば、<strong>24時間365日の問い合わせ対応</strong>を実現できます。キーワード応答で定型質問に即座に回答し、AI応答で複雑な質問にも対応。本記事では、自動応答の種類・設定方法・精度を高めるコツまで、完全ガイドとして解説します。</p>

      <section>
        <h2 id="auto-reply-types" className="text-xl font-bold text-gray-800">自動応答の3つのタイプ</h2>

        <ComparisonTable
          headers={["タイプ", "仕組み", "メリット", "デメリット"]}
          rows={[
            ["一律応答", "全メッセージに同じ返信", "設定が簡単", "柔軟性がない"],
            ["キーワード応答", "特定キーワードに対応する返信", "正確な回答が可能", "登録外の質問に対応不可"],
            ["AI応答", "自然言語理解で回答を生成", "多様な質問に対応", "精度向上に時間がかかる"],
          ]}
        />

        <BarChart
          data={[
            { label: "一律応答", value: 20, color: "#94a3b8" },
            { label: "キーワード応答", value: 65, color: "#3b82f6" },
            { label: "AI応答", value: 85, color: "#22c55e" },
          ]}
          unit="%"
        />

        <Callout type="point" title="ハイブリッド運用が最も効果的">
          定型質問はキーワード応答で正確に返し、キーワードに該当しない質問はAI応答で対応する「ハイブリッド運用」が、コストと精度のバランスに優れています。
        </Callout>
      </section>

      <section>
        <h2 id="keyword-setup" className="text-xl font-bold text-gray-800">キーワード応答の設定方法</h2>

        <FlowSteps steps={[
          { title: "よくある質問を洗い出す", desc: "過去の問い合わせ履歴を分析し、頻度の高い質問を10〜20個リストアップ" },
          { title: "キーワードと回答を作成", desc: "各質問に対するキーワード（表記ゆれ含む）と回答文を作成。1つの質問に対し3〜5個のキーワードを設定" },
          { title: "管理画面で設定", desc: "LINE Official Account Manager > 自動応答 > キーワード応答で登録" },
          { title: "テスト送信で確認", desc: "各キーワードでテスト送信し、意図した回答が返ることを確認" },
        ]} />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">業種を問わず設定すべき必須キーワード</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>「営業時間」「何時まで」「開いてる」</strong> → 営業時間の案内</li>
          <li><strong>「アクセス」「場所」「行き方」「駐車場」</strong> → アクセス情報</li>
          <li><strong>「予約」「予約したい」「空いてる」</strong> → 予約方法の案内+予約リンク</li>
          <li><strong>「料金」「いくら」「値段」「費用」</strong> → 料金表またはリンク</li>
          <li><strong>「メニュー」「サービス」</strong> → メニュー一覧またはリンク</li>
        </ul>

        <Callout type="success" title="表記ゆれを網羅するコツ">
          ひとつの質問に対して「営業時間」「何時まで」「開いてる」「やってる」のように複数のキーワードを登録します。部分一致設定を活用すると、「営業時間を教えて」「営業時間は？」など文章中にキーワードが含まれる場合にも反応します。
        </Callout>
      </section>

      <section>
        <h2 id="ai-response" className="text-xl font-bold text-gray-800">AI応答の導入</h2>
        <p>AI応答は、キーワード応答では対応しきれない多様な質問に自然な回答を返す高度な自動応答です。</p>

        <FlowSteps steps={[
          { title: "ナレッジベースの整備", desc: "営業情報・FAQ・メニュー詳細・注意事項など、AIの回答ソースとなる情報を構造化して登録" },
          { title: "AI応答の有効化", desc: "拡張ツールのAI応答設定からモデル・応答ルール・トーンを設定" },
          { title: "回答範囲の設定", desc: "AIが回答すべき範囲と、人間にエスカレーションすべき範囲を明確に定義" },
          { title: "テスト運用", desc: "2〜4週間のテスト期間を設け、AIの回答をスタッフが確認・修正" },
          { title: "本番運用+継続改善", desc: "フィードバックループで精度を継続的に向上。月次で正答率を確認" },
        ]} />

        <ResultCard before="キーワード応答のみ" after="キーワード+AI応答" metric="自動対応率" description="65% → 85%に向上。スタッフの対応工数を半減" />
      </section>

      <InlineCTA />

      <section>
        <h2 id="time-based" className="text-xl font-bold text-gray-800">時間帯別の応答切り替え</h2>
        <p>営業時間内と営業時間外で応答方法を切り替えることで、ユーザー体験と業務効率の両方を最適化できます。</p>

        <ComparisonTable
          headers={["時間帯", "応答方法", "内容"]}
          rows={[
            ["営業時間内", "チャット + キーワード応答", "複雑な質問はスタッフが対応、定型質問は自動応答"],
            ["営業時間外", "自動応答（AI + キーワード）", "24時間対応。緊急時はエスカレーション通知"],
            ["休業日", "一律応答 + 自動応答", "休業案内+よくある質問への自動回答"],
          ]}
        />

        <Callout type="point" title="スマートチャットモードの活用">
          LINE公式アカウントの「スマートチャット」モードでは、チャット対応と自動応答を時間帯で自動切り替えできます。営業時間設定をするだけで運用が可能です。
        </Callout>
      </section>

      <section>
        <h2 id="rich-menu-linkage" className="text-xl font-bold text-gray-800">リッチメニューとの連動設計</h2>
        <p>リッチメニューのテキストアクションと自動応答を連携させると、メニュータップから自動回答までシームレスにつなげられます。</p>

        <FlowSteps steps={[
          { title: "リッチメニューで「予約したい」を送信", desc: "テキストアクションで「予約したい」というキーワードを自動送信" },
          { title: "キーワード応答で予約案内を返信", desc: "予約方法の案内+予約ページのURLをリッチメッセージで自動返信" },
          { title: "予約ページに遷移", desc: "ユーザーがURLをタップして予約フォームに遷移" },
        ]} />

        <p>リッチメニューの設定方法は<Link href="/line/column/line-rich-menu-complete-guide" className="text-blue-600 underline">リッチメニュー作り方完全ガイド</Link>で詳しく解説しています。</p>
      </section>

      <section>
        <h2 id="improvement" className="text-xl font-bold text-gray-800">応答精度の改善サイクル</h2>

        <FlowSteps steps={[
          { title: "週次ログ確認", desc: "自動応答のログを確認し、未対応の質問や不適切な回答を特定" },
          { title: "キーワード追加・修正", desc: "新たに判明した頻出質問のキーワードを追加、既存の回答文を改善" },
          { title: "AI学習データの更新", desc: "スタッフの修正内容をAIの学習データとして蓄積" },
          { title: "月次KPI確認", desc: "自動対応率・正答率・ユーザー満足度を月次で確認し、目標と比較" },
        ]} />

        <StatGrid stats={[
          { value: "70%→90%", label: "3ヶ月でのAI正答率改善" },
          { value: "50%削減", label: "スタッフ対応工数の削減" },
          { value: "24時間", label: "問い合わせ対応可能時間" },
        ]} />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>キーワード応答+AI応答のハイブリッド運用が最適</strong> — 定型質問は正確に、複雑な質問は柔軟に対応</li>
          <li><strong>必須キーワードは5つから</strong> — 営業時間・アクセス・予約・料金・メニューをまず設定</li>
          <li><strong>時間帯別の切り替えで効率化</strong> — 営業時間内はチャット、時間外は自動応答</li>
          <li><strong>リッチメニュー連動で導線をスムーズに</strong> — メニュータップ→自動応答→アクションのシームレスな流れ</li>
          <li><strong>週次のログ確認と月次KPI管理</strong> — 継続的な改善で精度を向上させる</li>
        </ol>
        <p className="mt-4">より高度な自動応答としてチャットボットの構築を検討する場合は<Link href="/line/column/line-chatbot-creation-guide" className="text-blue-600 underline">チャットボットの作り方</Link>もご参照ください。フォーム機能との連携については<Link href="/line/column/line-form-function-utilization" className="text-blue-600 underline">フォーム機能活用術</Link>で解説しています。</p>
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
