import { createAdminClient } from "@ambo/database/admin-client";
import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase = createAdminClient();
        const { data: users, error } = await supabase
            .from("users")
            .select("id, first_name, last_name, role, email, avatar_url");

        if (error) {
            console.error("Error fetching users:", error);
            return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
        }

        return NextResponse.json({ users });
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
