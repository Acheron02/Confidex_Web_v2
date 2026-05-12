import { NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
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

export async function POST(req: Request) {
  try {
    await dbConnect();

    const session = getSession(req);
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await User.findById(session.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const webauthnUserID = user.webauthnUserID || crypto.randomUUID();
    user.webauthnUserID = webauthnUserID;
    await user.save();

    const options = await generateRegistrationOptions({
      rpName: process.env.RP_NAME!,
      rpID: process.env.RP_ID!,
      userName: user.username,
      userDisplayName: user.username,
      userID: new TextEncoder().encode(webauthnUserID),
      attestationType: "none",
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
    });

    return NextResponse.json(options);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create passkey options" },
      { status: 500 },
    );
  }
}
