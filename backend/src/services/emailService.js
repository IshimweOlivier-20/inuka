// All INUKA emails go through Nodemailer (SMTP). Works with Gmail (an "App password"), Outlook, Zoho, Brevo,
// Mailgun SMTP or any other SMTP server. Set in backend/.env:
//   SMTP_HOST=smtp.gmail.com   SMTP_PORT=465   SMTP_SECURE=true
//   SMTP_USER=hello.inuka@gmail.com   SMTP_PASS=<16-letter Gmail app password>
//   EMAIL_FROM="INUKA <hello.inuka@gmail.com>"
// Without SMTP settings (development) emails are printed in the backend terminal instead of being sent.
import nodemailer from 'nodemailer';

let transporter = null;
const configured = () => !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
export const emailEnabled = configured;

function getTransporter() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 465);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      pool: true, maxConnections: 3, // reuse connections when many emails go out (announcements, alerts)
    });
  }
  return transporter;
}

const from = () => process.env.EMAIL_FROM || (process.env.FROM_EMAIL ? `INUKA <${process.env.FROM_EMAIL}>` : `INUKA <${process.env.SMTP_USER}>`);
const site = () => (process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Plain text -> simple branded HTML. Links become clickable; an optional button is added (action: { label, url }).
export function renderHtml({ subject, text, action, footer }) {
  const paras = esc(text)
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#07294D;font-weight:600">$1</a>')
    .split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px">${p.replace(/\n/g, '<br>')}</p>`);
  const button = action ? `<p style="margin:22px 0"><a href="${esc(action.url)}" style="display:inline-block;background:#FFC600;color:#07294D;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:4px">${esc(action.label)}</a></p>` : '';
  // The button goes above the sign-off ("The INUKA team"), not under it.
  const signed = paras.length > 1 && /INUKA team/i.test(paras[paras.length - 1]);
  const body = signed ? [...paras.slice(0, -1), button, paras[paras.length - 1]].join('') : paras.join('') + button;
  return `<!doctype html><html><body style="margin:0;background:#F8FAFC;font-family:'Open Sans',Arial,sans-serif;color:#0B1B33">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #E5E9F0;border-radius:8px;overflow:hidden">
<tr><td style="background:#07294D;padding:18px 24px"><a href="${site()}" style="color:#ffffff;text-decoration:none;font-family:Roboto,Arial,sans-serif;font-size:22px;font-weight:700;letter-spacing:.5px">INUKA</a>
<span style="color:#FFC600;font-size:12px;margin-left:8px">Rise. Learn. Succeed.</span></td></tr>
<tr><td style="padding:26px 24px 8px;font-size:15px;line-height:1.6">
<h1 style="font-family:Roboto,Arial,sans-serif;font-size:19px;color:#07294D;margin:0 0 16px">${esc(subject)}</h1>${body}</td></tr>
<tr><td style="padding:14px 24px 22px;border-top:1px solid #E5E9F0;font-size:12px;color:#5F6670">${footer ? `${footer}<br>` : ''}INUKA — free learning, scholarships and mentors for African students and refugees. <a href="${site()}" style="color:#5F6670">${site().replace(/^https?:\/\//, '')}</a></td></tr>
</table></td></tr></table></body></html>`;
}

// sendEmail({ to, subject, text, html?, action?, footer?, headers? }) — throws if sending fails.
export async function sendEmail({ to, subject, text, html, action, footer, headers }) {
  const fullText = action ? `${text}\n\n${action.label}: ${action.url}` : text;
  if (!configured()) {
    console.log(`\n📧  EMAIL (dev — not sent; set SMTP_* in backend/.env to send)\n   To: ${to}\n   Subject: ${subject}\n   ${fullText.replace(/\n/g, '\n   ')}\n`);
    return { dev: true };
  }
  return getTransporter().sendMail({
    from: from(), to, subject, text: fullText, html: html || renderHtml({ subject, text, action, footer }),
    ...(headers && { headers }),
  });
}

// Never let an email problem break the action the user did (used for notifications and reminders).
export const sendEmailSafe = (args) => sendEmail(args).catch((e) => { console.error('Email failed:', args.to, e.message); return null; });

// Checks the SMTP login (used by `npm run email:test` and at startup).
export async function verifyEmail() {
  if (!configured()) return { ok: false, reason: 'SMTP is not set up (emails are printed in the terminal).' };
  try { await getTransporter().verify(); return { ok: true }; } catch (e) { return { ok: false, reason: e.message }; }
}
