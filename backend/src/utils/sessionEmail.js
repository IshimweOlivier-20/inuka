// Meeting details email, sent to BOTH the student and the mentor when a mentor approves a session
// (and again when the mentor changes the call link). Before approval nobody receives a call link.
import { sendEmail } from '../services/emailService.js';
import { formatWhen, SESSION_MINUTES } from './slots.js';

const HOW = { video: 'Video call', voice: 'Voice call', message: 'Messages on INUKA' };
const site = () => (process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173').trim().replace(/\/+$/, '');
const stamp = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); // 20261106T080000Z

// "Add to Google Calendar" link (works without a Google account on the INUKA side).
export function calendarUrl({ title, start, minutes = SESSION_MINUTES, details = '', location = '' }) {
  const end = new Date(start.getTime() + minutes * 60000);
  const q = new URLSearchParams({ action: 'TEMPLATE', text: title, dates: `${stamp(start)}/${stamp(end)}`, details, location });
  return `https://calendar.google.com/calendar/render?${q}`;
}

// b: booking with student; mentorUser: { firstName, lastName, email }. updated: true when only the link changed.
export async function sendMeetingDetails({ b, mentorUser, message, updated = false }) {
  const when = formatWhen(b.scheduledAt);
  const mentorName = `${mentorUser.firstName} ${mentorUser.lastName}`;
  const studentName = `${b.student.firstName} ${b.student.lastName}`;
  const isMsg = b.sessionType === 'message';
  const join = isMsg ? `${site()}/messages` : b.videoLink;
  const lines = [
    'MEETING DETAILS',
    `Topic: ${b.topic}`,
    `Date and time: ${when}`,
    `Length: ${SESSION_MINUTES} minutes`,
    `How: ${HOW[b.sessionType] || HOW.video}`,
    isMsg ? `Where: INUKA messages (${site()}/messages)` : `Join link: ${b.videoLink || 'not added yet — it will be emailed to you'}`,
    `Mentor: ${mentorName}`,
    `Student: ${studentName}`,
  ].join('\n');
  const cal = calendarUrl({
    title: `INUKA mentorship: ${b.topic}`, start: new Date(b.scheduledAt),
    details: `Mentorship session on INUKA between ${mentorName} (mentor) and ${studentName} (student).${join ? `\nJoin: ${join}` : ''}`,
    location: join || 'INUKA',
  });
  const tips = 'Please join on time. If you cannot come, cancel or move the session on INUKA so the other person knows.';
  const send = (to, subject, hello, intro, path) => sendEmail({
    to, subject,
    text: `Hi ${hello},\n\n${intro}\n\n${lines}${message ? `\n\nMessage from the mentor: ${message}` : ''}\n\nAdd it to your calendar: ${cal}\n\n${tips}\n\nRise. Learn. Succeed.\nThe INUKA team`,
    action: { label: isMsg ? 'Open INUKA messages' : 'Join the session', url: isMsg ? `${site()}${path}` : b.videoLink || `${site()}${path}` },
  }).catch((e) => console.error('Email failed', e.message));
  await Promise.all([
    send(b.student.email,
      updated ? `New call link: your session with ${mentorName}` : `Confirmed: your session with ${mentorName}`,
      b.student.firstName,
      updated ? `${mentorName} changed the call link for your session. Please use the new details below.` : `Good news! ${mentorName} approved your mentorship session. Here are the meeting details.`,
      `/mentorship/sessions/${b.id}`),
    send(mentorUser.email,
      updated ? `New call link saved: session with ${b.student.firstName}` : `Session confirmed with ${studentName}`,
      mentorUser.firstName,
      updated ? `You changed the call link. ${b.student.firstName} has received the new details too.` : `You approved this session. ${b.student.firstName} has received the same meeting details.`,
      '/mentor/sessions'),
  ]);
}
