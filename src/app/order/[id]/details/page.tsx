import { notFound } from "next/navigation";
import { getStore } from "@/lib/data";
import { DetailsForm } from "@/components/DetailsForm";

export const dynamic = "force-dynamic";

export default async function DetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = getStore();
  const order = await store.getOrder(id);
  if (!order) notFound();
  const biz = await store.getBusiness(order.businessId);
  if (!biz) notFound();
  return (
    <div className="grid gap-6 max-w-3xl">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Complete your listing details</p>
        <h1 className="text-3xl font-bold">{biz.name}</h1>
        <p className="text-muted">Directories ask for a few things beyond name, address and phone. Fill these in once and we use them everywhere.</p>
      </div>
      <DetailsForm biz={biz} orderId={id} />
    </div>
  );
}
