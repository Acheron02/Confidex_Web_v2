"use client";

import * as React from "react";
import { Package2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface BoothProductStock {
  productId: string;
  name: string;
  stock: number;
}

interface BoothStockRecord {
  boothId: string;
  boothName: string;
  location?: string;
  products: BoothProductStock[];
}

interface StockMonitoringSectionProps {
  booths: BoothStockRecord[];
  onSubmit: (
    boothId: string,
    payload: { products: Record<string, { stock: number }> },
  ) => Promise<void>;
}

const PRODUCT_LOW_STOCK_THRESHOLD = 2;

function getStockTone(stock: number) {
  if (stock <= 0) {
    return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300";
  }

  if (stock <= PRODUCT_LOW_STOCK_THRESHOLD) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }

  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
}

export function StockMonitoringSection({
  booths,
  onSubmit,
}: StockMonitoringSectionProps) {
  const [editingBoothId, setEditingBoothId] = React.useState<string | null>(
    null,
  );
  const [drafts, setDrafts] = React.useState<
    Record<string, Record<string, number>>
  >({});
  const [saving, setSaving] = React.useState<string | null>(null);

  const startEditing = (booth: BoothStockRecord) => {
    setEditingBoothId(booth.boothId);
    setDrafts((current) => ({
      ...current,
      [booth.boothId]: booth.products.reduce<Record<string, number>>(
        (acc, product) => {
          acc[product.productId] = product.stock;
          return acc;
        },
        {},
      ),
    }));
  };

  const cancelEditing = () => {
    setEditingBoothId(null);
  };

  const submitEditing = async (booth: BoothStockRecord) => {
    try {
      setSaving(booth.boothId);

      const boothDraft = drafts[booth.boothId] || {};
      const products = Object.entries(boothDraft).reduce<
        Record<string, { stock: number }>
      >((acc, [productId, stock]) => {
        acc[productId] = { stock: Math.max(0, Number(stock) || 0) };
        return acc;
      }, {});

      await onSubmit(booth.boothId, { products });
      setEditingBoothId(null);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Stock monitoring</CardTitle>
          <CardDescription>
            View the available item stock for each booth. Click Update to edit
            and submit new stock counts.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {booths.length > 0 ? (
            booths.map((booth) => {
              const isEditing = editingBoothId === booth.boothId;
              const boothDraft = drafts[booth.boothId] || {};

              return (
                <div
                  key={booth.boothId}
                  className="rounded-2xl border p-4 shadow-sm"
                >
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold">
                        {booth.boothName}
                      </h3>
                      {booth.location ? (
                        <p className="truncate text-sm text-muted-foreground">
                          {booth.location}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <div className="rounded-xl bg-muted p-2">
                        <Package2 className="size-4" />
                      </div>

                      {!isEditing ? (
                        <Button
                          onClick={() => startEditing(booth)}
                          className="cursor-pointer"
                        >
                          Update
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            onClick={cancelEditing}
                            className="cursor-pointer"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={() => submitEditing(booth)}
                            disabled={saving === booth.boothId}
                            className="cursor-pointer"
                          >
                            {saving === booth.boothId ? "Saving..." : "Submit"}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {booth.products.length > 0 ? (
                    <div className="rounded-xl border">
                      <div className="grid grid-cols-[minmax(0,1fr)_88px] gap-3 border-b px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Product
                        </div>
                        <div className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Stock
                        </div>
                      </div>

                      <div className="divide-y">
                        {booth.products.map((product) => {
                          const value = isEditing
                            ? (boothDraft[product.productId] ?? product.stock)
                            : product.stock;

                          return (
                            <div
                              key={`${booth.boothId}-${product.productId}`}
                              className={`grid grid-cols-[minmax(0,1fr)_88px] items-center gap-3 px-4 py-3 ${getStockTone(
                                Number(value) || 0,
                              )}`}
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                  {product.name}
                                </p>
                              </div>

                              <div className="flex justify-end">
                                {isEditing ? (
                                  <Input
                                    type="number"
                                    min={0}
                                    inputMode="numeric"
                                    className="h-9 w-[88px] min-w-0 text-right no-spinner"
                                    value={value}
                                    onChange={(event) =>
                                      setDrafts((current) => ({
                                        ...current,
                                        [booth.boothId]: {
                                          ...(current[booth.boothId] || {}),
                                          [product.productId]: Math.max(
                                            0,
                                            Number(event.target.value) || 0,
                                          ),
                                        },
                                      }))
                                    }
                                  />
                                ) : (
                                  <span className="inline-block w-[88px] text-right text-sm font-semibold">
                                    {product.stock}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                      No stock data available for this booth.
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              No booth stock records available.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
