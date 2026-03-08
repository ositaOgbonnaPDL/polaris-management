import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const FROM_ADDRESS = `"${process.env.SMTP_FROM_NAME ?? "Polaris Digitech"}" <${process.env.SMTP_FROM_EMAIL ?? "no-reply@polarisdigitech.com"}>`;

export interface SendEmailOptions {
  from: string;
  to: string | string[];
  cc?: string | string[];
  subject: string;
  html: string;
  /** RFC 2822 Message-ID for email threading */
  messageId?: string;
  headers?: Record<string, string>;
}

export async function sendEmail(
  options: SendEmailOptions,
): Promise<{ messageId: string }> {
  const { messageId, headers = {}, ...rest } = options;

  // In dev, redirect all recipients to the override address (Resend's
  // onboarding@resend.dev can only deliver to your own verified email).
  const override = process.env.DEV_EMAIL_OVERRIDE;
  if (override) {
    const originalTo = Array.isArray(rest.to) ? rest.to.join(", ") : rest.to;
    rest.to = override;
    rest.cc = undefined;
    rest.subject = `[DEV → ${originalTo}] ${rest.subject}`;
  }

  // Fold the threading Message-ID into the headers map Resend accepts
  const allHeaders: Record<string, string> = messageId
    ? { ...headers, "Message-ID": messageId }
    : { ...headers };

  console.log(
    `[email] Sending via Resend → ${JSON.stringify(rest.to)} | Subject: ${rest.subject}`,
  );

  const { data, error } = await resend.emails.send({
    ...rest,
    headers: Object.keys(allHeaders).length > 0 ? allHeaders : undefined,
  });

  if (error)
    throw new Error((error as { message: string }).message ?? "Resend error");

  const id = data?.id ?? "";
  console.log(`[email] ✓ Delivered | Resend id: ${id}`);
  return { messageId: id };
}

export async function verifyEmailConnection(): Promise<boolean> {
  // Resend has no "verify" endpoint — just confirm the key is present
  return !!process.env.RESEND_API_KEY;
}
