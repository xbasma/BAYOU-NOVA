import { notFound } from "next/navigation";
import InstrumentForm from "@/components/checkin/InstrumentForm";

const SLUGS = ["phq-9", "gad-7"];

export const dynamicParams = false;

export function generateStaticParams() {
  return SLUGS.map((instrument) => ({ instrument }));
}

export default function InstrumentPage({ params }: { params: { instrument: string } }) {
  if (!SLUGS.includes(params.instrument)) notFound();
  return <InstrumentForm slug={params.instrument} />;
}
