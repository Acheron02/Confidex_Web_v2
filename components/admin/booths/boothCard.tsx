"use client";

import { FC } from "react";
import { Booth } from "./boothList";

interface Props {
  booth: Booth;
  onDelete: (id: string) => void;
  onUpdate: (
    id: string,
    name: string,
    location: string,
    installationDate: Date,
    status: Booth["status"]
  ) => void;
}

const BoothCard: FC<Props> = ({ booth, onDelete, onUpdate }) => {
  return (
    <div className="border rounded p-4 shadow hover:shadow-md transition">
      <p>
        <strong>Name:</strong> {booth.name}
      </p>
      <p>
        <strong>Location:</strong> {booth.location}
      </p>
      <p>
        <strong>Installed:</strong>{" "}
        {new Date(booth.installationDate).toLocaleDateString()}
      </p>
      <p>
        <strong>Status:</strong> {booth.status}
      </p>

      <div className="flex gap-2 mt-2">
        <button
          className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 cursor-pointer"
          onClick={() => onDelete(booth._id)}
        >
          Delete
        </button>
        <button
          className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 cursor-pointer"
          onClick={() =>
            onUpdate(
              booth._id,
              booth.name,
              booth.location,
              new Date(booth.installationDate),
              booth.status
            )
          }
        >
          Update
        </button>
      </div>
    </div>
  );
};

export default BoothCard;
    