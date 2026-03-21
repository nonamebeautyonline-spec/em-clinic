"use client";

import { useEffect, useRef, useState } from "react";

/*
  TextScramble — ランダム文字をシャッフルしながら最終テキストにデコードされるエフェクト
  IntersectionObserver でトリガー
  各文字が独立してランダム→正解へ遷移（フレーム単位の制御）
*/

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&";

interface TextScrambleProps {
  children: string;
  className?: string;
  as?: "h2" | "h3" | "p" | "span";
  delay?: number;
  speed?: number;
}

export default function TextScramble({
  children,
  className = "",
  as: Tag = "span",
  delay = 0,
  speed = 50,
}: TextScrambleProps) {
  const ref = useRef<HTMLElement>(null);
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
      { threshold: 0.5 }
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
        if (ch === " " || ch === "　") return ch;
        return CHARS[Math.floor(Math.random() * CHARS.length)];
      });
      setDisplay(arr.join(""));

      /* 各文字をフレーム数に応じて順番に確定 */
      for (let i = 0; i < len; i++) {
        if (!resolved[i] && frame > i * 2 + 4) {
          resolved[i] = true;
        }
      }

      frame++;
      if (resolved.every(Boolean)) {
        setDisplay(target);
      } else {
        setTimeout(tick, speed);
      }
    };
    tick();
  }

  return (
    <Tag
      ref={ref as React.RefObject<HTMLHeadingElement>}
      className={`font-mono ${className}`}
    >
      {display}
    </Tag>
  );
}
