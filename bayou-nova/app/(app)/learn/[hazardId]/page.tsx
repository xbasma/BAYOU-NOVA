import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import HazardCard from "@/components/learn/HazardCard";
import { getHazard, HAZARD_IDS, isHazardId } from "@/lib/learn";

export function generateStaticParams() {
  return HAZARD_IDS.map((hazardId) => ({ hazardId }));
}

export function generateMetadata({ params }: { params: { hazardId: string } }) {
  return { title: isHazardId(params.hazardId) ? `${getHazard(params.hazardId).title} | Learn | BAYOU-NOVA` : "Learn | BAYOU-NOVA" };
}

export default function HazardPage({ params }: { params: { hazardId: string } }) {
  if (!isHazardId(params.hazardId)) notFound();
  const hazard = getHazard(params.hazardId);

  return (
    <div className="animate-fade-up space-y-6">
      <PageHeader
        icon={BookOpen}
        eyebrow="Spaceflight Hazard Awareness and Prevention"
        title={hazard.title}
        description="What it is, why it happens, what to watch for and preventive actions, each with its sources."
      />
      <Link
        href="/learn"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent underline-offset-4 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All hazards
      </Link>
      <HazardCard hazard={hazard} defaultOpen />
    </div>
  );
}
