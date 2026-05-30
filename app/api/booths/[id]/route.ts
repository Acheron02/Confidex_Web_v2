import { NextResponse } from "next/server";

import dbConnect from "@/lib/dbConnect";
import Booth from "@/models/Booth";
import { withBoothPresence } from "@/lib/booth-presence";

type BoothRouteParams = {
  params: Promise<{ id: string }>;
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
    coins?: Record<
      string,
      {
        stock?: number;
        enabled?: boolean;
      }
    >;
    [key: string]: unknown;
  };
  createdAt?: Date | string;
  updatedAt?: Date | string;
  [key: string]: unknown;
};

export async function GET(_req: Request, { params }: BoothRouteParams) {
  try {
    await dbConnect();

    const { id } = await params;

    const booth = (await Booth.findById(id)
      .lean()
      .exec()) as BoothLeanDoc | null;

    if (!booth) {
      return NextResponse.json({ error: "Booth not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        booth: withBoothPresence(booth),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Get booth error:", error);

    return NextResponse.json(
      { error: "Failed to fetch booth" },
      { status: 500 },
    );
  }
}

async function updateBooth(req: Request, { params }: BoothRouteParams) {
  try {
    await dbConnect();

    const { id } = await params;
    const { name, location, installationDate, status } = await req.json();

    const updatedBooth = (await Booth.findByIdAndUpdate(
      id,
      {
        name: String(name).trim(),
        location: String(location).trim(),
        installationDate: new Date(installationDate),
        status,
      },
      {
        new: true,
        runValidators: true,
      },
    )
      .lean()
      .exec()) as BoothLeanDoc | null;

    if (!updatedBooth) {
      return NextResponse.json({ error: "Booth not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        message: "Booth updated successfully",
        booth: withBoothPresence(updatedBooth),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Update booth error:", error);

    return NextResponse.json(
      { error: "Failed to update booth" },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request, context: BoothRouteParams) {
  return updateBooth(req, context);
}

export async function PATCH(req: Request, context: BoothRouteParams) {
  return updateBooth(req, context);
}

export async function DELETE(_req: Request, { params }: BoothRouteParams) {
  try {
    await dbConnect();

    const { id } = await params;

    const deleted = await Booth.findByIdAndDelete(id).exec();

    if (!deleted) {
      return NextResponse.json({ error: "Booth not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Booth deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Delete booth error:", error);

    return NextResponse.json(
      { error: "Failed to delete booth" },
      { status: 500 },
    );
  }
}
