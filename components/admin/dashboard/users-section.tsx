"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, Package2, Users, VenusAndMars } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

type GenderKey = "male" | "female" | "other";

export interface UsersAnalytics {
  genderDistribution: Array<{
    gender: GenderKey;
    count: number;
  }>;
  ageDistribution: Array<{
    range: string;
    count: number;
  }>;
  topKits: Array<{
    kit: string;
    count: number;
  }>;
  resultsByKit: Array<{
    kit: string;
    positive: number;
    negative: number;
    invalid: number;
  }>;
}

interface UsersSectionProps {
  totalUsers: number;
  analytics?: UsersAnalytics;
}

const CHART_HEIGHT = 320;

const COLORS = {
  male: "#1D4ED8",
  female: "#E59500",
  other: "#840032",
  age: "#1B4965",
  topKits: "#247BA0",
  positive: "#81E979",
  negative: "#14BDEB",
  invalid: "#ED1C24",
};

const genderChartConfig = {
  male: {
    label: "Male",
    color: COLORS.male,
  },
  female: {
    label: "Female",
    color: COLORS.female,
  },
  other: {
    label: "Other",
    color: COLORS.other,
  },
} satisfies ChartConfig;

const ageChartConfig = {
  count: {
    label: "Users",
    color: COLORS.age,
  },
} satisfies ChartConfig;

const topKitsChartConfig = {
  count: {
    label: "Purchases",
    color: COLORS.topKits,
  },
} satisfies ChartConfig;

const resultsByKitChartConfig = {
  positive: {
    label: "Positive",
    color: COLORS.positive,
  },
  negative: {
    label: "Negative",
    color: COLORS.negative,
  },
  invalid: {
    label: "Invalid",
    color: COLORS.invalid,
  },
} satisfies ChartConfig;

const fallbackAnalytics: UsersAnalytics = {
  genderDistribution: [
    { gender: "male", count: 0 },
    { gender: "female", count: 0 },
    { gender: "other", count: 0 },
  ],
  ageDistribution: [
    { range: "Below 18", count: 0 },
    { range: "18-24", count: 0 },
    { range: "25-34", count: 0 },
    { range: "35-44", count: 0 },
    { range: "45+", count: 0 },
  ],
  topKits: [],
  resultsByKit: [],
};

function getTopItem<T extends { count: number }>(items: T[]) {
  return [...items].sort((a, b) => b.count - a.count)[0];
}

function getTopResultKit(
  items: UsersAnalytics["resultsByKit"],
): { kit: string; total: number } | null {
  if (!items.length) return null;

  const ranked = items
    .map((item) => ({
      kit: item.kit,
      total: item.positive + item.negative + item.invalid,
    }))
    .sort((a, b) => b.total - a.total);

  return ranked[0] ?? null;
}

function formatGenderLabel(gender: GenderKey) {
  if (gender === "male") return "Male";
  if (gender === "female") return "Female";
  return "Other";
}

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
      {message}
    </div>
  );
}

export function UsersSection({
  totalUsers,
  analytics = fallbackAnalytics,
}: UsersSectionProps) {
  const topGender = useMemo(
    () => getTopItem(analytics.genderDistribution),
    [analytics.genderDistribution],
  );

  const topAgeGroup = useMemo(
    () => getTopItem(analytics.ageDistribution),
    [analytics.ageDistribution],
  );

  const topKit = useMemo(
    () => getTopItem(analytics.topKits),
    [analytics.topKits],
  );

  const topResultKit = useMemo(
    () => getTopResultKit(analytics.resultsByKit),
    [analytics.resultsByKit],
  );

  const genderPieData = analytics.genderDistribution.map((item) => ({
    ...item,
    fill:
      item.gender === "male"
        ? COLORS.male
        : item.gender === "female"
          ? COLORS.female
          : COLORS.other,
  }));

  const hasGenderData = analytics.genderDistribution.some(
    (item) => item.count > 0,
  );
  const hasAgeData = analytics.ageDistribution.some((item) => item.count > 0);
  const hasTopKitsData = analytics.topKits.some((item) => item.count > 0);
  const hasResultsData = analytics.resultsByKit.some(
    (item) => item.positive > 0 || item.negative > 0 || item.invalid > 0,
  );

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Registered users
            </CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight">
              {totalUsers.toLocaleString()}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Total number of registered users currently stored in the system.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Dominant gender
            </CardTitle>
            <VenusAndMars className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight">
              {topGender ? formatGenderLabel(topGender.gender) : "—"}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {topGender
                ? `${topGender.count.toLocaleString()} users`
                : "No data yet."}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Largest age group
            </CardTitle>
            <Activity className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight">
              {topAgeGroup?.range ?? "—"}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {topAgeGroup
                ? `${topAgeGroup.count.toLocaleString()} users`
                : "No data yet."}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Most active kit
            </CardTitle>
            <Package2 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight">
              {topKit?.kit ?? topResultKit?.kit ?? "—"}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {topKit
                ? `${topKit.count.toLocaleString()} purchases`
                : topResultKit
                  ? `${topResultKit.total.toLocaleString()} recorded results`
                  : "No data yet."}
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Gender distribution</CardTitle>
            <CardDescription>
              Breakdown of registered users by gender.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: CHART_HEIGHT }}>
              {hasGenderData ? (
                <ChartContainer
                  config={genderChartConfig}
                  className="h-full w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel />}
                      />
                      <Pie
                        data={genderPieData}
                        dataKey="count"
                        nameKey="gender"
                        innerRadius={70}
                        outerRadius={110}
                        stroke="#ffffff"
                        strokeWidth={3}
                      >
                        {genderPieData.map((entry) => (
                          <Cell key={entry.gender} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartLegend
                        content={<ChartLegendContent nameKey="gender" />}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <EmptyChartState message="No gender analytics available yet." />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Age group distribution</CardTitle>
            <CardDescription>
              Number of users within each age range.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: CHART_HEIGHT }}>
              {hasAgeData ? (
                <ChartContainer
                  config={ageChartConfig}
                  className="h-full w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      accessibilityLayer
                      data={analytics.ageDistribution}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="range"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="dot" />}
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar
                        dataKey="count"
                        fill={COLORS.age}
                        radius={10}
                        name="Users"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <EmptyChartState message="No age analytics available yet." />
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Most purchased kits</CardTitle>
            <CardDescription>
              Which kits are most commonly bought by users.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: CHART_HEIGHT }}>
              {hasTopKitsData ? (
                <ChartContainer
                  config={topKitsChartConfig}
                  className="h-full w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart accessibilityLayer data={analytics.topKits}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="kit"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="dot" />}
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar
                        dataKey="count"
                        fill={COLORS.topKits}
                        radius={10}
                        name="Purchases"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <EmptyChartState message="No purchase analytics available yet." />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Result split by kit</CardTitle>
            <CardDescription>
              Each kit shows separate bars for positive, negative, and invalid
              outcomes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: CHART_HEIGHT }}>
              {hasResultsData ? (
                <ChartContainer
                  config={resultsByKitChartConfig}
                  className="h-full w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart accessibilityLayer data={analytics.resultsByKit}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="kit"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="dot" />}
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar
                        dataKey="positive"
                        fill={COLORS.positive}
                        radius={6}
                        name="Positive"
                      />
                      <Bar
                        dataKey="negative"
                        fill={COLORS.negative}
                        radius={6}
                        name="Negative"
                      />
                      <Bar
                        dataKey="invalid"
                        fill={COLORS.invalid}
                        radius={6}
                        name="Invalid"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <EmptyChartState message="No result analytics available yet." />
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
