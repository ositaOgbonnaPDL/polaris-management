import nodemailer from "nodemailer";

const isDev = process.env.NODE_ENV !== "production";

// Always create a fresh transporter — avoids stale cached instances
// when credentials or env vars change during development.
export function getTransport(): nodemailer.Transporter {
  if (isDev) {
    console.log("[email] Creating Mailtrap transport", {
      host: "sandbox.smtp.mailtrap.io",
      port: 2525,
      user: process.env.MAILTRAP_USER
        ? `${process.env.MAILTRAP_USER.slice(0, 4)}...`
        : "MISSING",
      pass: process.env.MAILTRAP_PASSWORD ? "set" : "MISSING",
    });
    return nodemailer.createTransport({
      host: "sandbox.smtp.mailtrap.io",
      port: 2525,
      secure: false, // Mailtrap sandbox requires STARTTLS (not SSL)
      auth: {
        user: process.env.MAILTRAP_USER,
        pass: process.env.MAILTRAP_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false, // Allow Mailtrap's self-signed cert
      },
    });
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? "465"),
    secure: parseInt(process.env.SMTP_PORT ?? "465") === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    tls: {
      rejectUnauthorized: true,
    },
  });
}

export const FROM_ADDRESS = isDev
  ? `"${process.env.SMTP_FROM_NAME ?? "Polaris Dev"}" <dev@example.com>`
  : `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`;

export async function verifyEmailConnection(): Promise<boolean> {
  try {
    const t = getTransport();
    console.log("[email] Verifying SMTP connection...");
    await t.verify();
    console.log("[email] SMTP connection verified ✓");
    return true;
  } catch (error) {
    console.error("[email] SMTP connection failed:", error);
    return false;
  }
}
