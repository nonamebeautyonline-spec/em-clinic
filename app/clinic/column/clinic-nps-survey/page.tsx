import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, {
  InlineCTA,
  StatGrid,
  Callout,
  FlowSteps,
  ResultCard,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "clinic-nps-survey")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};


const faqItems = [
  { q: "クリニックのNPS調査導入ガイドの導入にどのくらいの期間がかかりますか？", a: "基本的な設定は1〜2週間で完了します。LINE公式アカウントの開設からリッチメニュー設計・自動メッセージ設定まで、Lオペ for CLINICなら初期設定サポート付きで最短2週間で運用開始できます。" },
  { q: "クリニックのNPS調査導入ガイドでスタッフの負荷は増えませんか？", a: "むしろ減ります。電話対応・手動での予約管理・問診確認などの定型業務を自動化することで、スタッフの作業時間を月40時間以上削減できた事例もあります。導入初月はサポートを受けながら進めれば、2ヶ月目以降はスムーズに運用できます。" },
  { q: "小規模クリニックでも導入効果はありますか？", a: "はい、むしろ小規模クリニックほど効果を実感しやすいです。スタッフ数が限られる分、業務自動化によるインパクトが大きく、受付1名分の工数を削減できた事例もあります。" },
];

/* FAQPage JSON-LD（Article JSON-LDはArticleLayoutで自動生成） */
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
  "NPS（Net Promoter Score）の基本概念とクリニックでの活用意義",
  "LINEを使ったNPS調査の自動配信と回収率向上のコツ",
  "スコアの分析方法と推奨者・批判者への対応策",
  "NPS改善のためのPDCAサイクルの回し方",
];

const toc = [
  { id: "what-is-nps", label: "NPSとは何か" },
  { id: "line-survey", label: "LINEでNPS調査を実施する方法" },
  { id: "analysis", label: "NPSスコアの分析方法" },
  { id: "improvement", label: "改善アクションの立て方" },
  { id: "case-study", label: "NPS導入クリニックの成果" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="ガイド" keyPoints={keyPoints} toc={toc}>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">患者満足度を「なんとなく」ではなく<strong>数値で把握</strong>できていますか？ NPS（Net Promoter Score）は、たった1つの質問で患者のロイヤルティを計測できる指標です。LINE公式アカウントを活用すれば、<strong>回収率60%以上</strong>の高精度な調査を自動で実施できます。本記事ではNPSの基本から実践的な活用方法まで解説します。</p>

      {/* ── NPSとは ── */}
      <section>
        <h2 id="what-is-nps" className="text-xl font-bold text-gray-800">NPSとは何か</h2>
        <p>NPS（Net Promoter Score）は、「このクリニックを友人や家族にすすめる可能性はどのくらいですか？」という1つの質問に0〜10の11段階で回答してもらい、患者のロイヤルティを数値化する指標です。</p>

        <FlowSteps steps={[
          { title: "推奨者（9〜10点）", desc: "クリニックに満足し、積極的に紹介してくれる患者。口コミの源泉であり、LTV（生涯価値）も高い。" },
          { title: "中立者（7〜8点）", desc: "満足はしているが、積極的に推奨はしない層。競合に流れやすく、推奨者への引き上げが重要。" },
          { title: "批判者（0〜6点）", desc: "不満を抱えている患者。ネガティブな口コミを広める可能性があり、早急な対応が必要。" },
        ]} />

        <Callout type="info" title="NPSの計算方法">
          NPS = 推奨者の割合(%) - 批判者の割合(%)。スコアは-100〜+100の範囲で、医療機関の平均は+30〜+50程度です。+50以上あれば「非常に高い患者ロイヤルティ」と評価できます。
        </Callout>

        <p>NPSと合わせて見るべきクリニック経営のKPIについては<Link href="/clinic/column/clinic-kpi-dashboard" className="text-sky-600 underline hover:text-sky-800">LINEダッシュボードで見るべきKPI7選</Link>で詳しく解説しています。</p>
      </section>

      {/* ── LINE配信 ── */}
      <section>
        <h2 id="line-survey" className="text-xl font-bold text-gray-800">LINEでNPS調査を実施する方法</h2>
        <p>従来のアンケート（紙・メール）は回収率が10〜20%程度と低く、正確なデータが得られません。LINEを活用することで回収率を大幅に向上させ、継続的な調査が可能になります。</p>

        <FlowSteps steps={[
          { title: "配信タイミングの設定", desc: "来院後24〜48時間後に自動配信。体験が記憶に新しいうちに回答を促す。診療内容の確認と合わせて配信すると回答率が上がる。" },
          { title: "シンプルな調査フォーム", desc: "LINEのリッチメッセージで0〜10のボタンをタップするだけ。追加で「その理由を一言教えてください」の自由記述欄を設置。" },
          { title: "回答後の自動アクション", desc: "推奨者にはGoogle口コミ投稿のお願い、批判者には「ご意見ありがとうございます。改善に取り組みます」と個別フォロー。" },
        ]} />

        <StatGrid stats={[
          { value: "63", unit: "%", label: "LINE調査の回収率" },
          { value: "12", unit: "%", label: "紙アンケートの回収率" },
          { value: "30", unit: "秒", label: "平均回答時間" },
          { value: "0", unit: "円", label: "追加コスト" },
        ]} />
      </section>

      {/* ── 分析方法 ── */}
      <section>
        <h2 id="analysis" className="text-xl font-bold text-gray-800">NPSスコアの分析方法</h2>
        <p>NPSの数値だけを見ても改善にはつながりません。スコアを多角的に分析し、具体的な課題を特定することが重要です。</p>

        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">1.</span><span><strong>時系列トレンド分析</strong>：月次でNPSを追跡し、上昇・下降の傾向を把握。施策の効果検証にも活用。</span></li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">2.</span><span><strong>診療科目別分析</strong>：科目ごとにNPSを集計し、満足度に差がある領域を特定。特定の医師や処置に関連する課題を発見。</span></li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">3.</span><span><strong>自由記述のテキスト分析</strong>：「待ち時間」「スタッフの対応」「説明のわかりやすさ」など、頻出キーワードを抽出して改善の優先順位を決定。</span></li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">4.</span><span><strong>セグメント別分析</strong>：初診・再診、年代、来院経路（紹介・検索・通りすがり）別にスコアを比較し、ターゲットごとの課題を明確化。</span></li>
        </ul>

        <p>患者コミュニケーションの改善が満足度に直結するケースが多くあります。<Link href="/clinic/column/clinic-patient-communication" className="text-sky-600 underline hover:text-sky-800">患者コミュニケーション改善の5つのポイント</Link>も合わせてご確認ください。</p>
      </section>

      <InlineCTA />

      {/* ── 改善アクション ── */}
      <section>
        <h2 id="improvement" className="text-xl font-bold text-gray-800">改善アクションの立て方</h2>
        <p>NPSの分析結果をもとに、具体的な改善アクションを設計し、PDCAサイクルを回す方法を紹介します。</p>

        <FlowSteps steps={[
          { title: "Plan: 課題の優先順位付け", desc: "自由記述の分析から「待ち時間」「説明不足」「予約の取りにくさ」など課題を抽出し、影響度×改善容易度でマトリクス化。" },
          { title: "Do: 改善施策の実行", desc: "優先度の高い課題から着手。例: 待ち時間→LINE順番通知導入、説明不足→術後フォロー配信追加。" },
          { title: "Check: 効果測定", desc: "施策実行後のNPSスコア変化を確認。改善した項目・変化がない項目を切り分け。" },
          { title: "Act: 次の改善サイクルへ", desc: "効果があった施策は標準化し、効果が薄い施策は見直し。四半期ごとにPDCAを回す。" },
        ]} />

        <Callout type="info" title="批判者への個別フォローが最重要">
          NPSで0〜6点をつけた批判者には、院長やスタッフから直接LINEでフォローメッセージを送ることを推奨します。「ご意見をもとに改善します」という姿勢が伝わるだけで、患者のロイヤルティが大きく改善するケースがあります。
        </Callout>
      </section>

      {/* ── 導入成果 ── */}
      <section>
        <h2 id="case-study" className="text-xl font-bold text-gray-800">NPS導入クリニックの成果</h2>

        <ResultCard
          before="患者満足度の把握手段なし"
          after="月次NPS + 自由記述で課題を可視化"
          metric="NPS +25 → +52 に向上（6ヶ月）"
          description="待ち時間改善・説明の充実・予約の取りやすさの3施策で大幅改善"
        />

        <StatGrid stats={[
          { value: "+27", unit: "pt", label: "NPS改善幅" },
          { value: "63", unit: "%", label: "調査回収率" },
          { value: "40", unit: "%増", label: "Google口コミ数" },
          { value: "22", unit: "%増", label: "紹介来院数" },
        ]} />

        <p>NPS調査で把握した課題をLINE配信の改善に活かす方法については<Link href="/clinic/column/clinic-line-analytics" className="text-sky-600 underline hover:text-sky-800">LINE配信効果測定の分析方法と改善策</Link>もご覧ください。</p>
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <Callout type="success" title="NPS調査導入のポイント">
          <ul className="mt-1 space-y-1">
            <li>NPSはたった1問で患者ロイヤルティを数値化できるシンプルな指標</li>
            <li>LINE配信なら回収率63%を実現。紙アンケートの5倍以上のデータ取得</li>
            <li>スコア分析 + 自由記述のテキスト分析で具体的な改善課題を特定</li>
            <li>推奨者にはGoogle口コミ誘導、批判者には個別フォローで二段構えの対応</li>
          </ul>
        </Callout>

        <p>Lオペ for CLINICは、NPS調査の自動配信・スコア集計・改善アクションの管理まで<Link href="/clinic/features" className="text-sky-600 underline hover:text-sky-800">ワンストップで対応</Link>するクリニック専用プラットフォームです。患者満足度を可視化し、データに基づいたクリニック経営を実現します。NPSの結果を口コミ対策に活かす方法は<Link href="/clinic/column/clinic-google-review" className="text-sky-600 underline hover:text-sky-800">Google口コミ対策ガイド</Link>、患者離脱を防ぐフォロー戦略は<Link href="/clinic/column/clinic-patient-retention" className="text-sky-600 underline hover:text-sky-800">患者離脱防止ガイド</Link>もあわせてご覧ください。</p>
      </section>
    
      {/* ── FAQ ── */}
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
