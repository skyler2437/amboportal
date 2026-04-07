import { createAdminClient } from "@ambo/database/admin-client";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

/**
 * Verify a Supabase Bearer token from the mobile app.
 * Returns the authenticated user's ID or null.
 */
async function getAuthenticatedUserId(
    req: NextRequest
): Promise<string | null> {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;

    const token = authHeader.slice(7);
    const supabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.EXPO_PUBLIC_SUPABASE_URL ||
        "";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

    if (!supabaseUrl || !supabaseAnonKey) return null;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user.id;
}

/**
 * POST /api/mobile/push-token
 * Register or update a mobile push token.
 */
export async function POST(req: NextRequest) {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { token: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json(
            { error: "Invalid JSON" },
            { status: 400 }
        );
    }

    const { token } = body;
    if (!token) {
        return NextResponse.json(
            { error: "token is required" },
            { status: 400 }
        );
    }

    if (!token.startsWith("ExponentPushToken[")) {
        return NextResponse.json(
            { error: "Invalid Expo push token format" },
            { status: 400 }
        );
    }

    const supabase = createAdminClient();

    // Upsert into expo_push_tokens (unique on token)
    const { error } = await supabase
        .from("expo_push_tokens")
        .upsert(
            { user_id: userId, token },
            { onConflict: "token" }
        );

    if (error) {
        console.error("[mobile/push-token] Upsert failed:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }

    return NextResponse.json({ success: true });
}

/**
 * DELETE /api/mobile/push-token
 * Remove a mobile push token (e.g. on logout).
 */
export async function DELETE(req: NextRequest) {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { token: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json(
            { error: "Invalid JSON" },
            { status: 400 }
        );
    }

    const { token } = body;
    if (!token) {
        return NextResponse.json(
            { error: "token is required" },
            { status: 400 }
        );
    }

    const supabase = createAdminClient();

    await supabase
        .from("expo_push_tokens")
        .delete()
        .eq("user_id", userId)
        .eq("token", token);

    return NextResponse.json({ success: true });
}
