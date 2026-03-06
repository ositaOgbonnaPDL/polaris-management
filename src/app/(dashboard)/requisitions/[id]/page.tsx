import { requireAuth } from "@/shared/lib/auth";
import { db } from "@/db";
import { requisitions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { Header } from "@/shared/components/layout/header";
import { RequisitionDetailView } from "./_components/requisition-detail-view";

type Props = { params: Promise<{ id: string }> };

export default async function RequisitionDetailPage({ params }: Props) {
  const session = await requireAuth();
  const { id } = await params;

  const req = await db.query.requisitions.findFirst({
    where: eq(requisitions.id, parseInt(id)),
    with: {
      requester: true,
      department: true,
      items: true,
    },
  });

  if (!req) notFound();

  // Staff can only see their own
  if (
    session.user.role === "staff" &&
    req.requesterId !== parseInt(session.user.id)
  ) {
    redirect("/requisitions");
  }

  return (
    <div>
      <Header
        title={req.reqNumber}
        description={`Submitted by ${req.requester.name}`}
        userRole={session.user.role}
      />
      <main className="p-6 max-w-3xl">
        <RequisitionDetailView
          requisition={req as any}
          currentUserId={session.user.id}
        />
      </main>
    </div>
  );
}
