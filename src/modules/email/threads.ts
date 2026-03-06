import { nanoid } from "nanoid";

/**
 * Generates the root Message-ID for a new requisition thread.
 * This is stored in the email_threads table and used as the
 * In-Reply-To for all subsequent emails.
 */
export function generateRootMessageId(reqNumber: string): string {
  const domain = process.env.SMTP_FROM_EMAIL?.split("@")[1] ?? "company.com";
  return `<${reqNumber}@${domain}>`;
}

/**
 * Generates a unique Message-ID for each individual email.
 * References the root so the thread stays intact.
 */
export function generateMessageId(reqNumber: string): string {
  const domain = process.env.SMTP_FROM_EMAIL?.split("@")[1] ?? "company.com";
  // nanoid(8) gives enough uniqueness for per-email IDs
  return `<${reqNumber}-${nanoid(8)}@${domain}>`;
}

/**
 * Builds the threading headers for Nodemailer.
 * Pass rootMessageId for all emails after the first one.
 */
export function getThreadingHeaders(
  reqNumber: string,
  rootMessageId?: string,
): {
  messageId: string;
  headers: Record<string, string>;
} {
  const messageId = generateMessageId(reqNumber);

  const headers: Record<string, string> = {};

  if (rootMessageId) {
    headers["In-Reply-To"] = rootMessageId;
    headers["References"] = rootMessageId;
  }

  return { messageId, headers };
}
