import { notFound } from "next/navigation";
import HealthMetricDetail from "@/components/health/HealthMetricDetail";
import { METRIC_KEYS, type MetricKey } from "@/lib/health";

export const dynamicParams = false;

export function generateStaticParams() {
  return METRIC_KEYS.map((metricId) => ({ metricId }));
}

export default function MetricPage({ params }: { params: { metricId: string } }) {
  if (!METRIC_KEYS.includes(params.metricId as MetricKey)) notFound();
  return <HealthMetricDetail metricKey={params.metricId as MetricKey} />;
}
