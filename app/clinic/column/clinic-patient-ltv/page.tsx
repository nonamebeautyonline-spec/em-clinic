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
const self = articles.find((a) => a.slug === "clinic-patient-ltv")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};


const faqItems = [
  { q: "クリニックの患者LTV向上戦略の効果はどのくらいで実感できますか？", a: "施策にもよりますが、LINE配信やSEO対策は1〜3ヶ月で効果が出始めるケースが多いです。特にセグメント配信は導入直後から開封率・クリック率の改善が見られます。継続的な改善サイクルを回すことで、半年後には大きな成果に繋がります。" },
  { q: "集患施策にかかるコストはどのくらいですか？", a: "LINE公式アカウント自体は無料で開設でき、月額5,000〜15,000円程度で配信が可能です。Web広告と比較してCPA（獲得単価）が低く、既存患者のリピート促進にも効果的なため、費用対効果は非常に高いです。" },
  { q: "Web広告とLINE配信はどちらが効果的ですか？", a: "新規集患にはWeb広告、リピート促進にはLINE配信が効果的です。LINE配信はメッセージ開封率90%と圧倒的なリーチ力を持ち、既存患者への再来院促進・自費診療の訴求に適しています。両方を組み合わせるのが最も効率的です。" },
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
  "クリニック経営における患者LTVの計算方法と重要性",
  "リピート率向上のための5つの具体策",
  "クロスセル・アップセル戦略で診療単価を向上",
  "セグメント別フォローでLTVを最大化する方法",
];

const toc = [
  { id: "what-is-ltv", label: "患者LTVとは何か" },
  { id: "ltv-calculation", label: "患者LTVの計算方法" },
  { id: "repeat-strategy", label: "リピート率向上の5つの施策" },
  { id: "cross-sell", label: "クロスセル・アップセル戦略" },
  { id: "segment-follow", label: "セグメント別フォローの設計" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="マーケティング" keyPoints={keyPoints} toc={toc}>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">クリニック経営において、新患の獲得コストは年々上昇しています。持続的な成長を実現するためには、<strong>既存患者のLTV（顧客生涯価値）を最大化</strong>する戦略が不可欠です。本記事では、LTVの計算方法から、LINE公式アカウントを活用した<strong>リピート率向上・クロスセル・セグメント別フォロー</strong>の具体策を解説します。</p>

      {/* ── LTVとは ── */}
      <section>
        <h2 id="what-is-ltv" className="text-xl font-bold text-gray-800">患者LTVとは何か</h2>
        <p>LTV（Life Time Value: 顧客生涯価値）とは、1人の患者がクリニックにもたらす生涯の売上合計です。クリニック経営では「新患を1人獲得するコスト」が「既存患者を1回リピートさせるコスト」の5〜10倍かかるとされており、LTV向上は経営効率の改善に直結します。</p>

        <StatGrid stats={[
          { value: "5〜10", unit: "倍", label: "新患獲得 vs リピート促進コスト" },
          { value: "20", unit: "%", label: "リピート率5%向上の利益効果" },
          { value: "65", unit: "%", label: "売上に占める既存患者の割合" },
          { value: "3.2", unit: "年", label: "平均的な患者の通院期間" },
        ]} />

        <Callout type="info" title="LTV思考が経営を変える">
          「初回だけ来てくれればいい」という集患偏重の考え方から、「いかに長く通い続けてもらうか」というLTV思考に切り替えることで、安定した経営基盤を築けます。セグメント配信を活用したリピート促進は<Link href="/clinic/column/segment-delivery-repeat" className="text-sky-600 underline hover:text-sky-800">セグメント配信でリピート率を向上させる方法</Link>で詳しく解説しています。
        </Callout>
      </section>

      {/* ── LTV計算 ── */}
      <section>
        <h2 id="ltv-calculation" className="text-xl font-bold text-gray-800">患者LTVの計算方法</h2>
        <p>患者LTVは以下の計算式で求められます。自院の数値を当てはめてみましょう。</p>

        <Callout type="success" title="患者LTV計算式">
          <ul className="mt-1 space-y-1">
            <li>・<strong>LTV = 平均診療単価 x 年間来院回数 x 平均通院年数</strong></li>
            <li>・例1: 内科（慢性疾患）: 5,000円 x 12回 x 5年 = <strong>30万円</strong></li>
            <li>・例2: 美容皮膚科: 15,000円 x 6回 x 3年 = <strong>27万円</strong></li>
            <li>・例3: 整形外科（リハビリ）: 4,000円 x 24回 x 2年 = <strong>19.2万円</strong></li>
            <li>・例4: 歯科（定期検診）: 8,000円 x 4回 x 10年 = <strong>32万円</strong></li>
          </ul>
        </Callout>

        <p>LTVを構成する3つの要素のうち、LINE公式アカウントで直接的にアプローチできるのは「年間来院回数（リピート率）」と「平均通院年数（離脱防止）」です。KPIの管理方法は<Link href="/clinic/column/clinic-kpi-dashboard" className="text-sky-600 underline hover:text-sky-800">LINEダッシュボードで見るべきKPI7選</Link>も参考にしてください。</p>
      </section>

      {/* ── リピート率 ── */}
      <section>
        <h2 id="repeat-strategy" className="text-xl font-bold text-gray-800">リピート率向上の5つの施策</h2>
        <p>リピート率の向上は、LTV向上において最もインパクトが大きい施策です。LINE公式アカウントを活用した5つの具体策を紹介します。</p>

        <FlowSteps steps={[
          { title: "1. 次回予約の自動リマインド", desc: "診療後に次回の推奨来院時期をLINEで通知。予約ボタン付きで、リマインドから直接予約完了まで導線をつなぐ。" },
          { title: "2. 未来院患者へのフォロー配信", desc: "前回来院から一定期間が経過した患者に「お体の調子はいかがですか？」と自動配信。離脱直前のタイミングでアプローチ。" },
          { title: "3. 治療効果の可視化", desc: "施術前後の写真比較やデータ推移をLINEで共有。「効果が出ている」実感が継続通院のモチベーションに。" },
          { title: "4. ポイント・特典プログラム", desc: "来院回数に応じたポイント付与や、紹介特典をLINE上で管理。デジタルで完結するため運用負荷が低い。" },
          { title: "5. 患者アンケートの活用", desc: "来院後にLINEで満足度アンケートを配信。不満の早期発見と改善で、離脱を未然に防止。" },
        ]} />

        <ResultCard
          before="リピート率55%（フォローなし）"
          after="リピート率78%（LINEフォロー実施）"
          metric="リピート率が23ポイント向上"
          description="特に「未来院フォロー」の効果が大きい"
        />
      </section>

      <InlineCTA />

      {/* ── クロスセル ── */}
      <section>
        <h2 id="cross-sell" className="text-xl font-bold text-gray-800">クロスセル・アップセル戦略</h2>
        <p>平均診療単価を向上させるには、既存患者に対する関連メニューの提案（クロスセル）や上位メニューの提案（アップセル）が有効です。患者離脱を防ぎつつ単価を上げる方法は<Link href="/clinic/column/clinic-patient-retention" className="text-sky-600 underline hover:text-sky-800">患者離脱防止の方法</Link>も合わせてご覧ください。</p>

        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">1.</span><strong>関連施術の提案</strong>: シミ取りで来院した患者に「美白点滴」を案内。セグメントで「シミ取り済み」の患者を抽出して配信。</li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">2.</span><strong>季節メニューの提案</strong>: 冬季に「乾燥肌対策プラン」、夏季に「ダメージケアコース」など、季節に合わせた自費メニューを配信。</li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">3.</span><strong>ホームケア商品の提案</strong>: 診療に関連したスキンケア商品やサプリメントをLINEで案内。<Link href="/clinic/column/clinic-payment-guide" className="text-sky-600 underline hover:text-sky-800">オンライン決済</Link>で来院不要の購入導線を構築。</li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">4.</span><strong>上位プランの提案</strong>: 保険診療で来院している患者に、自費の予防プログラムや検査パッケージを提案。</li>
        </ul>

        <StatGrid stats={[
          { value: "25", unit: "%", label: "クロスセル成功率" },
          { value: "1.4", unit: "倍", label: "平均診療単価の向上" },
          { value: "40", unit: "%", label: "自費メニュー認知度向上" },
          { value: "15", unit: "%", label: "EC売上の増加率" },
        ]} />
      </section>

      {/* ── セグメント別フォロー ── */}
      <section>
        <h2 id="segment-follow" className="text-xl font-bold text-gray-800">セグメント別フォローの設計</h2>
        <p>全患者に同じ配信をしてもLTV向上にはつながりません。患者をセグメント分けし、それぞれに最適なフォローを設計することがポイントです。</p>

        <FlowSteps steps={[
          { title: "新患（初回来院〜3回目）", desc: "初回来院後のサンクスメッセージ、2回目来院の促進、治療計画の共有。「3回目の壁」を超えるフォローが最重要。" },
          { title: "リピーター（4回目〜）", desc: "定期リマインド、クロスセル提案、ポイント残高通知。安定的な通院パターンを維持するフォロー。" },
          { title: "VIP患者（年間売上上位20%）", desc: "優先予約枠の案内、新メニューの先行案内、バースデー特典。上位顧客の満足度を維持し、紹介を促進。" },
          { title: "休眠患者（3か月以上未来院）", desc: "再来院きっかけの配信、クーポン付きメッセージ、季節の健康情報。離脱理由を分析し、適切なアプローチを設計。" },
        ]} />

        <Callout type="info" title="パレートの法則がクリニック経営にも当てはまる">
          多くのクリニックでは、上位20%の患者が売上の60〜80%を占めています。VIP患者のフォローに注力することで、限られたリソースで最大の効果を得られます。セグメント配信の詳しい方法は<Link href="/clinic/column/segment-delivery-repeat" className="text-sky-600 underline hover:text-sky-800">セグメント配信でリピート率を向上させる方法</Link>をご覧ください。
        </Callout>
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <Callout type="success" title="患者LTV向上のポイント">
          <ul className="mt-1 space-y-1">
            <li>・LTV = 平均診療単価 x 年間来院回数 x 平均通院年数で算出</li>
            <li>・LINEフォローでリピート率を23ポイント向上可能</li>
            <li>・セグメント別のクロスセル提案で平均診療単価を1.4倍に</li>
            <li>・新患・リピーター・VIP・休眠の4セグメントで最適なフォローを設計</li>
          </ul>
        </Callout>

        <p>患者LTVの向上は、新患獲得に頼らない安定的なクリニック経営の基盤です。Lオペ for CLINICは、セグメント配信・自動フォロー・ポイント管理・KPIダッシュボードを一体で提供し、LTV最大化を実現します。KPI管理の方法は<Link href="/clinic/column/clinic-kpi-dashboard" className="text-sky-600 underline hover:text-sky-800">LINEダッシュボードで見るべきKPI7選</Link>、紹介制度を活用した新患獲得は<Link href="/clinic/column/clinic-referral-program" className="text-sky-600 underline hover:text-sky-800">紹介制度のLINE化</Link>もご参照ください。</p>
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
