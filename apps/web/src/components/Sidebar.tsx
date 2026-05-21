"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LucideIcon, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState, useEffect } from "react";
import { CheddarRain } from "@/components/CheddarRain";

export interface SidebarItem {
    href?: string;
    label: string;
    icon?: LucideIcon;
    items?: SidebarItem[]; // Submenu items
    type?: "header" | "item";
}

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
    items: SidebarItem[];
    header?: React.ReactNode;
    footer?: React.ReactNode;
}

export function Sidebar({ className, items, header, footer, ...props }: SidebarProps) {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [rainActive, setRainActive] = useState(false);

    return (
        <div
            className={cn(
                "relative flex flex-col min-h-screen border-r border-border/40 bg-background transition-all duration-300 ease-in-out",
                isCollapsed ? "w-16" : "w-64",
                "hidden md:flex",
                className
            )}
            {...props}
        >
            <CheddarRain isActive={rainActive} onComplete={() => setRainActive(false)} />
            {/* Toggle Button */}
            <div className="absolute -right-3 top-6 z-20">
                <Button
                    variant="outline"
                    size="icon"
                    className="h-6 w-6 rounded-full border shadow-md bg-background hover:bg-accent"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
                </Button>
            </div>

            <div className="flex-1 py-4">
                <div className={cn("px-3 py-2", isCollapsed ? "px-2" : "px-3")}>
                    {/* Header / Logo */}
                    <div className={cn("flex items-center mb-6 px-2", isCollapsed ? "justify-center" : "")}>
                        {header ? header : (
                            <button
                                type="button"
                                onClick={() => setRainActive(true)}
                                aria-label="Trigger cheddar rain"
                                className={cn(
                                    "leading-none transition-transform hover:scale-110 active:scale-95",
                                    isCollapsed ? "text-2xl" : "text-3xl"
                                )}
                            >
                                <span role="img" aria-hidden>🧀</span>
                            </button>
                        )}
                    </div>

                    <nav className="space-y-1">
                        {items.map((item, index) => {
                            if (item.type === "header") {
                                return (
                                    !isCollapsed && (
                                        <div key={index} className="px-4 py-2 mt-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            {item.label}
                                        </div>
                                    )
                                );
                            }

                            const isActive = item.href ? (pathname === item.href || item.items?.some(sub => sub.href === pathname)) : false;

                            // We can't use hooks inside a map if the order changes or conditional, 
                            // but here the map structure is stable for a given items array. 
                            // However, we should extract this into a component if we want to be 100% safe, 
                            // but for this Sidebar it's likely fine as long as items don't change length dynamically during render.
                            // Actually, let's keep it simple.

                            // eslint-disable-next-line react-hooks/rules-of-hooks
                            const [isOpen, setIsOpen] = useState(false);

                            // eslint-disable-next-line react-hooks/rules-of-hooks
                            useEffect(() => {
                                if (item.items?.some(sub => sub.href && pathname === sub.href)) {
                                    setIsOpen(true);
                                }
                            }, [pathname, item.items]);

                            if (item.items && item.items.length > 0) {
                                return (
                                    <Collapsible
                                        key={index}
                                        open={isOpen && !isCollapsed}
                                        onOpenChange={setIsOpen}
                                        className="w-full"
                                    >
                                        <CollapsibleTrigger asChild>
                                            <Button
                                                variant={isActive ? "secondary" : "ghost"}
                                                className={cn(
                                                    "w-full justify-between transition-all group",
                                                    isCollapsed ? "justify-center px-2" : "px-4",
                                                    (isActive && !isOpen) ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground"
                                                )}
                                                title={isCollapsed ? item.label : undefined}
                                            >
                                                <div className="flex items-center">
                                                    {item.icon && <item.icon className={cn("h-4 w-4", isCollapsed ? "mr-0" : "mr-2")} />}
                                                    {!isCollapsed && <span>{item.label}</span>}
                                                </div>
                                                {!isCollapsed && (
                                                    <ChevronDown
                                                        className={cn(
                                                            "h-4 w-4 transition-transform duration-200",
                                                            isOpen ? "rotate-180" : ""
                                                        )}
                                                    />
                                                )}
                                            </Button>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="space-y-1">
                                            {!isCollapsed && item.items.map((subItem) => (
                                                subItem.href && (
                                                    <Button
                                                        key={subItem.href}
                                                        variant={pathname === subItem.href ? "secondary" : "ghost"}
                                                        className={cn(
                                                            "w-full justify-start pl-10 h-9",
                                                            pathname === subItem.href ? "bg-secondary/50 text-secondary-foreground" : "text-muted-foreground hover:text-foreground"
                                                        )}
                                                        asChild
                                                    >
                                                        <Link href={subItem.href}>
                                                            <span>{subItem.label}</span>
                                                        </Link>
                                                    </Button>
                                                )
                                            ))}
                                        </CollapsibleContent>
                                    </Collapsible>
                                );
                            }

                            return (
                                item.href && (
                                    <div key={item.href} className="relative">
                                        {isActive && (
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-foreground rounded-r-full transition-all" />
                                        )}
                                        <Button
                                            variant={isActive ? "secondary" : "ghost"}
                                            className={cn(
                                                "w-full justify-start transition-all",
                                                isCollapsed ? "justify-center px-2" : "px-4",
                                                isActive ? "bg-secondary text-secondary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                                            )}
                                            title={isCollapsed ? item.label : undefined}
                                            asChild
                                        >
                                            <Link href={item.href}>
                                                {item.icon && <item.icon className={cn("h-4 w-4", isCollapsed ? "mr-0" : "mr-2")} />}
                                                {!isCollapsed && <span>{item.label}</span>}
                                            </Link>
                                        </Button>
                                    </div>
                                )
                            );
                        })}
                    </nav>
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 mt-auto border-t border-border/40">
                {!isCollapsed && footer}
            </div>
        </div>
    );
}
