import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";
import Transaction from "@/models/transactions";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    await dbConnect();

    const param = await params;
    const userId = param.userId;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const transactionIds = Array.isArray(body?.transactionIds)
      ? body.transactionIds
      : [];

    if (transactionIds.length === 0) {
      return NextResponse.json(
        { error: "No transactions selected" },
        { status: 400 },
      );
    }

    const validTransactionIds = transactionIds.filter((id: string) =>
      mongoose.Types.ObjectId.isValid(id),
    );

    if (validTransactionIds.length === 0) {
      return NextResponse.json(
        { error: "No valid transaction IDs provided" },
        { status: 400 },
      );
    }

    const result = await Transaction.deleteMany({
      user_id: userId,
      _id: { $in: validTransactionIds },
    });

    return NextResponse.json(
      {
        message: "Selected transactions deleted successfully",
        deletedCount: result.deletedCount,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Delete selected transactions error:", error);
    return NextResponse.json(
      { error: "Failed to delete selected transactions" },
      { status: 500 },
    );
  }
}
