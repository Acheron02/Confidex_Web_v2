import { NextResponse } from "next/server";

import dbConnect from "@/lib/dbConnect";
import Booth from "@/models/Booth";
import {
  generateBoothDeviceId,
  generateBoothDeviceSecret,
  hashBoothDeviceSecret,
} from "@/lib/booth-device";
import { withBoothPresence } from "@/lib/booth-presence";

const DEFAULT_COINS = {
  "20": { stock: 0, enabled: true },
  "5": { stock: 0, enabled: true },
  "1": { stock: 0, enabled: true },
};

type BoothLeanDoc = {
  _id: unknown;
  name?: string;
  location?: string;
  installationDate?: Date | string | null;
  status?: string;
  deviceId?: string;
  deviceSecretHash?: string;
  isOnline?: boolean;
  lastSeenAt?: Date | string | null;
  configVersion?: number;
  inventoryVersion?: number;
  config?: {
    products?: unknown[];
    [key: string]: unknown;
  };
  inventorySnapshot?: {
    products?: Record<string, unknown>;
    coins?: typeof DEFAULT_COINS;
    [key: string]: unknown;
  };
  createdAt?: Date | string;
  updatedAt?: Date | string;
  [key: string]: unknown;
};

export async function GET() {
  try {
    await dbConnect();

    const booths = (await Booth.find()
      .sort({
        installationDate: -1,
        createdAt: -1,
      })
      .lean()
      .exec()) as BoothLeanDoc[];

    return NextResponse.json(
      {
        booths: booths.map((booth) => withBoothPresence(booth)),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Get booths error:", error);

    return NextResponse.json(
      { error: "Failed to fetch booths" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();

    const { name, location, installationDate, status } = await req.json();

    if (!name || !location || !installationDate) {
      return NextResponse.json(
        { error: "Name, location, and installation date are required" },
        { status: 400 },
      );
    }

    const deviceId = generateBoothDeviceId();
    const deviceSecret = generateBoothDeviceSecret();
    const deviceSecretHash = hashBoothDeviceSecret(deviceSecret);

    const booth = await Booth.create({
      name: String(name).trim(),
      location: String(location).trim(),
      installationDate: new Date(installationDate),
      status,
      deviceId,
      deviceSecretHash,
      isOnline: false,
      lastSeenAt: null,
      configVersion: 1,
      inventoryVersion: 1,
      config: {
        products: [],
      },
      inventorySnapshot: {
        products: {},
        coins: DEFAULT_COINS,
      },
    });

    const boothObject = booth.toObject() as BoothLeanDoc;

    return NextResponse.json(
      {
        message: "Booth added successfully",
        booth: withBoothPresence(boothObject),
        deviceCredentials: {
          deviceId,
          deviceSecret,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Add booth error:", error);

    return NextResponse.json({ error: "Failed to add booth" }, { status: 500 });
  }
}
