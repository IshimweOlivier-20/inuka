// "Get scholarship alerts" emails (spec: email subscribers when new scholarships and guides are added).
// Sent once per scholarship / article, in the background, to everyone in the subscribers list.
// Each email has an unsubscribe link (/unsubscribe?token=…) and a List-Unsubscribe header.
import { prisma } from '../lib/prisma.js';
import { sendEmailSafe } from './emailService.js';

const site = () => (process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173').trim().replace(/\/+$/, '');
const strip = (html) => String(html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const FUNDING = { fully_funded: 'Fully funded', partial: 'Partial funding', tuition_only: 'Tuition only' };

async function claim(key) {
  try { await prisma.sentReminder.create({ data: { key } }); return true; } catch { return false; }
}

async function sendToSubscribers(build) {
  const subs = await prisma.subscriber.findMany({ select: { email: true, token: true } });
  for (const s of subs) {
    const unsubscribe = `${site()}/unsubscribe?token=${s.token}`;
    const mail = build();
    await sendEmailSafe({
      ...mail, to: s.email,
      footer: `You get this email because you asked for INUKA scholarship alerts. <a href="${unsubscribe}" style="color:#5F6670">Unsubscribe</a>`,
      text: `${mail.text}\n\nStop these emails: ${unsubscribe}`,
      headers: { 'List-Unsubscribe': `<${unsubscribe}>` },
    });
  }
  return subs.length;
}

// A new (or newly shown) scholarship. Skips closed ones.
export async function alertScholarship(s) {
  if (!s?.isActive || (s.deadline && new Date(s.deadline) < new Date())) return 0;
  if (!(await claim(`alert:scholarship:${s.id}`))) return 0;
  const deadline = s.deadline ? new Date(s.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'varies';
  return sendToSubscribers(() => ({
    subject: `New scholarship: ${s.name}`,
    text: `A new scholarship is on INUKA.\n\n${s.name}\n${s.hostUniversity || s.orgName}, ${s.hostCountry}\n${FUNDING[s.fundingType] || ''}${s.openToRefugees ? ' · Open to refugees' : ''}\nDeadline: ${deadline}\n\n${strip(s.description).slice(0, 300)}`,
    action: { label: 'See the scholarship', url: `${site()}/opportunities/${s.slug}` },
  }));
}

// A new published guide or news article.
export async function alertPost(p) {
  if (!p?.isPublished || (p.publishedAt && new Date(p.publishedAt) > new Date())) return 0;
  if (!(await claim(`alert:post:${p.id}`))) return 0;
  const kind = { guide: 'guide', news: 'news', story: 'story' }[p.category] || 'article';
  return sendToSubscribers(() => ({
    subject: `New on INUKA: ${p.title}`,
    text: `A new ${kind} is on INUKA.\n\n${p.title}\n\n${strip(p.excerpt).slice(0, 300)}`,
    action: { label: 'Read it', url: `${site()}/news/${p.slug}` },
  }));
}

// Fire and forget (the admin should not wait for hundreds of emails).
export const queueAlert = (fn, item) => { fn(item).catch((e) => console.error('Alert emails failed:', e.message)); };
