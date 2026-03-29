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
const self = articles.find((a) => a.slug === "clinic-appointment-optimization")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};


const faqItems = [
  { q: "クリニックの予約枠最適化の導入にどのくらいの期間がかかりますか？", a: "基本的な設定は1〜2週間で完了します。LINE公式アカウントの開設からリッチメニュー設計・自動メッセージ設定まで、Lオペ for CLINICなら初期設定サポート付きで最短2週間で運用開始できます。" },
  { q: "クリニックの予約枠最適化でスタッフの負荷は増えませんか？", a: "むしろ減ります。電話対応・手動での予約管理・問診確認などの定型業務を自動化することで、スタッフの作業時間を月40時間以上削減できた事例もあります。導入初月はサポートを受けながら進めれば、2ヶ月目以降はスムーズに運用できます。" },
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
  "予約データ分析で時間帯別の稼働率を可視化",
  "キャンセル待ち管理で空き枠を有効活用",
  "ノーショー対策で無断キャンセル率を5%以下に",
  "データドリブンな予約枠設計で売上15%向上",
];

const toc = [
  { id: "data-analysis", label: "予約データ分析の基本" },
  { id: "utilization", label: "時間帯別稼働率の最適化" },
  { id: "cancel-wait", label: "キャンセル待ち管理の仕組み" },
  { id: "no-show", label: "ノーショー対策の実践方法" },
  { id: "optimization", label: "データドリブンな予約枠設計" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="業務改善" keyPoints={keyPoints} toc={toc}>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">クリニックの予約枠は「感覚」で設定されていることが多く、時間帯によって稼働率に大きな偏りがあります。LINE予約データを分析し、<strong>データに基づいた予約枠設計</strong>を行うことで、稼働率を20%向上させ、売上を15%増加させた事例を紹介します。</p>

      {/* ── 予約データ分析 ── */}
      <section>
        <h2 id="data-analysis" className="text-xl font-bold text-gray-800">予約データ分析の基本</h2>
        <p>予約枠の最適化は、まず現状の把握から始まります。LINE予約システムに蓄積されたデータを分析することで、改善ポイントが明確になります。</p>

        <ul className="space-y-2 text-gray-700">
          <li><strong>予約充足率</strong>：各時間帯の予約枠に対する実際の予約数の割合。70%未満の時間帯は枠数の見直しが必要</li>
          <li><strong>キャンセル率</strong>：予約後にキャンセルされる割合。曜日・時間帯別に分析すると傾向が見える</li>
          <li><strong>ノーショー率</strong>：連絡なしの無断キャンセル率。5%を超える場合は対策が急務</li>
          <li><strong>新患・再診比率</strong>：新患と再診の割合を時間帯別に把握。新患は診療時間が長いため枠数に影響</li>
        </ul>

        <p><Link href="/lp/column/clinic-kpi-dashboard" className="text-sky-600 underline hover:text-sky-800">KPIダッシュボードで見るべき指標</Link>と合わせて、予約に関連するKPIを定期的にモニタリングしましょう。</p>
      </section>

      {/* ── 時間帯別稼働率 ── */}
      <section>
        <h2 id="utilization" className="text-xl font-bold text-gray-800">時間帯別稼働率の最適化</h2>
        <p>一般的なクリニックでは、午前の早い時間帯と午後の遅い時間帯に予約が集中し、昼前後の時間帯は空きが目立つ傾向があります。</p>

        <StatGrid stats={[
          { value: "95", unit: "%", label: "9:00-10:00 稼働率" },
          { value: "60", unit: "%", label: "11:00-12:00 稼働率" },
          { value: "55", unit: "%", label: "14:00-15:00 稼働率" },
          { value: "90", unit: "%", label: "16:00-17:00 稼働率" },
        ]} />

        <Callout type="info" title="稼働率の平準化がポイント">
          ピーク時間帯の枠を増やすのではなく、閑散時間帯への誘導が効果的です。LINE予約画面で「空いている時間帯」を視覚的にハイライト表示したり、閑散時間帯の予約に特典を付与する方法があります。
        </Callout>

        <p>予約システムの選び方については<Link href="/lp/column/reservation-system-comparison" className="text-sky-600 underline hover:text-sky-800">クリニック予約システム比較</Link>で詳しく解説しています。稼働率データを分析できるシステムを選ぶことが重要です。</p>
      </section>

      {/* ── キャンセル待ち ── */}
      <section>
        <h2 id="cancel-wait" className="text-xl font-bold text-gray-800">キャンセル待ち管理の仕組み</h2>
        <p>キャンセルが発生した際に、待機している患者に自動で通知を送ることで、空き枠を有効活用できます。</p>

        <FlowSteps steps={[
          { title: "キャンセル待ちリストの登録", desc: "患者がLINE上で希望日時・診療内容を登録。複数の日時を指定可能。" },
          { title: "キャンセル発生時の自動通知", desc: "キャンセルが発生すると、該当する条件のキャンセル待ち患者にLINEで自動通知。先着順で予約確定。" },
          { title: "予約確定の自動処理", desc: "患者がリンクをタップして予約を確定。確定後は他のキャンセル待ち患者に「埋まりました」通知を自動送信。" },
        ]} />

        <ResultCard
          before="キャンセル枠の70%が空席のまま"
          after="キャンセル枠の85%を再充填"
          metric="キャンセル待ち自動化で空き枠を有効活用"
          description="月間のキャンセルによる機会損失を大幅に削減"
        />
      </section>

      <InlineCTA />

      {/* ── ノーショー対策 ── */}
      <section>
        <h2 id="no-show" className="text-xl font-bold text-gray-800">ノーショー対策の実践方法</h2>
        <p>無断キャンセル（ノーショー）は、クリニック経営にとって大きな損失です。<Link href="/lp/column/line-reservation-no-show" className="text-sky-600 underline hover:text-sky-800">LINE予約管理での無断キャンセル削減</Link>で詳しく解説していますが、ここでは予約枠最適化の観点からポイントを紹介します。</p>

        <ul className="space-y-2 text-gray-700">
          <li><strong>自動リマインド</strong>：予約前日と当日朝にLINEリマインドを自動送信。開封率80%で高い効果</li>
          <li><strong>簡単キャンセル・変更</strong>：LINE上でワンタップでキャンセル・日程変更が可能。「連絡が面倒」による無断キャンセルを防止</li>
          <li><strong>ノーショー履歴の管理</strong>：過去のノーショー履歴をタグで管理し、常習者には事前確認を強化</li>
          <li><strong>デポジット制度</strong>：高額施術の予約にはクレジットカード事前登録やデポジットを設定して抑止力に</li>
        </ul>

        <StatGrid stats={[
          { value: "80", unit: "%", label: "ノーショー削減率" },
          { value: "95", unit: "%", label: "リマインド開封率" },
          { value: "15", unit: "分", label: "変更手続きの短縮" },
          { value: "5", unit: "%以下", label: "目標ノーショー率" },
        ]} />
      </section>

      {/* ── データドリブン設計 ── */}
      <section>
        <h2 id="optimization" className="text-xl font-bold text-gray-800">データドリブンな予約枠設計</h2>
        <p>蓄積された予約データを活用して、予約枠の数・時間配分・診療科目別の枠設計を最適化します。</p>

        <FlowSteps steps={[
          { title: "過去3ヶ月のデータ集計", desc: "時間帯別・曜日別・診療科目別の予約充足率・キャンセル率・ノーショー率を集計する。" },
          { title: "ボトルネックの特定", desc: "稼働率が低い時間帯、キャンセル率が高い曜日、新患比率が偏る時間帯などを特定する。" },
          { title: "予約枠の再設計", desc: "データに基づき、枠数・枠時間・新患枠の配置を調整。閑散時間帯にはオンライン診療枠を配置する方法も有効。" },
          { title: "効果検証と継続改善", desc: "変更後1ヶ月で効果を検証。稼働率・売上・患者満足度の変化を確認し、さらに微調整を行う。" },
        ]} />
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <Callout type="success" title="予約枠最適化のポイント">
          <ul className="mt-1 space-y-1">
            <li>1. 予約データの定期分析で稼働率・キャンセル率・ノーショー率を可視化</li>
            <li>2. 閑散時間帯への誘導とキャンセル待ち自動化で稼働率を20%向上</li>
            <li>3. LINEリマインド+簡単変更でノーショー率を5%以下に抑制</li>
            <li>4. データドリブンな枠設計で売上15%向上を実現</li>
          </ul>
        </Callout>

        <p>Lオペ for CLINICは、LINE予約データの分析からキャンセル待ち管理、自動リマインドまでを一元管理できるクリニック専用プラットフォームです。まずは現在の予約データを分析して、改善ポイントを把握するところから始めましょう。待ち時間対策による患者満足度向上は<Link href="/lp/column/clinic-waiting-time" className="text-sky-600 underline hover:text-sky-800">待ち時間対策ガイド</Link>を、経営KPIの設計全体は<Link href="/lp/column/clinic-kpi-dashboard" className="text-sky-600 underline hover:text-sky-800">クリニック経営のKPI7選</Link>もご参照ください。</p>
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
