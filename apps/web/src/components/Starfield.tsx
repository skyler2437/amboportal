"use client";

import { useEffect, useRef } from "react";

interface Star {
    x: number;
    y: number;
    z: number; // depth 0..1 (nearer = bigger/faster)
    radius: number;
    baseAlpha: number;
    twinkleSpeed: number;
    twinklePhase: number;
    tint: string; // "r,g,b"
}

interface ShootingStar {
    x: number;
    y: number;
    vx: number;
    vy: number;
    len: number;
    life: number; // 0..1, counts down
}

/**
 * Animated space background: a twinkling, slowly drifting starfield painted on
 * a <canvas>, with a faint on-brand nebula glow and the occasional shooting
 * star. Pure 2D canvas — no external libraries. Honors prefers-reduced-motion
 * (renders a still field). Meant to sit absolutely behind page content.
 */
export function Starfield() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const reduceMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        let width = 0;
        let height = 0;
        let stars: Star[] = [];
        let shooting: ShootingStar | null = null;
        let nextShootingAt = 3; // seconds until first shooting star
        let raf = 0;
        let last = 0;
        let elapsed = 0;

        const buildStars = () => {
            // Scale count to the area so density is consistent across sizes.
            const count = Math.min(420, Math.round((width * height) / 6000));
            stars = Array.from({ length: count }, () => {
                const z = Math.random();
                return {
                    x: Math.random() * width,
                    y: Math.random() * height,
                    z,
                    radius: z * 1.3 + 0.3,
                    baseAlpha: 0.35 + Math.random() * 0.65,
                    twinkleSpeed: 0.6 + Math.random() * 1.8,
                    twinklePhase: Math.random() * Math.PI * 2,
                    // Mostly white, a sprinkle of brand-blue and warm stars.
                    tint:
                        Math.random() < 0.14
                            ? "120,170,255"
                            : Math.random() < 0.06
                              ? "255,220,190"
                              : "255,255,255",
                };
            });
        };

        const resize = () => {
            width = canvas.clientWidth;
            height = canvas.clientHeight;
            canvas.width = Math.floor(width * dpr);
            canvas.height = Math.floor(height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            buildStars();
        };

        const paintBackground = () => {
            // Deep-space base with a slight vertical gradient.
            const bg = ctx.createLinearGradient(0, 0, 0, height);
            bg.addColorStop(0, "#070912");
            bg.addColorStop(1, "#04050b");
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, width, height);

            // On-brand nebula glow (brand blue #005EFF) upper-right…
            const glowSize = Math.max(width, height) * 0.7;
            const blue = ctx.createRadialGradient(
                width * 0.78,
                height * 0.18,
                0,
                width * 0.78,
                height * 0.18,
                glowSize
            );
            blue.addColorStop(0, "rgba(0,94,255,0.20)");
            blue.addColorStop(1, "rgba(0,94,255,0)");
            ctx.fillStyle = blue;
            ctx.fillRect(0, 0, width, height);

            // …and a faint violet counter-glow lower-left for depth.
            const violet = ctx.createRadialGradient(
                width * 0.2,
                height * 0.85,
                0,
                width * 0.2,
                height * 0.85,
                glowSize * 0.9
            );
            violet.addColorStop(0, "rgba(120,60,220,0.12)");
            violet.addColorStop(1, "rgba(120,60,220,0)");
            ctx.fillStyle = violet;
            ctx.fillRect(0, 0, width, height);
        };

        const paintStars = () => {
            for (const s of stars) {
                const twinkle = reduceMotion
                    ? 1
                    : 0.55 + 0.45 * Math.sin(elapsed * s.twinkleSpeed + s.twinklePhase);
                const alpha = Math.max(0, s.baseAlpha * twinkle);

                // Soft halo for the brightest/nearest stars.
                if (s.radius > 1.1) {
                    const halo = ctx.createRadialGradient(
                        s.x,
                        s.y,
                        0,
                        s.x,
                        s.y,
                        s.radius * 4
                    );
                    halo.addColorStop(0, `rgba(${s.tint},${alpha * 0.5})`);
                    halo.addColorStop(1, `rgba(${s.tint},0)`);
                    ctx.fillStyle = halo;
                    ctx.beginPath();
                    ctx.arc(s.x, s.y, s.radius * 4, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.beginPath();
                ctx.fillStyle = `rgba(${s.tint},${alpha})`;
                ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
                ctx.fill();
            }
        };

        const updateStars = (dt: number) => {
            for (const s of stars) {
                // Gentle parallax drift downward; nearer stars move faster.
                s.y += (s.z * 6 + 1.5) * dt;
                if (s.y > height + 2) {
                    s.y = -2;
                    s.x = Math.random() * width;
                }
            }
        };

        const paintShootingStar = () => {
            if (!shooting) return;
            const { x, y, vx, vy, len, life } = shooting;
            const tailX = x - (vx / Math.hypot(vx, vy)) * len;
            const tailY = y - (vy / Math.hypot(vx, vy)) * len;
            const grad = ctx.createLinearGradient(x, y, tailX, tailY);
            grad.addColorStop(0, `rgba(255,255,255,${0.9 * life})`);
            grad.addColorStop(1, "rgba(255,255,255,0)");
            ctx.strokeStyle = grad;
            ctx.lineWidth = 2;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(tailX, tailY);
            ctx.stroke();
        };

        const updateShootingStar = (dt: number) => {
            if (shooting) {
                shooting.x += shooting.vx * dt;
                shooting.y += shooting.vy * dt;
                shooting.life -= dt * 0.8;
                if (shooting.life <= 0) shooting = null;
                return;
            }
            nextShootingAt -= dt;
            if (nextShootingAt <= 0) {
                // Launch from the top edge heading down-right.
                const speed = 380 + Math.random() * 220;
                const angle = Math.PI * (0.18 + Math.random() * 0.12);
                shooting = {
                    x: Math.random() * width * 0.6,
                    y: Math.random() * height * 0.35,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    len: 90 + Math.random() * 80,
                    life: 1,
                };
                nextShootingAt = 6 + Math.random() * 8;
            }
        };

        const frame = (now: number) => {
            const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
            last = now;
            elapsed += dt;

            paintBackground();
            updateStars(dt);
            paintStars();
            updateShootingStar(dt);
            paintShootingStar();

            raf = requestAnimationFrame(frame);
        };

        resize();

        if (reduceMotion) {
            // Single static render — no animation loop.
            paintBackground();
            paintStars();
        } else {
            raf = requestAnimationFrame(frame);
        }

        window.addEventListener("resize", resize);
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener("resize", resize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full"
            aria-hidden="true"
        />
    );
}
