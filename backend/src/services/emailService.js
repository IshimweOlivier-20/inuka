// Sends email through SendGrid's HTTP API. Without a key (development), prints the email to the console.
export async function sendEmail({ to, subject, text }) {
  const key = process.env.SENDGRID_API_KEY;
  if (!key) {
    console.log(`\n📧  EMAIL (dev — not sent)\n   To: ${to}\n   Subject: ${subject}\n   ${text.replace(/\n/g, '\n   ')}\n`);
    return;
  }
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: process.env.FROM_EMAIL, name: 'INUKA' },
      subject,
      content: [{ type: 'text/plain', value: text }],
    }),
  });
  if (!res.ok) console.error('SendGrid error', res.status, await res.text());
}
