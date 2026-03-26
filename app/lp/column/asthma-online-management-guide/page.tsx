import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import type { Article } from "../articles";
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

const self: Article = {
  slug: "asthma-online-management-guide",
  title: "喘息のオンライン継続管理 — 吸入薬処方・発作時対応・モニタリング体制",
  description: "気管支喘息のオンライン診療における吸入薬（ICS/LABA）の選択・吸入指導・ステップアップ/ダウンの判断・発作時対応・ピークフローモニタリング体制を徹底解説。Lオペ for CLINICによるLINE問診・吸入リマインド・増悪時のオンライン相談自動化まで網羅します。",
  date: "2026-03-26",
  category: "活用事例",
  readTime: "10分",
  tags: ["喘息", "吸入薬", "ICS/LABA", "オンライン診療", "慢性疾患管理"],
};

if (!articles.find((a) => a.slug === self.slug)) {
  articles.push(self);
}

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
  "日本の喘息患者は約800万人 — 吸入薬の自己中断率が高く、コントロール不良の患者が多数存在",
  "ICS（吸入ステロイド）を軸とした長期管理を月1回のオンラインフォローで継続、ステップアップ/ダウンを適切に判断",
  "Lオペ for CLINICで吸入リマインド・ACTスコア定期評価・発作時のオンライン相談・処方配送を一元管理",
];

const toc = [
  { id: "asthma-overview", label: "喘息の基本と治療ステップ" },
  { id: "inhaler-guide", label: "吸入薬の選択と吸入指導" },
  { id: "online-flow", label: "オンライン診療フロー" },
  { id: "lope-asthma", label: "Lオペ for CLINICで喘息管理を運用" },
  { id: "revenue", label: "収益モデル" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="活用事例" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        気管支喘息は日本人の約10%が罹患する<strong>最も一般的な慢性呼吸器疾患</strong>です。吸入ステロイド（ICS）を中心とした長期管理薬により良好なコントロールが可能ですが、<strong>症状が改善すると自己判断で吸入を中断する患者が多い</strong>ことが最大の課題です。吸入薬の自己中断は発作のリスクを高め、QOLの低下や救急受診・入院につながります。オンライン診療による<strong>定期的なフォローアップ</strong>で吸入の継続を支援し、ステップアップ/ダウンの適切な判断を行うことが、喘息管理の質を大きく向上させます。本記事では、吸入薬の選択・吸入デバイスの指導・発作時対応・ピークフローモニタリング、そして<strong>Lオペ for CLINICによる吸入リマインド・ACT評価の自動化</strong>まで解説します。
      </p>

      {/* ── セクション1: 喘息の基本 ── */}
      <section>
        <h2 id="asthma-overview" className="text-xl font-bold text-gray-800">喘息の基本 — 病態・重症度・治療ステップ</h2>

        <p>
          気管支喘息は、気道の<strong>慢性炎症と気道過敏性の亢進</strong>を特徴とする疾患です。アレルゲン暴露・運動・感染・気温変化・ストレスなどを契機に気道が狭窄し、喘鳴・咳嗽・呼吸困難・胸部絞扼感が発作的に出現します。治療の目標は「症状のない日常生活」と「正常な肺機能の維持」であり、<strong>ICS（吸入ステロイド）を軸とした長期管理薬</strong>の継続が治療の根幹です。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">喘息治療のステップ（GINA/JGLガイドライン準拠）</h3>

        <ComparisonTable
          headers={["ステップ", "長期管理薬", "発作治療薬", "対象"]}
          rows={[
            ["ステップ1", "低用量ICS", "SABA頓用", "軽症間欠型"],
            ["ステップ2", "低用量ICS（＋LTRA等）", "SABA頓用", "軽症持続型"],
            ["ステップ3", "中用量ICS/LABA配合剤", "SABA頓用", "中等症持続型"],
            ["ステップ4", "高用量ICS/LABA＋LAMA等", "SABA頓用", "重症持続型"],
          ]}
        />

        <StatGrid stats={[
          { value: "800", unit: "万人", label: "日本の喘息患者数" },
          { value: "40", unit: "%", label: "コントロール不良の割合" },
          { value: "1,400", unit: "人/年", label: "喘息関連死亡数" },
          { value: "70", unit: "%", label: "アレルギー性喘息の割合" },
        ]} />

        <p>
          喘息管理で重要なのは<strong>ACT（Asthma Control Test）</strong>を用いたコントロール状態の定期評価です。ACTは5つの質問（日中症状・活動制限・夜間覚醒・発作治療薬使用・自己評価）に各1〜5点で回答し、合計25点満点で評価します。<strong>20点以上が良好コントロール、19点以下がコントロール不良</strong>と判定します。ACTは自己記入式であるため、オンライン問診で簡便に実施可能です。喘息を含む<Link href="/lp/column/lifestyle-disease-online-management" className="text-sky-600 underline hover:text-sky-800">慢性疾患のオンライン管理</Link>では、こうした定量的な評価指標の活用が鍵となります。
        </p>

        <Callout type="warning" title="オンライン診療の限界 — 対面が必要なケース">
          以下のケースでは対面診療が必須です：<strong>中等度以上の発作（会話困難・SpO2 93%以下）</strong>、初診で呼吸機能検査（スパイロメトリー）が必要な場合、ステップ4でもコントロール不良の場合、生物学的製剤（オマリズマブ・デュピルマブ等）の導入検討時。オンライン診療は<strong>安定期の継続管理とステップ調整</strong>に最も適しています。
        </Callout>
      </section>

      {/* ── セクション2: 吸入薬の選択 ── */}
      <section>
        <h2 id="inhaler-guide" className="text-xl font-bold text-gray-800">吸入薬の選択と吸入指導 — デバイスの使い分け</h2>

        <p>
          喘息の長期管理薬はICS（吸入ステロイド）が基本であり、コントロール不十分な場合にLABA（長時間作用性β2刺激薬）を併用します。現在はICS/LABA配合剤が主流であり、1つのデバイスで両薬剤を吸入できる利便性から<strong>アドヒアランスの向上</strong>に寄与しています。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">主なICS/LABA配合剤</h3>

        <ComparisonTable
          headers={["商品名", "成分", "デバイス", "用法", "特徴"]}
          rows={[
            ["レルベア", "フルチカゾンフランカルボン酸/ビランテロール", "エリプタ", "1日1回", "1日1回の利便性が高い"],
            ["シムビコート", "ブデソニド/ホルモテロール", "タービュヘイラー", "1日2回", "SMART療法（維持＋発作時）可能"],
            ["アドエア", "フルチカゾンプロピオン酸/サルメテロール", "ディスカス/エアゾール", "1日2回", "実績豊富・エアゾールも選択可"],
            ["フルティフォーム", "フルチカゾンプロピオン酸/ホルモテロール", "エアゾール", "1日2回", "pMDI（加圧噴霧式）"],
            ["テリルジー", "フルチカゾンフランカルボン酸/ウメクリジニウム/ビランテロール", "エリプタ", "1日1回", "ICS/LABA/LAMA 3剤配合"],
          ]}
        />

        <Callout type="info" title="SMART療法（シムビコート）">
          シムビコートは<strong>維持療法と発作時の頓用を1つのデバイスで行えるSMART療法</strong>（Single Maintenance And Reliever Therapy）が可能な唯一のICS/LABA配合剤です。成分のホルモテロールは速効性を持つため、発作時にも追加吸入で対応できます。SMART療法により、別途SABAを持ち歩く必要がなくなり、<strong>患者の服薬管理が大幅に簡素化</strong>されます。ただしSMART療法はブデソニド/ホルモテロール製剤に限定され、他のICS/LABAでは適用されません。
        </Callout>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">吸入デバイスの選択ポイント</h3>

        <p>
          吸入デバイスには<strong>DPI（ドライパウダー吸入器）とpMDI（加圧噴霧式吸入器）</strong>の2種類があります。DPIは患者自身の吸気力で薬剤を吸入するため、十分な吸気力が必要です。高齢者や小児で吸気力が不十分な場合はpMDI＋スペーサーを選択します。オンライン診療では<strong>ビデオ通話で吸入手技を確認</strong>することが可能であり、吸入方法の誤りを早期に発見・修正できます。
        </p>

        <BarChart data={[
          { label: "ICS/LABA配合剤", value: 55 },
          { label: "ICS単剤", value: 20 },
          { label: "ICS/LABA/LAMA", value: 12 },
          { label: "LTRA（内服）", value: 8 },
          { label: "その他", value: 5 },
        ]} />
      </section>

      {/* ── セクション3: オンライン診療フロー ── */}
      <section>
        <h2 id="online-flow" className="text-xl font-bold text-gray-800">オンライン診療フロー — 安定期管理と発作時対応</h2>

        <p>
          喘息のオンライン管理は、<strong>定期フォローによる安定期の管理</strong>と<strong>増悪時の迅速対応</strong>の2軸で設計します。初診は対面で呼吸機能検査を実施し、安定後にオンラインフォローに移行するハイブリッドモデルが推奨されます。
        </p>

        <FlowSteps steps={[
          { title: "Step 1: 対面初診 — 呼吸機能検査と治療開始", desc: "スパイロメトリーでFEV1/FVC・%FEV1を測定し、気道可逆性試験を実施。喘息の確定診断と重症度に応じた治療ステップを決定する。吸入デバイスの選択と初回の吸入指導を対面で実施する。" },
          { title: "Step 2: 2週間後オンラインフォロー", desc: "吸入薬の使用状況・吸入手技の確認（ビデオで実演してもらう）・症状の改善度を評価する。副作用（口腔カンジダ・嗄声等）の有無を確認し、うがいの指導を行う。" },
          { title: "Step 3: 月1回のオンライン定期フォロー", desc: "ACTスコアを事前問診で収集し、コントロール状態を評価。ACT 20点以上が3か月以上続けばステップダウンを検討。ACT 19点以下が続く場合はステップアップを検討する。季節性の増悪因子（花粉・気温変化・感染症流行）を考慮した処方調整を行う。" },
          { title: "Step 4: 発作時のオンライン対応", desc: "軽度の発作（会話可能・日常動作可能）はオンラインでSABA追加・短期経口ステロイド処方で対応。中等度以上（会話困難・SpO2低下）は対面受診・救急受診を指示する。発作の頻度が増加している場合はステップアップを検討する。" },
          { title: "Step 5: 年1回の対面評価", desc: "年1回は対面でスパイロメトリーを実施し、肺機能の経年変化を評価する。呼気NO測定やアレルゲン検査の追加も検討する。" },
        ]} />

        <p>
          <strong>ピークフローモニタリング</strong>も喘息管理の有効なツールです。患者が自宅で朝夕のピークフロー値を測定し、LINEで報告する仕組みを構築すれば、数値の変動を医師がリアルタイムで把握できます。ピークフローの低下は発作の前兆となるため、<strong>早期介入による発作予防</strong>が可能になります。
        </p>
      </section>

      {/* ── セクション4: Lオペ活用 ── */}
      <section>
        <h2 id="lope-asthma" className="text-xl font-bold text-gray-800">Lオペ for CLINICで喘息管理を運用する</h2>

        <p>
          Lオペ for CLINICを活用することで、喘息の長期管理に必要な<strong>吸入リマインド・ACT評価・発作時対応・処方配送</strong>をLINE上で一元管理できます。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">1. ACTスコアの定期自動評価</h3>

        <p>
          月1回のフォロー前にACT（喘息コントロールテスト）の5項目をLINE問診で自動配信・回収します。ACTスコアが自動計算され、管理画面でコントロール状態が一目で確認できます。<strong>ACT 19点以下の患者にはアラートを表示</strong>し、優先的にフォロー診察を案内する運用が可能です。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">2. 吸入リマインドと残薬管理</h3>

        <p>
          フォローアップルールを活用し、吸入薬の残量が少なくなるタイミングで「吸入薬の残りが少なくなっていませんか？追加処方はこちらから」というリマインドをLINEで自動配信します。レルベア（30吸入/本）なら処方から25日後、シムビコート（60吸入/本）なら処方から25日後が目安です。<strong>薬がなくなってからの治療中断を未然に防止</strong>します。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">3. 発作時のLINE相談動線</h3>

        <p>
          喘息の増悪を感じた患者がLINEから「発作が出ています」と報告できる動線を構築します。AI自動返信で「SABA（発作治療薬）を吸入してください。改善しない場合は臨時オンライン診察を予約できます」と一次対応し、必要に応じてオンライン診察や対面受診を案内します。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">4. 季節別セグメント配信</h3>

        <p>
          喘息は季節変動が大きい疾患です。春の花粉シーズン、秋の気温変化、冬のインフルエンザ流行期にあわせて、「喘息が悪化しやすい時期です。吸入薬の残量を確認してください」「インフルエンザワクチンの接種をおすすめします」などの<strong>季節別メッセージをセグメント配信</strong>します。
        </p>

        <ResultCard
          before="喘息患者の吸入薬継続率が低い"
          after="Lオペ導入後: 吸入継続率が大幅に改善（吸入リマインド＋ACT定期評価）"
          metric="吸入継続率の大幅改善が期待"
          description="吸入リマインド・ACT自動評価・残薬管理・発作時LINE相談で治療中断を大幅削減"
        />

        <InlineCTA />
      </section>

      {/* ── セクション5: 収益モデル ── */}
      <section>
        <h2 id="revenue" className="text-xl font-bold text-gray-800">収益モデル — 月1回の定期フォローで安定収益</h2>

        <p>
          喘息は慢性疾患であるため、<strong>月1回の定期フォロー×長期継続</strong>のストック型収益モデルが構築できます。吸入薬は単価が比較的高く、保険診療でもクリニック側の収入が安定する領域です。
        </p>

        <ComparisonTable
          headers={["項目", "単価", "備考"]}
          rows={[
            ["オンライン再診料（保険）", "730円", "情報通信機器を用いた再診"],
            ["特定疾患療養管理料（情報通信機器）", "1,000円", "喘息は特定疾患に該当（オンライン診療では100点）"],
            ["処方箋料", "680円", "一般処方箋"],
            ["吸入薬（ICS/LABA・保険3割）", "約2,000〜4,000円/月", "レルベア・シムビコート等"],
            ["SABA頓用（保険3割）", "約500〜1,000円", "サルタノール等"],
          ]}
        />

        <BarChart
          data={[
            { label: "保険診療報酬（60人）", value: 360000, color: "bg-blue-500" },
            { label: "特定疾患管理料（60人）", value: 60000, color: "bg-sky-400" },
            { label: "新規初診（月5件）", value: 30000, color: "bg-indigo-500" },
          ]}
          unit="円"
        />

        <p>
          管理患者60人の場合、<strong>月間約45万円の収益</strong>が見込めます。喘息は特定疾患療養管理料（情報通信機器：100点）が算定可能であるため、再診料に上乗せした診療報酬が得られます。患者数が100人に達すれば月間約73万円となり、<strong>安定した経営基盤</strong>を構築できます。花粉症のオンライン診療と組み合わせれば、<Link href="/lp/column/hay-fever-online-clinic-lope" className="text-sky-600 underline hover:text-sky-800">アレルギー疾患全体でより広い患者層をカバー</Link>できます。オンライン診療全般の<Link href="/lp/column/online-clinic-pricing-breakdown" className="text-sky-600 underline hover:text-sky-800">料金相場と費用構造</Link>も参考にしてください。
        </p>
      </section>

      {/* ── セクション6: まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ — 喘息オンライン管理の成功戦略</h2>

        <Callout type="success" title="喘息オンライン管理 成功の3つの柱">
          <ul className="mt-1 space-y-1">
            <li>・<strong>ACTスコアで客観的にコントロール状態を評価</strong>: 月1回のLINE問診でACTを自動収集、19点以下の患者を優先フォロー</li>
            <li>・<strong>吸入継続を支援する仕組み</strong>: 吸入リマインド・残薬管理・ビデオでの吸入手技確認で自己中断を防止</li>
            <li>・<strong>発作時の迅速対応と対面への柔軟な切り替え</strong>: 軽度発作はオンラインで対応、中等度以上は対面/救急受診を指示</li>
          </ul>
        </Callout>

        <p>
          日本の喘息患者約800万人のうち、約40%がコントロール不良の状態にあります。その主な原因は<strong>吸入薬の自己中断と不定期な通院</strong>です。オンライン診療で毎月の定期フォローを継続しやすくし、Lオペ for CLINICで吸入リマインド・ACT評価・発作時相談を自動化することで、<strong>患者のコントロール状態を改善し、発作による緊急受診を減らし、クリニックの安定収益を実現</strong>してください。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-6">関連記事</h3>
        <ul className="space-y-1 text-gray-700">
          <li>
            <Link href="/lp/column/hay-fever-online-clinic-lope" className="text-sky-600 underline hover:text-sky-800">花粉症のオンライン診療ガイド</Link> — アレルギー疾患のもうひとつの柱
          </li>
          <li>
            <Link href="/lp/column/internal-medicine-line" className="text-sky-600 underline hover:text-sky-800">内科クリニックのLINE活用ガイド</Link> — 内科領域のLINE運用ノウハウ
          </li>
          <li>
            <Link href="/lp/column/online-clinic-complete-guide" className="text-sky-600 underline hover:text-sky-800">オンライン診療完全ガイド</Link> — オンライン診療の始め方から運用まで
          </li>
          <li>
            <Link href="/lp/column/clinic-repeat-rate-improvement" className="text-sky-600 underline hover:text-sky-800">リピート率改善ガイド</Link> — 慢性疾患の治療継続率を向上させるノウハウ
          </li>
          <li>
            <Link href="/lp/contact" className="text-sky-600 underline hover:text-sky-800">無料相談・お問い合わせ</Link> — 喘息のオンライン管理体制をご相談いただけます
          </li>
        </ul>
      </section>
    </ArticleLayout>
  );
}
