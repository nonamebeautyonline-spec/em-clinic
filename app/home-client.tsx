"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  motion,
  useInView,
  useMotionValue,
  useTransform,
  useScroll,
  animate,
} from "motion/react";

/* ═══════════════════════════════════════════════════════════════════════════
   Lオペ 統合トップページ — ダークモード基調・高技術デザイン
   ═══════════════════════════════════════════════════════════════════════════ */

/* ------------------------------------------------------------------ */
/*  ユーティリティ: カウントアップ                                        */
/* ------------------------------------------------------------------ */
function CountUp({
  to,
  duration = 2,
  prefix = "",
  suffix = "",
  className = "",
  decimals = 0,
}: {
  to: number;
  duration?: number;
  prefix?: string;
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
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Canvas: グリッドネットワーク背景                                     */
/* ------------------------------------------------------------------ */
function GridCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const onMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };
    window.addEventListener("mousemove", onMouse);

    const GRID = 40;
    const MOUSE_RADIUS = 180;

    function draw() {
      if (!ctx || !canvas) return;
      const cw = canvas.offsetWidth;
      const ch = canvas.offsetHeight;
      ctx.clearRect(0, 0, cw, ch);

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      /* グリッドドット描画 */
      for (let x = GRID; x < cw; x += GRID) {
        for (let y = GRID; y < ch; y += GRID) {
          const dx = x - mx;
          const dy = y - my;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const isNear = dist < MOUSE_RADIUS;

          ctx.beginPath();
          ctx.arc(x, y, isNear ? 2 : 1, 0, Math.PI * 2);
          ctx.fillStyle = isNear
            ? `rgba(59,130,246,${0.5 - (dist / MOUSE_RADIUS) * 0.4})`
            : "rgba(148,163,184,0.08)";
          ctx.fill();

          /* マウス近傍のドット間を接続 */
          if (isNear) {
            /* 右 */
            if (x + GRID < cw) {
              const d2 = Math.sqrt(
                (x + GRID - mx) ** 2 + (y - my) ** 2
              );
              if (d2 < MOUSE_RADIUS) {
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + GRID, y);
                ctx.strokeStyle = `rgba(59,130,246,${
                  (1 - dist / MOUSE_RADIUS) * 0.15
                })`;
                ctx.lineWidth = 0.5;
                ctx.stroke();
              }
            }
            /* 下 */
            if (y + GRID < ch) {
              const d2 = Math.sqrt(
                (x - mx) ** 2 + (y + GRID - my) ** 2
              );
              if (d2 < MOUSE_RADIUS) {
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x, y + GRID);
                ctx.strokeStyle = `rgba(59,130,246,${
                  (1 - dist / MOUSE_RADIUS) * 0.15
                })`;
                ctx.lineWidth = 0.5;
                ctx.stroke();
              }
            }
          }
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    }
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouse);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      style={{ opacity: 0.6 }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  マウス追従グラデーション                                              */
/* ------------------------------------------------------------------ */
function MouseGlow() {
  const ref = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0.5, y: 0.5 });
  const current = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      pos.current = {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      };
    };

    let raf: number;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const tick = () => {
      current.current.x = lerp(current.current.x, pos.current.x, 0.04);
      current.current.y = lerp(current.current.y, pos.current.y, 0.04);
      if (el) {
        const cx = current.current.x * 100;
        const cy = current.current.y * 100;
        el.style.background = `radial-gradient(600px circle at ${cx}% ${cy}%, rgba(59,130,246,0.06) 0%, transparent 70%)`;
      }
      raf = requestAnimationFrame(tick);
    };

    el.addEventListener("mousemove", onMove);
    raf = requestAnimationFrame(tick);

    return () => {
      el.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute inset-0"
    />
  );
}

/* ------------------------------------------------------------------ */
/*  グレインオーバーレイ                                                  */
/* ------------------------------------------------------------------ */
function GrainOverlay() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[100] opacity-[0.02]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E")`,
        backgroundRepeat: "repeat",
        mixBlendMode: "multiply",
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  TiltCard — 3D傾斜カード                                              */
/* ------------------------------------------------------------------ */
function TiltCard({
  children,
  className = "",
  maxTilt = 6,
}: {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback(
    (e: React.MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const rotateX = (0.5 - y) * maxTilt * 2;
      const rotateY = (x - 0.5) * maxTilt * 2;
      el.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02,1.02,1.02)`;
      if (glareRef.current) {
        glareRef.current.style.opacity = "1";
        glareRef.current.style.background = `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(255,255,255,0.08) 0%, transparent 60%)`;
      }
    },
    [maxTilt]
  );

  const handleLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform =
      "perspective(800px) rotateX(0) rotateY(0) scale3d(1,1,1)";
    if (glareRef.current) {
      glareRef.current.style.opacity = "0";
    }
  }, []);

  return (
    <div
      ref={ref}
      className={`relative transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${className}`}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ transformStyle: "preserve-3d" }}
    >
      {children}
      <div
        ref={glareRef}
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300"
      />
    </div>
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
  icon: React.ReactNode;
  description: string;
  features: string[];
  comingSoon?: boolean;
};

/* SVGアイコン */
const IconLine = (
  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
    <path
      d="M12 2C6.48 2 2 5.58 2 10c0 2.24 1.12 4.24 2.88 5.66-.12.94-.64 3.5-.66 3.68 0 .14.04.28.16.36.08.06.16.08.26.08.1 0 .2-.04.28-.1.96-.7 3.56-2.44 4.12-2.84.62.08 1.28.16 1.96.16 5.52 0 10-3.58 10-8S17.52 2 12 2Z"
      fill="currentColor"
    />
  </svg>
);
const IconClinic = (
  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
    <path
      d="M18 4h-4V2H10v2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm-1 11h-3v3h-4v-3H7v-4h3V8h4v3h3v4Z"
      fill="currentColor"
    />
  </svg>
);
const IconSalon = (
  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
    <path
      d="M20.57 14.86 22 13.43 20.57 12l-2.86 2.86L14.86 12 12 14.86l2.86 2.85L12 20.57 13.43 22l2.85-2.86L19.14 22 20.57 20.57l-2.86-2.86 2.86-2.85ZM17 11c.25 0 .5-.02.75-.07l2.18-3.08.77.77 1.06-1.06-5.36-5.36L15.34 3.26l.77.77-3.08 2.18A4 4 0 0 0 11 2C7.69 2 5 4.69 5 8s2.69 6 6 6c1.66 0 3.14-.69 4.22-1.78L13.4 10.4a4 4 0 0 0 3.6.6Z"
      fill="currentColor"
    />
  </svg>
);
const IconEC = (
  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
    <path
      d="M7 22c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2Zm10 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2ZM5.3 3H2v2h2l3.6 7.59-1.35 2.44C5.52 16.17 6.48 18 7.96 18H20v-2H7.96l1.1-2h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0 0 21 5H5.3Z"
      fill="currentColor"
    />
  </svg>
);

const services: Service[] = [
  {
    name: "Lオペ",
    subtitle: "LINE運用プラットフォーム",
    href: "/line/",
    color: "#06C755",
    icon: IconLine,
    description: "あらゆる業種に対応するLINE公式アカウント運用の基盤ツール",
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
    icon: IconClinic,
    description: "患者CRM・予約・問診・決済までクリニック業務をオールインワンで",
    features: [
      "オンライン問診・予約管理",
      "電子カルテ連携・SOAP記録",
      "処方薬の決済・配送管理",
    ],
  },
  {
    name: "Lオペ for SALON",
    subtitle: "サロン特化",
    href: "/salon/",
    color: "#ec4899",
    icon: IconSalon,
    description: "サロン特化の予約・顧客管理でリピート率を最大化",
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
    icon: IconEC,
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
/*  テクノロジーデータ                                                   */
/* ------------------------------------------------------------------ */
const techItems = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-7 w-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
      </svg>
    ),
    title: "AIエンジン",
    description: "自然言語理解によるAI自動返信。スタッフの修正から自動学習し、回答精度が向上し続ける。",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-7 w-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
      </svg>
    ),
    title: "リアルタイム分析",
    description: "配信効果・顧客行動・売上を即時にダッシュボード可視化。データに基づく改善サイクルを実現。",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-7 w-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    ),
    title: "エンタープライズセキュリティ",
    description: "CSRF対策・Rate Limiting・暗号化・監査ログ・RLS。医療レベルの情報セキュリティを標準搭載。",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-7 w-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 0 0 2.25-2.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v2.25A2.25 2.25 0 0 0 6 10.5Zm0 9.75h2.25A2.25 2.25 0 0 0 10.5 18v-2.25a2.25 2.25 0 0 0-2.25-2.25H6a2.25 2.25 0 0 0-2.25 2.25V18A2.25 2.25 0 0 0 6 20.25Zm9.75-9.75H18a2.25 2.25 0 0 0 2.25-2.25V6A2.25 2.25 0 0 0 18 3.75h-2.25A2.25 2.25 0 0 0 13.5 6v2.25a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
    ),
    title: "マルチテナント基盤",
    description: "テナントごとに完全分離された環境。スケーラブルなSaaS基盤で安定したサービスを提供。",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-7 w-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
    title: "LINE API完全統合",
    description: "Messaging API・LIFF・リッチメニュー・Flex Message。LINE機能をフルに活用した最適な顧客体験。",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-7 w-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
      </svg>
    ),
    title: "高速パフォーマンス",
    description: "Edge Functions・CDN・ISR。世界水準のインフラで、0.1秒未満のレスポンスを実現。",
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
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        duration: 0.6,
        delay: index * 0.1,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      <TiltCard className="h-full rounded-2xl">
        <Link
          href={service.href}
          className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-900/70 p-7 backdrop-blur-sm transition-all duration-500 hover:border-slate-600"
        >
          {/* 上端のテーマカラーライン */}
          <div
            className="absolute inset-x-0 top-0 h-[2px] opacity-60 transition-opacity duration-500 group-hover:opacity-100"
            style={{ backgroundColor: service.color }}
          />

          {/* ホバー時のグロー */}
          <div
            className="pointer-events-none absolute -top-20 -right-20 h-40 w-40 rounded-full opacity-0 blur-[80px] transition-opacity duration-700 group-hover:opacity-30"
            style={{ backgroundColor: service.color }}
          />

          {/* Coming Soonバッジ */}
          {service.comingSoon && (
            <span className="absolute top-4 right-4 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-bold text-amber-400">
              Coming Soon
            </span>
          )}

          {/* アイコン + サービス名 */}
          <div className="mb-4 flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{
                backgroundColor: `${service.color}15`,
                color: service.color,
              }}
            >
              {service.icon}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{service.name}</h3>
              <p
                className="text-[11px] font-medium"
                style={{ color: service.color }}
              >
                {service.subtitle}
              </p>
            </div>
          </div>

          {/* 説明 */}
          <p className="mb-5 text-[13px] leading-relaxed text-slate-400">
            {service.description}
          </p>

          {/* 機能リスト */}
          <ul className="flex-1 space-y-2.5">
            {service.features.map((f) => (
              <li
                key={f}
                className="flex items-start gap-2 text-[13px] text-slate-500"
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="mt-0.5 h-4 w-4 shrink-0"
                  style={{ color: service.color }}
                >
                  <path
                    fillRule="evenodd"
                    d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                    clipRule="evenodd"
                  />
                </svg>
                {f}
              </li>
            ))}
          </ul>

          {/* CTA */}
          <div
            className="mt-6 flex items-center gap-1.5 text-[13px] font-medium transition-all duration-300 group-hover:gap-3"
            style={{ color: service.color }}
          >
            {service.comingSoon ? "準備中" : "詳しく見る"}
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-1"
            >
              <path
                d="M3 8h10m-4-4 4 4-4 4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </Link>
      </TiltCard>
    </motion.div>
  );
}

/* ================================================================== */
/*  メインコンポーネント                                                */
/* ================================================================== */
export default function HomeClient() {
  const [phase, setPhase] = useState(0);
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.8], [1, 0.95]);

  /* エントリーアニメーションフェーズ */
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 100);
    const t2 = setTimeout(() => setPhase(2), 800);
    const t3 = setTimeout(() => setPhase(3), 2000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <div
      className="min-h-screen bg-[#0a0c10] text-white"
      style={{ fontFeatureSettings: "'palt'" }}
    >
      <GrainOverlay />

      {/* ローディングバー */}
      <div
        className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500"
        style={{
          transform: phase >= 1 ? "scaleX(1)" : "scaleX(0)",
          opacity: phase >= 2 ? 0 : 1,
          transition:
            phase >= 2
              ? "opacity 600ms"
              : "transform 1000ms cubic-bezier(0.16,1,0.3,1)",
        }}
      />

      {/* ═══════════ ヒーロー ═══════════ */}
      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative flex min-h-[100dvh] items-center overflow-hidden"
      >
        {/* グリッドCanvas背景 */}
        <div
          className="absolute inset-0 transition-opacity duration-[2000ms]"
          style={{ opacity: phase >= 2 ? 1 : 0 }}
        >
          <GridCanvas />
        </div>

        {/* グラデーションメッシュ背景 */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-1/4 -left-1/4 h-[600px] w-[600px] rounded-full bg-blue-600/[0.07] blur-[150px]" />
          <div className="absolute -right-1/4 top-1/4 h-[500px] w-[500px] rounded-full bg-cyan-500/[0.05] blur-[150px]" />
          <div className="absolute -bottom-1/4 left-1/3 h-[400px] w-[400px] rounded-full bg-violet-600/[0.04] blur-[150px]" />
        </div>

        {/* ビネット */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 20%, rgba(10,12,16,0.85) 100%)",
          }}
        />

        {/* コンテンツ */}
        <div className="relative z-10 mx-auto w-full max-w-6xl px-6 py-32 text-center md:py-0">
          {/* ロゴ */}
          <div
            className="mx-auto mb-8 flex items-center justify-center gap-3 transition-all duration-700"
            style={{
              opacity: phase >= 2 ? 1 : 0,
              transform: phase >= 2 ? "translateY(0)" : "translateY(16px)",
            }}
          >
            <Image
              src="/icon.png"
              alt="Lオペ"
              width={56}
              height={56}
              className="rounded-xl"
              priority
            />
          </div>

          {/* メインタイトル */}
          <div
            className="transition-all duration-1000"
            style={{
              opacity: phase >= 2 ? 1 : 0,
              transform: phase >= 2 ? "translateY(0)" : "translateY(24px)",
              transitionDelay: "200ms",
            }}
          >
            <h1 className="text-[clamp(3rem,8vw,7rem)] font-black leading-[0.95] tracking-tighter">
              <span className="bg-gradient-to-r from-white via-white to-slate-400 bg-clip-text text-transparent">
                L
              </span>
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                オペ
              </span>
            </h1>
          </div>

          {/* サブタイトル */}
          <div
            className="mt-6 transition-all duration-1000"
            style={{
              opacity: phase >= 2 ? 1 : 0,
              transform: phase >= 2 ? "translateY(0)" : "translateY(16px)",
              transitionDelay: "600ms",
            }}
          >
            <p className="text-[clamp(0.9rem,2vw,1.25rem)] font-medium tracking-widest text-slate-400">
              業種に最適化されたLINE運用プラットフォーム
            </p>
          </div>

          {/* サービスアイコン群 — フローティング */}
          <div
            className="mt-14 flex items-center justify-center gap-5 transition-all duration-1000 sm:gap-8"
            style={{
              opacity: phase >= 3 ? 1 : 0,
              transform: phase >= 3 ? "translateY(0)" : "translateY(20px)",
            }}
          >
            {services.map((s, i) => (
              <motion.div
                key={s.name}
                animate={{ y: [0, -8, 0] }}
                transition={{
                  duration: 3 + i * 0.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.3,
                }}
              >
                <Link
                  href={s.href}
                  className="group flex flex-col items-center gap-2"
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm transition-all duration-300 group-hover:border-transparent sm:h-14 sm:w-14"
                    style={{
                      color: s.color,
                    }}
                  >
                    {s.icon}
                  </div>
                  <span className="text-[10px] font-medium text-slate-500 transition-colors group-hover:text-slate-300 sm:text-[11px]">
                    {s.subtitle}
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* スクロールインジケーター */}
        <div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 transition-all duration-1000"
          style={{ opacity: phase >= 3 ? 0.4 : 0 }}
        >
          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] font-medium tracking-[0.2em] text-slate-600">
              SCROLL
            </span>
            <div className="h-8 w-[1px] overflow-hidden">
              <div
                className="h-full w-full bg-gradient-to-b from-slate-400 to-transparent"
                style={{
                  animation: "scrollDown 2s ease-in-out infinite",
                }}
              />
            </div>
          </div>
        </div>
      </motion.section>

      {/* ═══════════ サービス選択カード ═══════════ */}
      <section className="relative px-6 py-24 md:py-32">
        <MouseGlow />
        <div className="relative mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="mb-16"
          >
            <span className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.3em] text-slate-600">
              <span className="h-px w-8 bg-slate-700" />
              SERVICE LINEUP
            </span>
            <h2 className="mt-4 text-2xl font-black text-white md:text-4xl">
              あなたの業種に合ったプランを
            </h2>
            <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-slate-500">
              LINE公式アカウントの運用に必要な機能を、業種ごとに最適化して提供。
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2">
            {services.map((s, i) => (
              <ServiceCard key={s.name} service={s} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ 数字で見るLオペ ═══════════ */}
      <section className="relative overflow-hidden border-y border-slate-800/40 px-6 py-24 md:py-32">
        {/* 背景グロー */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/[0.03] blur-[150px]" />
        </div>

        <div className="relative mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-16 text-center"
          >
            <span className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.3em] text-slate-600">
              <span className="h-px w-8 bg-slate-700" />
              NUMBERS
              <span className="h-px w-8 bg-slate-700" />
            </span>
            <h2 className="mt-4 text-2xl font-black text-white md:text-4xl">
              数字で見るLオペ
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative rounded-2xl border border-slate-800/60 bg-slate-900/50 p-6 text-center backdrop-blur-sm"
              >
                <div className="text-3xl font-black text-white md:text-4xl">
                  <CountUp
                    to={stat.value}
                    suffix={stat.suffix}
                    decimals={stat.decimals || 0}
                  />
                </div>
                <div className="mt-2 text-[12px] font-medium text-slate-500">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ テクノロジー ═══════════ */}
      <section className="relative px-6 py-24 md:py-32">
        <MouseGlow />
        <div className="relative mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="mb-16"
          >
            <span className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.3em] text-slate-600">
              <span className="h-px w-8 bg-slate-700" />
              TECHNOLOGY
            </span>
            <h2 className="mt-4 text-2xl font-black text-white md:text-4xl">
              プロダクトを支える技術
            </h2>
            <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-slate-500">
              エンジニアリングに妥協しない。信頼性・セキュリティ・パフォーマンスを追求した技術基盤。
            </p>
          </motion.div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {techItems.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  duration: 0.5,
                  delay: i * 0.08,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
              >
                <div className="group relative h-full overflow-hidden rounded-xl border border-slate-800/60 bg-slate-900/50 p-6 transition-all duration-500 hover:border-slate-700">
                  {/* ホバーグロー */}
                  <div className="pointer-events-none absolute -top-10 -right-10 h-24 w-24 rounded-full bg-blue-500/0 blur-[60px] transition-all duration-700 group-hover:bg-blue-500/10" />

                  <div className="mb-4 inline-flex rounded-lg bg-slate-800/50 p-2.5 text-blue-400">
                    {item.icon}
                  </div>
                  <h3 className="mb-2 text-[15px] font-bold text-white">
                    {item.title}
                  </h3>
                  <p className="text-[13px] leading-relaxed text-slate-500">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ フッター ═══════════ */}
      <footer className="border-t border-slate-800/40 bg-[#070810] px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center gap-10 md:flex-row md:items-start md:justify-between">
            {/* ロゴ・運営 */}
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center gap-2.5 md:justify-start">
                <Image
                  src="/icon.png"
                  alt="Lオペ"
                  width={32}
                  height={32}
                  className="rounded-lg"
                />
                <span className="text-lg font-bold text-white">Lオペ</span>
              </div>
              <p className="mt-3 text-[12px] text-slate-600">
                運営:{" "}
                <a
                  href="https://ordix.co.jp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-slate-400"
                >
                  株式会社ORDIX
                </a>
              </p>
            </div>

            {/* サービスリンク */}
            <nav className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-[13px] text-slate-500">
              {services.map((s) => (
                <Link
                  key={s.name}
                  href={s.href}
                  className="transition-colors hover:text-white"
                >
                  {s.name}
                </Link>
              ))}
              <a
                href="https://ordix.co.jp"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-white"
              >
                法人サイト
              </a>
            </nav>
          </div>

          <div className="mt-12 border-t border-slate-800/30 pt-8 text-center text-[11px] text-slate-700">
            &copy; {new Date().getFullYear()} 株式会社ORDIX. All rights
            reserved.
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes scrollDown {
          0% {
            transform: translateY(-100%);
          }
          100% {
            transform: translateY(100%);
          }
        }
      `}</style>
    </div>
  );
}
