"use client";

import * as React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import {
  BadgePercent,
  CalendarRange,
  Package2,
  PhilippinePeso,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type RevenueTrendPoint = {
  label: string;
  total: number;
  [boothKey: string]: string | number;
};

type BoothRevenueSeries = {
  boothId: string;
  boothName: string;
  color: string;
};

type LegendItem = {
  key: string;
  label: string;
  color: string;
};

export interface RevenueAnalytics {
  totalRevenue: number;
  totalDiscountGiven: number;
  bestSellingProduct: {
    label: string;
    count: number;
    revenue: number;
  } | null;
  yearlyRevenue: Array<{
    year: string;
    revenue: number;
  }>;
  dailyTrend: RevenueTrendPoint[];
  monthlyTrend: RevenueTrendPoint[];
  yearlyTrend: RevenueTrendPoint[];
  boothSeries: BoothRevenueSeries[];
  boothRevenueSummary: Array<{
    boothId: string;
    boothName: string;
    totalRevenue: number;
    transactionCount: number;
  }>;
}

interface RevenueSectionProps {
  revenue: number;
  analytics?: RevenueAnalytics;
}

const CHART_HEIGHT = 360;

const TOTAL_LINE_COLOR = "#111827";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(value);
}

function getChartConfig(boothSeries: BoothRevenueSeries[]): ChartConfig {
  const config: ChartConfig = {
    total: {
      label: "All Booths",
      color: TOTAL_LINE_COLOR,
    },
  };

  boothSeries.forEach((booth) => {
    config[booth.boothId] = {
      label: booth.boothName,
      color: booth.color,
    };
  });

  return config;
}

function getLegendGridClass(count: number) {
  if (count <= 4) return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";
  if (count <= 9) return "grid-cols-2 sm:grid-cols-3";
  if (count <= 12) return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";
  if (count <= 16) return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";
  if (count <= 20) {
    return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";
  }
  return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6";
}

function getLegendColumnCount(count: number) {
  if (count <= 4) return 4;
  if (count <= 9) return 3;
  if (count <= 12) return 4;
  if (count <= 16) return 4;
  if (count <= 20) return 5;
  return 6;
}

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
      {message}
    </div>
  );
}

export function RevenueSection({ revenue, analytics }: RevenueSectionProps) {
  const [mode, setMode] = React.useState<"daily" | "monthly" | "yearly">(
    "monthly",
  );
  const [selectedBooths, setSelectedBooths] = React.useState<string[]>([]);

  const safeAnalytics: RevenueAnalytics = React.useMemo(
    () =>
      analytics ?? {
        totalRevenue: revenue,
        totalDiscountGiven: 0,
        bestSellingProduct: null,
        yearlyRevenue: [],
        dailyTrend: [],
        monthlyTrend: [],
        yearlyTrend: [],
        boothSeries: [],
        boothRevenueSummary: [],
      },
    [analytics, revenue],
  );

  const chartData = React.useMemo(() => {
    if (mode === "daily") return safeAnalytics.dailyTrend;
    if (mode === "monthly") return safeAnalytics.monthlyTrend;
    return safeAnalytics.yearlyTrend;
  }, [
    mode,
    safeAnalytics.dailyTrend,
    safeAnalytics.monthlyTrend,
    safeAnalytics.yearlyTrend,
  ]);

  const chartConfig = React.useMemo(
    () => getChartConfig(safeAnalytics.boothSeries),
    [safeAnalytics.boothSeries],
  );

  const hasChartData = chartData.some((point) =>
    Object.entries(point).some(
      ([key, value]) =>
        key !== "label" && typeof value === "number" && value > 0,
    ),
  );

  const latestYearRevenue =
    safeAnalytics.yearlyRevenue.length > 0
      ? safeAnalytics.yearlyRevenue[safeAnalytics.yearlyRevenue.length - 1]
      : null;

  const visibleLegendItems = React.useMemo<LegendItem[]>(() => {
    const items: LegendItem[] = [
      {
        key: "total",
        label: "All Booths",
        color: TOTAL_LINE_COLOR,
      },
    ];

    safeAnalytics.boothSeries
      .filter((booth) => selectedBooths.includes(booth.boothId))
      .forEach((booth) => {
        items.push({
          key: booth.boothId,
          label: booth.boothName,
          color: booth.color,
        });
      });

    return items;
  }, [safeAnalytics.boothSeries, selectedBooths]);

  const legendGridClass = React.useMemo(
    () => getLegendGridClass(visibleLegendItems.length),
    [visibleLegendItems.length],
  );

  const legendRowCount = React.useMemo(() => {
    const count = visibleLegendItems.length;
    if (count <= 0) return 0;

    const columns = getLegendColumnCount(count);
    return Math.ceil(count / columns);
  }, [visibleLegendItems.length]);

  const legendHeight = React.useMemo(() => {
    if (visibleLegendItems.length === 0) return 0;
    return legendRowCount * 44 + Math.max(0, legendRowCount - 1) * 8;
  }, [legendRowCount, visibleLegendItems.length]);

  const bottomCardHeight = CHART_HEIGHT + legendHeight + 112;

  const toggleBooth = (boothId: string, checked: boolean) => {
    setSelectedBooths((current) =>
      checked ? [...current, boothId] : current.filter((id) => id !== boothId),
    );
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total revenue</CardTitle>
            <PhilippinePeso className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight">
              {formatCurrency(safeAnalytics.totalRevenue || revenue)}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Combined revenue from recorded completed transactions.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Best-selling product
            </CardTitle>
            <Package2 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight">
              {safeAnalytics.bestSellingProduct?.label ?? "—"}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {safeAnalytics.bestSellingProduct
                ? `${safeAnalytics.bestSellingProduct.count.toLocaleString()} sales`
                : "No product sales data yet."}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Discount given
            </CardTitle>
            <BadgePercent className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight">
              {formatCurrency(safeAnalytics.totalDiscountGiven)}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Total discount value granted across all completed purchases.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Latest yearly revenue
            </CardTitle>
            <CalendarRange className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight">
              {latestYearRevenue
                ? formatCurrency(latestYearRevenue.revenue)
                : "—"}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {latestYearRevenue
                ? `Revenue recorded for ${latestYearRevenue.year}.`
                : "No yearly revenue summary available yet."}
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid items-stretch gap-6 xl:grid-cols-[1fr_1.05fr]">
        <Card
          className="flex min-h-0 flex-col rounded-2xl"
          style={{ height: bottomCardHeight }}
        >
          <CardHeader className="flex shrink-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>Revenue trend</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Total revenue for all booths, with optional booth-level
                overlays.
              </p>
            </div>

            <Tabs
              value={mode}
              onValueChange={(value) =>
                setMode(value as "daily" | "monthly" | "yearly")
              }
            >
              <TabsList className="grid w-[320px] grid-cols-3 rounded-xl bg-muted">
                <TabsTrigger
                  value="daily"
                  className={`rounded-lg transition-all ${
                    mode === "daily"
                      ? "!bg-primary !text-primary-foreground shadow-sm cursor-pointer"
                      : "bg-transparent text-muted-foreground cursor-pointer "
                  }`}
                >
                  Daily
                </TabsTrigger>

                <TabsTrigger
                  value="monthly"
                  className={`rounded-lg transition-all ${
                    mode === "monthly"
                      ? "!bg-primary !text-primary-foreground shadow-sm cursor-pointer"
                      : "bg-transparent text-muted-foreground cursor-pointer"
                  }`}
                >
                  Monthly
                </TabsTrigger>

                <TabsTrigger
                  value="yearly"
                  className={`rounded-lg transition-all ${
                    mode === "yearly"
                      ? "!bg-primary !text-primary-foreground shadow-sm cursor-pointer"
                      : "bg-transparent text-muted-foreground cursor-pointer"
                  }`}
                >
                  Yearly
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col space-y-4">
            <div style={{ height: CHART_HEIGHT }} className="shrink-0">
              {hasChartData ? (
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) =>
                          `₱${Number(value).toLocaleString()}`
                        }
                      />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="line" />}
                      />

                      <Line
                        type="monotone"
                        dataKey="total"
                        name="All Booths"
                        stroke={TOTAL_LINE_COLOR}
                        strokeWidth={3}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />

                      {safeAnalytics.boothSeries
                        .filter((booth) =>
                          selectedBooths.includes(booth.boothId),
                        )
                        .map((booth) => (
                          <Line
                            key={booth.boothId}
                            type="monotone"
                            dataKey={booth.boothId}
                            name={booth.boothName}
                            stroke={booth.color}
                            strokeWidth={2.5}
                            dot={{ r: 2.5 }}
                            activeDot={{ r: 4.5 }}
                          />
                        ))}
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <EmptyChartState message="No revenue trend data available yet." />
              )}
            </div>

            {visibleLegendItems.length > 0 ? (
              <div className={`grid gap-2 ${legendGridClass}`}>
                {visibleLegendItems.map((item) => (
                  <div
                    key={item.key}
                    className="flex min-w-0 items-center gap-2"
                  >
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="truncate text-xs font-medium">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card
          className="flex min-h-0 flex-col rounded-2xl"
          style={{ height: bottomCardHeight }}
        >
          <CardHeader className="shrink-0">
            <CardTitle>Booth lines</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Select booths to compare their revenue against the all-booths
              line.
            </p>
          </CardHeader>

          <CardContent className="min-h-0 flex-1">
            {safeAnalytics.boothSeries.length > 0 ? (
              <div className="h-full overflow-y-auto pr-2">
                <div className="space-y-3">
                  {safeAnalytics.boothSeries.map((booth) => {
                    const checked = selectedBooths.includes(booth.boothId);

                    return (
                      <div
                        key={booth.boothId}
                        className="flex min-h-[64px] items-center justify-between gap-3 rounded-xl border p-3 cursor-pointer"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <Checkbox
                            id={`booth-${booth.boothId}`}
                            checked={checked}
                            onCheckedChange={(value) =>
                              toggleBooth(booth.boothId, Boolean(value))
                            }
                            className="cursor-pointer"
                          />
                          <Label
                            htmlFor={`booth-${booth.boothId}`}
                            className="cursor-pointer text-sm font-medium"
                          >
                            {booth.boothName}
                          </Label>
                        </div>

                        <Badge
                          variant="outline"
                          className="rounded-full border-2"
                          style={{
                            borderColor: booth.color,
                            color: booth.color,
                          }}
                        >
                          Line
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                No installed booth analytics available yet.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
