import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, {
  InlineCTA,
  StatGrid,
  BarChart,
  Callout,
  FlowSteps,
  ComparisonTable,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "online-clinic-system-fee-design")!;

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
  "システム利用料は「通信費」等の名目で徴収可能だが、金額と根拠の説明が不可欠",
  "保険診療では数百円程度が相場、自費診療では薬剤費に包含するモデルが主流",
  "患者離脱を防ぐには「見えないコスト」を減らし、総額での分かりやすさを重視する",
];

const toc = [
  { id: "what-is-system-fee", label: "システム利用料とは何か" },
  { id: "legal-basis", label: "法的根拠と徴収の可否" },
  { id: "insurance-pricing", label: "保険診療のシステム利用料設計" },
  { id: "self-pay-pricing", label: "自費診療のシステム利用料設計" },
  { id: "patient-churn", label: "患者離脱を防ぐ料金設計の工夫" },
  { id: "pricing-patterns", label: "料金体系の4つのパターン" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="経営戦略" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        オンライン診療を導入したクリニックが直面する悩みの一つが、<strong>システム利用料（通信費・予約手数料）をどう設定するか</strong>です。患者に請求すべきか、いくらが適正か、どう説明すれば納得してもらえるか——これらの判断を誤ると、患者離脱の原因になりかねません。本記事では、保険診療・自費診療それぞれのシステム利用料の相場と設計パターンを整理し、収益確保と患者満足度を両立する料金体系の考え方を解説します。
      </p>

      {/* ── セクション1: システム利用料とは ── */}
      <section>
        <h2 id="what-is-system-fee" className="text-xl font-bold text-gray-800">システム利用料とは何か</h2>

        <p>オンライン診療における「システム利用料」とは、ビデオ通話プラットフォームの利用、予約システムの運用、通信環境の維持に要するコストを指します。対面診療では発生しない費用項目であり、<strong>オンライン診療特有のコスト</strong>です。</p>

        <p>名称はクリニックによって異なり、「通信費」「オンライン診療手数料」「予約管理費」「情報通信機器使用料」など様々な呼び方があります。名称に関わらず、患者にとっては「対面では払わなかった追加費用」として認識されるため、その根拠と金額の妥当性を明確に説明できることが重要です。</p>

        <p>システム利用料に含まれるコストの内訳は、主に以下の4つです。</p>

        <StatGrid stats={[
          { value: "1〜5", unit: "万円/月", label: "オンライン診療プラットフォーム費" },
          { value: "3.0〜3.6", unit: "%", label: "クレジットカード決済手数料" },
          { value: "3〜10", unit: "円/通", label: "SMS・通知送信費" },
          { value: "5,000〜2万", unit: "円/月", label: "通信環境（回線・機器）維持費" },
        ]} />
      </section>

      {/* ── セクション2: 法的根拠 ── */}
      <section>
        <h2 id="legal-basis" className="text-xl font-bold text-gray-800">法的根拠と徴収の可否</h2>

        <p>オンライン診療のシステム利用料を患者から徴収することは、法的に認められています。厚生労働省の「オンライン診療の適切な実施に関する指針」では、<strong>情報通信機器の運用に要する費用を実費徴収として患者に請求できる</strong>旨が明記されています。</p>

        <p>ただし、徴収にあたっては以下の条件を満たす必要があります。まず、患者に対して<strong>事前に金額と徴収理由を説明し、同意を得る</strong>こと。次に、金額が社会通念上妥当な範囲であること。そして、保険診療の場合は保険点数に含まれない費用として、<strong>保険外併用療養費の枠組みでの徴収</strong>とすることです。</p>

        <Callout type="warning" title="徴収時の注意点">
          システム利用料は保険診療の自己負担額とは別の費用です。保険点数に上乗せして請求することはできません。必ず「保険外の実費」として、<strong>領収証にも別項目で記載</strong>する必要があります。また、金額は事前にWebサイトや予約画面で明示し、患者が予約前に認識できるようにしましょう。
        </Callout>

        <p>なお、自費診療の場合は保険外併用療養費の制約がないため、より柔軟な設定が可能です。ただし、金額が高すぎると医療広告ガイドライン上「不当な誘引」と見なされるリスクがあるため、相場を大きく超えない範囲での設定が望ましいです。</p>
      </section>

      {/* ── セクション3: 保険診療の設計 ── */}
      <section>
        <h2 id="insurance-pricing" className="text-xl font-bold text-gray-800">保険診療のシステム利用料設計</h2>

        <p>保険診療のオンライン診療では、システム利用料（通信費）の相場は<strong>0〜1,000円</strong>程度です。多くのクリニックが300〜500円に設定しており、これは患者にとって「交通費の代わり」として受け入れやすい金額帯です。</p>

        <p>設定金額は、クリニックのシステム運用コストを月間オンライン診療件数で割った実費ベースで算出するのが基本です。例えば、プラットフォーム月額3万円+通信費1万円=月間コスト4万円のクリニックが月80件のオンライン診療を行う場合、1件あたりのコストは500円。これをそのままシステム利用料として設定するのが「実費相当」の考え方です。</p>

        <BarChart
          data={[
            { label: "0円（無料）", value: 25, color: "bg-emerald-500" },
            { label: "100〜300円", value: 20, color: "bg-sky-500" },
            { label: "300〜500円", value: 35, color: "bg-violet-500" },
            { label: "500〜1,000円", value: 15, color: "bg-amber-500" },
            { label: "1,000円以上", value: 5, color: "bg-rose-500" },
          ]}
          unit="％（保険診療クリニックの設定割合・概算）"
        />

        <p>約25%のクリニックがシステム利用料を無料としていますが、これはクリニック側でコストを吸収しているか、オンライン診療の件数がまだ少なくコストが限定的なケースです。件数が増加するにつれて運用コストが積み上がるため、最初から適正な金額を設定しておくことを推奨します。</p>
      </section>

      <InlineCTA />

      {/* ── セクション4: 自費診療の設計 ── */}
      <section>
        <h2 id="self-pay-pricing" className="text-xl font-bold text-gray-800">自費診療のシステム利用料設計</h2>

        <p>自費診療のオンラインクリニックでは、システム利用料の設計アプローチが保険診療とは根本的に異なります。最も一般的なのは、<strong>システム利用料を薬剤費に包含し、患者には「薬代+配送料」のみを提示する</strong>モデルです。</p>

        <p>この「包含型」が主流になっている理由は明快です。患者にとって「診察料0円・システム利用料0円・薬代○円・配送料○円」という料金表示は、「診察料○円・システム利用料○円・薬代○円・配送料○円」よりも<strong>項目が少なくシンプル</strong>で、「追加費用を取られている」という不満が生じにくいためです。</p>

        <ComparisonTable
          headers={["料金モデル", "診察料", "システム利用料", "薬剤費", "配送料", "特徴"]}
          rows={[
            ["包含型", "0円", "0円（薬剤費に含む）", "高め設定", "0〜600円", "患者にシンプル。主流"],
            ["分離型", "1,500〜3,000円", "0〜500円", "安め設定", "0〜600円", "診察の価値を訴求"],
            ["定額型", "—", "—", "—", "—", "月額○円で全込み"],
            ["サブスク型", "0円", "0円", "月額に含む", "0円", "継続率が最も高い"],
          ]}
        />

        <p>「定額型」や「サブスク型」は、AGA治療やピル処方など<strong>月次の定期処方</strong>に適したモデルです。「月額○円ですべて込み（診察・薬・配送）」と提示できるため、患者は追加費用を心配せずに継続利用できます。クリニック側にとっても月間の売上が予測しやすく、キャッシュフローが安定するメリットがあります。</p>
      </section>

      {/* ── セクション5: 患者離脱を防ぐ工夫 ── */}
      <section>
        <h2 id="patient-churn" className="text-xl font-bold text-gray-800">患者離脱を防ぐ料金設計の工夫</h2>

        <p>患者がオンライン診療から離脱する理由のうち、<strong>料金に関する不満は上位3位以内</strong>に常にランクインしています。特に「想定していなかった費用が発生した」「料金の内訳が不明瞭」という不満は、信頼の毀損に直結します。</p>

        <p>離脱を防ぐための料金設計には、以下の3つの原則があります。</p>

        <p><strong>1. 事前の総額提示。</strong>予約画面や確認メールの段階で、患者が支払う総額を明示します。「診察料+薬代+配送料=合計○円」と表示し、決済時のサプライズをなくすことが最も重要です。</p>

        <p><strong>2. 対面との比較メリットの提示。</strong>「通院にかかる交通費（往復○円）と待ち時間（約○分）が不要になります」という比較情報を添えることで、システム利用料や配送料の妥当性を患者自身が判断できます。</p>

        <p><strong>3. 継続割引の設計。</strong>初回は通常料金、2回目以降は配送料無料、3ヶ月以上の継続でシステム利用料免除——というような段階的な割引を設けることで、<strong>継続するほどお得になる構造</strong>を作ります。</p>

        <Callout type="success" title="離脱率を下げる料金コミュニケーション">
          LINEでの予約確認メッセージに「今回のお支払い金額: ○円（薬代○円+配送料○円）」と総額を自動通知する仕組みを導入すると、決済時の離脱率が大幅に低下します。患者CRMと連携して、初回・継続回数に応じた自動メッセージを出し分けることも効果的です。
        </Callout>
      </section>

      {/* ── セクション6: 4つのパターン ── */}
      <section>
        <h2 id="pricing-patterns" className="text-xl font-bold text-gray-800">料金体系の4つのパターン</h2>

        <p>ここまでの内容を整理し、クリニックの診療スタイルに応じた<strong>4つの料金設計パターン</strong>を提示します。</p>

        <FlowSteps steps={[
          { title: "パターンA: 実費別建て型", desc: "保険診療向け。診察料（保険）+通信費300〜500円。透明性が高い" },
          { title: "パターンB: 薬代包含型", desc: "自費定期処方向け。診察料0円、薬代に全コストを含む。シンプルさ重視" },
          { title: "パターンC: 月額サブスク型", desc: "AGA・ピル向け。月額固定で診察・薬・配送すべて込み。継続率最大" },
          { title: "パターンD: 初回割引+段階型", desc: "新患獲得重視。初回50%OFF、2回目以降は通常料金。CPA削減に有効" },
        ]} />

        <p><strong>パターンA</strong>は保険診療のクリニックに適しており、通信費を実費として請求するため法的にも安全です。<strong>パターンB</strong>は自費オンラインクリニックのスタンダードで、患者にとって分かりやすい反面、薬剤費の価格競争に巻き込まれやすい点に注意が必要です。</p>

        <p><strong>パターンC</strong>は継続率を最大化するモデルで、解約率（チャーン）が月3〜5%以下であれば最も収益性が高くなります。<strong>パターンD</strong>は新患獲得にフォーカスしたモデルで、広告のCPA（顧客獲得単価）を下げる効果がありますが、初回で離脱する「お試しだけ」の患者を増やすリスクもあります。</p>

        <p>最適なパターンは一つではなく、クリニックの成長フェーズやターゲット患者層によって使い分けるのが現実的です。開業直後はパターンDで集患し、患者基盤が安定してきたらパターンCに移行する——というような段階的な料金戦略が有効です。</p>
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <p>オンライン診療のシステム利用料は、保険診療では300〜500円の実費徴収が標準、自費診療では薬剤費への包含またはサブスクリプション型が主流です。いずれの場合も、患者に事前に総額を明示し、対面診療との比較でメリットを伝えることが離脱防止のカギになります。料金体系は固定ではなく、クリニックの成長フェーズと患者データに基づいて定期的に見直していくことが、長期的な収益の最大化につながります。</p>

        <Callout type="success" title="システム利用料設計のチェックリスト">
          <strong>1.</strong> 自院のオンライン診療の月間運用コストを算出し、1件あたりの実費を把握する<br />
          <strong>2.</strong> 保険診療は通信費として実費相当を設定し、領収証に別項目で記載する<br />
          <strong>3.</strong> 自費診療は薬剤費への包含型またはサブスク型で患者への分かりやすさを優先する<br />
          <strong>4.</strong> 予約確認時に総額を自動通知し、決済時のサプライズを防止する
        </Callout>
      </section>
    </ArticleLayout>
  );
}
