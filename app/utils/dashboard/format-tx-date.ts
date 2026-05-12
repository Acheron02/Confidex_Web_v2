import {
  formatPHDateTime,
  getObjectIdDate,
  parseDateTime,
} from "@/app/utils/dashboard/ph-time";

export function formatTxDate(tx: {
  purchasedDate?: string | Date;
  _id?: string;
}) {
  const purchasedDate = parseDateTime(tx.purchasedDate);
  const objectIdDate = getObjectIdDate(tx._id);
  const date = purchasedDate ?? objectIdDate;

  return date ? formatPHDateTime(date, "No date") : "No date";
}
