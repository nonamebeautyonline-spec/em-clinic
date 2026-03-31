import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, {
  InlineCTA,
  Callout,
  FlowSteps,
  StatGrid,
  BarChart,
  DonutChart,
  ComparisonTable,
  ResultCard,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "clinic-dx-complete-guide")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "クリニックDXの導入費用はどのくらいですか？", a: "導入範囲によって異なりますが、LINE公式アカウント+予約システムであれば月額数万円から始められます。クラウド型電子カルテを含めても初期費用0〜50万円、月額5〜10万円程度が目安です。段階的に導入することで初期投資を抑えられます。" },
  { q: "ITに詳しくないスタッフでも使えますか？", a: "はい。Lオペ for CLINICはクリニック専用に設計されており、LINEのように直感的に操作できます。導入時の研修サポートもあるため、ITに不慣れなスタッフでも1〜2週間で日常業務に活用できるようになります。" },
  { q: "電子カルテとの連携は可能ですか？", a: "はい。API連携に対応したクラウド型電子カルテであれば、問診データの自動転記やフォローアップの自動化が可能です。連携可能なカルテの種類は個別にご相談ください。" },
  { q: "DX導入にどのくらいの期間がかかりますか？", a: "LINE公式アカウントの開設と基本設定は最短1週間で完了します。予約システム・問診・セグメント配信まで含めた本格運用開始までは1〜2ヶ月が目安です。段階的に導入するため、業務への影響を最小限に抑えられます。" },
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
  "クリニックDXの全体像 -- 電子カルテ・予約・問診・決済・経営管理のデジタル化ロードマップ",
  "各領域の具体的な導入手順と選定基準、関連記事へのリンク",
  "DX成功事例から学ぶ共通パターンと失敗を避けるポイント",
];

const toc = [
  { id: "why-dx-now", label: "なぜ今クリニックDXが必要か" },
  { id: "electronic-medical-record", label: "電子カルテの選び方" },
  { id: "reservation-system", label: "予約システムの導入" },
  { id: "online-questionnaire", label: "オンライン問診の活用" },
  { id: "online-medical", label: "オンライン診療の始め方" },
  { id: "kpi-dashboard", label: "KPIダッシュボードでの経営管理" },
  { id: "success-stories", label: "DX成功事例" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="クリニックDXガイド" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        クリニックDXは単なるITツールの導入ではなく、業務プロセス全体を見直して患者体験と経営効率を同時に向上させる取り組みです。本記事では、電子カルテ・予約システム・オンライン問診・オンライン診療・KPIダッシュボードの5つの領域を体系的に解説し、各テーマの詳細記事へのリンクもまとめています。DX推進の全体設計図としてご活用ください。
      </p>

      {/* ── 1. なぜ今DXが必要か ── */}
      <section>
        <h2 id="why-dx-now" className="text-xl font-bold text-gray-800">1. なぜ今クリニックDXが必要か</h2>
        <p>2024年の医療機関倒産件数は過去最多の64件を記録しました。人口減少・競合激化・人件費上昇の三重苦の中で、<strong>デジタル化による業務効率化と患者満足度向上</strong>は経営の必須条件になっています。</p>

        <StatGrid stats={[
          { value: "64", unit: "件", label: "2024年 医療機関倒産数" },
          { value: "35", unit: "%", label: "DX未着手クリニック" },
          { value: "2.5", unit: "倍", label: "DX導入院の生産性" },
        ]} />

        <Callout type="warning" title="「うちはまだ大丈夫」が最大のリスク">
          DXに遅れたクリニックは、予約のしやすさ・待ち時間・フォローの質で先行するクリニックに患者を奪われます。特に若年層はLINEやWebで予約できるクリニックを選ぶ傾向が顕著です。クリニック経営の課題と対策については<Link href="/clinic/column/clinic-management-success" className="text-emerald-700 underline">クリニック経営で成功するポイント</Link>も参考にしてください。
        </Callout>

        <p>DXは一度にすべてを導入する必要はありません。LINE公式アカウントを起点にした段階的なアプローチが最も成功率が高い方法です。LINEから始めるDXの全体像は<Link href="/clinic/column/clinic-dx-guide" className="text-emerald-700 underline">クリニックDX -- LINE公式アカウントから始める業務デジタル化</Link>で解説しています。</p>
      </section>

      {/* ── 2. 電子カルテ ── */}
      <section>
        <h2 id="electronic-medical-record" className="text-xl font-bold text-gray-800">2. 電子カルテの選び方</h2>
        <p>電子カルテはクリニックDXの中核です。近年はクラウド型が主流となり、初期費用を抑えながら院外からもアクセスできる環境が整っています。</p>

        <ComparisonTable
          headers={["比較項目", "クラウド型", "オンプレミス型"]}
          rows={[
            ["初期費用", "0〜50万円", "300〜500万円"],
            ["月額費用", "2〜5万円", "保守費 月3〜8万円"],
            ["院外アクセス", "可能", "VPN必要"],
            ["データバックアップ", "自動", "手動設定必要"],
            ["カスタマイズ性", "中程度", "高い"],
          ]}
        />

        <p>電子カルテ選びで最も重要なのは<strong>外部システムとのAPI連携</strong>です。LINE公式アカウントや予約システムと連携できるカルテを選ぶことで、問診データの自動転記やフォローアップの自動化が実現します。</p>

        <Callout type="success" title="電子カルテの詳細ガイドはこちら">
          クラウド型とオンプレミス型の比較、選定時の5つのチェックポイントは<Link href="/clinic/column/electronic-medical-record-guide" className="text-emerald-700 underline">クリニックの電子カルテ選び方ガイド</Link>で詳しく解説しています。
        </Callout>
      </section>

      {/* ── 3. 予約システム ── */}
      <section>
        <h2 id="reservation-system" className="text-xl font-bold text-gray-800">3. 予約システムの導入</h2>
        <p>電話予約のみのクリニックは、受付スタッフの電話対応に1日2〜3時間を費やしています。LINE連携の予約システムを導入すれば、<strong>24時間Web予約+自動リマインド</strong>で電話対応を大幅に削減し、無断キャンセルも減らせます。</p>

        <ResultCard before="月15件" after="月2件" metric="無断キャンセル数" description="自動リマインド+簡単変更機能の導入効果" />

        <BarChart
          data={[
            { label: "LINE予約", value: 90, color: "bg-emerald-500" },
            { label: "Web予約", value: 75, color: "bg-sky-500" },
            { label: "電話予約", value: 50, color: "bg-gray-400" },
          ]}
          unit="% 利便性スコア"
        />

        <p>予約システム選びでは、LINE連携の有無が最大の差別化ポイントです。患者にとっては「いつも使っているLINE」から予約できることが利便性を大きく高めます。</p>

        <Callout type="info" title="予約システム比較の詳細はこちら">
          LINE連携対応の予約システム10選は<Link href="/clinic/column/reservation-system-comparison" className="text-emerald-700 underline">クリニック予約システム比較10選</Link>で詳しく比較しています。また、無断キャンセル対策は<Link href="/clinic/column/line-reservation-no-show" className="text-emerald-700 underline">LINE予約管理で無断キャンセルを削減する方法</Link>も参考にしてください。
        </Callout>

        <InlineCTA />
      </section>

      {/* ── 4. オンライン問診 ── */}
      <section>
        <h2 id="online-questionnaire" className="text-xl font-bold text-gray-800">4. オンライン問診の活用</h2>
        <p>紙の問診票をオンライン問診に置き換えることで、<strong>患者の待ち時間短縮</strong>と<strong>受付スタッフの転記作業削減</strong>を同時に実現できます。LINE上で問診を完結させれば、来院前にすべての情報が揃います。</p>

        <StatGrid stats={[
          { value: "15", unit: "分短縮", label: "患者の平均待ち時間" },
          { value: "83", unit: "%削減", label: "問診転記の作業時間" },
          { value: "70", unit: "%減少", label: "問診の記載漏れ" },
        ]} />

        <FlowSteps steps={[
          { title: "予約確定時に問診URLをLINEで送信", desc: "予約完了と同時にLINEで問診フォームのリンクを自動送信。患者は来院前に自宅で回答できる。" },
          { title: "患者が来院前にスマホで回答", desc: "選択式+自由記述のフォームで、紙の問診票より詳細な情報を効率的に収集。" },
          { title: "回答データが電子カルテに自動連携", desc: "手入力なしで問診データがカルテに反映。スタッフの転記作業をゼロに。" },
        ]} />

        <Callout type="success" title="オンライン問診の導入ガイドはこちら">
          導入手順と具体的な効果は<Link href="/clinic/column/online-questionnaire-guide" className="text-emerald-700 underline">クリニックのオンライン問診導入ガイド</Link>で詳しく解説しています。
        </Callout>
      </section>

      {/* ── 5. オンライン診療 ── */}
      <section>
        <h2 id="online-medical" className="text-xl font-bold text-gray-800">5. オンライン診療の始め方</h2>
        <p>オンライン診療は2020年の規制緩和以降、多くのクリニックで導入が進んでいます。特に再診やフォローアップ、慢性疾患の定期受診では、<strong>患者・クリニック双方の負担を大幅に軽減</strong>できます。</p>

        <p>LINE公式アカウントとオンライン診療を組み合わせると、予約・問診・ビデオ通話・処方・決済までLINE起点で完結する患者体験を提供できます。</p>

        <ComparisonTable
          headers={["項目", "対面診療のみ", "オンライン診療併用"]}
          rows={[
            ["診療圏", "半径5km", "全国対応可能"],
            ["患者の通院負担", "移動+待ち時間", "自宅から受診"],
            ["再診率", "60〜70%", "80〜90%"],
            ["キャンセル率", "10〜15%", "3〜5%"],
            ["導入コスト", "なし", "月1〜5万円"],
          ]}
        />

        <Callout type="info" title="オンライン診療の詳細はこちら">
          LINE連携でのオンライン診療運用術は<Link href="/clinic/column/online-medical-line" className="text-emerald-700 underline">オンライン診療 x LINE -- 患者体験を最大化する運用術</Link>で詳しく解説しています。導入費用については<Link href="/clinic/column/online-medical-cost" className="text-emerald-700 underline">オンライン診療の導入費用と運用コスト</Link>も参考にしてください。
        </Callout>
      </section>

      {/* ── 6. KPIダッシュボード ── */}
      <section>
        <h2 id="kpi-dashboard" className="text-xl font-bold text-gray-800">6. KPIダッシュボードでの経営管理</h2>
        <p>DXで蓄積されたデータは、経営判断の基盤として活用できます。予約数・再診率・LTV・ブロック率などの<strong>重要KPIをリアルタイムで可視化</strong>し、データに基づいた経営改善サイクルを回すことが重要です。</p>

        <DonutChart percentage={73} label="データ活用率" sublabel="DX導入クリニックの平均" />

        <FlowSteps steps={[
          { title: "データ収集の自動化", desc: "LINE・予約・カルテ・決済からデータを自動収集。手動集計の手間をゼロに。" },
          { title: "KPIダッシュボードの構築", desc: "新患数・再診率・LTV・ブロック率・予約稼働率などの重要指標をリアルタイムで表示。" },
          { title: "定期的なレビューと改善", desc: "月次でKPIをレビューし、ボトルネックを特定。施策の優先順位を決定して実行。" },
        ]} />

        <Callout type="point" title="KPI管理の詳細はこちら">
          クリニック経営で見るべき7つのKPIは<Link href="/clinic/column/clinic-kpi-dashboard" className="text-emerald-700 underline">クリニック経営の数値管理 -- LINEダッシュボードで見るべきKPI7選</Link>で詳しく解説しています。
        </Callout>
      </section>

      {/* ── 7. DX成功事例 ── */}
      <section>
        <h2 id="success-stories" className="text-xl font-bold text-gray-800">7. DX成功事例から学ぶ</h2>
        <p>実際にDXを推進したクリニックでは、以下のような具体的な成果が報告されています。</p>

        <StatGrid stats={[
          { value: "150", unit: "%増", label: "月間予約数" },
          { value: "80", unit: "%減", label: "無断キャンセル" },
          { value: "0", unit: "時間", label: "スタッフ残業" },
          { value: "4.7", unit: "/5.0", label: "患者満足度" },
        ]} />

        <p>成功するクリニックに共通するのは、<strong>小さく始めて段階的に拡張する</strong>アプローチです。いきなり全領域をデジタル化するのではなく、LINE公式アカウントや予約システムから着手し、効果を実感してから次の領域に進むパターンが圧倒的に多いです。</p>

        <Callout type="success" title="DX成功事例の詳細はこちら">
          LINE起点でクリニック経営を変革した5つの事例は<Link href="/clinic/column/medical-dx-success-stories" className="text-emerald-700 underline">医療DXの成功事例5選</Link>で詳しく紹介しています。開業医の業務効率化については<Link href="/clinic/column/busy-doctor-efficiency" className="text-emerald-700 underline">開業医が忙しい理由と業務効率化の方法</Link>も参考にしてください。
        </Callout>
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ: DXは「全体設計」から始める</h2>
        <p>クリニックDXの成功は、個別のツール導入ではなく<strong>全体設計</strong>から始まります。電子カルテ・予約システム・問診・オンライン診療・経営管理の各領域がデータでつながることで、真の業務効率化と患者体験の向上が実現します。</p>

        <p>本ガイドで紹介した各テーマの詳細記事と合わせて、自院のDXロードマップを策定してみてください。LINE運用の具体的な進め方は<Link href="/clinic/column/line-operation-guide" className="text-emerald-700 underline">クリニックのLINE公式アカウント運用完全ガイド</Link>で体系的にまとめています。クリニック向けCRMの選定については<Link href="/clinic/column/clinic-crm-comparison" className="text-emerald-700 underline">クリニック向けCRM比較6選</Link>も参考にしてください。</p>

        <p>Lオペ for CLINICは、本ガイドで解説したDX領域をワンストップでカバーするクリニック専用プラットフォームです。LINE連携の予約管理・問診・セグメント配信・決済・KPIダッシュボードまで、すべて一つのシステムで完結します。DX導入前後の具体的な変化を知りたい方は<Link href="/clinic/column/clinic-dx-before-after" className="text-sky-600 underline hover:text-sky-800">DX導入ビフォーアフター事例</Link>を、ツール統合による固定費削減効果は<Link href="/clinic/column/clinic-cost-reduction-30man" className="text-sky-600 underline hover:text-sky-800">固定費を月30万円削減する方法</Link>もご覧ください。</p>
      </section>

      {/* ── FAQ ── */}
      <section>
        <h2 className="text-xl font-bold text-gray-800">よくある質問</h2>
        <div className="mt-4 space-y-3">
          {faqItems.map((item) => (
            <details key={item.q} className="group rounded-xl border border-slate-200 bg-white">
              <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 text-[15px] font-semibold text-gray-800 select-none">
                {item.q}
                <span className="shrink-0 text-slate-400 transition group-open:rotate-180">
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
                </span>
              </summary>
              <div className="border-t border-slate-100 px-5 py-4 text-sm leading-relaxed text-gray-600">{item.a}</div>
            </details>
          ))}
        </div>
      </section>
    </ArticleLayout>
  );
}
