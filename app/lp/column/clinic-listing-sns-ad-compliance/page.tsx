import type { Metadata } from "next";
import Link from "next/link";
import ArticleLayout, {
  Callout,
  ComparisonTable,
  FlowSteps,
  InlineCTA,
  StatGrid,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const slug = "clinic-listing-sns-ad-compliance";
const title = "クリニックのリスティング広告・SNS広告と医療広告ガイドライン — 違反しない実践ガイド";
const description = "Google広告・Yahoo広告のリスティング広告、Instagram・X・TikTokのSNS投稿、LINE配信で医療広告ガイドラインに違反しないための実践ガイド。NGワード一覧、OK表現の具体例、限定解除4要件、ビフォーアフター写真のルール、チェックリストまで網羅的に解説します。";
const date = "2026-03-23";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/lp/column/${slug}` },
  openGraph: { title, description, url: `${SITE_URL}/lp/column/${slug}`, type: "article", publishedTime: date },
};

const jsonLdArticle = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: title,
  description,
  datePublished: date,
  dateModified: date,
  image: `${SITE_URL}/lp/column/${slug}/opengraph-image`,
  author: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL },
  publisher: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL, logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.png` } },
  mainEntityOfPage: `${SITE_URL}/lp/column/${slug}`,
};

const jsonLdFaq = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "リスティング広告にも医療広告ガイドラインは適用されますか？",
      acceptedAnswer: { "@type": "Answer", text: "はい。2018年の医療法改正により、Google広告・Yahoo広告などのリスティング広告も医療広告ガイドラインの規制対象となりました。広告文だけでなく、遷移先のランディングページも規制対象です。" },
    },
    {
      "@type": "Question",
      name: "InstagramやTikTokのクリニック投稿は広告に該当しますか？",
      acceptedAnswer: { "@type": "Answer", text: "クリニック公式アカウントからの投稿で、施術の誘引性がある場合は広告に該当します。施術紹介、キャンペーン告知、ビフォーアフター写真などは広告として医療広告ガイドラインの規制を受けます。" },
    },
    {
      "@type": "Question",
      name: "ビフォーアフター写真をSNSに投稿できますか？",
      acceptedAnswer: { "@type": "Answer", text: "限定解除の4要件（問い合わせ先、治療内容、費用、リスク・副作用の明示）をすべて満たす場合のみ投稿可能です。写真のみの投稿は医療広告ガイドライン違反となります。" },
    },
    {
      "@type": "Question",
      name: "Google広告で使ってはいけないNGワードは？",
      acceptedAnswer: { "@type": "Answer", text: "「最新」「最先端」「日本一」「確実に」「絶対に」「業界最安」などの最上級・断定表現は使用できません。また、Googleのヘルスケア＆医薬品ポリシーにより、未承認薬や特定の処方薬の広告にも制限があります。" },
    },
    {
      "@type": "Question",
      name: "医療広告ガイドラインに違反するとどうなりますか？",
      acceptedAnswer: { "@type": "Answer", text: "行政指導・是正命令のほか、是正命令に従わない場合は6ヶ月以下の懲役または30万円以下の罰金が科されます。Google広告アカウントの停止、SNSアカウントの凍結、風評被害による信頼喪失など、経営への影響も甚大です。" },
    },
  ],
};

const keyPoints = [
  "リスティング広告・SNS投稿・LINE配信のすべてが医療広告ガイドラインの規制対象",
  "NGワード一覧とOK表現の具体例で広告作成時の判断基準を提示",
  "限定解除4要件とチェックリスト10項目で出稿前の自己点検が可能",
];

const toc = [
  { id: "listing-ads", label: "リスティング広告の医療広告ガイドライン" },
  { id: "sns-ads", label: "SNS投稿の医療広告ガイドライン" },
  { id: "line-ads", label: "LINE配信の注意点" },
  { id: "limited-release", label: "限定解除の4要件" },
  { id: "violation-cases", label: "違反事例と改善例" },
  { id: "penalty", label: "違反した場合のリスク" },
  { id: "checklist", label: "広告出稿前セルフチェックリスト" },
  { id: "lope-support", label: "Lオペによる広告コンプライアンス支援" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={slug} breadcrumbLabel="ガイド" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdArticle) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        クリニックの集患手段としてGoogle広告やSNSの活用は不可欠ですが、<strong>医療広告ガイドライン</strong>と各プラットフォームの独自ポリシーという<strong>二重の規制</strong>をクリアする必要があります。2018年の医療法改正でWebサイト・SNS・LINE配信も規制対象となり、「知らなかった」は免責事由になりません。本記事では、リスティング広告・SNS投稿・LINE配信それぞれの<strong>具体的なNG表現とOK表現</strong>を提示し、出稿前に使えるチェックリストまで解説します。<Link href="/lp/column/clinic-ad-yakki-ho-guide" className="text-sky-600 underline hover:text-sky-800">薬機法ガイド</Link>・<Link href="/lp/column/self-pay-online-clinic-rules" className="text-sky-600 underline hover:text-sky-800">自費診療ルール</Link>もあわせてご確認ください。
      </p>

      {/* ── セクション1: リスティング広告の医療広告ガイドライン ── */}
      <section>
        <h2 id="listing-ads" className="text-xl font-bold text-gray-800">リスティング広告の医療広告ガイドライン</h2>

        <p>Google広告・Yahoo広告などのリスティング広告は、2018年の医療法改正で<strong>医療広告ガイドラインの規制対象</strong>に明確に組み込まれました。検索連動型広告・ディスプレイ広告を問わず、クリニックが出稿する広告はすべて規制を受けます。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">医療広告ガイドラインの適用範囲</h3>
        <p>リスティング広告における規制は、<strong>広告文（見出し・説明文）</strong>だけでなく<strong>遷移先のランディングページ</strong>にも及びます。広告文自体は適法でも、ランディングページに禁止表現が含まれていれば違反となります。特に自費診療のランディングページでは、限定解除の4要件を満たす必要があり、治療内容・費用・リスク副作用・治療期間の記載が求められます。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">Google広告の医療系ポリシー（二重規制）</h3>
        <p>医療広告ガイドラインに加え、Googleは独自の<strong>ヘルスケア＆医薬品ポリシー</strong>を設けています。このポリシーでは、未承認の医薬品・サプリメントの宣伝、処方薬のオンライン販売広告、特定の医療行為に関する誤解を招く表現が禁止されています。日本国内のクリニックは、医療広告ガイドラインとGoogleポリシーの<strong>両方を同時に満たす</strong>必要があります。</p>

        <ComparisonTable
          headers={["規制元", "対象", "違反時の影響"]}
          rows={[
            ["医療広告ガイドライン", "広告文＋LP全体", "行政指導・是正命令・刑事罰"],
            ["Googleヘルスケアポリシー", "広告文＋LPの内容", "広告の不承認・アカウント停止"],
            ["Yahoo広告ガイドライン", "広告文＋LP全体", "広告の掲載停止・アカウント停止"],
          ]}
        />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">広告文で使えないNGワード</h3>
        <p>リスティング広告の見出し・説明文で以下の表現は使用できません。医療広告ガイドラインの禁止事項に加え、Google・Yahoo独自の審査で不承認となるケースも含みます。</p>

        <ul className="space-y-2 text-gray-700">
          <li><strong>最上級・比較表現</strong> — 「最新」「最先端」「日本一」「地域No.1」「業界トップクラス」</li>
          <li><strong>効果保証・断定</strong> — 「確実に」「絶対に」「必ず治る」「100%」「痛みゼロ」</li>
          <li><strong>費用の優位性</strong> — 「業界最安」「最安値保証」「他院より安い」</li>
          <li><strong>緊急性の煽り</strong> — 「今すぐ」「期間限定」「残り○枠」（※過度な煽りに該当する場合）</li>
          <li><strong>体験談の引用</strong> — 「患者満足度98%」（自院調査に基づく場合）</li>
        </ul>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">広告文のOK表現の具体例</h3>
        <p>医療広告ガイドラインに抵触しない広告文の書き方を具体例で示します。ポイントは、<strong>事実の提示</strong>と<strong>相談の案内</strong>に徹することです。</p>

        <ul className="space-y-2 text-gray-700">
          <li>「○○治療についてご相談ください」 — 治療の相談案内に留める</li>
          <li>「△△の処方が可能です」 — 診療内容の事実を記載</li>
          <li>「オンライン診療対応・予約受付中」 — 診療体制の事実を記載</li>
          <li>「○○科 専門医在籍」 — 客観的な資格情報の記載</li>
          <li>「初診料○○円（税込）」 — 具体的な費用の明示</li>
        </ul>

        <Callout type="warning" title="ランディングページも要注意">
          リスティング広告の遷移先であるランディングページにも医療広告ガイドラインが適用されます。広告文がOKでもLPに「施術前後の写真（説明なし）」「患者の声」「最先端機器導入」などの禁止表現があれば違反です。自費診療のLPでは<strong>限定解除の4要件</strong>（問い合わせ先・治療内容・費用・リスク副作用）を必ず満たしてください。
        </Callout>
      </section>

      {/* ── セクション2: SNS投稿の医療広告ガイドライン ── */}
      <section>
        <h2 id="sns-ads" className="text-xl font-bold text-gray-800">SNS投稿の医療広告ガイドライン</h2>

        <p>Instagram・X（旧Twitter）・TikTokなどのSNS投稿は、すべてが広告に該当するわけではありません。ただし、<strong>施術への誘引性がある投稿</strong>は広告として医療広告ガイドラインの規制を受けます。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">SNS投稿が「広告」に該当するケース</h3>
        <p>厚生労働省の見解では、以下の<strong>2つの要件を両方満たす場合</strong>に広告として規制されます。(1) 患者の受診を誘引する意図がある（誘引性）、(2) クリニック名や所在地が特定可能（特定性）。クリニック公式アカウントからの施術紹介や料金案内、キャンペーン告知は、この2要件をほぼ確実に満たすため、広告として扱われます。</p>

        <ComparisonTable
          headers={["投稿内容", "広告該当性", "理由"]}
          rows={[
            ["施術の紹介・料金案内", "該当する", "誘引性＋特定性あり"],
            ["キャンペーン・割引告知", "該当する", "受診誘引の意図が明確"],
            ["ビフォーアフター写真", "該当する", "治療効果の誘引"],
            ["院内の雰囲気紹介", "該当しにくい", "誘引性が弱い（ただし施術言及は注意）"],
            ["スタッフの日常投稿", "該当しにくい", "医療行為への誘引性なし"],
            ["医療知識の一般的な解説", "該当しにくい", "特定の施術への誘引がない場合"],
          ]}
        />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">ビフォーアフター写真のSNS投稿ルール</h3>
        <p>ビフォーアフター写真は<strong>限定解除の4要件を満たす場合にのみ投稿可能</strong>です。写真だけを投稿し、キャプションに治療内容やリスクの記載がないケースは明確な違反です。Instagramの場合、画像投稿のキャプション内に以下の情報をすべて記載する必要があります。</p>

        <ul className="space-y-2 text-gray-700">
          <li><strong>治療内容の詳細</strong> — 施術名、使用薬剤・機器を具体的に記載</li>
          <li><strong>費用</strong> — 治療にかかった金額を明示（税込表記）</li>
          <li><strong>治療期間・回数</strong> — 治療に要した期間と施術回数</li>
          <li><strong>リスク・副作用</strong> — 主なリスクと副作用を具体的に記載</li>
          <li><strong>問い合わせ先</strong> — クリニック名・電話番号・所在地</li>
        </ul>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">患者の体験談・口コミの取り扱い</h3>
        <p>自院のSNSアカウントやWebサイトに<strong>患者の体験談を掲載することは原則禁止</strong>です。「たった1回で肌が生まれ変わりました」「先生のおかげで自信が持てました」といった投稿は、治療効果について誤認を与えるおそれがあるとして規制されます。一方、Googleマップの口コミや第三者サイト（口コミサイト等）に患者自身が自発的に投稿したレビューは、クリニックが管理・誘導していない限り規制対象外です。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">インフルエンサーマーケティングの注意点</h3>
        <p>クリニックがインフルエンサーに施術を提供し、SNSで紹介してもらう手法は<strong>2つの法規制が同時に適用</strong>されます。まず、2023年10月施行の<strong>ステルスマーケティング規制</strong>により、広告であることを明示する義務があります（「#PR」「#広告」等の表記）。加えて、インフルエンサーの投稿がクリニックの指示・依頼に基づく場合は<strong>医療広告ガイドライン</strong>の規制対象となり、禁止表現の使用やビフォーアフター写真の無断掲載は違反です。</p>

        <Callout type="info" title="ハッシュタグの使い方に注意">
          「#シミ消し」「#シワ取り」「#若返り」などのハッシュタグは、<strong>効果を断定する誇大表現に該当する可能性</strong>があります。正確な表現としては「#シミ治療」「#美容皮膚科」「#エイジングケア相談」など、事実や診療科名に基づいたハッシュタグを使用しましょう。また、「#症例写真」のタグを使う場合は、投稿本文に限定解除要件の情報を必ず含めてください。
        </Callout>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">Instagramリール・TikTokの施術動画</h3>
        <p>短尺動画で施術の様子を紹介するコンテンツは、視覚的な訴求力が高い反面、<strong>規制違反のリスクも高い</strong>メディアです。施術動画を投稿する際の注意点は以下のとおりです。</p>

        <ul className="space-y-2 text-gray-700">
          <li><strong>動画内またはキャプションに限定解除要件を記載</strong> — テキストオーバーレイや固定コメントを活用</li>
          <li><strong>施術効果の過度な強調は禁止</strong> — 編集で効果を誇張する演出（フィルター加工、早送り等）は不可</li>
          <li><strong>患者の同意取得</strong> — 施術映像に患者が映る場合は書面による同意が必須</li>
          <li><strong>「痛くない」「ダウンタイムなし」等の断定は不可</strong> — 個人差がある事項の断定は誇大広告に該当</li>
        </ul>
      </section>

      <InlineCTA />

      {/* ── セクション3: LINE配信の注意点 ── */}
      <section>
        <h2 id="line-ads" className="text-xl font-bold text-gray-800">LINE配信の注意点</h2>

        <p>LINE公式アカウントからの配信も、施術への誘引性がある場合は<strong>医療広告ガイドラインの規制対象</strong>です。友だち追加済みの患者への配信であっても、広告としての規制を免れるわけではありません。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">LINE配信が広告に該当するケース</h3>
        <p>一斉配信・セグメント配信を問わず、施術の案内・キャンペーン告知・新メニューの紹介は広告に該当します。一方、予約リマインド、来院後のフォローアップ、診療時間の変更通知など<strong>既存患者への事務的な情報提供</strong>は、誘引性が低いため広告に該当しにくいとされています。ただし、リマインドメッセージに「ついでにこの施術もおすすめ」と追記すれば広告に該当する可能性があります。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">セグメント配信で注意すべき表現</h3>
        <p>セグメント配信は特定の患者層にターゲットを絞って配信するため、<strong>パーソナライズされた広告</strong>として扱われます。注意すべき表現を以下にまとめます。</p>

        <ComparisonTable
          headers={["NG例", "OK例", "理由"]}
          rows={[
            ["前回の施術から3ヶ月経ちました。効果が薄れる前にご来院を！", "前回のご来院から3ヶ月が経過しました。ご相談がございましたらご予約ください。", "煽り表現→事実＋相談案内に変更"],
            ["○○様だけの特別価格でご案内！今だけ30%OFF", "○月の料金プランのご案内です。詳細はクリニックまでお問い合わせください。", "限定煽り→一般案内に変更"],
            ["リピーターの方は確実に効果を実感しています", "継続的なケアについてご案内しております。", "効果保証→ケアの案内に変更"],
          ]}
        />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">テンプレートメッセージの表現チェックポイント</h3>
        <p>LINE配信で使用するテンプレートメッセージは、事前に以下のポイントをチェックしてください。</p>

        <FlowSteps steps={[
          { title: "禁止表現の確認", desc: "最上級表現・効果保証・体験談の引用がないか" },
          { title: "誇大表現の確認", desc: "「痛みなし」「ダウンタイムゼロ」等の断定がないか" },
          { title: "費用表記の確認", desc: "自費施術の場合、料金が税込で明記されているか" },
          { title: "限定解除要件の確認", desc: "自費施術の案内にリスク・副作用が記載されているか" },
          { title: "煽り表現の確認", desc: "「今だけ」「残りわずか」等の過度な緊急性がないか" },
        ]} />
      </section>

      {/* ── セクション4: 限定解除の4要件 ── */}
      <section>
        <h2 id="limited-release" className="text-xl font-bold text-gray-800">限定解除の4要件</h2>

        <p>医療広告ガイドラインでは、通常禁止されている事項（自費診療の詳細、ビフォーアフター写真、未承認薬の使用等）であっても、<strong>限定解除の4要件をすべて満たせば</strong>広告に記載することが認められます。リスティング広告のLP、SNS投稿、LINE配信のいずれにおいても、自費診療の広告を行う場合はこの4要件が必須です。</p>

        <StatGrid stats={[
          { value: "1", unit: "要件目", label: "医師・医療機関の氏名・名称・連絡先" },
          { value: "2", unit: "要件目", label: "治療内容・費用に関する事項" },
          { value: "3", unit: "要件目", label: "治療のリスク・副作用に関する事項" },
          { value: "4", unit: "要件目", label: "治療期間・回数に関する事項" },
        ]} />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">要件1: 医師・医療機関の情報</h3>
        <p>広告の主体を明確にするため、<strong>クリニック名、所在地、電話番号、医師名</strong>の記載が必要です。リスティング広告のLPであればフッターやサイドバーへの記載、Instagram投稿であればキャプション内またはプロフィールリンク先での明示が求められます。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">要件2: 治療内容・費用</h3>
        <p>施術名、使用薬剤・機器、施術の具体的な流れを記載します。費用は<strong>税込価格</strong>で明示し、追加費用が発生する可能性がある場合はその旨も記載します。「○○円〜」という表記は、最低価格の条件を併記する必要があります。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">要件3: リスク・副作用</h3>
        <p>治療に伴う<strong>主なリスクと副作用</strong>を具体的に記載します。「副作用が生じる可能性があります」という抽象的な記載では不十分です。「赤み・腫れが1〜2週間程度続く場合があります」「まれにアレルギー反応が生じることがあります」など、<strong>具体的な症状と期間</strong>を記載してください。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">要件4: 治療期間・回数</h3>
        <p>施術に必要な<strong>治療期間と回数の目安</strong>を記載します。「1回の施術で効果を実感」は効果保証に該当するリスクがあるため、「通常3〜5回の施術を推奨しています（個人差があります）」のように目安として記載しましょう。</p>

        <Callout type="warning" title="限定解除でも使えない表現がある">
          限定解除はあくまで「通常禁止されている情報の掲載を認める」制度であり、<strong>虚偽広告・比較優良広告・誇大広告</strong>は限定解除の対象外です。4要件を満たしていても、「日本一の技術」「他院より優れた結果」「確実に治る」といった表現は使用できません。
        </Callout>
      </section>

      {/* ── セクション5: 違反事例と改善例 ── */}
      <section>
        <h2 id="violation-cases" className="text-xl font-bold text-gray-800">違反事例と改善例</h2>

        <p>実際のクリニック広告でよく見られる違反パターンと、<Link href="/lp/column/medical-ad-guideline-compliance" className="text-sky-600 underline hover:text-sky-800">医療広告ガイドライン</Link>に準拠した改善例を対比で示します。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">リスティング広告の違反事例</h3>
        <ComparisonTable
          headers={["媒体", "違反表現", "改善表現"]}
          rows={[
            ["Google広告見出し", "最先端レーザーでシミ除去｜痛みゼロ", "シミ治療のご相談｜○○皮膚科"],
            ["Google広告説明文", "業界最安のヒアルロン酸注入。確実に若返る！", "ヒアルロン酸注入○○円（税込）〜｜まずはカウンセリングへ"],
            ["Yahoo広告見出し", "日本一の症例数！AGA治療", "AGA治療の処方が可能です｜○○クリニック"],
            ["LP本文", "患者様の声「1回で10歳若返りました」", "症例紹介（治療内容・費用・リスク・期間を併記）"],
          ]}
        />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">SNS投稿の違反事例</h3>
        <ComparisonTable
          headers={["媒体", "違反表現", "改善表現"]}
          rows={[
            ["Instagram投稿", "ビフォーアフター写真のみ（説明なし）", "写真＋キャプションに治療内容・費用・リスク・期間を記載"],
            ["Instagram Reel", "「痛くない！ダウンタイムなし！」のテロップ", "「痛みに配慮した施術です（個人差があります）」"],
            ["X（Twitter）", "「#シミ消し 当院なら1回で！」", "「#シミ治療 について当院でご相談いただけます」"],
            ["TikTok", "施術動画＋「絶対おすすめ」の音声", "施術動画＋治療説明テロップ＋リスク記載の固定コメント"],
            ["インフルエンサー投稿", "「○○クリニックで施術してもらった！最高！」（PR表記なし）", "「#PR ○○クリニック」＋治療内容・費用・リスクの記載"],
          ]}
        />
      </section>

      {/* ── セクション6: 違反した場合のリスク ── */}
      <section>
        <h2 id="penalty" className="text-xl font-bold text-gray-800">違反した場合のリスク</h2>

        <p>医療広告ガイドラインに違反した場合のリスクは、法的制裁にとどまらず<strong>クリニック経営全体に波及</strong>します。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">行政指導・是正命令</h3>
        <p>保健所や厚生局からの<strong>行政指導</strong>が最初の段階です。広告の修正・削除と改善報告書の提出が求められます。この段階で適切に対応すれば、それ以上の制裁に進むことはほとんどありません。しかし、是正命令に従わない場合は刑事罰の対象となります。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">Google広告アカウントの停止</h3>
        <p>Googleヘルスケアポリシーに違反した場合、個別の広告が不承認になるだけでなく、<strong>広告アカウント全体が停止</strong>されるリスクがあります。アカウント停止後の復旧は容易ではなく、異議申し立てが認められない場合は新規アカウントでの再出発が必要です。過去の運用データや最適化の蓄積がすべて失われるため、集患に大きな打撃を受けます。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">SNSアカウントの凍結</h3>
        <p>Instagram・TikTokなどのプラットフォームは独自のコミュニティガイドラインを設けており、医療系コンテンツに対する審査は年々厳格化しています。<strong>アカウント凍結</strong>となった場合、積み上げたフォロワーやコンテンツがすべて失われます。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">風評被害・信頼喪失</h3>
        <p>行政処分を受けたクリニックは厚生局のWebサイトで公表され、報道やSNSで拡散されます。<Link href="/lp/column/clinic-google-review" className="text-sky-600 underline hover:text-sky-800">Google口コミ</Link>への悪影響も避けられず、信頼回復には多大な時間とコストを要します。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">懲役・罰金（医療法違反）</h3>
        <p>悪質な違反や是正命令への不服従の場合、医療法違反で<strong>6ヶ月以下の懲役または30万円以下の罰金</strong>が科されます。薬機法違反が重なる場合は<strong>2年以下の懲役または200万円以下の罰金</strong>となり、さらに課徴金制度により違反対象商品の売上額の4.5%が徴収されます。</p>

        <Callout type="warning" title="2024年以降の監視体制強化">
          厚生労働省は医療広告のネットパトロール事業を強化し、AIを活用した自動検知システムの導入も進めています。特に美容医療・オンライン診療・自費診療のSNS広告が<strong>重点監視対象</strong>です。「見つからなければ大丈夫」という考えは通用しなくなっています。
        </Callout>
      </section>

      <InlineCTA />

      {/* ── セクション7: 広告出稿前セルフチェックリスト ── */}
      <section>
        <h2 id="checklist" className="text-xl font-bold text-gray-800">広告出稿前セルフチェックリスト</h2>

        <p>リスティング広告・SNS投稿・LINE配信を出稿する前に、以下の<strong>10項目</strong>をすべて確認してください。1つでもNGがあれば、修正してから出稿しましょう。</p>

        <ComparisonTable
          headers={["No.", "チェック項目", "対象媒体"]}
          rows={[
            ["1", "最上級表現（最新・最先端・日本一・No.1等）が含まれていないか", "全媒体"],
            ["2", "効果を保証・断定する表現（確実に・絶対に・100%等）がないか", "全媒体"],
            ["3", "他院との比較優良表現（○○より優れた・業界最安等）がないか", "全媒体"],
            ["4", "患者の体験談・口コミを広告に引用していないか", "全媒体"],
            ["5", "ビフォーアフター写真に限定解除4要件の情報が併記されているか", "SNS・LP"],
            ["6", "自費診療の広告にリスク・副作用・費用・治療期間が明記されているか", "全媒体"],
            ["7", "ランディングページに限定解除要件の情報が記載されているか", "リスティング広告"],
            ["8", "インフルエンサー投稿にPR表記と限定解除要件の情報があるか", "SNS"],
            ["9", "煽り表現（今だけ・残りわずか・急いで等）が過度でないか", "全媒体"],
            ["10", "クリニック名・所在地・連絡先が明記されているか", "全媒体"],
          ]}
        />

        <Callout type="info" title="定期的な見直しを推奨">
          医療広告ガイドラインは改正が行われることがあります。また、Google・Yahoo・Instagram・TikTokの広告ポリシーも定期的に更新されます。<strong>少なくとも半年に1回</strong>は既存の広告文・LP・SNS投稿を見直し、最新の規制に適合しているか確認しましょう。
        </Callout>
      </section>

      {/* ── セクション8: Lオペによる広告コンプライアンス支援 ── */}
      <section>
        <h2 id="lope-support" className="text-xl font-bold text-gray-800">Lオペによる広告コンプライアンス支援</h2>

        <p>Lオペ for CLINICは、クリニックのLINE配信における広告コンプライアンスを支援する機能を備えています。<Link href="/lp/column/online-clinic-marketing-guide" className="text-sky-600 underline hover:text-sky-800">クリニックマーケティング</Link>と法令遵守を両立する運用体制を構築できます。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">テンプレートメッセージで禁止表現を防止</h3>
        <p>あらかじめ医療広告ガイドラインに配慮した<strong>テンプレートメッセージ</strong>を用意しておくことで、配信担当者が禁止表現をうっかり使用するリスクを低減できます。施術案内、キャンペーン告知、リマインド配信など、パターンごとにテンプレートを選ぶだけでガイドラインに沿ったメッセージを作成可能です。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">セグメント配信とタグ管理</h3>
        <p>患者CRMの<strong>タグ管理機能</strong>を使い、施術歴や来院状況に応じたセグメント配信が可能です。ターゲットを絞った配信により、不特定多数への広告配信を避け、既存患者への情報提供に近い形での運用ができます。セグメント配信の際も、配信内容が広告に該当しないかの確認は必要です。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">配信履歴の管理とダッシュボード</h3>
        <p>ダッシュボードでは、過去の配信内容をすべて記録・管理できます。行政から配信内容の確認を求められた場合にも、<strong>配信日時・対象者・メッセージ内容を即座に提出</strong>できる体制が整います。AI自動返信やキーワード自動返信の履歴も保存されるため、患者とのコミュニケーション全体を監査できます。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">フォローアップルールの活用</h3>
        <p>フォローアップルール機能を使えば、来院後の経過確認や次回来院の案内を<strong>事務的な情報提供として自動配信</strong>できます。医療広告に該当しにくい形での患者フォローが実現し、再来院率の向上とコンプライアンスの両立が可能です。</p>

        <StatGrid stats={[
          { value: "10", unit: "項目", label: "出稿前チェックリスト" },
          { value: "4", unit: "要件", label: "限定解除の必須条件" },
          { value: "3", unit: "媒体", label: "規制対象（リスティング・SNS・LINE）" },
        ]} />
      </section>

      {/* ── セクション9: まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <Callout type="success" title="リスティング広告・SNS広告コンプライアンスの要点">
          <ol className="mt-2 space-y-2 list-decimal pl-4">
            <li><strong>リスティング広告は広告文＋LPの両方が医療広告ガイドラインの規制対象</strong> — Googleポリシーとの二重規制にも注意</li>
            <li><strong>SNS投稿は誘引性がある場合に広告に該当</strong> — ビフォーアフター写真は限定解除4要件が必須</li>
            <li><strong>LINE配信も広告規制の対象</strong> — セグメント配信やテンプレートメッセージの表現を事前チェック</li>
            <li><strong>限定解除4要件を満たせば自費診療の詳細な広告が可能</strong> — ただし虚偽・比較優良・誇大広告は対象外</li>
            <li><strong>10項目のチェックリストで出稿前に自己点検</strong> — 定期的な見直しで最新規制に対応</li>
            <li><strong>違反リスクは法的制裁＋アカウント停止＋風評被害と多層的</strong> — 監視体制の強化で摘発リスクは上昇中</li>
          </ol>
        </Callout>

        <p>リスティング広告・SNS・LINE配信の広告運用は、集患効果と法令遵守のバランスが求められます。<Link href="/lp/column/clinic-ad-yakki-ho-guide" className="text-sky-600 underline hover:text-sky-800">薬機法ガイド</Link>、<Link href="/lp/column/medical-ad-guideline-compliance" className="text-sky-600 underline hover:text-sky-800">医療広告ガイドライン全般</Link>、<Link href="/lp/column/self-pay-online-clinic-rules" className="text-sky-600 underline hover:text-sky-800">自費診療ルール</Link>、<Link href="/lp/column/online-clinic-marketing-guide" className="text-sky-600 underline hover:text-sky-800">クリニックマーケティングガイド</Link>もあわせてご確認ください。</p>

        <p>広告コンプライアンスの体制構築にお悩みのクリニックは、まずは<Link href="/lp/contact" className="text-sky-600 underline hover:text-sky-800">無料相談</Link>からお気軽にお問い合わせください。Lオペ for CLINICの導入により、法令遵守と効果的な集患を両立する運用体制をご提案いたします。</p>
      </section>
    </ArticleLayout>
  );
}
