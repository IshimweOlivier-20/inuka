// Checks your email (SMTP) settings and sends a test email.
//   npm run email:test -- you@example.com
import 'dotenv/config';
import { emailEnabled, sendEmail, verifyEmail } from '../src/services/emailService.js';

const to = process.argv[2] || process.env.SMTP_USER;
if (!emailEnabled()) {
  console.log('✗ Email is not set up. Add SMTP_HOST, SMTP_USER and SMTP_PASS to backend/.env (see .env.example).');
  process.exit(1);
}
const check = await verifyEmail();
if (!check.ok) {
  console.log(`✗ Could not sign in to ${process.env.SMTP_HOST}: ${check.reason}`);
  console.log('  Gmail: use an App password (myaccount.google.com/apppasswords), not your normal password.');
  process.exit(1);
}
console.log(`✓ Signed in to ${process.env.SMTP_HOST} as ${process.env.SMTP_USER}`);
await sendEmail({
  to, subject: 'INUKA test email',
  text: 'Hello!\n\nIf you can read this, INUKA can send emails: account confirmations, password resets, mentorship updates, reminders, announcements and scholarship alerts.\n\nThe INUKA team',
  action: { label: 'Open INUKA', url: process.env.FRONTEND_URL || 'http://localhost:5173' },
});
console.log(`✓ Test email sent to ${to}. Check the inbox (and the spam folder).`);
process.exit(0);
