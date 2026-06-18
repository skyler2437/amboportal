"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, CalendarDays, Clock, LayoutList, MapPin, RefreshCw, AlertTriangle, CheckCircle2, HelpCircle, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import type { EventDetails } from "@ambo/database/types";
import { tintForStatus } from "@/lib/eventColors";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import { EventMonthCalendar } from "@/components/EventMonthCalendar";

export type EventDetailsWithMyRsvp = EventDetails & {
    my_rsvp_status?: string | null;
    my_rsvp_option_id?: string | null;
};

type EventsView = "card" | "calendar";

const VIEW_STORAGE_KEY = "events_view_pref";

const RSVP_LABEL: Record<string, string> = {
    going: "Going",
    maybe: "Maybe",
    no: "Can't go",
};

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
};

export function EventCalendar({
    onEventClick,
    onRefreshRef,
}: {
    onEventClick: (e: EventDetails) => void;
    onRefreshRef?: (fn: () => void) => void;
}) {
    const [events, setEvents] = useState<EventDetailsWithMyRsvp[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const upcomingRef = useRef<HTMLDivElement>(null);

    // View preference: defaults to the month calendar on desktop. The calendar
    // is desktop-only; mobile always gets cards (see effectiveView below). A
    // stored user preference still wins over this default.
    const [view, setView] = useState<EventsView>("calendar");
    const isDesktop = useMediaQuery("(min-width: 768px)");
    const effectiveView = isDesktop ? view : "card";

    // Read the stored preference after mount to avoid an SSR hydration mismatch.
    useEffect(() => {
        try {
            const stored = localStorage.getItem(VIEW_STORAGE_KEY);
            if (stored === "card" || stored === "calendar") setView(stored);
        } catch {}
    }, []);

    const setViewPref = (v: EventsView) => {
        setView(v);
        try {
            localStorage.setItem(VIEW_STORAGE_KEY, v);
        } catch {}
    };

    const fetchEvents = async () => {
        try {
            const res = await fetch("/api/events");
            if (res.ok) {
                const data = await res.json();
                setEvents(data.events || []);
                setError(false);
            } else {
                setError(true);
            }
        } catch (e) {
            console.error("Failed to fetch events", e);
            setError(true);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchEvents();
        const interval = setInterval(fetchEvents, 30000);
        return () => clearInterval(interval);
    }, []);

    // Expose refresh function to parent
    useEffect(() => {
        onRefreshRef?.(fetchEvents);
    }, [onRefreshRef]);

    // Scroll to upcoming events after initial load (card view only)
    useEffect(() => {
        if (effectiveView !== "card") return;
        if (!loading && events.length > 0 && upcomingRef.current) {
            const timer = setTimeout(() => {
                upcomingRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                });
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [loading, events.length, effectiveView]);

    const grouped = events.reduce(
        (acc, ev) => {
            const date = new Date(ev.start_time).toDateString();
            if (!acc[date]) acc[date] = [];
            acc[date].push(ev);
            return acc;
        },
        {} as Record<string, EventDetailsWithMyRsvp[]>
    );

    // Determine the next upcoming date group for auto-scroll
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sortedDateKeys = Object.keys(grouped).sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );
    const nextUpcomingDateKey = sortedDateKeys.find(
        (dateStr) => new Date(dateStr) >= today
    ) || null;

    const typeColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
        tour: "default",
        meeting: "secondary",
        training: "outline",
        social: "default", // Maps to default for now, can be customized
        other: "secondary",
    };

    if (loading) {
        return (
            <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                ))}
            </div>
        );
    }

    if (error && events.length === 0) {
        return (
            <div className="text-center py-12 border rounded-xl bg-muted/30">
                <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3 text-red-500">
                    <AlertTriangle className="w-7 h-7" />
                </div>
                <h3 className="font-medium">Failed to load events</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">Please check your connection and try again.</p>
                <Button variant="outline" size="sm" onClick={fetchEvents}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                </Button>
            </div>
        );
    }

    const viewToggle = (
        <div className="hidden md:flex justify-end">
            <Tabs value={view} onValueChange={(v) => setViewPref(v as EventsView)}>
                <TabsList>
                    <TabsTrigger value="card" className="gap-1.5">
                        <LayoutList className="h-4 w-4" />
                        Cards
                    </TabsTrigger>
                    <TabsTrigger value="calendar" className="gap-1.5">
                        <CalendarDays className="h-4 w-4" />
                        Calendar
                    </TabsTrigger>
                </TabsList>
            </Tabs>
        </div>
    );

    if (effectiveView === "calendar") {
        return (
            // 8rem = TopNav (4rem) + the layout's md:p-8 top and bottom padding
            // (2rem each), so the calendar block fills the viewport exactly.
            <div className="flex h-[calc(100dvh-8rem)] min-h-[32rem] flex-col gap-4">
                {viewToggle}
                <div className="min-h-0 flex-1">
                    <EventMonthCalendar events={events} onEventClick={onEventClick} />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
        {viewToggle}
        <motion.div
            className="space-y-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {Object.entries(grouped)
                .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                .map(([date, evts]) => (
                <motion.div
                    key={date}
                    className="space-y-4"
                    variants={itemVariants}
                    ref={date === nextUpcomingDateKey ? upcomingRef : undefined}
                >
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                            {new Date(date).toLocaleDateString([], {
                                weekday: "long",
                                month: "long",
                                day: "numeric",
                            })}
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {evts.map((ev) => {
                            const tint = tintForStatus(ev.my_rsvp_status);
                            const hasTint = !!ev.my_rsvp_status;
                            const RsvpIcon = ev.my_rsvp_status === "going"
                                ? CheckCircle2
                                : ev.my_rsvp_status === "maybe"
                                ? HelpCircle
                                : ev.my_rsvp_status === "no"
                                ? XCircle
                                : null;
                            return (
                            <motion.div key={ev.id}>
                                <Card
                                    onClick={() => onEventClick(ev)}
                                    className="cursor-pointer transition-all duration-200 h-full overflow-hidden relative"
                                    style={hasTint ? { backgroundColor: tint.bg, borderColor: tint.border } : undefined}
                                >
                                    {hasTint && (
                                        <div
                                            aria-hidden
                                            className="absolute left-0 top-0 bottom-0 w-1"
                                            style={{ backgroundColor: tint.accent }}
                                        />
                                    )}
                                    <CardContent className={cn("p-4 space-y-3", hasTint && "pl-5")}>
                                        <div className="flex justify-between items-start gap-2">
                                            <h4 className="font-semibold line-clamp-1" title={ev.title}>{ev.title}</h4>
                                        </div>
                                        <div className="space-y-1.5 text-xs text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-3.5 w-3.5" />
                                                <span>
                                                    {new Date(ev.start_time).toLocaleTimeString([], {
                                                        hour: "numeric",
                                                        minute: "2-digit",
                                                    })}
                                                    {" - "}
                                                    {new Date(ev.end_time).toLocaleTimeString([], {
                                                        hour: "numeric",
                                                        minute: "2-digit",
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                        {hasTint && ev.my_rsvp_status ? (
                                            <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: tint.accent }}>
                                                {RsvpIcon && <RsvpIcon className="h-3.5 w-3.5" />}
                                                <span>{RSVP_LABEL[ev.my_rsvp_status] || ev.my_rsvp_status}</span>
                                            </div>
                                        ) : (
                                            <p className="line-clamp-2 text-sm text-muted-foreground mt-2 h-10">
                                                {ev.description || "\u00A0"}
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                            );
                        })}
                    </div>
                </motion.div >
            ))
            }
            {
                events.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        <Calendar className="h-10 w-10 mx-auto mb-3 opacity-20" />
                        <p className="font-medium">No upcoming events</p>
                        <p className="text-sm mt-1">Check back later for new events.</p>
                    </div>
                )
            }
        </motion.div >
        </div>
    );
}
