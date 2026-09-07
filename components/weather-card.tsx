"use client";

import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  MapPin,
  Sun,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
  type ToolState,
} from "@/components/ai-elements/tool";

export type WeatherData = {
  city: string;
  condition: string;
  tempC: number;
  humidity: number;
};

function isWeatherData(value: unknown): value is WeatherData {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.city === "string" &&
    typeof v.condition === "string" &&
    typeof v.tempC === "number" &&
    typeof v.humidity === "number"
  );
}

function ConditionIcon({ condition }: { condition: string }) {
  const cls = "size-10 shrink-0 text-primary";
  switch (condition) {
    case "Clear":
      return <Sun className={cls} />;
    case "Partly cloudy":
      return <CloudSun className={cls} />;
    case "Overcast":
    case "Cloudy":
      return <Cloud className={cls} />;
    case "Fog":
      return <CloudFog className={cls} />;
    case "Drizzle":
      return <CloudDrizzle className={cls} />;
    case "Rain":
      return <CloudRain className={cls} />;
    case "Snow":
      return <CloudSnow className={cls} />;
    case "Thunderstorm":
      return <CloudLightning className={cls} />;
    default:
      return <Cloud className={cls} />;
  }
}

/**
 * Rich card for the `weather` tool. Loading skeleton while the tool runs,
 * weather display on success, error block on failure. Falls back to the
 * generic Tool renderer when the output doesn't match the expected shape
 * (e.g. messages persisted before the structured output existed).
 */
export function WeatherCard({
  state,
  input,
  output,
  errorText,
  type,
}: {
  state: ToolState;
  input?: unknown;
  output?: unknown;
  errorText?: string;
  type: string;
}) {
  if (
    state === "input-streaming" ||
    state === "input-available" ||
    (state === "output-available" && !isWeatherData(output))
  ) {
    const city =
      typeof input === "object" && input !== null
        ? String((input as Record<string, unknown>).city ?? "")
        : "";
    // Old string-shaped outputs predate the card: keep them readable.
    if (state === "output-available") {
      return (
        <Tool defaultOpen={false}>
          <ToolHeader type={type} state={state} />
          <ToolContent>
            <ToolInput input={input} />
            <ToolOutput output={output} errorText={errorText} />
          </ToolContent>
        </Tool>
      );
    }
    return (
      <div
        className={cn(
          "w-full max-w-full rounded-xl border border-border bg-surface p-4",
        )}
        aria-live="polite"
      >
        <div className="flex items-center gap-4">
          <div className="size-10 shrink-0 animate-pulse rounded-full bg-surface-2" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-7 w-24 animate-pulse rounded-md bg-surface-2" />
            <div className="h-4 w-40 animate-pulse rounded-md bg-surface-2" />
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Checking the weather{city ? ` in ${city}` : ""}…
        </p>
      </div>
    );
  }

  if (state === "output-error") {
    return (
      <div className="w-full max-w-full rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
        Couldn&apos;t get the weather{errorText ? `: ${errorText}` : "."} Try
        another city.
      </div>
    );
  }

  const data = output as WeatherData;
  return (
    <div className="w-full max-w-full rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-4">
        <ConditionIcon condition={data.condition} />
        <div className="flex flex-col">
          <span className="text-3xl font-semibold tabular-nums">
            {data.tempC}°C
          </span>
          <span className="text-sm text-muted-foreground">
            {data.condition}
          </span>
        </div>
        <div className="ml-auto flex flex-col items-end gap-1 text-sm">
          <span className="flex items-center gap-1 font-medium">
            <MapPin className="size-3.5 text-muted-foreground" />
            {data.city}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Droplets className="size-3.5" />
            {data.humidity}% humidity
          </span>
        </div>
      </div>
    </div>
  );
}
