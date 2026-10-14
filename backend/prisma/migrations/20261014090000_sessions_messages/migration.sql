-- Session type, cancel and reschedule details
ALTER TABLE "bookings" ADD COLUMN "session_type" TEXT NOT NULL DEFAULT 'video',
ADD COLUMN "cancel_reason" TEXT,
ADD COLUMN "cancelled_by" TEXT,
ADD COLUMN "reschedule_reason" TEXT,
ADD COLUMN "reschedule_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "previous_time" TIMESTAMP(3);

-- Messages between students and mentors
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "mentor_user_id" TEXT NOT NULL,
    "last_message_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "student_read_at" TIMESTAMP(3),
    "mentor_read_at" TIMESTAMP(3),
    "student_cleared_at" TIMESTAMP(3),
    "mentor_cleared_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "conversations_student_id_mentor_user_id_key" ON "conversations"("student_id", "mentor_user_id");
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_mentor_user_id_fkey" FOREIGN KEY ("mentor_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_id" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'text',
    "text" TEXT NOT NULL DEFAULT '',
    "file_key" TEXT,
    "file_name" TEXT,
    "file_type" TEXT,
    "file_size" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE SET NULL;
