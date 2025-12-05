"use client";

import { PetHealthView } from "@/components/dashboard/PetHealthView";

export default function PetHealthPage({ params }: { params: { id: string } }) {
  return <PetHealthView petId={params.id} backHref="/dashboard" />;
}
