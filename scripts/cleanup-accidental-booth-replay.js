const { MongoClient, ObjectId } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB;

if (!MONGODB_URI || !MONGODB_DB) {
  console.error("Required:");
  console.error(
    "MONGODB_URI='...' MONGODB_DB='Confidex_v2' node scripts/fix-transaction-result-values.js",
  );
  process.exit(1);
}

const DO_UPDATE = String(process.env.DO_UPDATE || "").toLowerCase() === "true";

const START = new Date(process.env.START || "2026-05-01T00:00:00.000Z");
const END = new Date(process.env.END || "2026-06-02T00:00:00.000Z");

function clean(value) {
  return String(value || "").trim();
}

function normalizeDisplayResult(value) {
  const raw = clean(value);
  const lower = raw.toLowerCase();

  if (!raw) return "";

  if (lower === "positive") return "Positive";
  if (lower === "negative") return "Negative";
  if (lower === "invalid") return "Invalid";
  if (lower === "pending") return "Pending";

  if (
    lower.includes("no object") ||
    lower.includes("not detected") ||
    lower.includes("uncertain") ||
    lower.includes("error") ||
    lower.includes("failed")
  ) {
    return "Invalid";
  }

  return raw;
}

function pickEffectiveResult(resultDoc) {
  const candidates = [
    resultDoc.override_result,
    resultDoc.overrideResult,
    resultDoc.original_result,
    resultDoc.originalResult,
    resultDoc.result,
    resultDoc.final_result,
    resultDoc.finalResult,
  ];

  for (const item of candidates) {
    const normalized = normalizeDisplayResult(item);

    if (normalized && normalized !== "Pending") {
      return normalized;
    }
  }

  return "Pending";
}

function pickUrl(doc, keys) {
  for (const key of keys) {
    const value = clean(doc[key]);
    if (value) return value;
  }
  return "";
}

function isObjectIdString(value) {
  return (
    typeof value === "string" &&
    /^[a-fA-F0-9]{24}$/.test(value) &&
    ObjectId.isValid(value)
  );
}

function asObjectIdMaybe(value) {
  const raw = clean(value);
  if (isObjectIdString(raw)) return new ObjectId(raw);
  return raw;
}

function getResultTransactionId(resultDoc) {
  return clean(
    resultDoc.transaction_id ||
      resultDoc.transactionID ||
      resultDoc.transactionId ||
      resultDoc.website_transaction_id ||
      resultDoc.websiteTransactionId ||
      resultDoc.transaction,
  );
}

function buildSet(resultDoc) {
  const result = pickEffectiveResult(resultDoc);

  const resultImageUrl = pickUrl(resultDoc, [
    "result_image",
    "resultImageUrl",
    "result_image_url",
    "annotated_image",
    "annotatedImageUrl",
    "annotated_image_url",
  ]);

  const annotatedUrl = pickUrl(resultDoc, [
    "annotated_image",
    "annotatedImageUrl",
    "annotated_image_url",
    "result_image",
    "resultImageUrl",
    "result_image_url",
  ]);

  const originalUrl = pickUrl(resultDoc, [
    "original_image",
    "originalImageUrl",
    "original_image_url",
  ]);

  const rawUrl = pickUrl(resultDoc, [
    "raw_image",
    "rawImageUrl",
    "raw_image_url",
  ]);

  const set = {
    result,
    test_result: result,
    testResult: result,
    result_status: result,
    resultStatus: result,
    latest_result_id: String(resultDoc._id),
    latestResultId: String(resultDoc._id),
    result_updated_at: new Date(),
    resultUpdatedAt: new Date(),

    "items.$[].result": result,
    "items.$[].test_result": result,
    "items.$[].testResult": result,
    "items.$[].result_status": result,
    "items.$[].resultStatus": result,
    "items.$[].latest_result_id": String(resultDoc._id),
    "items.$[].latestResultId": String(resultDoc._id),
  };

  if (resultImageUrl) {
    set.result_image = resultImageUrl;
    set.resultImageUrl = resultImageUrl;
    set.result_image_url = resultImageUrl;

    set["items.$[].result_image"] = resultImageUrl;
    set["items.$[].resultImageUrl"] = resultImageUrl;
    set["items.$[].result_image_url"] = resultImageUrl;
  }

  if (annotatedUrl) {
    set.annotated_image = annotatedUrl;
    set.annotatedImageUrl = annotatedUrl;
    set.annotated_image_url = annotatedUrl;

    set["items.$[].annotated_image"] = annotatedUrl;
    set["items.$[].annotatedImageUrl"] = annotatedUrl;
    set["items.$[].annotated_image_url"] = annotatedUrl;
  }

  if (originalUrl) {
    set.original_image = originalUrl;
    set.originalImageUrl = originalUrl;
    set.original_image_url = originalUrl;

    set["items.$[].original_image"] = originalUrl;
    set["items.$[].originalImageUrl"] = originalUrl;
    set["items.$[].original_image_url"] = originalUrl;
  }

  if (rawUrl) {
    set.raw_image = rawUrl;
    set.rawImageUrl = rawUrl;
    set.raw_image_url = rawUrl;

    set["items.$[].raw_image"] = rawUrl;
    set["items.$[].rawImageUrl"] = rawUrl;
    set["items.$[].raw_image_url"] = rawUrl;
  }

  return set;
}

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();

  const db = client.db(MONGODB_DB);
  const transactions = db.collection("transactions");
  const results = db.collection("results");

  console.log("");
  console.log("Database:", db.databaseName);
  console.log("Range:", START.toISOString(), "to", END.toISOString());
  console.log("Mode:", DO_UPDATE ? "UPDATE" : "DRY RUN");
  console.log("");

  const resultDocs = await results
    .find({
      $or: [
        { createdAt: { $gte: START, $lt: END } },
        { testedDate: { $gte: START, $lt: END } },
        { updatedAt: { $gte: START, $lt: END } },
      ],
    })
    .sort({ updatedAt: -1, createdAt: -1 })
    .toArray();

  const latestByTx = new Map();

  for (const resultDoc of resultDocs) {
    const tx = getResultTransactionId(resultDoc);
    if (!tx) continue;

    const normalized = pickEffectiveResult(resultDoc);

    // Do not let an older/pending result replace a final one.
    if (!latestByTx.has(tx)) {
      latestByTx.set(tx, resultDoc);
      continue;
    }

    const existing = latestByTx.get(tx);
    const existingResult = pickEffectiveResult(existing);

    if (existingResult === "Pending" && normalized !== "Pending") {
      latestByTx.set(tx, resultDoc);
    }
  }

  let matched = 0;
  let updated = 0;
  let missing = 0;
  let skippedPending = 0;

  for (const [tx, resultDoc] of latestByTx.entries()) {
    const normalizedResult = pickEffectiveResult(resultDoc);

    if (normalizedResult === "Pending") {
      skippedPending++;
      console.log(
        `[SKIP] tx=${tx} result is still Pending in results collection`,
      );
      continue;
    }

    const txObjId = asObjectIdMaybe(tx);

    const txDoc = await transactions.findOne({
      $or: [
        { _id: txObjId },
        { transaction_id: tx },
        { transactionID: tx },
        { transactionId: tx },
        { website_transaction_id: tx },
        { websiteTransactionId: tx },
      ],
    });

    if (!txDoc) {
      missing++;
      console.log(
        `[MISS] No transaction found for result tx=${tx} normalizedResult=${normalizedResult}`,
      );
      continue;
    }

    matched++;

    const set = buildSet(resultDoc);

    console.log(
      `[PATCH] tx=${tx} transaction=${txDoc._id} result=${normalizedResult}`,
    );

    if (!DO_UPDATE) continue;

    const res = await transactions.updateOne({ _id: txDoc._id }, { $set: set });

    updated += res.modifiedCount;
  }

  console.log("");
  console.log("Summary:");
  console.log("  results scanned:", resultDocs.length);
  console.log("  unique transaction ids:", latestByTx.size);
  console.log("  matched:", matched);
  console.log("  missing:", missing);
  console.log("  skipped pending:", skippedPending);
  console.log("  updated:", updated);

  if (!DO_UPDATE) {
    console.log("");
    console.log("DRY RUN ONLY. Rerun with DO_UPDATE=true.");
  }

  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
