"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type ScoreRow = { player_name: string; score: number };

type GameStatus = "idle" | "playing" | "over";

// ── Logical canvas resolution (scaled to fit via CSS) ────────────────────────
const W = 640;
const H = 720;

// ── Invader grid ─────────────────────────────────────────────────────────────
const COLS = 11;
const ROWS = 5;
const INV_W = 30;
const INV_H = 22;
const INV_GAP_X = 14;
const INV_GAP_Y = 14;
const GRID_LEFT = 40;
const GRID_TOP = 80;
const DROP = 24;

// ── Player ───────────────────────────────────────────────────────────────────
const PLAYER_W = 46;
const PLAYER_H = 18;
const PLAYER_Y = H - 60;
const PLAYER_SPEED = 360; // px/sec
const SHOT_COOLDOWN = 0.32; // sec
const BULLET_SPEED = 560;
const INV_BULLET_SPEED = 240;
const START_LIVES = 3;

// Classic crab invader, two animation frames (legs up / legs down).
const INVADER_FRAMES: string[][] = [
    [
        "00100000100",
        "00010001000",
        "00111111100",
        "01101110110",
        "11111111111",
        "10111111101",
        "10100000101",
        "00011011000",
    ],
    [
        "00100000100",
        "10010001001",
        "10111111101",
        "11101110111",
        "11111111111",
        "01111111110",
        "00100000100",
        "01000000010",
    ],
];

type Invader = { col: number; row: number; x: number; y: number; alive: boolean };
type Bullet = { x: number; y: number };

type GameState = {
    status: GameStatus;
    score: number;
    lives: number;
    wave: number;
    time: number; // accumulated seconds, used for cooldowns + animation
    lastShot: number;
    player: { x: number };
    keys: { left: boolean; right: boolean; fire: boolean };
    invaders: Invader[];
    dir: 1 | -1;
    invSpeed: number;
    bullets: Bullet[]; // player bullets (travel up)
    bombs: Bullet[]; // invader bullets (travel down)
    stars: { x: number; y: number; s: number }[];
};

function rowPoints(row: number): number {
    // Top rows are worth more, like the arcade original.
    if (row === 0) return 40;
    if (row <= 2) return 20;
    return 10;
}

function buildInvaders(): Invader[] {
    const list: Invader[] = [];
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            list.push({
                col,
                row,
                x: GRID_LEFT + col * (INV_W + INV_GAP_X),
                y: GRID_TOP + row * (INV_H + INV_GAP_Y),
                alive: true,
            });
        }
    }
    return list;
}

function makeStars() {
    const stars: { x: number; y: number; s: number }[] = [];
    for (let i = 0; i < 70; i++) {
        stars.push({
            x: Math.random() * W,
            y: Math.random() * H,
            s: Math.random() < 0.2 ? 2 : 1,
        });
    }
    return stars;
}

function freshState(wave: number, score: number, lives: number): GameState {
    return {
        status: "playing",
        score,
        lives,
        wave,
        time: 0,
        lastShot: -1,
        player: { x: W / 2 - PLAYER_W / 2 },
        keys: { left: false, right: false, fire: false },
        invaders: buildInvaders(),
        dir: 1,
        invSpeed: 26 + (wave - 1) * 10,
        bullets: [],
        bombs: [],
        stars: makeStars(),
    };
}

export function SpaceInvaders({
    playerName,
    homeHref,
}: {
    playerName: string;
    homeHref: string;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const stateRef = useRef<GameState | null>(null);

    const [status, setStatus] = useState<GameStatus>("idle");
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(START_LIVES);
    const [wave, setWave] = useState(1);
    const [leaderboard, setLeaderboard] = useState<ScoreRow[]>([]);
    const [personalBest, setPersonalBest] = useState<number | null>(null);
    const [lastResult, setLastResult] = useState<{ score: number; isNewBest: boolean } | null>(
        null
    );

    const loadLeaderboard = useCallback(async () => {
        try {
            const res = await fetch("/api/invaders/scores", { cache: "no-store" });
            if (!res.ok) return;
            const json = (await res.json()) as { scores?: ScoreRow[] };
            setLeaderboard(json.scores ?? []);
        } catch {
            /* leaderboard is best-effort */
        }
    }, []);

    const submitScore = useCallback(
        async (finalScore: number) => {
            try {
                const res = await fetch("/api/invaders/scores", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ score: finalScore }),
                });
                if (res.ok) {
                    const json = (await res.json()) as { best?: number; isNewBest?: boolean };
                    setPersonalBest(json.best ?? finalScore);
                    setLastResult({ score: finalScore, isNewBest: Boolean(json.isNewBest) });
                }
            } catch {
                /* score submit is best-effort */
            } finally {
                loadLeaderboard();
            }
        },
        [loadLeaderboard]
    );

    // Keep a stable ref to submitScore for use inside the game loop.
    const submitScoreRef = useRef(submitScore);
    submitScoreRef.current = submitScore;

    // Imperative "start a new run" — callable from the loop and the UI button.
    const startRef = useRef<() => void>(() => {});

    useEffect(() => {
        loadLeaderboard();
    }, [loadLeaderboard]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const start = () => {
            stateRef.current = freshState(1, 0, START_LIVES);
            setScore(0);
            setLives(START_LIVES);
            setWave(1);
            setLastResult(null);
            setStatus("playing");
        };
        startRef.current = start;

        const endGame = () => {
            const g = stateRef.current;
            if (!g) return;
            g.status = "over";
            setStatus("over");
            submitScoreRef.current(g.score);
        };

        const fireBullet = (g: GameState) => {
            if (g.bullets.length >= 3) return;
            if (g.time - g.lastShot < SHOT_COOLDOWN) return;
            g.lastShot = g.time;
            g.bullets.push({ x: g.player.x + PLAYER_W / 2 - 2, y: PLAYER_Y - 6 });
        };

        const onKeyDown = (e: KeyboardEvent) => {
            const g = stateRef.current;
            switch (e.key) {
                case "ArrowLeft":
                case "a":
                case "A":
                    if (g) g.keys.left = true;
                    e.preventDefault();
                    break;
                case "ArrowRight":
                case "d":
                case "D":
                    if (g) g.keys.right = true;
                    e.preventDefault();
                    break;
                case " ":
                case "Spacebar":
                    if (g && g.status === "playing") fireBullet(g);
                    else start();
                    e.preventDefault();
                    break;
                case "Enter":
                    if (!g || g.status !== "playing") start();
                    e.preventDefault();
                    break;
                default:
                    break;
            }
        };

        const onKeyUp = (e: KeyboardEvent) => {
            const g = stateRef.current;
            if (!g) return;
            switch (e.key) {
                case "ArrowLeft":
                case "a":
                case "A":
                    g.keys.left = false;
                    break;
                case "ArrowRight":
                case "d":
                case "D":
                    g.keys.right = false;
                    break;
                default:
                    break;
            }
        };

        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);

        const update = (g: GameState, dt: number) => {
            g.time += dt;

            // Player movement.
            if (g.keys.left) g.player.x -= PLAYER_SPEED * dt;
            if (g.keys.right) g.player.x += PLAYER_SPEED * dt;
            g.player.x = Math.max(8, Math.min(W - PLAYER_W - 8, g.player.x));

            // Player bullets.
            for (const b of g.bullets) b.y -= BULLET_SPEED * dt;
            g.bullets = g.bullets.filter((b) => b.y > -10);

            // Invader block movement (speeds up as the swarm thins out).
            const living = g.invaders.filter((i) => i.alive);
            const remaining = living.length;
            if (remaining === 0) {
                // Wave cleared — advance to a faster wave.
                const nextWave = g.wave + 1;
                const carry = freshState(nextWave, g.score, g.lives);
                Object.assign(g, carry);
                setWave(nextWave);
                return;
            }

            const speed = g.invSpeed * (1 + (ROWS * COLS - remaining) / (ROWS * COLS)) * 1.6;
            let minX = Infinity;
            let maxX = -Infinity;
            for (const i of living) {
                minX = Math.min(minX, i.x);
                maxX = Math.max(maxX, i.x + INV_W);
            }
            const dx = g.dir * speed * dt;
            const hitEdge = (g.dir === 1 && maxX + dx >= W - 12) || (g.dir === -1 && minX + dx <= 12);
            if (hitEdge) {
                g.dir = (g.dir === 1 ? -1 : 1) as 1 | -1;
                for (const i of g.invaders) i.y += DROP;
            } else {
                for (const i of g.invaders) i.x += dx;
            }

            // Invaders open fire at random from the lowest invader in a column.
            const bottomMost = new Map<number, Invader>();
            for (const i of living) {
                const cur = bottomMost.get(i.col);
                if (!cur || i.y > cur.y) bottomMost.set(i.col, i);
            }
            const fireChance = (0.7 + g.wave * 0.15) * dt;
            if (Math.random() < fireChance) {
                const shooters = Array.from(bottomMost.values());
                const shooter = shooters[Math.floor(Math.random() * shooters.length)];
                if (shooter) {
                    g.bombs.push({ x: shooter.x + INV_W / 2 - 2, y: shooter.y + INV_H });
                }
            }

            // Invader bombs.
            for (const b of g.bombs) b.y += INV_BULLET_SPEED * dt;
            g.bombs = g.bombs.filter((b) => b.y < H + 10);

            // Player bullet vs invader.
            for (const b of g.bullets) {
                for (const i of living) {
                    if (
                        b.x < i.x + INV_W &&
                        b.x + 4 > i.x &&
                        b.y < i.y + INV_H &&
                        b.y + 10 > i.y
                    ) {
                        i.alive = false;
                        b.y = -100; // remove on next filter
                        g.score += rowPoints(i.row);
                        setScore(g.score);
                        break;
                    }
                }
            }
            g.bullets = g.bullets.filter((b) => b.y > -10);

            // Invader bomb vs player.
            const px = g.player.x;
            const py = PLAYER_Y;
            for (const b of g.bombs) {
                if (
                    b.x < px + PLAYER_W &&
                    b.x + 4 > px &&
                    b.y < py + PLAYER_H &&
                    b.y + 10 > py
                ) {
                    b.y = H + 100;
                    g.lives -= 1;
                    setLives(g.lives);
                    if (g.lives <= 0) {
                        endGame();
                        return;
                    }
                }
            }
            g.bombs = g.bombs.filter((b) => b.y < H + 10);

            // Invaders reaching the player's line ends the game.
            for (const i of living) {
                if (i.y + INV_H >= PLAYER_Y) {
                    g.lives = 0;
                    setLives(0);
                    endGame();
                    return;
                }
            }
        };

        const drawInvader = (i: Invader, frame: number) => {
            const bmp = INVADER_FRAMES[frame];
            const px = INV_W / COLS;
            const py = INV_H / 8;
            ctx.fillStyle = i.row === 0 ? "#7CFC00" : i.row <= 2 ? "#39FF14" : "#00E5A8";
            for (let r = 0; r < bmp.length; r++) {
                const line = bmp[r];
                for (let c = 0; c < line.length; c++) {
                    if (line[c] === "1") {
                        ctx.fillRect(i.x + c * px, i.y + r * py, Math.ceil(px), Math.ceil(py));
                    }
                }
            }
        };

        const draw = () => {
            const g = stateRef.current;

            // Background.
            ctx.fillStyle = "#04060d";
            ctx.fillRect(0, 0, W, H);

            // Stars.
            if (g) {
                ctx.fillStyle = "#1f2a44";
                for (const s of g.stars) ctx.fillRect(s.x, s.y, s.s, s.s);
            }

            if (!g || g.status === "idle") return;

            // Animation frame toggles a few times per second.
            const frame = Math.floor(g.time * 3) % 2;

            // Invaders.
            for (const i of g.invaders) {
                if (i.alive) drawInvader(i, frame);
            }

            // Player cannon.
            ctx.fillStyle = "#e8eefc";
            const px = g.player.x;
            ctx.fillRect(px, PLAYER_Y + 6, PLAYER_W, PLAYER_H - 6);
            ctx.fillRect(px + PLAYER_W / 2 - 4, PLAYER_Y, 8, 8);

            // Player bullets.
            ctx.fillStyle = "#fdfd96";
            for (const b of g.bullets) ctx.fillRect(b.x, b.y, 4, 10);

            // Invader bombs.
            ctx.fillStyle = "#ff5c7a";
            for (const b of g.bombs) ctx.fillRect(b.x, b.y, 4, 10);

            // Ground line.
            ctx.fillStyle = "#1c6e4a";
            ctx.fillRect(0, PLAYER_Y + PLAYER_H + 8, W, 2);
        };

        let raf = 0;
        let last = performance.now();
        const loop = (now: number) => {
            const dt = Math.min((now - last) / 1000, 0.05);
            last = now;
            const g = stateRef.current;
            if (g && g.status === "playing") update(g, dt);
            draw();
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
        };
    }, []);

    return (
        <div className="fixed inset-0 flex flex-col bg-[#04060d] font-mono text-[#39FF14] sm:flex-row">
            {/* Discreet exit (no header on this page). */}
            <Link
                href={homeHref}
                aria-label="Exit game"
                className="absolute left-3 top-3 z-10 rounded border border-[#39FF14]/40 px-2 py-0.5 text-xs text-[#39FF14]/70 transition-colors hover:bg-[#39FF14]/10 hover:text-[#39FF14]"
            >
                ✕ EXIT
            </Link>

            {/* Game area. */}
            <div className="relative flex flex-1 flex-col items-center justify-center p-3 pt-12 sm:pt-3">
                <div className="mb-2 flex w-full max-w-[640px] items-center justify-between text-xs tracking-widest sm:text-sm">
                    <span>SCORE {String(score).padStart(5, "0")}</span>
                    <span>WAVE {wave}</span>
                    <span>
                        LIVES{" "}
                        {Array.from({ length: Math.max(0, lives) }).map((_, i) => (
                            <span key={i}>▲</span>
                        ))}
                    </span>
                </div>

                <div className="relative">
                    <canvas
                        ref={canvasRef}
                        width={W}
                        height={H}
                        className="block rounded-md border border-[#39FF14]/25 shadow-[0_0_40px_rgba(57,255,20,0.15)]"
                        style={{ height: "min(82vh, 720px)", width: "auto", imageRendering: "pixelated" }}
                    />

                    {/* Start / Game-over overlay. */}
                    {status !== "playing" && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/70 text-center">
                            {status === "over" ? (
                                <>
                                    <h2 className="text-3xl font-bold tracking-widest text-[#ff5c7a] drop-shadow-[0_0_8px_rgba(255,92,122,0.6)]">
                                        GAME OVER
                                    </h2>
                                    <p className="text-lg">
                                        FINAL SCORE {String(lastResult?.score ?? score).padStart(5, "0")}
                                    </p>
                                    {lastResult?.isNewBest && (
                                        <p className="animate-pulse text-sm text-[#fdfd96]">
                                            ★ NEW PERSONAL BEST ★
                                        </p>
                                    )}
                                </>
                            ) : (
                                <>
                                    <h1 className="text-2xl font-bold tracking-[0.3em] text-[#39FF14] drop-shadow-[0_0_10px_rgba(57,255,20,0.6)] sm:text-4xl">
                                        SPACE INVADERS
                                    </h1>
                                    <p className="max-w-xs text-xs leading-relaxed text-[#39FF14]/70">
                                        ◄ ► or A / D to move · SPACE to fire
                                    </p>
                                </>
                            )}
                            <button
                                type="button"
                                onClick={() => startRef.current()}
                                className="rounded border-2 border-[#39FF14] px-6 py-2 text-sm font-bold tracking-widest text-[#39FF14] transition-colors hover:bg-[#39FF14] hover:text-black"
                            >
                                {status === "over" ? "PLAY AGAIN" : "INSERT COIN"}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Leaderboard. */}
            <aside className="flex w-full shrink-0 flex-col border-t border-[#39FF14]/20 bg-black/30 p-4 sm:w-72 sm:border-l sm:border-t-0">
                <h2 className="mb-3 text-center text-sm font-bold tracking-[0.25em] text-[#fdfd96]">
                    ★ HIGH SCORES ★
                </h2>
                <ol className="flex-1 space-y-1 overflow-y-auto text-xs">
                    {leaderboard.length === 0 && (
                        <li className="py-6 text-center text-[#39FF14]/40">
                            No scores yet. Be the first!
                        </li>
                    )}
                    {leaderboard.map((row, idx) => {
                        const isMe = row.player_name === playerName;
                        return (
                            <li
                                key={`${row.player_name}-${idx}`}
                                className={`flex items-center justify-between gap-2 rounded px-2 py-1 ${
                                    isMe ? "bg-[#39FF14]/15 text-[#fdfd96]" : "text-[#39FF14]/90"
                                }`}
                            >
                                <span className="w-5 shrink-0 text-right text-[#39FF14]/50">
                                    {idx + 1}
                                </span>
                                <span className="flex-1 truncate">{row.player_name}</span>
                                <span className="tabular-nums">
                                    {String(row.score).padStart(5, "0")}
                                </span>
                            </li>
                        );
                    })}
                </ol>
                {personalBest !== null && (
                    <p className="mt-3 border-t border-[#39FF14]/20 pt-2 text-center text-[11px] text-[#39FF14]/60">
                        YOUR BEST · {String(personalBest).padStart(5, "0")}
                    </p>
                )}
            </aside>
        </div>
    );
}
