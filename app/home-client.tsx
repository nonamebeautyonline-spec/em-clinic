"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "motion/react";

/* ═══════════════════════════════════════════════════════════════════════════
   Lオペ 統合トップページ — 白ベース + 高技術デザイン
   WebGL パーティクル / カスタムカーソル / 3D チルト / スプリットテキスト
   ═══════════════════════════════════════════════════════════════════════════ */

/* ------------------------------------------------------------------ */
/*  パーティクル Canvas                                                  */
/* ------------------------------------------------------------------ */
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
}

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const particlesRef = useRef<Particle[]>([]);
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

    const COUNT = 60;
    const w = () => canvas.offsetWidth;
    const h = () => canvas.offsetHeight;

    if (particlesRef.current.length === 0) {
      particlesRef.current = Array.from({ length: COUNT }, () => ({
        x: Math.random() * w(),
        y: Math.random() * h(),
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.3 + 0.05,
      }));
    }
    const particles = particlesRef.current;

    const onMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    canvas.addEventListener("mousemove", onMouse);

    const CONNECTION_DIST = 120;
    const MOUSE_DIST = 160;

    function draw() {
      if (!ctx) return;
      const cw = w();
      const ch = h();
      ctx.clearRect(0, 0, cw, ch);

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > cw) p.vx *= -1;
        if (p.y < 0 || p.y > ch) p.vy *= -1;
        p.x = Math.max(0, Math.min(cw, p.x));
        p.y = Math.max(0, Math.min(ch, p.y));
      }

      /* ノード間接続線 */
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DIST) {
            const alpha = (1 - dist / CONNECTION_DIST) * 0.06;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(100,116,139,${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      /* マウス近傍ハイライト */
      for (const p of particles) {
        const dx = p.x - mx;
        const dy = p.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < MOUSE_DIST) {
          const alpha = (1 - dist / MOUSE_DIST) * 0.12;
          ctx.beginPath();
          ctx.moveTo(mx, my);
          ctx.lineTo(p.x, p.y);
          ctx.strokeStyle = `rgba(100,116,139,${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }

        const isNear = dist < MOUSE_DIST;
        ctx.beginPath();
        ctx.arc(p.x, p.y, isNear ? p.radius * 2.5 : p.radius, 0, Math.PI * 2);
        ctx.fillStyle = isNear
          ? `rgba(71,85,105,${0.4 - (dist / MOUSE_DIST) * 0.3})`
          : `rgba(148,163,184,${p.opacity})`;
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    }
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", onMouse);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
    />
  );
}

/* ------------------------------------------------------------------ */
/*  カスタムカーソル（グロー効果）                                         */
/* ------------------------------------------------------------------ */
function GlowCursor() {
  const outerRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -100, y: -100 });
  const target = useRef({ x: -100, y: -100 });
  const hovering = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "ontouchstart" in window) return;

    const onMove = (e: MouseEvent) => {
      target.current = { x: e.clientX, y: e.clientY };
    };
    const onOver = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest("a, button, [data-cursor-hover]");
      hovering.current = !!el;
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseover", onOver);

    let raf: number;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const tick = () => {
      pos.current.x = lerp(pos.current.x, target.current.x, 0.1);
      pos.current.y = lerp(pos.current.y, target.current.y, 0.1);

      if (outerRef.current) {
        const scale = hovering.current ? 2 : 1;
        outerRef.current.style.transform = `translate(${pos.current.x - 24}px, ${pos.current.y - 24}px) scale(${scale})`;
        outerRef.current.style.opacity = hovering.current ? "0.6" : "0.3";
      }
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${target.current.x - 3}px, ${target.current.y - 3}px)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    document.documentElement.style.cursor = "none";

    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      cancelAnimationFrame(raf);
      document.documentElement.style.cursor = "";
    };
  }, []);

  return (
    <>
      <div
        ref={outerRef}
        className="pointer-events-none fixed left-0 top-0 z-[9999] hidden h-12 w-12 rounded-full md:block"
        style={{
          background: "radial-gradient(circle, rgba(100,116,139,0.15) 0%, transparent 70%)",
          transition: "opacity 0.3s, transform 0.4s cubic-bezier(0.23,1,0.32,1)",
        }}
      />
      <div
        ref={dotRef}
        className="pointer-events-none fixed left-0 top-0 z-[9999] hidden h-1.5 w-1.5 rounded-full bg-slate-500 md:block"
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  スプリットテキスト（1文字ずつフェードイン）                                */
/* ------------------------------------------------------------------ */
function SplitText({
  children,
  className = "",
  as: Tag = "h1",
  delay = 0,
  stagger = 40,
}: {
  children: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  delay?: number;
  stagger?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const chars = children.split("");

  return (
    <Tag
      ref={ref as React.RefObject<HTMLHeadingElement>}
      className={className}
      aria-label={children}
    >
      {chars.map((char, i) => (
        <span
          key={i}
          className="inline-block transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{
            transitionDelay: visible ? `${delay + i * stagger}ms` : "0ms",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(30px)",
            filter: visible ? "blur(0px)" : "blur(6px)",
          }}
          aria-hidden="true"
        >
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
    </Tag>
  );
}

/* ------------------------------------------------------------------ */
/*  スクロール連動リビール                                                */
/* ------------------------------------------------------------------ */
function ScrollReveal({
  children,
  delay = 0,
  direction = "up",
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  direction?: "up" | "left" | "right" | "scale";
  className?: string;
}) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setVisible(true);
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const transforms: Record<string, string> = {
    up: "translateY(50px)",
    left: "translateX(-40px)",
    right: "translateX(40px)",
    scale: "scale(0.95)",
  };

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : transforms[direction],
        transition: `opacity 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  3D チルトカード                                                     */
/* ------------------------------------------------------------------ */
function TiltCard({
  children,
  className = "",
  maxTilt = 8,
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
        glareRef.current.style.background = `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(255,255,255,0.25) 0%, transparent 60%)`;
      }
    },
    [maxTilt],
  );

  const handleLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "perspective(800px) rotateX(0) rotateY(0) scale3d(1,1,1)";
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
/*  マウス追従グラデーション背景                                           */
/* ------------------------------------------------------------------ */
function MouseGradient({
  color = "100,116,139",
  size = 600,
  opacity = 0.04,
}: {
  color?: string;
  size?: number;
  opacity?: number;
}) {
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
      current.current.x = lerp(current.current.x, pos.current.x, 0.05);
      current.current.y = lerp(current.current.y, pos.current.y, 0.05);
      if (el) {
        const cx = current.current.x * 100;
        const cy = current.current.y * 100;
        el.style.background = `radial-gradient(${size}px circle at ${cx}% ${cy}%, rgba(${color},${opacity}) 0%, transparent 70%)`;
      }
      raf = requestAnimationFrame(tick);
    };

    el.addEventListener("mousemove", onMove);
    raf = requestAnimationFrame(tick);

    return () => {
      el.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [color, size, opacity]);

  return <div ref={ref} className="pointer-events-none absolute inset-0" />;
}

/* ------------------------------------------------------------------ */
/*  テキストスクランブル                                                  */
/* ------------------------------------------------------------------ */
const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function TextScramble({
  children,
  className = "",
  delay = 0,
}: {
  children: string;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(children);
  const triggered = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !triggered.current) {
          triggered.current = true;
          obs.disconnect();
          setTimeout(() => scramble(), delay);
        }
      },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function scramble() {
    const target = children;
    const len = target.length;
    const resolved = new Array(len).fill(false);
    let frame = 0;

    const tick = () => {
      const arr = target.split("").map((ch, i) => {
        if (resolved[i]) return ch;
        if (ch === " " || ch === "\u3000") return ch;
        return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
      });
      setDisplay(arr.join(""));

      for (let i = 0; i < len; i++) {
        if (!resolved[i] && frame > i * 2 + 4) resolved[i] = true;
      }
      frame++;
      if (resolved.every(Boolean)) {
        setDisplay(target);
      } else {
        setTimeout(tick, 50);
      }
    };
    tick();
  }

  return (
    <span ref={ref} className={`font-mono ${className}`}>
      {display}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  SVGアイコン                                                         */
/* ------------------------------------------------------------------ */
function LineIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
      <path d="M12 2C6.48 2 2 5.82 2 10.5c0 4.21 3.74 7.74 8.79 8.4.34.07.81.23.93.52.1.27.07.68.03.95l-.15.91c-.05.27-.21 1.07.94.58 1.14-.49 6.17-3.63 8.42-6.22C22.86 13.46 22 11.82 22 10.5 22 5.82 17.52 2 12 2zm-3.5 11a.5.5 0 01-.5-.5v-4a.5.5 0 011 0v3.5H10a.5.5 0 010 1H8.5zm2 0a.5.5 0 01-.5-.5v-4a.5.5 0 011 0v4a.5.5 0 01-.5.5zm4 0a.5.5 0 01-.42-.23L12.5 10.6v1.9a.5.5 0 01-1 0v-4a.5.5 0 01.92-.27L14 10.4V8.5a.5.5 0 011 0v4a.5.5 0 01-.5.5zm3-.5a.5.5 0 010 1h-2a.5.5 0 01-.5-.5v-4a.5.5 0 01.5-.5h2a.5.5 0 010 1H16v1h1.5a.5.5 0 010 1H16v1h1.5z" />
    </svg>
  );
}

function ClinicIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
      <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-3 10h-2v2a2 2 0 01-4 0v-2H8a2 2 0 010-4h2V7a2 2 0 014 0v2h2a2 2 0 010 4z" />
    </svg>
  );
}

function SalonIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
      <path d="M9.64 7.64c.23-.5.36-1.05.36-1.64a4 4 0 10-8 0 4 4 0 003.67 3.98L12 16.31l6.33-6.33A4 4 0 0022 6a4 4 0 00-8 0c0 .59.13 1.14.36 1.64L12 10l-2.36-2.36zM6 8a2 2 0 110-4 2 2 0 010 4zm12 0a2 2 0 110-4 2 2 0 010 4zM12 14l-1.41-1.41L12 11.17l1.41 1.42L12 14zm-4.29 3.29a1.5 1.5 0 10-2.12 2.12 1.5 1.5 0 002.12-2.12zm6.58 0l2.12 2.12a1.5 1.5 0 002.12-2.12l-2.12-2.12L14.29 17.29z" />
    </svg>
  );
}

function EcIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
      <path d="M18 6h-2c0-2.21-1.79-4-4-4S8 3.79 8 6H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-2c1.1 0 2 .9 2 2h-4c0-1.1.9-2 2-2zm6 16H6V8h2v2c0 .55.45 1 1 1s1-.45 1-1V8h4v2c0 .55.45 1 1 1s1-.45 1-1V8h2v12z" />
    </svg>
  );
}

function IndustryIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 20h20M5 20V8l5 3V8l5 3V4h4v16" />
    </svg>
  );
}

function BrainIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2a7 7 0 017 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 01-2 2h-4a2 2 0 01-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 017-7z" />
      <path d="M9 22h6M10 17v-3.34M14 17v-3.34" />
    </svg>
  );
}

function ShieldIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  サービスデータ                                                      */
/* ------------------------------------------------------------------ */
type Service = {
  key: string;
  name: string;
  subtitle: string;
  href: string;
  color: string;
  description: string;
  features: string[];
  comingSoon?: boolean;
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
};

const services: Service[] = [
  {
    key: "line",
    name: "Lオペ for LINE",
    subtitle: "LINE運用プラットフォーム",
    href: "/line/",
    color: "#06C755",
    description: "あらゆる業種のLINE公式アカウント運用を、ひとつの管理画面で。",
    features: ["届けたい人だけに配信", "タップで予約完了", "返信を自動で下書き"],
    Icon: LineIcon,
  },
  {
    key: "clinic",
    name: "Lオペ for CLINIC",
    subtitle: "クリニック特化",
    href: "/clinic/",
    color: "#3b82f6",
    description: "予約・問診・カルテ・決済をLINEに集約。月60時間の事務作業を削減。",
    features: ["LINEで問診を完結", "返信を自動で下書き", "処方・配送まで一気通貫"],
    Icon: ClinicIcon,
  },
  {
    key: "salon",
    name: "Lオペ for SALON",
    subtitle: "サロン特化",
    href: "/salon/",
    color: "#ec4899",
    description: "施術者ごとの予約管理とリマインドで、リピート率を最大化。",
    features: ["LINEからそのまま予約", "施術履歴を自動で記録", "来店後にクーポン配信"],
    comingSoon: true,
    Icon: SalonIcon,
  },
  {
    key: "ec",
    name: "Lオペ for EC",
    subtitle: "EC・小売特化",
    href: "/ec/",
    color: "#8B7355",
    description: "購買データと連動した配信で、LTVを引き上げる。",
    features: ["購入後に自動フォロー", "カゴ落ちをリマインド", "売上レポートを自動生成"],
    comingSoon: true,
    Icon: EcIcon,
  },
];

/* ------------------------------------------------------------------ */
/*  特徴データ                                                          */
/* ------------------------------------------------------------------ */
const features = [
  {
    Icon: IndustryIcon,
    title: "業種別に最適化",
    description:
      "汎用ツールでは対応しきれない業種固有の業務フローに合わせて設計。導入初日から成果につながる。",
    number: "01",
  },
  {
    Icon: BrainIcon,
    title: "運用するほど賢くなる",
    description:
      "スタッフの修正内容から自動で学習し、返信精度が日々向上。運用するほど業務負荷が下がる。",
    number: "02",
  },
  {
    Icon: ShieldIcon,
    title: "医療レベルのセキュリティ",
    description:
      "暗号化・監査ログ・アクセス制御を標準搭載。個人情報を扱う業種でも安心して運用できる。",
    number: "03",
  },
];

/* ------------------------------------------------------------------ */
/*  サービスカード（3D チルト付き）                                       */
/* ------------------------------------------------------------------ */
function ServiceCard({ service, index }: { service: Service; index: number }) {
  const { Icon } = service;
  return (
    <ScrollReveal delay={index * 120}>
      <TiltCard className="h-full rounded-2xl" maxTilt={6}>
        <a
          href={service.href}
          className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-shadow duration-500 hover:shadow-xl hover:shadow-slate-200/50"
          data-cursor-hover
        >
          {/* 上端テーマカラーライン */}
          <div className="h-[2px]" style={{ backgroundColor: service.color }} />

          {/* Coming Soonバッジ */}
          {service.comingSoon && (
            <span className="absolute top-5 right-5 z-10 rounded-full border border-slate-200 bg-white/90 px-3 py-0.5 text-[10px] font-medium tracking-wide text-slate-400 backdrop-blur-sm">
              Coming Soon
            </span>
          )}

          <div className="flex flex-1 flex-col p-7 md:p-8">
            {/* アイコン + サービス名 */}
            <div className="mb-5 flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${service.color}10` }}
              >
                <Icon className="h-5 w-5" style={{ color: service.color }} />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-slate-900">{service.name}</h3>
                <p className="text-[11px] font-medium text-slate-400">{service.subtitle}</p>
              </div>
            </div>

            {/* 説明 */}
            <p className="mb-5 text-[13px] leading-relaxed text-slate-500">
              {service.description}
            </p>

            {/* 機能リスト */}
            <ul className="flex-1 space-y-2.5">
              {service.features.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-[13px] text-slate-600">
                  <span
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${service.color}15` }}
                  >
                    <svg viewBox="0 0 12 12" fill="none" className="h-2.5 w-2.5" style={{ color: service.color }}>
                      <path d="M3 6l2.5 2.5L9 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  {f}
                </li>
              ))}
            </ul>

            {/* CTA */}
            <div className="mt-6 flex items-center gap-1.5 text-[13px] font-medium text-slate-400 transition-all duration-300 group-hover:gap-3 group-hover:text-slate-700">
              {service.comingSoon ? "準備中" : "詳しく見る"}
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-1">
                <path d="M3 8h10m-4-4 4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </a>
      </TiltCard>
    </ScrollReveal>
  );
}

/* ================================================================== */
/*  メインコンポーネント                                                */
/* ================================================================== */
export default function HomeClient() {
  const [phase, setPhase] = useState(0);

  /* パララックス用スクロール */
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroParallax = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  /* 特徴セクションのパララックス */
  const featuresRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: featuresProgress } = useScroll({
    target: featuresRef,
    offset: ["start end", "end start"],
  });
  const featuresParallax = useTransform(featuresProgress, [0, 1], [40, -40]);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 100);
    const t2 = setTimeout(() => setPhase(2), 600);
    const t3 = setTimeout(() => setPhase(3), 2500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <div
      className="min-h-screen bg-white text-slate-900"
      style={{ fontFeatureSettings: "'palt'" }}
    >
      {/* カスタムカーソル */}
      <GlowCursor />

      {/* ローディングバー */}
      <div
        className="fixed inset-x-0 top-0 z-[60] h-[1px] origin-left bg-slate-400"
        style={{
          transform: phase >= 1 ? "scaleX(1)" : "scaleX(0)",
          opacity: phase >= 2 ? 0 : 0.6,
          transition: phase >= 2 ? "opacity 600ms" : "transform 500ms cubic-bezier(0.16,1,0.3,1)",
        }}
      />

      {/* ═══════════ ヒーロー ═══════════ */}
      <section ref={heroRef} className="relative flex min-h-[100dvh] items-center overflow-hidden">
        {/* パーティクル Canvas */}
        <div
          className="absolute inset-0 transition-opacity duration-[2000ms]"
          style={{ opacity: phase >= 2 ? 0.7 : 0 }}
        >
          <ParticleCanvas />
        </div>

        {/* ビネット（白ベース） */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 70% 60% at 50% 50%, transparent 30%, rgba(255,255,255,0.95) 100%)",
          }}
        />

        {/* パララックスコンテンツ */}
        <motion.div
          className="relative z-10 mx-auto w-full max-w-4xl px-6 py-32 text-center md:py-0"
          style={{ y: heroParallax, opacity: heroOpacity }}
        >
          {/* ロゴ + サービス名（同じ行） */}
          <div
            className="mb-10 flex items-center justify-center gap-4 transition-all duration-700"
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
              className="rounded-2xl"
              priority
            />
            <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 md:text-6xl">
              Lオペ
            </h1>
          </div>

          {/* キャッチコピー（1文字ずつ） */}
          <div style={{ opacity: phase >= 2 ? 1 : 0, transition: "opacity 0.1s", transitionDelay: "400ms" }}>
            <SplitText
              as="h2"
              delay={0}
              stagger={50}
              className="text-[clamp(1.6rem,4.5vw,3rem)] font-bold leading-[1.4] tracking-tight text-slate-800"
            >
              業種に最適化された
            </SplitText>
            <SplitText
              as="h2"
              delay={500}
              stagger={50}
              className="text-[clamp(1.6rem,4.5vw,3rem)] font-bold leading-[1.4] tracking-tight text-slate-800"
            >
              LINE運用プラットフォーム
            </SplitText>
          </div>

          {/* サブテキスト（スクランブル） */}
          <div
            className="mt-8 transition-all duration-1000"
            style={{
              opacity: phase >= 2 ? 1 : 0,
              transitionDelay: "1200ms",
            }}
          >
            <TextScramble
              className="text-[12px] tracking-[0.25em] text-slate-400"
              delay={800}
            >
              CLINIC / SALON / EC / LINE
            </TextScramble>
          </div>

          {/* サービスアイコンナビ */}
          <div className="mt-12 flex items-center justify-center gap-6 sm:gap-10">
            {[
              { label: "LINE", color: "#06C755", Icon: LineIcon },
              { label: "CLINIC", color: "#3b82f6", Icon: ClinicIcon },
              { label: "SALON", color: "#ec4899", Icon: SalonIcon },
              { label: "EC", color: "#8B7355", Icon: EcIcon },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                animate={phase >= 2 ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 1.4 + i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center gap-2"
              >
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full transition-transform duration-300 hover:scale-110 sm:h-14 sm:w-14"
                  style={{ backgroundColor: `${item.color}0D` }}
                  data-cursor-hover
                >
                  <item.Icon className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: item.color }} />
                </div>
                <span
                  className="text-[10px] font-bold tracking-wider sm:text-[11px]"
                  style={{ color: item.color }}
                >
                  {item.label}
                </span>
              </motion.div>
            ))}
          </div>

          {/* スクロールインジケーター */}
          <div
            className="mt-20 transition-all duration-1000"
            style={{ opacity: phase >= 3 ? 0.3 : 0 }}
          >
            <div className="mx-auto h-12 w-[1px] overflow-hidden">
              <div
                className="h-full w-full bg-slate-400"
                style={{ animation: "scrollPulse 2s ease-in-out infinite" }}
              />
            </div>
          </div>
        </motion.div>
      </section>

      {/* ═══════════ サービスカード ═══════════ */}
      <section className="relative bg-slate-50/60 px-6 py-24 md:py-32">
        <MouseGradient color="100,116,139" size={800} opacity={0.03} />
        <div className="relative mx-auto max-w-5xl">
          <ScrollReveal direction="left" className="mb-16">
            <span className="inline-flex items-center gap-3 text-[11px] font-medium tracking-[0.3em] text-slate-400">
              <span className="h-px w-8 bg-slate-300" />
              SERVICES
            </span>
            <h2 className="mt-4 text-2xl font-bold text-slate-900 md:text-3xl">
              あなたの業種に合ったプランを
            </h2>
          </ScrollReveal>

          <div className="grid gap-6 md:grid-cols-2">
            {services.map((s, i) => (
              <ServiceCard key={s.key} service={s} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ 特徴セクション ═══════════ */}
      <section ref={featuresRef} className="relative overflow-hidden bg-white px-6 py-24 md:py-32">
        <MouseGradient color="100,116,139" size={700} opacity={0.03} />
        <div className="relative mx-auto max-w-5xl">
          <ScrollReveal direction="left" className="mb-16">
            <span className="inline-flex items-center gap-3 text-[11px] font-medium tracking-[0.3em] text-slate-400">
              <span className="h-px w-8 bg-slate-300" />
              WHY L-OPE
            </span>
            <h2 className="mt-4 text-2xl font-bold text-slate-900 md:text-3xl">
              選ばれる理由
            </h2>
          </ScrollReveal>

          <motion.div style={{ y: featuresParallax }}>
            <div className="grid gap-16 md:grid-cols-3 md:gap-10">
              {features.map((item, i) => (
                <ScrollReveal key={item.title} delay={i * 150}>
                  <div className="group">
                    {/* 番号 */}
                    <TextScramble
                      className="text-[48px] font-black leading-none text-slate-100 md:text-[56px]"
                      delay={i * 200}
                    >
                      {item.number}
                    </TextScramble>
                    {/* 区切り線 */}
                    <div className="mt-4 h-px w-12 bg-slate-200 transition-all duration-500 group-hover:w-20 group-hover:bg-slate-400" />
                    {/* アイコン */}
                    <div className="mt-6 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 transition-colors duration-300 group-hover:bg-slate-200">
                      <item.Icon className="h-5 w-5 text-slate-500" />
                    </div>
                    <h3 className="mt-5 text-[16px] font-bold text-slate-900">{item.title}</h3>
                    <p className="mt-3 text-[14px] leading-relaxed text-slate-400">
                      {item.description}
                    </p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </motion.div>
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
                <span className="text-[15px] font-bold text-slate-900">Lオペ</span>
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
                <a key={s.key} href={s.href} className="transition-colors hover:text-slate-700">
                  {s.name}
                </a>
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

          {/* パートナー募集 */}
          <div className="mt-8 border-t border-slate-200 pt-6 text-center">
            <p className="text-[12px] font-semibold text-slate-500">連携・代理店パートナー募集</p>
            <p className="mt-1 text-[11px] text-slate-400">
              Lオペとの連携・代理店についてのご相談は
              <a href="mailto:partner@l-ope.jp" className="ml-1 text-slate-600 underline transition-colors hover:text-slate-900">
                partner@l-ope.jp
              </a>
              までお問い合わせください。
            </p>
          </div>

          <div className="mt-12 border-t border-slate-200 pt-8 text-center text-[11px] text-slate-400">
            &copy; {new Date().getFullYear()} 株式会社ORDIX. All rights reserved.
          </div>
        </div>
      </footer>

      {/* アニメーション用キーフレーム */}
      <style jsx>{`
        @keyframes scrollPulse {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
      `}</style>
    </div>
  );
}
