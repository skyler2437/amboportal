import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { isConnected, disconnect } from "@/lib/googleCalendar";

/**
 * GET /api/auth/google/status
 * Returns whether Google Calendar is connected (org-wide admin calendar).
 */
export async function GET() {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ connected: await isConnected() });
}

/**
 * DELETE /api/auth/google/status
 * Disconnects Google Calendar by removing stored tokens.
 */
export async function DELETE() {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        await disconnect();
        return NextResponse.json({ success: true });
    } catch (err: unknown) {
        return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
}
