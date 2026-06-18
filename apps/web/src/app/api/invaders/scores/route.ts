import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createAdminClient } from "@ambo/database/admin-client";

const TOP_N = 15;
const MAX_SCORE = 1_000_000;

// GET → the top 15 personal-best scores, highest first.
export async function GET() {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
        .from("invaders_scores")
        .select("player_name, score, updated_at")
        .order("score", { ascending: false })
        .order("updated_at", { ascending: true })
        .limit(TOP_N);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ scores: data ?? [] });
}

// POST { score } → record the score as the player's personal best (only when
// it beats their current best). The name shown comes from their account.
export async function POST(req: Request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const rawScore = (body as { score?: unknown })?.score;
    const score = typeof rawScore === "number" ? Math.floor(rawScore) : NaN;
    if (!Number.isFinite(score) || score < 0 || score > MAX_SCORE) {
        return NextResponse.json({ error: "Invalid score" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Derive the leaderboard display name from the player's account.
    const { data: user } = await supabase
        .from("users")
        .select("first_name, last_name")
        .eq("id", session.userId)
        .single();

    const playerName =
        [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim() ||
        "Anonymous";

    // Keep only each player's best score.
    const { data: existing } = await supabase
        .from("invaders_scores")
        .select("score")
        .eq("user_id", session.userId)
        .maybeSingle();

    const previousBest = existing?.score ?? 0;
    const isNewBest = score > previousBest;

    if (isNewBest) {
        const { error: upsertError } = await supabase
            .from("invaders_scores")
            .upsert(
                {
                    user_id: session.userId,
                    player_name: playerName,
                    score,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: "user_id" }
            );
        if (upsertError) {
            return NextResponse.json({ error: upsertError.message }, { status: 500 });
        }
    }

    return NextResponse.json({
        ok: true,
        best: isNewBest ? score : previousBest,
        isNewBest,
    });
}
