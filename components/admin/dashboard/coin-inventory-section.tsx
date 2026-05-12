"use client";

import * as React from "react";
import { Coins } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface BoothCoinRecord {
  boothId: string;
  boothName: string;
  location?: string;
  coins: {
    one: number;
    five: number;
    twenty: number;
  };
}

interface CoinInventorySectionProps {
  booths: BoothCoinRecord[];
  onSubmit: (
    boothId: string,
    payload: {
      coins: Record<string, { stock: number; enabled: boolean }>;
    },
  ) => Promise<void>;
}

function getCoinTone(value: number) {
  if (value <= 0) {
    return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300";
  }
  if (value <= 5) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
  return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300";
}

export function CoinInventorySection({
  booths,
  onSubmit,
}: CoinInventorySectionProps) {
  const [editingBoothId, setEditingBoothId] = React.useState<string | null>(
    null,
  );
  const [drafts, setDrafts] = React.useState<
    Record<string, { one: number; five: number; twenty: number }>
  >({});
  const [saving, setSaving] = React.useState<string | null>(null);

  const startEditing = (booth: BoothCoinRecord) => {
    setEditingBoothId(booth.boothId);
    setDrafts((current) => ({
      ...current,
      [booth.boothId]: {
        one: booth.coins.one,
        five: booth.coins.five,
        twenty: booth.coins.twenty,
      },
    }));
  };

  const cancelEditing = () => {
    setEditingBoothId(null);
  };

  const submitEditing = async (booth: BoothCoinRecord) => {
    try {
      setSaving(booth.boothId);

      const draft = drafts[booth.boothId] || {
        one: booth.coins.one,
        five: booth.coins.five,
        twenty: booth.coins.twenty,
      };

      await onSubmit(booth.boothId, {
        coins: {
          "1": { stock: Math.max(0, Number(draft.one) || 0), enabled: true },
          "5": { stock: Math.max(0, Number(draft.five) || 0), enabled: true },
          "20": {
            stock: Math.max(0, Number(draft.twenty) || 0),
            enabled: true,
          },
        },
      });

      setEditingBoothId(null);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Coin inventory</CardTitle>
          <CardDescription>
            View available change coins for each booth. Click Update to edit and
            submit coin counts.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {booths.length > 0 ? (
            booths.map((booth) => {
              const isEditing = editingBoothId === booth.boothId;
              const boothDraft = drafts[booth.boothId] || booth.coins;

              return (
                <div
                  key={booth.boothId}
                  className="rounded-2xl border p-4 shadow-sm"
                >
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold">
                        {booth.boothName}
                      </h3>
                      {booth.location ? (
                        <p className="text-sm text-muted-foreground">
                          {booth.location}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="rounded-xl bg-muted p-2">
                        <Coins className="size-4" />
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

                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      { key: "one", label: "₱1" },
                      { key: "five", label: "₱5" },
                      { key: "twenty", label: "₱20" },
                    ].map((coin) => {
                      const value =
                        Number(
                          boothDraft[coin.key as keyof typeof boothDraft],
                        ) || 0;

                      return (
                        <div
                          key={`${booth.boothId}-${coin.key}`}
                          className={`rounded-xl border px-4 py-3 text-center ${getCoinTone(value)}`}
                        >
                          <p className="text-xs text-muted-foreground">
                            {coin.label}
                          </p>

                          {isEditing ? (
                            <Input
                              type="number"
                              min={0}
                              className="mx-auto mt-2 h-9 w-24 text-center no-spinner"
                              value={value}
                              onChange={(event) =>
                                setDrafts((current) => ({
                                  ...current,
                                  [booth.boothId]: {
                                    ...(current[booth.boothId] || booth.coins),
                                    [coin.key]: Math.max(
                                      0,
                                      Number(event.target.value) || 0,
                                    ),
                                  },
                                }))
                              }
                            />
                          ) : (
                            <p className="mt-1 text-lg font-semibold">
                              {value}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              No coin inventory records available.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
