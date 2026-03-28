import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Lオペ プライバシーポリシー",
  description:
    "Lオペ for CLINIC のプライバシーポリシー。個人情報の取り扱いについてご説明します。",
  alternates: { canonical: "https://l-ope.jp/lp/privacy" },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* ヘッダー */}
      <div className="bg-gradient-to-br from-blue-600 to-sky-500 px-5 py-16 text-center">
        <h1 className="text-2xl font-extrabold text-white md:text-3xl">
          プライバシーポリシー
        </h1>
        <p className="mt-2 text-sm text-blue-100">Lオペ for CLINIC</p>
      </div>

      {/* 本文 */}
      <div className="mx-auto max-w-3xl px-5 py-12">
        <p className="text-sm leading-relaxed text-slate-600">
          株式会社ORDIX（以下「当社」といいます）は、クリニック向けLINE運用プラットフォーム「Lオペ
          for
          CLINIC」（以下「本サービス」といいます）の提供にあたり、利用者（クリニック事業者および患者を含みます）の個人情報を適切に取り扱うことが社会的責務であると考え、以下のとおりプライバシーポリシー（以下「本ポリシー」といいます）を定めます。
        </p>

        {/* 1. 基本方針 */}
        <h2 className="mt-10 mb-3 text-lg font-bold text-slate-800">
          1. 基本方針
        </h2>
        <p className="text-sm leading-relaxed text-slate-600">
          当社は、個人情報の保護に関する法律（個人情報保護法）その他の関連法令およびガイドラインを遵守し、個人情報の適正な取得・利用・管理に努めます。医療分野における個人情報の特殊性を十分に認識し、要配慮個人情報を含む医療関連情報については特に慎重な取り扱いを行います。
        </p>

        {/* 2. 収集する個人情報の種類 */}
        <h2 className="mt-10 mb-3 text-lg font-bold text-slate-800">
          2. 収集する個人情報の種類
        </h2>
        <p className="text-sm leading-relaxed text-slate-600">
          本サービスでは、以下の個人情報を収集する場合があります。
        </p>
        <h3 className="mt-4 mb-2 text-sm font-semibold text-slate-700">
          （1）クリニック事業者に関する情報
        </h3>
        <ul className="list-disc space-y-1 pl-6 text-sm leading-relaxed text-slate-600">
          <li>クリニック名、所在地、電話番号、メールアドレス</li>
          <li>管理者の氏名、役職、連絡先</li>
          <li>契約・請求に関する情報</li>
        </ul>
        <h3 className="mt-4 mb-2 text-sm font-semibold text-slate-700">
          （2）患者に関する情報
        </h3>
        <ul className="list-disc space-y-1 pl-6 text-sm leading-relaxed text-slate-600">
          <li>氏名、生年月日、性別、電話番号、メールアドレス</li>
          <li>
            問診情報、診察記録、処方内容等の医療関連情報（要配慮個人情報を含みます）
          </li>
          <li>LINE ユーザーID、表示名、プロフィール画像</li>
          <li>予約情報、決済情報（クレジットカード情報は決済代行会社が管理）</li>
          <li>配送先住所</li>
        </ul>
        <h3 className="mt-4 mb-2 text-sm font-semibold text-slate-700">
          （3）利用ログ・端末情報
        </h3>
        <ul className="list-disc space-y-1 pl-6 text-sm leading-relaxed text-slate-600">
          <li>IPアドレス、ブラウザ種別、OS情報</li>
          <li>アクセス日時、閲覧ページ、操作ログ</li>
          <li>Cookie およびこれに類する技術により取得される情報</li>
        </ul>

        {/* 3. 利用目的 */}
        <h2 className="mt-10 mb-3 text-lg font-bold text-slate-800">
          3. 利用目的
        </h2>
        <p className="text-sm leading-relaxed text-slate-600">
          当社は、収集した個人情報を以下の目的で利用します。
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-sm leading-relaxed text-slate-600">
          <li>本サービスの提供・運営・改善</li>
          <li>
            クリニックと患者間のLINEコミュニケーション支援（メッセージ送受信、予約管理、問診管理等）
          </li>
          <li>AI自動返信機能における応答精度の向上</li>
          <li>予約・決済処理および配送手配</li>
          <li>本人確認およびアカウント管理</li>
          <li>利用状況の分析およびサービス品質の向上</li>
          <li>障害対応・セキュリティ対策</li>
          <li>契約・請求に関する事務処理</li>
          <li>法令に基づく対応</li>
          <li>お問い合わせへの回答およびサポート業務</li>
        </ul>

        {/* 4. 第三者提供 */}
        <h2 className="mt-10 mb-3 text-lg font-bold text-slate-800">
          4. 第三者提供
        </h2>
        <p className="text-sm leading-relaxed text-slate-600">
          当社は、以下の場合を除き、あらかじめご本人の同意なく個人情報を第三者に提供いたしません。
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-sm leading-relaxed text-slate-600">
          <li>法令に基づく場合</li>
          <li>
            人の生命・身体・財産の保護のために必要であり、本人の同意を得ることが困難な場合
          </li>
          <li>
            公衆衛生の向上または児童の健全育成のために特に必要であり、本人の同意を得ることが困難な場合
          </li>
          <li>
            国の機関もしくは地方公共団体またはその委託を受けた者が法令に定める事務を遂行するために協力する必要がある場合
          </li>
        </ul>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          なお、本サービスの運営上、以下の業務委託先に対して必要な範囲で個人情報を共有する場合があります。これらの委託先とは適切な契約を締結し、委託先における個人情報の安全管理を監督いたします。
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-sm leading-relaxed text-slate-600">
          <li>
            LINE株式会社（LINE Messaging
            APIを利用したメッセージ送受信に伴うデータ連携）
          </li>
          <li>
            決済代行会社（Square株式会社、GMOペイメントゲートウェイ株式会社等によるクレジットカード決済処理）
          </li>
          <li>
            クラウドインフラ提供事業者（Supabase, Inc.、Vercel
            Inc.等によるデータ保管・配信）
          </li>
          <li>AI関連サービス提供事業者（Anthropic, PBC、OpenAI, Inc.等によるAI応答生成・テキスト解析）</li>
        </ul>

        {/* 5. 安全管理措置 */}
        <h2 className="mt-10 mb-3 text-lg font-bold text-slate-800">
          5. 安全管理措置
        </h2>
        <p className="text-sm leading-relaxed text-slate-600">
          当社は、個人情報への不正アクセス、紛失、破壊、改ざんおよび漏洩を防止するため、以下の安全管理措置を講じています。
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-sm leading-relaxed text-slate-600">
          <li>
            <span className="font-semibold">通信の暗号化:</span>{" "}
            全通信にSSL/TLS暗号化を適用し、データの盗聴・改ざんを防止します。
          </li>
          <li>
            <span className="font-semibold">アクセス制御:</span>{" "}
            行レベルセキュリティ（RLS）によるデータベースアクセス制御、管理者認証・セッション管理、CSRF対策を実施しています。
          </li>
          <li>
            <span className="font-semibold">データ暗号化:</span>{" "}
            機密性の高い情報は暗号化して保存します。クレジットカード情報は当社サーバーに保存せず、PCI
            DSS準拠の決済代行会社が管理します。
          </li>
          <li>
            <span className="font-semibold">監査ログ:</span>{" "}
            管理画面の操作履歴を記録し、不正利用の検知・追跡を行います。
          </li>
          <li>
            <span className="font-semibold">マルチテナント分離:</span>{" "}
            クリニックごとにデータを論理的に分離し、他のクリニックの情報にアクセスできない仕組みを構築しています。
          </li>
          <li>
            <span className="font-semibold">従業者の管理:</span>{" "}
            個人情報を取り扱う従業者に対し、必要な教育・監督を行います。
          </li>
        </ul>

        {/* 6. 個人情報の開示・訂正・削除の請求 */}
        <h2 className="mt-10 mb-3 text-lg font-bold text-slate-800">
          6. 個人情報の開示・訂正・削除の請求
        </h2>
        <p className="text-sm leading-relaxed text-slate-600">
          ご本人から個人情報の開示、訂正、追加、削除、利用停止または消去（以下「開示等」といいます）のご請求があった場合、ご本人確認のうえ、合理的な期間内に対応いたします。ただし、以下の場合には開示等に応じられないことがあります。
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-sm leading-relaxed text-slate-600">
          <li>ご本人確認ができない場合</li>
          <li>法令に基づき保存が義務づけられている情報の削除請求の場合</li>
          <li>
            開示等により当社の業務の適正な実施に著しい支障を及ぼすおそれがある場合
          </li>
          <li>他の法令に違反することとなる場合</li>
        </ul>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          なお、患者の診療記録等の医療情報に関する開示・訂正・削除については、当該情報を管理するクリニック事業者にお問い合わせください。当社はクリニック事業者の指示に基づいて対応いたします。
        </p>

        {/* 7. Cookie・アクセス解析の利用 */}
        <h2 className="mt-10 mb-3 text-lg font-bold text-slate-800">
          7. Cookie・アクセス解析の利用
        </h2>
        <p className="text-sm leading-relaxed text-slate-600">
          本サービスでは、利便性の向上やアクセス状況の把握を目的として、Cookie
          およびこれに類する技術を使用する場合があります。Cookie
          により取得する情報には、単独で個人を特定する情報は含まれません。ブラウザの設定により
          Cookie
          を無効にすることも可能ですが、その場合、本サービスの一部機能が利用できなくなる場合があります。
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          また、当社はサービス改善のためにアクセス解析ツール（Google
          Analytics等）を利用する場合があります。これらのツールは Cookie
          を使用して匿名のトラフィックデータを収集しますが、個人を特定する情報は収集しません。
        </p>

        {/* 8. 問い合わせ窓口 */}
        <h2 className="mt-10 mb-3 text-lg font-bold text-slate-800">
          8. お問い合わせ窓口
        </h2>
        <p className="text-sm leading-relaxed text-slate-600">
          個人情報の取り扱いに関するお問い合わせ・苦情・ご相談は、以下の窓口までご連絡ください。
        </p>
        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-5 text-sm leading-relaxed text-slate-600">
          <p className="font-semibold text-slate-800">
            株式会社ORDIX 個人情報管理責任者
          </p>
          <p className="mt-1">メール: contact@l-ope.jp</p>
          <p>所在地: 東京都新宿区西新宿6丁目5-1 新宿アイランドタワー2階</p>
        </div>

        {/* 9. ポリシーの改定 */}
        <h2 className="mt-10 mb-3 text-lg font-bold text-slate-800">
          9. プライバシーポリシーの改定
        </h2>
        <p className="text-sm leading-relaxed text-slate-600">
          当社は、法令の変更、サービス内容の変更その他の事由により、本ポリシーを改定することがあります。改定後のプライバシーポリシーは、本ページに掲載した時点で効力を生じるものとします。重要な変更がある場合には、本サービス上で別途お知らせいたします。
        </p>

        {/* 施行日 */}
        <div className="mt-12 border-t border-slate-200 pt-6">
          <p className="text-sm text-slate-500">
            制定日: 2026年3月10日
          </p>
          <p className="mt-1 text-sm text-slate-500">株式会社ORDIX</p>
        </div>

        {/* フッター: LPへ戻る */}
        <div className="mt-12 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
          >
            ← Lオペ for CLINIC トップページへ戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
