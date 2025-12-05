"use client";

import { PetHealthView } from "@/components/dashboard/PetHealthView";

export default function PetHealthDetailPage({ params }: { params: { id: string } }) {
  return <PetHealthView petId={params.id} backHref={`/dashboard/pets/${params.id}`} />;
}
