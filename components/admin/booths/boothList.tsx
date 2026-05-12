"use client";

import { useState } from "react";
import BoothCard from "@/components/admin/booths/boothCard";
import AddBoothDialog from "./addBoothDialog";
import UpdateBoothDialog from "@/components/admin/booths/updateBoothDialog";

export interface Booth {
  _id: string;
  name: string;
  location: string;
  installationDate: Date;
  status: "active" | "due for maintenance check" | "under maintenance";
}

interface BoothListProps {
  booths: Booth[];
  loading: boolean;
  onAdd: (
    name: string,
    location: string,
    installationDate: Date,
    status: Booth["status"]
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (
    id: string,
    name: string,
    location: string,
    installationDate: Date,
    status: Booth["status"]
  ) => Promise<void>;
}

export default function BoothList({
  booths,
  loading,
  onAdd,
  onDelete,
  onUpdate,
}: BoothListProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [updateBooth, setUpdateBooth] = useState<Booth | null>(null);
  const [adding, setAdding] = useState(false);
  const [updating, setUpdating] = useState(false);

  return (
    <div>
      {/* Sticky header */}
      <div className="sticky top-0 z-10 w-full bg-gray-900 p-4 mb-6">
        <h1 className="text-2xl font-bold text-white">Booths</h1>
      </div>

      {loading ? (
        <p>Loading booths...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {booths.map((booth) => (
            <BoothCard
              key={booth._id}
              booth={booth}
              onDelete={onDelete}
              onUpdate={(id, name, location, installationDate, status) =>
                setUpdateBooth({
                  _id: id,
                  name,
                  location,
                  installationDate,
                  status,
                })
              }
            />
          ))}

          {/* Always show Add Booth card */}
          <div
            className="border-2 border-dashed border-gray-400 rounded p-4 flex items-center justify-center cursor-pointer hover:bg-gray-100 transition"
            onClick={() => setShowAddDialog(true)}
          >
            <span className="text-2xl font-bold text-gray-600">+</span>
          </div>
        </div>
      )}

      {/* Add Booth Dialog */}
      {showAddDialog && (
        <AddBoothDialog
          onClose={() => setShowAddDialog(false)}
          onAdd={async (name, location, installationDate, status) => {
            setAdding(true);
            const newBooth = await onAdd(
              name,
              location,
              installationDate,
              status
            );
            setAdding(false);
            setShowAddDialog(false);
          }}
          adding={adding}
        />
      )}

      {/* Update Booth Dialog */}
      {updateBooth && (
        <UpdateBoothDialog
          booth={updateBooth}
          onClose={() => setUpdateBooth(null)}
          onUpdate={async (id, name, location, installationDate, status) => {
            setUpdating(true);
            await onUpdate(id, name, location, installationDate, status);
            setUpdating(false);
            setUpdateBooth(null);
          }}
          updating={updating}
        />
      )}
    </div>
  );
}
