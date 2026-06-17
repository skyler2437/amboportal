import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { EventDetails } from '@ambo/database';
import { DEMO_MODE, demoEvents } from '@/lib/demo';

export interface EventWithRsvp extends EventDetails {
  rsvpCounts?: { going: number; maybe: number };
  myRsvpStatus?: string | null;
  myRsvpOptionLabel?: string | null;
}

function useEventsReal(userId?: string) {
  const [events, setEvents] = useState<EventWithRsvp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);

  const fetchEvents = useCallback(async () => {
    // Only show loading spinner on initial load, not background refetches
    if (!hasLoadedOnce.current) setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from('events')
      .select('*, users!created_by(role), event_rsvps(status, user_id, rsvp_option_id), event_rsvp_options(id, label)')
      .order('start_time', { ascending: true });

    if (err) {
      setError(err.message);
    } else {
      const enriched: EventWithRsvp[] = ((data || []) as any[]).map((event) => {
        const rsvps: { status: string; user_id: string; rsvp_option_id: string | null }[] = event.event_rsvps || [];
        const options: { id: string; label: string }[] = event.event_rsvp_options || [];
        const going = rsvps.filter((r) => r.status === 'going').length;
        const maybe = rsvps.filter((r) => r.status === 'maybe').length;
        const myRsvp = userId ? rsvps.find((r) => r.user_id === userId) : null;

        // Resolve option label for the user's RSVP (e.g. "HS")
        let myOptionLabel: string | null = null;
        if (myRsvp?.rsvp_option_id) {
          const opt = options.find((o) => o.id === myRsvp.rsvp_option_id);
          if (opt) myOptionLabel = opt.label;
        }

        // Remove raw arrays from the spread
        const { event_rsvps, event_rsvp_options, ...rest } = event;

        return {
          ...rest,
          rsvpCounts: { going, maybe },
          myRsvpStatus: myRsvp?.status || null,
          myRsvpOptionLabel: myOptionLabel,
        };
      });
      setEvents(enriched);
    }
    hasLoadedOnce.current = true;
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { events, loading, error, refetch: fetchEvents };
}

function useEventsDemo(_userId?: string) {
  return {
    events: demoEvents as unknown as EventWithRsvp[],
    loading: false,
    error: null as string | null,
    refetch: async () => {},
  };
}

export const useEvents = DEMO_MODE ? useEventsDemo : useEventsReal;
