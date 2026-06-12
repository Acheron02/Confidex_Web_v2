import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import Transaction from "@/models/transactions";
import Receipt from "@/models/Receipt";
import { broadcast } from "@/server/webSocket";

void Receipt;

type AnyRecord = Record<string, any>;

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function numberValue(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function hasTimezone(value: string) {
  return /(?:z|[+-]\d{2}:?\d{2})$/i.test(value.trim());
}

function parseManilaLocalDate(value: string) {
  const normalized = value.trim().replace(" ", "T");
  const match = normalized.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?)?$/,
  );

  if (!match) return null;

  const [, year, month, day, hour = "00", minute = "00", second = "00"] = match;

  return new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour) - 8,
      Number(minute),
      Number(second),
    ),
  );
}

function normalizePurchasedDate(value: unknown) {
  if (!value) return new Date();

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? new Date() : value;
  }

  const raw = String(value).trim();

  if (!raw) return new Date();

  const parsed = hasTimezone(raw)
    ? new Date(raw)
    : (parseManilaLocalDate(raw) ?? new Date(raw));

  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function normalizeItems(items: unknown): AnyRecord[] {
  if (!Array.isArray(items)) return [];

  return items
    .map((item: any) => {
      const productID = clean(item?.productID || item?.product_id || item?.id);
      const name = clean(
        item?.name || item?.productName || productID || "Test Kit",
      );

      if (!productID && !name) return null;

      return {
        name: name || productID || "Test Kit",
        productID: productID || name || "UNKNOWN",
        type: clean(item?.type),
        price: numberValue(item?.price, 0),
        discount: numberValue(item?.discount, 0),
        finalPrice: numberValue(
          item?.finalPrice ?? item?.final_price,
          numberValue(item?.price, 0),
        ),
        result: clean(item?.result) || "Pending",
      };
    })
    .filter(Boolean) as AnyRecord[];
}

function getPrimaryTransactionId(data: AnyRecord) {
  return clean(
    data.transaction_id ||
      data.transactionID ||
      data.transactionId ||
      data.local_transaction_id ||
      data.offline_local_transaction_id ||
      data.payment_reference,
  );
}

function transactionLookup(userId: unknown, transactionId: string) {
  const userObjectId = mongoose.Types.ObjectId.isValid(clean(userId))
    ? new mongoose.Types.ObjectId(clean(userId))
    : null;

  const txObjectId = mongoose.Types.ObjectId.isValid(transactionId)
    ? new mongoose.Types.ObjectId(transactionId)
    : null;

  const txOr: Record<string, unknown>[] = [
    { transaction_id: transactionId },
    { transactionID: transactionId },
    { transactionId: transactionId },
    { local_transaction_id: transactionId },
    { offline_local_transaction_id: transactionId },
    { payment_reference: transactionId },
    { website_transaction_id: transactionId },
    { websiteTransactionId: transactionId },
  ];

  if (txObjectId) txOr.unshift({ _id: txObjectId });

  return userObjectId ? { user_id: userObjectId, $or: txOr } : { $or: txOr };
}

export async function POST(req: Request) {
  try {
    await dbConnect();

    const data = (await req.json()) as AnyRecord;
    const primaryTransactionId = getPrimaryTransactionId(data);
    const itemsWithResult = normalizeItems(data.items);

    if (
      !clean(data.user_id) ||
      !mongoose.Types.ObjectId.isValid(clean(data.user_id))
    ) {
      return NextResponse.json(
        { success: false, error: "A valid user_id is required" },
        { status: 400 },
      );
    }

    const userObjectId = new mongoose.Types.ObjectId(clean(data.user_id));
    const baseDoc: AnyRecord = {
      user_id: userObjectId,
      transaction_id: primaryTransactionId,
      transactionID: clean(
        data.transactionID || data.transactionId || primaryTransactionId,
      ),
      transactionId: clean(
        data.transactionId || data.transactionID || primaryTransactionId,
      ),
      local_transaction_id: clean(
        data.local_transaction_id || primaryTransactionId,
      ),
      offline_local_transaction_id: clean(
        data.offline_local_transaction_id || primaryTransactionId,
      ),
      status: clean(data.status) || "completed",
      items: itemsWithResult.length
        ? itemsWithResult
        : [
            {
              name: clean(data.productName || data.product_name || "Test Kit"),
              productID: clean(data.productID || data.product_id || "UNKNOWN"),
              type: clean(data.type),
              price: numberValue(data.price, 0),
              discount: numberValue(data.discount, 0),
              finalPrice: numberValue(
                data.total ?? data.finalPrice,
                numberValue(data.price, 0),
              ),
              result: "Pending",
            },
          ],
      purchasedDate: normalizePurchasedDate(
        data.purchasedDate || data.purchased_date || data.createdAt,
      ),
      discount: numberValue(data.discount ?? data.discount_percent, 0),
      total: numberValue(data.total, 0),
      total_paid: numberValue(data.total_paid ?? data.amount_paid, 0),
      change: numberValue(data.change, 0),
      payment_method: clean(data.payment_method || data.paymentMethod),
      payment_session_id: clean(
        data.payment_session_id || data.paymentSessionId,
      ),
      payment_reference: clean(
        data.payment_reference || data.paymentReference || primaryTransactionId,
      ),
      payment_status: clean(
        data.payment_status || data.paymentStatus || "paid",
      ),
      offline_synced_from_booth: Boolean(
        data.offline_synced_from_booth ||
        primaryTransactionId.startsWith("LOCAL-"),
      ),
    };

    const existing = primaryTransactionId
      ? await Transaction.findOne(
          transactionLookup(userObjectId, primaryTransactionId),
        )
      : null;

    const transaction = existing
      ? await Transaction.findByIdAndUpdate(
          existing._id,
          { $set: baseDoc },
          { new: true, runValidators: true },
        )
      : await Transaction.create(baseDoc);

    broadcast({
      type: existing ? "transaction_updated" : "new_transaction",
      transaction,
    });

    return NextResponse.json({
      success: true,
      transaction,
      idempotent: Boolean(existing),
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
    });
  }
}

export async function GET(req: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get("user_id");

    if (!user_id || !mongoose.Types.ObjectId.isValid(user_id)) {
      return NextResponse.json({
        success: false,
        error: "A valid user_id is required",
      });
    }

    const transactions = await Transaction.aggregate([
      { $match: { user_id: new mongoose.Types.ObjectId(user_id) } },
      {
        $addFields: {
          transactionIdString: { $toString: "$_id" },
          userIdString: { $toString: "$user_id" },
          transactionLookupIds: {
            $setUnion: [
              [
                { $toString: "$_id" },
                "$transaction_id",
                "$transactionID",
                "$transactionId",
                "$local_transaction_id",
                "$offline_local_transaction_id",
                "$payment_reference",
              ],
              [],
            ],
          },
        },
      },
      {
        $lookup: {
          from: "receipts",
          let: { txIds: "$transactionLookupIds", userId: "$userIdString" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$transactionId", "$$txIds"] },
                    { $eq: ["$userId", "$$userId"] },
                  ],
                },
              },
            },
            {
              $project: {
                timestamp: 1,
                "receipt.purchase.datetime_iso": 1,
                "receipt.purchase.date": 1,
                "receipt.purchase.time": 1,
              },
            },
            { $limit: 1 },
          ],
          as: "receiptDocs",
        },
      },
      { $addFields: { receiptDoc: { $arrayElemAt: ["$receiptDocs", 0] } } },
      {
        $lookup: {
          from: "results",
          let: {
            productIDs: "$items.productID",
            userId: "$user_id",
            txIds: "$transactionLookupIds",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$user_id", "$$userId"] },
                    { $in: ["$transaction_id", "$$txIds"] },
                    { $in: ["$productID", "$$productIDs"] },
                  ],
                },
              },
            },
            { $sort: { testedDate: -1, updatedAt: -1, createdAt: -1 } },
          ],
          as: "matchedResults",
        },
      },
      {
        $addFields: {
          displayPurchasedDate: {
            $ifNull: [
              "$receiptDoc.receipt.purchase.datetime_iso",
              { $ifNull: ["$receiptDoc.timestamp", "$purchasedDate"] },
            ],
          },
          receiptPurchaseDate: "$receiptDoc.receipt.purchase.date",
          receiptPurchaseTime: "$receiptDoc.receipt.purchase.time",
          items: {
            $map: {
              input: "$items",
              as: "item",
              in: {
                name: "$$item.name",
                productID: "$$item.productID",
                result: {
                  $let: {
                    vars: {
                      matched: {
                        $filter: {
                          input: "$matchedResults",
                          cond: {
                            $eq: ["$$this.productID", "$$item.productID"],
                          },
                        },
                      },
                    },
                    in: {
                      $ifNull: [
                        { $arrayElemAt: ["$$matched.result", 0] },
                        "$$item.result",
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
      {
        $project: {
          matchedResults: 0,
          receiptDocs: 0,
          receiptDoc: 0,
          transactionIdString: 0,
          userIdString: 0,
          transactionLookupIds: 0,
          __v: 0,
        },
      },
      { $sort: { purchasedDate: -1 } },
    ]);

    return NextResponse.json({ success: true, transactions });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
    });
  }
}
