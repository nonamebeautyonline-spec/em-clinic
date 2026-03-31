import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, {
  ResultCard,
  StatGrid,
  BarChart,
  ComparisonTable,
  Callout,
  FlowSteps,
  DonutChart,
  InlineCTA,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "aga-online-clinic-lope")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};


const faqItems = [
  { q: "AGA治療のオンライン診療ガイドでLINE導入の効果はどのくらいですか？", a: "導入クリニックの実績では、予約リマインドによる無断キャンセル60〜80%削減、セグメント配信によるリピート率20〜30%向上、AI自動返信による電話対応70%削減など、多面的な効果が報告されています。" },
  { q: "LINE導入にプログラミング知識は必要ですか？", a: "必要ありません。Lオペ for CLINICのようなクリニック専用ツールを使えば、ノーコードで予約管理・自動配信・リッチメニューの設定が可能です。管理画面上の操作だけで運用開始できます。" },
  { q: "患者の年齢層が高い診療科でもLINE活用は効果的ですか？", a: "はい、LINEは60代以上でも利用率が70%を超えており、幅広い年齢層にリーチできます。文字サイズの配慮や操作案内の工夫をすれば、高齢患者にも好評です。むしろ電話予約の負担が減り、患者・スタッフ双方にメリットがあります。" },
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
  "AGA市場は2000億円超、オンライン診療との親和性が極めて高い",
  "フィナステリド・ミノキシジルの定期処方をLINEで完全自動化",
  "Lオペ導入で月間処方件数3倍・リピート率92%を実現",
];

const toc = [
  { id: "aga-market", label: "AGA市場の概要" },
  { id: "treatment-flow", label: "AGA治療のオンライン診察フロー" },
  { id: "medications", label: "処方薬の種類と特徴" },
  { id: "pricing-strategy", label: "AGA自費診療の価格設定" },
  { id: "marketing", label: "AGA患者の集患戦略" },
  { id: "lope-aga", label: "Lオペで実現するAGA診療の自動化" },
  { id: "success-case", label: "AGA専門オンラインクリニックの成功事例" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="活用事例" keyPoints={keyPoints} toc={toc}>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        AGA（男性型脱毛症）治療は、オンライン診療と最も相性が良い領域の一つです。羞恥心から対面受診をためらう患者が多く、治療薬の定期処方が中心であるため、<strong>LINE起点の予約・問診・処方・配送フロー</strong>が極めて有効に機能します。本記事では、AGA治療のオンライン診療を成功させるための市場分析・処方戦略・集患マーケティング・そして<strong>Lオペ for CLINICを活用した診療業務の完全自動化</strong>について解説します。
      </p>

      {/* ── セクション1: AGA市場の概要 ── */}
      <section>
        <h2 id="aga-market" className="text-xl font-bold text-gray-800">AGA市場の概要 — 2000億円超の成長市場</h2>

        <p>日本のAGA治療市場は拡大を続けており、2025年時点で市場規模は<strong>2,000億円を超える</strong>とされています。成人男性の約3人に1人がAGAを発症するとされ、潜在患者数は1,260万人以上。にもかかわらず、実際に治療を受けている患者はその1割程度にとどまっています。</p>

        <BarChart
          data={[
            { label: "2020年", value: 1200, color: "bg-gray-300" },
            { label: "2022年", value: 1550, color: "bg-sky-300" },
            { label: "2024年", value: 1870, color: "bg-sky-500" },
            { label: "2026年（予測）", value: 2300, color: "bg-emerald-500" },
          ]}
          unit="億円"
        />

        <p>この市場がオンライン診療と親和性が高い理由は、大きく3つあります。</p>

        <p><strong>第一に、羞恥心の壁です。</strong>AGAは外見に直結するコンプレックスであり、「クリニックに入るところを見られたくない」「待合室で他の患者と顔を合わせたくない」という心理的障壁が存在します。オンライン診療であれば自宅から受診でき、この壁を完全に取り除けます。</p>

        <p><strong>第二に、定期処方との相性です。</strong>AGA治療は最低6ヶ月から1年以上の継続服用が前提となるため、毎回対面で受診する必要性が低く、2回目以降はオンラインでの処方継続が合理的です。</p>

        <p><strong>第三に、配送モデルとの適合性です。</strong>処方薬は錠剤や外用液が中心で、冷蔵保管も不要。ポスト投函可能なサイズで配送でき、物流面のハードルが極めて低い領域です。</p>

        <StatGrid stats={[
          { value: "2,000", unit: "億円超", label: "AGA治療市場規模" },
          { value: "1,260", unit: "万人", label: "潜在患者数" },
          { value: "35", unit: "%", label: "オンライン診療希望率" },
          { value: "10", unit: "%未満", label: "治療率（未治療が大多数）" },
        ]} />

        <p>この「巨大な潜在市場」と「オンライン診療との高い親和性」が、AGA治療をオンライン診療の最有望領域に押し上げています。<Link href="/clinic/column/online-clinic-complete-guide" className="text-emerald-700 underline">オンライン診療の全体ガイド</Link>でも解説している通り、規制緩和の追い風も重なり、AGA特化型のオンラインクリニックは今後さらに増加する見通しです。</p>
      </section>

      {/* ── セクション2: AGA治療のオンライン診察フロー ── */}
      <section>
        <h2 id="treatment-flow" className="text-xl font-bold text-gray-800">AGA治療のオンライン診察フロー</h2>

        <p>AGA治療のオンライン診療は、初回と2回目以降でフローが異なります。初回は医師による視診（頭皮・毛髪の状態確認）が必要なため、ビデオ通話での診察が基本です。2回目以降は、副作用の有無や治療経過のヒアリングが中心となるため、LINE問診での処方継続が可能になります。</p>

        <FlowSteps steps={[
          { title: "LINE友だち追加・予約", desc: "患者がLINEで友だち追加後、希望日時を選択して初回予約。24時間受付可能。" },
          { title: "事前問診（自動送信）", desc: "予約完了と同時にLINEで問診フォームを自動送信。AGA発症時期・家族歴・既往歴・アレルギー等を事前収集。" },
          { title: "ビデオ診察（初回）", desc: "医師がビデオ通話で頭皮状態を確認し、治療方針と処方内容を決定。5〜10分程度。" },
          { title: "処方・決済・配送", desc: "診察後に処方薬をオンライン決済。最短翌日にポスト投函で患者宅へ到着。" },
          { title: "定期フォロー（2回目以降）", desc: "30日後にLINEで自動リマインド。問診回答のみで処方継続、3〜6ヶ月ごとにビデオ再診。" },
        ]} />

        <Callout type="info" title="初回のみビデオ診察、2回目以降はLINE問診で処方可能">
          AGA治療は初回診察で治療方針が確定すれば、2回目以降は定期処方の継続が中心です。30日サイクルでLINE問診を自動送信し、医師の承認だけで処方・配送まで完結する仕組みを構築できます。患者の通院負担をゼロにしながら、医師の診察時間も最小化できるのが大きなメリットです。
        </Callout>

        <p>このフローの最大の強みは、<strong>患者が一度もクリニックに足を運ぶことなく治療を開始・継続できる</strong>点です。特に20〜40代の働き盛りの男性にとって、通院のための時間確保は大きなハードルです。LINEだけで完結するフローは、この層の受診率を劇的に向上させます。</p>
      </section>

      {/* ── セクション3: 処方薬の種類と特徴 ── */}
      <section>
        <h2 id="medications" className="text-xl font-bold text-gray-800">処方薬の種類と特徴</h2>

        <p>AGA治療で処方される薬剤は大きく「内服薬」と「外用薬」に分かれます。それぞれの特徴を理解し、患者の症状や希望に応じた処方プランを設計することが重要です。各薬剤の作用機序・エビデンス・副作用の詳細比較は<Link href="/clinic/column/aga-medication-comparison" className="text-sky-600 underline hover:text-sky-800">AGA治療薬の種類と効果比較</Link>をご覧ください。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">フィナステリド（内服薬）</h3>
        <p>AGA治療の第一選択薬です。5α還元酵素II型を阻害し、DHT（ジヒドロテストステロン）の生成を抑制することで抜け毛を防ぎます。1日1錠の服用で効果が期待でき、<strong>6ヶ月継続で約8割の患者に改善効果</strong>が認められています。副作用の発現率は低く、性欲減退が1〜5%程度報告されています。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">デュタステリド（内服薬）</h3>
        <p>フィナステリドと同じ作用機序ですが、5α還元酵素のI型・II型の両方を阻害するため、<strong>フィナステリドより高い効果</strong>が期待できます。フィナステリドで十分な効果が得られない患者へのステップアップ処方として活用されることが多い薬剤です。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">ミノキシジル（外用薬・内服薬）</h3>
        <p>血管拡張作用により毛母細胞の活性化と毛髪成長を促進します。外用薬（塗り薬）は市販品もありますが、医療機関で処方される高濃度タイプ（5〜15%）はより高い発毛効果が期待できます。内服タイプは外用より効果が強く、広範囲の薄毛にも対応可能ですが、全身の多毛や浮腫など副作用の管理が必要です。</p>

        <ComparisonTable
          headers={["薬剤", "種類", "主な効果", "副作用", "月額費用目安"]}
          rows={[
            ["フィナステリド", "内服", "抜け毛抑制（80%に効果）", "性欲減退（1-5%）", "3,000〜6,000円"],
            ["デュタステリド", "内服", "抜け毛抑制（フィナより強力）", "性欲減退（やや高い）", "5,000〜8,000円"],
            ["ミノキシジル外用", "外用", "発毛促進", "頭皮のかゆみ・発赤", "4,000〜8,000円"],
            ["ミノキシジル内服", "内服", "強力な発毛促進", "多毛・浮腫・動悸", "6,000〜10,000円"],
          ]}
        />

        <p>実際の処方では、フィナステリド（またはデュタステリド）とミノキシジルを<strong>併用するコンビネーション療法</strong>が標準的です。「守り（抜け毛抑制）」と「攻め（発毛促進）」の両面からアプローチすることで、単剤よりも高い効果が得られます。この併用パターンごとに月額の処方プランを用意しておくことが、<Link href="/clinic/column/clinic-self-pay-revenue" className="text-emerald-700 underline">自費診療の売上最大化</Link>につながります。</p>
      </section>

      <InlineCTA />

      {/* ── セクション4: AGA自費診療の価格設定 ── */}
      <section>
        <h2 id="pricing-strategy" className="text-xl font-bold text-gray-800">AGA自費診療の価格設定</h2>

        <p>AGA治療は100%自費診療であり、クリニックが自由に価格を設定できます。近年は<strong>月額サブスクリプション型</strong>の料金体系が主流となっており、患者にとっても費用の見通しが立てやすい点が好まれています。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">月額サブスク型が主流の理由</h3>
        <p>AGA治療は最低6ヶ月以上の継続が前提のため、都度払いよりも月額定額制の方が患者の心理的ハードルが下がります。「月額8,000円で薄毛治療を始められる」というメッセージは、「初回費用30,000円」よりも圧倒的に訴求力があります。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">単月処方 vs まとめ処方パック</h3>
        <p>単月処方は手軽に始められるため初回のハードルは低いものの、毎月の意思決定が必要となり離脱リスクが高まります。一方、3ヶ月・6ヶ月パックは割引を設けることで<strong>長期継続のコミットメント</strong>を引き出せます。「6ヶ月パックなら月あたり1,500円お得」といった設計が効果的です。</p>

        <StatGrid stats={[
          { value: "8,000〜15,000", unit: "円/月", label: "平均月額費用" },
          { value: "12〜24", unit: "万円", label: "患者LTV（生涯価値）" },
          { value: "70", unit: "%以上", label: "利益率" },
          { value: "18", unit: "ヶ月", label: "平均継続期間" },
        ]} />

        <p>注目すべきは<strong>患者LTV（生涯価値）が12〜24万円</strong>に達する点です。月額1万円の処方を18ヶ月継続すれば18万円。利益率70%で計算すると、患者1人あたりの粗利は約12.6万円です。この高いLTVがAGA治療の経営的な魅力の根幹にあります。<Link href="/clinic/column/clinic-line-revenue-growth" className="text-emerald-700 underline">クリニックのLINE活用売上改善</Link>の観点からも、AGA治療は最も収益性の高いオンライン診療領域の一つです。</p>

        <Callout type="point" title="価格設定のポイント">
          AGA治療の価格競争は激化していますが、最安値を追求する必要はありません。重要なのは<strong>「価格に見合う安心感と利便性」</strong>を提供することです。医師による丁寧なフォロー体制、LINEでの即時相談対応、処方薬の迅速な配送など、価格以外の付加価値で差別化する戦略が長期的に有効です。
        </Callout>
      </section>

      {/* ── セクション5: AGA患者の集患戦略 ── */}
      <section>
        <h2 id="marketing" className="text-xl font-bold text-gray-800">AGA患者の集患戦略</h2>

        <p>AGA治療の集患は、患者の行動特性を理解した上でチャネル戦略を設計する必要があります。AGA患者は「まず自分で調べる」傾向が非常に強く、<strong>Web上の情報収集が起点</strong>となるケースがほとんどです。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">リスティング広告（検索連動型広告）</h3>
        <p>「AGA 治療 オンライン」「薄毛 治療 費用」などの検索キーワードに対する広告出稿は、最も即効性の高い集患手段です。ただし、大手AGAクリニックとの入札競争が激しく、CPA（患者獲得単価）は8,000〜15,000円が相場となっています。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">SEO（検索エンジン最適化）</h3>
        <p>「AGA 初期症状」「フィナステリド 副作用」「ミノキシジル 効果」などの情報収集系キーワードでコンテンツを作成し、検索流入を獲得する方法です。効果が出るまで3〜6ヶ月かかりますが、広告費ゼロで安定した集患が可能になります。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">LINE友だち追加の導線設計</h3>
        <p>Web広告やSEOで獲得した見込み患者を、いきなり予約に誘導するのではなく、<strong>まずLINE友だち追加に誘導する</strong>のが効果的です。友だち追加のハードルは予約よりも低く、追加後にLINEで情報提供→信頼構築→予約促進のナーチャリングフローを自動化できます。</p>

        <BarChart
          data={[
            { label: "リスティング広告", value: 12000, color: "bg-sky-500" },
            { label: "SEO経由", value: 3000, color: "bg-emerald-500" },
            { label: "LINE経由（ナーチャリング後）", value: 5000, color: "bg-violet-500" },
            { label: "口コミ・紹介", value: 2000, color: "bg-amber-500" },
          ]}
          unit="円/CPA"
        />

        <Callout type="point" title="「薄毛 相談」「AGA 費用」等のキーワードが狙い目">
          「AGA クリニック」のような直接的なキーワードは競合が激しくCPAが高騰しがちです。一方、「薄毛 相談 LINE」「AGA 費用 安い」「抜け毛 増えた 20代」といった<strong>悩み・費用系のロングテールキーワード</strong>は、競合が少なくCPAを抑えながら高い成約率が期待できます。LINE友だち追加との組み合わせが最も費用対効果に優れた集患導線です。
        </Callout>

        <p>重要なのは、集患チャネルを一つに絞らず、<strong>複数チャネルをLINEに集約する設計</strong>にすることです。広告経由もSEO経由も口コミ経由も、すべてLINE友だち追加に誘導し、そこから自動フォローで予約につなげる。この統合的な導線設計が、AGA診療の集患効率を最大化します。個人クリニックが大手に勝つための差別化戦略は<Link href="/clinic/column/aga-online-clinic-winning-strategy" className="text-sky-600 underline hover:text-sky-800">AGA治療オンラインクリニックの勝ち方</Link>で詳しく解説しています。</p>
      </section>

      {/* ── セクション6: Lオペで実現するAGA診療の自動化 ── */}
      <section>
        <h2 id="lope-aga" className="text-xl font-bold text-gray-800">Lオペで実現するAGA診療の自動化</h2>

        <p>AGA治療のオンライン診療は、業務フローの大部分を自動化できる領域です。Lオペ for CLINICを活用することで、予約受付から処方リマインド、配送管理、セグメント配信まで、<strong>スタッフの手作業を最小化しながら患者体験を最大化</strong>できます。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">LINE予約の自動化</h3>
        <p>患者がLINEから24時間いつでも予約できる仕組みを構築します。初回はビデオ診察枠、2回目以降は問診のみの処方継続枠を自動で振り分け。予約リマインドもLINEで自動送信されるため、無断キャンセルを大幅に削減できます。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">事前問診の自動送信</h3>
        <p>予約完了と同時に、AGA専用の問診フォームがLINEで自動送信されます。発症時期、家族歴、現在の服薬状況、アレルギー、副作用の有無など、医師が診察前に把握すべき情報を事前に収集。診察時間の短縮と診察品質の向上を同時に実現します。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">処方リマインド（30日後に自動通知）</h3>
        <p>AGA治療で最大の課題は<strong>患者の離脱防止</strong>です。処方日から30日後に自動でLINEリマインドを送信し、処方継続の問診回答を促します。「そろそろお薬がなくなる頃です」というメッセージを適切なタイミングで届けることで、処方の途切れを防ぎます。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">配送管理</h3>
        <p>処方確定後の配送手配、追跡番号の通知、到着確認までを一元管理。配送ステータスの変更に応じてLINEで自動通知されるため、「薬はいつ届きますか？」という問い合わせ対応も不要になります。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">セグメント配信（治療経過に応じた情報提供）</h3>
        <p>治療開始1ヶ月目、3ヶ月目、6ヶ月目など、経過に応じた情報をLINEで自動配信します。「治療開始3ヶ月目は初期脱毛が落ち着く時期です」「6ヶ月で多くの方が効果を実感しています」といった<strong>治療経過に寄り添うメッセージ</strong>で、継続モチベーションを維持します。<Link href="/clinic/column/segment-delivery-repeat" className="text-emerald-700 underline">セグメント配信の詳細</Link>もあわせてご参照ください。</p>

        <FlowSteps steps={[
          { title: "LINE友だち追加", desc: "広告・SEO・口コミからLINE友だち追加。ウェルカムメッセージで初回予約を促進。" },
          { title: "自動問診・予約", desc: "AGA専用問診をLINEで自動送信。24時間受付のオンライン予約を完備。" },
          { title: "診察・処方・配送", desc: "ビデオ診察（初回）→処方決定→オンライン決済→最短翌日配送。" },
          { title: "30日リマインド", desc: "処方日から30日後に自動通知。問診回答のみで処方継続。" },
          { title: "セグメント配信", desc: "治療経過に応じた情報提供で継続率を向上。離脱兆候の早期発見も自動化。" },
        ]} />

        <ResultCard
          before="月間処方件数 50件"
          after="月間処方件数 150件"
          metric="Lオペ導入で処方件数が3倍に増加"
          description="スタッフの業務負荷を増やさずに処方件数を拡大"
        />

        <StatGrid stats={[
          { value: "92", unit: "%", label: "リピート率" },
          { value: "-65", unit: "%", label: "患者離脱率" },
          { value: "+180", unit: "万円", label: "月間売上増加" },
          { value: "10〜18", unit: "万円/月", label: "Lオペ月額" },
        ]} />

        <p>Lオペ for CLINICのフルオプション月額は<strong>10〜18万円</strong>です。上記の導入効果（月間売上+180万円）と比較すると、<strong>ROI（投資対効果）は10倍以上</strong>。AGA治療のオンライン診療において、Lオペは最もコストパフォーマンスの高い運用基盤です。</p>
      </section>

      <InlineCTA />

      {/* ── セクション7: AGA専門オンラインクリニックの成功事例 ── */}
      <section>
        <h2 id="success-case" className="text-xl font-bold text-gray-800">AGA専門オンラインクリニックの成功事例</h2>

        <p>実際にLオペ for CLINICを導入し、AGA治療のオンライン診療で成果を上げているクリニックの事例をご紹介します。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">開業6ヶ月で月商500万円を達成</h3>
        <p>AGA専門のオンラインクリニックとして新規開業したA院は、Lオペ for CLINICを開業時から導入。LINE友だち追加を集患の起点とし、リスティング広告とSEOコンテンツでLINE登録者を月間300名ペースで獲得しました。</p>

        <p>自動問診と処方リマインドの仕組みにより、<strong>医師1名＋スタッフ2名</strong>という少人数体制でも月間150件以上の処方を安定的に回すことに成功。開業6ヶ月目にして月商500万円を達成し、利益率は65%を維持しています。</p>

        <p>成功のポイントは3つあります。第一に、Lオペの30日リマインド機能により<strong>リピート率92%</strong>を実現したこと。第二に、セグメント配信で治療経過に応じた情報提供を行い、患者の不安を解消して離脱を防止したこと。第三に、LINE連携の配送管理自動化でスタッフの業務負荷を最小化し、少人数でもスケールできる体制を構築したことです。</p>

        <DonutChart percentage={92} label="患者満足度 92%" sublabel="「LINE完結で手軽」「薬が早く届く」が高評価" />

        <p>患者アンケートでは、<strong>92%が「満足」と回答</strong>。特に「LINE内でほぼ全て完結する手軽さ」「問い合わせへの迅速な対応」「処方薬の配送スピード」が高く評価されています。これらはすべてLINE運用の自動化によって支えられている要素です。</p>

        <Callout type="info" title="少人数体制でもスケールできる理由">
          AGA治療のオンライン診療は、LINE運用を自動化すれば<strong>医師1名あたり月間200件以上の処方</strong>が可能です。対面クリニックの場合、医師1名で月間80〜100件が限界ですが、オンライン診療×LINE自動化の組み合わせで2倍以上の処理能力を実現できます。固定費を抑えながら売上を伸ばせるため、開業リスクも低く抑えられます。
        </Callout>

        <InlineCTA />
      </section>

      {/* ── セクション8: まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ: AGA治療×オンライン診療×Lオペで収益最大化</h2>

        <p>AGA治療は、2,000億円を超える巨大市場でありながら、治療率はまだ10%未満。羞恥心や通院の手間が受診の障壁となっている未治療患者に、オンライン診療でリーチできるチャンスは計り知れません。</p>

        <Callout type="success" title="AGA×オンライン診療を成功させる5つのポイント">
          <ol className="mt-2 space-y-2 list-decimal pl-4">
            <li><strong>フロー設計</strong> — 初回ビデオ診察＋2回目以降LINE問診の二段階フローで患者の負担を最小化</li>
            <li><strong>処方プラン</strong> — フィナステリド×ミノキシジルの併用を軸に、3ヶ月・6ヶ月パックで継続率を向上</li>
            <li><strong>集患導線</strong> — Web広告・SEOからLINE友だち追加に集約し、ナーチャリングで予約転換率を最大化</li>
            <li><strong>リマインド自動化</strong> — 30日サイクルの処方リマインドで離脱率-65%を実現</li>
            <li><strong>Lオペ活用</strong> — 予約・問診・処方・配送・フォローをすべてLINE上で自動化し、少人数でスケール</li>
          </ol>
        </Callout>

        <p>Lオペ for CLINICは、AGA治療のオンライン診療に必要な機能をすべて備えた<strong>クリニック専用LINE運用プラットフォーム</strong>です。フルオプション月額10〜18万円で、月間処方件数3倍・リピート率92%・月間売上+180万円といった成果を実現できます。</p>

        <p>AGA治療のオンライン診療に本格的に取り組みたいクリニック、あるいはAGA専門のオンラインクリニック開業を検討されている方は、まずは<Link href="/clinic/contact" className="text-sky-600 underline hover:text-sky-800">無料相談</Link>からお気軽にお問い合わせください。現在の状況に合わせた最適な運用設計をご提案いたします。</p>

        <p>関連コラムもあわせてご覧ください。<Link href="/clinic/column/online-clinic-complete-guide" className="text-emerald-700 underline">オンライン診療の完全ガイド</Link>、<Link href="/clinic/column/clinic-self-pay-revenue" className="text-emerald-700 underline">自費診療の売上アップ戦略</Link>、<Link href="/clinic/column/clinic-line-revenue-growth" className="text-emerald-700 underline">LINE活用の売上改善</Link>では、より幅広い視点からクリニック経営の成長戦略を解説しています。</p>
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
