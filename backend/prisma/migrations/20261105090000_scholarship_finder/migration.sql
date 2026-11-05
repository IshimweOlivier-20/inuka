-- Scholarship finder: feeds to follow and the leads found in them (an admin reviews every lead).
CREATE TABLE "lead_sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_checked_at" TIMESTAMP(3),
    "last_error" TEXT,
    "last_found" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lead_sources_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "lead_sources_url_key" ON "lead_sources"("url");

CREATE TABLE "scholarship_leads" (
    "id" TEXT NOT NULL,
    "source_id" TEXT,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "summary" TEXT,
    "published_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'new',
    "scholarship_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "scholarship_leads_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "scholarship_leads_url_key" ON "scholarship_leads"("url");
CREATE INDEX "scholarship_leads_status_created_at_idx" ON "scholarship_leads"("status", "created_at");
ALTER TABLE "scholarship_leads" ADD CONSTRAINT "scholarship_leads_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "lead_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
