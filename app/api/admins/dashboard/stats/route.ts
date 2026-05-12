import { NextResponse } from "next/server";

import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import Receipt from "@/models/Receipt";
import Result from "@/models/results";
import Booth from "@/models/Booth";

function getAgeRange(dob: Date | string) {
  const birthDate = new Date(dob);
  const now = new Date();

  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && now.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  if (age < 18) return "Below 18";
  if (age <= 24) return "18-24";
  if (age <= 34) return "25-34";
  if (age <= 44) return "35-44";
  return "45+";
}

const KIT_LABEL_MAP: Record<string, string> = {
  hiv: "HIV Kit",
  hivkit: "HIV Kit",
  hivtest: "HIV Test Kit",
  hiv_test: "HIV Test Kit",
  "hiv-test": "HIV Test Kit",
  hiv123: "HIV Test Kit",

  pregnancy: "Pregnancy Test Kit",
  pregnancykit: "Pregnancy Test Kit",
  pregnancy_test: "Pregnancy Test Kit",
  "pregnancy-test": "Pregnancy Test Kit",

  drugtest: "Drug Test Kit",
  drug_test: "Drug Test Kit",
  "drug-test": "Drug Test Kit",

  syphilis: "Syphilis Test Kit",
  syphiliskit: "Syphilis Test Kit",
  syphilis_test: "Syphilis Test Kit",
  "syphilis-test": "Syphilis Test Kit",

  std: "STD Test Kit",
  stdkit: "STD Test Kit",
  std_test: "STD Test Kit",
  "std-test": "STD Test Kit",

  dengue: "Dengue Test Kit",
  denguekit: "Dengue Test Kit",
  dengue_test: "Dengue Test Kit",
  dengue123: "Dengue Test Kit",
};

const SERIES_COLORS = [
  "#2563EB", // Blue (strong, works both modes)
  "#DC2626", // Red
  "#16A34A", // Green
  "#7C3AED", // Violet
  "#EA580C", // Orange
  "#0891B2", // Cyan
  "#DB2777", // Pink
  "#CA8A04", // Amber
];

function monthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

function dayLabel(year: number, month: number, day: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(year, month - 1, day));
}

function normalizeKitLabel(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "Unknown Kit";

  const loweredKey = raw.toLowerCase().replace(/[\s_-]+/g, "");
  if (KIT_LABEL_MAP[loweredKey]) {
    return KIT_LABEL_MAP[loweredKey];
  }

  const cleaned = raw.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();

  const titled = cleaned.replace(/\b\w/g, (char) => char.toUpperCase());

  if (/kit/i.test(titled) || /test/i.test(titled)) {
    return titled;
  }

  return `${titled} Kit`;
}

type RevenueTrendPoint = {
  label: string;
  total: number;
  [boothKey: string]: string | number;
};

export async function GET() {
  try {
    await dbConnect();

    const totalUsers = await User.countDocuments();

    const users = await User.find({}).select("gender dob").lean();

    const genderCounts = {
      male: 0,
      female: 0,
      other: 0,
    };

    const ageCounts: Record<string, number> = {
      "Below 18": 0,
      "18-24": 0,
      "25-34": 0,
      "35-44": 0,
      "45+": 0,
    };

    for (const user of users) {
      if (user.gender === "male") genderCounts.male += 1;
      else if (user.gender === "female") genderCounts.female += 1;
      else genderCounts.other += 1;

      if (user.dob) {
        const range = getAgeRange(user.dob);
        ageCounts[range] += 1;
      }
    }

    const genderDistribution = [
      { gender: "male" as const, count: genderCounts.male },
      { gender: "female" as const, count: genderCounts.female },
      { gender: "other" as const, count: genderCounts.other },
    ];

    const ageDistribution = [
      { range: "Below 18", count: ageCounts["Below 18"] },
      { range: "18-24", count: ageCounts["18-24"] },
      { range: "25-34", count: ageCounts["25-34"] },
      { range: "35-44", count: ageCounts["35-44"] },
      { range: "45+", count: ageCounts["45+"] },
    ];

    const revenueResult = await Receipt.aggregate([
      {
        $addFields: {
          computedRevenue: {
            $ifNull: [
              "$receipt.amounts.total",
              {
                $ifNull: [
                  "$receipt.payment.payment_amount",
                  "$receipt.product.price",
                ],
              },
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: { $ifNull: ["$computedRevenue", 0] },
          },
        },
      },
    ]);

    const revenue =
      revenueResult.length > 0 ? Number(revenueResult[0].totalRevenue || 0) : 0;

    const discountResult = await Receipt.aggregate([
      {
        $group: {
          _id: null,
          totalDiscountGiven: {
            $sum: {
              $multiply: [
                { $ifNull: ["$receipt.product.price", 0] },
                {
                  $divide: [
                    { $ifNull: ["$receipt.amounts.discount_percent", 0] },
                    100,
                  ],
                },
              ],
            },
          },
        },
      },
    ]);

    const totalDiscountGiven =
      discountResult.length > 0
        ? Number(discountResult[0].totalDiscountGiven || 0)
        : 0;

    const bestSellingRaw = await Receipt.aggregate([
      {
        $group: {
          _id: {
            $ifNull: [
              "$receipt.product.product_id",
              {
                $ifNull: ["$receipt.product.type", "Unknown Kit"],
              },
            ],
          },
          count: { $sum: 1 },
          revenue: {
            $sum: {
              $ifNull: [
                "$receipt.amounts.total",
                {
                  $ifNull: [
                    "$receipt.payment.payment_amount",
                    "$receipt.product.price",
                  ],
                },
              ],
            },
          },
        },
      },
      { $sort: { count: -1, revenue: -1 } },
      { $limit: 1 },
    ]);

    const bestSellingProduct =
      bestSellingRaw.length > 0
        ? {
            label: normalizeKitLabel(bestSellingRaw[0]._id),
            count: Number(bestSellingRaw[0].count || 0),
            revenue: Number(bestSellingRaw[0].revenue || 0),
          }
        : null;

    const topKitsRaw = await Receipt.aggregate([
      {
        $group: {
          _id: {
            $ifNull: [
              "$receipt.product.product_id",
              {
                $ifNull: ["$receipt.product.type", "Unknown Kit"],
              },
            ],
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]);

    const topKits = topKitsRaw.map((item) => ({
      kit: normalizeKitLabel(item._id),
      count: Number(item.count || 0),
    }));

    const resultsRaw = await Result.aggregate([
      {
        $addFields: {
          normalizedResult: {
            $toLower: {
              $trim: {
                input: { $ifNull: ["$result", ""] },
              },
            },
          },
          kitKey: {
            $ifNull: ["$productID", "Unknown Kit"],
          },
        },
      },
      {
        $group: {
          _id: "$kitKey",
          positive: {
            $sum: {
              $cond: [{ $eq: ["$normalizedResult", "positive"] }, 1, 0],
            },
          },
          negative: {
            $sum: {
              $cond: [{ $eq: ["$normalizedResult", "negative"] }, 1, 0],
            },
          },
          invalid: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$normalizedResult", "positive"] },
                    { $ne: ["$normalizedResult", "negative"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const resultsByKit = resultsRaw.map((item) => ({
      kit: normalizeKitLabel(item._id),
      positive: Number(item.positive || 0),
      negative: Number(item.negative || 0),
      invalid: Number(item.invalid || 0),
    }));

    const monthlyRaw = await Receipt.aggregate([
      {
        $addFields: {
          trendDate: {
            $ifNull: ["$receipt.purchase.datetime_iso", "$createdAt"],
          },
          computedRevenue: {
            $ifNull: [
              "$receipt.amounts.total",
              {
                $ifNull: [
                  "$receipt.payment.payment_amount",
                  "$receipt.product.price",
                ],
              },
            ],
          },
          boothKey: {
            $ifNull: ["$boothId", "unknown_booth"],
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: { $toDate: "$trendDate" } },
            month: { $month: { $toDate: "$trendDate" } },
            boothId: "$boothKey",
          },
          revenue: { $sum: { $ifNull: ["$computedRevenue", 0] } },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const dailyRaw = await Receipt.aggregate([
      {
        $addFields: {
          trendDate: {
            $ifNull: ["$receipt.purchase.datetime_iso", "$createdAt"],
          },
          computedRevenue: {
            $ifNull: [
              "$receipt.amounts.total",
              {
                $ifNull: [
                  "$receipt.payment.payment_amount",
                  "$receipt.product.price",
                ],
              },
            ],
          },
          boothKey: {
            $ifNull: ["$boothId", "unknown_booth"],
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: { $toDate: "$trendDate" } },
            month: { $month: { $toDate: "$trendDate" } },
            day: { $dayOfMonth: { $toDate: "$trendDate" } },
            boothId: "$boothKey",
          },
          revenue: { $sum: { $ifNull: ["$computedRevenue", 0] } },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    const yearlyRaw = await Receipt.aggregate([
      {
        $addFields: {
          trendDate: {
            $ifNull: ["$receipt.purchase.datetime_iso", "$createdAt"],
          },
          computedRevenue: {
            $ifNull: [
              "$receipt.amounts.total",
              {
                $ifNull: [
                  "$receipt.payment.payment_amount",
                  "$receipt.product.price",
                ],
              },
            ],
          },
          boothKey: {
            $ifNull: ["$boothId", "unknown_booth"],
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: { $toDate: "$trendDate" } },
            boothId: "$boothKey",
          },
          revenue: { $sum: { $ifNull: ["$computedRevenue", 0] } },
        },
      },
      { $sort: { "_id.year": 1 } },
    ]);

    const booths = await Booth.find({}).select("_id name").lean();

    const boothRevenueRaw = await Receipt.aggregate([
      {
        $addFields: {
          computedRevenue: {
            $ifNull: [
              "$receipt.amounts.total",
              {
                $ifNull: [
                  "$receipt.payment.payment_amount",
                  "$receipt.product.price",
                ],
              },
            ],
          },
          boothKey: {
            $ifNull: ["$boothId", "unknown_booth"],
          },
        },
      },
      {
        $group: {
          _id: "$boothKey",
          totalRevenue: {
            $sum: { $ifNull: ["$computedRevenue", 0] },
          },
          transactionCount: { $sum: 1 },
        },
      },
    ]);

    const boothNameMap = new Map<string, string>(
      booths.map((booth) => [String(booth._id), booth.name || "Unnamed Booth"]),
    );

    const dailyMap = new Map<string, RevenueTrendPoint>();

    dailyRaw.forEach((item) => {
      const year = Number(item._id.year);
      const month = Number(item._id.month);
      const day = Number(item._id.day);
      const boothId = String(item._id.boothId || "unknown_booth");

      const label = dayLabel(year, month, day);
      const revenueValue = Number(item.revenue || 0);

      if (!dailyMap.has(label)) {
        dailyMap.set(label, { label, total: 0 });
      }

      const row = dailyMap.get(label)!;
      row.total = Number(row.total) + revenueValue;
      row[boothId] = revenueValue;
    });

    const monthlyMap = new Map<string, RevenueTrendPoint>();
    monthlyRaw.forEach((item) => {
      const year = Number(item._id.year);
      const month = Number(item._id.month);
      const boothId = String(item._id.boothId || "unknown_booth");
      const label = monthLabel(year, month);
      const revenueValue = Number(item.revenue || 0);

      if (!monthlyMap.has(label)) {
        monthlyMap.set(label, { label, total: 0 });
      }

      const row = monthlyMap.get(label)!;
      row.total = Number(row.total) + revenueValue;
      row[boothId] = revenueValue;
    });

    const boothRevenueMap = new Map<
      string,
      { totalRevenue: number; transactionCount: number }
    >(
      boothRevenueRaw.map((item) => [
        String(item._id),
        {
          totalRevenue: Number(item.totalRevenue || 0),
          transactionCount: Number(item.transactionCount || 0),
        },
      ]),
    );

    const boothRevenueSummary = booths.map((booth) => {
      const boothId = String(booth._id);
      const stats = boothRevenueMap.get(boothId);

      return {
        boothId,
        boothName: booth.name || "Unnamed Booth",
        totalRevenue: stats?.totalRevenue ?? 0,
        transactionCount: stats?.transactionCount ?? 0,
      };
    });

    const yearlyMap = new Map<string, RevenueTrendPoint>();
    yearlyRaw.forEach((item) => {
      const year = String(item._id.year);
      const boothId = String(item._id.boothId || "unknown_booth");
      const revenueValue = Number(item.revenue || 0);

      if (!yearlyMap.has(year)) {
        yearlyMap.set(year, { label: year, total: 0 });
      }

      const row = yearlyMap.get(year)!;
      row.total = Number(row.total) + revenueValue;
      row[boothId] = revenueValue;
    });

    const dailyTrend = Array.from(dailyMap.values());
    const monthlyTrend = Array.from(monthlyMap.values());
    const yearlyTrend = Array.from(yearlyMap.values());

    const boothIds = Array.from(
      new Set([
        ...monthlyRaw.map((item) =>
          String(item._id.boothId || "unknown_booth"),
        ),
        ...yearlyRaw.map((item) => String(item._id.boothId || "unknown_booth")),
      ]),
    );

    const boothSeries = booths.map((booth, index) => ({
      boothId: String(booth._id),
      boothName: booth.name || "Unnamed Booth",
      color: SERIES_COLORS[(index + 1) % SERIES_COLORS.length],
    }));

    const yearlyRevenue = yearlyTrend.map((item) => ({
      year: item.label,
      revenue: Number(item.total || 0),
    }));

    return NextResponse.json({
      totalUsers,
      revenue,
      userAnalytics: {
        genderDistribution,
        ageDistribution,
        topKits,
        resultsByKit,
      },
      revenueAnalytics: {
        totalRevenue: revenue,
        totalDiscountGiven,
        bestSellingProduct,
        yearlyRevenue,
        dailyTrend,
        monthlyTrend,
        yearlyTrend,
        boothSeries,
        boothRevenueSummary,
      },
    });
  } catch (error) {
    console.error("[ADMIN_DASHBOARD_STATS_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 },
    );
  }
}