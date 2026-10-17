-- Accessibility settings on the account
ALTER TABLE "users" ADD COLUMN "accessibility" JSONB,
ADD COLUMN "extra_time_percent" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "disabilities" JSONB;

-- Short public code on every certificate (QR "verify" page); existing certificates get one
ALTER TABLE "certificates" ADD COLUMN "code" TEXT;
UPDATE "certificates" SET "code" = upper(substr(md5(random()::text || id), 1, 10)) WHERE "code" IS NULL;
ALTER TABLE "certificates" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX "certificates_code_key" ON "certificates"("code");

-- Scholarships: published minimum grade, disability support
ALTER TABLE "scholarships" ADD COLUMN "min_points" INTEGER,
ADD COLUMN "disability_friendly" BOOLEAN NOT NULL DEFAULT false;

-- Lesson transcripts
ALTER TABLE "lessons" ADD COLUMN "transcript" TEXT;

-- Universities and programmes
CREATE TABLE "universities" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT,
    "kind" TEXT NOT NULL,
    "city" TEXT,
    "website" TEXT,
    "about" TEXT,
    "accessibility" JSONB,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "universities_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "universities_slug_key" ON "universities"("slug");

CREATE TABLE "programmes" (
    "id" TEXT NOT NULL,
    "university_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "award" TEXT NOT NULL,
    "duration_years" DOUBLE PRECISION,
    "combinations" JSONB NOT NULL DEFAULT '[]',
    "required" JSONB NOT NULL DEFAULT '[]',
    "min_points" INTEGER,
    "notes" TEXT,
    "apply_url" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "programmes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "programmes_university_id_idx" ON "programmes"("university_id");
ALTER TABLE "programmes" ADD CONSTRAINT "programmes_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- S6 results typed by students
CREATE TABLE "s6_results" (
    "user_id" TEXT NOT NULL,
    "system" TEXT NOT NULL DEFAULT 'rwanda',
    "combination" TEXT,
    "subjects" JSONB NOT NULL,
    "exam_year" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "s6_results_pkey" PRIMARY KEY ("user_id")
);
ALTER TABLE "s6_results" ADD CONSTRAINT "s6_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Recommendation letter requests
CREATE TABLE "recommendation_requests" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "teacher_name" TEXT NOT NULL,
    "teacher_email" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "message" TEXT,
    "due_date" TIMESTAMP(3),
    "token_hash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "decline_note" TEXT,
    "document_id" TEXT,
    "reminded_at" TIMESTAMP(3),
    "received_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "recommendation_requests_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "recommendation_requests_token_hash_key" ON "recommendation_requests"("token_hash");
CREATE INDEX "recommendation_requests_student_id_idx" ON "recommendation_requests"("student_id");
ALTER TABLE "recommendation_requests" ADD CONSTRAINT "recommendation_requests_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
