import { requireAuth } from "@/shared/lib/auth";
import { db } from "@/db";
import { requisitions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { Header } from "@/shared/components/layout/header";
import { ResubmitForm } from "./_components/resubmit-form";

type Props = { params: { id: string } };

export default async function ResubmitPage({ params }: Props) {
  const session = await requireAuth();

  const req = await db.query.requisitions.findFirst({
    where: eq(requisitions.id, parseInt(params.id)),
    with: { requester: true, department: true, items: true },
  });

  if (!req) notFound();

  // Only the requester can resubmit
  if (req.requesterId !== parseInt(session.user.id)) redirect("/requisitions");

  // Only revision_requester status can be resubmitted
  if (req.status !== "revision_requester") redirect(`/requisitions/${req.id}`);

  return (
    <div>
      <Header
        title={`Resubmit ${req.reqNumber}`}
        description="Update your request based on the feedback received"
        userRole={session.user.role}
      />
      <main className="p-6 max-w-3xl">
        <ResubmitForm requisition={req as any} />
      </main>
    </div>
  );
}
