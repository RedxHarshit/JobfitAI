// src/app/api/send-email/route.ts
import { NextResponse } from 'next/server';
import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, subject, html, text } = body;

    if (!to || !subject || (!html && !text)) {
      return NextResponse.json({ error: 'Missing required email parameters: to, subject, and html or text.' }, { status: 400 });
    }

    const mailersendApiKey = process.env.MAILERSEND_API_KEY;
    const senderEmail = process.env.MAILERSEND_SENDER_EMAIL;
    const senderName = process.env.MAILERSEND_SENDER_NAME;

    if (!mailersendApiKey) {
      console.error('MailerSend API key is not configured.');
      return NextResponse.json({ error: 'Email service is not configured (missing API key).' }, { status: 500 });
    }
    if (!senderEmail || !senderName) {
      console.error('MailerSend sender email or name is not configured.');
      return NextResponse.json({ error: 'Email service is not configured (missing sender details).' }, { status: 500 });
    }

    const mailersend = new MailerSend({ apiKey: mailersendApiKey });

    const sentFrom = new Sender(senderEmail, senderName);
    const recipients = [new Recipient(to, "Recipient")]; // Assuming single recipient for simplicity

    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setSubject(subject)
      .setHtml(html || `<html><body>${text}</body></html>`) // Ensure HTML is always present if only text is given
      .setText(text || 'Please view this email in an HTML-compatible client.');

    console.log(`[API Send Email] Attempting to send email to: ${to} with subject: ${subject}`);
    
    await mailersend.email.send(emailParams);

    console.log(`[API Send Email] Email successfully sent to: ${to}`);
    return NextResponse.json({ message: 'Email sent successfully' }, { status: 200 });

  } catch (error: any) {
    console.error('[API Send Email] Error sending email:', error.message);
    console.error('[API Send Email] MailerSend Error Body:', error.body); // Log MailerSend specific error details
    return NextResponse.json({ error: 'Failed to send email', details: error.message, mailerSendBody: error.body }, { status: 500 });
  }
}
