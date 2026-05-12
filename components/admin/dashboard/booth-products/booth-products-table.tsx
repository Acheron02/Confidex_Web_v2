import { TABLE_GRID } from "./utils";

export function BoothProductsTableHeader() {
  return (
    <div
      className={`grid ${TABLE_GRID} gap-3 rounded-xl border bg-muted/40 px-3 py-3`}
    >
      <div className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Product ID
      </div>
      <div className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Name
      </div>
      <div className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Type
      </div>
      <div className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Price
      </div>
      <div className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Slot
      </div>
      <div className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Status
      </div>
      <div className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Action
      </div>
    </div>
  );
}
