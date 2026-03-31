import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ComparisonTable, FlowSteps, ResultCard, BarChart, DonutChart } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "online-medical-line")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};


const faqItems = [
  { q: "オンライン診療×LINEを始めるために必要な準備は何ですか？", a: "厚生労働省のオンライン診療ガイドラインに基づく届出、ビデオ通話システムの導入、オンライン決済の設定が必要です。Lオペ for CLINICならLINEビデオ通話・電話音声通話でのオンライン診療に対応しており、別途システム導入が不要です。" },
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
  "オンライン診療の市場動向と規制緩和の最新状況",
  "LINE起点で予約から配送まで完結するフロー設計",
  "患者体験を最大化する5つの運用ポイント",
];

const toc = [
  { id: "market-trend", label: "市場動向と規制緩和" },
  { id: "challenges", label: "従来の課題" },
  { id: "line-flow", label: "LINE起点の診療フロー" },
  { id: "five-points", label: "患者体験を最大化する5つのポイント" },
  { id: "effects", label: "導入効果" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="オンライン診療" keyPoints={keyPoints} toc={toc}>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        オンライン診療はLINEを起点にすることで、予約・問診・ビデオ通話・決済・処方薬配送まで<strong>一気通貫で完結</strong>できます。初診からのオンライン診療が恒久化された今、患者体験を最大化する<strong>5つの運用ポイント</strong>と導入効果を本記事で解説します。
      </p>

      <section>
        <h2 id="market-trend" className="text-xl font-bold text-gray-800">オンライン診療の市場動向と規制緩和</h2>
        <p>オンライン診療は、コロナ禍を契機に一気に普及が加速しました。厚生労働省の規制緩和により、<strong>初診からのオンライン診療が恒久的に認められ</strong>、対象疾患の制限も大幅に緩和されています。</p>

        <StatGrid stats={[
          { value: "300", unit: "億円", label: "2023年 市場規模" },
          { value: "1,000", unit: "億円超", label: "2027年 予測" },
          { value: "3.3", unit: "倍", label: "成長率" },
        ]} />

        <Callout type="warning" title="オンライン診療対応は「必須」の時代">
          クリニック経営において、オンライン診療への対応は「選択肢」ではなく「必須」の時代に入りつつあります。
        </Callout>

        <p>特に以下の診療科でオンライン診療の需要が急増しています。</p>

        <ComparisonTable
          headers={["診療科", "主な用途", "需要の特徴"]}
          rows={[
            ["美容皮膚科・美容外科", "カウンセリング・経過観察・再処方", "自費診療との相性が高い"],
            ["皮膚科", "慢性疾患の定期フォロー・継続処方", "定期通院の負担軽減"],
            ["内科", "生活習慣病の定期管理・継続処方", "高頻度の通院をオンライン化"],
            ["心療内科・精神科", "定期カウンセリング・処方管理", "通院のハードル低減"],
            ["AGA・ED治療", "対面受診の心理ハードルが高い領域", "オンライン需要が特に高い"],
          ]}
        />
      </section>

      <section>
        <h2 id="challenges" className="text-xl font-bold text-gray-800">従来のオンライン診療の課題</h2>
        <p>オンライン診療の需要が高まる一方で、従来のシステムには多くの課題がありました。これらの課題が<strong>患者の離脱やリピート率低下</strong>の原因となっています。</p>

        <Callout type="warning" title="専用アプリの壁">
          多くのプラットフォームが専用アプリのダウンロードとアカウント作成を要求します。アプリインストールの段階で30〜40%が離脱するというデータも。
        </Callout>

        <ComparisonTable
          headers={["課題", "具体的な問題", "影響"]}
          rows={[
            ["専用アプリが必要", "ダウンロード+アカウント作成が面倒", "30〜40%が離脱"],
            ["決済が別システム", "診察後に別画面で支払い手続き", "未払い増加"],
            ["予約が煩雑", "複数チャネルの行き来が必要", "予約完了率低下"],
            ["フォローが途切れる", "患者が自発的に再予約する必要", "リピート率低下"],
          ]}
        />
      </section>

      <InlineCTA />

      <section>
        <h2 id="line-flow" className="text-xl font-bold text-gray-800">LINE起点のオンライン診療フロー</h2>
        <p>これらの課題を解決するのが、<strong>LINE公式アカウントを起点としたオンライン診療フロー</strong>です。患者が日常的に使っているLINEの中で、予約から配送まですべてが完結します。予約システムの選び方については<Link href="/clinic/column/reservation-system-comparison" className="text-sky-600 underline hover:text-sky-800">予約システム比較10選</Link>も合わせてご覧ください。</p>

        <FlowSteps steps={[
          { title: "予約（LINE）", desc: "リッチメニューから「オンライン診療予約」をタップ。空き枠がカレンダー形式で表示され、ワンタップで予約完了" },
          { title: "事前問診（LINE）", desc: "予約確定後、LINEで事前問診が自動配信。回答データは医師のカルテ画面に自動反映" },
          { title: "ビデオ通話", desc: "予約時刻にLINEで診察開始リンクが通知。ワンタップでビデオ通話に接続" },
          { title: "処方・会計（LINE）", desc: "診察後、処方内容と会計金額がLINEで通知。LINE上でクレジットカード決済が完結" },
          { title: "配送追跡（LINE）", desc: "発送通知と追跡番号がLINE自動送信。届いたタイミングで服薬指導メッセージが配信" },
          { title: "経過フォロー（LINE）", desc: "処方後の経過確認メッセージが自動配信。体調変化時はLINEで即座に相談可能" },
        ]} />

        <Callout type="success" title="すべてがLINE内で完結">
          患者は新しいアプリをインストールする必要がありません。日常的に使っているLINEの中で、予約から配送追跡まですべてが完結します。
        </Callout>
      </section>

      <section>
        <h2 id="five-points" className="text-xl font-bold text-gray-800">患者体験を最大化する5つのポイント</h2>

        <FlowSteps steps={[
          { title: "アプリ不要・LINE完結を徹底する", desc: "LINEは9,700万人以上が利用。追加インストール不要で即時利用可能。この手軽さが離脱を防ぐ" },
          { title: "待ち時間ゼロの仕組みを作る", desc: "予約制+事前問診で、予約時刻ピッタリに診察開始。「オンラインなのに待たされる」を解消" },
          { title: "決済のワンステップ化", desc: "LINEトーク画面上で決済完了。クレカ事前登録またはLINE Pay連携でワンタップ決済" },
          { title: "配送の透明性を確保する", desc: "発送〜到着までLINEでリアルタイム通知。「いつ届くかわからない」という不安を解消" },
          { title: "リピート予約の自動化", desc: "処方終了2週間前に自動リマインド。患者が自発的に予約しなくてもリピートにつながる仕組み" },
        ]} />
      </section>

      <section>
        <h2 id="effects" className="text-xl font-bold text-gray-800">オンライン診療×LINEの導入効果</h2>
        <p>LINE起点のオンライン診療を導入したクリニックでは、以下のような効果が報告されています。</p>

        <ResultCard before="30〜40%" after="5〜10%" metric="患者の離脱率（予約→診察）" description="アプリ不要で完遂率が大幅向上" />

        <ResultCard before="75〜85%" after="95%以上" metric="決済完了率" description="LINE内決済で未払い激減" />

        <ComparisonTable
          headers={["指標", "従来型", "LINE起点型"]}
          rows={[
            ["患者の離脱率", "30〜40%", "5〜10%"],
            ["決済完了率", "75〜85%", "95%以上"],
            ["リピート率（3ヶ月）", "40〜50%", "70〜80%"],
            ["対応時間/人", "25〜30分", "15〜20分"],
            ["患者満足度（5段階）", "3.5〜3.8", "4.5〜4.8"],
          ]}
        />

        <BarChart
          data={[
            { label: "離脱率改善", value: 75, color: "bg-emerald-500" },
            { label: "決済完了率", value: 95, color: "bg-sky-500" },
            { label: "リピート率", value: 80, color: "bg-violet-500" },
            { label: "患者満足度", value: 96, color: "bg-amber-500" },
          ]}
          unit="%"
        />

        <Callout type="success" title="離脱率の改善が顕著">
          専用アプリのインストールが不要になるだけで、予約から診察までの完遂率が大幅に向上。LINE内決済で未払いも激減し、クリニックの収益性が改善します。
        </Callout>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ: LINEでオンライン診療の患者体験を根本から変える</h2>
        <p>オンライン診療の成功は、医療の質だけでなく<strong>患者体験（UX）の設計</strong>にかかっています。専用アプリ・別システム決済・煩雑な予約といった従来の課題を、LINE起点のフローで一掃することで、患者の利便性とクリニックの業務効率を同時に向上させられます。なお、オンライン診療フローの起点となるリッチメニューの設計については<Link href="/clinic/column/rich-menu-design" className="text-sky-600 underline hover:text-sky-800">リッチメニュー設計5つのポイント</Link>で詳しく解説しています。また、電子カルテとの連携を検討中の方は<Link href="/clinic/column/electronic-medical-record-guide" className="text-sky-600 underline hover:text-sky-800">電子カルテ選び方ガイド</Link>も参考にしてください。</p>
        <p>Lオペ for CLINICは、LINE上での予約・問診・決済・配送追跡・フォローアップまでワンストップで提供。<strong>オンライン診療に最適化されたLINE運用プラットフォーム</strong>として、クリニックのオンライン診療を全面的にサポートします。<Link href="/clinic/features#決済・配送" className="text-sky-600 underline hover:text-sky-800">決済・配送管理機能</Link>の詳細もご覧ください。</p>
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
