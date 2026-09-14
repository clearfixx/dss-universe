"use client";

import { useEffect, useRef } from "react";

/** Procedural depth-projected geometry; no textures, network or per-frame React updates. */
export function CoreSphere({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let visible = true;
    let size = 600;
    let rotation = 0;
    let previous = 0;
    const pointer = { x: 0, y: 0 };
    const points = Array.from({ length: 180 }, (_, i) => {
      const y = 1 - (i / 179) * 2;
      const radius = Math.sqrt(1 - y * y);
      const angle = i * Math.PI * (3 - Math.sqrt(5));
      return { x: Math.cos(angle) * radius, y, z: Math.sin(angle) * radius };
    });
    const edges: [number, number][] = [];
    points.forEach((a, i) =>
      points.slice(i + 1).forEach((b, offset) => {
        if (Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) < 0.36)
          edges.push([i, i + offset + 1]);
      }),
    );
    function draw(now: number) {
      if (!ctx || !canvas) return;
      const delta = previous ? Math.min(now - previous, 50) : 0;
      previous = now;
      if (!motion.matches)
        rotation += delta * (activeRef.current ? 0.00022 : 0.000055);
      ctx.clearRect(0, 0, size, size);
      const center = size / 2;
      const radius = size * 0.34;
      const angle = rotation + pointer.x * 0.12;
      const project = (x: number, y: number, z: number) => {
        const rx = x * Math.cos(angle) + z * Math.sin(angle);
        const rz = z * Math.cos(angle) - x * Math.sin(angle);
        const tilt = 0.22 + pointer.y * 0.1;
        const ry = y * Math.cos(tilt) - rz * Math.sin(tilt);
        const depth = y * Math.sin(tilt) + rz * Math.cos(tilt);
        const perspective = 3.8 / (3.8 - depth);
        return {
          x: center + rx * radius * perspective,
          y: center + ry * radius * perspective,
          z: depth,
        };
      };
      const glow = ctx.createRadialGradient(
        center,
        center,
        0,
        center,
        center,
        size * 0.48,
      );
      glow.addColorStop(0, activeRef.current ? "#643ee866" : "#0065f04a");
      glow.addColorStop(0.3, "#172ca521");
      glow.addColorStop(1, "#02040b00");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, size, size);
      for (let i = 0; i < 95; i++) {
        const x = (((i * 137.508) % 100) / 100) * size;
        const y = (((i * 73.791) % 100) / 100) * size;
        ctx.fillStyle = `rgba(103,163,255,${0.15 + (i % 5) * 0.1})`;
        ctx.fillRect(x, y, i % 7 === 0 ? 1.6 : 0.8, 0.8);
      }
      const projected = points.map((p) => project(p.x, p.y, p.z));
      ctx.lineWidth = 0.6;
      edges.forEach(([a, b]) => {
        const p = projected[a]!;
        const q = projected[b]!;
        ctx.strokeStyle = `rgba(63,116,255,${0.07 + ((p.z + q.z + 2) / 4) * 0.34})`;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.stroke();
      });
      for (let orbit = 0; orbit < 9; orbit++) {
        ctx.beginPath();
        for (let step = 0; step <= 160; step++) {
          const t = (step / 160) * Math.PI * 2;
          const tilt = orbit * 0.43;
          const p = project(
            Math.cos(t) * 1.08,
            Math.sin(t) * Math.cos(tilt) * 1.08,
            Math.sin(t) * Math.sin(tilt) * 1.08,
          );
          if (step === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = orbit % 2 ? "#8957ff3b" : "#248fff40";
        ctx.stroke();
      }
      projected
        .sort((a, b) => a.z - b.z)
        .forEach((p, i) => {
          const bright = (p.z + 1) / 2;
          ctx.shadowBlur = bright > 0.6 ? 12 : 0;
          ctx.shadowColor = i % 4 === 0 ? "#a570ff" : "#278cff";
          ctx.fillStyle =
            i % 4 === 0
              ? `rgba(181,141,255,${0.3 + bright * 0.7})`
              : `rgba(124,205,255,${0.3 + bright * 0.7})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 0.7 + bright * 1.8, 0, Math.PI * 2);
          ctx.fill();
        });
      ctx.shadowBlur = 0;
      // Small lens flares retain crisp luminous centers at every display scale.
      projected
        .filter((p, i) => p.z > 0.3 && i % 9 === 0)
        .forEach((p) => {
          const flare = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 17);
          flare.addColorStop(0, "#e1faffee");
          flare.addColorStop(0.12, "#65bbffcc");
          flare.addColorStop(0.4, "#446aff55");
          flare.addColorStop(1, "#456aff00");
          ctx.fillStyle = flare;
          ctx.fillRect(p.x - 17, p.y - 17, 34, 34);
          ctx.strokeStyle = "#a6d8ff66";
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(p.x - 9, p.y);
          ctx.lineTo(p.x + 9, p.y);
          ctx.moveTo(p.x, p.y - 9);
          ctx.lineTo(p.x, p.y + 9);
          ctx.stroke();
        });
      const pulse = motion.matches ? 1 : 1 + Math.sin(now * 0.0018) * 0.09;
      const core = ctx.createRadialGradient(
        center,
        center,
        0,
        center,
        center,
        radius * 0.32 * pulse,
      );
      core.addColorStop(0, "#ffffff");
      core.addColorStop(0.08, "#d5faff");
      core.addColorStop(0.22, "#4bcaffdd");
      core.addColorStop(0.5, "#4464ff55");
      core.addColorStop(1, "#604aff00");
      ctx.fillStyle = core;
      ctx.fillRect(0, 0, size, size);
      for (let i = 1; i < 5; i++) {
        ctx.strokeStyle = `rgba(121,187,255,${0.6 - i * 0.1})`;
        ctx.beginPath();
        ctx.ellipse(
          center,
          center,
          radius * i * 0.065 * pulse,
          radius * i * 0.09 * pulse,
          rotation + i,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      }
      if (visible && !document.hidden && !motion.matches)
        frame = requestAnimationFrame(draw);
    }
    const restart = () => {
      cancelAnimationFrame(frame);
      previous = 0;
      if (visible && !document.hidden) frame = requestAnimationFrame(draw);
    };
    const resize = new ResizeObserver(([entry]) => {
      if (!entry) return;
      size = entry.contentRect.width;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      restart();
    });
    const intersection = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      restart();
    });
    const move = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = (event.clientX - rect.left) / rect.width - 0.5;
      pointer.y = (event.clientY - rect.top) / rect.height - 0.5;
    };
    resize.observe(canvas);
    intersection.observe(canvas);
    canvas.addEventListener("pointermove", move);
    document.addEventListener("visibilitychange", restart);
    motion.addEventListener("change", restart);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      intersection.disconnect();
      canvas.removeEventListener("pointermove", move);
      document.removeEventListener("visibilitychange", restart);
      motion.removeEventListener("change", restart);
    };
  }, []);
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ width: "100%", aspectRatio: "1" }}
    />
  );
}
