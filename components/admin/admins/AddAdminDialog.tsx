"use client";

import { FC, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/custom-ui/password-input";

interface Props {
  onClose: () => void;
  onAdd: (name: string, email: string, password: string) => Promise<void>;
}

const AddAdminDialog: FC<Props> = ({ onClose, onAdd }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async () => {
    if (!name || !email || !password) {
      setError("All fields are required");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onAdd(name, email, password);
      onClose(); // close dialog if successful
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange =
    (setter: React.Dispatch<React.SetStateAction<string>>) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value);
      if (error) setError(null); // clear error on input change
    };

  // Disable Add button if:
  // - currently submitting
  // - OR there’s an error
  // - OR fields are empty
  const isAddDisabled =
    submitting || !!error || !name.trim() || !email.trim() || !password.trim();

  return (
    <div className="fixed inset-0 bg-[#000000e7] flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-xl font-bold mb-4">Add New Admin</h2>
        <div className="flex flex-col gap-4">
          {/* Name */}
          <div className="grid gap-1">
            <Label htmlFor="name">Name</Label>
            <input
              id="name"
              type="text"
              placeholder="Full Name"
              className="border px-3 py-2 rounded w-full"
              value={name}
              onChange={handleInputChange(setName)}
            />
          </div>

          {/* Email */}
          <div className="grid gap-1">
            <Label htmlFor="email">Email</Label>
            <input
              id="email"
              type="email"
              placeholder="Email"
              className="border px-3 py-2 rounded w-full"
              value={email}
              onChange={handleInputChange(setEmail)}
            />
          </div>

          {/* Password */}
          <div className="grid gap-1">
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              value={password}
              onChange={(val) => {
                setPassword(val);
                if (error) setError(null);
              }}
              placeholder="Enter password"
            />
          </div>

          {/* Error message */}
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-2 mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            className="hover:cursor-pointer"
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={isAddDisabled}
            className="hover:cursor-pointer"
          >
            {submitting ? "Adding..." : "Add Admin"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddAdminDialog;
