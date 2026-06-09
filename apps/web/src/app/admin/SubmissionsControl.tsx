"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { SERVICE_TYPES } from "@ambo/database/types";
import { toast } from "sonner";
import { fetchAllPages } from "@/lib/fetch-all-pages";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, AlertCircle, MoreHorizontal, ChevronRight, Search, CheckCircle2, XCircle, ClipboardList } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type SubRow = {
  id: string;
  user_id: string;
  service_date: string;
  service_type: string;
  credits: number;
  hours: number;
  feedback: string | null;
  status: string;
  created_at?: string;
  users: { first_name: string; last_name: string; email: string } | null;
};

type StatusFilter = "All" | "Pending" | "Approved" | "Denied";

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant={
        status === "Approved" ? "default" :
          status === "Denied" ? "destructive" : "secondary"
      }
      className={
        status === "Approved" ? "bg-green-100 text-green-800 hover:bg-green-100/80 border-green-200" :
          status === "Denied" ? "" : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100/80 border-yellow-200"
      }
    >
      {status}
    </Badge>
  );
}

export function SubmissionsControl() {
  const [rows, setRows] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRow, setEditingRow] = useState<SubRow | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [editForm, setEditForm] = useState<Partial<SubRow>>({});
  const [csvError, setCsvError] = useState("");
  const [csvSuccess, setCsvSuccess] = useState("");
  const [uploading, setUploading] = useState(false);

  // Filter & search state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchSubmissions = async () => {
    try {
      // Fetch every page — a single capped page hides older submissions and
      // makes the status counts and search silently wrong.
      const all = await fetchAllPages<SubRow>("/api/admin/submissions");
      setRows(all);
    } catch {
      toast.error("Failed to load submissions");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  // Status counts
  const statusCounts = useMemo(() => {
    const counts = { All: rows.length, Pending: 0, Approved: 0, Denied: 0 };
    rows.forEach((r) => {
      if (r.status === "Pending") counts.Pending++;
      else if (r.status === "Approved") counts.Approved++;
      else if (r.status === "Denied") counts.Denied++;
    });
    return counts;
  }, [rows]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    let result = rows;
    if (statusFilter !== "All") {
      result = result.filter((r) => r.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((r) => {
        const name = r.users ? `${r.users.first_name} ${r.users.last_name}`.toLowerCase() : "";
        const email = r.users?.email?.toLowerCase() ?? "";
        return name.includes(q) || email.includes(q) || r.service_type.toLowerCase().includes(q);
      });
    }
    return result;
  }, [rows, statusFilter, searchQuery]);

  const startEdit = (row: SubRow) => {
    setEditingRow(row);
    setEditForm({
      service_date: row.service_date,
      service_type: row.service_type,
      credits: row.credits,
      hours: row.hours,
      feedback: row.feedback ?? "",
      status: row.status,
    });
    setEditDialogOpen(true);
  };

  const onEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRow) return;
    const res = await fetch(`/api/admin/submissions/${editingRow.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...editForm,
        feedback: editForm.feedback || null,
      }),
    });
    if (res.ok) {
      setEditDialogOpen(false);
      toast.success("Submission updated");
      fetchSubmissions();
    } else {
      toast.error("Failed to update submission");
    }
  };

  const quickAction = async (row: SubRow, newStatus: "Approved" | "Denied") => {
    const res = await fetch(`/api/admin/submissions/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      toast.success(`Submission ${newStatus.toLowerCase()}`, {
        description: row.users ? `${row.users.first_name} ${row.users.last_name}` : undefined,
      });
      fetchSubmissions();
    } else {
      toast.error(`Failed to ${newStatus.toLowerCase()} submission`);
    }
  };

  const onCsvSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCsvError("");
    setCsvSuccess("");
    setUploading(true);

    const input = (e.target as HTMLFormElement).querySelector('input[type="file"]') as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) {
      setCsvError("Choose a file.");
      setUploading(false);
      return;
    }
    const formData = new FormData();
    formData.set("file", file);
    const res = await fetch("/api/admin/submissions/csv", {
      method: "POST",
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      toast.success(`Uploaded ${data.count ?? 0} row(s)`);
      setCsvSuccess(`Uploaded ${data.count ?? 0} row(s).`);
      fetchSubmissions();
      input.value = "";
    } else {
      setCsvError(data.error || "Upload failed.");
    }
    setUploading(false);
  };

  const columns: ColumnDef<SubRow>[] = [
    {
      accessorKey: "users.last_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Student" />
      ),
      cell: ({ row }) => {
        const user = row.original.users;
        return (
          <div className="flex flex-col">
            <span className="font-medium">
              {user ? `${user.first_name} ${user.last_name}` : row.original.user_id}
            </span>
            {user && <span className="text-xs text-muted-foreground">{user.email}</span>}
          </div>
        );
      },
    },
    {
      accessorKey: "service_date",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Date" />
      ),
    },
    {
      accessorKey: "service_type",
      header: "Type",
    },
    {
      accessorKey: "hours",
      header: "Hours",
    },
    {
      accessorKey: "credits",
      header: "Credits",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.getValue("status") as string} />,
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const isPending = row.original.status === "Pending";
        return (
          <div className="flex items-center gap-1">
            {isPending && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                  onClick={() => quickAction(row.original, "Approved")}
                  title="Approve"
                  aria-label="Approve submission"
                >
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => quickAction(row.original, "Denied")}
                  title="Deny"
                  aria-label="Deny submission"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => startEdit(row.original)}>
                  Edit Submission
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  if (loading)
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );

  return (
    <div className="space-y-4">
      {/* CSV Upload */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={onCsvSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Input type="file" accept=".csv,.txt" className="flex-1" disabled={uploading} />
            <Button type="submit" variant="secondary" disabled={uploading} className="shrink-0">
              {uploading ? "Uploading..." : "CSV Upload"}
            </Button>
          </form>
        </CardContent>
        {(csvError || csvSuccess) && (
          <CardFooter className="pt-0 pb-4 block">
            {csvError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{csvError}</AlertDescription>
              </Alert>
            )}
            {csvSuccess && (
              <Alert className="bg-green-50 text-green-800 border-green-200">
                <Check className="h-4 w-4 text-green-600" />
                <AlertDescription>{csvSuccess}</AlertDescription>
              </Alert>
            )}
          </CardFooter>
        )}
      </Card>

      {/* Filter Chips & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 flex-wrap">
          {(["All", "Pending", "Approved", "Denied"] as StatusFilter[]).map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(s)}
              className="gap-1.5"
            >
              {s}
              <Badge
                variant="secondary"
                className={`ml-0.5 px-1.5 py-0 text-[10px] min-w-[20px] text-center ${statusFilter === s ? "bg-background/20 text-primary-foreground" : ""}`}
              >
                {statusCounts[s]}
              </Badge>
            </Button>
          ))}
        </div>
        <div className="relative sm:ml-auto sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search student or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden space-y-2">
        {filteredRows.length === 0 ? (
          <div className="text-center py-12 border rounded-xl bg-muted/30">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3 text-muted-foreground">
              <ClipboardList className="w-7 h-7" />
            </div>
            <h3 className="font-medium">No submissions found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {statusFilter !== "All" || searchQuery ? "Try adjusting your filters." : "Submissions will appear here once students log hours."}
            </p>
          </div>
        ) : (
          filteredRows.map((row) => (
            <Link key={row.id} href={`/admin/submissions/${row.id}`}>
              <div className="bg-white border rounded-lg p-3.5 flex items-center gap-3 active:bg-gray-50 hover:bg-gray-50 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate">
                      {row.users
                        ? `${row.users.first_name} ${row.users.last_name}`
                        : row.user_id}
                    </span>
                    <StatusBadge status={row.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {row.service_type} &middot; {row.hours}h &middot; {row.service_date}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block">
        {filteredRows.length === 0 ? (
          <div className="text-center py-12 border rounded-xl bg-muted/30">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3 text-muted-foreground">
              <ClipboardList className="w-7 h-7" />
            </div>
            <h3 className="font-medium">No submissions found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {statusFilter !== "All" || searchQuery ? "Try adjusting your filters." : "Submissions will appear here once students log hours."}
            </p>
          </div>
        ) : (
          <DataTable columns={columns} data={filteredRows} />
        )}
      </div>

      {/* Edit Dialog (desktop) */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Submission</DialogTitle>
          </DialogHeader>
          <form onSubmit={onEditSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={editForm.service_date || ""}
                  onChange={(e) => setEditForm(f => ({ ...f, service_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={editForm.service_type}
                  onValueChange={(val) => setEditForm((f) => ({ ...f, service_type: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hours</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={editForm.hours || ""}
                  onChange={(e) => setEditForm(f => ({ ...f, hours: parseFloat(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Credits</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={editForm.credits || ""}
                  onChange={(e) => setEditForm(f => ({ ...f, credits: parseFloat(e.target.value) }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(val) => setEditForm((f) => ({ ...f, status: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Denied">Denied</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Feedback</Label>
              <Textarea
                value={editForm.feedback || ""}
                onChange={(e) => setEditForm(f => ({ ...f, feedback: e.target.value }))}
                placeholder="Optional feedback for the student"
              />
            </div>

            <DialogFooter>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
