import { google, calendar_v3 } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { createAdminClient } from "@ambo/database/admin-client";

// ─── Config ──────────────────────────────────────────────
const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];
const TOKEN_KEY = "google_calendar_tokens";

function getOAuth2Client(): OAuth2Client {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    if (!clientId || !clientSecret) {
        throw new Error(
            "Google Calendar integration is not configured. " +
            "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables."
        );
    }
    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

// ─── Auth helpers ────────────────────────────────────────
export function getAuthUrl(): string {
    const client = getOAuth2Client();
    return client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: SCOPES,
    });
}

export async function exchangeCodeForTokens(code: string) {
    const client = getOAuth2Client();
    const { tokens } = await client.getToken(code);

    // Store tokens in DB
    const supabase = createAdminClient();
    await supabase.from("system_settings").upsert({
        key: TOKEN_KEY,
        value: tokens,
        updated_at: new Date().toISOString(),
    });

    return tokens;
}

export async function disconnect(): Promise<void> {
    const supabase = createAdminClient();
    await supabase
        .from("system_settings")
        .delete()
        .eq("key", TOKEN_KEY);
}

export async function isConnected(): Promise<boolean> {
    try {
        const supabase = createAdminClient();
        const { data, error } = await supabase
            .from("system_settings")
            .select("value")
            .eq("key", TOKEN_KEY)
            .single();

        if (error) {
            console.log("[GCal] isConnected check failed:", error.message);
            return false;
        }

        return !!data?.value;
    } catch (err) {
        console.error("[GCal] isConnected threw:", err);
        return false;
    }
}

async function getAuthenticatedClient(): Promise<OAuth2Client> {
    const client = getOAuth2Client();
    const supabase = createAdminClient();

    const { data } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", TOKEN_KEY)
        .single();

    if (!data?.value) {
        throw new Error("No tokens found");
    }

    const tokens = data.value;
    client.setCredentials(tokens);

    // Persist refreshed tokens automatically
    client.on("tokens", async (newTokens) => {
        const merged = { ...tokens, ...newTokens };
        await supabase.from("system_settings").upsert({
            key: TOKEN_KEY,
            value: merged,
            updated_at: new Date().toISOString(),
        });
    });

    return client;
}

async function getCalendar(): Promise<calendar_v3.Calendar> {
    const auth = await getAuthenticatedClient();
    return google.calendar({ version: "v3", auth });
}

// ─── Event mapping ───────────────────────────────────────
// ─── Event mapping ───────────────────────────────────────
export type AppEvent = {
    id?: string;
    title: string;
    description?: string | null;
    start_time: string;
    end_time: string;
    location?: string | null;
    type?: string | null;
    uniform?: string | null;
    google_calendar_event_id?: string | null;
    rsvps?: {
        yes: string[];
        maybe: string[];
        no: string[];
    };
};

export function buildGoogleEvent(
    event: AppEvent
): calendar_v3.Schema$Event {
    // Build a rich description with event type and uniform info
    let description = event.description || "";
    if (event.type) {
        description = `[${event.type}]\n${description}`;
    }
    if (event.uniform) {
        description += `\n\n👔 Uniform: ${event.uniform}`;
    }

    if (event.rsvps) {
        description += `\n\n📊 RSVPs:`;
        if (event.rsvps.yes.length > 0) {
            description += `\n✅ Yes (${event.rsvps.yes.length}): ${event.rsvps.yes.join(", ")}`;
        }
        if (event.rsvps.maybe.length > 0) {
            description += `\n❓ Maybe (${event.rsvps.maybe.length}): ${event.rsvps.maybe.join(", ")}`;
        }
        if (event.rsvps.no.length > 0) {
            description += `\n❌ No (${event.rsvps.no.length}): ${event.rsvps.no.join(", ")}`;
        }
        if (event.rsvps.yes.length === 0 && event.rsvps.maybe.length === 0 && event.rsvps.no.length === 0) {
            description += `\n(No RSVPs yet)`;
        }
    }

    return {
        summary: event.title,
        description: description.trim() || undefined,
        location: event.location || undefined,
        start: {
            dateTime: new Date(event.start_time).toISOString(),
            timeZone: "America/Los_Angeles",
        },
        end: {
            dateTime: new Date(event.end_time).toISOString(),
            timeZone: "America/Los_Angeles",
        },
    };
}

// ─── CRUD ────────────────────────────────────────────────
const calendarId = () => process.env.GOOGLE_CALENDAR_ID || "primary";

/**
 * Fetches the latest event data + RSVPs and syncs to Google Calendar.
 * Call this after any event update or RSVP change.
 *
 * Returns { synced: true } on success, or { synced: false, reason: string }
 * on failure so callers can surface the issue to the user.
 */
export async function syncEventToGoogle(
    eventId: string
): Promise<{ synced: boolean; reason?: string }> {
    // 1. Check connection
    const connected = await isConnected();
    if (!connected) {
        const msg = "Google Calendar is not connected. Please reconnect in Admin → Settings.";
        console.warn("[GCal] Not connected — skipping sync for event", eventId);
        return { synced: false, reason: msg };
    }

    // 2. Fetch event from DB
    const supabase = createAdminClient();
    const { data: event, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

    if (eventError || !event) {
        const msg = `Event not found in DB: ${eventError?.message || "no data"}`;
        console.error("[GCal]", msg);
        return { synced: false, reason: msg };
    }

    // 2b. If no Google Calendar event exists yet, create one on-demand
    let googleEventId = event.google_calendar_event_id as string | null;
    if (!googleEventId) {
        console.log("[GCal] No google_calendar_event_id — creating GCal event on-demand for", eventId);
        try {
            googleEventId = await createCalendarEvent({
                title: event.title,
                description: event.description,
                start_time: event.start_time,
                end_time: event.end_time,
                type: event.type,
                uniform: event.uniform,
            });

            if (googleEventId) {
                await supabase
                    .from("events")
                    .update({ google_calendar_event_id: googleEventId })
                    .eq("id", eventId);
                console.log("[GCal] Created GCal event:", googleEventId, "for event", eventId);
            } else {
                const msg = "Failed to create Google Calendar event (API returned null).";
                console.error("[GCal]", msg);
                return { synced: false, reason: msg };
            }
        } catch (err: unknown) {
            const msg = `Failed to create GCal event: ${err instanceof Error ? err.message : String(err)}`;
            console.error("[GCal]", msg);
            return { synced: false, reason: msg };
        }
    }

    // 3. Fetch RSVPs (non-fatal — sync event details even if RSVPs fail)
    let rsvpSummary = { yes: [] as string[], maybe: [] as string[], no: [] as string[] };
    const { data: rsvps, error: rsvpError } = await supabase
        .from("event_rsvps")
        .select("status, users!user_id(first_name, last_name)")
        .eq("event_id", eventId);

    if (rsvpError) {
        // Log but don't abort — still sync the event details
        console.warn("[GCal] Failed to fetch RSVPs (will sync without them):", rsvpError.message);
    } else {
        rsvps?.forEach((row: any) => {
            const name = `${row.users?.first_name || ""} ${row.users?.last_name || ""}`.trim();
            if (!name) return;
            if (row.status === "going" || row.status === "yes") rsvpSummary.yes.push(name);
            else if (row.status === "maybe") rsvpSummary.maybe.push(name);
            else if (row.status === "no") rsvpSummary.no.push(name);
        });
    }

    // 4. Update Google Calendar
    const { success, error: gcalError } = await updateCalendarEvent(googleEventId, {
        ...event,
        google_calendar_event_id: googleEventId,
        rsvps: rsvpSummary,
    });

    if (success) {
        console.log("[GCal] ✅ Synced event", eventId, "→ GCal", googleEventId, "— RSVPs:", {
            going: rsvpSummary.yes.length,
            maybe: rsvpSummary.maybe.length,
            no: rsvpSummary.no.length,
        });
        return { synced: true };
    } else {
        const msg = `Google Calendar API update failed: ${gcalError || "unknown error"}`;
        console.error("[GCal] ❌", msg);
        return { synced: false, reason: msg };
    }
}

export async function createCalendarEvent(
    event: AppEvent
): Promise<string | null> {
    // Check connection first (async)
    if (!(await isConnected())) return null;

    try {
        const calendar = await getCalendar();
        const res = await calendar.events.insert({
            calendarId: calendarId(),
            requestBody: buildGoogleEvent(event),
        });
        return res.data.id || null;
    } catch (err) {
        console.error("[GCal] Failed to create event:", err);
        return null;
    }
}

export async function updateCalendarEvent(
    googleEventId: string,
    event: AppEvent
): Promise<{ success: boolean; error?: string }> {
    if (!(await isConnected())) {
        return { success: false, error: "Not connected to Google Calendar" };
    }

    try {
        const calendar = await getCalendar();
        const body = buildGoogleEvent(event);
        console.log("[GCal] PATCH", calendarId(), googleEventId, JSON.stringify({
            summary: body.summary,
            start: body.start?.dateTime,
            end: body.end?.dateTime,
        }));
        await calendar.events.patch({
            calendarId: calendarId(),
            eventId: googleEventId,
            requestBody: body,
        });
        return { success: true };
    } catch (err: unknown) {
        // Extract the most useful error info from the Google API error
        const gErr = err as {
            response?: { status?: number; data?: { error?: { message?: string } } };
            code?: number;
            message?: string;
        };
        const status = gErr?.response?.status || gErr?.code;
        const message = gErr?.response?.data?.error?.message || gErr?.message || String(err);
        const detail = `[${status || "???"}] ${message}`;
        console.error("[GCal] Failed to update event:", detail);

        // Surface specific actionable messages
        if (status === 401 || status === 403) {
            return { success: false, error: `Auth error (${status}): ${message}. Google Calendar tokens may have expired — try reconnecting.` };
        }
        if (status === 404) {
            return { success: false, error: `Event not found on Google Calendar (404). It may have been deleted from Google Calendar directly.` };
        }
        return { success: false, error: detail };
    }
}

export async function deleteCalendarEvent(
    googleEventId: string
): Promise<boolean> {
    if (!(await isConnected())) return false;

    try {
        const calendar = await getCalendar();
        await calendar.events.delete({
            calendarId: calendarId(),
            eventId: googleEventId,
        });
        return true;
    } catch (err) {
        console.error("[GCal] Failed to delete event:", err);
        return false;
    }
}
