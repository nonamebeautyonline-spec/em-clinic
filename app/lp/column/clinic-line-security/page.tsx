import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, {
  InlineCTA,
  StatGrid,
  ComparisonTable,
  Callout,
  FlowSteps,
  ResultCard,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "clinic-line-security")!;

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
  "医療機関のLINE運用で遵守すべき個人情報保護法の要件",
  "ロールベースのスタッフ権限管理で情報漏洩リスクを最小化",
  "データ暗号化・通信セキュリティの技術的対策",
  "セキュリティ監査チェックリストで定期的な点検を実施",
];

const toc = [
  { id: "privacy-law", label: "個人情報保護法への対応" },
  { id: "staff-permission", label: "スタッフ権限管理の設計" },
  { id: "encryption", label: "データ暗号化と通信セキュリティ" },
  { id: "audit-checklist", label: "セキュリティ監査チェックリスト" },
  { id: "incident-response", label: "インシデント発生時の対応" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="ガイド" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">クリニックのLINE公式アカウント運用では、患者の氏名・生年月日・診療情報などの<strong>要配慮個人情報</strong>を扱います。個人情報保護法に準拠したセキュリティ対策は法的義務であると同時に、<strong>患者からの信頼を守る経営課題</strong>です。本記事では具体的な対策方法とチェックリストを解説します。</p>

      {/* ── 個人情報保護法 ── */}
      <section>
        <h2 id="privacy-law" className="text-xl font-bold text-gray-800">個人情報保護法への対応</h2>
        <p>医療機関がLINEで患者情報を扱う場合、個人情報保護法に加え、厚生労働省の「医療情報システムの安全管理に関するガイドライン」への準拠が求められます。オンライン診療の費用・法規制については<Link href="/lp/column/online-medical-cost" className="text-sky-600 underline hover:text-sky-800">オンライン診療の導入費用と運用コスト</Link>もご参考ください。</p>

        <FlowSteps steps={[
          { title: "利用目的の明示", desc: "LINE友だち追加時に「個人情報の利用目的」を明示。予約管理・診療情報の送信・健康情報の配信など、具体的な利用目的をプライバシーポリシーに記載する。" },
          { title: "同意の取得", desc: "患者から個人情報取扱いへの同意を取得。LINE上で同意ボタンを設置し、同意記録を保存。未同意の患者には個人情報を含むメッセージを送信しない。" },
          { title: "要配慮個人情報の管理", desc: "診療情報・検査結果・処方内容は「要配慮個人情報」に該当。取得には本人の事前同意が必須であり、第三者提供は原則禁止。" },
        ]} />

        <Callout type="warning" title="違反時のリスク">
          個人情報保護法違反は、個人情報保護委員会からの是正勧告、最大1億円の罰金、さらに患者からの損害賠償請求のリスクがあります。「知らなかった」は通用しません。
        </Callout>
      </section>

      {/* ── スタッフ権限管理 ── */}
      <section>
        <h2 id="staff-permission" className="text-xl font-bold text-gray-800">スタッフ権限管理の設計</h2>
        <p>情報漏洩の多くは内部要因です。スタッフごとに適切な権限を設定し、「必要最小限のアクセス」の原則を徹底します。スタッフのIT教育については<Link href="/lp/column/clinic-staff-training" className="text-sky-600 underline hover:text-sky-800">スタッフのLINE運用研修ガイド</Link>で詳しく解説しています。</p>

        <ComparisonTable
          headers={["権限レベル", "アクセス範囲", "対象スタッフ"]}
          rows={[
            ["管理者", "全機能・全データ・設定変更", "院長・事務長"],
            ["スーパーバイザー", "患者データ閲覧・配信作成・レポート確認", "看護師長・リーダー"],
            ["オペレーター", "担当患者のチャット・予約確認", "受付スタッフ"],
            ["閲覧のみ", "レポート・統計データの閲覧", "経営コンサル・外部アドバイザー"],
          ]}
        />

        <FlowSteps steps={[
          { title: "最小権限の原則", desc: "各スタッフに業務上必要な最小限の権限のみを付与。受付スタッフがカルテ情報にアクセスできないよう、権限を明確に分離する。" },
          { title: "操作ログの記録", desc: "誰が・いつ・どのデータにアクセスしたかを自動記録。不正アクセスの早期発見と、インシデント発生時の追跡に活用。" },
          { title: "定期的な権限見直し", desc: "3ヶ月ごとにスタッフの権限を見直し。退職者のアカウント即時停止、異動者の権限変更を漏れなく実施。" },
        ]} />
      </section>

      <InlineCTA />

      {/* ── データ暗号化 ── */}
      <section>
        <h2 id="encryption" className="text-xl font-bold text-gray-800">データ暗号化と通信セキュリティ</h2>
        <p>患者データの暗号化は、万が一の情報漏洩時にも被害を最小化するための重要な対策です。データ移行時のセキュリティについては<Link href="/lp/column/clinic-data-migration" className="text-sky-600 underline hover:text-sky-800">データ移行ガイド</Link>もご参照ください。</p>

        <FlowSteps steps={[
          { title: "通信の暗号化（TLS 1.3）", desc: "LINEとサーバー間、サーバーと管理画面間の全通信をTLS 1.3で暗号化。通信傍受による情報漏洩を防止。" },
          { title: "保存データの暗号化（AES-256）", desc: "データベースに保存される患者情報をAES-256で暗号化。サーバーへの不正アクセスがあってもデータが読み取れない。" },
          { title: "アクセストークンの管理", desc: "LINE APIのアクセストークンやAPIキーは環境変数で管理し、ソースコードに直接記載しない。定期的なトークンローテーションを実施。" },
        ]} />

        <StatGrid stats={[
          { value: "AES-256", unit: "", label: "保存データの暗号化方式" },
          { value: "TLS 1.3", unit: "", label: "通信の暗号化方式" },
          { value: "99.9", unit: "%", label: "Supabase稼働率SLA" },
        ]} />
      </section>

      {/* ── 監査チェックリスト ── */}
      <section>
        <h2 id="audit-checklist" className="text-xl font-bold text-gray-800">セキュリティ監査チェックリスト</h2>
        <p>定期的なセキュリティ監査で、対策の抜け漏れを防止します。以下のチェックリストを月次で実施することを推奨します。</p>

        <ComparisonTable
          headers={["チェック項目", "頻度", "担当"]}
          rows={[
            ["退職者のアカウント停止確認", "随時（退職時）", "事務長"],
            ["スタッフ権限の棚卸し", "3ヶ月ごと", "院長"],
            ["操作ログの異常確認", "月次", "管理者"],
            ["パスワードポリシーの遵守確認", "月次", "管理者"],
            ["バックアップの復元テスト", "半年ごと", "IT担当"],
            ["プライバシーポリシーの更新確認", "年次", "院長"],
            ["スタッフへのセキュリティ研修", "年次", "事務長"],
          ]}
        />
      </section>

      {/* ── インシデント対応 ── */}
      <section>
        <h2 id="incident-response" className="text-xl font-bold text-gray-800">インシデント発生時の対応</h2>
        <p>万が一セキュリティインシデントが発生した場合に備え、対応手順を事前に策定しておくことが重要です。</p>

        <FlowSteps steps={[
          { title: "Step 1: 検知と初動対応", desc: "異常を検知したら即座にアクセスを遮断。被害範囲の特定と拡大防止を最優先で実施。" },
          { title: "Step 2: 影響範囲の調査", desc: "操作ログを分析し、流出したデータの範囲と影響を受ける患者数を特定。" },
          { title: "Step 3: 報告と通知", desc: "個人情報保護委員会への報告（漏洩が1,000人超の場合は速報義務あり）。影響を受ける患者への通知を実施。" },
          { title: "Step 4: 再発防止策の実施", desc: "原因分析を行い、再発防止策を策定・実施。セキュリティポリシーの見直しとスタッフへの周知を行う。" },
        ]} />

        <ResultCard
          before="インシデント対応手順が未策定"
          after="対応フローを事前策定・年1回訓練実施"
          metric="初動対応時間を72時間→4時間に短縮"
          description="事前準備が被害の最小化につながる"
        />
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <Callout type="success" title="LINE運用セキュリティのポイント">
          <ul className="mt-1 space-y-1">
            <li>• 個人情報保護法の遵守は法的義務 — 利用目的の明示と同意取得を徹底</li>
            <li>• スタッフ権限は「最小権限の原則」で設計し、操作ログを記録</li>
            <li>• データ暗号化（AES-256）と通信暗号化（TLS 1.3）で技術的対策を実施</li>
            <li>• セキュリティ監査チェックリストで定期的な点検を実施</li>
          </ul>
        </Callout>

        <p>Lオペ for CLINICは、医療機関のセキュリティ要件に対応した設計で、ロールベースの権限管理・操作ログ・データ暗号化を標準搭載しています。安心・安全なLINE運用を実現し、患者の信頼を守りましょう。LINE運用の全体設計については<Link href="/lp/column/line-operation-guide" className="text-sky-600 underline hover:text-sky-800">LINE運用完全ガイド</Link>、オンライン診療の法規制については<Link href="/lp/column/online-clinic-regulations" className="text-sky-600 underline hover:text-sky-800">法規制と薬機法ガイド</Link>もご覧ください。</p>
      </section>
    </ArticleLayout>
  );
}
