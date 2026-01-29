"use client";

import { TrendingUp } from "lucide-react";
import {
  Label,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
  PolarAngleAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";

export const description = "A radial chart with text";

// Configuration for chart labels and styling
const chartConfig = {
  visitors: {
    label: "Visitors",
  },
  safari: {
    label: "Safari",
    color: "var(--chart-2)",
  },
};

/**
 * ChartRadialText Component.
 *
 * Displays a radial bar chart representing user participation.
 * The chart visualizes the ratio of active users to total users.
 * The central text shows the calculated participation percentage.
 *
 * @param {number} totalUsers - Total number of users in the session.
 * @param {number} activeUsers - Number of users who are currently active/participating.
 */
export function ChartRadialText({ totalUsers, activeUsers }) {
  // Calculate participation percentage (0-100)
  const participation = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;

  // Prepare data for the chart. 'visitors' represents the active portion.
  const chartData = [
    { browser: "safari", visitors: activeUsers, fill: "var(--chart-2)" },
  ];

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="items-center pb-0">
        <CardTitle>Participation Rate</CardTitle>
        <CardDescription>Active vs Total Users</CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-auto h-[250px] w-full min-w-0 block"
        >
          <RadialBarChart
            data={chartData}
            startAngle={90}
            endAngle={-270}
            innerRadius={80}
            outerRadius={110}
          >
            {/* 
              PolarAngleAxis defines the full circle scale. 
              domain is set to totalUsers to make the bar proportional. 
            */}
            <PolarAngleAxis
              type="number"
              domain={[0, Math.max(totalUsers, 1)]}
              tick={false}
            />
            <PolarGrid
              gridType="circle"
              radialLines={false}
              stroke="none"
              className="first:fill-muted last:fill-background"
              polarRadius={[86, 74]}
            />
            <RadialBar dataKey="visitors" background cornerRadius={10} />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-4xl font-bold"
                        >
                          {participation.toFixed(1)}%
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          Participated
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </PolarRadiusAxis>
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
      
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="text-muted-foreground leading-none">
          Showing total users for this session
        </div>
      </CardFooter>
    </Card>
  );
}