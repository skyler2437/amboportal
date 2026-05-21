import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createAdminClient } from "@ambo/database/admin-client";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  // Re-fetch the role from the DB so a stale JWT (e.g. after a role change)
  // doesn't hide UI actions the user is actually allowed to perform.
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("users")
    .select("id, first_name, last_name, email, role")
    .eq("id", session.userId)
    .single();

  if (!data) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  return NextResponse.json({ user: data });
}
