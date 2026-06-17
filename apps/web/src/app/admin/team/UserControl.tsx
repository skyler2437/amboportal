"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { toast } from "sonner";
import { fetchAllPages } from "@/lib/fetch-all-pages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserPlus, Check, AlertCircle, MoreHorizontal, ChevronRight, Search, Upload, Users } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type UserRow = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  role: string;
};

export function UserControl() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [csvError, setCsvError] = useState("");
  const [csvSuccess, setCsvSuccess] = useState("");
  const [uploading, setUploading] = useState(false);

  const [myRole, setMyRole] = useState<string>("student");
  const [searchQuery, setSearchQuery] = useState("");

  const [addForm, setAddForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    role: "student",
  });
  const [addError, setAddError] = useState("");

  const [editForm, setEditForm] = useState<Partial<UserRow>>({});
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  const fetchUsers = async () => {
    const meRes = await fetch("/api/auth/session");
    if (meRes.ok) {
      const session = await meRes.json();
      setMyRole(session.user?.role || "student");
    }

    try {
      // Fetch every page — a single capped page hides users past the 100th
      // alphabetically from the table and the search.
      const all = await fetchAllPages<UserRow>("/api/admin/users");
      setRows(all);
    } catch {
      toast.error("Failed to load users");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter((u) => {
      const name = `${u.first_name} ${u.last_name}`.toLowerCase();
      return name.includes(q) || u.email.toLowerCase().includes(q) || u.phone.includes(q) || u.role.includes(q);
    });
  }, [rows, searchQuery]);

  const onAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    const phone10 = addForm.phone.replace(/\D/g, "");
    if (phone10.length !== 10) {
      setAddError("Phone must be 10 digits.");
      return;
    }
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...addForm, phone: phone10 }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setAddDialogOpen(false);
      setAddForm({ first_name: "", last_name: "", phone: "", email: "", role: "student" });
      toast.success("User created", { description: `${addForm.first_name} ${addForm.last_name}` });
      fetchUsers();
    } else {
      setAddError(data.error || "Failed to add user.");
    }
  };

  const startEdit = (user: UserRow) => {
    setEditingUser(user);
    setEditForm({
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone,
      email: user.email,
      role: user.role,
    });
    setEditDialogOpen(true);
  };

  const onEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    const res = await fetch(`/api/admin/users/${editingUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      setEditDialogOpen(false);
      toast.success("User updated");
      fetchUsers();
    } else {
      toast.error("Failed to update user");
    }
  };

  const deleteUser = async () => {
    if (!deleteTarget) return;
    setDeletingUser(true);
    const res = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("User deleted");
      setDeleteTarget(null);
      fetchUsers();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to delete user");
    }
    setDeletingUser(false);
  };

  const csvInputRef = useRef<HTMLInputElement>(null);

  const onCsvFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvError("");
    setCsvSuccess("");
    setUploading(true);

    const formData = new FormData();
    formData.set("file", file);
    const res = await fetch("/api/admin/users/csv", {
      method: "POST",
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setCsvSuccess(`Uploaded ${data.count ?? 0} row(s).`);
      fetchUsers();
    } else {
      setCsvError(data.error || "Upload failed.");
    }
    if (csvInputRef.current) csvInputRef.current.value = "";
    setUploading(false);
  };

  const columns: ColumnDef<UserRow>[] = [
    {
      accessorKey: "first_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => (
        <div className="font-medium">
          {row.getValue("first_name")} {row.original.last_name}
        </div>
      ),
    },
    {
      accessorKey: "phone",
      header: "Phone",
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
        <Badge variant={row.getValue("role") === "admin" ? "default" : "secondary"}>
          {row.getValue("role")}
        </Badge>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const user = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.email)}>
                Copy Email
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => startEdit(user)}>
                Edit User
              </DropdownMenuItem>
              {(myRole === "superadmin" || (myRole === "admin" && user.role !== "admin" && user.role !== "superadmin")) && (
                <DropdownMenuItem onClick={() => setDeleteTarget(user)} className="text-red-600">
                  Delete User
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
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
      {/* Add User dialog (trigger rendered in the actions row below) */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>Create a new student or admin manually.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onAddSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  value={addForm.first_name}
                  onChange={(e) => setAddForm((f) => ({ ...f, first_name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  value={addForm.last_name}
                  onChange={(e) => setAddForm((f) => ({ ...f, last_name: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                type="tel"
                placeholder="10-digit Phone"
                value={addForm.phone}
                onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="Email"
                value={addForm.email}
                onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={addForm.role}
                onValueChange={(val) => setAddForm((f) => ({ ...f, role: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {addError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{addError}</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button type="submit">Create User</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <input
        ref={csvInputRef}
        type="file"
        accept=".csv,.txt"
        className="hidden"
        onChange={onCsvFileSelected}
      />

      {/* Actions: Add User, CSV Upload & Search */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={() => setAddDialogOpen(true)} className="gap-2 w-full sm:w-auto">
            <UserPlus className="h-4 w-4" />
            Add User
          </Button>
          <div className="flex items-center gap-2 sm:ml-auto">
            <Button
              type="button"
              variant="secondary"
              disabled={uploading}
              onClick={() => csvInputRef.current?.click()}
              className="gap-2 shrink-0"
            >
              <Upload className="h-4 w-4" />
              {uploading ? "Uploading..." : "CSV Upload"}
            </Button>
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
        </div>
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
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden space-y-2">
        {filteredRows.length === 0 ? (
          <div className="text-center py-12 border rounded-xl bg-muted/30">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3 text-muted-foreground">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="font-medium">No users found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {searchQuery ? "Try a different search term." : "Add your first team member to get started."}
            </p>
          </div>
        ) : (
          filteredRows.map((user) => (
            <Link key={user.id} href={`/admin/users/${user.id}`}>
              <div className="bg-white border rounded-lg p-3.5 flex items-center gap-3 active:bg-gray-50 hover:bg-gray-50 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {user.first_name} {user.last_name}
                    </span>
                    <Badge variant={user.role === "admin" || user.role === "superadmin" ? "default" : "secondary"} className="shrink-0 text-xs">
                      {user.role}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{user.email}</p>
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
              <Users className="w-7 h-7" />
            </div>
            <h3 className="font-medium">No users found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {searchQuery ? "Try a different search term." : "Add your first team member to get started."}
            </p>
          </div>
        ) : (
          <DataTable columns={columns} data={filteredRows} initialPageSize={50} />
        )}
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete user"
        description={deleteTarget ? `This will permanently delete ${deleteTarget.first_name} ${deleteTarget.last_name} and all their data.` : ""}
        confirmLabel="Delete"
        variant="destructive"
        loading={deletingUser}
        onConfirm={deleteUser}
      />

      {/* Edit Dialog (desktop) */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <form onSubmit={onEditSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  value={editForm.first_name || ""}
                  onChange={(e) => setEditForm(f => ({ ...f, first_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  value={editForm.last_name || ""}
                  onChange={(e) => setEditForm(f => ({ ...f, last_name: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={editForm.phone || ""}
                onChange={(e) => setEditForm(f => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={editForm.email || ""}
                onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={editForm.role}
                onValueChange={(val) => setEditForm((f) => ({ ...f, role: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
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
