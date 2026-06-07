import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import StudentNav from "./StudentNav";
import { StudentSidebar } from "@/components/StudentSidebar";

// Student pages are auth-gated and per-request (they read the session cookie and
// use the Supabase service-role client), so they must never be statically
// prerendered. Forcing dynamic also stops Next from probe-rendering them at
// build time, where SUPABASE_SERVICE_ROLE_KEY is absent and createAdminClient()
// throws "Missing Supabase URL or Service Role Key" into the build logs.
export const dynamic = "force-dynamic";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Desktop Sidebar */}
      <StudentSidebar />

      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-4 pb-24 md:p-8 md:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <StudentNav />
    </div>
  );
}
