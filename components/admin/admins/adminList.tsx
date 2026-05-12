"use client";

import AdminCard from "@/components/admin/admins/adminCard";
import AddAdminDialog from "@/components/admin/admins/AddAdminDialog";
import UpdateAdminDialog from "@/components/admin/admins/UpdateAdminDialog";
import { useState } from "react";

export interface Admin {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface AdminListProps {
  admins: Admin[];
  loading: boolean;
  onAdd: (name: string, email: string, password: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (
    id: string,
    name: string,
    email: string,
    password?: string
  ) => Promise<void>;
}

export default function AdminList({
  admins,
  loading,
  onAdd,
  onDelete,
  onUpdate,
}: AdminListProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [updateAdmin, setUpdateAdmin] = useState<Admin | null>(null);
  const [adding, setAdding] = useState(false);
  const [updating, setUpdating] = useState(false);

  return (
    <div>
      <div className="sticky top-0 z-10 w-full bg-gray-900 p-4 mb-6">
        <h1 className="text-2xl font-bold text-white">Admins</h1>
      </div>
      
      {loading ? (
        <p>Loading admins...</p>
      ) : admins.length === 0 ? (
        <p>No admins found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {admins.map((admin) => (
            <AdminCard
              key={admin._id}
              admin={admin}
              onDelete={onDelete}
              onUpdate={setUpdateAdmin}
            />
          ))}

          <div
            className="border-2 border-dashed border-gray-400 rounded p-4 flex items-center justify-center cursor-pointer hover:bg-gray-100 transition"
            onClick={() => setShowAddDialog(true)}
          >
            <span className="text-2xl font-bold text-gray-600">+</span>
          </div>
        </div>
      )}

      {showAddDialog && (
        <AddAdminDialog
          onClose={() => setShowAddDialog(false)}
          onAdd={async (name, email, password) => {
            setAdding(true);
            await onAdd(name, email, password);
            setAdding(false);
            setShowAddDialog(false);
          }}
        />
      )}

      {updateAdmin && (
        <UpdateAdminDialog
          admin={updateAdmin}
          onClose={() => setUpdateAdmin(null)}
          onUpdate={async (id, name, email, password) => {
            setUpdating(true);
            await onUpdate(id, name, email, password);
            setUpdating(false);
            setUpdateAdmin(null);
          }}
          updating={updating}
        />
      )}
    </div>
  );
}
