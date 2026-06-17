import { NextResponse } from "next/server";
import { createAdminClient } from "@ambo/database/admin-client";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/events/[id]/gcal-sync
 *
 * Triggers a Google Calendar sync for the given event.
 * Accepts either:
 *   - The standard ambo_session cookie (web app)
 *   - A Supabase access token via Authorization: Bearer <token> (mobile app)
 */
export async function POST(
    _req: Request,
    { params }: { params: { id: string } }
) {
    const eventId = params.id;
    if (!eventId) {
        return NextResponse.json({ error: "Missing event ID" }, { status: 400 });
    }

    // Authenticate: try ambo_session first, then Supabase JWT
    let authenticated = false;

    // 1. Try web session
    try {
        const { getSession } = await import("@/lib/session");
        const session = await getSession();
        if (session?.userId) authenticated = true;
    } catch {
        // session module may throw if no cookie
    }

    // 2. Try Supabase Bearer token (mobile app)
    if (!authenticated) {
        const authHeader = _req.headers.get("authorization");
        const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
        if (token) {
            try {
                const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
                const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
                const supabase = createClient(supabaseUrl, supabaseServiceKey);
                const { data } = await supabase.auth.getUser(token);
                if (data?.user) authenticated = true;
            } catch {
                // invalid token
            }
        }
    }

    if (!authenticated) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Trigger sync
    try {
        const { syncEventToGoogle } = await import("@/lib/googleCalendar");
        console.log("[gcal-sync] Triggering sync for event:", eventId);

        const result = await syncEventToGoogle(eventId);
        console.log("[gcal-sync] Result:", JSON.stringify(result));

        return NextResponse.json(result);
    } catch (err: unknown) {
        console.error("[gcal-sync] Failed:", err);
        return NextResponse.json(
            { synced: false, reason: `Sync error: ${err instanceof Error ? err.message : String(err)}` },
            { status: 500 }
        );
    }
}
