// Student–mentor messages: one conversation per pair. INUKA also writes short "system" lines into it
// (session requested, confirmed, moved, cancelled…) so both people see the history in one place.
import { prisma } from '../lib/prisma.js';

export async function conversationFor(studentId, mentorUserId) {
  return prisma.conversation.upsert({
    where: { studentId_mentorUserId: { studentId, mentorUserId } },
    update: {},
    create: { studentId, mentorUserId },
  });
}

// A line from INUKA in the conversation of this booking. Never breaks the action that caused it.
export async function systemMessage(booking, text) {
  try {
    const mentor = booking.mentor?.userId ? booking.mentor : await prisma.mentor.findUnique({ where: { id: booking.mentorId }, select: { userId: true } });
    const c = await conversationFor(booking.studentId, mentor.userId);
    const now = new Date();
    await prisma.$transaction([
      prisma.message.create({ data: { conversationId: c.id, kind: 'system', text, createdAt: now } }),
      prisma.conversation.update({ where: { id: c.id }, data: { lastMessageAt: now } }),
    ]);
  } catch (e) { console.error('Chat system message failed:', e.message); }
}

// May these two people message each other? Yes once the student has asked the mentor for a session.
export async function canChat(studentId, mentorUserId) {
  const b = await prisma.booking.findFirst({ where: { studentId, mentor: { userId: mentorUserId } }, select: { id: true } });
  return !!b;
}
