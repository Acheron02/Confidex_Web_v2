import { Schema, model, models } from "mongoose";

export type BoothStatus =
  | "active"
  | "due for maintenance check"
  | "under maintenance";

export interface IBooth {
  name: string;
  location: string;
  installationDate: Date;
  status: BoothStatus;

  deviceId?: string;
  deviceSecretHash?: string;
  isOnline?: boolean;
  lastSeenAt?: Date | null;

  configVersion?: number;
  inventoryVersion?: number;

  config?: Record<string, any>;
  inventorySnapshot?: {
    products?: Record<string, { stock: number }>;
    coins?: Record<string, { stock: number; enabled: boolean }>;
  };
}

const BoothSchema = new Schema<IBooth>(
  {
    name: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    installationDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["active", "due for maintenance check", "under maintenance"],
      default: "active",
    },

    deviceId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    deviceSecretHash: {
      type: String,
      select: false,
    },

    isOnline: {
      type: Boolean,
      default: false,
    },

    lastSeenAt: {
      type: Date,
      default: null,
    },

    configVersion: {
      type: Number,
      default: 1,
    },

    inventoryVersion: {
      type: Number,
      default: 1,
    },

    config: {
      type: Schema.Types.Mixed,
      default: {},
    },

    inventorySnapshot: {
      type: Schema.Types.Mixed,
      default: {
        products: {},
        coins: {
          "20": { stock: 0, enabled: true },
          "5": { stock: 0, enabled: true },
          "1": { stock: 0, enabled: true },
        },
      },
    },
  },
  {
    timestamps: true,
  },
);

const Booth = models.Booth || model<IBooth>("Booth", BoothSchema);

export default Booth;
