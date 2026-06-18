import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { createAdminClient } from "@ambo/database/admin-client";
import { SpaceInvaders } from "@/components/invaders/SpaceInvaders";

export const metadata = {
    title: "▟▙ INVADERS ▟▙",
};

// Root-level route → rendered outside the /student and /admin layouts, so it
// has no header and fills the screen. Middleware already requires a session.
export default async function PlayPage() {
    const session = await getSession();
    if (!session) redirect("/login");

    const supabase = createAdminClient();
    const { data: user } = await supabase
        .from("users")
        .select("first_name, last_name")
        .eq("id", session.userId)
        .single();

    const playerName =
        [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim() ||
        "Player";

    // The discreet exit returns players to their own dashboard.
    const homeHref =
        session.role === "admin" || session.role === "superadmin"
            ? "/admin"
            : "/student";

    return <SpaceInvaders playerName={playerName} homeHref={homeHref} />;
}
