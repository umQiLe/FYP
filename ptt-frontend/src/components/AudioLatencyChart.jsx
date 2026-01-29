"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, ReferenceLine, Label } from "recharts";

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

export const description = "Audio Latency Chart";

// Configuration for chart colors and labels
const chartConfig = {
    avg: {
        label: "Avg Latency (ms)",
        color: "hsl(262.1 83.3% 57.8%)", // Purple
    },
    max: {
        label: "Max Latency (ms)",
        color: "hsl(262.1 83.3% 90%)", // Light Purple
    },
};

/**
 * AudioLatencyChart Component.
 *
 * Visualizes WebRTC audio latency metrics over time using an Area Chart.
 * Displays both Average and Maximum Round-Trip Time (RTT) to help monitor connection quality.
 * Includes a reference line at 200ms to indicate the threshold for "Fair" audio quality.
 *
 * @param {Array} data - Array of data points containing 'date', 'avg' (latency), and 'max' (latency).
 */
export function AudioLatencyChart({ data }) {
    const chartData = data || [];

    return (
        <Card className="pt-0">
            <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
                <div className="grid flex-1 gap-1">
                    <CardTitle>Audio Latency (WebRTC)</CardTitle>
                    <CardDescription>
                        Showing Avg and Max Audio RTT (ms) over time
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
                            {/* Gradient definitions for Average Latency area */}
                            <linearGradient id="fillAvg" x1="0" y1="0" x2="0" y2="1">
                                <stop
                                    offset="5%"
                                    stopColor={chartConfig.avg.color}
                                    stopOpacity={0.8}
                                />
                                <stop
                                    offset="95%"
                                    stopColor={chartConfig.avg.color}
                                    stopOpacity={0.1}
                                />
                            </linearGradient>
                            {/* Gradient definitions for Maximum Latency area */}
                            <linearGradient id="fillMax" x1="0" y1="0" x2="0" y2="1">
                                <stop
                                    offset="5%"
                                    stopColor={chartConfig.max.color}
                                    stopOpacity={0.8}
                                />
                                <stop
                                    offset="95%"
                                    stopColor={chartConfig.max.color}
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
                        {/* Area for Maximum Latency */}
                        <Area
                            dataKey="max"
                            type="natural"
                            fill="url(#fillMax)"
                            stroke={chartConfig.max.color}
                        />
                        {/* Area for Average Latency */}
                        <Area
                            dataKey="avg"
                            type="natural"
                            fill="url(#fillAvg)"
                            stroke={chartConfig.avg.color}
                        />
                        {/* Reference Line for Quality Threshold */}
                        <ReferenceLine y={200} stroke="orange" strokeDasharray="3 3">
                            <Label value="Fair (200ms)" position="insideTopLeft" fill="orange" fontSize={10} />
                        </ReferenceLine>
                        <ChartLegend content={<ChartLegendContent />} />
                    </AreaChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}

export default AudioLatencyChart;