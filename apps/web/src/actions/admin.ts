"use server";

import { adminClient } from "@ambo/database/admin-client";
import { ApplicationData } from "@ambo/database/application-types";
import { getSession } from "@/lib/session";

async function requireAdminSession() {
    const session = await getSession();
    if (!session || !["admin", "superadmin"].includes(session.role)) {
        throw new Error("Forbidden: admin access required");
    }
    return session;
}

export async function getApplications() {
    await requireAdminSession();
    const supabase = adminClient;

    const { data, error } = await supabase
        .from("applications")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching applications:", error);
        throw new Error("Failed to fetch applications");
    }

    // The transcripts bucket is private: replace stored object paths (or
    // legacy public URLs) with short-lived signed URLs for the review UI.
    const applications = await Promise.all(
        (data as ApplicationData[]).map(async (app) => {
            if (!app.transcript_url) return app;
            const objectName = app.transcript_url.split("/").pop();
            if (!objectName) return { ...app, transcript_url: undefined };
            const { data: signed, error: signError } = await supabase.storage
                .from("transcripts")
                .createSignedUrl(objectName, 60 * 60); // 1 hour
            if (signError || !signed?.signedUrl) {
                console.error("Error signing transcript URL:", signError);
                return { ...app, transcript_url: undefined };
            }
            return { ...app, transcript_url: signed.signedUrl };
        })
    );

    return applications;
}

export async function updateApplicationStatus(id: string, status: string) {
    await requireAdminSession();
    const supabase = adminClient;

    const validStatuses = ["draft", "submitted", "under_review", "accepted", "rejected"];
    if (!validStatuses.includes(status)) {
        throw new Error("Invalid application status");
    }

    const { error } = await supabase
        .from("applications")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);

    if (error) {
        console.error("Error updating application status:", error);
        throw new Error("Failed to update status");
    }

    return { success: true };
}
