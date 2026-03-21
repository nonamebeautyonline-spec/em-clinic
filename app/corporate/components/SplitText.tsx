"use client";

import { useEffect, useRef, useState } from "react";

/*
  SplitText — 1文字ずつ独立してアニメーションするテキスト
  IntersectionObserver でビューポートに入った瞬間にトリガー
  各文字に translateY + opacity + blur のスタガーアニメーション
*/

interface SplitTextProps {
  children: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  delay?: number;
  stagger?: number;
}

export default function SplitText({
  children,
  className = "",
  as: Tag = "h1",
  delay = 0,
  stagger = 30,
}: SplitTextProps) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const chars = children.split("");

  return (
    <Tag ref={ref as React.RefObject<HTMLHeadingElement>} className={className} aria-label={children}>
      {chars.map((char, i) => (
        <span
          key={i}
          className="inline-block transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{
            transitionDelay: visible ? `${delay + i * stagger}ms` : "0ms",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(40px)",
            filter: visible ? "blur(0px)" : "blur(8px)",
          }}
          aria-hidden="true"
        >
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
    </Tag>
  );
}
