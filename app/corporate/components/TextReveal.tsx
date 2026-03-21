"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/* 行ごとにクリップマスクで下から出現するテキストアニメーション */

export default function TextReveal({
  children,
  delay = 0,
  as: Tag = "div",
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  as?: "div" | "h1" | "h2" | "p" | "span";
  className?: string;
}) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="overflow-hidden">
      <Tag
        className={className}
        style={{
          transform: visible ? "translateY(0)" : "translateY(105%)",
          opacity: visible ? 1 : 0,
          transition: `transform 1.2s cubic-bezier(0.16,1,0.3,1) ${delay}ms, opacity 0.8s ease ${delay}ms`,
        }}
      >
        {children}
      </Tag>
    </div>
  );
}
