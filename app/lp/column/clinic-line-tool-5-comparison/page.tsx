import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, {
  InlineCTA,
  Callout,
  ComparisonTable,
  StatGrid,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "clinic-line-tool-5-comparison")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const jsonLd = [
  {
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
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "メディカルフォースとLオペ for CLINICの違いは？",
        acceptedAnswer: { "@type": "Answer", text: "メディカルフォースは電子カルテ・予約管理を中心とした自由診療向けクラウドシステムです。LINE連携はオプション対応。Lオペ for CLINICはLINE公式アカウントを起点に予約・問診・CRM・配信・決済・配送まで一元管理できるオールインワンプラットフォームです。" },
      },
      {
        "@type": "Question",
        name: "Marchはクリニックでも使える？",
        acceptedAnswer: { "@type": "Answer", text: "MarchはLINE公式アカウントのCRM・配信ツールとして多業種で利用されています。クリニックでも配信やタグ管理は可能ですが、予約管理・問診・カルテ・決済といった医療特有の機能は別途ツールが必要です。" },
      },
      {
        "@type": "Question",
        name: "medibotとは？",
        acceptedAnswer: { "@type": "Answer", text: "medibotはLINE上でのWeb予約・予約管理に特化した医療機関向けサービスです。予約機能は充実していますが、CRM・セグメント配信・決済・配送管理などは対象外のため、フル活用するには他ツールとの組み合わせが必要です。" },
      },
      {
        "@type": "Question",
        name: "クリニック向けLINEツールの月額費用の相場は？",
        acceptedAnswer: { "@type": "Answer", text: "ツールにより月額1万〜20万円以上と幅があります。予約のみの単機能ツールは月1〜3万円程度、LINE配信CRMは月3〜10万円程度、オールインワン型は月7〜20万円程度が目安です。ただし複数ツールを組み合わせると合計で月15〜30万円になることもあります。" },
      },
    ],
  },
];

const keyPoints = [
  "Lオペ・メディカルフォース・March・medibot・Lステップの5社を比較",
  "LINE連携度・予約管理・CRM・費用の4軸で評価",
  "クリニック規模・診療形態別のおすすめツール",
];

const toc = [
  { id: "why-line", label: "なぜクリニックにLINEツールが必要か" },
  { id: "5-tools", label: "5社の特徴を1分で把握" },
  { id: "comparison-table", label: "機能比較表" },
  { id: "line-integration", label: "LINE連携度の違い" },
  { id: "cost", label: "費用比較" },
  { id: "recommend", label: "規模・診療形態別おすすめ" },
  { id: "faq", label: "よくある質問" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="比較" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        クリニック向けLINE活用ツールは<strong>Lオペ for CLINIC・メディカルフォース・March・medibot・Lステップ</strong>の5つが代表的です。LINE連携の深さ・予約管理・CRM・費用の4軸で比較すると、クリニックの規模や診療形態によって最適な選択肢が異なります。本記事では各ツールの強み・弱みを客観的に整理し、自院に合うツール選びをサポートします。
      </p>

      {/* ═══ なぜLINEツールが必要か ═══ */}
      <section>
        <h2 id="why-line">なぜクリニックにLINEツールが必要か</h2>
        <p>
          LINEの国内月間アクティブユーザー数は<strong>9,700万人超</strong>。メール開封率が10〜15%にとどまる一方、LINEメッセージの開封率は<strong>80〜90%</strong>に達します。
          患者との接点をLINEに集約することで、予約リマインド・再診促進・問診案内・決済通知をすべてLINE上で完結できます。
        </p>
        <StatGrid stats={[
          { value: "9,700万+", label: "LINE月間ユーザー数" },
          { value: "80〜90%", label: "LINEメッセージ開封率" },
          { value: "10〜15%", label: "メール開封率（比較）" },
        ]} />
        <p>
          ただし、LINE公式アカウント単体では高度な予約管理やCRM、セグメント配信はできません。そこで外部ツールとの連携が必要になりますが、
          ツールごとに<strong>LINE連携の深さ</strong>や<strong>対応できる業務範囲</strong>が大きく異なります。
        </p>
      </section>

      {/* ═══ 5社の特徴 ═══ */}
      <section>
        <h2 id="5-tools">5社の特徴を1分で把握</h2>

        <h3>1. Lオペ for CLINIC</h3>
        <p>
          LINE公式アカウントを起点に、<strong>予約・問診・カルテ・CRM・セグメント配信・決済・配送管理</strong>までワンストップで提供するクリニック特化プラットフォーム。
          院長と事務スタッフ1人で全業務を回せる設計が特徴。自由診療・保険診療の両方に対応。
        </p>

        <h3>2. メディカルフォース（medicalforce）</h3>
        <p>
          自由診療クリニック向けのクラウド型業務管理システム。<strong>電子カルテ・予約管理・会計</strong>を中心に、CRM機能も搭載。
          LINEとの連携はオプションで、メッセージ配信やセグメント管理は限定的。自由診療の業務フロー全体を1システムでカバーしたいクリニック向け。
        </p>

        <h3>3. March</h3>
        <p>
          LINE公式アカウントの<strong>CRM・セグメント配信</strong>に強みを持つマーケティングツール。多業種対応で、タグ管理・シナリオ配信・フォーム作成などが充実。
          医療特有の機能（予約管理・問診・カルテ・決済）は非対応のため、クリニックでは他ツールとの併用が前提。
        </p>

        <h3>4. medibot</h3>
        <p>
          LINE上での<strong>Web予約・予約管理</strong>に特化した医療機関向けサービス。LINEリッチメニューからの予約導線が強み。
          予約機能は充実しているが、CRM・配信・決済・配送は対象外。予約管理だけをLINE化したいクリニックに向いている。
        </p>

        <h3>5. Lステップ</h3>
        <p>
          LINE公式アカウントの拡張ツールとして国内トップシェアを持つ<strong>汎用LINE配信ツール</strong>。シナリオ配信・タグ管理・リッチメニュー出し分けなどが強力。
          多業種対応のため、クリニック特有の予約管理・問診・カルテ・決済機能はない。詳しくは
          <Link href="/lp/column/lstep-vs-clinic-tool" className="text-sky-600 underline hover:text-sky-800">Lステップ vs クリニック専用ツール比較記事</Link>を参照。
        </p>
      </section>

      <InlineCTA />

      {/* ═══ 機能比較表 ═══ */}
      <section>
        <h2 id="comparison-table">機能比較表</h2>
        <p>
          クリニック運営に必要な機能を6つの軸で比較します。◎=標準搭載、○=対応可、△=限定的/オプション、×=非対応。
        </p>
        <ComparisonTable
          headers={["機能", "Lオペ", "メディカルフォース", "March", "medibot", "Lステップ"]}
          rows={[
            ["LINE予約管理", "◎", "△", "×", "◎", "×"],
            ["オンライン問診", "◎", "○", "×", "×", "×"],
            ["電子カルテ連携", "◎", "◎", "×", "×", "×"],
            ["セグメント配信", "◎", "△", "◎", "×", "◎"],
            ["患者CRM", "◎", "○", "◎", "×", "○"],
            ["決済・配送管理", "◎", "△", "×", "×", "×"],
            ["リッチメニュー", "◎", "△", "○", "○", "◎"],
            ["AI自動返信", "◎", "×", "×", "×", "×"],
            ["リマインド自動送信", "◎", "○", "○", "◎", "○"],
          ]}
        />

        <Callout type="point" title="比較のポイント">
          <strong>メディカルフォース</strong>はカルテ・会計が強い反面、LINE配信は限定的。
          <strong>March・Lステップ</strong>は配信・CRMが強いが医療機能なし。
          <strong>medibot</strong>は予約特化。
          <strong>Lオペ</strong>は全領域をカバーするオールインワン型。
        </Callout>
      </section>

      {/* ═══ LINE連携度の違い ═══ */}
      <section>
        <h2 id="line-integration">LINE連携度の違い</h2>
        <p>
          「LINE対応」と一口に言っても、連携の深さはツールによって大きく異なります。
        </p>

        <h3>レベル1: LINE通知のみ</h3>
        <p>予約確認やリマインドをLINEで通知するだけ。操作は別システムのWebブラウザで行う。メディカルフォースのLINE連携はこのレベルが中心。</p>

        <h3>レベル2: LINE上で一部操作</h3>
        <p>リッチメニューから予約やフォーム入力が可能。medibot・Lステップ・Marchがこのレベル。ただし予約以外の業務（問診・決済等）は別システム。</p>

        <h3>レベル3: LINE上で業務完結</h3>
        <p>予約・問診・決済・配送通知・再診促進まですべてLINEトーク上で完結。患者がアプリを切り替える必要がない。Lオペ for CLINICはこのレベルを目指した設計。</p>

        <Callout type="point" title="患者体験の違い">
          LINE連携が深いほど患者の離脱が減ります。予約だけLINEで問診は別サイト、決済はまた別…という体験は離脱率を高めます。
        </Callout>
      </section>

      {/* ═══ 費用比較 ═══ */}
      <section>
        <h2 id="cost">費用比較</h2>
        <p>
          各ツールの費用体系は公開情報をもとに整理しています（2026年3月時点。最新の正確な料金は各社公式サイトをご確認ください）。
        </p>

        <ComparisonTable
          headers={["ツール", "初期費用", "月額目安", "課金モデル"]}
          rows={[
            ["Lオペ for CLINIC", "33万〜55万円", "7.2万〜12.1万円", "機能プラン+通数課金"],
            ["メディカルフォース", "要問合せ", "要問合せ", "機能+規模課金"],
            ["March", "要問合せ", "要問合せ", "友だち数課金"],
            ["medibot", "無料〜", "月1〜3万円程度", "予約数課金"],
            ["Lステップ", "無料", "月2,980〜59,800円", "配信数+機能課金"],
          ]}
        />

        <Callout type="warning" title="トータルコストで比較する">
          単体で安くても、予約システム（月3〜5万）+CRMツール（月5〜10万）+LINE配信（月3〜6万）を組み合わせると<strong>月15〜30万円</strong>に膨らむケースがあります。
          オールインワン型なら1つの契約で完結するため、トータルでは割安になることも。
        </Callout>
      </section>

      {/* ═══ 規模・診療形態別おすすめ ═══ */}
      <section>
        <h2 id="recommend">規模・診療形態別おすすめ</h2>

        <h3>自由診療クリニック（美容・AGA・ダイエット外来等）</h3>
        <p>
          決済・配送・リピート促進まで含めた一気通貫の運用が求められます。<strong>Lオペ</strong>のオールインワン型か、カルテ中心なら<strong>メディカルフォース</strong>+配信ツールの組み合わせ。
          詳しくは<Link href="/lp/column/beauty-clinic-line" className="text-sky-600 underline hover:text-sky-800">美容クリニックのLINE活用事例</Link>も参考に。
        </p>

        <h3>保険診療メインのクリニック（内科・皮膚科・歯科等）</h3>
        <p>
          予約リマインドによる無断キャンセル削減と、再診促進のセグメント配信が最優先。<strong>Lオペ</strong>または<strong>medibot</strong>（予約特化で始めたい場合）がフィット。
          歯科の場合は<Link href="/lp/column/dental-clinic-line" className="text-sky-600 underline hover:text-sky-800">歯科クリニックのLINE活用記事</Link>も参照。
        </p>

        <h3>小規模・開業前のクリニック</h3>
        <p>
          まずはコストを抑えて始めたい場合、<strong>Lステップ</strong>や<strong>medibot</strong>で部分的にスタートし、患者数が増えてきたらオールインワン型に移行するのも選択肢です。
          開業前の準備については<Link href="/lp/column/clinic-opening-line" className="text-sky-600 underline hover:text-sky-800">開業前LINE戦略</Link>をご覧ください。
        </p>

        <h3>すでにLステップ・Marchを使っているクリニック</h3>
        <p>
          配信・タグ管理はうまく回っているが、予約や問診が別管理で非効率…という場合は、<strong>クリニック専用ツールへの乗り換え</strong>でオペレーションを一本化できます。
          乗り換えの判断基準は<Link href="/lp/column/lstep-vs-clinic-tool" className="text-sky-600 underline hover:text-sky-800">Lステップ vs クリニック専用ツール比較</Link>で解説しています。
        </p>
      </section>

      <InlineCTA />

      {/* ═══ FAQ ═══ */}
      <section>
        <h2 id="faq">よくある質問</h2>
        <div className="space-y-4">
          <details className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <summary className="cursor-pointer px-6 py-4 text-[15px] font-bold text-gray-800">メディカルフォースとLオペ for CLINICの違いは？</summary>
            <div className="border-t border-gray-100 px-6 py-4 text-[14px] leading-relaxed text-gray-600">
              メディカルフォースは電子カルテ・予約管理・会計を中心とした自由診療向けクラウドシステムです。LINE連携はオプション対応で、配信機能は限定的です。
              Lオペ for CLINICはLINE公式アカウントを起点に予約・問診・CRM・配信・決済・配送までワンストップで提供。LINE上で患者体験を完結させたいクリニックに適しています。
            </div>
          </details>
          <details className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <summary className="cursor-pointer px-6 py-4 text-[15px] font-bold text-gray-800">Marchはクリニックでも使える？</summary>
            <div className="border-t border-gray-100 px-6 py-4 text-[14px] leading-relaxed text-gray-600">
              MarchはLINE CRM・配信ツールとして多業種で利用されています。タグ管理やシナリオ配信は優秀ですが、
              予約管理・問診・カルテ・決済といった医療特有の機能は非対応のため、クリニックでは他ツールとの併用が必要です。
            </div>
          </details>
          <details className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <summary className="cursor-pointer px-6 py-4 text-[15px] font-bold text-gray-800">medibotの強みと弱みは？</summary>
            <div className="border-t border-gray-100 px-6 py-4 text-[14px] leading-relaxed text-gray-600">
              medibotはLINE上のWeb予約に特化しており、予約導線の設計が優れています。初期費用が無料〜と導入ハードルが低い点も魅力です。
              一方、CRM・セグメント配信・決済・配送管理は対象外のため、LINE活用を広げたい場合は別ツールとの組み合わせが必要になります。
            </div>
          </details>
          <details className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <summary className="cursor-pointer px-6 py-4 text-[15px] font-bold text-gray-800">クリニック向けLINEツールの月額費用の相場は？</summary>
            <div className="border-t border-gray-100 px-6 py-4 text-[14px] leading-relaxed text-gray-600">
              予約特化の単機能ツールは月1〜3万円、LINE配信CRMは月3〜10万円、オールインワン型は月7〜20万円が目安です。
              ただし複数ツールを組み合わせると合計で月15〜30万円になることもあるため、トータルコストで比較することが重要です。
            </div>
          </details>
        </div>
      </section>

      {/* ═══ まとめ ═══ */}
      <section>
        <h2 id="summary">まとめ</h2>
        <p>
          クリニック向けLINEツール5社を比較しました。それぞれに強みがあり、「どれが最良か」は自院の規模・診療形態・優先したい業務によって異なります。
        </p>
        <ul className="ml-6 list-disc space-y-2 text-[15px] text-gray-700">
          <li><strong>LINE上で全業務を完結させたい</strong> → Lオペ for CLINIC</li>
          <li><strong>電子カルテ・会計中心で自由診療特化</strong> → メディカルフォース</li>
          <li><strong>LINE配信・CRMを高度に使いたい</strong> → March / Lステップ</li>
          <li><strong>まず予約だけLINE化したい</strong> → medibot</li>
        </ul>
        <p className="mt-4">
          ツール選びで迷ったら、まずは各社の資料を取り寄せて比較するのがおすすめです。
          Lオペ for CLINICの機能詳細は<Link href="/lp/features" className="text-sky-600 underline hover:text-sky-800">機能一覧ページ</Link>をご覧ください。
        </p>
      </section>
    </ArticleLayout>
  );
}
