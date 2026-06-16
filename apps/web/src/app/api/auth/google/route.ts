import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getAuthUrl } from "@/lib/googleCalendar";

/**
 * GET /api/auth/google
 * Redirects admin to Google OAuth consent screen.
 */
export async function GET() {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const url = getAuthUrl();
        return NextResponse.redirect(url);
    } catch (error: unknown) {
        return NextResponse.json(
            { error: (error instanceof Error ? error.message : String(error)) || "Google Calendar is not configured." },
            { status: 500 }
        );
    }
}
