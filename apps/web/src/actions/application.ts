"use server";

import { adminClient } from "@ambo/database/admin-client";
import { ApplicationData } from "@ambo/database/application-types";
import { v4 as uuidv4 } from 'uuid';
import { getSession } from "@/lib/session";
import {
    canAccessApplication,
    setApplicationCookie,
} from "@/lib/application-auth";

// Server actions are public RPC endpoints (they ship in the client bundle),
// so every export here must authorize the caller itself. Application access
// is granted by an admin session, a session whose users.phone matches, or
// the application token minted when the draft was created (see
// lib/application-auth.ts).

const APPLICATION_EXISTS_ERROR =
    "An application already exists for this phone number. Continue on the device where you started it, or contact the Ambassador Coordinator.";

// Columns the applicant may write. status, transcript_url, and timestamps
// are server-managed.
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

function pickWritableFields(data: Partial<ApplicationData>) {
    const payload: Record<string, unknown> = {};
    for (const field of WRITABLE_FIELDS) {
        if (data[field] !== undefined) payload[field] = data[field];
    }
    return payload;
}

async function requireSelfOrAdmin(userId: string) {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");
    const isAdmin = session.role === "admin" || session.role === "superadmin";
    if (session.userId !== userId && !isAdmin) {
        throw new Error("Unauthorized");
    }
    return session;
}

export async function getActualUserRole(userId: string): Promise<string | null> {
    await requireSelfOrAdmin(userId);
    const supabase = adminClient;

    const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", userId)
        .single();

    if (error || !data) {
        console.error("Error fetching user role:", error);
        return null;
    }

    return data.role;
}

export type ApplicationLookupResult = {
    application: ApplicationData | null;
    /** True when an application exists for this phone but the caller may not read it. */
    exists: boolean;
};

export async function getApplicationByPhone(phone: string): Promise<ApplicationLookupResult> {
    const supabase = adminClient;

    if (!phone) return { application: null, exists: false };

    const { data, error } = await supabase
        .from("applications")
        .select("*")
        .eq("phone_number", phone)
        .maybeSingle();

    if (error) {
        console.error("Error fetching application:", error);
        throw new Error("Failed to fetch application");
    }

    if (!data) return { application: null, exists: false };

    if (!(await canAccessApplication(phone))) {
        return { application: null, exists: true };
    }

    return { application: data as ApplicationData, exists: true };
}

export async function saveApplicationStep(data: Partial<ApplicationData>) {
    const supabase = adminClient;

    const phone = data.phone_number;
    if (!phone) {
        throw new Error("Phone number is required to save progress.");
    }

    const { data: existing, error: lookupError } = await supabase
        .from("applications")
        .select("id")
        .eq("phone_number", phone)
        .maybeSingle();

    if (lookupError) {
        console.error("Error saving application:", lookupError);
        throw new Error("Failed to save application");
    }

    const payload = {
        ...pickWritableFields(data),
        updated_at: new Date().toISOString(),
    };

    if (existing) {
        if (!(await canAccessApplication(phone))) {
            throw new Error(APPLICATION_EXISTS_ERROR);
        }

        const { error } = await supabase
            .from("applications")
            .update(payload)
            .eq("phone_number", phone);

        if (error) {
            console.error("Error saving application:", error);
            throw new Error("Failed to save application");
        }

        return { success: true };
    }

    // First save: create the draft and set the application cookie that
    // authorizes the rest of this browser's session.
    const { error } = await supabase
        .from("applications")
        .insert({ ...payload, phone_number: phone, status: "draft" });

    if (error) {
        console.error("Error saving application:", error);
        throw new Error("Failed to save application");
    }

    await setApplicationCookie(phone);
    return { success: true };
}

export async function submitApplication(phone: string) {
    if (!phone) throw new Error("Phone number is required");
    if (!(await canAccessApplication(phone))) {
        throw new Error("Unauthorized");
    }

    const supabase = adminClient;

    // Only drafts (or re-submits) may transition to submitted — never an
    // application an admin has already approved or rejected.
    const { error } = await supabase
        .from("applications")
        .update({ status: "submitted", updated_at: new Date().toISOString() })
        .eq("phone_number", phone)
        .in("status", ["draft", "submitted"]);

    if (error) {
        console.error("Error submitting application:", error);
        throw new Error("Failed to submit application");
    }

    // Promote any basic user with this phone number to applicant
    await supabase
        .from("users")
        .update({ role: "applicant" })
        .eq("phone", phone)
        .eq("role", "basic");

    return { success: true };
}

export async function submitApplicationForUser(userId: string) {
    const session = await getSession();
    if (!session || session.userId !== userId) {
        throw new Error("Unauthorized");
    }

    const supabase = adminClient;

    // Update user role from basic to applicant
    const { error } = await supabase
        .from("users")
        .update({ role: "applicant" })
        .eq("id", userId)
        .eq("role", "basic");

    if (error) {
        console.error("Error promoting user to applicant:", error);
        throw new Error("Failed to submit application");
    }

    return { success: true };
}

export async function getUserData(userId: string) {
    await requireSelfOrAdmin(userId);
    const supabase = adminClient;

    const { data, error } = await supabase
        .from("users")
        .select("first_name, last_name, phone, email")
        .eq("id", userId)
        .single();

    if (error) {
        console.error("Error fetching user data:", error);
        throw new Error("Failed to fetch user data");
    }

    return data as { first_name: string; last_name: string; phone: string; email: string };
}

export async function getApplicationByUserId(userId: string) {
    await requireSelfOrAdmin(userId);
    const supabase = adminClient;

    // First get the user's phone number
    const { data: user, error: userError } = await supabase
        .from("users")
        .select("phone")
        .eq("id", userId)
        .single();

    if (userError || !user?.phone) {
        return null;
    }

    // Then look up application by phone
    const { data, error } = await supabase
        .from("applications")
        .select("*")
        .eq("phone_number", user.phone)
        .single();

    if (error && error.code !== "PGRST116") {
        console.error("Error fetching application:", error);
        throw new Error("Failed to fetch application");
    }

    return data as ApplicationData | null;
}

export async function deleteApplication(phone: string) {
    const supabase = adminClient;

    if (!phone) {
        throw new Error("Phone number is required");
    }

    if (!(await canAccessApplication(phone))) {
        throw new Error("Unauthorized");
    }

    const { data: app } = await supabase
        .from("applications")
        .select("status, transcript_url")
        .eq("phone_number", phone)
        .maybeSingle();

    if (!app) return { success: true };

    // Applicants may only restart drafts; removing a submitted/reviewed
    // application is an admin decision.
    const session = await getSession();
    const isAdmin =
        session?.role === "admin" || session?.role === "superadmin";
    if (app.status !== "draft" && !isAdmin) {
        throw new Error("Only draft applications can be restarted");
    }

    // Delete any uploaded transcript files first
    if (app.transcript_url) {
        const fileName = app.transcript_url.split("/").pop();
        if (fileName) {
            await supabase.storage.from("transcripts").remove([fileName]);
        }
    }

    const { error } = await supabase
        .from("applications")
        .delete()
        .eq("phone_number", phone);

    if (error) {
        console.error("Error deleting application:", error);
        throw new Error("Failed to delete application");
    }

    return { success: true };
}

export async function uploadTranscript(formData: FormData) {
    const supabase = adminClient;
    const file = formData.get("file") as File;
    const phone = formData.get("phone") as string;

    if (!file || !phone) {
        throw new Error("File and Phone Number are required");
    }

    if (!(await canAccessApplication(phone))) {
        throw new Error("Unauthorized");
    }

    // Validate file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
        throw new Error("File too large (max 20MB)");
    }

    // Validate file type by magic bytes (PDF: %PDF)
    const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
    const isPdf = header[0] === 0x25 && header[1] === 0x50 &&
                  header[2] === 0x44 && header[3] === 0x46; // %PDF
    if (!isPdf) {
        throw new Error("Transcript must be a PDF file");
    }

    // The storage key must come from server-controlled values only.
    const safePhone = phone.replace(/\D/g, "");
    const fileName = `${safePhone}_transcript_${uuidv4()}.pdf`;

    const { error } = await supabase.storage
        .from("transcripts")
        .upload(fileName, file);

    if (error) {
        console.error("Error uploading file:", error);
        throw new Error("Failed to upload transcript");
    }

    // The bucket is private: persist the object path server-side; admin
    // review mints short-lived signed URLs from it.
    const { error: saveError } = await supabase
        .from("applications")
        .upsert(
            {
                phone_number: phone,
                transcript_url: fileName,
                updated_at: new Date().toISOString(),
            },
            { onConflict: "phone_number" }
        );

    if (saveError) {
        console.error("Error saving transcript path:", saveError);
        throw new Error("Failed to save transcript");
    }

    return { path: fileName };
}
