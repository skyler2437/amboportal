import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createAdminClient } from "@ambo/database/admin-client";

export async function POST(req: Request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { event_id, status, rsvp_option_id } = await req.json();
    if (!event_id || !status) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("event_rsvps").upsert(
        {
            event_id,
            user_id: session.userId,
            status,
            ...(rsvp_option_id !== undefined && { rsvp_option_id }),
        },
        { onConflict: "event_id,user_id" }
    );

    if (error) {
        return NextResponse.json({ error: "Request failed" }, { status: 400 });
    }

    // Sync to Google Calendar
    try {
        const { syncEventToGoogle } = await import("@/lib/googleCalendar");
        // Run in background
        syncEventToGoogle(event_id).catch(console.error);
    } catch (e) {
        console.error("Failed to sync RSVP to GCal:", e);
    }

    // Return updated list. rsvp_option_id must be included — the modal keys
    // the selected custom option and per-option attendee lists on it.
    const { data } = await supabase
        .from("event_rsvps")
        .select("status, user_id, rsvp_option_id, users(first_name, last_name)")
        .eq("event_id", event_id);

    return NextResponse.json({ rsvps: data || [] });
}
