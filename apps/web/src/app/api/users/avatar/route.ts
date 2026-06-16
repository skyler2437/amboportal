import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createAdminClient } from "@ambo/database/admin-client";

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
};

// Magic byte signatures for allowed image types
const MAGIC_BYTES: { type: string; bytes: number[] }[] = [
    { type: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
    { type: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
    { type: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] }, // "RIFF"
];

async function detectImageType(file: File): Promise<string | null> {
    const buffer = await file.slice(0, 12).arrayBuffer();
    const header = new Uint8Array(buffer);
    for (const { type, bytes } of MAGIC_BYTES) {
        if (bytes.every((b, i) => header[i] === b)) return type;
    }
    return null;
}

export async function POST(req: Request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
        }

        // Validate file type by magic bytes, not just MIME type
        const detectedType = await detectImageType(file);
        if (!detectedType || !ALLOWED_IMAGE_TYPES[detectedType]) {
            return NextResponse.json(
                { error: "File must be a JPEG, PNG, or WebP image" },
                { status: 400 }
            );
        }

        const supabase = createAdminClient();
        const fileExt = ALLOWED_IMAGE_TYPES[detectedType];
        const fileName = `${session.userId}.${fileExt}`;

        const { error: storageError } = await supabase.storage
            .from("avatars")
            .upload(fileName, file, {
                cacheControl: "3600",
                upsert: true,
            });

        if (storageError) {
            return NextResponse.json({ error: "Internal server error" }, { status: 500 });
        }

        const { data: urlData } = supabase.storage
            .from("avatars")
            .getPublicUrl(fileName);

        const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

        const { error: dbError } = await supabase
            .from("users")
            .update({ avatar_url: avatarUrl })
            .eq("id", session.userId);

        if (dbError) {
            return NextResponse.json({ error: "Internal server error" }, { status: 500 });
        }

        return NextResponse.json({ avatar_url: avatarUrl });
    } catch (err: unknown) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
