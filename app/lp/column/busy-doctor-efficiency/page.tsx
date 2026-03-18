import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, {
  InlineCTA,
  StatGrid,
  BarChart,
  ComparisonTable,
  Callout,
  FlowSteps,
  ResultCard,
  DonutChart,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "busy-doctor-efficiency")!;

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
  dateModified: self.date,
  image: `${SITE_URL}/lp/opengraph-image`,
  author: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL },
  publisher: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL, logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.png` } },
  mainEntityOfPage: `${SITE_URL}/lp/column/${self.slug}`,
};

const keyPoints = [
  "開業医の1日のスケジュールと時間配分の実態",
  "開業医が忙しい3つの理由（経営兼務・DX対応・急患）",
  "繁忙期のパターン（季節性・健康診断・メディア影響）",
  "DXによる業務効率化の具体策",
];

const toc = [
  { id: "schedule", label: "開業医の1日のスケジュール" },
  { id: "reasons", label: "開業医が忙しい3つの理由" },
  { id: "busy-seasons", label: "開業医が特に忙しい時期" },
  { id: "efficiency", label: "業務効率化の3つの方法" },
  { id: "dx-detail", label: "DXで変わるクリニック業務" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="業務改善" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">開業医が忙しい最大の理由は、診療に加え経営・労務・DX対応を1人で兼務する構造にあります。LINE予約・オンライン問診・AI自動返信の3つのDX施策を導入することで、1日あたり2〜3時間の業務削減が可能です。本記事では具体的な効率化方法を解説します。</p>

      {/* ── スケジュール ── */}
      <section>
        <h2 id="schedule" className="text-xl font-bold text-gray-800">開業医の1日のスケジュール</h2>
        <p>一般的な開業医（診療所院長）の1日を見てみましょう。診療だけでなく、経営業務も含めると長時間労働になりがちです。</p>

        <ComparisonTable
          headers={["時間", "内容", "所要時間"]}
          rows={[
            ["8:00〜9:00", "出勤・朝礼・当日準備", "1時間"],
            ["9:00〜12:00", "午前診療", "3時間"],
            ["12:00〜13:00", "昼食・休憩（書類処理含む）", "1時間"],
            ["13:00〜18:00", "午後診療", "5時間"],
            ["18:00〜19:00", "事務作業・経営業務", "1時間"],
            ["19:00〜", "退勤（自宅で書類作業も…）", "—"],
          ]}
        />

        <DonutChart percentage={73} label="診療時間は全体の73%" sublabel="残り27%は経営・事務作業に費やされている" />
      </section>

      {/* ── 忙しい理由 ── */}
      <section>
        <h2 id="reasons" className="text-xl font-bold text-gray-800">開業医が忙しい3つの理由</h2>

        <FlowSteps steps={[
          { title: "経営業務との兼務", desc: "診療に加えて、スタッフ管理・給与計算・経営判断・会計処理・マーケティングまで、開業医は「経営者」としての役割も担う。" },
          { title: "時代の変化への対応", desc: "電子カルテ、オンライン診療、LINE予約など、DXへの対応に時間と学習コストがかかる。導入後も設定・運用の手間が発生。" },
          { title: "急患対応", desc: "予定外の緊急患者への対応で、スケジュールが後ろ倒しに。予約患者の待ち時間増加→満足度低下の悪循環。" },
        ]} />

        <BarChart
          data={[
            { label: "経営業務", value: 85, color: "bg-red-400" },
            { label: "DX対応", value: 72, color: "bg-amber-400" },
            { label: "急患対応", value: 65, color: "bg-amber-400" },
            { label: "スタッフ管理", value: 60, color: "bg-gray-300" },
            { label: "書類作業", value: 55, color: "bg-gray-300" },
          ]}
          unit="% ストレス度"
        />
      </section>

      {/* ── 繁忙期 ── */}
      <section>
        <h2 id="busy-seasons" className="text-xl font-bold text-gray-800">開業医が特に忙しい時期</h2>

        <ComparisonTable
          headers={["繁忙パターン", "時期", "対象科目"]}
          rows={[
            ["インフルエンザ流行", "9月〜3月", "内科・小児科"],
            ["花粉症シーズン", "2月〜5月", "耳鼻科・アレルギー科"],
            ["健康診断集中期", "4月〜6月、9月〜10月", "全般"],
            ["肌トラブル増加", "6月〜8月", "皮膚科"],
            ["メディア影響", "不定期", "全般"],
          ]}
        />

        <Callout type="info" title="メディアの影響は予測不能">
          テレビ番組や著名人のSNS投稿で特定の症状や治療法が話題になると、翌日から急激に患者が増加することがあります。予約システムで受入枠を管理していないと、待ち時間が大幅に増加します。
        </Callout>
      </section>

      <InlineCTA />

      {/* ── 効率化 ── */}
      <section>
        <h2 id="efficiency" className="text-xl font-bold text-gray-800">業務効率化の3つの方法</h2>

        <FlowSteps steps={[
          { title: "勤務体制の見直し", desc: "パートスタッフの活用、受付業務の外部委託、シフト制の導入で医師の診療集中時間を確保する。" },
          { title: "マニュアルの整備", desc: "電話対応、診療準備、緊急時対応などの業務マニュアルを作成。属人化を防ぎ、新人スタッフの即戦力化を促進。" },
          { title: "DX化の推進", desc: "電子カルテ・LINE予約・オンライン問診・自動リマインドの導入で、手作業を自動化。" },
        ]} />

        <StatGrid stats={[
          { value: "60", unit: "%", label: "受付業務削減" },
          { value: "87", unit: "%", label: "電話対応削減" },
          { value: "80", unit: "%", label: "キャンセル削減" },
          { value: "2", unit: "時間/日", label: "時短効果" },
        ]} />
      </section>

      {/* ── DX詳細 ── */}
      <section>
        <h2 id="dx-detail" className="text-xl font-bold text-gray-800">DXで変わるクリニック業務</h2>
        <p>DXは「初期投資が必要」というハードルがありますが、導入後の効果は絶大です。DXの全体像や進め方は<Link href="/lp/column/clinic-dx-guide" className="text-sky-600 underline hover:text-sky-800">クリニックDX完全ガイド</Link>で体系的に解説しています。</p>

        <ComparisonTable
          headers={["業務", "Before（手作業）", "After（DX化）"]}
          rows={[
            ["予約受付", "電話対応 1日2時間", "LINE予約で自動受付"],
            ["問診", "紙の問診票を手入力", "LINE問診で自動取込（詳細は「オンライン問診導入ガイド」参照）"],
            ["リマインド", "前日に電話（不在率50%）", "LINE自動送信（開封率80%）"],
            ["再診促進", "DMハガキ（開封率12%）", "セグメント配信（開封率80%）"],
            ["決済", "窓口精算・銀行振込確認", "LINE上でカード決済完結"],
            ["カルテ記録", "手書き→転記", "音声カルテで自動生成"],
          ]}
        />

        <ResultCard
          before="1日11時間勤務"
          after="1日9時間勤務"
          metric="DX化で1日2時間の時短を実現"
          description="空いた時間を診療の質向上やワークライフバランスに"
        />
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <Callout type="success" title="開業医の業務効率化のポイント">
          <ul className="mt-1 space-y-1">
            <li>• 開業医は「医師」と「経営者」の二足のわらじ。時間管理が経営の生命線</li>
            <li>• 予約・問診・リマインド・決済の自動化で受付業務を60%削減可能（<Link href="/lp/column/online-questionnaire-guide" className="text-sky-600 underline hover:text-sky-800">オンライン問診導入ガイド</Link>も参考にしてください）</li>
            <li>• LINEを起点にしたDXなら、患者の利便性向上と業務効率化を同時に実現</li>
            <li>• 「いつかやる」ではなく「今始める」ことで、競合クリニックとの差別化につながる</li>
          </ul>
        </Callout>

        <p>Lオペ for CLINICは、開業医の「診療に集中したい」という想いを実現するクリニック専用のLINE運用プラットフォームです。予約・問診・配信・決済・配送管理をオールインワンで自動化し、忙しい開業医の時間を取り戻します。AI自動返信による問い合わせ対応の自動化については<Link href="/lp/column/ai-auto-reply-guide" className="text-sky-600 underline hover:text-sky-800">AI自動返信導入ガイド</Link>もご覧ください。</p>
      </section>
    </ArticleLayout>
  );
}
