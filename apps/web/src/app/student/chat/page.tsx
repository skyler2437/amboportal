import { getSession } from "@/lib/session";
import { ChatLayout } from "@/components/chat/ChatLayout";
import { createAdminClient } from "@ambo/database/admin-client";
import { redirect } from "next/navigation";

export default async function StudentChatPage() {
    const session = await getSession();

    if (!session || (session.role !== "student" && session.role !== "applicant")) {
        // Middleware might handle this, but double check
        // redirect("/login"); // Optional if middleware covers it
    }

    // Should we enforce student role? The path implies it.
    // If an admin goes here, maybe redirect to admin chat?

    if (!session) {
        redirect("/login");
    }

    const supabase = createAdminClient();
    const { data: user } = await supabase
        .from("users")
        .select("first_name, last_name, avatar_url")
        .eq("id", session.userId)
        .single();

    return (
        // Negative margins cancel the layout's p-4 pb-24 (mobile) / md:p-8 md:pb-8
        // so ChatLayout can fill exactly the viewport height minus the nav bar
        // (bottom nav on mobile, TopNav on desktop — both h-16/4rem).
        <div className="-mt-4 -mb-24 md:-mt-8 md:-mb-8 overflow-hidden">
            <ChatLayout
                currentUserId={session.userId}
                currentUserFirstName={user?.first_name ?? ""}
                currentUserLastName={user?.last_name ?? ""}
                currentUserAvatarUrl={user?.avatar_url ?? ""}
                pageTitle="Team Chat"
                basePath="/student/chat"
            />
        </div>
    );
}
