import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number, decimals = 1): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(decimals);
}

export function formatArea(km2: number): string {
  if (km2 >= 1000) return `${(km2).toFixed(0)} km²`;
  return `${km2.toFixed(1)} km²`;
}

export function formatDepth(m: number): string {
  return `${m.toFixed(1)} m`;
}

export function formatVelocity(ms: number): string {
  return `${ms.toFixed(1)} m/s`;
}

export function formatDischarge(m3s: number): string {
  if (m3s >= 1000) return `${(m3s / 1000).toFixed(1)} ×10³ m³/s`;
  return `${m3s.toFixed(0)} m³/s`;
}

export function formatTime(hrs: number): string {
  const h = Math.floor(hrs);
  const m = Math.round((hrs - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function pctDiff(a: number, b: number): string {
  if (b === 0) return "—";
  const pct = ((a - b) / b) * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

export function impactColor(depth: number): string {
  if (depth < 0.3) return "#4CAF50"; // Low - green
  if (depth < 1.0) return "#FFB300"; // Moderate - amber
  if (depth < 2.0) return "#F57C00"; // High - orange
  return "#D32F2F"; // Very High - red
}

export function depthClassColor(depthClass: string): string {
  const map: Record<string, string> = {
    "0–0.5m": "#FFF176",
    "0.5–1m": "#FFB300",
    "1–2m": "#F57C00",
    "2–5m": "#D32F2F",
    ">5m": "#7B1FA2",
  };
  return map[depthClass] || "#90CAF9";
}
