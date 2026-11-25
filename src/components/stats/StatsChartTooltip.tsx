"use client";

import * as React from "react";

export const OBA_FINISH_CHART_COLORS = {
  xtreme: "#e96b00",
  burst: "#edbd03",
  over: "#bd08f5",
  spin: "#38bdf8",
} as const;

export const OBA_SYSTEM_CHART_COLORS: Record<string, string> = {
  BX: "#bd08f5",
  BXE: "#9333ea",
  UX: "#e96b00",
  UXE: "#edbd03",
  CX: "#38bdf8",
  CXE: "#10b981",
  Universal: "#94a3b8",
};

interface TooltipPayloadEntry {
  name?: string | number;
  value?: string | number;
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
}

interface StatsChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string | number;
  valueSuffix?: string;
}

export function StatsChartTooltip({
  active,
  payload,
  label,
  valueSuffix = "",
}: StatsChartTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border/80 bg-popover/95 backdrop-blur-md px-3 py-2 shadow-xl text-xs space-y-1">
      {label !== undefined && label !== null && String(label).length > 0 && (
        <div className="font-bold text-foreground border-b border-border/50 pb-1">
          {String(label)}
        </div>
      )}
      <div className="space-y-0.5">
        {payload.map((entry, idx) => (
          <div
            key={`${String(entry.dataKey ?? entry.name ?? idx)}-${idx}`}
            className="flex items-center justify-between gap-4"
          >
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: entry.color || "#bd08f5" }}
              />
              <span>{String(entry.name ?? "")}</span>
            </span>
            <span className="font-bold text-foreground tabular-nums">
              {typeof entry.value === "number"
                ? Number.isInteger(entry.value)
                  ? entry.value
                  : entry.value.toFixed(1)
                : String(entry.value ?? "")}
              {valueSuffix}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const emptySubscribe = () => () => {};

/**
 * Garante que gráficos Recharts com ResponsiveContainer sejam montados apenas no cliente
 * dentro de uma caixa com altura fixa, evitando warnings de largura/altura no SSR.
 */
export function useChartMounted() {
  return React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
