"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { fetchUsers, deleteUser, type UserListItem, type UserDetail } from "@/lib/api/users";
import { getApiErrorMessage } from "@/lib/api-client";
import { UserFormDialog } from "./user-form-dialog";

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDetail | undefined>(undefined);
  const [deactivatingUser, setDeactivatingUser] = useState<UserListItem | undefined>(undefined);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["users", { search }],
    queryFn: () => fetchUsers({ search: search || undefined, limit: 50 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User deactivated.");
      setDeactivatingUser(undefined);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const openCreate = () => {
    setEditingUser(undefined);
    setFormOpen(true);
  };

  const openEdit = (user: UserListItem) => {
    // The list row already has everything the edit form needs; UserDetail
    // just adds phone/profileImage/lastLogin, which the form doesn't use.
    setEditingUser({ ...user, phone: null, profileImage: null, lastLogin: null });
    setFormOpen(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-muted-foreground">Manage who can access the POS system and their roles.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus /> Add User
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, username, or email..."
          className="pl-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : data && data.data.length > 0 ? (
                data.data.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{user.username}</TableCell>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.role ?? "No role"}</Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={user.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(user)}>
                        Edit
                      </Button>
                      {user.status === "active" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => setDeactivatingUser(user)}
                        >
                          Deactivate
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <UserFormDialog open={formOpen} onOpenChange={setFormOpen} user={editingUser} />

      <ConfirmDialog
        open={Boolean(deactivatingUser)}
        onOpenChange={(open) => !open && setDeactivatingUser(undefined)}
        title="Deactivate user?"
        description={`"${deactivatingUser?.name}" will no longer be able to log in. Their history is preserved and this can be reversed later.`}
        confirmLabel="Deactivate"
        isPending={deleteMutation.isPending}
        onConfirm={() => deactivatingUser && deleteMutation.mutate(deactivatingUser.id)}
      />
    </div>
  );
}
