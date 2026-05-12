"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { BoothProduct } from "./types";
import { normalizeDispenseSlot, TABLE_GRID } from "./utils";

interface BoothProductRowProps {
  boothId: string;
  index: number;
  product: BoothProduct;
  isEditing: boolean;
  onChange: (index: number, nextProduct: BoothProduct) => void;
  onRemove: (index: number) => void;
}

export function BoothProductRow({
  boothId,
  index,
  product,
  isEditing,
  onChange,
  onRemove,
}: BoothProductRowProps) {
  return (
    <div
      key={`${boothId}-${index}`}
      className={`grid ${TABLE_GRID} gap-3 rounded-xl border p-3`}
    >
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground md:hidden">
          Product ID
        </Label>
        <Input
          placeholder="Product ID"
          value={product.product_id}
          disabled={!isEditing}
          onChange={(e) =>
            onChange(index, { ...product, product_id: e.target.value })
          }
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground md:hidden">Name</Label>
        <Input
          placeholder="Name"
          value={product.name}
          disabled={!isEditing}
          onChange={(e) =>
            onChange(index, { ...product, name: e.target.value })
          }
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground md:hidden">Type</Label>
        <Input
          placeholder="Type"
          value={product.type}
          disabled={!isEditing}
          onChange={(e) =>
            onChange(index, { ...product, type: e.target.value })
          }
        />
      </div>

      <div className="flex items-center justify-center">
        <div className="w-[88px] space-y-1">
          <Label className="text-xs text-muted-foreground md:hidden">
            Price
          </Label>
          <Input
            type="number"
            min={0}
            placeholder="0"
            value={product.price}
            disabled={!isEditing}
            className="text-center no-spinner"
            onChange={(e) =>
              onChange(index, {
                ...product,
                price: Math.max(0, Number(e.target.value) || 0),
              })
            }
          />
        </div>
      </div>

      <div className="flex items-center justify-center">
        <div className="w-[120px] space-y-1">
          <Label className="text-xs text-muted-foreground md:hidden">
            Slot
          </Label>
          <Select
            value={normalizeDispenseSlot(product.dispense_slot)}
            disabled={!isEditing}
            onValueChange={(value) =>
              onChange(index, {
                ...product,
                dispense_slot: normalizeDispenseSlot(value),
              })
            }
          >
            <SelectTrigger className="cursor-pointer w-full">
              <SelectValue placeholder="Slot" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="KIT1">KIT1</SelectItem>
              <SelectItem value="KIT2">KIT2</SelectItem>
              <SelectItem value="KIT3">KIT3</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-center">
        <Label
          className={`flex min-h-9 items-center justify-center gap-2 text-sm ${
            isEditing ? "cursor-pointer" : ""
          }`}
        >
          <Checkbox
            checked={product.enabled}
            disabled={!isEditing}
            onCheckedChange={(checked) =>
              onChange(index, { ...product, enabled: Boolean(checked) })
            }
            className="cursor-pointer"
          />
          <span>Enabled</span>
        </Label>
      </div>

      <div className="flex items-center justify-center">
        {isEditing ? (
          <Button
            variant="destructive"
            size="icon"
            onClick={() => onRemove(index)}
            className="cursor-pointer"
          >
            <Trash2 className="size-4" />
          </Button>
        ) : (
          <div className="h-9 w-9" />
        )}
      </div>
    </div>
  );
}
