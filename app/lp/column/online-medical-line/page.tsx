import type { Metadata } from "next";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles[7];

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
  author: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL },
  publisher: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL },
  mainEntityOfPage: `${SITE_URL}/lp/column/${self.slug}`,
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
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="オンライン診療" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section>
        <h2 id="market-trend" className="text-xl font-bold text-slate-800">オンライン診療の市場動向と規制緩和</h2>
        <p>オンライン診療は、コロナ禍を契機に一気に普及が加速しました。厚生労働省の規制緩和により、<strong>初診からのオンライン診療が恒久的に認められ</strong>、対象疾患の制限も大幅に緩和されています。</p>
        <p>市場規模は2023年の約300億円から2027年には1,000億円超に成長すると予測されており、クリニック経営において<strong>オンライン診療への対応は「選択肢」ではなく「必須」</strong>の時代に入りつつあります。</p>
        <p>特に以下の診療科でオンライン診療の需要が急増しています。</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>美容皮膚科・美容外科</strong>: カウンセリング・経過観察・処方薬の再処方</li>
          <li><strong>皮膚科</strong>: 慢性疾患の定期フォロー・処方薬の継続処方</li>
          <li><strong>内科</strong>: 生活習慣病の定期管理・薬の継続処方</li>
          <li><strong>心療内科・精神科</strong>: 定期的なカウンセリング・処方管理</li>
          <li><strong>AGA・ED治療</strong>: 対面受診のハードルが高い領域でオンライン需要が特に高い</li>
        </ul>
      </section>

      <section>
        <h2 id="challenges" className="text-xl font-bold text-slate-800">従来のオンライン診療の課題</h2>
        <p>オンライン診療の需要が高まる一方で、従来のシステムには多くの課題がありました。これらの課題が<strong>患者の離脱やリピート率低下</strong>の原因となっています。</p>

        <h3 className="text-lg font-semibold text-slate-700 mt-6">専用アプリのインストールが必要</h3>
        <p>多くのオンライン診療プラットフォームでは、患者に専用アプリのダウンロードとアカウント作成を要求します。「たった1回の診察のためにアプリを入れるのは面倒」と感じる患者は多く、<strong>アプリインストールの段階で30〜40%が離脱</strong>するというデータもあります。</p>

        <h3 className="text-lg font-semibold text-slate-700 mt-6">決済が別システム</h3>
        <p>診療と決済が別システムで管理されている場合、患者は診察後に別の画面で支払い手続きをする必要があります。この手間が未払いの増加や患者満足度の低下につながります。</p>

        <h3 className="text-lg font-semibold text-slate-700 mt-6">予約が煩雑</h3>
        <p>オンライン診療の予約がクリニックのWebサイトや電話と連動しておらず、患者が複数のチャネルを行き来する必要があるケースが少なくありません。予約変更やキャンセルの手続きが面倒なことも課題です。</p>

        <h3 className="text-lg font-semibold text-slate-700 mt-6">フォローが途切れる</h3>
        <p>オンライン診療後の経過確認やフォローアップが手薄になりがちです。対面診察なら次回予約を取れますが、オンラインでは患者が自発的に再予約しなければならず、<strong>リピート率が対面診療より低くなる</strong>傾向があります。</p>
      </section>

      <InlineCTA />

      <section>
        <h2 id="line-flow" className="text-xl font-bold text-slate-800">LINE起点のオンライン診療フロー</h2>
        <p>これらの課題を解決するのが、<strong>LINE公式アカウントを起点としたオンライン診療フロー</strong>です。患者が日常的に使っているLINEの中で、予約から配送まですべてが完結します。</p>
        <ol className="list-decimal pl-6 space-y-3">
          <li>
            <strong>予約（LINE）</strong>
            <p>LINEのリッチメニューから「オンライン診療予約」をタップ。空き枠がカレンダー形式で表示され、ワンタップで予約完了。予約変更もLINEから即時対応できます。</p>
          </li>
          <li>
            <strong>事前問診（LINE）</strong>
            <p>予約確定後、LINEで事前問診が自動配信されます。患者は診察前に症状や服薬状況を入力。回答データは医師のカルテ画面に自動反映されるため、診察開始時から内容を把握した状態で対話できます。</p>
          </li>
          <li>
            <strong>ビデオ通話（LINE or 専用リンク）</strong>
            <p>予約時刻になると、LINEで診察開始のリンクが通知されます。ワンタップでビデオ通話に接続。LINEのビデオ通話機能、またはセキュアな専用ビデオリンクを活用します。</p>
          </li>
          <li>
            <strong>処方・会計（LINE）</strong>
            <p>診察後、処方内容と会計金額がLINEで通知されます。LINE上でクレジットカード決済が完結するため、患者は別システムにログインする必要がありません。</p>
          </li>
          <li>
            <strong>配送追跡（LINE）</strong>
            <p>処方薬の発送通知と追跡番号がLINEで自動送信されます。配送状況の確認もLINEから可能。届いたタイミングで服薬指導メッセージが配信されます。</p>
          </li>
          <li>
            <strong>経過フォロー（LINE）</strong>
            <p>処方後の経過確認メッセージがLINEで自動配信。体調変化があればLINEで即座に相談でき、次回診察の予約もスムーズに行えます。</p>
          </li>
        </ol>
      </section>

      <section>
        <h2 id="five-points" className="text-xl font-bold text-slate-800">患者体験を最大化する5つのポイント</h2>
        <ol className="list-decimal pl-6 space-y-3">
          <li>
            <strong>アプリ不要・LINE完結を徹底する</strong>
            <p>新しいアプリのインストールを求めない設計が最重要です。LINEは日本で9,700万人以上が利用しており、<strong>追加インストール不要で即時利用可能</strong>。この手軽さが患者の離脱を防ぎます。</p>
          </li>
          <li>
            <strong>待ち時間ゼロの仕組みを作る</strong>
            <p>予約制+事前問診の組み合わせで、予約時刻ピッタリに診察を開始できる体制を整えましょう。「オンラインなのに待たされる」という不満は患者満足度を大きく下げます。</p>
          </li>
          <li>
            <strong>決済のワンステップ化</strong>
            <p>診察終了後、LINEトーク画面上で決済が完了する設計に。クレジットカード情報の事前登録、またはLINE Pay連携で<strong>ワンタップ決済</strong>を実現しましょう。</p>
          </li>
          <li>
            <strong>配送の透明性を確保する</strong>
            <p>処方薬の発送〜到着まで、ステータスをLINEでリアルタイム通知。「いつ届くかわからない」という不安を解消し、患者体験を向上させます。</p>
          </li>
          <li>
            <strong>リピート予約の自動化</strong>
            <p>処方終了の2週間前に「お薬がなくなる頃です。次回のオンライン診療を予約しませんか？」と自動リマインドを送信。<strong>患者が自発的に予約しなくてもリピートにつながる</strong>仕組みが重要です。</p>
          </li>
        </ol>
      </section>

      <section>
        <h2 id="effects" className="text-xl font-bold text-slate-800">オンライン診療×LINEの導入効果</h2>
        <p>LINE起点のオンライン診療を導入したクリニックでは、以下のような効果が報告されています。</p>
        <div className="overflow-x-auto mt-4">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b-2 border-slate-200 text-left">
                <th className="py-3 pr-4 font-bold text-slate-700">指標</th>
                <th className="py-3 pr-4 font-bold text-slate-500">従来型</th>
                <th className="py-3 font-bold text-blue-700">LINE起点型</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                ["患者の離脱率（予約→診察）", "30〜40%", "5〜10%"],
                ["決済完了率", "75〜85%", "95%以上"],
                ["リピート率（3ヶ月以内）", "40〜50%", "70〜80%"],
                ["患者1人あたりの対応時間", "25〜30分", "15〜20分"],
                ["患者満足度（5段階）", "3.5〜3.8", "4.5〜4.8"],
              ].map(([metric, traditional, line]) => (
                <tr key={metric}>
                  <td className="py-2.5 pr-4 font-medium text-slate-700">{metric}</td>
                  <td className="py-2.5 pr-4 text-slate-500">{traditional}</td>
                  <td className="py-2.5 font-medium text-blue-700">{line}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4">特に<strong>離脱率の改善</strong>が顕著です。専用アプリのインストールが不要になるだけで、予約から診察までの完遂率が大幅に向上します。また、LINE内での決済完了により未払いも激減し、クリニックの収益性が改善します。</p>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-slate-800">まとめ: LINEでオンライン診療の患者体験を根本から変える</h2>
        <p>オンライン診療の成功は、医療の質だけでなく<strong>患者体験（UX）の設計</strong>にかかっています。専用アプリ・別システム決済・煩雑な予約といった従来の課題を、LINE起点のフローで一掃することで、患者の利便性とクリニックの業務効率を同時に向上させられます。</p>
        <p>Lオペ for CLINICは、LINE上での予約・問診・決済・配送追跡・フォローアップまでワンストップで提供。<strong>オンライン診療に最適化されたLINE運用プラットフォーム</strong>として、クリニックのオンライン診療を全面的にサポートします。</p>
      </section>
    </ArticleLayout>
  );
}
