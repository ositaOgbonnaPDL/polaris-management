import { db } from "@/db";
import { approvalTokens } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { TOKEN_EXPIRY_HOURS } from "@/shared/constants";

export async function createApprovalToken(
  requisitionId: number,
  approverId: number,
): Promise<string> {
  // Invalidate any existing unused tokens for this req + approver
  await db
    .update(approvalTokens)
    .set({ usedAt: new Date().toISOString() })
    .where(
      and(
        eq(approvalTokens.requisitionId, requisitionId),
        eq(approvalTokens.approverId, approverId),
        isNull(approvalTokens.usedAt),
      ),
    );

  // Generate new token — nanoid gives us a URL-safe random string
  const token = nanoid(64);

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);

  await db.insert(approvalTokens).values({
    token,
    requisitionId,
    approverId,
    expiresAt: expiresAt.toISOString(),
  });

  return token;
}

export async function validateToken(token: string) {
  const record = await db.query.approvalTokens.findFirst({
    where: eq(approvalTokens.token, token),
    with: {
      requisition: true,
    },
  });

  if (!record) return { valid: false, error: "Invalid token" };
  if (record.usedAt)
    return { valid: false, error: "This link has already been used" };

  if (new Date() > new Date(record.expiresAt)) {
    return { valid: false, error: "This link has expired" };
  }

  return { valid: true, record };
}

export async function invalidateAllTokensForRequisition(requisitionId: number) {
  await db
    .update(approvalTokens)
    .set({ usedAt: new Date().toISOString() })
    .where(
      and(
        eq(approvalTokens.requisitionId, requisitionId),
        isNull(approvalTokens.usedAt),
      ),
    );
}
