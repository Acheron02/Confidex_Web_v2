"use client";

import { FC, useState, useEffect } from "react";

interface Admin {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface Props {
  admin: Admin;
  onClose: () => void;
  onUpdate: (
    id: string,
    name: string,
    email: string,
    password?: string
  ) => void;
  updating?: boolean;
}

const UpdateAdminDialog: FC<Props> = ({
  admin,
  onClose,
  onUpdate,
  updating,
}) => {
  const [name, setName] = useState(admin.name);
  const [email, setEmail] = useState(admin.email);
  const [password, setPassword] = useState("");

  const handleUpdate = () => {
    if (!name || !email) return;
    onUpdate(admin._id, name, email, password || undefined);
  };

  return (
    <div className="fixed inset-0 bg-[#000000e7] bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-lg w-96">
        <h2 className="text-xl font-bold mb-4">Update Admin</h2>
        <div className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Name"
            className="border px-3 py-2 rounded"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="email"
            placeholder="Email"
            className="border px-3 py-2 rounded"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password (leave blank to keep)"
            className="border px-3 py-2 rounded"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="flex justify-end mt-4 gap-2">
          <button
            className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400 cursor-pointer"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 cursor-pointer"
            onClick={handleUpdate}
            disabled={updating}
          >
            {updating ? "Updating..." : "Update Admin"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateAdminDialog;
