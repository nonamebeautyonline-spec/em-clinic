import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, BarChart, FlowSteps, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "online-questionnaire-guide")!;

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
  datePublished: `${self.date}T00:00:00+09:00`,
  dateModified: `${self.updatedDate || self.date}T00:00:00+09:00`,
  image: `${SITE_URL}/lp/column/${self.slug}/opengraph-image`,
  author: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL },
  publisher: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL, logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.png` } },
  mainEntityOfPage: `${SITE_URL}/lp/column/${self.slug}`,
};

const keyPoints = [
  "紙の問診票が抱える5つの課題とオンライン問診による解決方法",
  "LINE×オンライン問診で来院前に問診完了、待ち時間を大幅短縮",
  "問診フォーム設計のベストプラクティスと紙からの移行手順",
];

const toc = [
  { id: "paper-problems", label: "紙の問診票の課題" },
  { id: "online-merits", label: "オンライン問診のメリット5つ" },
  { id: "line-flow", label: "LINE×オンライン問診のフロー" },
  { id: "form-design", label: "問診フォーム設計のポイント" },
  { id: "migration", label: "紙からオンラインへの移行手順" },
  { id: "effects", label: "導入効果（待ち時間短縮・データ活用）" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="オンライン問診" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">紙の問診票をLINE連携のオンライン問診に切り替えることで、来院前に問診が完了し待ち時間を<strong>10〜15分短縮</strong>できます。本記事では、紙問診が抱える<strong>5つの課題</strong>、LINE×オンライン問診の具体的フロー、フォーム設計のベストプラクティスと移行手順を解説します。</p>

      <section>
        <h2 id="paper-problems" className="text-xl font-bold text-gray-800">紙の問診票の課題 — なぜ今オンライン問診が求められるのか</h2>
        <Callout type="warning" title="紙の問診票が抱える5つの課題">
          <ul className="list-disc pl-4 space-y-1 text-sm">
            <li>判読困難な手書き文字 — 誤読によるミスのリスク</li>
            <li>手入力によるデータ化の負担 — 1件あたり平均5〜10分</li>
            <li>来院後の記入による待ち時間 — 10〜15分の発生</li>
            <li>データ活用困難 — 検索・統計分析が事実上不可能</li>
            <li>共有筆記具による感染リスク</li>
          </ul>
        </Callout>
        <BarChart data={[
          { label: "問診転記（30人/日）", value: 300, color: "#ef4444" },
          { label: "患者の待ち時間", value: 15, color: "#f59e0b" },
          { label: "オンライン化後の転記時間", value: 0, color: "#22c55e" },
        ]} unit="分" />
        <p className="mt-2 text-sm text-gray-600">※1日30人の新患がいるクリニックでは、問診の転記だけで最大5時間がかかっています。</p>
      </section>

      <section>
        <h2 id="online-merits" className="text-xl font-bold text-gray-800">オンライン問診のメリット5つ</h2>
        <StatGrid stats={[
          { value: "10〜15", unit: "分短縮", label: "待ち時間の削減" },
          { value: "0", unit: "件", label: "転記ミス" },
          { value: "90", unit: "%以上", label: "スマホからの回答率" },
        ]} />
        <ComparisonTable
          headers={["項目", "紙の問診票", "オンライン問診"]}
          rows={[
            ["待ち時間", "10〜15分発生", "来院前に完了"],
            ["データ転記", "手動（5〜10分/件）", "自動転記"],
            ["転記ミス", "発生リスクあり", "ゼロ"],
            ["質問の深掘り", "スペース制約あり", "分岐ロジックで柔軟に対応"],
            ["データ活用", "困難（紙保管）", "即時分析可能"],
            ["患者満足度", "待ち時間に不満", "利便性で高評価"],
          ]}
        />
      </section>

      <section>
        <h2 id="line-flow" className="text-xl font-bold text-gray-800">LINE×オンライン問診のフロー</h2>
        <p>LINE公式アカウントとオンライン問診を組み合わせることで、患者にとって最もスムーズな問診体験を実現できます。</p>
        <FlowSteps steps={[
          { title: "LINE友だち追加", desc: "QRコードまたはWebリンクから友だち追加" },
          { title: "自動あいさつ+問診フォーム送信", desc: "友だち追加直後に自動メッセージで問診フォームのURLを送信" },
          { title: "問診回答（来院前）", desc: "患者がスマートフォンで問診に回答。所要時間3〜5分" },
          { title: "予約", desc: "問診完了後に予約カレンダーへのリンクを自動送信" },
          { title: "来院・診察", desc: "医師は事前に問診内容を確認済み。効率的な診察が可能" },
        ]} />
        <Callout type="success" title="LINEで問診を送る利点">
          <p>メールの開封率20〜30%に対し、LINEの開封率は80%超。問診の回答率も必然的に高くなります。また、患者は新たなアプリをインストールする必要がなく、普段使い慣れたLINEの画面から問診フォームにアクセスできます。問診後の予約管理と組み合わせるなら<Link href="/lp/column/reservation-system-comparison" className="text-blue-600 underline">予約システム比較10選</Link>も参考にしてください。</p>
        </Callout>
      </section>

      <InlineCTA />

      <section>
        <h2 id="form-design" className="text-xl font-bold text-gray-800">問診フォーム設計のポイント</h2>
        <p>オンライン問診の効果を最大化するには、フォーム設計が重要です。使いにくいフォームは回答率の低下や不正確なデータにつながります。</p>
        <Callout type="point" title="分岐ロジックの活用">
          <p>全患者に同じ質問を表示するのではなく、回答内容に応じて次の質問を動的に変更します。例えば「アレルギーはありますか？」に「はい」と回答した場合のみ、具体的なアレルギーの種類を聞く追加質問を表示。該当しない患者の負担を最小限に抑えつつ、必要な情報を漏れなく収集できます。</p>
        </Callout>
        <ComparisonTable
          headers={["設計要素", "推奨", "避けるべき"]}
          rows={[
            ["必須項目", "氏名・生年月日・主訴・アレルギー・既往歴", "全項目を必須にする"],
            ["入力方式", "選択式（ラジオ・チェックボックス）中心", "自由記述を多用する"],
            ["UI/UX", "スマホ最適化＋進捗バー表示", "PC前提のレイアウト"],
            ["データ保存", "自動保存（途中再開可能）", "送信時のみ保存"],
          ]}
        />
      </section>

      <section>
        <h2 id="migration" className="text-xl font-bold text-gray-800">紙からオンラインへの移行手順</h2>
        <p>オンライン問診への移行は段階的に進めるのがベストプラクティスです。</p>
        <FlowSteps steps={[
          { title: "並行運用期間（1〜2ヶ月）", desc: "オンライン問診を導入しつつ、紙の問診票も引き続き用意。来院時にスタッフが確認し、未回答の場合は院内タブレットまたは紙で対応" },
          { title: "オンライン優先への切替（3ヶ月目〜）", desc: "新患には「事前にLINEで問診をお済ませください」と案内。紙はバックアップとして少量のみ用意" },
          { title: "完全オンライン化（6ヶ月目〜）", desc: "院内タブレットでサポート体制を整え、紙の問診票を完全廃止。ペーパーレス化とデータ完全デジタル化を達成" },
        ]} />
      </section>

      <section>
        <h2 id="effects" className="text-xl font-bold text-gray-800">導入効果 — 待ち時間短縮とデータ活用の実績</h2>
        <StatGrid stats={[
          { value: "0", unit: "時間", label: "転記業務（2〜3h→0h）" },
          { value: "15", unit: "分短縮", label: "患者の待ち時間" },
          { value: "85〜90", unit: "%", label: "LINE経由の問診回答率" },
        ]} />
        <BarChart data={[
          { label: "LINE経由の回答率", value: 90, color: "#06C755" },
          { label: "メール送付の回答率", value: 45, color: "#94a3b8" },
        ]} unit="%" />
        <Callout type="success" title="データ活用の事例">
          <p>ある内科クリニックでは、オンライン問診データの分析から「花粉症の問い合わせが2月上旬から急増する」という傾向を発見。1月下旬にLINE配信を行ったところ、花粉症シーズンの来院数が<strong>前年比130%</strong>に増加しました。このようなデータ活用をはじめとするクリニックのDX推進については<Link href="/lp/column/clinic-dx-guide" className="text-blue-600 underline">クリニックDX完全ガイド</Link>で体系的に解説しています。</p>
        </Callout>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ: オンライン問診で患者もスタッフも幸せに</h2>
        <FlowSteps steps={[
          { title: "患者の待ち時間短縮", desc: "来院前に問診完了、すぐに診察へ" },
          { title: "スタッフの業務効率化", desc: "手入力・転記作業をゼロに" },
          { title: "経営データの活用", desc: "問診データの分析でマーケティング・経営判断を最適化" },
        ]} />
        <p className="mt-4">オンライン問診で得たデータを電子カルテと連携させることで、さらなる業務効率化が実現します。連携のポイントは<Link href="/lp/column/electronic-medical-record-guide" className="text-blue-600 underline">電子カルテ選び方ガイド</Link>をご覧ください。Lオペ for CLINICは、LINE友だち追加から問診送付、<Link href="/lp/features#予約・診察" className="text-sky-600 underline hover:text-sky-800">予約連携</Link>までをワンストップで実現するオンライン問診機能を提供しています。紙の問診票からの移行を検討されている方は、ぜひお気軽にご相談ください。</p>
      </section>
    </ArticleLayout>
  );
}
