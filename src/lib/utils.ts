import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 日付フィールドを安全にDateオブジェクトに変換する
 * @param dateValue - 変換対象の日付値（Date、数値、文字列）
 * @returns Dateオブジェクト、またはnull
 */
export function safeDateConversion(dateValue: any): Date | null {
  if (!dateValue) {
    return null;
  }
  
  if (dateValue instanceof Date) {
    return dateValue;
  }
  
  if (typeof dateValue === 'number') {
    return new Date(dateValue);
  }
  
  if (typeof dateValue === 'string') {
    const parsed = new Date(dateValue);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  
  return null;
}

/**
 * 日付フィールドをISO文字列に安全に変換する
 * @param dateValue - 変換対象の日付値
 * @returns ISO文字列、またはnull
 */
export function safeDateToISOString(dateValue: any): string | null {
  const date = safeDateConversion(dateValue);
  return date ? date.toISOString() : null;
} 