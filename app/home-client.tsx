"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useInView, useMotionValue, animate } from "motion/react";

/* ═══════════════════════════════════════════════════════════════════════════
   Lオペ 統合トップページ — 白ベース・タイポグラフィ主体デザイン
   ═══════════════════════════════════════════════════════════════════════════ */

/* ------------------------------------------------------------------ */
/*  カウントアップ                                                      */
/* ------------------------------------------------------------------ */
function CountUp({
  to,
  duration = 2,
  suffix = "",
  className = "",
  decimals = 0,
}: {
  to: number;
  duration?: number;
  suffix?: string;
  className?: string;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const motionVal = useMotionValue(0);
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!inView) return;
    const controls = animate(motionVal, to, {
      duration,
      ease: [0.25, 0.46, 0.45, 0.94],
      onUpdate: (v) => setDisplay(v.toFixed(decimals)),
    });
    return controls.stop;
  }, [inView, to, duration, decimals, motionVal]);

  return (
    <span ref={ref} className={className}>
      {display}
      {suffix}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  FadeIn ラッパー                                                     */
/* ------------------------------------------------------------------ */
function FadeIn({
  children,
  delay = 0,
  className = "",
  y = 24,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        duration: 0.7,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  サービスデータ                                                      */
/* ------------------------------------------------------------------ */
type Service = {
  name: string;
  subtitle: string;
  href: string;
  color: string;
  description: string;
  features: string[];
  comingSoon?: boolean;
};

const services: Service[] = [
  {
    name: "Lオペ",
    subtitle: "LINE運用プラットフォーム",
    href: "/line/",
    color: "#06C755",
    description:
      "あらゆる業種に対応するLINE公式アカウント運用の基盤ツール",
    features: [
      "セグメント配信・ステップ配信",
      "リッチメニュービルダー",
      "AI自動返信・キーワード応答",
    ],
  },
  {
    name: "Lオペ for CLINIC",
    subtitle: "クリニック特化",
    href: "/clinic/",
    color: "#3b82f6",
    description:
      "予約・問診・カルテ・決済・配送・AI自動返信をLINE起点で一元管理。月60時間の事務作業を削減し、再診率1.5倍を実現",
    features: [
      "オンライン問診・予約管理・リマインド自動配信",
      "電子カルテ連携・SOAP記録・AI自動返信",
      "処方薬の決済・配送管理・定期処方自動化",
    ],
  },
  {
    name: "Lオペ for SALON",
    subtitle: "サロン特化",
    href: "/salon/",
    color: "#ec4899",
    description:
      "サロン特化の予約・顧客管理でリピート率を最大化",
    features: [
      "LINE予約・リマインド配信",
      "顧客カルテ・施術履歴管理",
      "ポイント・クーポン配信",
    ],
    comingSoon: true,
  },
  {
    name: "Lオペ for EC",
    subtitle: "EC・小売特化",
    href: "/ec/",
    color: "#8B7355",
    description: "購買データ連動のLINE配信でLTVを向上",
    features: [
      "購入後フォロー自動配信",
      "カゴ落ち・再購入リマインド",
      "セグメント別キャンペーン配信",
    ],
    comingSoon: true,
  },
];

/* ------------------------------------------------------------------ */
/*  特徴データ                                                          */
/* ------------------------------------------------------------------ */
const features = [
  {
    title: "業種別に最適化",
    description:
      "汎用ツールでは対応しきれない業種固有の業務フローに合わせて設計。導入初日から成果につながる。",
  },
  {
    title: "AIが学習し続ける",
    description:
      "スタッフの修正内容から自動で学習し、返信精度が日々向上。運用するほど業務負荷が下がる。",
  },
  {
    title: "医療レベルのセキュリティ",
    description:
      "暗号化・監査ログ・アクセス制御を標準搭載。個人情報を扱う業種でも安心して運用できる。",
  },
];

/* ------------------------------------------------------------------ */
/*  数字実績                                                            */
/* ------------------------------------------------------------------ */
const stats = [
  { value: 50, suffix: "+", label: "導入テナント" },
  { value: 120, suffix: "万+", label: "累計配信数" },
  { value: 8, suffix: "万+", label: "友だち管理数" },
  { value: 99.9, suffix: "%", label: "稼働率", decimals: 1 },
];

/* ------------------------------------------------------------------ */
/*  サービスカード                                                      */
/* ------------------------------------------------------------------ */
function ServiceCard({
  service,
  index,
}: {
  service: Service;
  index: number;
}) {
  return (
    <FadeIn delay={index * 0.1}>
      <Link
        href={service.href}
        className="group relative flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50"
      >
        {/* 上端のテーマカラーライン */}
        <div
          className="absolute inset-x-0 top-0 h-[3px] rounded-t-2xl"
          style={{ backgroundColor: service.color }}
        />

        {/* Coming Soonバッジ */}
        {service.comingSoon && (
          <span className="absolute top-5 right-5 rounded-full border border-slate-200 bg-slate-50 px-3 py-0.5 text-[11px] font-medium text-slate-400">
            Coming Soon
          </span>
        )}

        {/* テーマカラードット + サービス名 */}
        <div className="mb-5 flex items-center gap-3">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: service.color }}
          />
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {service.name}
            </h3>
            <p className="text-[12px] font-medium text-slate-400">
              {service.subtitle}
            </p>
          </div>
        </div>

        {/* 説明 */}
        <p className="mb-6 text-[14px] leading-relaxed text-slate-500">
          {service.description}
        </p>

        {/* 機能リスト */}
        <ul className="flex-1 space-y-2.5">
          {service.features.map((f) => (
            <li
              key={f}
              className="flex items-start gap-2.5 text-[13px] text-slate-500"
            >
              <span
                className="mt-[7px] block h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: service.color, opacity: 0.5 }}
              />
              {f}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="mt-7 flex items-center gap-1.5 text-[13px] font-medium text-slate-400 transition-all duration-300 group-hover:gap-3 group-hover:text-slate-700">
          {service.comingSoon
            ? "準備中"
            : service.name === "Lオペ for CLINIC"
              ? "クリニック向けはこちら"
              : "詳しく見る"}
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1"
          >
            <path
              d="M3 8h10m-4-4 4 4-4 4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </Link>
    </FadeIn>
  );
}

/* ================================================================== */
/*  メインコンポーネント                                                */
/* ================================================================== */
export default function HomeClient() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="min-h-screen bg-white text-slate-900"
      style={{ fontFeatureSettings: "'palt'" }}
    >
      {/* ═══════════ ヒーロー ═══════════ */}
      <section className="relative flex min-h-[100dvh] items-center overflow-hidden">
        {/* 背景: 微かなblob装飾 */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-blue-100/40 blur-[120px]" />
          <div className="absolute -bottom-32 -left-32 h-[400px] w-[400px] rounded-full bg-slate-100/60 blur-[100px]" />
        </div>

        {/* 白→slate-50グラデーション */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white via-white to-slate-50" />

        {/* コンテンツ */}
        <div className="relative z-10 mx-auto w-full max-w-4xl px-6 py-32 text-center md:py-0">
          {/* ロゴ */}
          <div
            className="mx-auto mb-10 transition-all duration-700"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(12px)",
            }}
          >
            <Image
              src="/icon.png"
              alt="Lオペ"
              width={64}
              height={64}
              className="mx-auto rounded-2xl"
              priority
            />
          </div>

          {/* メインタイトル */}
          <div
            className="transition-all duration-1000"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(20px)",
              transitionDelay: "200ms",
            }}
          >
            <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[1.3] tracking-tight text-slate-900">
              業種に最適化された
              <br />
              LINE運用プラットフォーム
            </h1>
          </div>

          {/* サブテキスト */}
          <div
            className="mt-6 transition-all duration-1000"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(16px)",
              transitionDelay: "500ms",
            }}
          >
            <p className="mx-auto max-w-lg text-[16px] leading-relaxed text-slate-400">
              クリニック・サロン・EC。
              <br className="sm:hidden" />
              それぞれの業務フローに合わせて設計された、
              <br className="hidden sm:block" />
              LINE公式アカウント運用ツール。
            </p>
          </div>

          {/* スクロールインジケーター */}
          <div
            className="mt-20 transition-all duration-1000"
            style={{
              opacity: visible ? 0.3 : 0,
              transitionDelay: "1200ms",
            }}
          >
            <div className="mx-auto h-10 w-px bg-gradient-to-b from-slate-300 to-transparent" />
          </div>
        </div>
      </section>

      {/* ═══════════ サービスカード ═══════════ */}
      <section className="bg-slate-50/50 px-6 py-24 md:py-32">
        <div className="mx-auto max-w-5xl">
          <FadeIn className="mb-16">
            <p className="text-[12px] font-medium tracking-[0.2em] text-slate-400">
              SERVICES
            </p>
            <h2 className="mt-3 text-2xl font-bold text-slate-900 md:text-3xl">
              あなたの業種に合ったプランを
            </h2>
          </FadeIn>

          <div className="grid gap-6 md:grid-cols-2">
            {services.map((s, i) => (
              <ServiceCard key={s.name} service={s} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ 数字で見るLオペ ═══════════ */}
      <section className="border-y border-slate-100 bg-white px-6 py-24 md:py-32">
        <div className="mx-auto max-w-5xl">
          <FadeIn className="mb-16 text-center">
            <p className="text-[12px] font-medium tracking-[0.2em] text-slate-400">
              NUMBERS
            </p>
            <h2 className="mt-3 text-2xl font-bold text-slate-900 md:text-3xl">
              数字で見るLオペ
            </h2>
          </FadeIn>

          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat, i) => (
              <FadeIn key={stat.label} delay={i * 0.1} className="text-center">
                <div className="text-3xl font-bold text-slate-900 md:text-4xl">
                  <CountUp
                    to={stat.value}
                    suffix={stat.suffix}
                    decimals={stat.decimals || 0}
                  />
                </div>
                <div className="mt-2 text-[13px] text-slate-400">
                  {stat.label}
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ 特徴セクション ═══════════ */}
      <section className="bg-white px-6 py-24 md:py-32">
        <div className="mx-auto max-w-5xl">
          <FadeIn className="mb-16">
            <p className="text-[12px] font-medium tracking-[0.2em] text-slate-400">
              WHY L-OPE
            </p>
            <h2 className="mt-3 text-2xl font-bold text-slate-900 md:text-3xl">
              選ばれる理由
            </h2>
          </FadeIn>

          <div className="grid gap-12 md:grid-cols-3 md:gap-8">
            {features.map((item, i) => (
              <FadeIn key={item.title} delay={i * 0.12}>
                <div className="border-t border-slate-200 pt-6">
                  <h3 className="mb-3 text-[16px] font-bold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="text-[14px] leading-relaxed text-slate-400">
                    {item.description}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ フッター ═══════════ */}
      <footer className="border-t border-slate-100 bg-slate-50 px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col items-center gap-10 md:flex-row md:items-start md:justify-between">
            {/* ロゴ・運営 */}
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center gap-2.5 md:justify-start">
                <Image
                  src="/icon.png"
                  alt="Lオペ"
                  width={28}
                  height={28}
                  className="rounded-lg"
                />
                <span className="text-[15px] font-bold text-slate-900">
                  Lオペ
                </span>
              </div>
              <p className="mt-3 text-[12px] text-slate-400">
                運営:{" "}
                <a
                  href="https://ordix.co.jp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-slate-600"
                >
                  株式会社ORDIX
                </a>
              </p>
            </div>

            {/* サービスリンク */}
            <nav className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-[13px] text-slate-400">
              {services.map((s) => (
                <Link
                  key={s.name}
                  href={s.href}
                  className="transition-colors hover:text-slate-700"
                >
                  {s.name}
                </Link>
              ))}
              <a
                href="https://ordix.co.jp"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-slate-700"
              >
                法人サイト
              </a>
            </nav>
          </div>

          <div className="mt-12 border-t border-slate-200 pt-8 text-center text-[11px] text-slate-400">
            &copy; {new Date().getFullYear()} 株式会社ORDIX. All rights
            reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
