"use client";

import * as React from "react";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export const description = "An interactive line chart";

// Configuration for chart labels and colors
const chartConfig = {
  views: {
    label: "Count",
  },
  requests: {
    label: "Requests to Speak",
    color: "var(--chart-1)",
  },
  grants: {
    label: "Grants to Speak",
    color: "var(--chart-2)",
  },
};

/**
 * ChartLineInteractive Component.
 *
 * Displays an interactive line chart showing trends for "Requests to Speak"
 * and "Grants to Speak" over time. Users can toggle between these two metrics
 * to view their respective trends.
 *
 * @param {Array} data - Array of data points containing 'date', 'requests', and 'grants'.
 */
export function ChartLineInteractive({ data: chartData = [] }) {
  const [activeChart, setActiveChart] = React.useState("requests");

  // Calculate totals for both metrics to display in the header toggles
  const total = React.useMemo(
    () => ({
      requests: chartData.reduce((acc, curr) => acc + (curr.requests || 0), 0),
      grants: chartData.reduce((acc, curr) => acc + (curr.grants || 0), 0),
    }),
    [chartData]
  );

  return (
    <Card className="py-4 sm:py-0 w-full">
      {/* Header: Title and Toggle Buttons */}
      <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 pb-3 sm:pb-0">
          <CardTitle>User Interactions</CardTitle>
          <CardDescription>
            Showing requests to speak vs grants over time.
          </CardDescription>
        </div>
        <div className="flex">
          {["requests", "grants"].map((key) => {
            const chart = key;
            return (
              <button
                key={chart}
                data-active={activeChart === chart}
                className="data-[active=true]:bg-muted/50 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
                onClick={() => setActiveChart(chart)}
              >
                <span className="text-muted-foreground text-xs">
                  {chartConfig[chart].label}
                </span>
                <span className="text-lg leading-none font-bold sm:text-3xl">
                  {total[key].toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      </CardHeader>
      
      {/* Chart Content */}
      <CardContent className="px-2 sm:p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full min-w-0 block"
        >
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                if (!value) return "";
                const date = new Date(value);
                return date.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });
              }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[150px]"
                  nameKey="views"
                  labelFormatter={(value) => {
                    if (!value) return "";
                    return new Date(value).toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    });
                  }}
                />
              }
            />
            <Line
              dataKey={activeChart}
              type="monotone"
              stroke={`var(--color-${activeChart})`}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}