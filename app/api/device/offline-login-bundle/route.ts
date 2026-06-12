import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { authenticateBoothDevice } from "@/lib/deviceAuth";
import { getOfflineLoginPublicKeyPemB64 } from "@/lib/offline-login-token";

export async function GET(req: Request) {
  try {
    const booth = await authenticateBoothDevice(req);

    await dbConnect();

    const users = await User.find({})
      .select("_id username createdAt updatedAt")
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    return NextResponse.json(
      {
        ok: true,
        boothId: String(booth._id),
        deviceId: booth.deviceId,
        algorithm: "Ed25519",
        tokenPrefix: "LOGIN-OFFLINE-v1.",
        offlineLoginPublicKeyPemB64: getOfflineLoginPublicKeyPemB64(),
        syncedAt: new Date().toISOString(),
        users: users.map((user: any) => ({
          _id: String(user._id),
          userID: String(user._id),
          id: String(user._id),
          username: user.username,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          active: true,
        })),
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("[OFFLINE LOGIN BUNDLE] error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Unauthorized",
      },
      { status: 401 },
    );
  }
}
