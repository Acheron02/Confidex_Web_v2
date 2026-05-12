"use client";

import { FC, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Booth } from "./boothList";

interface Props {
  booth: Booth;
  onClose: () => void;
  onUpdate: (
    id: string,
    name: string,
    location: string,
    installationDate: Date,
    status: Booth["status"]
  ) => Promise<void>;
  updating: boolean;
}

const UpdateBoothDialog: FC<Props> = ({
  booth,
  onClose,
  onUpdate,
  updating,
}) => {
  const [name, setName] = useState(booth.name);
  const [status, setStatus] = useState<Booth["status"]>(booth.status);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const parsedDate = new Date(booth.installationDate);
  const installationDateString = !isNaN(parsedDate.getTime())
    ? parsedDate.toISOString().split("T")[0]
    : "";

  const handleUpdate = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    try {
      setError(null);
      setIsUpdating(true);
      await onUpdate(booth._id, name, booth.location, parsedDate, status);
      onClose();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsUpdating(false);
    }
  };

  // Reset error when input changes
  useEffect(() => {
    if (error) setError(null);
  }, [name, status]);

  // Reset fields on cancel
  const handleCancel = () => {
    setName(booth.name);
    setStatus(booth.status);
    setError(null);
    onClose();
  };

  // Enable button only if there are changes and no error
  const isButtonDisabled =
    updating ||
    isUpdating ||
    !!error ||
    (name === booth.name && status === booth.status);

  return (
    <div className="fixed inset-0 bg-[#000000e7] flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-xl font-bold mb-4">Update Booth</h2>
        <div className="flex flex-col gap-4">
          {/* Name */}
          <div className="grid gap-1">
            <Label htmlFor="name">Name</Label>
            <input
              id="name"
              type="text"
              placeholder="Booth Name"
              className="border px-3 py-2 rounded w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Location */}
          <div className="grid gap-1">
            <Label htmlFor="location">Location</Label>
            <input
              id="location"
              type="text"
              className="border px-3 py-2 rounded w-full bg-gray-100 dark:bg-gray-700"
              value={booth.location}
              disabled
            />
          </div>

          {/* Installation Date */}
          <div className="grid gap-1">
            <Label htmlFor="installationDate">Installation Date</Label>
            <input
              id="installationDate"
              type="date"
              className="border px-3 py-2 rounded w-full bg-gray-100 dark:bg-gray-700"
              value={installationDateString}
              disabled
            />
          </div>

          {/* Status */}
          <div className="grid gap-1">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              className="border px-3 py-2 rounded w-full"
              value={status}
              onChange={(e) => setStatus(e.target.value as Booth["status"])}
            >
              <option value="active">Active</option>
              <option value="due for maintenance check">
                Due for Maintenance Check
              </option>
              <option value="under maintenance">Under Maintenance</option>
            </select>
          </div>

          {/* Error */}
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleUpdate} disabled={isButtonDisabled}>
            {updating || isUpdating ? "Updating..." : "Update Booth"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UpdateBoothDialog;
