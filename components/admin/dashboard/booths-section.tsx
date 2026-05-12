"use client";

import * as React from "react";
import { format } from "date-fns";
import { Pencil, Plus, Store, Trash2 } from "lucide-react";

import type {
  BoothRecord,
  BoothStatus,
} from "@/components/admin/dashboard/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CreatedBoothResponse {
  booth: BoothRecord;
  deviceCredentials: {
    deviceId: string;
    deviceSecret: string;
  };
}

interface BoothsSectionProps {
  booths: BoothRecord[];
  loading: boolean;
  onAdd: (payload: {
    name: string;
    location: string;
    installationDate: string;
    status: BoothStatus;
  }) => Promise<CreatedBoothResponse>;
  onUpdate: (
    id: string,
    payload: {
      name: string;
      location: string;
      installationDate: string;
      status: BoothStatus;
    },
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

interface BoothFormState {
  name: string;
  location: string;
  installationDate: string;
  status: BoothStatus;
}

interface CreatedCredentialsState {
  boothName: string;
  deviceId: string;
  deviceSecret: string;
}

const initialFormState: BoothFormState = {
  name: "",
  location: "",
  installationDate: new Date().toISOString().slice(0, 10),
  status: "active",
};

function statusLabel(status: BoothStatus) {
  if (status === "active") return "Active";
  if (status === "under maintenance") return "Under maintenance";
  return "Due for maintenance";
}

function statusVariant(status: BoothStatus) {
  if (status === "active") return "default" as const;
  if (status === "under maintenance") return "destructive" as const;
  return "secondary" as const;
}

export function BoothsSection({
  booths,
  loading,
  onAdd,
  onUpdate,
  onDelete,
}: BoothsSectionProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<BoothRecord | null>(
    null,
  );
  const [editingBooth, setEditingBooth] = React.useState<BoothRecord | null>(
    null,
  );
  const [form, setForm] = React.useState<BoothFormState>(initialFormState);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [createdCredentials, setCreatedCredentials] =
    React.useState<CreatedCredentialsState | null>(null);
  const [copySuccess, setCopySuccess] = React.useState(false);

  const openAddDialog = () => {
    setEditingBooth(null);
    setForm(initialFormState);
    setError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (booth: BoothRecord) => {
    setEditingBooth(booth);
    setForm({
      name: booth.name,
      location: booth.location,
      installationDate: new Date(booth.installationDate)
        .toISOString()
        .slice(0, 10),
      status: booth.status,
    });
    setError(null);
    setDialogOpen(true);
  };

  const closeMainDialog = () => {
    if (submitting) return;
    setDialogOpen(false);
    setEditingBooth(null);
    setForm(initialFormState);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.location.trim() || !form.installationDate) {
      setError("Name, location, and installation date are required.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setCopySuccess(false);

      if (editingBooth) {
        await onUpdate(editingBooth._id, {
          ...form,
          name: form.name.trim(),
          location: form.location.trim(),
        });
      } else {
        const result = await onAdd({
          ...form,
          name: form.name.trim(),
          location: form.location.trim(),
        });

        setCreatedCredentials({
          boothName: result.booth.name,
          deviceId: result.deviceCredentials.deviceId,
          deviceSecret: result.deviceCredentials.deviceSecret,
        });
      }

      setDialogOpen(false);
      setEditingBooth(null);
      setForm(initialFormState);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to save booth");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      setSubmitting(true);
      await onDelete(deleteTarget._id);
      setDeleteTarget(null);
    } catch (error) {
      console.error("Delete booth failed:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyCredentials = async () => {
    if (!createdCredentials) return;

    try {
      await navigator.clipboard.writeText(
        `BOOTH_DEVICE_ID=${createdCredentials.deviceId}\nBOOTH_DEVICE_SECRET=${createdCredentials.deviceSecret}`,
      );
      setCopySuccess(true);
      window.setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error("Failed to copy credentials:", error);
      setCopySuccess(false);
    }
  };

  const closeCredentialsDialog = () => {
    setCreatedCredentials(null);
    setCopySuccess(false);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <Card className="rounded-2xl">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Booth records</CardTitle>
            <CardDescription>
              Keep kiosk installation details and maintenance statuses in a
              single responsive table.
            </CardDescription>
          </div>

          <Button onClick={openAddDialog} className="cursor-pointer">
            <Plus className="size-4" />
            Add booth
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert>
            <Store className="size-4" />
            <AlertTitle>Booth maintenance</AlertTitle>
            <AlertDescription>
              Update status promptly so the dashboard always reflects booth
              availability and follow-up needs.
            </AlertDescription>
          </Alert>

          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Installed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Loading booth records...
                    </TableCell>
                  </TableRow>
                ) : booths.length ? (
                  booths.map((booth) => (
                    <TableRow key={booth._id}>
                      <TableCell className="font-medium">
                        {booth.name}
                      </TableCell>
                      <TableCell>{booth.location}</TableCell>
                      <TableCell>
                        {format(
                          new Date(booth.installationDate),
                          "MMM d, yyyy",
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={statusVariant(booth.status)}
                          className="rounded-full"
                        >
                          {statusLabel(booth.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(booth)}
                            className="cursor-pointer"
                          >
                            <Pencil className="size-4" />
                            <span className="hidden sm:inline">Edit</span>
                          </Button>

                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteTarget(booth)}
                            className="cursor-pointer"
                          >
                            <Trash2 className="size-4" />
                            <span className="hidden sm:inline">Delete</span>
                          </Button>
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
                      No booths found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => !submitting && setDialogOpen(open)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingBooth ? "Edit booth" : "Add booth"}
            </DialogTitle>
            <DialogDescription>
              {editingBooth
                ? "Update the selected booth details and current maintenance state."
                : "Create a new booth record for the Confidex deployment list."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="booth-name">Booth name</Label>
              <Input
                id="booth-name"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Confidex Booth 01"
                disabled={submitting}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="booth-location">Location</Label>
              <Input
                id="booth-location"
                value={form.location}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    location: event.target.value,
                  }))
                }
                placeholder="Quezon City"
                disabled={submitting}
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="booth-installation-date">
                  Installation date
                </Label>
                <Input
                  id="booth-installation-date"
                  type="date"
                  value={form.installationDate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      installationDate: event.target.value,
                    }))
                  }
                  disabled={submitting}
                />
              </div>

              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      status: value as BoothStatus,
                    }))
                  }
                  disabled={submitting}
                >
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue placeholder="Select booth status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="due for maintenance check">
                      Due for maintenance
                    </SelectItem>
                    <SelectItem value="under maintenance">
                      Under maintenance
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeMainDialog}
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
                : editingBooth
                  ? "Save changes"
                  : "Create booth"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!createdCredentials}
        onOpenChange={(open) => {
          if (!open) closeCredentialsDialog();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Booth created successfully</DialogTitle>
            <DialogDescription>
              Save these device credentials now and place them in the assigned
              Raspberry Pi
              <span className="font-medium"> .env.local </span>
              file. The secret will not be shown again.
            </DialogDescription>
          </DialogHeader>

          {createdCredentials ? (
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label>Booth</Label>
                <Input value={createdCredentials.boothName} readOnly />
              </div>

              <div className="grid gap-2">
                <Label>BOOTH_DEVICE_ID</Label>
                <Input value={createdCredentials.deviceId} readOnly />
              </div>

              <div className="grid gap-2">
                <Label>BOOTH_DEVICE_SECRET</Label>
                <Input value={createdCredentials.deviceSecret} readOnly />
              </div>

              {copySuccess ? (
                <p className="text-sm text-green-600">
                  Credentials copied to clipboard.
                </p>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCopyCredentials}
              className="cursor-pointer"
            >
              Copy credentials
            </Button>
            <Button onClick={closeCredentialsDialog} className="cursor-pointer">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete booth record?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `This will permanently remove ${deleteTarget.name} from the booth list.`
                : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting} className="cursor-pointer">
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
    </div>
  );
}
