// DELETE THIS FILE before going to production
// Only for local development testing

import { NextResponse } from 'next/server'
import { verifyEmailConnection } from '@/modules/email/transport'
import { getTransport, FROM_ADDRESS } from '@/modules/email/transport'

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const connected = await verifyEmailConnection()
  if (!connected) {
    return NextResponse.json({ error: 'SMTP connection failed' }, { status: 500 })
  }

  // Send a test email to yourself
  await getTransport().sendMail({
    from: FROM_ADDRESS,
    to: process.env.SMTP_USER!, // send to yourself
    subject: 'Test — Requisition System Email',
    html: '<p>If you receive this, Zoho SMTP is configured correctly.</p>'
  })

  return NextResponse.json({ success: true, message: 'Test email sent' })
}