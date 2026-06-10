import Link from "next/link";
import AdminTabs from "./AdminTabs";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Users, ChevronRight, Clock } from "lucide-react";
import { createAdminClient } from "@ambo/database/admin-client";

export default async function AdminPage() {
  const supabase = createAdminClient();

  const [pendingSubsRes, usersRes] = await Promise.all([
    supabase.from("submissions").select("id", { count: "exact", head: true }).eq("status", "Pending"),
    supabase.from("users").select("id", { count: "exact", head: true }).in("role", ["student", "admin", "superadmin"]),
  ]);

  const pendingSubs = pendingSubsRes.count ?? 0;
  const totalUsers = usersRes.count ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <Link href="/admin/resources">
          <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">Resources</p>
                  <p className="text-xs text-muted-foreground">Files &amp; documents</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-50 text-yellow-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingSubs}</p>
                <p className="text-xs text-muted-foreground">Pending Reviews</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-brand-light text-brand">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalUsers}</p>
                <p className="text-xs text-muted-foreground">Active Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <AdminTabs />
    </div>
  );
}
