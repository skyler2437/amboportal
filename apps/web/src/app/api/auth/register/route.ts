import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@ambo/database/admin-client";
import { setSessionCookie } from "@/lib/session";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const rateKey = getRateLimitKey(req, "register");
    const { allowed, resetIn } = await checkRateLimit(rateKey, { maxRequests: 5, windowSeconds: 3600 });
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(resetIn) } }
      );
    }

    const { firstName, lastName, email, phone, password } = await req.json();

    if (!firstName || !lastName || !email || !phone || !password) {
      return NextResponse.json(
        { error: "All fields are required." },
        { status: 400 }
      );
    }

    // Validate phone: exactly 10 digits
    if (!/^\d{10}$/.test(phone)) {
      return NextResponse.json(
        { error: "Phone number must be exactly 10 digits." },
        { status: 400 }
      );
    }

    // Validate email format
    const emailLower = email.toLowerCase().trim();
    if (!emailLower.includes("@")) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check if email already exists in our users table
    const { data: existingEmail } = await supabase
      .from("users")
      .select("id")
      .eq("email", emailLower)
      .single();

    if (existingEmail) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // Check if phone number already exists BEFORE creating the auth user.
    // This prevents orphaned auth records when the users-table insert fails
    // on the phone uniqueness constraint.
    const { data: existingPhone } = await supabase
      .from("users")
      .select("id")
      .eq("phone", phone)
      .single();

    if (existingPhone) {
      return NextResponse.json(
        { error: "An account with this phone number already exists." },
        { status: 409 }
      );
    }

    // Create Supabase Auth user so password-reset emails work.
    // We use its auto-generated UUID as the users.id so the two stay in sync.
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: emailLower,
      password,
      email_confirm: true,
    });

    if (authError) {
      console.error("Auth user creation error:", authError);
      return NextResponse.json(
        { error: "Failed to create account. Please try again." },
        { status: 500 }
      );
    }

    // Hash password for our custom bcrypt login
    const passwordHash = await bcrypt.hash(password, 12);

    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert({
        id: authData.user.id, // Match Supabase Auth UUID so callback lookup works
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: emailLower,
        phone,
        password_hash: passwordHash,
        role: "basic",
      })
      .select("id, role")
      .single();

    if (insertError) {
      // Clean up the orphaned Supabase Auth user so the email can be reused
      await supabase.auth.admin.deleteUser(authData.user.id);
      console.error("Registration insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to create account. Please try again." },
        { status: 500 }
      );
    }

    // Auto-login: set session cookie immediately
    await setSessionCookie({
      userId: newUser.id,
      role: "basic",
    });

    return NextResponse.json({ redirect: "/apply" });
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
