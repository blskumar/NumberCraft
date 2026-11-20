'use client';

import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';

interface ConfettiCelebrationProps {
  triggerKey: number;
}

interface ConfettiPiece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  shape: 'rect' | 'circle';
}

const STUDIO_CONFETTI_PALETTE = [
  '#1D4ED8', // Cobalt
  '#047857', // Emerald
  '#D97706', // Ochre
  '#BE123C', // Crimson
  '#3B82F6', // Bright Cobalt
  '#F59E0B', // Warm Brass
];

export default function ConfettiCelebration({
  triggerKey,
}: ConfettiCelebrationProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (triggerKey <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const pieceCount = prefersReducedMotion ? 28 : 96;
    const pieces: ConfettiPiece[] = [];
    const origins = [width * 0.25, width * 0.5, width * 0.75];

    for (let i = 0; i < pieceCount; i++) {
      const originX = origins[i % origins.length] + (Math.random() - 0.5) * 90;
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.35;
      const speed = prefersReducedMotion
        ? 2.5 + Math.random() * 2.5
        : 5.5 + Math.random() * 6.5;

      pieces.push({
        x: originX,
        y: height * 0.28 + (Math.random() - 0.5) * 40,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        size: 5 + Math.random() * 5,
        color: STUDIO_CONFETTI_PALETTE[i % STUDIO_CONFETTI_PALETTE.length],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.18,
        opacity: 1,
        shape: i % 4 === 0 ? 'circle' : 'rect',
      });
    }

    let rafId = 0;
    const startedAt = performance.now();
    const durationMs = prefersReducedMotion ? 1100 : 2600;

    const render = (now: number) => {
      const elapsed = now - startedAt;
      ctx.clearRect(0, 0, width, height);

      const fadeProgress = Math.max(0, (elapsed - durationMs * 0.62) / (durationMs * 0.38));

      for (const p of pieces) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += prefersReducedMotion ? 0.08 : 0.22; // gentle gravity
        p.vx *= 0.988; // subtle air drag
        p.rotation += p.rotationSpeed;
        p.opacity = Math.max(0, 1 - fadeProgress);

        if (p.opacity <= 0.01) continue;

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.52, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.size * 0.6, -p.size * 0.35, p.size * 1.2, p.size * 0.7);
        }
        ctx.restore();
      }

      if (elapsed < durationMs) {
        rafId = window.requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
    };

    rafId = window.requestAnimationFrame(render);
    return () => {
      window.cancelAnimationFrame(rafId);
      ctx.clearRect(0, 0, width, height);
    };
  }, [triggerKey, prefersReducedMotion]);

  if (triggerKey <= 0) return null;

  return (
    <canvas
      ref={canvasRef}
      data-testid="confetti-celebration-canvas"
      data-burst-count={triggerKey}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 h-full w-full"
    />
  );
}
