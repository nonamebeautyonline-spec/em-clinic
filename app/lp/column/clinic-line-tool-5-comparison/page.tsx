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
        acceptedAnswer: { "@type": "Answer", text: "メディカルフォースは電子カルテ・予約管理・会計を中心とした自由診療向けクラウドシステムで、LINE連携やCRM・リマインド機能も搭載しています。Lオペ for CLINICはLINE公式アカウントを起点に予約・問診・CRM・配信・決済・配送まで一元管理でき、保険診療にも対応したオールインワンプラットフォームです。" },
      },
      {
        "@type": "Question",
        name: "MarchとLオペ for CLINICの違いは？",
        acceptedAnswer: { "@type": "Answer", text: "Marchは医療機関向けのオンライン診療・集患SaaSで、LINE上での予約・問診・オンライン診療・決済・物販・CRM・配信を幅広くカバーしています。Lオペ for CLINICはLINE運用に加え、院内カルテ連携やAI自動返信など院内業務の効率化にも対応した設計です。" },
      },
      {
        "@type": "Question",
        name: "medibotの特徴は？",
        acceptedAnswer: { "@type": "Answer", text: "medibotはLINE上での予約・問診・オンライン診療・決済をワンストップで提供する医療機関向けサービスです。シナリオ配信・セグメント配信・リッチメニュー出し分けなどのCRM機能も充実しています。" },
      },
      {
        "@type": "Question",
        name: "クリニック向けLINEツールの月額費用の相場は？",
        acceptedAnswer: { "@type": "Answer", text: "ツールにより月額数万円〜20万円以上と幅があります。LINE配信特化型は月3〜6万円、医療特化オールインワン型は月7〜20万円が目安です。複数ツールを組み合わせると合計で月15〜30万円になることもあります。" },
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
  { id: "strength", label: "各ツールの強みを深掘り" },
  { id: "cost", label: "費用比較" },
  { id: "recommend", label: "規模・診療形態別おすすめ" },
  { id: "faq", label: "よくある質問" },
  { id: "summary", label: "まとめ" },
];

/* ─── ツールカード用スタイル ─── */
const toolColors: Record<string, { bg: string; border: string; badge: string; text: string }> = {
  lope: { bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-600 text-white", text: "text-blue-700" },
  mf: { bg: "bg-violet-50", border: "border-violet-200", badge: "bg-violet-600 text-white", text: "text-violet-700" },
  march: { bg: "bg-emerald-50", border: "border-emerald-200", badge: "bg-emerald-600 text-white", text: "text-emerald-700" },
  medibot: { bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-600 text-white", text: "text-amber-700" },
  lstep: { bg: "bg-rose-50", border: "border-rose-200", badge: "bg-rose-600 text-white", text: "text-rose-700" },
};

function ToolCard({ id, num, name, sub, points }: { id: string; num: string; name: string; sub: string; points: string[] }) {
  const c = toolColors[id];
  return (
    <div className={`rounded-2xl ${c.bg} border-2 ${c.border} p-6 md:p-8 transition-shadow hover:shadow-lg`}>
      <div className="flex items-center gap-3 mb-3">
        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${c.badge} text-[13px] font-bold`}>{num}</span>
        <h3 className={`text-[18px] font-bold ${c.text} m-0`}>{name}</h3>
      </div>
      <p className="text-[13px] text-gray-500 font-medium mb-3">{sub}</p>
      <ul className="space-y-1.5 m-0 p-0 list-none">
        {points.map((p, i) => (
          <li key={i} className="flex items-start gap-2 text-[14px] text-gray-700">
            <span className={`mt-1 h-1.5 w-1.5 rounded-full ${c.badge.split(" ")[0]} shrink-0`} />
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="比較" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-gradient-to-r from-blue-50 to-violet-50 rounded-xl p-5 border border-blue-100">
        クリニック向けLINE活用ツールは<strong>Lオペ for CLINIC・メディカルフォース・March・medibot・Lステップ</strong>の5つが代表的です。いずれも優れたツールですが、<strong>得意領域</strong>や<strong>設計思想</strong>が異なります。本記事では各ツールの機能・費用を客観的に整理し、自院に合うツール選びをサポートします。
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
          ツールごとに<strong>設計思想</strong>や<strong>対応できる業務範囲</strong>が異なります。
        </p>
      </section>

      {/* ═══ 5社の特徴 ═══ */}
      <section>
        <h2 id="5-tools">5社の特徴を1分で把握</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <ToolCard
            id="lope" num="1" name="Lオペ for CLINIC"
            sub="クリニック特化オールインワン（保険+自由診療対応）"
            points={[
              "LINE起点で予約・問診・カルテ・CRM・配信・決済・配送を一元管理",
              "AI自動返信で24時間患者対応",
              "院長+事務1人で全業務を回せる設計",
            ]}
          />
          <ToolCard
            id="mf" num="2" name="メディカルフォース"
            sub="自由診療向けクラウド型業務管理システム"
            points={[
              "電子カルテ・予約管理・会計・在庫管理が中心",
              "LINE連携で予約・リマインド・CRM配信に対応",
              "デジタル問診票・経営分析ダッシュボード搭載",
            ]}
          />
          <ToolCard
            id="march" num="3" name="March（マーチ）"
            sub="医療機関向けオンライン診療・集患SaaS"
            points={[
              "LINE上で予約・問診・オンライン診療・決済まで完結",
              "物販EC・定期購入・配送管理にも対応",
              "セグメント配信・シナリオ配信・リッチメニュー出し分け",
            ]}
          />
          <ToolCard
            id="medibot" num="4" name="medibot（メディボット）"
            sub="LINE特化の予約・診療・決済プラットフォーム"
            points={[
              "LINE予約・問診・オンライン診療・決済をワンストップ",
              "シナリオ配信・セグメント配信・リマインド機能搭載",
              "リッチメニュー条件出し分け・キーワード応答対応",
            ]}
          />
          <ToolCard
            id="lstep" num="5" name="Lステップ"
            sub="汎用LINE配信・MA（マーケティングオートメーション）ツール"
            points={[
              "シナリオ配信・タグ管理・リッチメニュー出し分けが強力",
              "多業種対応で導入実績が豊富",
              "医療特有の予約・問診・カルテ・決済機能はなし",
            ]}
          />
        </div>
      </section>

      <InlineCTA />

      {/* ═══ 機能比較表 ═══ */}
      <section>
        <h2 id="comparison-table">機能比較表</h2>
        <p>
          クリニック運営に必要な主要機能を比較します。<span className="inline-block rounded bg-emerald-100 px-1.5 py-0.5 text-[12px] font-bold text-emerald-700">◎</span>=標準搭載　<span className="inline-block rounded bg-blue-100 px-1.5 py-0.5 text-[12px] font-bold text-blue-700">○</span>=対応可　<span className="inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[12px] font-bold text-amber-700">△</span>=限定的/オプション　<span className="inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[12px] font-bold text-gray-500">×</span>=非対応
        </p>
        <ComparisonTable
          headers={["機能", "Lオペ", "メディカルフォース", "March", "medibot", "Lステップ"]}
          rows={[
            ["LINE予約管理", "◎", "○", "◎", "◎", "×"],
            ["オンライン問診", "◎", "○", "◎", "◎", "×"],
            ["電子カルテ", "◎", "◎", "△", "△", "×"],
            ["オンライン診療", "×", "○", "◎", "◎", "×"],
            ["セグメント配信", "◎", "○", "◎", "◎", "◎"],
            ["患者CRM・タグ管理", "◎", "○", "◎", "◎", "◎"],
            ["決済", "◎", "○", "◎", "◎", "×"],
            ["配送・物販管理", "◎", "×", "◎", "○", "×"],
            ["リッチメニュー出し分け", "◎", "△", "◎", "◎", "◎"],
            ["AI自動返信", "◎", "×", "×", "×", "×"],
            ["リマインド自動送信", "◎", "◎", "◎", "◎", "○"],
          ]}
        />

        <Callout type="point" title="各ツールの立ち位置">
          <ul className="space-y-1 m-0 p-0 ml-4 list-disc text-[14px]">
            <li><strong>Lオペ</strong> — LINE運用+院内業務効率化のオールインワン。AI自動返信あり</li>
            <li><strong>メディカルフォース</strong> — 電子カルテ・会計が強み。自由診療のバックオフィス向け</li>
            <li><strong>March</strong> — オンライン診療+物販ECが充実。LINE上の患者体験設計が強い</li>
            <li><strong>medibot</strong> — 予約〜決済までLINE完結。コストパフォーマンスが高い</li>
            <li><strong>Lステップ</strong> — 配信・MAに特化。医療機能は別途必要</li>
          </ul>
        </Callout>
      </section>

      {/* ═══ 各ツールの強みを深掘り ═══ */}
      <section>
        <h2 id="strength">各ツールの強みを深掘り</h2>

        <div className="rounded-2xl bg-blue-50 border-2 border-blue-200 p-6 mb-6">
          <h3 className="text-blue-700 mt-0">Lオペ for CLINICの強み</h3>
          <p>
            <strong>院長+事務スタッフ1人で全業務を完結</strong>できる設計が最大の特徴。カルテ連携からLINE配信、決済・配送まで1システムで管理でき、ツール間の連携に悩む必要がありません。
            また、<strong>AI自動返信</strong>は5社中唯一の機能で、営業時間外の患者対応を自動化できます。保険診療・自由診療の両方に対応。
          </p>
        </div>

        <div className="rounded-2xl bg-violet-50 border-2 border-violet-200 p-6 mb-6">
          <h3 className="text-violet-700 mt-0">メディカルフォースの強み</h3>
          <p>
            <strong>電子カルテ・会計・在庫管理</strong>を中心とした自由診療向けの業務管理が最大の強み。全国約600院の導入実績があり、
            LINE連携による予約・リマインド・CRM配信にも対応しています。カルテと経営管理を1つのシステムで完結させたい自由診療クリニックに最適です。
          </p>
        </div>

        <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-200 p-6 mb-6">
          <h3 className="text-emerald-700 mt-0">Marchの強み</h3>
          <p>
            <strong>オンライン診療・物販EC・定期購入</strong>まで含めたLINE完結型の集患プラットフォーム。予約・問診からビデオ診療、クレジット決済、
            商品配送・在庫管理までLINE上でシームレスに提供。サブカルテ・シェーマ機能で診療内容の記録・共有も可能。
            オンライン診療や物販を積極的に展開したいクリニックに向いています。
          </p>
        </div>

        <div className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-6 mb-6">
          <h3 className="text-amber-700 mt-0">medibotの強み</h3>
          <p>
            <strong>予約・問診・オンライン診療・決済</strong>をLINE上でワンストップ提供しつつ、シナリオ配信やセグメント配信などの<strong>CRM機能も充実</strong>。
            リッチメニューの条件出し分け、キーワード自動応答、流入経路別シナリオなど、LINE活用の幅が広い。
            後払い決済（コンビニ・口座振替）やサブスク決済にも対応しており、決済の柔軟性が高い点も特徴です。
          </p>
        </div>

        <div className="rounded-2xl bg-rose-50 border-2 border-rose-200 p-6 mb-6">
          <h3 className="text-rose-700 mt-0">Lステップの強み</h3>
          <p>
            <strong>シナリオ配信・タグ管理・リッチメニュー出し分け</strong>などのLINEマーケティング機能が国内トップクラス。
            多業種での導入実績が豊富で、ノウハウや事例が多い点も魅力です。
            配信・MA（マーケティングオートメーション）に特化しているため、予約や問診は別ツールとの組み合わせが必要です。
            詳しくは<Link href="/lp/column/lstep-vs-clinic-tool" className="text-sky-600 underline hover:text-sky-800">Lステップ vs クリニック専用ツール比較</Link>を参照。
          </p>
        </div>
      </section>

      {/* ═══ 費用比較 ═══ */}
      <section>
        <h2 id="cost">費用比較</h2>
        <p>
          各ツールの費用体系は公開情報をもとに整理しています（2026年3月時点。最新の正確な料金は各社公式サイトをご確認ください）。
        </p>

        <ComparisonTable
          headers={["ツール", "初期費用", "月額目安"]}
          rows={[
            ["Lオペ for CLINIC", "33万〜55万円", "7.2万〜12.1万円"],
            ["メディカルフォース", "要問合せ", "要問合せ"],
            ["March", "要問合せ", "要問合せ"],
            ["medibot", "無料〜", "要問合せ"],
            ["Lステップ", "無料", "月2,980〜59,800円"],
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

        <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border border-blue-100 mb-6">
          <h3 className="text-blue-800 mt-0">自由診療クリニック（美容・AGA・ダイエット外来等）</h3>
          <p className="text-[14px] text-gray-700 mb-0">
            決済・配送・リピート促進まで含めた一気通貫の運用が求められます。<strong>Lオペ</strong>・<strong>March</strong>のオールインワン型か、カルテ中心なら<strong>メディカルフォース</strong>が候補に。
            詳しくは<Link href="/lp/column/beauty-clinic-line" className="text-sky-600 underline hover:text-sky-800">美容クリニックのLINE活用事例</Link>も参考に。
          </p>
        </div>

        <div className="rounded-xl bg-gradient-to-r from-emerald-50 to-cyan-50 p-6 border border-emerald-100 mb-6">
          <h3 className="text-emerald-800 mt-0">保険診療メインのクリニック（内科・皮膚科・歯科等）</h3>
          <p className="text-[14px] text-gray-700 mb-0">
            予約リマインドによる無断キャンセル削減と、再診促進のセグメント配信が最優先。<strong>Lオペ</strong>・<strong>medibot</strong>がフィットします。
            歯科の場合は<Link href="/lp/column/dental-clinic-line" className="text-sky-600 underline hover:text-sky-800">歯科クリニックのLINE活用記事</Link>も参照。
          </p>
        </div>

        <div className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 p-6 border border-amber-100 mb-6">
          <h3 className="text-amber-800 mt-0">オンライン診療を拡大したいクリニック</h3>
          <p className="text-[14px] text-gray-700 mb-0">
            ビデオ診療・処方・決済までLINE上で完結させたい場合は<strong>March</strong>・<strong>medibot</strong>が強い選択肢です。
            オンライン診療の費用については<Link href="/lp/column/online-medical-cost" className="text-sky-600 underline hover:text-sky-800">オンライン診療費用ガイド</Link>をご覧ください。
          </p>
        </div>

        <div className="rounded-xl bg-gradient-to-r from-rose-50 to-pink-50 p-6 border border-rose-100 mb-6">
          <h3 className="text-rose-800 mt-0">小規模・開業前のクリニック</h3>
          <p className="text-[14px] text-gray-700 mb-0">
            まずはコストを抑えて始めたい場合、<strong>Lステップ</strong>や<strong>medibot</strong>で部分的にスタートし、患者数が増えてきたら機能を拡張するのも選択肢です。
            開業前の準備については<Link href="/lp/column/clinic-opening-line" className="text-sky-600 underline hover:text-sky-800">開業前LINE戦略</Link>をご覧ください。
          </p>
        </div>

        <div className="rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 p-6 border border-violet-100">
          <h3 className="text-violet-800 mt-0">他ツールからの移行を検討中のクリニック</h3>
          <p className="text-[14px] text-gray-700 mb-0">
            現在のツールに不足を感じている場合は、各社の資料を取り寄せて比較検討するのがおすすめです。
            多くのツールが無料デモや資料請求に対応しているので、実際の画面を見て判断できます。
          </p>
        </div>
      </section>

      <InlineCTA />

      {/* ═══ FAQ ═══ */}
      <section>
        <h2 id="faq">よくある質問</h2>
        <div className="space-y-4">
          <details className="rounded-xl border border-blue-100 bg-blue-50/30 shadow-sm transition-all hover:shadow-md">
            <summary className="cursor-pointer px-6 py-4 text-[15px] font-bold text-gray-800">メディカルフォースとLオペ for CLINICの違いは？</summary>
            <div className="border-t border-blue-100 px-6 py-4 text-[14px] leading-relaxed text-gray-600">
              メディカルフォースは電子カルテ・予約管理・会計を中心とした自由診療向けクラウドシステムです。LINE連携やCRM・リマインド配信にも対応しており、全国約600院の導入実績があります。
              Lオペ for CLINICはLINE公式アカウントを起点に予約・問診・CRM・配信・決済・配送までワンストップで提供。AI自動返信やセグメント配信など、LINE運用に特化した機能が充実しています。
            </div>
          </details>
          <details className="rounded-xl border border-emerald-100 bg-emerald-50/30 shadow-sm transition-all hover:shadow-md">
            <summary className="cursor-pointer px-6 py-4 text-[15px] font-bold text-gray-800">MarchとLオペ for CLINICの違いは？</summary>
            <div className="border-t border-emerald-100 px-6 py-4 text-[14px] leading-relaxed text-gray-600">
              Marchは医療機関向けオンライン診療・集患SaaSで、LINE上の予約・問診・ビデオ診療・決済・物販EC・配送管理まで幅広くカバーしています。
              Lオペ for CLINICはオンライン診療機能はありませんが、院内カルテ連携やAI自動返信など院内業務の効率化にも対応した設計です。オンライン診療を重視するか、院内業務効率化を重視するかが判断のポイントです。
            </div>
          </details>
          <details className="rounded-xl border border-amber-100 bg-amber-50/30 shadow-sm transition-all hover:shadow-md">
            <summary className="cursor-pointer px-6 py-4 text-[15px] font-bold text-gray-800">medibotの特徴は？</summary>
            <div className="border-t border-amber-100 px-6 py-4 text-[14px] leading-relaxed text-gray-600">
              medibotはLINE上での予約・問診・オンライン診療・決済をワンストップで提供する医療機関向けサービスです。
              シナリオ配信・セグメント配信・リッチメニュー出し分けなどのCRM機能も充実しており、後払い決済やサブスク決済にも対応。コストパフォーマンスの高さが魅力です。
            </div>
          </details>
          <details className="rounded-xl border border-gray-200 bg-gray-50/30 shadow-sm transition-all hover:shadow-md">
            <summary className="cursor-pointer px-6 py-4 text-[15px] font-bold text-gray-800">クリニック向けLINEツールの月額費用の相場は？</summary>
            <div className="border-t border-gray-100 px-6 py-4 text-[14px] leading-relaxed text-gray-600">
              ツールにより月額数万円〜20万円以上と幅があります。LINE配信特化型は月3〜6万円、医療特化オールインワン型は月7〜20万円が目安です。
              複数ツールを組み合わせると合計で月15〜30万円になることもあるため、トータルコストで比較することが重要です。
            </div>
          </details>
        </div>
      </section>

      {/* ═══ まとめ ═══ */}
      <section>
        <h2 id="summary">まとめ</h2>
        <p>
          クリニック向けLINEツール5社を比較しました。いずれも優れたサービスであり、「どれが最良か」は自院の規模・診療形態・優先したい業務によって異なります。
        </p>
        <div className="grid gap-3 sm:grid-cols-2 mt-4">
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
            <p className="text-[13px] font-bold text-blue-700 mb-1">LINE運用+院内効率化をまるごと</p>
            <p className="text-[14px] text-gray-700 m-0">→ Lオペ for CLINIC</p>
          </div>
          <div className="rounded-xl bg-violet-50 border border-violet-200 p-4">
            <p className="text-[13px] font-bold text-violet-700 mb-1">電子カルテ・会計中心で自由診療特化</p>
            <p className="text-[14px] text-gray-700 m-0">→ メディカルフォース</p>
          </div>
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
            <p className="text-[13px] font-bold text-emerald-700 mb-1">オンライン診療+物販ECを展開</p>
            <p className="text-[14px] text-gray-700 m-0">→ March</p>
          </div>
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
            <p className="text-[13px] font-bold text-amber-700 mb-1">予約〜決済をLINE完結+コスパ重視</p>
            <p className="text-[14px] text-gray-700 m-0">→ medibot</p>
          </div>
        </div>
        <p className="mt-4">
          ツール選びで迷ったら、まずは各社の資料を取り寄せて比較するのがおすすめです。
          Lオペ for CLINICの機能詳細は<Link href="/lp/features" className="text-sky-600 underline hover:text-sky-800">機能一覧ページ</Link>をご覧ください。
        </p>
      </section>
    </ArticleLayout>
  );
}
