import { NextResponse } from "next/server";
import {
  verifyRegistrationResponse,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import Passkey from "@/models/Passkey";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

function getSession(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/session=([^;]+)/);
  if (!match) return null;
  try {
    return jwt.verify(match[1], JWT_SECRET) as { id: string };
  } catch {
    return null;
  }
}

const challengeStore = new Map<string, string>();

export async function POST(req: Request) {
  try {
    await dbConnect();

    const session = getSession(req);
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { credential, expectedChallenge } = await req.json();

    const user = await User.findById(session.id);
    if (!user?.webauthnUserID) {
      return NextResponse.json(
        { error: "User not ready for passkey" },
        { status: 400 },
      );
    }

    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: process.env.EXPECTED_ORIGIN!,
      expectedRPID: process.env.RP_ID!,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json(
        { error: "Passkey registration failed" },
        { status: 400 },
      );
    }

    const info = verification.registrationInfo;

    await Passkey.create({
      userId: user._id,
      webauthnUserID: user.webauthnUserID,
      credentialID: Buffer.from(info.credential.id).toString("base64url"),
      publicKey: Buffer.from(info.credential.publicKey).toString("base64url"),
      counter: info.credential.counter,
      deviceType: info.credentialDeviceType,
      backedUp: info.credentialBackedUp,
      transports: credential.response?.transports || [],
    });

    user.hasPasskey = true;
    await user.save();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Passkey verification failed" },
      { status: 500 },
    );
  }
}
