/**
 * mail/test-smtp.js — JS PROMPT v2
 * Quick smoke test for Mailcow SMTP configuration.
 * Run after setting up Mailcow and before going live:
 *
 *   node mail/test-smtp.js recipient@example.com
 */
'use strict';

const nodemailer = require('nodemailer');
const path       = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const {
  MAIL_HOST = '127.0.0.1',
  MAIL_PORT = 587,
  MAIL_USER,
  MAIL_PASS,
  MAIL_FROM = 'noreply@promt.pp.ua',
} = process.env;

const to = process.argv[2];
if (!to) {
  console.error('Usage: node test-smtp.js recipient@example.com');
  process.exit(1);
}

async function main() {
  console.log(`[mail-test] Connecting to ${MAIL_HOST}:${MAIL_PORT} as ${MAIL_USER}`);

  const transporter = nodemailer.createTransport({
    host:   MAIL_HOST,
    port:   parseInt(MAIL_PORT),
    secure: parseInt(MAIL_PORT) === 465,
    auth:   { user: MAIL_USER, pass: MAIL_PASS },
    // Certificate verification stays on; set MAIL_TLS_INSECURE=1 to allow a self-signed cert
    tls:    { rejectUnauthorized: process.env.MAIL_TLS_INSECURE !== '1' },
  });

  // Verify connection
  await transporter.verify();
  console.log('[mail-test] SMTP connection OK');

  // Send test email
  const info = await transporter.sendMail({
    from:    MAIL_FROM,
    to,
    subject: '[JS PROMPT] SMTP Test — ' + new Date().toISOString(),
    html: `
      <div style="font-family:Arial,sans-serif;padding:20px;background:#132f4c;color:#e3f2fd;border-radius:8px;">
        <h2 style="color:#4fc3f7;">✓ JS PROMPT v2 Mail Test</h2>
        <p>SMTP configuration is working correctly.</p>
        <p>Host: <code>${MAIL_HOST}:${MAIL_PORT}</code></p>
        <p>From: <code>${MAIL_FROM}</code></p>
        <p>Time: <code>${new Date().toISOString()}</code></p>
      </div>`,
    text: 'JS PROMPT v2 SMTP test — configuration OK.',
  });

  console.log('[mail-test] ✓ Email sent successfully!');
  console.log('[mail-test] Message ID:', info.messageId);
  console.log('[mail-test] Response:', info.response);
}

main().catch(err => {
  console.error('[mail-test] ✗ Failed:', err.message);
  process.exit(1);
});
