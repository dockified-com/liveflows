"use client";

import { useEffect, useRef } from "react";

export function AtmosphericBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx =
      typeof canvas.getContext === "function" ? canvas.getContext("2d") : null;
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Particle nodes for the DeepSeek-style constellation with electric blue & white nodes
    const particleCount = Math.min(Math.floor(width / 16), 85);
    const particleArray: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      alpha: number;
      pulseSpeed: number;
      isBlue: boolean;
    }> = [];

    for (let i = 0; i < particleCount; i++) {
      particleArray.push({
        x: Math.random() * width,
        y: Math.random() * height * 0.95,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        radius: Math.random() * 1.6 + 0.6,
        alpha: Math.random() * 0.55 + 0.25,
        pulseSpeed: Math.random() * 0.02 + 0.008,
        isBlue: Math.random() > 0.45,
      });
    }

    let mouseX = width / 2;
    let mouseY = height / 3;
    let targetMouseX = mouseX;
    let targetMouseY = mouseY;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);

    let tick = 0;

    const render = () => {
      tick += 1;
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      ctx.clearRect(0, 0, width, height);

      // Draw faint connections between close particles
      for (let i = 0; i < particleArray.length; i++) {
        const p1 = particleArray[i];

        // Move particles gently
        p1.x += p1.vx;
        p1.y += p1.vy;

        // Wrap around bounds
        if (p1.x < 0) p1.x = width;
        if (p1.x > width) p1.x = 0;
        if (p1.y < 0) p1.y = height * 0.95;
        if (p1.y > height * 0.95) p1.y = 0;

        // Pulse alpha
        const currentAlpha = p1.alpha + Math.sin(tick * p1.pulseSpeed) * 0.22;

        // Draw particle node with DeepSeek Electric Blue / White glow
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, p1.radius, 0, Math.PI * 2);
        if (p1.isBlue) {
          ctx.fillStyle = `rgba(103, 158, 254, ${Math.max(0.15, currentAlpha * 0.85)})`;
          ctx.shadowBlur = p1.radius > 1.2 ? 10 : 4;
          ctx.shadowColor = "rgba(103, 158, 254, 0.9)";
        } else {
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.15, currentAlpha * 0.75)})`;
          ctx.shadowBlur = p1.radius > 1.2 ? 8 : 2;
          ctx.shadowColor = "rgba(255, 255, 255, 0.8)";
        }
        ctx.fill();
        ctx.shadowBlur = 0;

        // Connect nearby nodes with subtle electric blue / white gradients
        for (let j = i + 1; j < particleArray.length; j++) {
          const p2 = particleArray[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 135) {
            const lineAlpha = (1 - dist / 135) * 0.16;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            if (p1.isBlue || p2.isBlue) {
              ctx.strokeStyle = `rgba(103, 158, 254, ${lineAlpha * 1.2})`;
            } else {
              ctx.strokeStyle = `rgba(255, 255, 255, ${lineAlpha})`;
            }
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }

        // Connect to mouse with reactive electric blue pulse
        const mouseDist = Math.sqrt(
          (p1.x - mouseX) ** 2 + (p1.y - mouseY) ** 2,
        );
        if (mouseDist < 170) {
          const mouseLineAlpha = (1 - mouseDist / 170) * 0.25;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(mouseX, mouseY);
          ctx.strokeStyle = `rgba(103, 158, 254, ${mouseLineAlpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      className="absolute inset-0 pointer-events-none z-0 overflow-hidden bg-[#030305]"
      style={{ backgroundColor: "#030305" }}
    >
      {/* 1. DeepSeek Harness Volumetric Electric Blue Zenith Spotlight */}
      <div
        className="absolute -top-[15%] left-1/2 -translate-x-1/2 w-[1100px] h-[700px] opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 65% 55% at 50% 15%, rgba(103, 158, 254, 0.2) 0%, rgba(45, 95, 158, 0.14) 40%, rgba(26, 56, 112, 0.08) 65%, transparent 80%)",
          filter: "blur(50px)",
        }}
      />

      {/* 2. DeepSeek Deep Blue Ambient Aura Spheres */}
      <div
        className="absolute top-[20%] left-[-5%] w-[650px] h-[650px] opacity-35"
        style={{
          background:
            "radial-gradient(circle, rgba(26, 56, 112, 0.45) 0%, rgba(45, 95, 158, 0.2) 40%, transparent 70%)",
          filter: "blur(90px)",
        }}
      />
      <div
        className="absolute top-[40%] right-[-5%] w-[700px] h-[650px] opacity-30"
        style={{
          background:
            "radial-gradient(circle, rgba(45, 95, 158, 0.4) 0%, rgba(103, 158, 254, 0.15) 45%, transparent 70%)",
          filter: "blur(100px)",
        }}
      />

      {/* 3. Deep Horizon Cyan/Blue Radiance at Bottom */}
      <div
        className="absolute bottom-[-80px] left-1/2 -translate-x-1/2 w-[900px] h-[500px] opacity-40"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(103, 158, 254, 0.22) 0%, rgba(26, 56, 112, 0.25) 45%, transparent 75%)",
          filter: "blur(70px)",
        }}
      />

      {/* 4. Precision Wireframe Engineering Grid with Radial Vignette */}
      <div
        className="absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(103, 158, 254, 0.12) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(103, 158, 254, 0.12) 1px, transparent 1px)
          `,
          backgroundSize: "44px 44px",
          maskImage:
            "radial-gradient(ellipse 75% 65% at 50% 30%, black 25%, transparent 85%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 75% 65% at 50% 30%, black 25%, transparent 85%)",
        }}
      />

      {/* 5. Live Interactive Particle Constellation Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full opacity-85"
      />

      {/* 6. Subtle Noise / Vignette Overlay for Contrast */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(3,3,5,0.7)_100%)]" />
    </div>
  );
}
