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
const self = articles.find((a) => a.slug === "obesity-treatment-trends-2026")!;

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
  "ウゴービ（セマグルチド）の保険適用要件と処方可能な施設基準を整理",
  "保険適用のウゴービとGLP-1自費処方の適応・費用・運用の違いを比較",
  "GLP-1受容体作動薬の適応外使用に関する注意点と医療広告上の留意事項を解説",
];

const toc = [
  { id: "market-overview", label: "肥満症治療市場の現状" },
  { id: "wegovy-insurance", label: "ウゴービの保険適用と処方要件" },
  { id: "glp1-mechanism", label: "GLP-1受容体作動薬の作用機序と種類" },
  { id: "insurance-vs-self-pay", label: "保険適用と自費処方の使い分け" },
  { id: "off-label-warning", label: "適応外使用の注意点" },
  { id: "clinic-operation", label: "クリニックでの運用設計" },
  { id: "future-outlook", label: "今後の展望" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="ガイド" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        2024年2月、GLP-1受容体作動薬セマグルチド（商品名：ウゴービ）が日本で<strong>肥満症治療薬として保険適用</strong>を取得しました。一方、自費クリニックではGLP-1の「ダイエット目的」処方が拡大しており、適応外使用に関する議論も活発化しています。本記事では、ウゴービの保険適用要件、GLP-1自費処方との使い分け、<strong>適応外使用の注意点</strong>を医療従事者向けに整理します。
      </p>

      {/* ── セクション1: 市場の現状 ── */}
      <section>
        <h2 id="market-overview" className="text-xl font-bold text-gray-800">肥満症治療市場の現状</h2>

        <p>日本における肥満（BMI 25以上）の有病率は成人男性の約33%、成人女性の約22%に達しており、メタボリックシンドロームを含めると生活習慣病の根本的なリスク因子として位置づけられています。一方、「肥満症」として医学的な治療対象となるのは、BMI 25以上かつ<strong>健康障害を合併している場合</strong>（日本肥満学会の定義）であり、単なる肥満と肥満症は区別されます。</p>

        <p>従来、日本で保険適用の抗肥満薬はマジンドール（サノレックス）のみでしたが、BMI 35以上という厳しい適応条件と中枢神経系への副作用から処方数は限定的でした。ウゴービの保険適用は、<strong>日本の肥満症薬物療法に約30年ぶりの新たな選択肢</strong>を提供するものです。</p>

        <StatGrid stats={[
          { value: "33", unit: "%", label: "成人男性の肥満率（BMI≧25）" },
          { value: "2024", unit: "年2月", label: "ウゴービ保険適用開始" },
          { value: "15", unit: "%前後", label: "セマグルチドの平均体重減少率" },
          { value: "1,800", unit: "億ドル", label: "世界の抗肥満薬市場規模（2025年推計）" },
        ]} />

        <p>世界的には、ノボノルディスク社のセマグルチド（ウゴービ）とイーライリリー社のチルゼパチド（ゼップバウンド）が市場を牽引しており、抗肥満薬市場は急速に拡大しています。日本市場でも、ウゴービの保険適用を契機に、医療機関における肥満症への積極的なアプローチが期待されています。</p>
      </section>

      {/* ── セクション2: ウゴービの保険適用 ── */}
      <section>
        <h2 id="wegovy-insurance" className="text-xl font-bold text-gray-800">ウゴービの保険適用と処方要件</h2>

        <p>ウゴービ（セマグルチド皮下注）は、以下の要件をすべて満たす患者に対して保険適用で処方できます。<strong>BMI 27以上</strong>で2つ以上の肥満に関連する健康障害を有する場合、または<strong>BMI 35以上</strong>の場合です。健康障害には、2型糖尿病、脂質異常症、高血圧、心血管疾患、睡眠時無呼吸症候群などが含まれます。</p>

        <p>さらに、処方にあたっては<strong>食事療法・運動療法を3ヶ月以上実施しても十分な効果が得られない</strong>ことが前提条件です。薬物療法はあくまで生活習慣改善の補助であり、ウゴービ単独での使用は想定されていません。</p>

        <Callout type="warning" title="ウゴービの処方施設基準">
          ウゴービの保険処方には<strong>施設基準</strong>の届出が必要です。肥満症の診療経験を有する常勤医師の配置、管理栄養士による栄養指導体制、緊急時の対応体制などが求められます。すべてのクリニックで処方できるわけではないため、処方を検討する場合は事前に施設基準の確認が必要です。
        </Callout>

        <p>投与スケジュールは、0.25mgから開始し4週間ごとに段階的に増量、維持用量は<strong>2.4mg週1回皮下注射</strong>です。患者自身が自己注射を行うため、初回は注射手技の指導が必要です。治療効果の判定は3ヶ月後に行い、5%以上の体重減少が得られない場合は継続の可否を再検討します。</p>
      </section>

      {/* ── セクション3: GLP-1の作用機序 ── */}
      <section>
        <h2 id="glp1-mechanism" className="text-xl font-bold text-gray-800">GLP-1受容体作動薬の作用機序と種類</h2>

        <p>GLP-1（グルカゴン様ペプチド-1）受容体作動薬は、小腸から分泌されるインクレチンホルモンであるGLP-1の作用を模倣する薬剤です。GLP-1受容体は膵臓だけでなく<strong>脳の視床下部にも発現</strong>しており、食欲の抑制と満腹感の促進を通じて体重減少をもたらします。</p>

        <p>主な作用機序は、中枢神経系での食欲抑制、胃排出速度の遅延による満腹感の延長、膵β細胞からのインスリン分泌促進（血糖依存的）です。これらの複合的な作用により、食事摂取量の自然な減少と代謝改善が期待できます。</p>

        <ComparisonTable
          headers={["薬剤名（一般名）", "商品名", "日本での承認適応", "投与頻度", "平均体重減少率"]}
          rows={[
            ["セマグルチド 2.4mg", "ウゴービ", "肥満症（保険適用）", "週1回皮下注", "約15%（68週時点）"],
            ["セマグルチド 0.25〜1.0mg", "オゼンピック", "2型糖尿病", "週1回皮下注", "約5〜10%"],
            ["リラグルチド 3.0mg", "サクセンダ", "海外で肥満症承認（日本未承認）", "毎日皮下注", "約8%（56週時点）"],
            ["リラグルチド 0.9mg", "ビクトーザ", "2型糖尿病", "毎日皮下注", "約3〜5%"],
            ["チルゼパチド", "マンジャロ/ゼップバウンド", "2型糖尿病（ゼップバウンドは日本未承認）", "週1回皮下注", "約20%（72週時点）"],
          ]}
        />

        <p>上記の通り、同じGLP-1受容体作動薬でも<strong>承認適応は薬剤ごとに異なります</strong>。日本で肥満症治療薬として正式に承認されているのはウゴービのみであり、オゼンピック・ビクトーザは2型糖尿病治療薬、サクセンダ・ゼップバウンドは日本では未承認です。</p>
      </section>

      {/* ── セクション4: 保険と自費の使い分け ── */}
      <section>
        <h2 id="insurance-vs-self-pay" className="text-xl font-bold text-gray-800">保険適用と自費処方の使い分け</h2>

        <p>ウゴービの保険適用により、肥満症治療における<strong>保険診療と自費診療の使い分け</strong>が重要なテーマとなっています。それぞれの特性を整理します。</p>

        <ComparisonTable
          headers={["項目", "保険適用（ウゴービ）", "自費処方（GLP-1各種）"]}
          rows={[
            ["対象患者", "BMI 27以上+健康障害2つ以上 or BMI 35以上", "医師の判断による（適応外含む）"],
            ["前提条件", "食事・運動療法3ヶ月以上", "施設による"],
            ["施設基準", "届出が必要", "不要"],
            ["患者負担（3割）", "月額約9,000〜15,000円", "月額約20,000〜80,000円"],
            ["使用薬剤", "ウゴービのみ", "オゼンピック、サクセンダ等"],
            ["治療期間の制限", "あり（効果判定による継続可否）", "施設による"],
            ["栄養指導", "必須", "施設による"],
          ]}
        />

        <p>保険適用のメリットは<strong>患者負担の大幅な軽減</strong>です。自費では月額数万円の費用がかかるGLP-1製剤を、3割負担で利用できます。一方、施設基準の届出や栄養指導体制の整備、前提条件としての3ヶ月以上の食事・運動療法など、<strong>処方までのハードルが高い</strong>点がデメリットです。</p>

        <p>自費処方は、保険適用の要件を満たさない患者（BMI 25〜27で健康障害が1つ以下など）や、施設基準を満たさないクリニックにおける選択肢となります。ただし、後述する適応外使用の問題を十分に理解した上での運用が不可欠です。</p>
      </section>

      <InlineCTA />

      {/* ── セクション5: 適応外使用の注意 ── */}
      <section>
        <h2 id="off-label-warning" className="text-xl font-bold text-gray-800">適応外使用の注意点</h2>

        <Callout type="warning" title="GLP-1受容体作動薬の適応外使用に関する重要な注意">
          オゼンピック（セマグルチド）やビクトーザ（リラグルチド）は<strong>2型糖尿病の治療薬</strong>として承認されており、肥満症・ダイエット目的での使用は<strong>適応外使用（オフラベル使用）</strong>に該当します。また、サクセンダやゼップバウンドは日本では未承認の薬剤です。適応外使用は医師の裁量で可能ですが、有害事象が生じた場合の<strong>医薬品副作用被害救済制度の対象外</strong>となる場合があります。患者への十分な説明と同意取得が必須です。
        </Callout>

        <p>近年、SNSや美容系メディアでメディカルダイエット（GLP-1）が注目を集め、自費クリニックでの処方が急増しました。しかし、日本糖尿病学会は2023年に<strong>「GLP-1受容体作動薬の適応外使用に関する見解」</strong>を公表し、糖尿病治療薬としての安定供給への影響や、医学的管理が不十分な処方に対して懸念を表明しています。</p>

        <p>適応外使用を行う場合に遵守すべき事項として、以下が挙げられます。患者に対し<strong>適応外であることを書面で説明し同意を得る</strong>こと、使用する薬剤の添付文書に記載された副作用（悪心、嘔吐、下痢、膵炎、甲状腺腫瘍のリスク等）について十分に説明すること、<strong>定期的な医学的フォロー</strong>（血液検査を含む）を実施すること、医薬品副作用被害救済制度の対象外となる可能性を説明することです。</p>

        <p>医療広告ガイドライン上も、適応外使用の薬剤について「痩せる」「ダイエット効果」等の表現で広告することには<strong>法的リスク</strong>が伴います。誇大広告や虚偽広告に該当しないよう、表現には細心の注意が必要です。限定解除の要件を満たす場合に限り、治療内容やリスクを併記した上での情報提供が認められています。</p>
      </section>

      {/* ── セクション6: 運用設計 ── */}
      <section>
        <h2 id="clinic-operation" className="text-xl font-bold text-gray-800">クリニックでの運用設計</h2>

        <p>肥満症治療をクリニックで運用する場合、保険診療・自費診療のいずれにおいても、<strong>継続的なフォロー体制</strong>が治療成果の鍵を握ります。</p>

        <FlowSteps steps={[
          { title: "初診・スクリーニング", desc: "BMI・合併症の評価、血液検査、既往歴の確認。保険適用の可否を判定し、治療方針を説明" },
          { title: "生活習慣改善の指導", desc: "食事療法・運動療法の導入。保険適用の場合は3ヶ月以上の生活習慣改善が前提" },
          { title: "薬物療法の開始", desc: "低用量から開始し、副作用をモニタリングしながら段階的に増量。自己注射手技の指導" },
          { title: "定期フォロー", desc: "月1回の受診で体重・副作用・血液検査を確認。3ヶ月時点で効果判定（5%以上の体重減少）" },
          { title: "維持期の管理", desc: "目標体重達成後のリバウンド防止。生活習慣の定着支援と段階的な減薬の検討" },
        ]} />

        <p>GLP-1受容体作動薬の<strong>主な副作用は消化器症状</strong>（悪心・嘔吐・下痢）であり、投与初期と増量時に出現しやすい傾向があります。段階的な増量スケジュールを遵守し、副作用が強い場合は増量を延期するなど、柔軟な対応が求められます。</p>

        <p>LINEを活用したフォローアップとして、体重記録の定期報告、副作用出現時の相談窓口、次回受診リマインド、食事記録の共有などが効果的です。特に治療初期の副作用対応をLINEで迅速に行うことで、患者の不安を軽減し治療脱落を防止できます。</p>
      </section>

      {/* ── セクション7: 今後の展望 ── */}
      <section>
        <h2 id="future-outlook" className="text-xl font-bold text-gray-800">今後の展望</h2>

        <p>肥満症治療の薬物療法は、GLP-1受容体作動薬の登場により<strong>大きな転換期</strong>を迎えています。今後注目すべき動向を整理します。</p>

        <p>第一に、<strong>チルゼパチド（GIP/GLP-1デュアルアゴニスト）</strong>の肥満症適応での日本承認が期待されています。海外の臨床試験では体重減少率が約20%に達しており、セマグルチドを上回る効果が報告されています。日本での承認が実現すれば、肥満症治療の選択肢がさらに広がります。</p>

        <p>第二に、<strong>経口GLP-1製剤</strong>の開発が進んでいます。現在のGLP-1受容体作動薬は注射剤が主流ですが、経口セマグルチド（リベルサス）の高用量製剤や次世代の経口製剤が開発中であり、注射への抵抗感がある患者への選択肢となる可能性があります。</p>

        <p>第三に、<strong>オンライン診療との組み合わせ</strong>の拡大です。肥満症の継続治療は長期にわたるため、通院負担の軽減は治療継続率に直結します。ウゴービの保険処方には施設基準が求められますが、安定期のフォローアップにオンライン診療を活用する運用は今後増加していくと考えられます。</p>
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <p>ウゴービの保険適用は、日本の肥満症治療にとって大きなマイルストーンです。保険適用の要件を正確に把握し、自費処方のGLP-1との使い分けを適切に行うことが、クリニック運営上の重要なポイントとなります。</p>

        <p>適応外使用については、患者への十分な説明と同意取得、定期的な医学的フォロー、医療広告ガイドラインの遵守が不可欠です。GLP-1受容体作動薬は有効な薬剤ですが、<strong>安全な使用のための適切な管理体制</strong>が前提であることを忘れてはなりません。</p>

        <p>Lオペ for CLINICでは、LINE上での予約管理・フォローアップ配信・問診自動化を通じて、<Link href="/lp" className="text-blue-600 hover:underline">肥満症治療を含む慢性疾患管理の継続率向上</Link>を支援しています。</p>
      </section>
    </ArticleLayout>
  );
}
