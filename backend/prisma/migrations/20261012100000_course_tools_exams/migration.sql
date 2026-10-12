-- Lesson settings
ALTER TABLE "lessons" ADD COLUMN "estimated_minutes" INTEGER,
ADD COLUMN "pass_mark" INTEGER,
ADD COLUMN "ai_activity" JSONB,
ADD COLUMN "resources" JSONB NOT NULL DEFAULT '[]';

-- Question types for lesson quizzes
ALTER TABLE "quizzes" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'single',
ADD COLUMN "correct_answers" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "image_url" TEXT;
UPDATE "quizzes" SET "correct_answers" = jsonb_build_array("correct_answer");

-- Final course exams
CREATE TABLE "exams" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Final exam',
    "instructions" TEXT,
    "pass_mark" INTEGER NOT NULL DEFAULT 70,
    "time_limit_minutes" INTEGER NOT NULL DEFAULT 30,
    "question_count" INTEGER NOT NULL DEFAULT 0,
    "shuffle" BOOLEAN NOT NULL DEFAULT true,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "retry_after_hours" INTEGER NOT NULL DEFAULT 24,
    "show_answers" BOOLEAN NOT NULL DEFAULT true,
    "required_for_certificate" BOOLEAN NOT NULL DEFAULT true,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "exams_course_id_key" ON "exams"("course_id");
ALTER TABLE "exams" ADD CONSTRAINT "exams_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "exam_questions" (
    "id" TEXT NOT NULL,
    "exam_id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'single',
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL DEFAULT '[]',
    "correct_answers" JSONB NOT NULL DEFAULT '[]',
    "image_url" TEXT,
    "explanation" TEXT,
    "points" INTEGER NOT NULL DEFAULT 1,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "exam_questions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "exam_questions_exam_id_idx" ON "exam_questions"("exam_id");
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "exam_attempts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "exam_id" TEXT NOT NULL,
    "questions" JSONB NOT NULL,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "score" INTEGER,
    "passed" BOOLEAN,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3),
    CONSTRAINT "exam_attempts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "exam_attempts_user_id_exam_id_idx" ON "exam_attempts"("user_id", "exam_id");
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
