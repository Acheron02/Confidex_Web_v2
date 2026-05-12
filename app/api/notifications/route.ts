import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { getSessionFromRequest } from "@/lib/session";
import Notification from "@/models/Notification";

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);

    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const notifications = await Notification.find({
      userId: session.id,
      readAt: null,
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return NextResponse.json({
      ok: true,
      notifications: notifications.map((item: any) => ({
        _id: String(item._id),
        type: String(item.type || ""),
        title: String(item.title || ""),
        message: String(item.message || ""),
        href: String(item.href || ""),
        data: item.data || {},
        createdAt: item.createdAt,
      })),
    });
  } catch (error) {
    console.error("[NOTIFICATIONS][GET] error:", error);

    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);

    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const body = await req.json().catch(() => ({}));
    const ids = Array.isArray(body?.ids)
      ? body.ids.map((id: unknown) => String(id).trim()).filter(Boolean)
      : [];

    if (ids.length === 0) {
      return NextResponse.json({ ok: true, modified: 0 });
    }

    const result = await Notification.updateMany(
      {
        _id: { $in: ids },
        userId: session.id,
      },
      {
        $set: {
          readAt: new Date(),
        },
      },
    );

    return NextResponse.json({
      ok: true,
      modified: result.modifiedCount || 0,
    });
  } catch (error) {
    console.error("[NOTIFICATIONS][PATCH] error:", error);

    return NextResponse.json(
      { error: "Failed to update notifications" },
      { status: 500 },
    );
  }
}
