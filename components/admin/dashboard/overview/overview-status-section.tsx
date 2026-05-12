"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface OverviewStatusSectionProps {
  statusData: Array<{
    status: string;
    count: number;
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  Active: "#22C55E",
  Due: "#F59E0B",
  Maintenance: "#EF4444",
};

const chartConfig = {
  count: {
    label: "Booths",
  },
} satisfies ChartConfig;

export function OverviewStatusSection({
  statusData,
}: OverviewStatusSectionProps) {
  return (
    <Card className="flex h-full min-h-[420px] flex-col rounded-2xl">
      <CardHeader>
        <CardTitle>Booth status overview</CardTitle>
        <CardDescription>
          Current distribution of active, maintenance-due, and unavailable
          booths.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        <ChartContainer
          config={chartConfig}
          className="h-full min-h-[300px] w-full"
        >
          <BarChart
            accessibilityLayer
            data={statusData}
            margin={{ top: 24, right: 12, left: 0, bottom: 8 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="status"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={28}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />

            <Bar dataKey="count" radius={10}>
              <LabelList
                dataKey="count"
                position="top"
                offset={10}
                className="fill-foreground text-xs font-medium"
              />

              {statusData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={STATUS_COLORS[entry.status] || "#3B82F6"}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
