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
    let elapsed = 0;
    let energy = 0;
    const pointer = { x: 0, y: 0 };
    const view = { x: 0, y: 0 };
    const light = document.createElement("canvas");
    light.width = 64;
    light.height = 64;
    const lightContext = light.getContext("2d");
    if (lightContext) {
      const halo = lightContext.createRadialGradient(32, 32, 0, 32, 32, 32);
      halo.addColorStop(0, "#e6faff");
      halo.addColorStop(0.07, "#a0e2ff");
      halo.addColorStop(0.2, "#398effa0");
      halo.addColorStop(0.5, "#466aff30");
      halo.addColorStop(1, "#456aff00");
      lightContext.fillStyle = halo;
      lightContext.fillRect(0, 0, 64, 64);
    }
    const points = Array.from({ length: 240 }, (_, i) => {
      const y = 1 - (i / 239) * 2;
      const radius = Math.sqrt(1 - y * y);
      const angle = i * Math.PI * (3 - Math.sqrt(5));
      return {
        x: Math.cos(angle) * radius,
        y,
        z: Math.sin(angle) * radius,
        id: i,
      };
    });
    const orbitPoint = (orbit: number, t: number) => {
      const tilt = orbit * 0.47;
      const yaw = orbit * 1.618;
      const distance = 0.78 + (orbit % 7) * 0.06;
      const x = Math.cos(t) * distance;
      const y = Math.sin(t) * Math.cos(tilt) * distance;
      const z = Math.sin(t) * Math.sin(tilt) * distance;
      return {
        x: x * Math.cos(yaw) - y * Math.sin(yaw),
        y: x * Math.sin(yaw) + y * Math.cos(yaw),
        z,
      };
    };
    const orbits = Array.from({ length: 22 }, (_, orbit) =>
      Array.from({ length: 129 }, (_, step) =>
        orbitPoint(orbit, (step / 128) * Math.PI * 2),
      ),
    );
    const edges: [number, number][] = [];
    points.forEach((a, i) =>
      points.slice(i + 1).forEach((b, offset) => {
        if (Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) < 0.3)
          edges.push([i, i + offset + 1]);
      }),
    );
    function draw(now: number) {
      if (!ctx || !canvas) return;
      const delta = previous ? Math.min(now - previous, 50) : 0;
      previous = now;
      const easing = 1 - Math.exp(-delta / 450);
      energy += ((activeRef.current ? 1 : 0) - energy) * easing;
      if (!motion.matches) {
        elapsed += delta;
        rotation += delta * (0.000035 + energy * 0.00009);
        view.x += (pointer.x - view.x) * easing;
        view.y += (pointer.y - view.y) * easing;
      }
      ctx.clearRect(0, 0, size, size);
      const center = size / 2;
      const radius = size * 0.34;
      const angle = rotation + view.x * 0.28;
      const project = (x: number, y: number, z: number) => {
        const rx = x * Math.cos(angle) + z * Math.sin(angle);
        const rz = z * Math.cos(angle) - x * Math.sin(angle);
        const tilt = 0.22 + view.y * 0.2;
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
      const projected = points.map((p) => ({
        ...project(p.x, p.y, p.z),
        id: p.id,
      }));
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
      ctx.globalCompositeOperation = "lighter";
      orbits.forEach((path, orbit) => {
        ctx.beginPath();
        path.forEach((point, step) => {
          const p = project(point.x, point.y, point.z);
          if (step === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.lineWidth = orbit % 3 === 0 ? 0.9 : 0.5;
        ctx.strokeStyle = orbit % 3 === 0 ? "#8663ff55" : "#248fff44";
        ctx.stroke();
        // Luminous packets follow the actual orbit geometry, with fading tails.
        const head = elapsed * (0.00018 + (orbit % 4) * 0.00004) + orbit * 2.4;
        for (let segment = 0; segment < 20; segment++) {
          const a = orbitPoint(orbit, head - segment * 0.017);
          const b = orbitPoint(orbit, head - (segment + 1) * 0.017);
          const p = project(a.x, a.y, a.z);
          const q = project(b.x, b.y, b.z);
          const opacity = (1 - segment / 20) * (0.3 + (p.z + 1.2) * 0.2);
          ctx.strokeStyle =
            orbit % 3 === 0
              ? `rgba(168,107,255,${opacity})`
              : `rgba(66,171,255,${opacity})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
          if (segment === 0) {
            ctx.drawImage(light, p.x - 12, p.y - 12, 24, 24);
            ctx.fillStyle = "#b8eaff";
            ctx.beginPath();
            ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });
      projected
        .sort((a, b) => a.z - b.z)
        .forEach((p) => {
          const i = p.id;
          const bright = (p.z + 1) / 2;
          if (bright > 0.6 && i % 3 === 0)
            ctx.drawImage(light, p.x - 10, p.y - 10, 20, 20);
          ctx.fillStyle =
            i % 4 === 0
              ? `rgba(181,141,255,${0.3 + bright * 0.7})`
              : `rgba(124,205,255,${0.3 + bright * 0.7})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 0.7 + bright * 1.8, 0, Math.PI * 2);
          ctx.fill();
        });
      // Small lens flares retain crisp luminous centers at every display scale.
      projected
        .filter((p) => p.z > 0.3 && p.id % 13 === 0)
        .forEach((p) => {
          ctx.drawImage(light, p.x - 20, p.y - 20, 40, 40);
          ctx.strokeStyle = "#a6d8ff66";
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(p.x - 9, p.y);
          ctx.lineTo(p.x + 9, p.y);
          ctx.moveTo(p.x, p.y - 9);
          ctx.lineTo(p.x, p.y + 9);
          ctx.stroke();
        });
      const pulse = motion.matches
        ? 1
        : 1 + Math.sin(elapsed * 0.0018) * 0.09 + energy * 0.16;
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
      for (let i = 1; i < 8; i++) {
        ctx.strokeStyle = `rgba(121,187,255,${0.65 - i * 0.065})`;
        ctx.beginPath();
        ctx.ellipse(
          center,
          center,
          radius * i * 0.024 * pulse,
          radius * i * 0.033 * pulse,
          rotation + i,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      }
      // A fine equatorial flare gives the nucleus a bright, structured center.
      const flare = ctx.createLinearGradient(
        center - radius * 0.55,
        center,
        center + radius * 0.55,
        center,
      );
      flare.addColorStop(0, "#479aff00");
      flare.addColorStop(0.5, "#aeefffcc");
      flare.addColorStop(1, "#479aff00");
      ctx.fillStyle = flare;
      ctx.fillRect(center - radius * 0.55, center - 0.5, radius * 1.1, 1);
      ctx.globalCompositeOperation = "source-over";
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
    const leave = () => {
      pointer.x = 0;
      pointer.y = 0;
    };
    resize.observe(canvas);
    intersection.observe(canvas);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerleave", leave);
    document.addEventListener("visibilitychange", restart);
    motion.addEventListener("change", restart);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      intersection.disconnect();
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerleave", leave);
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
