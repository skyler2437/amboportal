import { createAdminClient } from "@ambo/database/admin-client";
import { NextRequest, NextResponse } from "next/server";
import {
  canAccessApplication,
  createApplicationToken,
  APPLICATION_COOKIE,
} from "@/lib/application-auth";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { checkContentLength } from "@/lib/validations";

// Columns the applicant may write. Everything else (id, status,
// transcript_url, timestamps) is server-managed: status changes only via
// /api/applications/submit or admin review, transcript_url only via the
// authenticated upload path.
const WRITABLE_FIELDS = [
  "current_step",
  "first_name",
  "last_name",
  "email",
  "grade_current",
  "grade_entry",
  "gpa",
  "referrer_academic_name",
  "referrer_academic_email",
  "referrer_bible_name",
  "referrer_bible_email",
  "q_involvement",
  "q_why_ambassador",
  "q_faith",
  "q_love_linfield",
  "q_change_linfield",
  "q_family_decision",
  "q_strengths",
  "q_weaknesses",
  "q_time_commitment",
] as const;

const EXISTS_ERROR =
  "An application already exists for this phone number. Continue on the device where you started it, or contact the Ambassador Coordinator.";

function pickWritableFields(body: Record<string, unknown>) {
  const payload: Record<string, unknown> = {};
  for (const field of WRITABLE_FIELDS) {
    if (body[field] !== undefined) payload[field] = body[field];
  }
  return payload;
}

export async function GET(request: NextRequest) {
  const rateKey = getRateLimitKey(request, "applications-get");
  const { allowed, resetIn } = await checkRateLimit(rateKey, {
    maxRequests: 30,
    windowSeconds: 900,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(resetIn) } }
    );
  }

  const phone = request.nextUrl.searchParams.get("phone");
  if (!phone) {
    return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("phone_number", phone)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Failed to fetch application" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!(await canAccessApplication(phone))) {
    return NextResponse.json({ error: EXISTS_ERROR }, { status: 403 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const rateKey = getRateLimitKey(request, "applications-post");
  const { allowed, resetIn } = await checkRateLimit(rateKey, {
    maxRequests: 30,
    windowSeconds: 900,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(resetIn) } }
    );
  }

  const sizeError = checkContentLength(request);
  if (sizeError) {
    return NextResponse.json({ error: sizeError }, { status: 413 });
  }

  const body = await request.json();
  const phone = body.phone_number;

  if (!phone || !/^\d{10,}$/.test(phone)) {
    return NextResponse.json(
      { error: "A valid phone number (10+ digits) is required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { data: existing, error: lookupError } = await supabase
    .from("applications")
    .select("id")
    .eq("phone_number", phone)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json({ error: "Failed to save application" }, { status: 500 });
  }

  const payload = {
    ...pickWritableFields(body),
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    if (!(await canAccessApplication(phone))) {
      return NextResponse.json({ error: EXISTS_ERROR }, { status: 403 });
    }

    const { error } = await supabase
      .from("applications")
      .update(payload)
      .eq("phone_number", phone);

    if (error) {
      console.error("Error saving application:", error);
      return NextResponse.json({ error: "Failed to save application" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  // First save for this phone: create the draft and mint the application
  // token that authorizes the rest of this device's session (cookie for web,
  // response body for the mobile app).
  const { error } = await supabase
    .from("applications")
    .insert({ ...payload, phone_number: phone, status: "draft" });

  if (error) {
    console.error("Error saving application:", error);
    return NextResponse.json({ error: "Failed to save application" }, { status: 500 });
  }

  const token = await createApplicationToken(phone);
  const response = NextResponse.json({ success: true, application_token: token });
  response.cookies.set(APPLICATION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return response;
}
