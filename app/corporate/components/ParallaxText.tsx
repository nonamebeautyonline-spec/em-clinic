"use client";

import { useEffect, useRef, useState } from "react";

/*
  ParallaxText — スクロール速度に応じて無限ループするマーキー
  スクロール方向でアニメーション速度が変化（velocity-based）
  ユーザーのスクロール操作に物理的に反応する高度なアニメーション
*/

interface ParallaxTextProps {
  children: string;
  className?: string;
  baseVelocity?: number;
}

export default function ParallaxText({
  children,
  className = "",
  baseVelocity = 0.5,
}: ParallaxTextProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const velocity = useRef(baseVelocity);
  const scrollY = useRef(0);
  const prevScrollY = useRef(0);

  useEffect(() => {
    let raf: number;

    const onScroll = () => {
      scrollY.current = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const tick = () => {
      const diff = scrollY.current - prevScrollY.current;
      prevScrollY.current = scrollY.current;

      /* スクロール速度を加味 */
      const scrollVelocity = diff * 0.005;
      velocity.current = baseVelocity + scrollVelocity;

      setOffset((prev) => {
        const next = prev + velocity.current;
        /* テキスト1セット分（50%）でリセット */
        return next % 50;
      });

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [baseVelocity]);

  return (
    <div ref={ref} className={`overflow-hidden whitespace-nowrap ${className}`}>
      <div
        className="inline-block"
        style={{
          transform: `translateX(-${offset}%)`,
          willChange: "transform",
        }}
      >
        {/* 4回繰り返して無限ループに見せる */}
        {Array.from({ length: 4 }).map((_, i) => (
          <span key={i} className="mx-4 inline-block">
            {children}
          </span>
        ))}
      </div>
    </div>
  );
}
