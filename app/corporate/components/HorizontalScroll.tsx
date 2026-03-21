"use client";

import { useRef, useEffect, useState } from "react";

/*
  HorizontalScroll — 縦スクロールに応じてコンテナが横にスクロールする
  sticky + scrollY ベースの translateX 制御
  パネル数に応じて必要な縦スクロール量を自動計算
*/

interface HorizontalScrollProps {
  children: React.ReactNode;
  className?: string;
}

export default function HorizontalScroll({ children, className = "" }: HorizontalScrollProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [translateX, setTranslateX] = useState(0);
  const [sectionHeight, setSectionHeight] = useState("100vh");

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    const calc = () => {
      const overflow = track.scrollWidth - window.innerWidth;
      setSectionHeight(`${overflow + window.innerHeight}px`);
    };
    calc();
    window.addEventListener("resize", calc);

    const onScroll = () => {
      if (!section || !track) return;
      const rect = section.getBoundingClientRect();
      const sectionH = section.offsetHeight - window.innerHeight;
      if (sectionH <= 0) return;
      const progress = Math.max(0, Math.min(1, -rect.top / sectionH));
      const overflow = track.scrollWidth - window.innerWidth;
      setTranslateX(-progress * overflow);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", calc);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className={className}
      style={{ height: sectionHeight }}
    >
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <div
          ref={trackRef}
          className="flex items-center gap-8 px-6 md:px-16"
          style={{
            transform: `translateX(${translateX}px)`,
            willChange: "transform",
          }}
        >
          {children}
        </div>
      </div>
    </section>
  );
}
