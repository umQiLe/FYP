import React from "react";
import { FileDown, AlertTriangle } from "lucide-react";
import ChartAreaInteractive from "./AreaChart";
import { ChartRadialText } from "./RadialChart";
import { ChartLineInteractive as LineChart } from "./LineChart";
import AudioLatencyChart from "./AudioLatencyChart";

/**
 * StatisticsPage Component
 *
 * Displays real-time and historical statistics for the current session.
 * Features:
 * - Session Metrics: Active users, participation rates, engagement scores.
 * - System Health: Network latency, audio latency, jitter tracking.
 * - Interactive Charts: Line, Area, and Radial charts for visualizing trends.
 * - PDF Report generation link.
 */
const StatisticsPage = () => {
  const [stats, setStats] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  /**
   * Fetches current session statistics from the API.
   * Handles 404s (no active session) and generic network errors.
   */
  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/session/current/stats");
      if (!res.ok) {
        if (res.status === 404)
          throw new Error("No active session or stats found.");
        throw new Error("Failed to fetch stats.");
      }
      const data = await res.json();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch on component mount
  React.useEffect(() => {
    fetchStats();
  }, []);

  // Set up auto-refresh polling
  // Polls every 5 seconds normally, or every 60 seconds if an error occurs.
  React.useEffect(() => {
    const intervalTime = error ? 60000 : 5000;
    const interval = setInterval(fetchStats, intervalTime);
    return () => clearInterval(interval);
  }, [error]);

  /**
   * Processes raw event and sample data into time-series buckets for charting.
   * Aggregates data by minute to provide meaningful trend lines.
   *
   * @param {Array} events - List of session events (e.g., SPEAK_GRANTED).
   * @param {Array} latencySamples - Network latency samples.
   * @param {Array} webrtcSamples - WebRTC audio stats samples.
   * @returns {Object} Processed data structures for various charts.
   */
  const processTimeSeries = (events, latencySamples, webrtcSamples) => {
    if (!events) return { areaData: [], lineData: [], audioData: [] };

    // Dictionary to hold aggregated data by timestamp key (minute precision)
    const buckets = {};

    const getBucket = (timestamp) => {
      const time = new Date(timestamp);
      // Normalize to the nearest minute for aggregation
      time.setSeconds(0, 0);
      const key = time.toISOString();

      if (!buckets[key])
        buckets[key] = {
          date: key,
          mobile: 0,
          desktop: 0,
          requests: 0,
          grants: 0,
          latencySum: 0,
          latencyCount: 0,
          latencyMax: 0,
          webrtcSum: 0,
          webrtcCount: 0,
          webrtcMax: 0,
        };
      return buckets[key];
    };

    // Aggregate Event Data
    events.forEach((e) => {
      const b = getBucket(e.timestamp);
      if (e.type === "REQUEST_TO_SPEAK") {
        b.requests += 1;
      }
      if (e.type === "SPEAK_GRANTED") {
        b.grants += 1;
      }
    });

    // Aggregate Network Latency Data
    if (latencySamples) {
      latencySamples.forEach((s) => {
        const b = getBucket(s.timestamp);
        b.latencySum += s.rtt;
        b.latencyCount += 1;
        if (s.rtt > b.latencyMax) b.latencyMax = s.rtt;
      });
    }

    // Aggregate WebRTC Audio Data
    if (webrtcSamples) {
      webrtcSamples.forEach((s) => {
        const b = getBucket(s.timestamp);
        if (s.rtt) {
          b.webrtcSum += s.rtt;
          b.webrtcCount += 1;
          if (s.rtt > b.webrtcMax) b.webrtcMax = s.rtt;
        }
      });
    }

    // Convert buckets map to a sorted array
    const sortedData = Object.values(buckets).sort(
      (a, b) => new Date(a.date) - new Date(b.date),
    );

    // Calculate Averages and Map to Chart Fields
    sortedData.forEach((d) => {
      if (d.latencyCount > 0) {
        // Mapping: 'desktop' represents Average Latency, 'mobile' represents Max Latency
        // This naming convention is specific to the charting library's expected keys or previous requirements.
        d.desktop = Math.round(d.latencySum / d.latencyCount);
        d.mobile = d.latencyMax;
      }
      if (d.webrtcCount > 0) {
        d.avg = Math.round(d.webrtcSum / d.webrtcCount);
        d.max = d.webrtcMax;
      } else {
        d.avg = 0;
        d.max = 0;
      }
    });

    // Calculate Global Average Latency
    let totalLatency = 0;
    let totalCount = 0;
    sortedData.forEach((d) => {
      totalLatency += d.latencySum;
      totalCount += d.latencyCount;
    });
    const globalAvg =
      totalCount > 0 ? Math.round(totalLatency / totalCount) : 0;

    // Extract Latest Metrics for Real-time Display
    const lastPoint =
      sortedData.length > 0 ? sortedData[sortedData.length - 1] : null;
    const latestMetrics = {
      latency: lastPoint
        ? lastPoint.latencyCount > 0
          ? lastPoint.desktop
          : 0
        : 0,
      audioLatency: lastPoint ? lastPoint.avg : 0,
      jitter: lastPoint ? lastPoint.max : 0,
    };

    return {
      lineData: sortedData,
      areaData: sortedData,
      audioData: sortedData,
      globalAvgLatency: globalAvg,
      latestMetrics,
    };
  };

  // Memoize processed data to optimize rendering performance
  const { lineData, areaData, audioData, globalAvgLatency, latestMetrics } =
    React.useMemo(() => {
      return stats
        ? processTimeSeries(
            stats.events,
            stats.latencySamples,
            stats.webrtcSamples,
          )
        : {
            lineData: [],
            areaData: [],
            audioData: [],
            globalAvgLatency: 0,
            latestMetrics: { latency: 0, audioLatency: 0, jitter: 0 },
          };
    }, [stats]);

  // --- UI Components ---
  const [activeTab, setActiveTab] = React.useState("session");

  if (loading && !stats)
    return (
      <div className="p-6 flex items-center justify-center w-full h-full text-muted-foreground animate-pulse">
        Loading analytics...
      </div>
    );
  if (error)
    return (
      <div className="p-6 flex flex-col items-center justify-center w-full h-full text-center">
        <div className="bg-destructive/10 p-4 rounded-full mb-6">
          <AlertTriangle className="w-12 h-12 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold mb-3">Connection Issue</h1>
        <p className="mb-8 text-muted-foreground max-w-md">
          We couldn't connect to the analytics server. It might be stopped or
          unreachable.
          <br />
          <span className="inline-block mt-2 text-sm font-medium animate-pulse text-primary">
            Attempting to reconnect...
          </span>
        </p>
        <button
          onClick={fetchStats}
          className="px-6 py-2.5 bg-primary/10 text-primary-foreground font-medium rounded-md shadow hover:bg-primary/20 transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );

  return (
    <div className="p-6 w-full h-full overflow-y-auto custom-scrollbar space-y-6 bg-background text-foreground">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              Analytics Dashboard
            </h1>
            {stats && stats.sessionId && (
              <button
                onClick={() => {
                  window.open(
                    `/api/session/${stats.sessionId}/report`,
                    "_blank",
                  );
                }}
                className="inline-flex items-center justify-center rounded-full w-8 h-8 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                title="Download PDF Report"
              >
                <FileDown className="w-5 h-5" />
              </button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Real-time insights for Session {stats.sessionId?.substring(0, 8)}
          </p>
        </div>

        <div className="flex bg-muted rounded-lg p-1">
          <button
            onClick={() => setActiveTab("session")}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              activeTab === "session"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Session Metrics
          </button>
          <button
            onClick={() => setActiveTab("system")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === "system"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            System Health
          </button>
        </div>
      </div>

      {/* --- SESSION TAB --- */}
      {activeTab === "session" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* KPI Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              title="Active Users"
              value={stats.activeUsers}
              sub={`of ${stats.totalUsers} joined`}
              color="blue"
              progress={
                stats.totalUsers > 0
                  ? (stats.activeUsers / stats.totalUsers) * 100
                  : 0
              }
            />
            <StatCard
              title="Participation"
              value={`${stats.participationRate}%`}
              sub="Students who spoke"
              color="green"
              progress={stats.participationRate}
            />
            <StatCard
              title="Avg Duration"
              value={`${stats.avgSpeakingDuration}s`}
              sub="Average turn length"
              color="purple"
            />
            <StatCard
              title="Queue Drop-off"
              value={`${stats.dropOffRate}%`}
              sub="Requests cancelled"
              color="orange"
              progress={stats.dropOffRate}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Participation Chart */}
            <div className="lg:col-span-1 min-w-0">
              <ChartRadialText
                totalUsers={stats.totalUsers}
                activeUsers={stats.activeUsers}
              />
            </div>

            {/* Request Line Chart */}
            <div className="lg:col-span-2 min-w-0">
              <LineChart data={lineData} />
            </div>
          </div>

          {/* Detailed Student Table */}
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="text-lg font-semibold">Student Performance</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3 text-right">Speaks</th>
                    <th className="px-4 py-3 text-right">Total Time</th>
                    <th className="px-4 py-3 text-right">Avg Turn</th>
                    <th
                      className="px-4 py-3 text-right"
                      title="Score = (Speaks × 5) + Duration"
                    >
                      Score (?)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stats.studentPerformance &&
                  stats.studentPerformance.length > 0 ? (
                    stats.studentPerformance.map((s) => (
                      <tr
                        key={s.uid}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium">
                          <div>{s.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {s.email}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">{s.speakCount}</td>
                        <td className="px-4 py-3 text-right">
                          {s.totalDuration}s
                        </td>
                        <td className="px-4 py-3 text-right">
                          {s.avgDuration}s
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-primary">
                          {s.engagementScore}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-8 text-center text-muted-foreground"
                      >
                        No data available yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- SYSTEM TAB --- */}
      {activeTab === "system" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* KPI Row - Technical */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card p-6 rounded-xl border border-border shadow-sm relative overflow-hidden">
              <div
                className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full`}
              />
              <h3 className="text-sm font-medium text-muted-foreground">
                Network Latency (Current)
              </h3>
              <div className="mt-2 flex items-baseline gap-2">
                <span
                  className={`text-4xl font-bold ${latestMetrics.latency > 150 ? "text-destructive" : "text-foreground"}`}
                >
                  {latestMetrics.latency}
                </span>
                <span className="text-sm text-muted-foreground">ms</span>
              </div>
              <div className="mt-2 h-1 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${latestMetrics.latency > 150 ? "bg-destructive" : "bg-blue-500"}`}
                  style={{
                    width: `${Math.min(latestMetrics.latency, 500) / 5}%`,
                  }}
                />
              </div>
            </div>

            <div className="bg-card p-6 rounded-xl border border-border shadow-sm relative overflow-hidden">
              <div
                className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-500/10 to-transparent rounded-bl-full`}
              />
              <h3 className="text-sm font-medium text-muted-foreground">
                Audio Latency (Current)
              </h3>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-4xl font-bold text-foreground">
                  {latestMetrics.audioLatency || 0}
                </span>
                <span className="text-sm text-muted-foreground">ms</span>
              </div>
            </div>

            <div className="bg-card p-6 rounded-xl border border-border shadow-sm relative overflow-hidden">
              <div
                className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-500/10 to-transparent rounded-bl-full`}
              />
              <h3 className="text-sm font-medium text-muted-foreground">
                Max Jitter (Current)
              </h3>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-4xl font-bold text-foreground">
                  {latestMetrics.jitter || 0}
                </span>
                <span className="text-sm text-muted-foreground">ms</span>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="min-w-0">
              <ChartAreaInteractive data={areaData} />
            </div>
            <div className="min-w-0">
              <AudioLatencyChart data={audioData} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Simple reusable card component
const StatCard = ({ title, value, sub, color = "blue", progress }) => {
  const gradients = {
    blue: "from-blue-500/10",
    green: "from-emerald-500/10",
    purple: "from-purple-500/10",
    orange: "from-orange-500/10",
    red: "from-red-500/10",
  };
  const bars = {
    blue: "bg-blue-500",
    green: "bg-emerald-500",
    purple: "bg-purple-500",
    orange: "bg-orange-500",
    red: "bg-red-500",
  };

  return (
    <div className="bg-card p-6 rounded-xl border border-border shadow-sm relative overflow-hidden">
      <div
        className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${gradients[color] || gradients.blue} to-transparent rounded-bl-full`}
      />
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <div className="mt-2 flex flex-col gap-1">
        <span className="text-4xl font-bold text-foreground">{value}</span>
        {sub && <span className="text-sm text-muted-foreground">{sub}</span>}
      </div>
      {typeof progress === "number" && (
        <div className="mt-3 h-1 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full ${bars[color] || bars.blue}`}
            style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default StatisticsPage;
