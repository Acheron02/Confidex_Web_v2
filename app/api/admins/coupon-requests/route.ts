import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { getSessionFromRequest } from "@/lib/session";
import { isAdminRole } from "@/lib/rbac";
import CouponRequest from "@/models/CouponRequest";
import Receipt from "@/models/Receipt";
import User from "@/models/User";

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function serializeRequest(item: any, receipt: any, user: any) {
  const receiptPayload = receipt?.receipt || {};
  const product = receiptPayload?.product || {};
  const purchase = receiptPayload?.purchase || {};

  return {
    _id: String(item._id),
    userId: String(item.userId),
    username: user?.username ? String(user.username) : "Unknown user",
    transactionId: String(item.transactionId),
    status: String(item.status || "pending"),
    note: String(item.note || ""),
    adminNote: String(item.adminNote || ""),
    couponToken: item.couponToken ? String(item.couponToken) : null,
    verification: item.verification || {},
    productName: cleanText(product?.name || "Health Screening Kit"),
    productType: cleanText(product?.type || ""),
    purchaseDate: cleanText(
      purchase?.datetime_iso || purchase?.date || receipt?.timestamp || "",
    ),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    reviewedAt: item.reviewedAt || null,
    reviewedBy: item.reviewedBy || null,
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);

    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const status = cleanText(searchParams.get("status") || "pending");

    const filter =
      status === "all"
        ? {}
        : {
            status,
          };

    const requests = await CouponRequest.find(filter)
      .sort({
        createdAt: -1,
      })
      .lean();

    const receiptIds = requests.map((item: any) => item.receiptId);
    const userIds = requests.map((item: any) => item.userId);

    const [receipts, users] = await Promise.all([
      Receipt.find({ _id: { $in: receiptIds } }).lean(),
      User.find({ _id: { $in: userIds } })
        .select("_id username")
        .lean(),
    ]);

    const receiptLookup = new Map(
      receipts.map((receipt: any) => [String(receipt._id), receipt]),
    );

    const userLookup = new Map(
      users.map((user: any) => [String(user._id), user]),
    );

    return NextResponse.json({
      ok: true,
      requests: requests.map((item: any) =>
        serializeRequest(
          item,
          receiptLookup.get(String(item.receiptId)),
          userLookup.get(String(item.userId)),
        ),
      ),
    });
  } catch (error) {
    console.error("[ADMIN COUPON REQUESTS][GET] error:", error);

    return NextResponse.json(
      { error: "Failed to fetch coupon requests" },
      { status: 500 },
    );
  }
}
