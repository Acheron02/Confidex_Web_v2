import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import Passkey from "@/models/Passkey";
import { sha256Phone } from "@/lib/phone";

const challengeStore = new Map<string, string>();

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { phoneNumber } = await req.json();
    const phone = String(phoneNumber || "").trim();

    if (!phone) {
      return NextResponse.json(
        { error: "Phone number required" },
        { status: 400 },
      );
    }

    const phoneHash = sha256Phone(phone);
    const user = await User.findOne({ phoneHash });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const passkeys = await Passkey.find({ userId: user._id });
    if (!passkeys.length) {
      return NextResponse.json(
        { error: "No passkey found", fallbackToOtp: true },
        { status: 400 },
      );
    }

    const options = await generateAuthenticationOptions({
      rpID: process.env.RP_ID!,
      allowCredentials: passkeys.map((p) => ({
        id: p.credentialID,
        transports: p.transports,
      })),
      userVerification: "preferred",
    });

    return NextResponse.json({
      options,
      userId: user._id.toString(),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to start passkey login" },
      { status: 500 },
    );
  }
}
