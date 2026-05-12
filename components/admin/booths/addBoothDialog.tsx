"use client";

import { useState } from "react";
import { Booth } from "./boothList";

interface AddBoothDialogProps {
  onClose: () => void;
  onAdd: (
    name: string,
    location: string,
    installationDate: Date,
    status: Booth["status"]
  ) => void;
  adding: boolean;
}

export default function AddBoothDialog({
  onClose,
  onAdd,
  adding,
}: AddBoothDialogProps) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [installationDate, setInstallationDate] = useState(""); // YYYY-MM-DD
  const [status, setStatus] = useState<Booth["status"]>("active");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !location || !installationDate || !status) {
      alert("All fields are required");
      return;
    }

    const dateObj = new Date(installationDate);

    onAdd(name, location, dateObj, status);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-lg w-96">
        <h2 className="text-xl font-bold mb-4">Add Booth</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Name"
            className="border p-2 rounded"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Location"
            className="border p-2 rounded"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <input
            type="date"
            placeholder="Installation Date"
            className="border p-2 rounded"
            value={installationDate}
            onChange={(e) => setInstallationDate(e.target.value)}
          />
          <select
            className="border p-2 rounded"
            value={status}
            onChange={(e) => setStatus(e.target.value as Booth["status"])}
          >
            <option value="active">Active</option>
            <option value="due for maintenance check">
              Due for Maintenance
            </option>
            <option value="under maintenance">Under Maintenance</option>
          </select>

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
              onClick={onClose}
              disabled={adding}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
              disabled={adding}
            >
              {adding ? "Adding..." : "Add Booth"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
