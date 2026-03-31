import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, BarChart, FlowSteps, ComparisonTable, DonutChart } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "medical-dx-success-stories")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};


const faqItems = [
  { q: "医療DXの成功事例5選の導入にどのくらいの期間がかかりますか？", a: "基本的な設定は1〜2週間で完了します。LINE公式アカウントの開設からリッチメニュー設計・自動メッセージ設定まで、Lオペ for CLINICなら初期設定サポート付きで最短2週間で運用開始できます。" },
  { q: "医療DXの成功事例5選でスタッフの負荷は増えませんか？", a: "むしろ減ります。電話対応・手動での予約管理・問診確認などの定型業務を自動化することで、スタッフの作業時間を月40時間以上削減できた事例もあります。導入初月はサポートを受けながら進めれば、2ヶ月目以降はスムーズに運用できます。" },
  { q: "小規模クリニックでも導入効果はありますか？", a: "はい、むしろ小規模クリニックほど効果を実感しやすいです。スタッフ数が限られる分、業務自動化によるインパクトが大きく、受付1名分の工数を削減できた事例もあります。" },
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
  "LINE起点の医療DXで予約数150%増・無断キャンセル80%減を実現した具体的事例",
  "業務自動化・セグメント配信・オンライン診療の導入プロセスと成果を詳細に解説",
  "5つの成功事例に共通する3つの法則で再現性のあるDX戦略を構築",
];

const toc = [
  { id: "dx-trend", label: "医療DXの現状と動向" },
  { id: "case-1", label: "事例1: 予約数150%増の美容皮膚科" },
  { id: "case-2", label: "事例2: 無断キャンセル80%減の歯科" },
  { id: "case-3", label: "事例3: スタッフ残業ゼロの内科" },
  { id: "case-4", label: "事例4: 患者LTV2倍の整形外科" },
  { id: "case-5", label: "事例5: 地方患者を獲得した皮膚科" },
  { id: "common-rules", label: "5つの事例に共通する成功法則" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="医療DX事例" keyPoints={keyPoints} toc={toc}>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">LINE起点の医療DXにより、<strong>予約数150%増</strong>・<strong>無断キャンセル80%減</strong>・<strong>スタッフ残業ゼロ</strong>を実現したクリニックが続出しています。本記事では<strong>5つの成功事例</strong>の具体的な導入プロセスと成果データ、そして共通する3つの成功法則を解説します。</p>

      <section>
        <h2 id="dx-trend" className="text-xl font-bold text-gray-800">医療DXの現状と動向</h2>
        <Callout type="warning" title="クリニックレベルのDXは依然として遅れている">
          <p>診療所の電子カルテ普及率は約50%にとどまり、予約管理や患者コミュニケーションの多くが電話・紙・FAXに依存しています。「何から始めればいいかわからない」がDXに踏み切れない最大の理由です。</p>
        </Callout>
        <BarChart data={[
          { label: "一般病院 電子カルテ普及率", value: 60, color: "#3b82f6" },
          { label: "診療所 電子カルテ普及率", value: 50, color: "#94a3b8" },
        ]} unit="%" />
        <Callout type="point" title="LINEがDXの最初の一歩に最適な理由">
          <p>LINEは患者の大半がすでに利用しているため、新たなアプリ導入のハードルがありません。小さく始めて大きな成果を出した5つの事例を紹介します。DXの全体像については<Link href="/clinic/column/clinic-dx-guide" className="text-sky-600 underline hover:text-sky-800">クリニックDX完全ガイド</Link>もあわせてご覧ください。</p>
        </Callout>
      </section>

      <section>
        <h2 id="case-1" className="text-xl font-bold text-gray-800">事例1: 予約数150%増を実現した美容皮膚科（LINE予約導入）</h2>
        <p>都内の美容皮膚科クリニック。医師2名、スタッフ8名。開業3年目で新患数の伸びが鈍化。</p>
        <Callout type="warning" title="導入前の課題">
          <ul className="list-disc pl-4 space-y-1 text-sm">
            <li>予約は電話のみ。診療時間中しか予約を受けられず機会損失が大きい</li>
            <li>受付スタッフが1日の大半を電話対応に費やし、来院患者の対応品質が低下</li>
            <li>Web広告を出稿しても予約までの導線が弱くCVRが低い</li>
          </ul>
        </Callout>
        <FlowSteps steps={[
          { title: "LINE公式アカウント開設", desc: "Webサイト・院内にQRコードを設置" },
          { title: "24時間予約システム導入", desc: "LINE上で空き枠がリアルタイムで表示される予約システムを導入" },
          { title: "初回クーポン自動配布", desc: "友だち追加時に施術10%OFFクーポンを自動配布" },
          { title: "広告CTAの変更", desc: "LPのCTAを「電話予約」から「LINE友だち追加」に変更" },
        ]} />
        <StatGrid stats={[
          { value: "150", unit: "%増", label: "月間予約数（120→300件）" },
          { value: "60", unit: "%", label: "LINE経由の新患比率" },
          { value: "5.8", unit: "%", label: "Web広告CVR（2.1%→）" },
        ]} />
        <ResultCard before="電話対応 1日3時間" after="電話対応 1日30分" metric="電話対応 83% 削減" description="受付スタッフが来院患者の対応に集中できるように" />
      </section>

      <section>
        <h2 id="case-2" className="text-xl font-bold text-gray-800">事例2: 無断キャンセル80%減に成功した歯科（自動リマインド）</h2>
        <p>神奈川県の歯科クリニック。医師3名、歯科衛生士5名、スタッフ4名。ユニット6台。</p>
        <Callout type="warning" title="導入前の課題">
          <ul className="list-disc pl-4 space-y-1 text-sm">
            <li>月平均40件の無断キャンセル（ノーショー）で月約60万円の売上損失</li>
            <li>前日のリマインド電話は不在率が高く効果が限定的</li>
            <li>キャンセル後の空き枠を埋められずユニット稼働率が低下</li>
          </ul>
        </Callout>
        <FlowSteps steps={[
          { title: "予約確定時の自動メッセージ", desc: "LINEで「ご予約ありがとうございます」を自動送信" },
          { title: "3日前・前日のリマインド", desc: "予約3日前と前日18時に自動配信" },
          { title: "変更・キャンセルボタン設置", desc: "無断ではなく事前連絡を促進" },
          { title: "キャンセル待ち自動通知", desc: "キャンセル発生時に待ちリストの患者へ自動通知" },
        ]} />
        <ResultCard before="無断キャンセル 月40件" after="無断キャンセル 月8件" metric="80% 削減" description="月間売上損失を60万円から12万円に削減" />
        <p>無断キャンセル対策の詳しいノウハウは<Link href="/clinic/column/line-reservation-no-show" className="text-sky-600 underline hover:text-sky-800">LINE予約管理で無断キャンセルを削減</Link>で解説しています。</p>
        <StatGrid stats={[
          { value: "60", unit: "%", label: "空き枠の再充填率" },
          { value: "20", unit: "時間/月", label: "リマインド電話の工数削減" },
        ]} />
      </section>

      <InlineCTA />

      <section>
        <h2 id="case-3" className="text-xl font-bold text-gray-800">事例3: スタッフ残業ゼロを達成した内科（業務自動化）</h2>
        <p>埼玉県の内科クリニック。医師1名、スタッフ4名。1日平均来院数50名。</p>
        <Callout type="warning" title="導入前の課題">
          <ul className="list-disc pl-4 space-y-1 text-sm">
            <li>受付業務がスタッフの業務時間の大半を占める</li>
            <li>平均月20時間の残業でスタッフの離職率が高い</li>
            <li>閉院後も翌日の事務作業が残る</li>
          </ul>
        </Callout>
        <FlowSteps steps={[
          { title: "予約のオンライン化", desc: "LINE上で24時間予約受付。電話予約を段階的に廃止" },
          { title: "問診のオンライン化", desc: "来院前にLINEで問診完了。記入・転記作業を廃止" },
          { title: "リマインドの自動化", desc: "予約前日のリマインドを完全自動化" },
          { title: "フォローアップの自動化", desc: "慢性疾患患者への通院リマインドをLINEで自動配信" },
          { title: "AI自動返信の導入", desc: "よくある問い合わせにAIが即時回答" },
        ]} />
        <StatGrid stats={[
          { value: "0", unit: "時間", label: "スタッフ残業（月20h→0h）" },
          { value: "80", unit: "%減", label: "電話対応（50件→10件/日）" },
          { value: "0", unit: "%", label: "スタッフ離職率（年40%→0%）" },
        ]} />
        <ResultCard before="Google口コミ 3.6" after="Google口コミ 4.3" metric="+0.7pt 向上" description="「待ち時間が短くなった」の声多数" />
      </section>

      <section>
        <h2 id="case-4" className="text-xl font-bold text-gray-800">事例4: 患者LTV2倍を実現した整形外科（セグメント配信）</h2>
        <p>大阪府の整形外科クリニック。医師2名、スタッフ10名。リハビリテーション施設併設。</p>
        <Callout type="warning" title="導入前の課題">
          <ul className="list-disc pl-4 space-y-1 text-sm">
            <li>リハビリ患者の通院中断率が高く、平均通院回数が6回で止まっていた</li>
            <li>治療完了後の再来院率が低く、他院を受診される</li>
            <li>全患者に同じ内容のDMを送付しており反応率が低い</li>
          </ul>
        </Callout>
        <FlowSteps steps={[
          { title: "患者タグでセグメント化", desc: "症状・治療ステージでタグ分け" },
          { title: "治療ステージ別の自動配信", desc: "リハビリ中は次回案内、治療完了後は3ヶ月点検リマインド" },
          { title: "症状別の健康コンテンツ配信", desc: "腰痛にはストレッチ動画、肩こりには姿勢改善ガイドなど" },
          { title: "季節イベント配信", desc: "冬の冷え対策、ゴルフシーズンの関節ケアなど" },
        ]} />
        <BarChart data={[
          { label: "セグメント配信 開封率", value: 78, color: "#06C755" },
          { label: "一斉配信 開封率", value: 55, color: "#94a3b8" },
        ]} unit="%" />
        <StatGrid stats={[
          { value: "2", unit: "倍", label: "患者LTV" },
          { value: "12", unit: "回", label: "平均通院回数（6回→）" },
          { value: "45", unit: "%", label: "治療完了後の再来院率（15%→）" },
        ]} />
        <ResultCard before="リハビリ中断率 35%" after="リハビリ中断率 12%" metric="23pt 改善" description="セグメント配信による継続治療サポートの効果" />
        <p>セグメント配信の設計方法については<Link href="/clinic/column/segment-delivery-repeat" className="text-sky-600 underline hover:text-sky-800">LINEセグメント配信でリピート率を向上</Link>で詳しく紹介しています。</p>
      </section>

      <section>
        <h2 id="case-5" className="text-xl font-bold text-gray-800">事例5: オンライン診療で地方患者を獲得した皮膚科（LINE×オンライン診療）</h2>
        <p>東京都の皮膚科クリニック。医師1名、スタッフ5名。ニキビ治療・アトピー治療に特化。</p>
        <Callout type="warning" title="導入前の課題">
          <ul className="list-disc pl-4 space-y-1 text-sm">
            <li>専門性の高い治療を提供しているが商圏が半径5km圏内に限定</li>
            <li>SNSでの全国からの問い合わせを「遠方で通えない」と断念される</li>
            <li>オンライン診療のシステム導入ハードルが高く着手できず</li>
          </ul>
        </Callout>
        <FlowSteps steps={[
          { title: "LINE友だち追加を全国集客の入口に", desc: "InstagramのプロフィールにLINE友だち追加リンクを設置" },
          { title: "LINEで完結するオンライン診療", desc: "問診→予約→ビデオ通話→処方→決済→配送の全工程をLINE上で完結" },
          { title: "初診は来院、再診はオンライン", desc: "初回のみ対面で詳細な診察。2回目以降はLINEでの写真送信+オンライン診療" },
          { title: "治療経過の写真管理", desc: "患者がLINEで送信した患部の写真を時系列で管理し治療効果を可視化" },
        ]} />
        <StatGrid stats={[
          { value: "47", unit: "都道府県", label: "患者の所在地" },
          { value: "180", unit: "%", label: "売上（前年比）" },
          { value: "85", unit: "%", label: "オンライン患者の再診率" },
        ]} />
        <DonutChart percentage={95} label="患者満足度" sublabel="オンライン診療患者の95%が「満足」と回答" />
      </section>

      <section>
        <h2 id="common-rules" className="text-xl font-bold text-gray-800">5つの事例に共通する成功法則</h2>
        <p>5つの事例を分析すると、医療DXを成功させるための<strong>3つの共通法則</strong>が浮かび上がります。</p>
        <FlowSteps steps={[
          { title: "法則1: 患者が使い慣れたチャネルで始める", desc: "専用アプリではなく、患者がすでに毎日使っているLINEをチャネルとすることで導入ハードルをゼロに。利用率・定着率が高く、投資対効果が最大化" },
          { title: "法則2: 自動化を前提に設計する", desc: "手動運用で逆に業務が増える失敗を避けるため、最初から自動化前提でフローを設計。スタッフは医療行為など判断業務に集中" },
          { title: "法則3: 小さく始めて段階的に拡大する", desc: "最も効果が見込める1つの機能から始め、成果を確認しながら段階的に拡大。リスクを最小限に抑えながら確実に成果を出す" },
        ]} />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ: LINEから始める医療DXで経営を変革する</h2>
        <ComparisonTable
          headers={["成果領域", "事例", "主な成果"]}
          rows={[
            ["集患", "事例1: 美容皮膚科", "予約数 150% 増"],
            ["業務効率化", "事例2: 歯科", "無断キャンセル 80% 減"],
            ["業務効率化", "事例3: 内科", "スタッフ残業ゼロ"],
            ["収益最大化", "事例4: 整形外科", "患者LTV 2倍"],
            ["収益最大化", "事例5: 皮膚科", "売上 前年比180%"],
          ]}
        />
        <p className="mt-4">Lオペ for CLINICは、これら5つの事例で活用された機能をすべて備えたクリニック専用のLINE運用プラットフォームです。予約管理・問診・自動配信・決済・配送・AI返信まで、クリニックのDXをワンストップで実現します。<Link href="/clinic/features" className="text-sky-600 underline hover:text-sky-800">全機能一覧はこちら</Link>。あなたのクリニックでも、LINEから始める医療DXを検討してみませんか？</p>
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
