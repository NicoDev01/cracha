"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/dashboard/context/ThemeContext";

/**
 * IMAGINATION – Disintegrating Typography (Canvas + React)
 * --------------------------------------------------------
 * Fix: particles were filling the whole canvas because we sampled alpha from
 * a background-filled canvas. Now we draw the text onto an OFFSCREEN canvas
 * with a transparent background and sample its alpha map only. The main
 * canvas only renders the background + particles, so particles exist *only*
 * where the text is.
 */

export default function ImaginationCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef(0);
  const [fontSize, setFontSize] = useState(180); // adjusted on resize as needed
  const { theme } = useTheme();

interface Particle {
  x: number;
  y: number;
  ox: number;
  oy: number;
  vx: number;
  vy: number;
  life: number;
  r: number;
}

  // Internal state kept outside of React to stay fast
  const stateRef = useRef({
    particles: [] as Array<Particle>,
    pointer: { x: -9999, y: -9999 },
    gap: 6, // pixel sampling step (lower = more particles)
    radius: 90, // interaction radius in CSS pixels
    strength: 1.9, // push force multiplier
    dpr: 1,
  });

  useEffect(() => {
    const canvas = canvasRef.current!;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Offscreen canvas used to rasterize the text ONLY (transparent background)
    const off = document.createElement("canvas");
    const offCtx = off.getContext("2d")!;

    const state = stateRef.current;


    // High-DPI / Retina friendly sizing
    const resize = () => {
      const parent = canvas.parentElement as HTMLElement | null;
      const cssW = parent?.clientWidth || window.innerWidth;
      const cssH = parent?.clientHeight || window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      state.dpr = dpr;

      // Main canvas runs in CSS pixels via transform
      canvas.width = Math.max(1, Math.floor(cssW * dpr));
      canvas.height = Math.max(1, Math.floor(cssH * dpr));
      canvas.style.width = cssW + "px";
      canvas.style.height = cssH + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels

      // Offscreen canvas works directly in CSS pixels (no transform)
      off.width = Math.max(1, cssW);
      off.height = Math.max(1, cssH);

      // scale font to fit nicely in the container
      const basis = Math.min(cssW, cssH);
      setFontSize(Math.max(250, Math.floor(basis * 0.7)));

      buildParticles();
    };

    const getTextAlpha = () => {
      const w = off.width;
      const h = off.height;
      offCtx.clearRect(0, 0, w, h);

      offCtx.save();
      offCtx.textAlign = "center";
      offCtx.textBaseline = "middle";
      offCtx.font = `900 ${fontSize}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, Noto Sans, sans-serif`;
      offCtx.fillStyle = "#000";

      // Subtle fuzzy edge like the reference image (applied to text only)
      // Use a theme-aware shadow to avoid overly dark edges in dark mode
      offCtx.shadowColor = theme === "dark" ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.35)";
      offCtx.shadowBlur = 22;

      const cx = w / 2;
      const cy = h / 2;

      offCtx.fillText("CraCha", cx, cy);
      offCtx.restore();

      const img = offCtx.getImageData(0, 0, w, h); // transparent bg
      return img; // { data, width, height }
    };

    const buildParticles = () => {
      const img = getTextAlpha();
      const data = img.data;
      const w = img.width;
      const h = img.height;
      const gap = state.gap;
      const particles: Array<Particle> = [];

      for (let y = 0; y < h; y += gap) {
        for (let x = 0; x < w; x += gap) {
          const idx = (y * w + x) * 4 + 3; // alpha channel
          // Only place particles where the text exists (alpha from text)
          if (data[idx] > 90) {
            particles.push({
              x,
              y,
              ox: x,
              oy: y,
              vx: 0,
              vy: 0,
              life: 0,
              r: (gap * 0.85) / 2,
            });
          }
        }
      }
      state.particles = particles;
    };

    const update = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      // Clear canvas with transparent background
      ctx.clearRect(0, 0, w, h);

      const { particles, pointer, radius, strength } = state;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Repel from pointer (disintegrate)
        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;
        const distSq = dx * dx + dy * dy;
        const rad = radius;

        const radSq = rad * rad;
        if (distSq < radSq) {
          const dist = Math.sqrt(distSq); // sqrt is needed here, but only when interacting
          const force = ((rad - dist) / rad) * strength;
          const f_x = (dx / dist) * force;
          const f_y = (dy / dist) * force;
          p.vx += f_x;
          p.vy += f_y;
          p.life = (22 + Math.random() * 30) | 0;
        }

        // Spring back to original position
        const spring = 0.055;
        const friction = 0.9;
        p.vx += (p.ox - p.x) * spring;
        p.vy += (p.oy - p.y) * spring;
        p.vx *= friction;
        p.vy *= friction;
        p.x += p.vx;
        p.y += p.vy;

        // Draw particle
        const alpha = p.life > 0 ? 0.7 : 1;
        if (p.life > 0) p.life -= 1;

        ctx.beginPath();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#8b5cf6"; // Standardfarbe, falls Gradient nicht funktioniert
        // Hier müsste der globale Gradient verwendet werden, aber da wir ihn nicht global definieren können,
        // verwenden wir eine feste Farbe oder einen einfacheren Gradienten, der einmalig erstellt wird.
        // Für den Moment verwenden wir eine feste Farbe, um die Performance zu verbessern.
        // Eine bessere Lösung wäre, den Gradienten einmalig zu erstellen und dann zu verwenden.
        // Da der Canvas-Kontext keine globalen Gradienten unterstützt, die auf alle Partikel angewendet werden,
        // müssen wir entweder eine feste Farbe verwenden oder den Gradienten pro Partikel erstellen,
        // was zu Performance-Problemen führt.
        // Ich werde eine feste Farbe verwenden, um die Performance zu verbessern.
        // Wenn ein Gradient unbedingt erforderlich ist, müsste eine andere Rendering-Strategie gewählt werden.
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      if (running) rafRef.current = requestAnimationFrame(update);
    };

    // Pointer events
    const getPos = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      return { x, y };
    };

    const onMove = (e: PointerEvent) => {
      const { x, y } = getPos(e);
      state.pointer.x = x;
      state.pointer.y = y;
    };
    const onLeave = () => {
      state.pointer.x = -9999;
      state.pointer.y = -9999;
    };

    // The canvas sits at the very end of the page, and below md it is not
    // shown at all. Drawing thousands of particles every frame regardless kept
    // the main thread busy from the first second of every visit — on a phone
    // for a full-window canvas nobody could see. The loop now runs only while
    // the canvas is on screen; an element with display:none never is.
    let running = false;
    let built = false;
    const start = () => {
      if (running) return;
      running = true;
      if (!built) {
        built = true;
        resize();
      }
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(update);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
    const onResize = () => {
      if (built) resize();
    };

    const visibility =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) start();
            else stop();
          });
    if (visibility) visibility.observe(canvas);
    else start();

    // Listeners
    window.addEventListener("resize", onResize);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onMove);
    canvas.addEventListener("pointerleave", onLeave);

    // Cleanup
    return () => {
      visibility?.disconnect();
      stop();
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontSize, theme]);

  return (
    <div className="relative h-full w-full">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
