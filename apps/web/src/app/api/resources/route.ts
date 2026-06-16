import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createAdminClient } from "@ambo/database/admin-client";

export async function GET() {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: resources, error } = await supabase
        .from("resources")
        .select("* ")
        .order("created_at", { ascending: false });

    if (error) {
        return NextResponse.json({ error: "Request failed" }, { status: 400 });
    }

    // Get public URL for each resource
    const resourcesWithUrls = resources.map((res) => {
        const { data } = supabase.storage.from("resources").getPublicUrl(res.file_url);
        return { ...res, publicUrl: data.publicUrl };
    });

    return NextResponse.json({ resources: resourcesWithUrls });
}

export async function POST(req: Request) {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const title = formData.get("title") as string;
        const description = formData.get("description") as string;

        if (!file || !title) {
            return NextResponse.json({ error: "Missing file or title" }, { status: 400 });
        }

        // File size limit (10MB)
        const MAX_FILE_SIZE = 10 * 1024 * 1024;
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: "File too large. Maximum size is 10MB." }, { status: 413 });
        }

        // File type allowlist
        const allowedExtensions = [
            ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
            ".png", ".jpg", ".jpeg", ".gif", ".webp",
            ".csv", ".txt",
        ];
        const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
        if (!allowedExtensions.includes(ext)) {
            return NextResponse.json({ error: `File type "${ext}" is not allowed.` }, { status: 400 });
        }

        const supabase = createAdminClient();
        const fileName = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;

        // Upload to Storage
        const { data: storageData, error: storageError } = await supabase.storage
            .from("resources")
            .upload(fileName, file, {
                cacheControl: "3600",
                upsert: false,
            });

        if (storageError) {
            console.error("Storage upload failed:", storageError);
            return NextResponse.json({ error: "File upload failed" }, { status: 500 });
        }

        // Insert into DB
        const { data: resource, error: dbError } = await supabase
            .from("resources")
            .insert({
                title,
                description,
                file_url: fileName,
                file_type: file.type,
                file_size: file.size,
                uploaded_by: session.userId,
            })
            .select()
            .single();

        if (dbError) {
            console.error("Resource insert failed:", dbError);
            return NextResponse.json({ error: "Failed to save resource" }, { status: 500 });
        }

        return NextResponse.json({ resource });
    } catch (err: unknown) {
        console.error("Upload error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
