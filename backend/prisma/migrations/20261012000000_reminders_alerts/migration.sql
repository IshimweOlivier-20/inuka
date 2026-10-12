-- Subscriber unsubscribe token
ALTER TABLE "subscribers" ADD COLUMN "token" TEXT;
UPDATE "subscribers" SET "token" = gen_random_uuid()::text WHERE "token" IS NULL;
ALTER TABLE "subscribers" ALTER COLUMN "token" SET NOT NULL;
CREATE UNIQUE INDEX "subscribers_token_key" ON "subscribers"("token");

-- Reminder / alert emails already sent
CREATE TABLE "sent_reminders" (
    "key" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sent_reminders_pkey" PRIMARY KEY ("key")
);

-- Scholarships and articles already on the site count as announced (no alert emails for old items).
INSERT INTO "sent_reminders" ("key") SELECT 'alert:scholarship:' || "id" FROM "scholarships" ON CONFLICT DO NOTHING;
INSERT INTO "sent_reminders" ("key") SELECT 'alert:post:' || "id" FROM "posts" ON CONFLICT DO NOTHING;
