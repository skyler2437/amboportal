import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createAdminClient } from "@ambo/database/admin-client";
import bcrypt from "bcryptjs";

/**
 * POST /api/auth/change-password
 *
 * Cookie-session change password for web. If the user already has a password
 * hash, the current password must be supplied and will be verified. If no
 * hash exists (magic-link-only account), allows setting one for the first time.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { currentPassword, newPassword } = body;

  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json(
      { error: "New password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: userRow } = await admin
    .from("users")
    .select("password_hash")
    .eq("id", session.userId)
    .single();

  const hasPassword = !!userRow?.password_hash;

  if (hasPassword) {
    if (!currentPassword) {
      return NextResponse.json(
        { error: "Current password is required." },
        { status: 400 }
      );
    }
    const valid = await bcrypt.compare(currentPassword, userRow.password_hash);
    if (!valid) {
      return NextResponse.json(
        { error: "Current password is incorrect." },
        { status: 403 }
      );
    }
  }

  const { error: authUpdateError } = await admin.auth.admin.updateUserById(
    session.userId,
    { password: newPassword }
  );

  if (authUpdateError) {
    console.error("[change-password] Auth update failed:", authUpdateError);
    return NextResponse.json(
      { error: "Failed to update password." },
      { status: 500 }
    );
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  const { error: dbError } = await admin
    .from("users")
    .update({ password_hash: newHash })
    .eq("id", session.userId);

  if (dbError) {
    console.error("[change-password] DB update failed:", dbError);
    return NextResponse.json(
      { error: "Failed to update password." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

/**
 * GET /api/auth/change-password
 *
 * Returns whether the current user has a password set. Used by the
 * ChangePasswordForm to decide whether to show the current-password input.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: userRow } = await admin
    .from("users")
    .select("password_hash")
    .eq("id", session.userId)
    .single();

  return NextResponse.json({ hasPassword: !!userRow?.password_hash });
}
