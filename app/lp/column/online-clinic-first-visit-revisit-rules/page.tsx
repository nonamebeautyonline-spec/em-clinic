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
const self = articles.find((a) => a.slug === "online-clinic-first-visit-revisit-rules")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};


const keyPoints = [
  "2022年の指針改定で初診からのオンライン診療が恒久化されたが、一定の制限がある",
  "初診と再診では算定できる診療報酬点数・処方日数・向精神薬の取り扱いが異なる",
  "自費診療では指針上の制限は緩やかだが、医療広告ガイドラインへの配慮が必要",
];

const toc = [
  { id: "guideline-history", label: "オンライン診療指針の変遷" },
  { id: "first-visit-rules", label: "初診オンライン診療の要件と制限" },
  { id: "revisit-rules", label: "再診オンライン診療の算定要件" },
  { id: "comparison-table", label: "初診と再診の違い一覧" },
  { id: "self-pay-rules", label: "自費診療における初診・再診の扱い" },
  { id: "operation-tips", label: "運用上の注意点と対策" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="ガイド" keyPoints={keyPoints} toc={toc}>

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        オンライン診療における「初診」と「再診」の違いは、単なる来院回数の問題ではありません。厚生労働省の「オンライン診療の適切な実施に関する指針」と診療報酬の算定ルールの両面で、<strong>初診と再診では適用される要件が大きく異なります</strong>。本記事では、2022年の指針改定以降のルールを整理し、保険診療・自費診療それぞれの観点から、クリニックが押さえるべき実務上の注意点を解説します。
      </p>

      {/* ── セクション1: 指針の変遷 ── */}
      <section>
        <h2 id="guideline-history" className="text-xl font-bold text-gray-800">オンライン診療指針の変遷</h2>

        <p>オンライン診療の規制は、近年大きく変化してきました。2018年に「オンライン診療の適切な実施に関する指針」が策定された当初は、<strong>初診は原則対面</strong>とされ、オンライン診療は再診（かかりつけ医による慢性疾患のフォローなど）に限定されていました。</p>

        <p>2020年のコロナ禍を受けた時限的措置で初診からのオンライン診療が特例的に認められ、2022年1月の指針改定でこれが<strong>恒久化</strong>されました。ただし、完全に無制限になったわけではなく、初診には一定の要件が設けられています。</p>

        <FlowSteps steps={[
          { title: "2018年", desc: "指針策定。初診は原則対面、再診のみオンライン可能" },
          { title: "2020年4月", desc: "コロナ特例。初診からのオンライン診療を時限的に解禁" },
          { title: "2022年1月", desc: "指針改定。初診オンライン診療の恒久化。ただし要件あり" },
          { title: "2022年4月", desc: "診療報酬改定。オンライン診療料が廃止され、初診料・再診料に統合" },
        ]} />

        <p>2022年4月の診療報酬改定では、従来の「オンライン診療料」（月1回71点）が廃止され、対面診療と同じ初診料・再診料の枠組みに統合されました。これにより、オンライン診療の保険点数が大幅に改善し、クリニックの収益性が向上しています。</p>
      </section>

      {/* ── セクション2: 初診の要件 ── */}
      <section>
        <h2 id="first-visit-rules" className="text-xl font-bold text-gray-800">初診オンライン診療の要件と制限</h2>

        <p>初診からオンライン診療を行う場合、以下の要件を満たす必要があります。これらは厚労省指針に基づくものであり、違反した場合は保険請求の返戻や行政指導の対象となる可能性があります。</p>

        <p><strong>1. 医師の判断による適切性の確認。</strong>オンラインでの初診が医学的に適切かどうかを医師が判断する必要があります。視診・触診が不可欠な疾患や、緊急性が高い症状の場合は、対面診療を促すべきとされています。</p>

        <p><strong>2. 処方の制限。</strong>初診オンライン診療では、<strong>麻薬および向精神薬の処方は不可</strong>です。また、初診での処方日数は「必要最小限」とされており、慢性疾患であっても初回から長期処方を行うことは推奨されていません。一般的には<strong>7〜14日分</strong>が適切とされています。</p>

        <p><strong>3. 本人確認。</strong>初診では患者の本人確認が特に重要です。保険証の確認に加え、ビデオ通話での顔確認が必須です。なりすまし防止のため、保険証と顔写真付き身分証の提示を求めるクリニックが増えています。</p>

        <Callout type="warning" title="初診での処方制限">
          初診オンライン診療では以下の処方が<strong>禁止または制限</strong>されています：<br /><br />
          <strong>禁止:</strong> 麻薬、向精神薬（ベンゾジアゼピン系睡眠薬、抗不安薬など）<br />
          <strong>制限:</strong> 8日分以上の処方は「必要最小限」の範囲内で医師が判断<br />
          <strong>注意:</strong> 基礎疾患等の情報が十分に得られない場合は処方を行わないことも選択肢
        </Callout>

        <StatGrid stats={[
          { value: "251", unit: "点", label: "初診料（情報通信機器）" },
          { value: "7〜14", unit: "日分", label: "初診での推奨処方日数" },
          { value: "不可", unit: "", label: "向精神薬の初診処方" },
          { value: "必須", unit: "", label: "ビデオ通話での本人確認" },
        ]} />
      </section>

      {/* ── セクション3: 再診の算定要件 ── */}
      <section>
        <h2 id="revisit-rules" className="text-xl font-bold text-gray-800">再診オンライン診療の算定要件</h2>

        <p>再診のオンライン診療は初診と比較して制限が緩やかです。すでに対面またはオンラインで初診を行い、患者との関係が構築されている前提のため、<strong>処方の自由度が高く、算定できる加算も多い</strong>のが特徴です。</p>

        <p>再診料（情報通信機器）は73点で、対面の再診料と同点です。さらに、特定疾患療養管理料（情報通信機器）87点、処方箋料68点などの加算が可能です。慢性疾患の定期フォローであれば、再診1回あたり<strong>228点（3割負担で約680円）</strong>程度が標準的な算定になります。</p>

        <p>処方日数の制限も緩和されており、病状が安定している慢性疾患であれば<strong>30日分以上の長期処方</strong>も可能です。ただし、長期処方の場合は次回受診までの間に病状変化がないか確認する手段（電話やLINEでのフォロー等）を確保しておくことが望ましいとされています。</p>

        <p>向精神薬についても、対面での初診後に病状が安定している場合は、再診でのオンライン処方が認められています。ただし、<strong>処方日数は30日以内</strong>とし、定期的な対面診療との併用が推奨されています。</p>
      </section>

      <InlineCTA />

      {/* ── セクション4: 初診と再診の違い一覧 ── */}
      <section>
        <h2 id="comparison-table" className="text-xl font-bold text-gray-800">初診と再診の違い一覧</h2>

        <ComparisonTable
          headers={["比較項目", "初診（オンライン）", "再診（オンライン）"]}
          rows={[
            ["診療報酬", "251点", "73点"],
            ["対面診療との比率", "約87%（対面288点）", "100%（対面73点）"],
            ["処方日数", "必要最小限（7〜14日目安）", "病状に応じて長期可"],
            ["向精神薬処方", "不可", "条件付きで可"],
            ["麻薬処方", "不可", "不可"],
            ["本人確認", "厳格（顔確認+保険証）", "必要（前回情報と照合）"],
            ["医学的適切性判断", "必須（対面切替の判断含む）", "必須（病状安定の確認）"],
            ["特定疾患管理料", "算定不可", "87点算定可"],
            ["対面診療の併用", "要件なし（初回から可能）", "適宜対面を組み合わせる"],
          ]}
        />

        <p>この比較からわかるように、<strong>再診の方がオンライン診療との相性が良い</strong>ことは明らかです。クリニックの運用設計としては、初診は対面またはオンライン（短期処方）で行い、2回目以降の再診をオンラインに切り替える「ハイブリッドモデル」が、患者の安全性とクリニックの収益性を両立する最も現実的なアプローチです。</p>
      </section>

      {/* ── セクション5: 自費診療における扱い ── */}
      <section>
        <h2 id="self-pay-rules" className="text-xl font-bold text-gray-800">自費診療における初診・再診の扱い</h2>

        <p>自費診療（自由診療）では診療報酬の算定ルールは適用されませんが、<strong>厚労省の「オンライン診療の適切な実施に関する指針」は保険・自費を問わず適用</strong>される点に注意が必要です。つまり、初診での向精神薬処方禁止や本人確認の義務は自費診療でも同様に遵守する必要があります。</p>

        <p>ただし、実務上の運用は保険診療と大きく異なります。AGA治療やピル処方などの自費オンライン診療では、初診から長期処方（30〜90日分）を行うクリニックが多く存在します。<Link href="/lp/column/self-pay-online-clinic-rules" className="text-sky-600 underline hover:text-sky-800">自費オンライン診療の制度ルールと運用ポイント</Link>で詳細を解説しています。これは指針上「必要最小限」とされる処方日数の解釈が、疾患の特性や患者の利便性を考慮した上で医師の裁量に委ねられているためです。</p>

        <p>自費診療で特に注意すべきは<strong>医療広告ガイドライン</strong>です。「初診無料」「再診料0円」といった表現は、患者を不当に誘引する広告として指導対象になる可能性があります。料金表示は「初回診察料○円（税込）」のように具体的な金額を明示し、誤解を招かない表現を使用しましょう。</p>

        <Callout type="info" title="自費診療でも守るべきルール">
          <strong>1. 厚労省指針の遵守:</strong> 向精神薬・麻薬の処方制限は自費でも同様<br />
          <strong>2. 本人確認の実施:</strong> ビデオ通話による顔確認は必須<br />
          <strong>3. 医療広告ガイドライン:</strong> 「無料」「最安」などの表現に注意<br />
          <strong>4. 診療録の記載:</strong> オンライン診療であった旨をカルテに記録
        </Callout>
      </section>

      {/* ── セクション6: 運用上の注意点 ── */}
      <section>
        <h2 id="operation-tips" className="text-xl font-bold text-gray-800">運用上の注意点と対策</h2>

        <p>初診・再診のルールを正しく理解した上で、実際の運用で起こりやすいトラブルとその対策を整理します。</p>

        <p><strong>1. 初診と再診の判定ミス。</strong>「他院での受診歴がある患者」が自院に初めて来る場合は、自院としては「初診」です。他院の紹介状がある場合でも、自院での対面診療歴がなければ初診扱いとなり、処方制限が適用されます。<Link href="/lp/column/online-clinic-medical-record-guide" className="text-sky-600 underline hover:text-sky-800">オンライン診療のカルテ記載ガイド</Link>も踏まえ、電子カルテ上の初診/再診フラグを正しく運用し、スタッフへの周知を徹底しましょう。</p>

        <p><strong>2. 対面への切り替え判断。</strong>初診・再診を問わず、オンライン診療中に「対面診療が必要」と判断した場合は、速やかに対面受診を促す義務があります。判断基準をあらかじめマニュアル化し、医師・スタッフ間で共有しておくことが重要です。</p>

        <p><strong>3. 再診間隔の管理。</strong>再診のオンライン診療は「定期的な対面診療との組み合わせ」が推奨されています。オンライン再診が長期間続いている患者に対して、一定間隔で対面受診を促す仕組みを整備しましょう。予約管理システムにリマインド機能があれば、対面受診の時期を自動通知できます。</p>

        <p><strong>4. 同意書の取得。</strong>オンライン診療の実施にあたっては、初診時に患者から同意書を取得する必要があります。同意事項には、オンライン診療の限界、通信トラブル時の対応、対面切り替えの可能性などを含めます。具体的な記載事項や電子同意の導入方法は<Link href="/lp/column/online-clinic-consent-form-guide" className="text-sky-600 underline hover:text-sky-800">オンライン診療の同意書設計ガイド</Link>を参照してください。Web問診の一環として電子同意を取得するフローが効率的です。</p>
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <p>オンライン診療の初診と再診では、処方制限・算定要件・運用上の注意点が大きく異なります。初診では処方日数や向精神薬の制限が厳しく、本人確認も厳格に行う必要があります。一方、再診は対面と同等の診療報酬が算定でき、処方の自由度も高いため、オンライン診療の主戦場は再診にあると言えます。自費診療でも厚労省指針は適用されるため、ルールを正しく理解した上で、患者の安全性と利便性を両立する運用設計を行いましょう。</p>

        <Callout type="success" title="初診・再診運用のチェックリスト">
          <strong>1.</strong> 初診オンライン診療の処方制限（向精神薬不可・日数制限）をスタッフに周知する<br />
          <strong>2.</strong> 初診/再診の判定基準を明確化し、電子カルテのフラグ運用を徹底する<br />
          <strong>3.</strong> オンライン診療の同意書をWeb問診に組み込み、初診時に電子取得する<br />
          <strong>4.</strong> 再診が連続する患者に定期的な対面受診を促すリマインド設定を行う
        </Callout>
      </section>
    </ArticleLayout>
  );
}
