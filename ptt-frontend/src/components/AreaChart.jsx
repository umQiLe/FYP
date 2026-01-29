"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  ReferenceLine,
  Label,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export const description =
  "An interactive area chart for visualizing network statistics";

const chartConfig = {
  visitors: {
    label: "Network Latency",
  },
  desktop: {
    label: "Avg Latency (ms)",
    color: "var(--chart-1)",
  },
  mobile: {
    label: "Max Latency (ms)",
    color: "var(--chart-2)",
  },
};

/**
 * ChartAreaInteractive
 *
 * An interactive area chart component used to display network latency metrics.
 *
 * Props:
 * - data: Array of objects containing 'date', 'desktop' (avg latency), and 'mobile' (max latency) values.
 *
 * Features:
 * - Visualizes Average and Maximum Latency over time.
 * - Uses a gradient fill for better visual distinction.
 * - Includes reference lines for "Fair" (150ms) and "Poor" (300ms) latency thresholds.
 * - Responsive container adapting to available width.
 */
export function ChartAreaInteractive({ data }) {
  // Ensure we have a valid array, defaulting to empty if undefined
  const chartData = data || [];

  return (
    <Card className="pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>Network Latency</CardTitle>
          <CardDescription>
            Showing Avg and Max RTT (ms) over time
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full min-w-0 block"
        >
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="fillDesktop" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-desktop)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-desktop)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillMobile" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-mobile)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-mobile)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                });
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                  }}
                  indicator="dot"
                />
              }
            />
            {/* Max Latency Area */}
            <Area
              dataKey="mobile"
              type="natural"
              fill="url(#fillMobile)"
              stroke="var(--color-mobile)"
              // stackId="a" removed to allow overlapping areas for better comparison
            />
            {/* Avg Latency Area */}
            <Area
              dataKey="desktop"
              type="natural"
              fill="url(#fillDesktop)"
              stroke="var(--color-desktop)"
              // stackId="a" removed to allow overlapping areas for better comparison
            />

            {/* Latency Threshold Indicators */}
            <ReferenceLine y={150} stroke="orange" strokeDasharray="3 3">
              <Label
                value="Fair Limit (150ms)"
                position="insideTopLeft"
                fill="orange"
                fontSize={10}
              />
            </ReferenceLine>
            <ReferenceLine y={300} stroke="red" strokeDasharray="3 3">
              <Label
                value="Poor Limit (300ms)"
                position="insideTopLeft"
                fill="red"
                fontSize={10}
              />
            </ReferenceLine>

            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
export default ChartAreaInteractive;
