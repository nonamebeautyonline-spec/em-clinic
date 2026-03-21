"use client";

import { useEffect, useRef } from "react";

/* カスタムカーソル — リンクホバーで拡大 */

export default function CustomCursor() {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -100, y: -100 });
  const target = useRef({ x: -100, y: -100 });
  const hovering = useRef(false);

  useEffect(() => {
    /* タッチデバイスでは非表示 */
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
      pos.current.x = lerp(pos.current.x, target.current.x, 0.12);
      pos.current.y = lerp(pos.current.y, target.current.y, 0.12);

      if (outerRef.current) {
        outerRef.current.style.transform = `translate(${pos.current.x - 20}px, ${pos.current.y - 20}px) scale(${hovering.current ? 1.8 : 1})`;
      }
      if (innerRef.current) {
        innerRef.current.style.transform = `translate(${target.current.x - 4}px, ${target.current.y - 4}px)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    /* デフォルトカーソル非表示 */
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
        className="pointer-events-none fixed left-0 top-0 z-[9999] hidden h-10 w-10 rounded-full border border-blue-400/30 mix-blend-difference transition-[transform] duration-300 ease-out md:block"
      />
      <div
        ref={innerRef}
        className="pointer-events-none fixed left-0 top-0 z-[9999] hidden h-2 w-2 rounded-full bg-white mix-blend-difference md:block"
      />
    </>
  );
}
