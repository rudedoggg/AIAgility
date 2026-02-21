import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function getProgressPercent(args: {
  itemsCount?: number;
  completedItems?: number;
  totalItems?: number;
  explicitPercent?: number;
}) {
  const { itemsCount, completedItems, totalItems, explicitPercent } = args;

  if (typeof explicitPercent === "number" && Number.isFinite(explicitPercent)) {
    return clampPercent(explicitPercent);
  }

  if (
    typeof completedItems === "number" &&
    typeof totalItems === "number" &&
    Number.isFinite(completedItems) &&
    Number.isFinite(totalItems) &&
    totalItems > 0
  ) {
    return clampPercent((completedItems / totalItems) * 100);
  }

  const targetItems = 8;
  const count = typeof itemsCount === "number" && Number.isFinite(itemsCount) ? itemsCount : 0;
  return clampPercent((count / targetItems) * 100);
}
