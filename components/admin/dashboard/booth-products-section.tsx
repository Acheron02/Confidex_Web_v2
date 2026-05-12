"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type { BoothProduct, BoothProductsSectionProps } from "@/components/admin/dashboard/booth-products/types";
import { BoothProductRow } from "@/components/admin/dashboard/booth-products/booth-product-row";
import { BoothProductsTableHeader } from "@/components/admin/dashboard/booth-products/booth-products-table";
import {
  cleanProducts,
  createEmptyProduct,
  normalizeDispenseSlot,
} from "@/components/admin/dashboard/booth-products/utils";

export function BoothProductsSection({
  booths,
  onSubmit,
}: BoothProductsSectionProps) {
  const [editingBoothId, setEditingBoothId] = React.useState<string | null>(
    null,
  );
  const [drafts, setDrafts] = React.useState<Record<string, BoothProduct[]>>(
    {},
  );
  const [saving, setSaving] = React.useState<string | null>(null);

  const startEditing = (booth: BoothProductsSectionProps["booths"][number]) => {
    setEditingBoothId(booth.boothId);
    setDrafts((current) => ({
      ...current,
      [booth.boothId]: booth.products.map((product) => ({
        ...product,
        dispense_slot: normalizeDispenseSlot(product.dispense_slot),
      })),
    }));
  };

  const cancelEditing = () => {
    setEditingBoothId(null);
  };

  const updateProduct = (
    boothId: string,
    index: number,
    nextProduct: BoothProduct,
  ) => {
    setDrafts((current) => {
      const next = [...(current[boothId] || [])];
      next[index] = nextProduct;
      return { ...current, [boothId]: next };
    });
  };

  const addProduct = (boothId: string) => {
    setDrafts((current) => ({
      ...current,
      [boothId]: [...(current[boothId] || []), createEmptyProduct()],
    }));
  };

  const removeProduct = (boothId: string, index: number) => {
    setDrafts((current) => ({
      ...current,
      [boothId]: (current[boothId] || []).filter((_, i) => i !== index),
    }));
  };

  const submitEditing = async (boothId: string) => {
    try {
      setSaving(boothId);
      const cleaned = cleanProducts(drafts[boothId] || []);
      await onSubmit(boothId, { products: cleaned });
      setEditingBoothId(null);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Booth products</CardTitle>
          <CardDescription>
            Add, remove, enable, disable, price, and assign dispense slot per
            booth product.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {booths.map((booth) => {
            const isEditing = editingBoothId === booth.boothId;
            const products = isEditing
              ? drafts[booth.boothId] || []
              : booth.products;

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

                  {!isEditing ? (
                    <Button
                      onClick={() => startEditing(booth)}
                      className="cursor-pointer"
                    >
                      Update
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={cancelEditing}
                        className="cursor-pointer"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => submitEditing(booth.boothId)}
                        disabled={saving === booth.boothId}
                        className="cursor-pointer"
                      >
                        {saving === booth.boothId ? "Saving..." : "Submit"}
                      </Button>
                    </div>
                  )}
                </div>

                {products.length > 0 ? (
                  <div className="overflow-x-auto">
                    <div className="min-w-[1080px] space-y-3">
                      <BoothProductsTableHeader />

                      {products.map((product, index) => (
                        <BoothProductRow
                          key={`${booth.boothId}-${index}`}
                          boothId={booth.boothId}
                          index={index}
                          product={product}
                          isEditing={isEditing}
                          onChange={(rowIndex, nextProduct) =>
                            updateProduct(booth.boothId, rowIndex, nextProduct)
                          }
                          onRemove={(rowIndex) =>
                            removeProduct(booth.boothId, rowIndex)
                          }
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                    No products configured for this booth.
                  </div>
                )}

                {isEditing ? (
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      onClick={() => addProduct(booth.boothId)}
                      className="cursor-pointer"
                    >
                      <Plus className="mr-2 size-4" />
                      Add product
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
