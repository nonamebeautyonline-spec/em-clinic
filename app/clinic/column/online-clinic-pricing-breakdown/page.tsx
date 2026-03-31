import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, {
  InlineCTA,
  StatGrid,
  Callout,
  FlowSteps,
  ComparisonTable,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "online-clinic-pricing-breakdown")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};


const faqItems = [
  { q: "オンライン診療の料金相場と費用内訳を始めるために必要な準備は何ですか？", a: "厚生労働省のオンライン診療ガイドラインに基づく届出、ビデオ通話システムの導入、オンライン決済の設定が必要です。Lオペ for CLINICならLINEビデオ通話・電話音声通話でのオンライン診療に対応しており、別途システム導入が不要です。" },
  { q: "オンライン診療で処方できる薬に制限はありますか？", a: "初診のオンライン診療では処方日数に制限があります（原則7日分まで）。再診では対面診療と同等の処方が可能です。向精神薬・麻薬等の一部薬剤はオンライン診療での処方が制限されています。" },
  { q: "オンライン診療の診療報酬はどのくらいですか？", a: "保険診療では対面診療より低い点数設定ですが、自費診療であれば自由に価格設定が可能です。通院負担の軽減による患者満足度向上と、遠方からの新患獲得を考慮すると、十分な収益性が見込めます。" },
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
  "保険診療のオンライン診療料は対面の約87%で、情報通信機器の運用コストは別途考慮が必要",
  "自費診療は診察料・システム利用料・配送料の3層構造で料金を設計する",
  "患者が納得する料金体系は「内訳の透明化」と「対面との比較」がカギ",
];

const toc = [
  { id: "overview", label: "オンライン診療の料金構造の全体像" },
  { id: "insurance", label: "保険診療の料金相場と算定ルール" },
  { id: "self-pay", label: "自費診療の料金相場と費用内訳" },
  { id: "hidden-costs", label: "見落としやすい隠れコスト" },
  { id: "design", label: "患者が納得する料金設計の考え方" },
  { id: "comparison", label: "対面診療との費用比較" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="ガイド" keyPoints={keyPoints} toc={toc}>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        オンライン診療の導入を検討するクリニックにとって、「料金をどう設定するか」は最初の大きな壁です。保険診療と自費診療では算定の仕組みが根本的に異なり、さらにシステム利用料や配送料など<strong>対面診療にはなかった費用項目</strong>が加わります。本記事では、保険・自費それぞれの料金相場を具体的な数字で示しながら、患者にとって分かりやすく、クリニックの採算も取れる<strong>費用設計の考え方</strong>を解説します。
      </p>

      {/* ── セクション1: 料金構造の全体像 ── */}
      <section>
        <h2 id="overview" className="text-xl font-bold text-gray-800">オンライン診療の料金構造の全体像</h2>

        <p>オンライン診療の料金は、大きく分けて<strong>「診察にかかる費用」「システム・通信にかかる費用」「処方・配送にかかる費用」</strong>の3層で構成されます。対面診療では診察料と処方料のみで完結しますが、オンライン診療ではこれにシステム利用料と配送料が上乗せされる構造です。</p>

        <p>保険診療の場合、診察料の算定は厚生労働省が定める診療報酬点数表に従います。一方、自費診療ではクリニックが自由に価格を設定できますが、患者の離脱を防ぐには相場感を把握した上での戦略的な設計が不可欠です。</p>

        <FlowSteps steps={[
          { title: "診察料", desc: "保険: 診療報酬点数に基づく / 自費: クリニックが自由設定" },
          { title: "システム利用料", desc: "通信費・プラットフォーム手数料として患者に請求可能" },
          { title: "処方料", desc: "院外処方: 処方箋料 / 院内処方: 薬剤費+調剤料" },
          { title: "配送料", desc: "薬の郵送・宅配にかかる実費（自費診療で多い）" },
        ]} />

        <p>この4つの費用項目をどう組み合わせ、どの項目を患者に明示するかによって、患者の「割高感」と「納得感」が大きく変わります。特にシステム利用料の設計は悩ましいポイントであり、<Link href="/clinic/column/online-clinic-system-fee-design" className="text-sky-600 underline hover:text-sky-800">システム利用料の具体的な設計パターンと相場</Link>も参考にしてください。以降のセクションでは、保険診療・自費診療それぞれの具体的な相場と設計ポイントを見ていきましょう。</p>
      </section>

      {/* ── セクション2: 保険診療の料金相場と算定ルール ── */}
      <section>
        <h2 id="insurance" className="text-xl font-bold text-gray-800">保険診療の料金相場と算定ルール</h2>

        <p>保険診療のオンライン診療は、2022年の診療報酬改定で大きく変わりました。現在は<strong>情報通信機器を用いた診療</strong>として、初診・再診ともに点数が設定されています。初診料（情報通信機器）は251点、再診料（情報通信機器）は73点で、対面の初診料288点・再診料73点と比較すると、初診のみ約87%の水準です。</p>

        <p>再診については対面と同じ73点が算定できるため、慢性疾患の定期フォローなどでは保険点数上のデメリットはありません。ただし、オンライン診療では処方日数の制限や対面診療との組み合わせルールがある点は注意が必要です。</p>

        <StatGrid stats={[
          { value: "251", unit: "点", label: "オンライン初診料" },
          { value: "73", unit: "点", label: "オンライン再診料" },
          { value: "288", unit: "点", label: "対面初診料（参考）" },
          { value: "73", unit: "点", label: "対面再診料（参考）" },
        ]} />

        <p>患者の自己負担額は3割負担の場合、オンライン初診で約750円、再診で約220円です。ここに処方箋料68点（3割負担で約200円）が加算されます。対面初診との差額は約110円（3割負担）程度であり、患者にとって大きな金銭差にはなりません。</p>

        <Callout type="info" title="情報通信機器の運用に係る費用について">
          保険診療であっても、オンライン診療のシステム利用に要する実費相当額を<strong>「通信費」等の名目で患者に別途請求すること</strong>は認められています。ただし、社会通念上妥当な範囲（数百円程度）とし、事前に患者へ説明・同意を得る必要があります。
        </Callout>
      </section>

      {/* ── セクション3: 自費診療の料金相場と費用内訳 ── */}
      <section>
        <h2 id="self-pay" className="text-xl font-bold text-gray-800">自費診療の料金相場と費用内訳</h2>

        <p>自費のオンライン診療は、AGA治療、ピル処方、ED治療、メディカルダイエット（GLP-1）など<strong>定期処方型の診療科</strong>で急速に普及しています。料金体系はクリニックごとに異なりますが、一般的に「診察料 + 薬剤費 + 配送料」の3項目で構成され、システム利用料を診察料に含めるケースが多いです。</p>

        <ComparisonTable
          headers={["診療科", "初診料", "再診料", "薬剤費（月額）", "配送料"]}
          rows={[
            ["AGA治療", "0〜3,000円", "0〜1,500円", "4,000〜15,000円", "0〜600円"],
            ["低用量ピル", "0〜2,000円", "0〜1,000円", "2,000〜3,500円", "0〜500円"],
            ["ED治療", "0〜3,000円", "0〜1,500円", "800〜2,000円/錠", "0〜600円"],
            ["GLP-1", "0〜5,000円", "0〜3,000円", "15,000〜50,000円", "0〜1,000円"],
            ["美容内服", "0〜2,000円", "0円", "3,000〜8,000円", "0〜500円"],
          ]}
        />

        <p>注目すべきは、多くのクリニックが<strong>初診料・再診料を0円に設定</strong>している点です。これは「薬剤費にマージンを乗せる」モデルで、患者にとっては「診察無料」のインパクトが大きく、集患力が高いためです。ただし、薬剤費の価格競争が激化しやすいリスクもあり、LTV（顧客生涯価値）を意識した継続率の設計が重要になります。</p>

        <p>一方で、診察料をしっかり設定し、薬剤費を市場最安水準に抑えるクリニックもあります。この場合は「医師の診察に価値がある」というブランディングが成立するため、<strong>患者の信頼感が高く解約率が低い</strong>傾向にあります。どちらのモデルが適切かは、クリニックのポジショニングとターゲット患者層によって異なります。</p>
      </section>

      <InlineCTA />

      {/* ── セクション4: 見落としやすい隠れコスト ── */}
      <section>
        <h2 id="hidden-costs" className="text-xl font-bold text-gray-800">見落としやすい隠れコスト</h2>

        <p>オンライン診療の料金設計で見落とされがちなのが、<strong>患者に直接請求しないクリニック側の運用コスト</strong>です。これらを把握せずに料金を設定すると、表面上の売上が伸びても利益が残らない事態に陥ります。</p>

        <p><strong>1. システム月額利用料。</strong>オンライン診療プラットフォームの月額費用は、無料プランから月額数万円まで幅があります。無料プランは機能制限があり、予約・決済・配送を別々のツールで管理する手間が発生するため、<Link href="/clinic/column/online-clinic-app-comparison" className="text-sky-600 underline hover:text-sky-800">オンライン診療システムの機能・コスト比較</Link>を踏まえたトータルコストで比較することが重要です。</p>

        <p><strong>2. 決済手数料。</strong>クレジットカード決済の手数料は3.0〜3.6%が一般的です。月間売上300万円のクリニックなら、決済手数料だけで月9〜11万円のコストになります。</p>

        <p><strong>3. 配送コスト。</strong>薬の配送を内製化する場合、梱包資材費・送料・人件費がかかります。レターパックで約370〜520円、宅急便で約700〜1,000円。月100件の配送で5〜10万円のコストです。配送フロー全体の設計については<Link href="/clinic/column/online-clinic-prescription-delivery-flow" className="text-sky-600 underline hover:text-sky-800">処方箋・配送フローの3パターン比較</Link>で詳しく解説しています。</p>

        <p><strong>4. カスタマーサポートの人件費。</strong>オンライン診療ではLINEやチャットでの問い合わせ対応が発生します。AI自動返信を導入すれば対応件数の50〜70%を自動化できますが、完全にゼロにすることは困難です。</p>

        <StatGrid stats={[
          { value: "1〜5", unit: "万円/月", label: "システム月額利用料" },
          { value: "3.0〜3.6", unit: "%", label: "決済手数料率" },
          { value: "370〜1,000", unit: "円/件", label: "配送コスト" },
          { value: "50〜70", unit: "%", label: "AI自動返信による対応自動化率" },
        ]} />
      </section>

      {/* ── セクション5: 患者が納得する料金設計の考え方 ── */}
      <section>
        <h2 id="design" className="text-xl font-bold text-gray-800">患者が納得する料金設計の考え方</h2>

        <p>オンライン診療で患者が最も不満を感じるのは、「対面より高いのに、なぜ？」という疑問に対する説明がない場合です。料金設計の第一歩は、<strong>対面診療との比較で何が増え、何が減るかを患者に明示すること</strong>です。</p>

        <p>具体的には、オンライン診療では「通院の交通費・時間コストが不要」「待ち時間ゼロ」「自宅で薬を受け取れる」というメリットがあります。一方で「システム利用料」「配送料」が加わります。このトレードオフを料金表に明記することで、患者は「総合的に見て損ではない」と判断できます。</p>

        <Callout type="point" title="料金設計の3原則">
          <strong>1. 内訳の透明化:</strong> 診察料・薬剤費・配送料を個別に明示する<br />
          <strong>2. 対面との比較提示:</strong> 通院コスト（交通費・時間）との比較表を掲載する<br />
          <strong>3. 定期割引の導入:</strong> 継続利用者には配送料無料や薬剤費割引を提供する
        </Callout>

        <p>また、自費診療では<strong>「まとめ買い割引」や「定期配送プラン」</strong>の導入が効果的です。3ヶ月分まとめ買いで10%OFF、6ヶ月プランで15%OFFといった設計は、患者の1回あたりのコストを下げつつクリニックのLTVを高める施策として多くのクリニックで採用されています。</p>
      </section>

      {/* ── セクション6: 対面診療との費用比較 ── */}
      <section>
        <h2 id="comparison" className="text-xl font-bold text-gray-800">対面診療との費用比較</h2>

        <p>患者視点での総コスト比較を見てみましょう。AGA治療を例に、月1回の再診を想定した場合の<strong>患者の実質負担額</strong>を比較します。</p>

        <ComparisonTable
          headers={["費用項目", "対面診療", "オンライン診療"]}
          rows={[
            ["再診料", "1,500円", "0〜1,500円"],
            ["薬剤費（月額）", "8,000円", "6,000〜8,000円"],
            ["交通費", "500〜1,000円", "0円"],
            ["配送料", "—", "0〜600円"],
            ["通院時間コスト", "1〜2時間", "10〜15分"],
            ["月額合計", "10,000〜10,500円", "6,000〜10,100円"],
          ]}
        />

        <p>金額面ではオンライン診療が同等からやや安くなるケースが多く、さらに<strong>通院にかかる時間コスト</strong>を考慮すると患者メリットは大きくなります。特に遠方の患者や仕事で日中の通院が困難な患者にとって、オンライン診療の「時間的メリット」は料金以上の価値を持ちます。</p>

        <p>クリニック側にとっても、対面診療では1枠15〜20分（受付・待合・診察・会計）かかる外来を、オンライン診療では5〜10分に短縮できるため、<strong>医師1人あたりの診察可能件数が1.5〜2倍</strong>に増加します。このオペレーション効率の改善が、薬剤費の値下げ余地を生み出すのです。</p>
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <p>オンライン診療の料金設計は、保険診療では診療報酬点数に基づく制約の中で通信費の適切な設定がポイントとなり、自費診療では「診察料を取るか、薬剤費で回収するか」の戦略的判断が求められます。いずれの場合も、料金の内訳を透明化し、対面診療との比較で患者のメリットを明示することが、長期的な信頼と継続率の向上につながります。</p>

        <Callout type="success" title="料金設計の実践ステップ">
          <strong>1.</strong> 保険・自費それぞれの費用項目を洗い出し、内訳を明確にする<br />
          <strong>2.</strong> 対面診療との総コスト比較表を作成し、患者に提示する<br />
          <strong>3.</strong> 隠れコスト（決済手数料・配送費・人件費）を考慮した損益シミュレーションを行う<br />
          <strong>4.</strong> 定期プランやまとめ買い割引で継続率とLTVを最大化する
        </Callout>
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
