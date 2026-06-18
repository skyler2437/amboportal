"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CheddarRain } from "@/components/CheddarRain";
import { SignOutButton } from "@/components/SignOutButton";

export interface TopNavItem {
    href: string;
    label: string;
}

export function TopNav({ items }: { items: TopNavItem[] }) {
    const pathname = usePathname();
    const router = useRouter();
    const [rainActive, setRainActive] = useState(false);

    // Longest-prefix match: nested items (e.g. /student/events/new) win over
    // their parents, and the root item only highlights on an exact match.
    const activeHref = items.reduce<string | null>((best, item) => {
        const matches = pathname === item.href || pathname.startsWith(item.href + "/");
        if (!matches) return best;
        return !best || item.href.length > best.length ? item.href : best;
    }, null);

    return (
        // h-16 (4rem) is load-bearing: ChatLayout's desktop height is
        // calc(100dvh - 4rem - safe-area), which assumes this exact nav height.
        <header className="sticky top-0 z-40 hidden h-16 md:flex items-center border-b border-border/40 bg-background/95 backdrop-blur px-4 lg:px-6">
            <CheddarRain isActive={rainActive} onComplete={() => setRainActive(false)} />
            {/* Hover the cheddar to reveal a secret "Play?" link → /play easter egg. */}
            <div className="group relative flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => setRainActive(true)}
                    aria-label="Trigger cheddar rain"
                    className="text-2xl leading-none transition-transform hover:scale-110 active:scale-95"
                >
                    <span role="img" aria-hidden>🧀</span>
                </button>
                <Link
                    href="/play"
                    className="select-none text-sm font-medium text-muted-foreground opacity-0 transition-opacity duration-200 hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                >
                    Play?
                </Link>
            </div>
            <nav className="mx-4 flex flex-1 items-center justify-center gap-2 lg:gap-6">
                {items.map((item) => {
                    const isActive = item.href === activeHref;
                    return (
                        <Button
                            key={item.href}
                            variant={isActive ? "secondary" : "ghost"}
                            className={cn(!isActive && "text-muted-foreground hover:text-foreground", isActive && "font-semibold")}
                            asChild
                        >
                            <Link
                                href={item.href}
                                onClick={(e) => {
                                    // If already on the chat page, force navigate to clear ?group= param
                                    if (item.href.endsWith("/chat") && pathname.startsWith(item.href)) {
                                        e.preventDefault();
                                        router.push(item.href);
                                    }
                                }}
                            >
                                {item.label}
                            </Link>
                        </Button>
                    );
                })}
            </nav>
            <SignOutButton iconOnly className="text-muted-foreground hover:text-red-500 hover:bg-red-50" />
        </header>
    );
}
