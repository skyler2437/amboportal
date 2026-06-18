"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface CheddarRainProps {
    isActive: boolean;
    onComplete?: () => void;
}

interface Piece {
    id: number;
    left: number; // 0-100%
    delay: number; // seconds
    duration: number; // seconds
    size: number; // px
}

export function CheddarRain({ isActive, onComplete }: CheddarRainProps) {
    const [pieces, setPieces] = useState<Piece[]>([]);
    const [isFading, setIsFading] = useState(false);

    useEffect(() => {
        if (isActive) {
            setIsFading(false);
            // Generate pieces
            const newPieces: Piece[] = Array.from({ length: 50 }).map((_, i) => ({
                id: i,
                left: Math.random() * 100,
                delay: Math.random() * 5, // Random delay start
                duration: 3 + Math.random() * 2, // Fall speed between 3s and 5s
                size: 20 + Math.random() * 30, // Random size
            }));
            setPieces(newPieces);

            // Start fading out after 11 seconds (15s total - 4s fade)
            const fadeTimer = setTimeout(() => {
                setIsFading(true);
            }, 11000);

            // Stop completely after 15 seconds
            const endTimer = setTimeout(() => {
                setPieces([]); // Clear pieces
                setIsFading(false);
                if (onComplete) onComplete();
            }, 15000);

            return () => {
                clearTimeout(fadeTimer);
                clearTimeout(endTimer);
            };
        } else {
            setPieces([]);
            setIsFading(false);
        }
    }, [isActive, onComplete]);

    if (!isActive || pieces.length === 0) return null;

    // Portal to <body> so the fixed overlay covers the whole viewport. Rendered
    // inline, an ancestor with backdrop-filter/transform (e.g. the sticky
    // TopNav) becomes the containing block and the rain only falls in that box.
    return createPortal(
        <div
            className={cn(
                "fixed inset-0 pointer-events-none z-50 overflow-hidden transition-opacity duration-[4000ms] ease-in-out",
                isFading ? "opacity-0" : "opacity-100"
            )}
        >
            {pieces.map((p) => (
                <span
                    key={p.id}
                    className="absolute top-[-50px] select-none"
                    style={{
                        left: `${p.left}%`,
                        fontSize: `${p.size}px`,
                        animation: `fall ${p.duration}s linear ${p.delay}s infinite both`,
                    }}
                >
                    🧀
                </span>
            ))}
        </div>,
        document.body
    );
}
