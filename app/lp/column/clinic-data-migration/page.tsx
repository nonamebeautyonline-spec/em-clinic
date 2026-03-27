import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, {
  InlineCTA,
  StatGrid,
  Callout,
  FlowSteps,
  ResultCard,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "clinic-data-migration")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};


const keyPoints = [
  "データ移行の計画立案から完了まで5つのフェーズ",
  "データクレンジングで移行後のトラブルを未然に防止",
  "段階移行でリスクを最小化する方法",
  "移行後の検証方法とロールバック計画の重要性",
];

const toc = [
  { id: "planning", label: "移行計画の立案" },
  { id: "cleansing", label: "データクレンジング" },
  { id: "phased-migration", label: "段階移行の進め方" },
  { id: "verification", label: "移行後の検証方法" },
  { id: "rollback", label: "ロールバック計画" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="ガイド" keyPoints={keyPoints} toc={toc}>

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">既存システムから新しいプラットフォームへのデータ移行は、クリニックにとって最大のハードルの一つです。本記事では、<strong>計画立案・データクレンジング・段階移行・検証・ロールバック</strong>の5つのフェーズに分けて、安全かつ確実なデータ移行の方法を解説します。</p>

      {/* ── 移行計画 ── */}
      <section>
        <h2 id="planning" className="text-xl font-bold text-gray-800">移行計画の立案</h2>
        <p>データ移行の成否は、事前の計画で8割が決まります。まず移行対象のデータを洗い出し、優先順位とスケジュールを策定しましょう。</p>

        <FlowSteps steps={[
          { title: "移行対象データの棚卸し", desc: "患者基本情報・予約履歴・カルテデータ・問診回答・決済履歴・メッセージ履歴など、移行が必要なデータを一覧化。" },
          { title: "データ量と形式の確認", desc: "各データの件数・ファイル形式（CSV・JSON・API）・文字コード・日付フォーマットを確認。移行ツールの要件を明確にする。" },
          { title: "スケジュールの策定", desc: "移行作業の日程を決定。診療に影響しない休診日に本番移行を行い、前後にバッファ期間を設ける。" },
          { title: "責任者と担当の明確化", desc: "移行プロジェクトの責任者、各フェーズの担当者、ベンダーとの連絡窓口を明確にする。" },
        ]} />

        <Callout type="warning" title="よくある失敗：計画不足による手戻り">
          「とりあえず移行してみよう」で始めると、データの不整合や欠損が本番で発覚し、大幅な手戻りが発生します。特に<Link href="/lp/column/electronic-medical-record-guide" className="text-sky-600 underline hover:text-sky-800">電子カルテ</Link>のデータは構造が複雑なため、事前のマッピング設計が不可欠です。
        </Callout>
      </section>

      {/* ── データクレンジング ── */}
      <section>
        <h2 id="cleansing" className="text-xl font-bold text-gray-800">データクレンジング</h2>
        <p>移行前にデータの品質を向上させることで、移行後のトラブルを大幅に削減できます。「ゴミデータを移行してもゴミのまま」という原則を忘れないでください。</p>

        <ul className="space-y-2 text-gray-700">
          <li><strong>重複データの統合</strong>：同一患者の複数レコード（旧姓・表記揺れ・カナ違い）を統合。電話番号をキーにした名寄せが効果的</li>
          <li><strong>不要データの削除</strong>：退去済み患者、テストデータ、長期未来院（5年以上）のデータは移行対象から除外を検討</li>
          <li><strong>フォーマットの統一</strong>：電話番号（ハイフン有無）、住所（都道府県の有無）、日付形式（和暦/西暦）を統一</li>
          <li><strong>必須項目の補完</strong>：新システムで必須となるフィールドが空の場合、移行前に補完するかデフォルト値を設定</li>
        </ul>

        <StatGrid stats={[
          { value: "15", unit: "%", label: "平均の重複データ率" },
          { value: "30", unit: "%", label: "不要データの割合" },
          { value: "80", unit: "%", label: "クレンジングで防げるトラブル" },
          { value: "2", unit: "日", label: "クレンジングの目安期間" },
        ]} />
      </section>

      {/* ── 段階移行 ── */}
      <section>
        <h2 id="phased-migration" className="text-xl font-bold text-gray-800">段階移行の進め方</h2>
        <p>全データを一括で移行するのではなく、段階的に移行することでリスクを最小化できます。<Link href="/lp/column/clinic-crm-comparison" className="text-sky-600 underline hover:text-sky-800">CRMの選び方</Link>でも触れていますが、移行しやすいシステムを選ぶことも重要です。</p>

        <FlowSteps steps={[
          { title: "フェーズ1：マスターデータ移行", desc: "患者基本情報・医師情報・診療科目・予約枠設定など、マスターデータを最初に移行。新システムの基盤を構築。" },
          { title: "フェーズ2：履歴データ移行", desc: "予約履歴・来院履歴・メッセージ履歴など、過去の活動データを移行。直近1年分を優先し、それ以前は段階的に追加。" },
          { title: "フェーズ3：稼働データの切り替え", desc: "新規予約の受付を新システムに切り替え。旧システムの既存予約は完了するまで並行運用。" },
          { title: "フェーズ4：全面切り替え", desc: "全業務を新システムに移行。旧システムは参照専用として一定期間維持した後に停止。" },
        ]} />

        <ResultCard
          before="一括移行（リスク高・ダウンタイム長）"
          after="段階移行（リスク最小・ゼロダウンタイム）"
          metric="段階移行で診療への影響をゼロに"
          description="各フェーズで検証を行い、問題があれば即座にロールバック可能"
        />
      </section>

      <InlineCTA />

      {/* ── 検証方法 ── */}
      <section>
        <h2 id="verification" className="text-xl font-bold text-gray-800">移行後の検証方法</h2>
        <p>データ移行が完了したら、移行データの正確性と新システムの動作を徹底的に検証します。</p>

        <FlowSteps steps={[
          { title: "件数照合", desc: "旧システムと新システムの各テーブルの件数を照合。移行対象の全件が正しく移行されているか確認。" },
          { title: "サンプルチェック", desc: "ランダムに50件程度の患者データを抽出し、全フィールドの値が正しいか目視確認。特に電話番号・住所・カルテ内容を重点チェック。" },
          { title: "業務シナリオテスト", desc: "予約登録→問診→診察→会計という一連の業務フローを新システムで実行し、正常に動作するか確認。" },
          { title: "性能テスト", desc: "患者検索・予約一覧表示・配信対象の抽出など、データ量が多い操作のレスポンスを確認。本番データ量で遅延がないか検証。" },
        ]} />

        <Callout type="info" title="検証チェックリストを作成しよう">
          検証項目をスプレッドシートにまとめ、各項目の確認者・確認日時・結果を記録します。検証を属人化させず、漏れなく実施するために必須のプロセスです。
        </Callout>
      </section>

      {/* ── ロールバック ── */}
      <section>
        <h2 id="rollback" className="text-xl font-bold text-gray-800">ロールバック計画</h2>
        <p>万が一の移行失敗に備えて、旧システムに戻す手順を事前に策定しておくことが重要です。<Link href="/lp/column/clinic-line-security" className="text-sky-600 underline hover:text-sky-800">セキュリティガイド</Link>で解説しているデータ保護の観点からも、ロールバック計画は必須です。</p>

        <ul className="space-y-2 text-gray-700">
          <li><strong>旧システムのバックアップ</strong>：移行作業の直前に旧システムの完全バックアップを取得。復元手順も事前にテスト</li>
          <li><strong>ロールバック判断基準</strong>：「患者データに欠損がある」「予約システムが正常に動作しない」など、ロールバックを実行する条件を明文化</li>
          <li><strong>ロールバック手順書</strong>：旧システムへの切り戻し手順をステップバイステップで文書化。実行者が迷わないレベルで詳細に</li>
          <li><strong>並行運用期間の確保</strong>：本番切り替え後も旧システムを最低2週間は稼働可能な状態で維持。問題発覚時に即座にロールバック可能に</li>
        </ul>

        <StatGrid stats={[
          { value: "100", unit: "%", label: "バックアップ取得率（必須）" },
          { value: "2", unit: "週間", label: "最低並行運用期間" },
          { value: "4", unit: "時間", label: "ロールバック完了目標" },
          { value: "0", unit: "件", label: "目標データ欠損数" },
        ]} />
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <Callout type="success" title="安全なデータ移行の5つのフェーズ">
          <ul className="mt-1 space-y-1">
            <li>1. 計画立案：移行対象の棚卸し・スケジュール策定・責任者の明確化</li>
            <li>2. データクレンジング：重複統合・不要データ削除・フォーマット統一で品質を向上</li>
            <li>3. 段階移行：マスター→履歴→稼働データの順に段階的に移行してリスクを最小化</li>
            <li>4. 検証：件数照合・サンプルチェック・業務シナリオテスト・性能テストを実施</li>
            <li>5. ロールバック計画：バックアップ・判断基準・手順書・並行運用期間を事前に準備</li>
          </ul>
        </Callout>

        <p>Lオペ for CLINICでは、CSV/APIによるデータインポート機能と専門スタッフによる移行サポートを提供しています。既存の予約システム・電子カルテ・CRMからの乗り換えをご検討の場合は、まずはお気軽にご相談ください。DX導入の全体的な進め方は<Link href="/lp/column/clinic-dx-complete-guide" className="text-sky-600 underline hover:text-sky-800">クリニックDX完全ガイド</Link>を、DX導入前後のビフォーアフターは<Link href="/lp/column/clinic-dx-before-after" className="text-sky-600 underline hover:text-sky-800">DX導入ビフォーアフター事例</Link>もご参照ください。</p>
      </section>
    </ArticleLayout>
  );
}
