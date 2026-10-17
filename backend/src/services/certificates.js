// When does a student get a course certificate?
//   1. Every published lesson of the course is completed, and
//   2. if the course has a published final exam that is "required for the certificate", the exam is passed.
import { prisma } from '../lib/prisma.js';
import { randomBytes } from 'node:crypto';
import { notify } from '../utils/notify.js';

// Short code printed on the certificate and in its QR code (no 0/O/1/I, easy to type).
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const newCertificateCode = () => Array.from(randomBytes(10), (b) => ALPHABET[b % ALPHABET.length]).join('');

// The final exam students can take (published, with at least one question), or null.
export async function activeExam(courseId) {
  const exam = await prisma.exam.findUnique({ where: { courseId }, include: { _count: { select: { questions: true } } } });
  return exam && exam.isPublished && exam._count.questions > 0 ? exam : null;
}

export async function lessonsState(userId, courseId) {
  const lessons = await prisma.lesson.findMany({ where: { courseId, isPublished: true }, select: { id: true } });
  const done = await prisma.progress.count({ where: { userId, isCompleted: true, lessonId: { in: lessons.map((l) => l.id) } } });
  return { total: lessons.length, done, allDone: lessons.length > 0 && done >= lessons.length };
}

// Issues the certificate if the student has earned it. Returns { certificate, created, waitingForExam }.
export async function checkCertificate(userId, courseId) {
  const existing = await prisma.certificate.findUnique({ where: { userId_courseId: { userId, courseId } } });
  if (existing) return { certificate: existing, created: false, waitingForExam: false };
  const { allDone } = await lessonsState(userId, courseId);
  if (!allDone) return { certificate: null, created: false, waitingForExam: false };
  const exam = await activeExam(courseId);
  if (exam?.requiredForCertificate) {
    const passed = await prisma.examAttempt.findFirst({ where: { userId, examId: exam.id, passed: true } });
    if (!passed) return { certificate: null, created: false, waitingForExam: true, exam };
  }
  const certificate = await prisma.certificate.upsert({
    where: { userId_courseId: { userId, courseId } }, update: {}, create: { userId, courseId, code: newCertificateCode() },
  });
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { title: true } });
  await notify(userId, 'course_completed', `Congratulations! You completed ${course.title}. Download your certificate!`, '/my-learning');
  return { certificate, created: true, waitingForExam: false };
}
