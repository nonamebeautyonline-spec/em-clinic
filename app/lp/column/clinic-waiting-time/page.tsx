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
const self = articles.find((a) => a.slug === "clinic-waiting-time")!;

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
  datePublished: `${self.date}T00:00:00+09:00`,
  dateModified: `${self.updatedDate || self.date}T00:00:00+09:00`,
  image: `${SITE_URL}/lp/column/${self.slug}/opengraph-image`,
  author: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL },
  publisher: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL, logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.png` } },
  mainEntityOfPage: `${SITE_URL}/lp/column/${self.slug}`,
};

const keyPoints = [
  "クリニックの待ち時間が発生する3つの構造的原因",
  "LINE順番通知システムで院内滞在時間を50%短縮",
  "混雑状況のリアルタイム表示で患者の来院タイミングを分散",
  "時間帯別予約の最適化でピーク混雑を平準化",
];

const toc = [
  { id: "causes", label: "待ち時間が発生する3つの原因" },
  { id: "line-notification", label: "LINE順番通知システムの仕組み" },
  { id: "realtime-status", label: "混雑状況のリアルタイム表示" },
  { id: "time-optimization", label: "時間帯別予約の最適化" },
  { id: "effects", label: "導入効果の実績データ" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="業務改善" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">クリニックの待ち時間は患者満足度の最大の低下要因です。厚生労働省の調査によると、外来患者の<strong>約40%</strong>が「待ち時間が長い」と不満を感じています。本記事ではLINE通知を活用した順番管理・混雑可視化・予約最適化により、<strong>院内待ち時間を平均50%削減</strong>する具体策を解説します。</p>

      {/* ── 原因 ── */}
      <section>
        <h2 id="causes" className="text-xl font-bold text-gray-800">待ち時間が発生する3つの原因</h2>
        <p>待ち時間の問題を解決するには、まず原因を正しく把握する必要があります。多くのクリニックに共通する構造的な原因は以下の3つです。</p>

        <FlowSteps steps={[
          { title: "予約と来院のミスマッチ", desc: "特定の時間帯に予約が集中し、診察時間が予定を超過。予約枠の設計が患者ニーズと合っていない。" },
          { title: "受付・問診の非効率", desc: "紙の問診票への記入、保険証確認、受付手続きに1人あたり10〜15分。この間に次の患者が到着し滞留が発生。" },
          { title: "診察時間のばらつき", desc: "初診と再診、症状の軽重により診察時間が5分〜30分と大きくばらつく。平均値での予約枠設計ではオーバーフローが頻発。" },
        ]} />

        <StatGrid stats={[
          { value: "28", unit: "分", label: "平均待ち時間" },
          { value: "40", unit: "%", label: "不満を感じる患者" },
          { value: "15", unit: "%", label: "待ち時間理由の転院" },
          { value: "3.2", unit: "回", label: "月間クレーム件数" },
        ]} />

        <p>待ち時間の問題は患者の不満だけでなく、スタッフのストレスやクレーム対応の負担増にもつながります。<Link href="/lp/column/clinic-appointment-optimization" className="text-sky-600 underline hover:text-sky-800">予約枠の最適化</Link>と合わせて取り組むことで、根本的な改善が可能です。</p>
      </section>

      {/* ── LINE順番通知 ── */}
      <section>
        <h2 id="line-notification" className="text-xl font-bold text-gray-800">LINE順番通知システムの仕組み</h2>
        <p>LINE順番通知システムは、患者が院内で長時間待つ必要をなくす仕組みです。受付後にLINEで順番をリアルタイム通知することで、患者は院外で自由に時間を過ごせるようになります。</p>

        <FlowSteps steps={[
          { title: "受付・チェックイン", desc: "患者が来院し受付完了。LINEに「受付完了：現在の待ち人数は○人です」と自動通知。" },
          { title: "順番が近づくと事前通知", desc: "あと3人（約15分前）になるとLINEに「まもなく順番です」と通知。患者は外出先から戻る準備ができる。" },
          { title: "呼び出し通知", desc: "順番が来たらLINEで呼び出し。院内の呼び出しモニターと連動し、スムーズに診察室へ案内。" },
        ]} />

        <Callout type="info" title="院外待機で患者のストレスが激減">
          順番通知を導入したクリニックでは、患者の院内滞在時間が平均50%短縮。「近くのカフェで待てるので苦にならない」という声が多く、待ち時間への不満が大幅に減少します。
        </Callout>

        <p>無断キャンセル対策と組み合わせることで、さらに効率的な運用が可能です。詳しくは<Link href="/lp/column/line-reservation-no-show" className="text-sky-600 underline hover:text-sky-800">LINE予約管理で無断キャンセルを削減する方法</Link>も参考にしてください。</p>
      </section>

      {/* ── 混雑状況リアルタイム表示 ── */}
      <section>
        <h2 id="realtime-status" className="text-xl font-bold text-gray-800">混雑状況のリアルタイム表示</h2>
        <p>LINEのリッチメニューから現在の混雑状況を確認できる機能を提供することで、患者は空いている時間帯を狙って来院できるようになります。</p>

        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">1.</span><span><strong>リアルタイム待ち人数表示</strong>：現在の待ち人数と推定待ち時間をLINEで確認可能。「現在5人待ち（約25分）」のように具体的に表示。</span></li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">2.</span><span><strong>時間帯別混雑カレンダー</strong>：過去の来院データから曜日×時間帯の混雑傾向を色分けで表示。患者が空いている時間を選びやすくなる。</span></li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">3.</span><span><strong>混雑予測アラート</strong>：翌日の予約状況から混雑が予想される場合、LINE配信で「明日14時〜は混雑が予想されます。午前中の来院がおすすめです」と事前通知。</span></li>
        </ul>

        <ResultCard
          before="特定の時間帯に患者が集中"
          after="来院タイミングが自然に分散"
          metric="ピーク時の混雑を30%緩和"
          description="患者自身が空いている時間を選ぶことで、スタッフの誘導なしに混雑が平準化"
        />
      </section>

      <InlineCTA />

      {/* ── 時間帯別予約の最適化 ── */}
      <section>
        <h2 id="time-optimization" className="text-xl font-bold text-gray-800">時間帯別予約の最適化</h2>
        <p>待ち時間を根本から解消するには、予約枠の設計自体を見直す必要があります。LINEの予約データを分析し、時間帯ごとの最適な予約枠数を設定しましょう。</p>

        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">1.</span><span><strong>初診・再診の枠分離</strong>：初診は診察時間が長いため、専用枠を設けて再診と混在させない。時間帯ごとに初診枠の上限を設定。</span></li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">2.</span><span><strong>バッファタイムの確保</strong>：1時間あたり10分のバッファ（余白）を設定。診察が延びても次の患者への影響を最小限に。</span></li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">3.</span><span><strong>オンライン問診の事前完了</strong>：来院前にLINEで問診を完了させることで、受付時の滞留を解消。1人あたり10分の短縮効果。</span></li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">4.</span><span><strong>混雑時間帯のインセンティブ</strong>：空いている時間帯に予約した患者へLINEクーポンを配布し、予約の分散を促進。</span></li>
        </ul>

        <p>患者とのコミュニケーション全般の改善方法については<Link href="/lp/column/clinic-patient-communication" className="text-sky-600 underline hover:text-sky-800">患者コミュニケーション改善の5つのポイント</Link>も合わせてご覧ください。</p>
      </section>

      {/* ── 導入効果 ── */}
      <section>
        <h2 id="effects" className="text-xl font-bold text-gray-800">導入効果の実績データ</h2>
        <p>LINE順番通知と混雑可視化を導入したクリニックの実績データをまとめました。</p>

        <StatGrid stats={[
          { value: "50", unit: "%減", label: "院内待ち時間" },
          { value: "80", unit: "%減", label: "待ち時間クレーム" },
          { value: "92", unit: "%", label: "患者満足度" },
          { value: "15", unit: "%増", label: "1日の診察数" },
        ]} />

        <Callout type="success" title="スタッフの負担も大幅軽減">
          「あと何分ですか？」という問い合わせがほぼゼロに。受付スタッフが本来の業務に集中できるようになり、医院全体のオペレーションが改善。残業時間も月平均8時間削減。
        </Callout>
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <Callout type="success" title="待ち時間対策のポイント">
          <ul className="mt-1 space-y-1">
            <li>待ち時間の原因は「予約集中」「受付の非効率」「診察時間のばらつき」の3つ</li>
            <li>LINE順番通知で院外待機を可能にし、院内滞在時間を50%短縮</li>
            <li>混雑状況のリアルタイム表示で、患者自身が来院タイミングを最適化</li>
            <li>オンライン問診の事前完了と予約枠の設計見直しで根本解決</li>
          </ul>
        </Callout>

        <p>Lオペ for CLINICは、LINE順番通知・混雑可視化・オンライン問診・予約管理を<Link href="/lp/features" className="text-sky-600 underline hover:text-sky-800">オールインワンで提供</Link>するクリニック専用プラットフォームです。待ち時間の問題を解消し、患者満足度とクリニックの生産性を同時に向上させます。</p>
      </section>
    </ArticleLayout>
  );
}
