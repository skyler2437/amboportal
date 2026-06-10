import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { createAdminClient } from "@ambo/database/admin-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Award, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import DashboardClient from "./DashboardClient";

interface Submission {
  id: string;
  user_id: string;
  service_date: string;
  service_type: string;
  hours: number;
  credits: number;
  status: "Approved" | "Denied" | "Pending";
  created_at: string;
}

export default async function StudentDashboard() {
  const session = await getSession();

  if (!session || session.role !== "student") {
    redirect("/login");
  }

  const supabase = createAdminClient();

  // Fetch all submissions for history
  const [submissionsResponse] = await Promise.all([
    supabase
      .from("submissions")
      .select("*")
      .eq("user_id", session.userId)
      .order("created_at", { ascending: false }),
  ]);

  const submissions = (submissionsResponse.data as Submission[]) || [];

  // Calculate stats
  const approvedSubs = submissions.filter(s => s.status === "Approved");
  const pendingCount = submissions.filter(s => s.status === "Pending").length;
  const totalHours = approvedSubs.reduce((acc, curr) => acc + (Number(curr.hours) || 0), 0) || 0;
  const totalCredits = approvedSubs.reduce((acc, curr) => acc + (Number(curr.credits) || 0), 0) || 0;
  const stats = [
    {
      label: "Approved Hours",
      value: totalHours.toFixed(1),
      icon: Clock,
      color: "text-brand",
    },
    {
      label: "Approved Credits",
      value: totalCredits.toFixed(1),
      icon: Award,
      color: "text-purple-600",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {pendingCount > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            <strong>{pendingCount}</strong> submission{pendingCount !== 1 ? "s" : ""} awaiting review
          </span>
          <Badge variant="secondary" className="ml-auto bg-yellow-100 text-yellow-800 border-yellow-200">
            Pending
          </Badge>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.label}
                </CardTitle>
                <Icon className={`h-4 w-4 ${stat.color} text-muted-foreground`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <DashboardClient submissions={submissions} />
    </div>
  );
}
