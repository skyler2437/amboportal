import { createAdminClient } from "@ambo/database/admin-client";
import { NextRequest, NextResponse } from "next/server";
import { canAccessApplication } from "@/lib/application-auth";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const rateKey = getRateLimitKey(request, "applications-submit");
  const { allowed, resetIn } = await checkRateLimit(rateKey, {
    maxRequests: 10,
    windowSeconds: 900,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(resetIn) } }
    );
  }

  const body = await request.json();
  const phone = body.phone_number;

  if (!phone) {
    return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
  }

  if (!(await canAccessApplication(phone))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const supabase = createAdminClient();

  // Only drafts (or re-submits) may transition to submitted — never an
  // application an admin has already approved or rejected.
  const { error } = await supabase
    .from("applications")
    .update({ status: "submitted", updated_at: new Date().toISOString() })
    .eq("phone_number", phone)
    .in("status", ["draft", "submitted"]);

  if (error) {
    console.error("Error submitting application:", error);
    return NextResponse.json({ error: "Failed to submit application" }, { status: 500 });
  }

  // Promote any basic user with this phone number to applicant
  await supabase
    .from("users")
    .update({ role: "applicant" })
    .eq("phone", phone)
    .eq("role", "basic");

  return NextResponse.json({ success: true });
}
