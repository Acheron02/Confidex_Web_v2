"use client";

import * as React from "react";
import { ChevronRight, Coins, Package2, Store } from "lucide-react";

import type {
  AdminDashboardSection,
  BoothRecord,
} from "@/components/admin/dashboard/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface OverviewMonitoringSummaryProps {
  booths: BoothRecord[];
  onSectionChange: (section: AdminDashboardSection) => void;
}

export function OverviewMonitoringSummary({
  booths,
  onSectionChange,
}: OverviewMonitoringSummaryProps) {
  const availableBooths = booths.filter((booth) => booth._id);

  const [selectedBoothId, setSelectedBoothId] = React.useState<string>(
    availableBooths[0]?._id ?? "",
  );

  React.useEffect(() => {
    if (!availableBooths.length) {
      setSelectedBoothId("");
      return;
    }

    const selectedStillExists = availableBooths.some(
      (booth) => booth._id === selectedBoothId,
    );

    if (!selectedStillExists) {
      setSelectedBoothId(availableBooths[0]._id);
    }
  }, [availableBooths, selectedBoothId]);

  const selectedBooth =
    availableBooths.find((booth) => booth._id === selectedBoothId) ??
    availableBooths[0];

  const boothProducts = selectedBooth?.config?.products ?? [];
  const boothInventoryProducts =
    selectedBooth?.inventorySnapshot?.products ?? {};
  const boothCoins = selectedBooth?.inventorySnapshot?.coins ?? {};

  const products = boothProducts.map((product) => ({
    name: product.type || product.name || product.product_id,
    stock: Math.max(
      0,
      Number(boothInventoryProducts?.[product.product_id]?.stock) || 0,
    ),
  }));

  const coins = {
    one: Math.max(0, Number(boothCoins?.["1"]?.stock) || 0),
    five: Math.max(0, Number(boothCoins?.["5"]?.stock) || 0),
    twenty: Math.max(0, Number(boothCoins?.["20"]?.stock) || 0),
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader className="space-y-4">
        <div>
          <CardTitle>Monitoring summary</CardTitle>
          <CardDescription>
            Real-time overview of booth stock levels and available change.
          </CardDescription>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Store className="size-4" />
            Select booth
          </div>

          <Select
            value={selectedBoothId}
            onValueChange={(value) => setSelectedBoothId(value)}
            disabled={availableBooths.length === 0}
          >
            <SelectTrigger className="w-full cursor-pointer">
              <SelectValue placeholder="Select a booth" />
            </SelectTrigger>
            <SelectContent>
              {availableBooths.length > 0 ? (
                availableBooths.map((booth) => (
                  <SelectItem
                    key={booth._id}
                    value={booth._id}
                    className="cursor-pointer"
                  >
                    {booth.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-booth" disabled>
                  No booths available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <button
          type="button"
          onClick={() => onSectionChange("stock-monitoring")}
          className="block w-full cursor-pointer rounded-2xl border text-left transition hover:bg-muted/40"
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Package2 className="size-4" />
              Product stocks
            </div>

            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              View section
              <ChevronRight className="size-4" />
            </div>
          </div>

          <div className="space-y-2 p-4">
            {products.length > 0 ? (
              products.map((product, index) => (
                <div
                  key={`${product.name}-${index}`}
                  className="flex items-center justify-between rounded-xl border p-3"
                >
                  <span className="text-sm">{product.name}</span>
                  <span className="text-sm font-semibold">{product.stock}</span>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
                No product stock data available.
              </div>
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSectionChange("coin-inventory")}
          className="block w-full cursor-pointer rounded-2xl border text-left transition hover:bg-muted/40"
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Coins className="size-4" />
              Coin inventory
            </div>

            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              View section
              <ChevronRight className="size-4" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 p-4">
            <div className="rounded-xl border p-3 text-center">
              <p className="text-xs text-muted-foreground">₱1</p>
              <p className="text-sm font-semibold">{coins.one}</p>
            </div>

            <div className="rounded-xl border p-3 text-center">
              <p className="text-xs text-muted-foreground">₱5</p>
              <p className="text-sm font-semibold">{coins.five}</p>
            </div>

            <div className="rounded-xl border p-3 text-center">
              <p className="text-xs text-muted-foreground">₱20</p>
              <p className="text-sm font-semibold">{coins.twenty}</p>
            </div>
          </div>
        </button>
      </CardContent>
    </Card>
  );
}
