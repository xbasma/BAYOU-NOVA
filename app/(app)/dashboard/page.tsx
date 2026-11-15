"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { buildMetricRows, buildTimeline, currentMissionDay, statusCounts } from "@/lib/health";
import displayRules from "@/data/shared/display-rules.json";
import MissionHeader from "@/components/dashboard/MissionHeader";
import StatusPills from "@/components/dashboard/StatusPills";
import TwoLayerPanel from "@/components/dashboard/TwoLayerPanel";
import MetricsTable from "@/components/dashboard/MetricsTable";
import TrendChartGrid from "@/components/dashboard/TrendChartGrid";
import MissionTimeline from "@/components/dashboard/MissionTimeline";
import MeasurementLegend from "@/components/dashboard/MeasurementLegend";

/**
 * Health Monitoring Dashboard. Reads the active astronaut's data (seeded JSON
 * plus anything added in this demo session) and both detection layers from
 * the store. No database calls. The red-flag banner is rendered by the app
 * layout, above this page.
 */
export default function HealthMonitoringDashboardPage() {
  const { data, detection } = useStore();

  const view = useMemo(() => {
    if (!data || !detection) return null;
    const rows = buildMetricRows(data);
    return {
      a: data,
      rows,
      detection,
      overall: detection.status,
      counts: statusCounts(rows),
      timeline: buildTimeline(data),
      day: currentMissionDay(data),
    };
  }, [data, detection]);

  if (!view) return null;

  return (
    <div className="animate-fade-up space-y-6 pb-4">
      <MissionHeader
        astronautId={view.a.profile.astronaut_id}
        mission={view.a.profile.mission}
        missionDay={view.day}
        overall={view.overall}
      />
      <StatusPills counts={view.counts} overall={view.overall} />
      <TwoLayerPanel detection={view.detection} />
      <MetricsTable rows={view.rows} />
      <TrendChartGrid rows={view.rows} days={displayRules.trend_days} />
      <MissionTimeline days={view.timeline} />
      <MeasurementLegend />
    </div>
  );
}
