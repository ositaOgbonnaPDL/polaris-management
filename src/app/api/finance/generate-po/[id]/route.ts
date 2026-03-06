import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/shared/lib/auth-options";
import { db } from "@/db";
import { requisitions, approvalActions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generatePOPdf } from "@/modules/pdf/generate-po";

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user ||
    !["finance", "super_admin"].includes(session.user.role)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requisition = await db.query.requisitions.findFirst({
    where: eq(requisitions.id, parseInt(params.id)),
    with: {
      requester: true,
      department: true,
      items: true,
    },
  });

  if (!requisition) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Get approval trail for the PO
  const trail = await db.query.approvalActions.findMany({
    where: eq(approvalActions.requisitionId, requisition.id),
    with: { actor: true },
    orderBy: (a, { asc }) => [asc(a.createdAt)],
  });

  const pdfBuffer = await generatePOPdf({
    requisition: requisition as any,
    trail: trail as any,
    generatedBy: session.user.name ?? "Finance",
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="PO-${requisition.reqNumber}.pdf"`,
    },
  });
}
