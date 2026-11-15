import { notFound } from "next/navigation";
import AlertDetail from "@/components/detection/AlertDetail";
import { alertIds } from "@/lib/detection";

export const dynamicParams = false;

export function generateStaticParams() {
  return alertIds().map((alertId) => ({ alertId }));
}

export default function AlertPage({ params }: { params: { alertId: string } }) {
  if (!alertIds().includes(params.alertId)) notFound();
  return <AlertDetail alertId={params.alertId} />;
}
