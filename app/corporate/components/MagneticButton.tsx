"use client";

import { useRef, useCallback } from "react";

/*
  MagneticButton — マウスがボタンに近づくと引き寄せられるように移動
  ボタン中心からのマウスオフセットを計算し、transform で追従
  離れると元の位置にスプリングバック
*/

interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  href?: string;
  strength?: number;
  onClick?: () => void;
}

export default function MagneticButton({
  children,
  className = "",
  href,
  strength = 0.3,
  onClick,
}: MagneticButtonProps) {
  const ref = useRef<HTMLElement>(null);

  const handleMove = useCallback(
    (e: React.MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) * strength;
      const dy = (e.clientY - cy) * strength;
      el.style.transform = `translate(${dx}px, ${dy}px)`;
    },
    [strength]
  );

  const handleLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "translate(0, 0)";
  }, []);

  const props = {
    ref: ref as React.RefObject<HTMLAnchorElement>,
    className: `inline-block transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${className}`,
    onMouseMove: handleMove,
    onMouseLeave: handleLeave,
    "data-cursor-hover": true,
  };

  if (href) {
    return (
      <a {...props} href={href}>
        {children}
      </a>
    );
  }
  return (
    <button {...props} type="button" onClick={onClick}>
      {children}
    </button>
  );
}
