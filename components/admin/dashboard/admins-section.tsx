"use client"

import * as React from "react"
import { format } from "date-fns"
import { Eye, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react"

import type {
  AdminRecord,
  AdminRole,
} from "@/components/admin/dashboard/types"
import { ADMIN_ROLE, SUPERADMIN_ROLE } from "@/lib/rbac"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PasswordInput } from "@/components/custom-ui/password-input"

interface AdminsSectionProps {
  admins: AdminRecord[]
  loading: boolean
  canManageAdmins: boolean
  onAdd: (payload: {
    name: string
    email: string
    password: string
    role: AdminRole
  }) => Promise<void>
  onUpdate: (
    id: string,
    payload: {
      name: string
      email: string
      password?: string
      role: AdminRole
    }
  ) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

interface AdminFormState {
  name: string
  email: string
  password: string
  role: AdminRole
}

const initialFormState: AdminFormState = {
  name: "",
  email: "",
  password: "",
  role: ADMIN_ROLE,
}

export function AdminsSection({
  admins,
  loading,
  canManageAdmins,
  onAdd,
  onUpdate,
  onDelete,
}: AdminsSectionProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<AdminRecord | null>(null)
  const [editingAdmin, setEditingAdmin] = React.useState<AdminRecord | null>(null)
  const [viewingAdmin, setViewingAdmin] = React.useState<AdminRecord | null>(null)
  const [form, setForm] = React.useState<AdminFormState>(initialFormState)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const openAddDialog = () => {
    if (!canManageAdmins) return
    setEditingAdmin(null)
    setViewingAdmin(null)
    setForm(initialFormState)
    setError(null)
    setDialogOpen(true)
  }

  const openEditDialog = (admin: AdminRecord) => {
    if (!canManageAdmins) return
    setViewingAdmin(null)
    setEditingAdmin(admin)
    setForm({
      name: admin.name,
      email: admin.email,
      password: "",
      role: admin.role,
    })
    setError(null)
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!canManageAdmins) return

    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required.")
      return
    }

    if (!editingAdmin && !form.password.trim()) {
      setError("Password is required for new admins.")
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      if (editingAdmin) {
        await onUpdate(editingAdmin._id, {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password.trim() ? form.password : undefined,
          role: form.role,
        })
      } else {
        await onAdd({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
        })
      }

      setDialogOpen(false)
      setEditingAdmin(null)
      setForm(initialFormState)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!canManageAdmins || !deleteTarget) return

    try {
      setSubmitting(true)
      setError(null)
      await onDelete(deleteTarget._id)
      setDeleteTarget(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete admin")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {!canManageAdmins ? (
        <Alert>
          <ShieldCheck className="size-4" />
          <AlertTitle>Read-only access</AlertTitle>
          <AlertDescription>
            You can view administrator accounts, but only a superadmin can add,
            delete, or change admin roles.
          </AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <ShieldCheck className="size-4" />
          <AlertTitle>Action failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="rounded-2xl">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Admins</CardTitle>
            <CardDescription>
              View administrator accounts and their assigned roles.
            </CardDescription>
          </div>

          {canManageAdmins ? (
            <Button
              onClick={openAddDialog}
              className="w-full sm:w-auto cursor-pointer"
            >
              <Plus className="mr-2 size-4" />
              Add admin
            </Button>
          ) : null}
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[220px] text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Loading admins...
                    </TableCell>
                  </TableRow>
                ) : admins.length ? (
                  admins.map((admin) => (
                    <TableRow key={admin._id}>
                      <TableCell className="font-medium">
                        {admin.name}
                      </TableCell>
                      <TableCell>{admin.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            admin.role === SUPERADMIN_ROLE
                              ? "default"
                              : "secondary"
                          }
                          className="rounded-full capitalize"
                        >
                          {admin.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {admin.createdAt
                          ? format(new Date(admin.createdAt), "MMM d, yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!canManageAdmins ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setViewingAdmin(admin)}
                            >
                              <Eye className="size-4" />
                              <span className="hidden sm:inline">View</span>
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(admin)}
                                className="cursor-pointer"
                              >
                                <Pencil className="size-4" />
                                <span className="hidden sm:inline">Edit</span>
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setDeleteTarget(admin)}
                                className="cursor-pointer"
                              >
                                <Trash2 className="size-4" />
                                <span className="hidden sm:inline">Delete</span>
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No admins found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {canManageAdmins ? (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingAdmin ? "Edit admin" : "Add admin"}
              </DialogTitle>
              <DialogDescription>
                {editingAdmin
                  ? "Update the selected administrator details. Leave password blank to keep the current one."
                  : "Create a new administrator account for the Confidex dashboard."}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="admin-name">Name</Label>
                <Input
                  id="admin-name"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Juan Dela Cruz"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="admin-email">Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder="admin@confidex.com"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="admin-password">
                  {editingAdmin ? "Password (optional)" : "Password"}
                </Label>
                <PasswordInput
                  id="admin-password"
                  value={form.password}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, password: value }))
                  }
                  placeholder={
                    editingAdmin
                      ? "Leave blank to keep current password"
                      : "Enter password"
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label>Role</Label>
                <Select
                  value={form.role}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      role: value as AdminRole,
                    }))
                  }
                >
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ADMIN_ROLE}>Admin</SelectItem>
                    <SelectItem value={SUPERADMIN_ROLE}>Superadmin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : null}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="cursor-pointer"
              >
                {submitting
                  ? "Saving..."
                  : editingAdmin
                    ? "Save changes"
                    : "Create admin"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}

      {canManageAdmins ? (
        <AlertDialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete admin account?</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteTarget
                  ? `This will permanently remove ${deleteTarget.name} from the administrator list.`
                  : "This action cannot be undone."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                disabled={submitting}
                className="cursor-pointer"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={submitting}
                className="cursor-pointer"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}

      {!canManageAdmins ? (
        <Dialog
          open={!!viewingAdmin}
          onOpenChange={(open) => !open && setViewingAdmin(null)}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Admin details</DialogTitle>
              <DialogDescription>
                View-only information for this administrator account.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              <div className="grid gap-1">
                <Label>Name</Label>
                <div className="rounded-md border px-3 py-2 text-sm">
                  {viewingAdmin?.name || "—"}
                </div>
              </div>

              <div className="grid gap-1">
                <Label>Email</Label>
                <div className="rounded-md border px-3 py-2 text-sm">
                  {viewingAdmin?.email || "—"}
                </div>
              </div>

              <div className="grid gap-1">
                <Label>Role</Label>
                <div className="rounded-md border px-3 py-2 text-sm capitalize">
                  {viewingAdmin?.role || "—"}
                </div>
              </div>

              <div className="grid gap-1">
                <Label>Created</Label>
                <div className="rounded-md border px-3 py-2 text-sm">
                  {viewingAdmin?.createdAt
                    ? format(new Date(viewingAdmin.createdAt), "MMM d, yyyy")
                    : "—"}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setViewingAdmin(null)}
                className="cursor-pointer"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
