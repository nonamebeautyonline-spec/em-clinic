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
const self = articles.find((a) => a.slug === "online-clinic-medical-record-guide")!;

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
  "厚労省指針が求めるオンライン診療特有のカルテ追加記載事項を網羅",
  "対面診療との記載要件の違いと、記載漏れを防ぐテンプレート運用を解説",
  "電子カルテの効率的な運用方法とLINE問診データの活用法を紹介",
];

const toc = [
  { id: "importance", label: "オンライン診療のカルテ記載が重要な理由" },
  { id: "additional-items", label: "オンライン診療で追加すべき記載事項" },
  { id: "comparison", label: "対面診療との記載要件の違い" },
  { id: "template", label: "カルテ記載テンプレートの活用" },
  { id: "electronic-record", label: "電子カルテの運用ノウハウ" },
  { id: "line-integration", label: "LINE問診データとの連携" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="ガイド" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        オンライン診療のカルテ記載には、対面診療にはない<strong>追加記載事項</strong>が求められます。通信手段、患者の所在地、対面診療への切り替え判断など、オンライン診療特有の情報を適切に記録しなければ、医療安全上の問題や法的リスクにつながります。本記事では、厚労省指針に基づく記載要件の整理と、<strong>効率的な運用ノウハウ</strong>を解説します。
      </p>

      {/* ── セクション1: 重要性 ── */}
      <section>
        <h2 id="importance" className="text-xl font-bold text-gray-800">オンライン診療のカルテ記載が重要な理由</h2>

        <p>診療録（カルテ）は医師法第24条で作成と5年間の保存が義務づけられています。オンライン診療においても、この義務は変わりません。加えて、厚労省「オンライン診療の適切な実施に関する指針」では、オンライン診療特有の記録事項が明示されており、<strong>通常の診療録に加えて追加の記載が必要</strong>です。</p>

        <p>オンライン診療のカルテ記載が特に重要な理由は3つあります。第一に、<strong>医療安全</strong>の観点です。対面診療と異なり、患者の全身状態を直接観察できないため、診察時に確認した範囲と確認できなかった範囲を記録し、次回の診察に引き継ぐ必要があります。</p>

        <p>第二に、<strong>法的保護</strong>の観点です。万一の医療訴訟において、カルテの記載内容は最も重要な証拠資料となります。オンライン診療で対面を勧めたにもかかわらず患者が拒否した場合など、診療経過を詳細に記録しておくことが医師の法的保護につながります。<Link href="/lp/column/online-clinic-consent-form-guide" className="text-sky-600 underline hover:text-sky-800">同意書の設計</Link>と合わせて整備することで、法的リスクをさらに低減できます。</p>

        <StatGrid stats={[
          { value: "5", unit: "年", label: "診療録の法定保存期間" },
          { value: "3", unit: "項目", label: "オンライン診療の追加記載事項" },
          { value: "50", unit: "%削減", label: "テンプレート活用時の記載時間" },
          { value: "24", unit: "条", label: "医師法（カルテ記載義務）" },
        ]} />

        <p>第三に、<strong>診療の質の担保</strong>です。複数の医師がオンライン診療を担当する場合、前回の診療内容が正確に記録されていなければ、継続的な治療の質を維持できません。定型的な記載フォーマットを整備することで、情報の引き継ぎ精度を向上させることができます。</p>
      </section>

      {/* ── セクション2: 追加記載事項 ── */}
      <section>
        <h2 id="additional-items" className="text-xl font-bold text-gray-800">オンライン診療で追加すべき記載事項</h2>

        <p>厚労省指針に基づき、オンライン診療のカルテに追加で記載すべき主要な事項を整理します。</p>

        <p><strong>診療形態の明記</strong>として、当該診療がオンライン診療で実施されたことを明記します。「オンライン診療にて実施」「ビデオ通話（使用システム名）による診察」など、診療形態が一目で分かる記載が求められます。保険請求においても、オンライン診療の実施を示す記録は算定の根拠となります。</p>

        <p><strong>通信環境に関する記録</strong>として、使用した通信手段（ビデオ通話システム名）、通信状態（良好/不良）、通信障害の発生有無とその対応を記載します。通信状態が不良だった場合、診察の質に影響した可能性があるため、その旨と対応（再接続、電話への切り替え、対面への変更等）を記録しておくことが重要です。</p>

        <Callout type="warning" title="対面診療への切り替え判断の記録">
          オンライン診療中に対面診療が必要と判断した場合、または対面診療を勧めたが患者が希望しなかった場合は、<strong>その判断理由と経緯を必ずカルテに記載</strong>してください。この記録が不十分な場合、後日の紛争時に医師の判断の妥当性を立証することが困難になります。
        </Callout>

        <p><strong>患者の所在確認</strong>として、診療時の患者の所在地を記録します。これは緊急時の対応（救急搬送先の選定等）や、医師法上の診療圏との関係で重要な情報です。初回診察時に確認し、以降は「前回と同じ」等の簡略記載でも差し支えありません。</p>
      </section>

      {/* ── セクション3: 対面との違い ── */}
      <section>
        <h2 id="comparison" className="text-xl font-bold text-gray-800">対面診療との記載要件の違い</h2>

        <p>対面診療とオンライン診療のカルテ記載要件を比較し、追加で対応すべき事項を明確にします。</p>

        <ComparisonTable
          headers={["記載項目", "対面診療", "オンライン診療"]}
          rows={[
            ["診療形態", "記載不要（対面が前提）", "「オンライン診療」と明記"],
            ["通信手段", "該当なし", "使用システム名・通信状態を記載"],
            ["患者の所在地", "来院先が明確", "診察時の所在地を確認・記録"],
            ["身体所見", "視診・触診・聴診等を記録", "視診のみ（画面越し）の限界を記録"],
            ["バイタルサイン", "院内で測定・記録", "患者自己測定値を記録（測定機器も記載）"],
            ["対面切り替え判断", "該当なし", "必要性の有無と判断理由を記録"],
            ["同意取得", "説明と同意の記録", "オンライン特有のリスク説明・同意を記録"],
            ["処方箋送付方法", "院内交付が基本", "FAX・電子処方箋・郵送の方法を記録"],
          ]}
        />

        <p>特に注意すべきは<strong>身体所見の記載</strong>です。対面診療では「胸部聴診：清」などと記載しますが、オンライン診療では聴診を実施できません。「オンライン診療のため聴診は未実施」と明記することで、実施していない検査を実施したかのような誤解を防ぎます。<Link href="/lp/column/online-clinic-first-visit-revisit-rules" className="text-sky-600 underline hover:text-sky-800">初診・再診で異なる診察要件</Link>も記載内容に影響するため、併せて確認しましょう。</p>

        <p>バイタルサインについても、患者が自宅の血圧計や体温計で測定した値を記録する場合、<strong>「患者自己測定値」</strong>であることを併記することが推奨されます。院内で医療者が測定した値とは精度が異なる可能性があるためです。</p>
      </section>

      <InlineCTA />

      {/* ── セクション4: テンプレート ── */}
      <section>
        <h2 id="template" className="text-xl font-bold text-gray-800">カルテ記載テンプレートの活用</h2>

        <p>オンライン診療のカルテ記載を効率化し、記載漏れを防ぐには、<strong>テンプレート（定型文）の活用</strong>が効果的です。電子カルテの多くはテンプレート機能を備えており、オンライン診療専用のテンプレートを作成しておくことで、毎回の記載負荷を大幅に軽減できます。</p>

        <p>テンプレートに含めるべき項目は、<strong>診療形態</strong>（オンライン診療/電話再診）、<strong>使用システム</strong>、<strong>通信状態</strong>（良好/不良/一時中断あり）、<strong>患者所在地</strong>、<strong>同意確認</strong>（済/今回取得）、<strong>身体所見の制約</strong>（「オンライン診療のため触診・聴診は未実施」）、<strong>対面診療の必要性判断</strong>（不要/推奨→患者了承/推奨→患者希望せず）です。</p>

        <p>これらをプルダウンやチェックボックスで選択できる形式にしておけば、<strong>記載時間を50%程度短縮</strong>できると同時に、記載漏れのリスクも最小化できます。診療科や疾患ごとにテンプレートを分けておくと、さらに効率的です。</p>
      </section>

      {/* ── セクション5: 電子カルテ運用 ── */}
      <section>
        <h2 id="electronic-record" className="text-xl font-bold text-gray-800">電子カルテの運用ノウハウ</h2>

        <p>オンライン診療の診療録を電子カルテで管理するにあたり、いくつかの運用上のポイントがあります。</p>

        <p>第一に、<strong>オンライン診療と対面診療の区分管理</strong>です。同一患者のカルテ内で、どの診察がオンライン診療だったかを後から検索・抽出できる仕組みが必要です。診療区分のフラグやタグ機能を活用し、オンライン診療回数の集計や、対面への切り替え頻度の分析に活用します。</p>

        <p>第二に、<strong>画像・スクリーンショットの保存</strong>です。皮膚科のオンライン診療では、患者が撮影した患部の写真がカルテの一部となります。これらの画像データを診療録と紐付けて保存し、経時変化を追跡できる体制が求められます。</p>

        <p>第三に、<strong>通信ログの保管</strong>です。ビデオ通話の接続時間・切断時間の記録は、診察の実施を証明する客観的資料となります。電子カルテとビデオ通話システムの連携により、自動的にログが保存される仕組みが理想的です。</p>
      </section>

      {/* ── セクション6: LINE問診連携 ── */}
      <section>
        <h2 id="line-integration" className="text-xl font-bold text-gray-800">LINE問診データとの連携</h2>

        <p>LINEで事前に取得した問診データをカルテに取り込むことで、診察の効率化と記録の充実を両立できます。患者がLINE上で回答した問診内容（主訴、現病歴、既往歴、アレルギー、服薬中の薬剤等）を電子カルテに自動転記する運用は、特にオンライン診療で威力を発揮します。</p>

        <p>対面診療では、診察室で患者の話を聞きながらカルテに入力するワークフローが自然ですが、オンライン診療では画面を見ながらの入力が難しいケースがあります。<strong>事前問診で基本情報を収集済み</strong>であれば、ビデオ通話中は患者の表情や訴えに集中でき、診察の質が向上します。<Link href="/lp/column/online-questionnaire-guide" className="text-sky-600 underline hover:text-sky-800">オンライン問診の設計と活用方法</Link>も参考にしてください。</p>

        <p>問診データの活用にあたっては、患者の入力内容をそのままカルテの「主訴」「現病歴」欄に貼り付けるのではなく、<strong>医師が確認・補足した上で記録する</strong>ことが重要です。「事前問診にて○○と回答あり。本日確認したところ、△△の所見も追加」といった形式で、問診データと医師の判断を明確に区別して記載しましょう。</p>
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <p>オンライン診療のカルテ記載は、対面診療の記載要件に加えて、診療形態・通信環境・患者所在地・対面切り替え判断などの追加記載が求められます。これらを漏れなく記録することが、医療安全と法的保護の基盤となります。</p>

        <p>テンプレートの活用により記載の効率化と標準化を図り、LINE問診データとの連携で診察前の情報収集を自動化することで、オンライン診療の運用品質を大幅に向上させることが可能です。</p>

        <p>Lオペ for CLINICでは、LINEを活用した<Link href="/lp" className="text-blue-600 hover:underline">事前問診の自動収集と管理画面でのデータ一元管理</Link>を通じて、オンライン診療のカルテ記載業務の効率化を支援しています。</p>
      </section>
    </ArticleLayout>
  );
}
