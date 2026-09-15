"use client";

import { useEffect, useRef } from "react";

/** Procedural depth-projected geometry; no textures, network or per-frame React updates. */
export function CoreSphere({
  active,
  signal = "",
  phase = "idle",
  paused = false,
}: {
  active: boolean;
  signal?: string;
  phase?: "idle" | "searching" | "answer";
  paused?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  const signalRef = useRef(signal);
  const phaseRef = useRef(phase);
  const pausedRef = useRef(paused);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);
  useEffect(() => {
    signalRef.current = signal;
  }, [signal]);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    pausedRef.current = paused;
    canvasRef.current?.dispatchEvent(new Event("core-playback"));
  }, [paused]);
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
    let lastSignal = signalRef.current;
    let signalAge = 2000;
    let lastPhase = phaseRef.current;
    let reaction: "activity" | "search" | "answer" | "none" = "none";
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
    const distantLight = document.createElement("canvas");
    distantLight.width = 32;
    distantLight.height = 32;
    const distantContext = distantLight.getContext("2d");
    if (distantContext) {
      const blur = distantContext.createRadialGradient(16, 16, 0, 16, 16, 16);
      blur.addColorStop(0, "#7babff70");
      blur.addColorStop(0.3, "#677fff42");
      blur.addColorStop(1, "#657aff00");
      distantContext.fillStyle = blur;
      distantContext.fillRect(0, 0, 32, 32);
    }
    // Paint the soft light volume once: blur is never applied to text or the whole scene.
    const volume = document.createElement("canvas");
    volume.width = 256;
    volume.height = 256;
    const volumeContext = volume.getContext("2d");
    if (volumeContext) {
      volumeContext.globalCompositeOperation = "lighter";
      const clouds = [
        { x: 128, y: 128, r: 119, color: "35,75,255", strength: 0.38 },
        { x: 124, y: 127, r: 76, color: "43,177,255", strength: 0.48 },
        { x: 103, y: 100, r: 65, color: "134,58,255", strength: 0.36 },
        { x: 158, y: 149, r: 69, color: "76,69,255", strength: 0.3 },
        { x: 150, y: 92, r: 44, color: "30,137,255", strength: 0.22 },
      ];
      for (const cloud of clouds) {
        const mist = volumeContext.createRadialGradient(
          cloud.x,
          cloud.y,
          0,
          cloud.x,
          cloud.y,
          cloud.r,
        );
        mist.addColorStop(0, `rgba(${cloud.color},${cloud.strength})`);
        mist.addColorStop(
          0.35,
          `rgba(${cloud.color},${cloud.strength * 0.55})`,
        );
        mist.addColorStop(1, `rgba(${cloud.color},0)`);
        volumeContext.fillStyle = mist;
        volumeContext.fillRect(0, 0, 256, 256);
      }
      volumeContext.filter = "blur(9px)";
      volumeContext.strokeStyle = "#7973ff70";
      volumeContext.lineWidth = 7;
      for (let i = 0; i < 3; i++) {
        volumeContext.beginPath();
        volumeContext.ellipse(
          128,
          128,
          45 + i * 12,
          24 + i * 7,
          i * 1.1,
          0.3,
          Math.PI * 1.6,
        );
        volumeContext.stroke();
      }
      volumeContext.filter = "none";
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
      if (lastSignal !== signalRef.current) {
        lastSignal = signalRef.current;
        signalAge = 0;
        reaction =
          phaseRef.current === "searching"
            ? "search"
            : lastPhase === "searching" && phaseRef.current === "answer"
              ? "answer"
              : lastPhase === "searching"
                ? "none"
                : "activity";
        lastPhase = phaseRef.current;
      }
      if (!pausedRef.current) signalAge += delta;
      const easing = 1 - Math.exp(-delta / 450);
      energy += ((activeRef.current ? 1 : 0) - energy) * easing;
      if (!motion.matches && !pausedRef.current) {
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
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(-rotation * 0.4);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha =
        0.88 + Math.sin(elapsed * 0.0009) * 0.07 + energy * 0.12;
      const volumeSize = radius * 2.45;
      ctx.drawImage(
        volume,
        -volumeSize / 2,
        -volumeSize / 2,
        volumeSize,
        volumeSize,
      );
      ctx.restore();
      const atmosphere = ctx.createRadialGradient(
        center,
        center,
        radius * 0.6,
        center,
        center,
        radius * 1.15,
      );
      atmosphere.addColorStop(0, "#194fff00");
      atmosphere.addColorStop(0.65, "#245cfa08");
      atmosphere.addColorStop(0.82, "#387bff17");
      atmosphere.addColorStop(1, "#427aff00");
      ctx.fillStyle = atmosphere;
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
        const depth = (p.z + q.z + 2) / 4;
        ctx.strokeStyle = `rgba(63,116,255,${0.025 + depth * depth * 0.38})`;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.stroke();
      });
      ctx.globalCompositeOperation = "lighter";
      // A counter-rotating inner lattice makes the nucleus a small world of its own.
      const innerAngle = -rotation * 2.2;
      const innerScale = 0.32 + energy * 0.025;
      const inner = points.map((point) =>
        project(
          (point.x * Math.cos(innerAngle) + point.z * Math.sin(innerAngle)) *
            innerScale,
          point.y * innerScale,
          (point.z * Math.cos(innerAngle) - point.x * Math.sin(innerAngle)) *
            innerScale,
        ),
      );
      ctx.beginPath();
      edges.forEach(([a, b], index) => {
        if (index % 2) return;
        ctx.moveTo(inner[a]!.x, inner[a]!.y);
        ctx.lineTo(inner[b]!.x, inner[b]!.y);
      });
      ctx.strokeStyle = "#589fff66";
      ctx.lineWidth = 0.55;
      ctx.stroke();
      inner.forEach((point, index) => {
        if (index % 4) return;
        ctx.fillStyle = index % 12 ? "#b4e9ff" : "#c6a4ff";
        ctx.beginPath();
        ctx.arc(point.x, point.y, 0.8, 0, Math.PI * 2);
        ctx.fill();
        if (index % 12 === 0)
          ctx.drawImage(light, point.x - 8, point.y - 8, 16, 16);
      });
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
          // Defocus only the back hemisphere; cached soft sprites avoid frame-time blur.
          const focus = Math.max(0, Math.min(1, (p.z + 0.35) / 0.55));
          if (focus < 1) {
            ctx.globalAlpha = 1 - focus;
            const diameter = 5 + -p.z * 5;
            ctx.drawImage(
              distantLight,
              p.x - diameter / 2,
              p.y - diameter / 2,
              diameter,
              diameter,
            );
            ctx.globalAlpha = 1;
          }
          if (focus === 0) return;
          ctx.globalAlpha = focus;
          if (bright > 0.6 && i % 3 === 0)
            ctx.drawImage(light, p.x - 10, p.y - 10, 20, 20);
          ctx.fillStyle =
            i % 4 === 0
              ? `rgba(181,141,255,${0.3 + bright * 0.7})`
              : `rgba(124,205,255,${0.3 + bright * 0.7})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 0.7 + bright * 1.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
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
      if (!motion.matches && activeRef.current) {
        // Search pulls three staggered packets toward the nucleus.
        for (let ring = 0; ring < 3; ring++) {
          const progress = (elapsed / 1450 + ring / 3) % 1;
          ctx.strokeStyle = `rgba(156,132,255,${Math.sin(progress * Math.PI) * 0.24 * energy})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.arc(
            center,
            center,
            radius * (1 - progress * 0.9),
            0,
            Math.PI * 2,
          );
          ctx.stroke();
        }
      }
      const reactionDuration = reaction === "answer" ? 2100 : 1050;
      if (
        !motion.matches &&
        (reaction === "activity" || reaction === "answer") &&
        signalAge < reactionDuration
      ) {
        const progress = signalAge / reactionDuration;
        const strength = reaction === "answer" ? 0.48 : 0.25;
        ctx.strokeStyle = `rgba(${reaction === "answer" ? "116,228,235" : "107,187,255"},${Math.sin(progress * Math.PI) * strength})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(
          center,
          center,
          radius * (0.12 + (1 - Math.pow(1 - progress, 2)) * 0.96),
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
      if (visible && !document.hidden && !motion.matches && !pausedRef.current)
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
    canvas.addEventListener("core-playback", restart);
    canvas.addEventListener("pointerleave", leave);
    document.addEventListener("visibilitychange", restart);
    motion.addEventListener("change", restart);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      intersection.disconnect();
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("core-playback", restart);
      canvas.removeEventListener("pointerleave", leave);
      document.removeEventListener("visibilitychange", restart);
      motion.removeEventListener("change", restart);
    };
  }, []);
  return (
    <>
      <noscript>
        <svg
          viewBox="0 0 600 600"
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
          }}
        >
          <defs>
            <radialGradient id="core-static-glow">
              <stop stopColor="#8ce7ff" />
              <stop offset=".14" stopColor="#367bff" stopOpacity=".7" />
              <stop offset="1" stopColor="#1d3eaa" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="300" cy="300" r="220" fill="url(#core-static-glow)" />
          {Array.from({ length: 9 }, (_, i) => (
            <ellipse
              key={i}
              cx="300"
              cy="300"
              rx="218"
              ry={50 + i * 18}
              transform={`rotate(${i * 23} 300 300)`}
              fill="none"
              stroke={i % 2 ? "#8273ff" : "#439fff"}
              strokeOpacity=".4"
              strokeWidth=".8"
            />
          ))}
          {Array.from({ length: 36 }, (_, i) => (
            <circle
              key={i}
              cx={300 + Math.cos(i * 2.4) * (100 + (i % 6) * 22)}
              cy={300 + Math.sin(i * 2.4) * (100 + (i % 6) * 22)}
              r="2"
              fill="#9edbff"
            />
          ))}
          <circle cx="300" cy="300" r="5" fill="#dcfaff" />
        </svg>
      </noscript>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{ width: "100%", aspectRatio: "1" }}
      />
    </>
  );
}
