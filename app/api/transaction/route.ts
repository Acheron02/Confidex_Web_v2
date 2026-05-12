import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import Transaction from "@/models/transactions";
import Receipt from "@/models/Receipt";
import { broadcast } from "@/server/webSocket";

void Receipt;

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

export async function POST(req: Request) {
  try {
    await dbConnect();

    const data = await req.json();

    const itemsWithResult = Array.isArray(data.items)
      ? data.items.map((item: any) => ({
          ...item,
          result: item.result || "Pending",
        }))
      : [];

    const transaction = await Transaction.create({
      user_id: data.user_id,
      status: data.status,
      items: itemsWithResult,
      purchasedDate: normalizePurchasedDate(data.purchasedDate),
    });

    broadcast({ type: "new_transaction", transaction });

    return NextResponse.json({ success: true, transaction });
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
      {
        $match: {
          user_id: new mongoose.Types.ObjectId(user_id),
        },
      },
      {
        $addFields: {
          transactionIdString: { $toString: "$_id" },
          userIdString: { $toString: "$user_id" },
        },
      },
      {
        $lookup: {
          from: "receipts",
          let: {
            txId: "$transactionIdString",
            userId: "$userIdString",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$transactionId", "$$txId"] },
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
      {
        $addFields: {
          receiptDoc: { $arrayElemAt: ["$receiptDocs", 0] },
        },
      },
      {
        $lookup: {
          from: "results",
          let: {
            productIDs: "$items.productID",
            userId: "$user_id",
            txId: "$transactionIdString",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$user_id", "$$userId"] },
                    { $eq: ["$transaction_id", "$$txId"] },
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
              {
                $ifNull: ["$receiptDoc.timestamp", "$purchasedDate"],
              },
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
