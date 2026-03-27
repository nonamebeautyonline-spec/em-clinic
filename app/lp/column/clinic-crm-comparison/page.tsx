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
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "clinic-crm-comparison")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};


const keyPoints = [
  "クリニック向けCRM 6製品を多機能型・実績重視型に分けて比較",
  "CRM選定で重視すべき3つの基準",
  "CRM導入によるクリニック経営のメリット",
  "LINE連携CRMの優位性",
];

const toc = [
  { id: "why-crm", label: "なぜクリニックにCRMが必要か" },
  { id: "multi-function", label: "多機能型CRM 3選" },
  { id: "proven-track", label: "実績重視型CRM 3選" },
  { id: "comparison-table", label: "6製品一括比較" },
  { id: "selection-criteria", label: "CRM選定の3つの基準" },
  { id: "benefits", label: "CRM導入のメリット" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="比較" keyPoints={keyPoints} toc={toc}>

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">クリニック向けCRMは、LINE連携・電子カルテ連携・セグメント配信の<strong>3機能</strong>を基準に選ぶべきです。本記事では多機能型・実績重視型の<strong>6製品</strong>を比較し、CRM選定の判断基準と、LINE連携CRMが再診率・患者LTV向上に最も効果的な理由を解説します。</p>

      {/* ── なぜCRM ── */}
      <section>
        <h2 id="why-crm" className="text-xl font-bold text-gray-800">なぜクリニックにCRMが必要なのか</h2>
        <p>クリニック経営の競争が激化する中、患者との関係性を管理し、再診率やLTVを高めるCRM（顧客関係管理）の導入が不可欠になっています。経営課題の全体像については<Link href="/lp/column/clinic-management-success" className="text-sky-600 underline hover:text-sky-800">クリニック経営で成功するポイント</Link>もあわせてご覧ください。</p>

        <StatGrid stats={[
          { value: "64", unit: "件", label: "2024年 医療機関倒産数" },
          { value: "80", unit: "%", label: "LINE開封率" },
          { value: "12", unit: "%", label: "DMハガキ開封率" },
        ]} />

        <Callout type="point" title="CRMを導入すべきクリニックの特徴">
          <ul className="mt-1 space-y-1">
            <li>• 患者の来院履歴やフォロー状況をExcelや紙で管理している</li>
            <li>• 再診率の低下が経営課題になっている</li>
            <li>• 患者へのフォローアップが属人的で抜け漏れがある</li>
            <li>• LINE公式アカウントを導入したが配信を活用しきれていない</li>
          </ul>
        </Callout>
      </section>

      {/* ── 多機能型 ── */}
      <section>
        <h2 id="multi-function" className="text-xl font-bold text-gray-800">多機能型CRM 3選</h2>
        <p>幅広い機能を備え、クリニック業務を一元管理できるCRMです。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-6">1. Lオペ for CLINIC</h3>
        <Callout type="success" title="クリニック特化のオールインワンCRM">
          患者情報管理・LINE予約・オンライン問診・セグメント配信・決済・配送管理まで一気通貫。クリニック専用設計のため、導入直後から医療ワークフローに沿って運用可能。
        </Callout>

        <h3 className="text-lg font-semibold text-gray-700 mt-6">2. Synergy!</h3>
        <p>必要な機能をモジュール式で選択可能。シンプルなUIが特徴で、ITに不慣れなスタッフでも操作しやすい。メール配信・フォーム作成・顧客分析をカバー。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-6">3. ALL-IN</h3>
        <p>情報管理・集客・請求書発行を一元化。中小規模の事業者向けに設計され、CRM以外の経営管理機能も搭載。</p>
      </section>

      {/* ── 実績重視型 ── */}
      <section>
        <h2 id="proven-track" className="text-xl font-bold text-gray-800">実績重視型CRM 3選</h2>
        <p>全国の医療機関で豊富な導入実績を持つCRMです。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-6">4. medigle</h3>
        <p>全国<strong>550以上の病院</strong>で導入。地域医療連携の紹介元管理に強み。患者の流入経路を分析し、連携先との関係構築を支援。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-6">5. Salesforce Health Cloud</h3>
        <p>世界シェアNo.1のCRM「Salesforce」の医療特化版。大規模病院やグループ法人向け。高度なカスタマイズ性と拡張性が特徴。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-6">6. foro CRM</h3>
        <p>地域医療連携に特化。紹介・逆紹介の管理、連携先へのレポート自動生成など、病診連携の効率化に強み。</p>
      </section>

      <InlineCTA />

      {/* ── 一括比較表 ── */}
      <section>
        <h2 id="comparison-table" className="text-xl font-bold text-gray-800">6製品一括比較</h2>

        <ComparisonTable
          headers={["機能", "Lオペ", "Synergy!", "ALL-IN", "medigle", "Salesforce HC", "foro"]}
          rows={[
            ["クリニック専用設計", true, false, false, false, false, false],
            ["LINE連携", true, false, false, false, false, false],
            ["予約管理", true, false, false, false, true, false],
            ["オンライン問診", true, false, false, false, false, false],
            ["セグメント配信", true, true, false, false, true, false],
            ["決済連携", true, false, false, false, false, false],
            ["配送管理", true, false, false, false, false, false],
            ["患者CRM", true, true, true, true, true, true],
            ["地域連携", "—", "—", "—", true, true, true],
            ["AI自動返信", true, false, false, false, false, false],
          ]}
        />
      </section>

      {/* ── 選定基準 ── */}
      <section>
        <h2 id="selection-criteria" className="text-xl font-bold text-gray-800">CRM選定の3つの基準</h2>

        <FlowSteps steps={[
          { title: "医療業界での導入実績", desc: "医療機関特有のワークフロー（予約・問診・カルテ）に対応した実績があるかを確認。汎用CRMは医療業務にフィットしない場合がある。" },
          { title: "セキュリティ水準", desc: "患者の個人情報・医療情報を扱うため、SSL暗号化・アクセス権限管理・監査ログなどのセキュリティ機能が必須。" },
          { title: "LINE連携の有無", desc: "開封率80%のLINEと連携できるかは、患者コミュニケーションの効果に直結。LINE非対応のCRMは別途配信ツールが必要になりコスト増。開封率80%のLINEと連携できるかは、患者コミュニケーションの効果に直結。LINE非対応のCRMは別途配信ツールが必要になりコスト増。" },
        ]} />

        <BarChart
          data={[
            { label: "LINE配信", value: 80, color: "bg-sky-500" },
            { label: "メール配信", value: 25, color: "bg-gray-300" },
            { label: "DM/ハガキ", value: 12, color: "bg-gray-300" },
            { label: "電話", value: 8, color: "bg-gray-300" },
          ]}
          unit="% 開封率"
        />
      </section>

      {/* ── メリット ── */}
      <section>
        <h2 id="benefits" className="text-xl font-bold text-gray-800">CRM導入のメリット</h2>

        <StatGrid stats={[
          { value: "50", unit: "%", label: "受付業務削減" },
          { value: "3", unit: "倍", label: "再診率向上" },
          { value: "30", unit: "%", label: "スタッフ負荷削減" },
          { value: "80", unit: "%", label: "キャンセル削減" },
        ]} />

        <Callout type="success" title="CRM導入で実現できること">
          <ul className="mt-1 space-y-1">
            <li>• <strong>作業効率化</strong> — 手作業の転記・電話リマインド・紙問診からの解放</li>
            <li>• <strong>患者分析</strong> — LTV・リピート率・離脱率をデータで可視化し、施策を最適化</li>
            <li>• <strong>コミュニケーション強化</strong> — パーソナライズされたフォローアップで患者満足度向上（<Link href="/lp/column/segment-delivery-repeat" className="text-sky-600 underline hover:text-sky-800">LINEセグメント配信でリピート率を向上</Link>も参考になります）</li>
            <li>• <strong>経営判断の精度向上</strong> — ダッシュボードでKPIをリアルタイム把握</li>
          </ul>
        </Callout>
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <p>クリニック向けCRMは、規模・目的・連携ニーズに応じて最適な選択肢が異なります。</p>

        <ComparisonTable
          headers={["ニーズ", "おすすめ"]}
          rows={[
            ["LINE連携＋クリニック専用機能がほしい", "Lオペ for CLINIC"],
            ["メール配信中心でシンプルに使いたい", "Synergy!"],
            ["大規模病院・グループ法人", "Salesforce Health Cloud"],
            ["地域医療連携を強化したい", "medigle / foro CRM"],
          ]}
        />

        <p>LINE公式アカウントを中心にクリニック業務を一元管理したい場合は、Lオペ for CLINICが<Link href="/lp/features#患者CRM" className="text-sky-600 underline hover:text-sky-800">クリニック専用CRM</Link>として最もフィットします。予約管理機能をさらに比較したい方は<Link href="/lp/column/reservation-system-comparison" className="text-sky-600 underline hover:text-sky-800">予約システム比較10選</Link>も参考にしてください。患者データの分析・活用については<Link href="/lp/column/clinic-patient-ltv" className="text-sky-600 underline hover:text-sky-800">患者LTV向上戦略</Link>を、既存システムからのデータ移行については<Link href="/lp/column/clinic-data-migration" className="text-sky-600 underline hover:text-sky-800">データ移行ガイド</Link>も併せてご覧ください。</p>
      </section>
    </ArticleLayout>
  );
}
