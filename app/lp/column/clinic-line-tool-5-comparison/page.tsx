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
    datePublished: `${self.date}T00:00:00+09:00`,
    dateModified: `${self.updatedDate || self.date}T00:00:00+09:00`,
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
        acceptedAnswer: { "@type": "Answer", text: "Marchは医療機関向けのオンライン診療・集患SaaSで、LINE上での予約・問診・オンライン診療・決済・物販・CRM・配信を幅広くカバーしています。Lオペ for CLINICは予約管理・問診・配信・決済・配送をLINEで一元管理でき、さらに問診データのダッシュボード一元管理やAI自動返信など院内業務の効率化にも強みがあります。" },
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
        <h3>1. Lオペ for CLINIC</h3>
        <p>
          LINE公式アカウントを起点に、<strong>予約・問診・オンライン診療・CRM・セグメント配信・決済・配送管理</strong>までワンストップで提供するクリニック特化プラットフォーム。
          予約管理・問診・配信・決済・配送をLINEで一元管理。<strong>LINEビデオ通話・電話による音声通話でのオンライン診療</strong>にも対応しており、すぐに導入可能。AI自動返信で24時間患者対応が可能。院長と事務スタッフ1人で全業務を回せる設計が特徴。保険診療・自由診療の両方に対応。
        </p>

        <h3>2. メディカルフォース（medicalforce）</h3>
        <p>
          自由診療クリニック向けのクラウド型業務管理システム。<strong>電子カルテ・予約管理・会計・在庫管理</strong>が中心。
          LINE連携による予約・リマインド・CRM配信にも対応。デジタル問診票や経営分析ダッシュボードも搭載。全国約600院の導入実績。
        </p>

        <h3>3. March（マーチ）</h3>
        <p>
          医療機関向けのオンライン診療・集患SaaS。LINE上で<strong>予約・問診・ビデオ診療・決済</strong>まで完結。
          物販EC・定期購入・配送管理にも対応しており、セグメント配信・シナリオ配信・リッチメニュー出し分けなどCRM機能も充実。
        </p>

        <h3>4. medibot（メディボット）</h3>
        <p>
          LINE特化の予約・診療・決済プラットフォーム。<strong>LINE予約・問診・オンライン診療・決済</strong>をワンストップで提供。
          シナリオ配信・セグメント配信・リマインド機能を搭載し、リッチメニュー条件出し分けやキーワード応答にも対応。後払い決済やサブスク決済など決済の柔軟性が高い。
        </p>

        <h3>5. Lステップ</h3>
        <p>
          LINE公式アカウントの拡張ツールとして国内トップシェアを持つ<strong>汎用LINE配信・MAツール</strong>。
          シナリオ配信・タグ管理・リッチメニュー出し分けが強力で、多業種での導入実績が豊富。
          医療特有の予約・問診・カルテ・決済機能はないため、クリニックでは他ツールとの併用が前提。
        </p>
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
            ["電子カルテ", "△", "◎", "△", "△", "×"],
            ["オンライン診療", "○", "○", "◎", "◎", "×"],
            ["セグメント配信", "◎", "○", "◎", "◎", "◎"],
            ["患者CRM・タグ管理", "◎", "○", "◎", "◎", "◎"],
            ["決済", "◎", "○", "◎", "◎", "×"],
            ["配送・物販管理", "◎", "×", "◎", "○", "×"],
            ["リッチメニュー出し分け", "◎", "△", "◎", "◎", "◎"],
            ["AI自動返信", "◎", "×", "×", "×", "×"],
            ["スマホ管理・通知bot", "◎", "△", "△", "△", "×"],
            ["リマインド自動送信", "◎", "◎", "◎", "◎", "○"],
          ]}
        />

        <Callout type="point" title="各ツールの立ち位置">
          <ul className="space-y-1 m-0 p-0 ml-4 list-disc text-[14px]">
            <li><strong>Lオペ</strong> — LINE運用+オンライン診療+院内業務効率化のオールインワン。予約・決済・発送状況を加味したAI自動返信あり</li>
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
            <strong>院長+事務スタッフ1人で全業務を完結</strong>できる設計が最大の特徴。問診データのダッシュボード一元管理からLINE配信、決済・配送まで1システムで管理でき、ツール間の連携に悩む必要がありません。
            <strong>予約管理・問診・オンライン診療・配信・決済・配送をLINEで一元管理</strong>でき、対面＋オンラインのハイブリッド運用が可能。オンライン診療はLINEビデオ通話や電話による音声通話に対応しており、追加ツール不要ですぐに始められます。
            また、<strong>AI自動返信</strong>は5社中唯一の機能で、患者ごとの予約・決済・発送状況を加味した返信を自動生成し、営業時間外の患者対応も自動化できます。
            さらに<strong>LINE通知bot</strong>で予約・決済・AI返信の状況がリアルタイムにプッシュ通知され、スマホのブラウザからトーク画面を操作してAI返信の承認・メッセージ送信・決済確認がどこからでも可能です。保険診療・自由診療の両方に対応。
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
            決済・配送・リピート促進まで含めた一気通貫の運用が求められます。<strong>Lオペ</strong>・<strong>March</strong>・<strong>medibot</strong>のオールインワン型か、カルテ中心なら<strong>メディカルフォース</strong>が候補に。
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
            LINEビデオ通話や電話での音声通話を活用したオンライン診療・処方・決済までLINE上で完結させたい場合は<strong>Lオペ</strong>・<strong>March</strong>・<strong>medibot</strong>が対応しています。
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
              Lオペ for CLINICは予約管理・問診・配信・決済・配送をLINEで一元管理でき、さらに問診データのダッシュボード一元管理やAI自動返信など院内業務の効率化にも強みがあります。物販EC機能を重視するか、院内業務効率化を重視するかが判断のポイントです。
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
        <ul className="ml-6 list-disc space-y-2 text-[15px] text-gray-700 mt-4">
          <li><strong>LINE運用+予約・問診・オンライン診療・配信・決済・配送の一元管理</strong> → Lオペ for CLINIC</li>
          <li><strong>電子カルテ・会計中心で自由診療特化</strong> → メディカルフォース</li>
          <li><strong>オンライン診療+物販ECを展開</strong> → March</li>
          <li><strong>予約〜決済をLINE完結+コスパ重視</strong> → medibot</li>
          <li><strong>LINE配信・MAに特化</strong> → Lステップ</li>
        </ul>
        <p className="mt-4">
          ツール選びで迷ったら、まずは各社の資料を取り寄せて比較するのがおすすめです。
          LINE導入の費用対効果を定量的に判断したい方は<Link href="/lp/column/clinic-line-roi" className="text-sky-600 underline hover:text-sky-800">LINE導入ROIの計算方法</Link>を参考にしてください。CRM製品の比較は<Link href="/lp/column/clinic-crm-comparison" className="text-sky-600 underline hover:text-sky-800">CRM比較6選</Link>もあわせてご覧ください。
          Lオペ for CLINICの機能詳細は<Link href="/lp/features" className="text-sky-600 underline hover:text-sky-800">機能一覧ページ</Link>をご覧ください。
        </p>
      </section>
    </ArticleLayout>
  );
}
