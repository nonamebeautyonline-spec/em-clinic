"use client";

import { useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════════════════════════════════
   Canvas ネットワークアニメーション
   ノード間を線で結ぶニューラルネットワーク風
   ═══════════════════════════════════════════════════════════════════════════ */

interface Node {
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
}

export default function NetworkCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const nodesRef = useRef<Node[]>([]);
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

    /* ノード初期化 */
    const COUNT = 80;
    const w = () => canvas.offsetWidth;
    const h = () => canvas.offsetHeight;

    if (nodesRef.current.length === 0) {
      nodesRef.current = Array.from({ length: COUNT }, () => ({
        x: Math.random() * w(),
        y: Math.random() * h(),
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 1.5 + 0.5,
      }));
    }
    const nodes = nodesRef.current;

    const onMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    canvas.addEventListener("mousemove", onMouse);

    const CONNECTION_DIST = 150;
    const MOUSE_DIST = 200;

    function draw() {
      if (!ctx) return;
      const cw = w();
      const ch = h();
      ctx.clearRect(0, 0, cw, ch);

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      /* ノード移動 */
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > cw) n.vx *= -1;
        if (n.y < 0 || n.y > ch) n.vy *= -1;
        n.x = Math.max(0, Math.min(cw, n.x));
        n.y = Math.max(0, Math.min(ch, n.y));
      }

      /* コネクション描画 */
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DIST) {
            const alpha = (1 - dist / CONNECTION_DIST) * 0.12;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(59,130,246,${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      /* マウス周辺のノードをハイライト */
      for (const n of nodes) {
        const dx = n.x - mx;
        const dy = n.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);

        /* マウスとの接続線 */
        if (dist < MOUSE_DIST) {
          const alpha = (1 - dist / MOUSE_DIST) * 0.2;
          ctx.beginPath();
          ctx.moveTo(mx, my);
          ctx.lineTo(n.x, n.y);
          ctx.strokeStyle = `rgba(59,130,246,${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }

        /* ノード描画 */
        const isNearMouse = dist < MOUSE_DIST;
        ctx.beginPath();
        ctx.arc(n.x, n.y, isNearMouse ? n.radius * 2 : n.radius, 0, Math.PI * 2);
        ctx.fillStyle = isNearMouse
          ? `rgba(59,130,246,${0.6 - dist / MOUSE_DIST * 0.4})`
          : `rgba(59,130,246,0.15)`;
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
      style={{ opacity: 0.7 }}
    />
  );
}
