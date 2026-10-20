# Hosting INUKA for free

INUKA runs on five free services. None of them needs a credit card (Google needs only a Google account).

| Part | Service (free plan) | What it holds |
| --- | --- | --- |
| Website (React) | **Vercel** | The pages people see, at `https://<name>.vercel.app` |
| API (Express) | **Render** web service | The backend. Vercel forwards every `/api/...` call to it |
| Database | **Neon** Postgres | Users, courses, scholarships… (1 GB) |
| Files | **Supabase Storage** (S3-compatible) | Documents, photos, lesson audio, chat files, letters (1 GB) |
| Email | **Brevo** API | Verification, reminders, letters (300 emails per day) |
| AI (optional) | **Google Gemini** or **Groq** API key | INUKA AI, writing feedback, scam-check AI |
| Keep-awake | **cron-job.org** | Pings the API every 10 minutes so it does not sleep |

Why this shape:
- **One web address.** The site and the API look like one site (`/api` goes through Vercel to Render). Sign-in cookies,
  Google sign-in and file downloads then work in every browser, with no cross-site cookie problems.
- **Render's free plan blocks email ports (SMTP)**, so INUKA sends email through Brevo's HTTPS API (`BREVO_API_KEY`).
- **Render's free disk is wiped on every restart**, so files go to Supabase Storage (`STORAGE_DRIVER=s3`).
- **Render's free Postgres is deleted after 30 days**, so the database is on Neon (free with no time limit).

Allow about 1–2 hours the first time. Do the steps in order: each one gives you a value the next one needs.

---

## 0. Put the code on GitHub

1. Create a **private** repository on github.com (for example `inuka`).
2. In `C:\Users\HP\Desktop\Inuka-project\inuka` (PowerShell):
   ```
   git init
   git add .
   git commit -m "INUKA"
   git branch -M main
   git remote add origin https://github.com/<you>/inuka.git
   git push -u origin main
   ```
3. Check on GitHub that **`backend/.env` is NOT there** (`.gitignore` keeps it out). Never commit keys.

## 1. Database — Neon

1. Sign up at **neon.com** → *Create project* → name `inuka`, Postgres 16 or 17, region **AWS Europe (Frankfurt)**
   (closest to Rwanda and to Render's Frankfurt region).
2. *Connect* → copy the connection string. Choose the **direct** one (host without `-pooler`). It looks like
   `postgresql://neondb_owner:xxxx@ep-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require`
   This is your **`DATABASE_URL`**.
3. Create the tables and the first data **from your computer** (PowerShell, in `backend`):
   ```
   $env:DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require"
   $env:NODE_ENV="production"
   $env:SEED_ADMIN_EMAIL="your-admin@email.com"
   $env:SEED_ADMIN_PASSWORD="A-long-strong-password-2026!"
   npx prisma migrate deploy
   npm run db:seed
   ```
   With `NODE_ENV=production` the seed creates the admin, courses, badges, scholarships and the sample universities,
   but **no test student or mentor** accounts. Close this PowerShell window afterwards (the values were only for it).

## 2. Files — Supabase Storage

1. Sign up at **supabase.com** → *New project* (`inuka-files`, region **Central EU (Frankfurt)**, any database password).
2. *Storage* → *New bucket* → name `inuka-files`, **Public: OFF** (INUKA checks who may download each file).
3. *Project Settings* → *Storage* → *S3 Connection*: copy the **Endpoint** and **Region**. Under *S3 Access Keys* →
   *New access key*: copy the **Access key ID** and **Secret access key** (shown once).
4. You now have:
   ```
   STORAGE_DRIVER=s3
   S3_ENDPOINT=https://<project-ref>.storage.supabase.co/storage/v1/s3
   AWS_REGION=eu-central-1            (the region shown on that page)
   AWS_S3_BUCKET=inuka-files
   AWS_ACCESS_KEY_ID=...
   AWS_SECRET_ACCESS_KEY=...
   ```
   Note: Supabase may pause a free project after a week with no activity. If uploads stop working, open the
   Supabase dashboard and press **Restore project**.

## 3. Email — Brevo

1. Sign up at **brevo.com** (free plan).
2. *Senders, domains & dedicated IPs* → *Senders* → add the address INUKA sends from (for example `hello.inuka@gmail.com`)
   and confirm it from the email Brevo sends you.
3. *SMTP & API* → *API keys* → *Generate a new API key*. You now have:
   ```
   BREVO_API_KEY=xkeysib-...
   EMAIL_FROM="INUKA <hello.inuka@gmail.com>"
   ```
   Later, with your own domain (for example `inuka.rw`), authenticate the domain in Brevo so fewer emails go to spam.

## 4. API — Render

1. Sign up at **render.com** with your GitHub account.
2. *New* → *Blueprint* → choose your `inuka` repository. Render reads `render.yaml` and creates **inuka-api**
   (folder `backend`, build `npm install && npx prisma migrate deploy`, start `npm start`, health check `/api/health`).
   If you prefer, *New → Web Service* with those same settings, plan **Free**, region **Frankfurt**.
3. Fill in the environment variables it asks for (Dashboard → inuka-api → *Environment*):
   | Key | Value |
   | --- | --- |
   | `DATABASE_URL` | from step 1 |
   | `FRONTEND_URL` | `https://<name>.vercel.app` (you get it in step 5; put a placeholder now and change it after) |
   | `BREVO_API_KEY`, `EMAIL_FROM` | from step 3 |
   | `STORAGE_DRIVER`, `S3_ENDPOINT`, `AWS_REGION`, `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | from step 2 |
   | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | from step 6 (optional) |
   | `AI_PROVIDER`, `AI_API_KEY` | from step 7 (optional) |
   Already set by `render.yaml`: `NODE_ENV=production`, `TRUST_PROXY=2`, `APP_TIMEZONE=Africa/Kigali`, a random
   `JWT_SECRET`. Copy any other values you use from your local `backend/.env` (never the local database URL or
   `localhost` addresses).
4. Deploy. When it is live, open `https://inuka-api-xxxx.onrender.com/api/health` → `{"ok":true,...}`.
   In *Logs* you should see `✓ Database: up to date` and `✓ Email: sending through Brevo API`.

## 5. Website — Vercel

1. In `frontend/vercel.json`, replace `https://YOUR-BACKEND.onrender.com` with your Render address from step 4.
   Commit and push:
   ```
   git add frontend/vercel.json
   git commit -m "Point the website to the API"
   git push
   ```
2. Sign up at **vercel.com** with GitHub → *Add New… → Project* → import `inuka`.
   **Root Directory: `frontend`**. Framework: **Vite** (build `npm run build`, output `dist`). No environment variables are needed.
3. Deploy. You get `https://<name>.vercel.app` (you can rename the project to get e.g. `inuka.vercel.app`).
4. Back in Render, set **`FRONTEND_URL`** to this exact address (no `/` at the end) and save. Render redeploys.
   This address is used in emails, QR certificate links, teacher letter links and Google sign-in.

## 6. Google sign-in (optional)

In Google Cloud Console → *APIs & Services* → *Credentials* → your OAuth client:
- *Authorized JavaScript origins*: `https://<name>.vercel.app`
- *Authorized redirect URIs*: `https://<name>.vercel.app/api/auth/google/callback`
- *OAuth consent screen* → *Publish app* (otherwise only test users can sign in).
Put the client ID and secret in Render (step 4). Keep the `localhost` entries too, for development.

## 7. INUKA AI (optional, free)

Get a free key from Google AI Studio (Gemini) or Groq, then in Render: `AI_PROVIDER=gemini` (or `groq`) and
`AI_API_KEY=...`. Without a key, INUKA AI runs in its free basic mode and the scam checker uses its rules only.

## 8. Keep the API awake — cron-job.org

A free Render service sleeps after 15 minutes without visits, and the next visitor waits about a minute.
1. Sign up at **cron-job.org** → *Create cronjob*.
2. URL: `https://inuka-api-xxxx.onrender.com/api/health`, every **10 minutes**.
This also lets the deadline and session reminders run. One always-on service uses about 744 of Render's
750 free hours a month, so **run only this one free service** on the Render account.
`/api/health` does not touch the database, so Neon can still sleep between reminder checks and stays within its free compute.

## 9. Check that everything works

Open `https://<name>.vercel.app` and test:
- [ ] Sign up → the verification email arrives → sign in → reload the page (still signed in)
- [ ] Sign in with Google
- [ ] Upload a document in Profile → Documents, download it again
- [ ] Profile photo, lesson audio and images in Admin
- [ ] Ask a teacher for a letter (use your own second email) → upload from the link
- [ ] A certificate's QR code opens `/verify/<code>`
- [ ] Scam checker, See your options, Universities, News
- [ ] Sign in as the admin (step 1) → **change the password**, then check the sample universities (Admin → Universities)

## Updating the site later

Push to GitHub (`git push`). Vercel and Render rebuild by themselves, and Render applies new database migrations
(`npx prisma migrate deploy`) during the build. Run `npm run db:seed` against Neon only when new seed content is
added (step 1 commands).

## Limits of the free plans (good for a pilot and the hackathon)

- Database 1 GB, files 1 GB, 300 emails a day. Enough for a few thousand students.
- If cron-job.org stops, the first visit after a quiet period takes about a minute.
- For a real launch with many users, the cheapest upgrade is Render's paid instance (no sleeping, SMTP allowed).
  Nothing in the code has to change.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Website shows "Something went wrong on our side" | Render → Logs. `✗ Database…` → run step 1 `npx prisma migrate deploy` again |
| Every page says "network error" | `frontend/vercel.json` still has `YOUR-BACKEND`, or the Render service is asleep or failed |
| Signed out after reload | Use the Vercel address (not the Render address) to open the site |
| Google: `redirect_uri_mismatch` | The redirect URI in Google must be exactly `FRONTEND_URL` + `/api/auth/google/callback` |
| No emails | Render logs: `Brevo API key refused` → check the key; sender not confirmed in Brevo |
| Upload fails | Check the six storage variables; bucket name; Supabase project paused → Restore |
| "Too many requests" for everyone | `TRUST_PROXY` must be `2` on Render |
