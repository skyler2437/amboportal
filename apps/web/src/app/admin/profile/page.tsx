import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { createAdminClient } from "@ambo/database/admin-client";
import { AvatarUpload } from "@/components/AvatarUpload";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { GoogleCalendarSetup } from "@/components/GoogleCalendarSetup";
import { PushNotificationManager } from "@/components/PushNotificationManager";
import { NotificationPreferences } from "@/components/NotificationPreferences";
import { SignOutButton } from "@/components/SignOutButton";
import { DeleteAccountButton } from "@/components/DeleteAccountButton";

export default async function AdminProfilePage() {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
        redirect("/");
    }

    const supabase = createAdminClient();
    const { data: user } = await supabase
        .from("users")
        .select("first_name, last_name, avatar_url")
        .eq("id", session.userId)
        .single();

    return (
        <div className="space-y-6 pb-20">
            <div className="max-w-xl space-y-6">
                <AvatarUpload
                    currentAvatarUrl={user?.avatar_url || null}
                    firstName={user?.first_name || ""}
                    lastName={user?.last_name || ""}
                />

                <GoogleCalendarSetup />

                <PushNotificationManager />

                <NotificationPreferences />

                <ChangePasswordForm />

                <div className="pt-6 border-t space-y-4">
                    <h2 className="text-lg font-semibold mb-4">Account Actions</h2>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <SignOutButton variant="outline" className="w-full sm:w-auto" />
                        <DeleteAccountButton />
                    </div>
                    <p className="text-xs text-muted-foreground">
                        <a href="/privacy" className="underline hover:text-foreground">Privacy Policy</a>
                        {" · "}
                        <a href="/terms" className="underline hover:text-foreground">Terms of Service</a>
                    </p>
                </div>
            </div>
        </div>
    );
}
