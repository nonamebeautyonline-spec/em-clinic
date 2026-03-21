"use client";

import { useEffect, useRef } from "react";

/*
  MouseGradient — マウス位置を追従する radial-gradient スポットライト
  requestAnimationFrame + lerp で滑らかに追従
  セクション単位で配置して背景エフェクトとして使用
*/

interface MouseGradientProps {
  className?: string;
  color?: string;
  size?: number;
  opacity?: number;
}

export default function MouseGradient({
  className = "",
  color = "59,130,246",
  size = 600,
  opacity = 0.07,
}: MouseGradientProps) {
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

  return (
    <div
      ref={ref}
      className={`pointer-events-none absolute inset-0 ${className}`}
    />
  );
}
