// DELETE THIS FILE before going to production
// Only for local development testing
//
// Usage:
//   GET /api/test-email                          — sends to DEV_EMAIL_OVERRIDE or SMTP_FROM_EMAIL
//   GET /api/test-email?to=someone@example.com  — sends to a specific address

import { NextRequest, NextResponse } from "next/server";
import { sendEmail, verifyEmailConnection, FROM_ADDRESS } from "@/modules/email/transport";

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 403 },
    );
  }

  const apiKeyPresent = await verifyEmailConnection();
  if (!apiKeyPresent) {
    return NextResponse.json(
      { error: "RESEND_API_KEY is not set" },
      { status: 500 },
    );
  }

  const to =
    req.nextUrl.searchParams.get("to") ??
    process.env.DEV_EMAIL_OVERRIDE ??
    process.env.SMTP_FROM_EMAIL;

  if (!to) {
    return NextResponse.json(
      { error: "No recipient — pass ?to=email or set DEV_EMAIL_OVERRIDE" },
      { status: 400 },
    );
  }

  try {
    const { messageId } = await sendEmail({
      from: FROM_ADDRESS,
      to,
      subject: "✅ Test — Polaris Requisition System (Resend)",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
          <h2 style="color:#1e293b">Resend is working ✓</h2>
          <p>This test email confirms that Resend is correctly configured for the Polaris Requisition System.</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
          <table style="font-size:13px;color:#64748b;width:100%">
            <tr><td><strong>From</strong></td><td>${FROM_ADDRESS}</td></tr>
            <tr><td><strong>To</strong></td><td>${to}</td></tr>
            <tr><td><strong>Override active</strong></td><td>${process.env.DEV_EMAIL_OVERRIDE ? "yes" : "no"}</td></tr>
            <tr><td><strong>Time</strong></td><td>${new Date().toISOString()}</td></tr>
          </table>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      message: "Test email sent via Resend",
      resendMessageId: messageId,
      from: FROM_ADDRESS,
      to,
      overrideActive: !!process.env.DEV_EMAIL_OVERRIDE,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}