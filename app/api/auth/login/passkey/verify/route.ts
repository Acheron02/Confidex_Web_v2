import { NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import Passkey from "@/models/Passkey";
import { buildSessionResponse } from "@/lib/session";

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { credential, expectedChallenge, userId } = await req.json();

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const credentialID = credential.id;
    const passkey = await Passkey.findOne({ userId: user._id, credentialID });

    if (!passkey) {
      return NextResponse.json({ error: "Passkey not found" }, { status: 404 });
    }

    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: process.env.EXPECTED_ORIGIN!,
      expectedRPID: process.env.RP_ID!,
      credential: {
        id: passkey.credentialID,
        publicKey: Buffer.from(passkey.publicKey, "base64url"),
        counter: passkey.counter,
        transports: passkey.transports,
      },
    });

    if (!verification.verified) {
      return NextResponse.json(
        { error: "Passkey login failed" },
        { status: 401 },
      );
    }

    passkey.counter = verification.authenticationInfo.newCounter;
    await passkey.save();

    return buildSessionResponse(user, 200);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Passkey verification failed" },
      { status: 500 },
    );
  }
}
