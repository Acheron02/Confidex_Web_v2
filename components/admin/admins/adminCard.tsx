"use client";

import { FC } from "react";

interface Admin {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface Props {
  admin: Admin;
  onDelete: (id: string) => void;
  onUpdate: (admin: Admin) => void;
}

const AdminCard: FC<Props> = ({ admin, onDelete, onUpdate }) => {
  return (
    <div className="border rounded p-4 shadow hover:shadow-md transition">
      <p>
        <strong>Name:</strong> {admin.name}
      </p>
      <p>
        <strong>Email:</strong> {admin.email}
      </p>
      <p>
        <strong>Role:</strong> {admin.role}
      </p>
      <div className="flex gap-2 mt-2">
        <button
          className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 cursor-pointer"
          onClick={() => onDelete(admin._id)}
        >
          Delete
        </button>
        <button
          className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 cursor-pointer"
          onClick={() => onUpdate(admin)}
        >
          Update
        </button>
      </div>
    </div>
  );
};

export default AdminCard;
