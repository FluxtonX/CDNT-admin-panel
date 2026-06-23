import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges class names using clsx and tailwind-merge.
 * Prevents Tailwind class conflicts in dynamic component styling.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formats a number with locale-aware separators and optional compact notation.
 */
export function formatNumber(
  value: number,
  compact = false
): string {
  if (compact) {
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }
  return new Intl.NumberFormat("en-US").format(value);
}

/**
 * Formats a number as a currency string.
 */
export function formatCurrency(
  value: number,
  currency = "USD",
  compact = false
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 2,
  }).format(value);
}

/**
 * Formats a Date object or ISO string to a readable date/time string.
 */
export function formatDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  }
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", options).format(d);
}

/**
 * Returns relative time string (e.g. "2 hours ago").
 */
export function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(d);
}

/**
 * Truncates a string to a given maximum length, appending "…".
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength).trimEnd() + "…";
}

/**
 * Generates initials from a full name string (up to 2 characters).
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
}

/**
 * Delays execution for a given number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Clamps a number between min and max values.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

let cachedRates: { btcCAD: number; ethCAD: number; usdtCAD: number } | null = null;
let lastFetchTime = 0;

export async function fetchLiveCADRates() {
  const now = Date.now();
  if (cachedRates && now - lastFetchTime < 60000) {
    return cachedRates;
  }

  try {
    const coinGeckoRes = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether&vs_currencies=cad"
    );
    const coinGeckoData = await coinGeckoRes.json();

    cachedRates = {
      btcCAD: coinGeckoData?.bitcoin?.cad || 90000,
      ethCAD: coinGeckoData?.ethereum?.cad || 4500,
      usdtCAD: coinGeckoData?.tether?.cad || 1.36,
    };
    lastFetchTime = now;
  } catch (error) {
    console.error("Failed to fetch live CAD rates, using defaults", error);
    if (!cachedRates) {
      cachedRates = {
        btcCAD: 90000,
        ethCAD: 4500,
        usdtCAD: 1.36,
      };
    }
  }

  return cachedRates!;
}

