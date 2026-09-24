# INUKA — Rise. Learn. Succeed.

A free learning and scholarship platform for African high school graduates and refugees.
Built from the *INUKA Full Project Specification* by Olivier Ishimwe.

**Stack:** React 19 + Vite + Tailwind CSS 4 (client) · Node.js + Express 5 (server) · PostgreSQL + Prisma 6

---

## 1. What you need

- **Node.js 22 LTS** (or at least 20.19). Check with `node -v`.
- **PostgreSQL** running, with an empty database called `inuka` (you already have this).

## 2. First-time setup

Open a terminal in the `inuka` folder.

### Server

```bash
cd server
copy .env.example .env        # Windows   (Mac/Linux: cp .env.example .env)
```

Open `server/.env` and fill in two things:

1. **`DATABASE_URL`** — replace `PASSWORD` with your PostgreSQL password:
   `postgresql://postgres:YOUR_PASSWORD@localhost:5432/inuka`
   (If your password contains `@`, `#`, `/` or `:`, replace them with `%40`, `%23`, `%2F`, `%3A`.)
2. **`JWT_SECRET`** — paste a long random string. Generate one with:
   `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

Then:

```bash
npm install          # also generates the Prisma client
npm run db:setup     # creates all 24 tables and loads courses, badges, 20 scholarships and an admin account
npm run dev          # API on http://localhost:3000
```

You should see `✓ INUKA API running on http://localhost:3000`.
Check it: open http://localhost:3000/api/health in your browser.

### Client (in a second terminal)

```bash
cd client
npm install
npm run dev          # opens on http://localhost:5173
```

## 3. Try it

1. Open http://localhost:5173 and click **Get started**.
2. Register as a student. Email is not sent in development — the confirmation link is shown on the screen
   **and** printed in the server terminal. Click it.
3. Start **Reading & Comprehension → Lesson 1**, pass the quiz, mark it complete → you earn 🌱 First Step.
4. Go to **Profile → Documents vault** and upload your ID (PDF/JPG/PNG).
5. Go to **Scholarships**, click **Apply now** → the Document Checklist shows your ID ticked ✅.

Admin account (from the seed): `admin@inuka.app` / `ChangeMe123` — **change it** in `.env` before seeding a real server.

Useful commands (in `server/`):

| Command | What it does |
|---|---|
| `npm run db:studio` | Opens Prisma Studio — a web UI to browse and edit every table |
| `npm run db:seed` | Re-runs the seed (safe to run again; it updates, not duplicates) |
| `npm run db:migrate` | After you change `schema.prisma`, creates and applies a new migration |
| `npm run db:reset` | ⚠️ Deletes all data and rebuilds the database |

## 4. Editing the home page content

The home page sections (tips, testimonials, news & guides, team, partners & sponsors, FAQ) come from the
database, so you can change them without touching code.

**Easiest way:** in `server/`, run `npm run db:studio`. Prisma Studio opens in your browser. Choose a table
(`testimonials`, `posts`, `team_members`, `partners`, `tips`, `faq_items`), then add, edit or delete rows.
Refresh the home page to see the change. You can also use pgAdmin.

| Field | Meaning |
|---|---|
| `isSample` | Placeholder content. Shown in development with a yellow **Sample** badge, **hidden automatically in production**. Set it to `false` only for real content. |
| `isPublished` | Set to `false` to hide a row without deleting it. |
| `orderIndex` | Display order (0 first). |
| `photoUrl` / `logoUrl` | Optional image links. Without one, the site shows initials or the organisation's name. |

**Before launch, replace the samples:**
- **Testimonials:** only publish real words from real students or mentors, **with their written permission**
  to use their name (and photo). If there are none yet, leave the table empty and the section disappears.
- **Team:** add real team members and delete the samples.
- **Partners & sponsors:** the database already lists ALU, MINEMA, MINEDUC, REMA, Mastercard Foundation,
  Rwanda Red Cross, Alight, UNICEF, Save the Children, Inkomoko and World Vision, all **unpublished**.
  To show one: (1) make sure that organisation has agreed to be shown as an INUKA partner or sponsor,
  (2) put the logo file they give you in `client/public/partners/` (names listed in the README there),
  (3) in Prisma Studio, open `partners`, check `kind` (partner or sponsor) and `websiteUrl`, and set `isPublished` to `true`.
  Showing an organisation's logo without its agreement suggests an endorsement that does not exist and can break
  its brand rules. The "Become a partner" invitation always shows.

**News & guides** are in the `posts` table. `contentHtml` holds the article text as simple HTML
(`<p>`, `<h3>`, `<ul><li>`, `<strong>`). `category` is `news`, `guide` or `story`. Setting `publishedAt`
to a future date schedules the article.

**Email sign-ups** from the "Get scholarship alerts" box are saved in the `subscribers` table.
Sending the alert emails comes in a later phase.

**Contact email and social media links** are in `client/src/config/site.js`.

**Impact goals** (the big numbers such as 20K+) are in `IMPACT` in `client/src/config/site.js`. The page presents them as goals for the year you set. The live numbers underneath come from the database automatically. Social icons appear in the
footer only when you add a URL.

## 5. Troubleshooting

| Problem | Fix |
|---|---|
| `Can't reach database server` | Start the PostgreSQL service (Windows: Services → postgresql → Start). Check `DATABASE_URL`. |
| `password authentication failed` | Wrong password in `DATABASE_URL`. |
| `Missing JWT_SECRET` | You did not fill in `JWT_SECRET` in `server/.env`. |
| Client shows "We could not reach INUKA" | The server is not running. Start it with `npm run dev` in `server/`. |
| Port 3000 or 5173 already in use | Close the other program, or change `PORT` in `.env` and the proxy in `client/vite.config.js`. |

## 6. Project structure

```
inuka/
├── server/
│   ├── prisma/schema.prisma      # Full database schema (spec §17) — 24 tables
│   ├── prisma/migrations/        # SQL migrations
│   ├── prisma/seed.js            # Seed script
│   ├── seed/                     # courses.json (9 courses, 72 lessons), badges.json (17), scholarships.json (20)
│   ├── src/routes/               # auth, learning, scholarships, documents, account, public
│   ├── src/middleware/           # JWT auth, roles, rate limit, upload validation, errors
│   ├── src/services/             # email (SendGrid), file storage
│   ├── src/utils/                # streaks, badges, tokens, notifications
│   └── index.js
└── client/
    └── src/
        ├── pages/                # Landing, Login, Register, Dashboard, Courses, LessonPage, Scholarships, MyLearning, Profile…
        ├── components/           # layout, ui, courses, scholarships
        ├── context/AuthContext.jsx
        └── services/api.js       # Axios + automatic token refresh
```

## 7. Build status by spec section

| Spec section | Status |
|---|---|
| §4 Auth (student + mentor registration, login, email verification, password reset, rate limiting, refresh tokens) | ✅ Done (Google sign-in: Phase 2) |
| §5 Landing page | ✅ Hero slideshow, programme strip, mission, who it's for, how it works, **our impact** (goals + live numbers), **INUKA AI** preview, testimonials, team, partners, FAQ, email alerts. Tips and news have their own data ready for their future pages (`/news` already works). |
| Public pages for visitors | ✅ `/learn` (course catalogue with every lesson), `/opportunities` (scholarship search; saving and applying ask the visitor to sign in, then open that scholarship), `/news`. Navbar: Courses, Opportunities, INUKA AI, News, About ▾ (edit in `NAV_ITEMS` in `client/src/config/site.js`). |
| §6 Student dashboard | ✅ Done |
| §7–8 Courses, lessons, quizzes (60% pass mark), lesson locking, listen-aloud audio | ✅ Done — 5 lessons have full content; the other 67 have titles and need content |
| §9 My Learning (tracks, streak heatmap, badges, certificates) | ✅ Done (weekly bar chart and quiz history table: Phase 2) |
| §10 Scholarships: search, filters, save, detail, **Document Checklist modal**, application tracker | ✅ Done |
| §14 Profile + Document Vault | ✅ Done (local disk storage; S3 in Phase 4) |
| §15 In-app notifications | ✅ Done (email reminders: Phase 4) |
| §17 Database schema | ✅ All tables |
| §12 Mentorship | ⏳ Phase 2 (tables ready) |
| §13 INUKA AI chatbot | ⏳ Phase 3 (table ready) |
| §16 Admin dashboard | ⏳ Phase 3 (use Prisma Studio meanwhile) |
| §11 University directory, §19.4 PWA/offline, i18n (French) | ⏳ Phase 4 |

## 8. Before launch: verify the scholarship data

The 20 seed scholarships use each programme's **official website**, but deadlines are **estimates from past
cycles** (each one is labelled that way in the app). Programmes change every year. Before real students use
INUKA, check each entry in `server/seed/scholarships.json` against the official page — especially:

- **Deadlines** (all estimated) and **apply URLs** (several point to the organisation's home page).
- **Refugee eligibility** for Chevening, Commonwealth, Fulbright and the Rwanda Government Scholarship — the
  spec marks them "Yes", but each has citizenship rules that may exclude some refugees.
- Spec entry #20 "Nelson Mandela Scholarship (NMF)" was seeded as the **Mandela Rhodes Scholarship**, the
  real postgraduate programme for young Africans. Change it if you meant a different programme.

## 9. Changes from the specification (and why)

- **Access tokens last 15 minutes** (not 7 days); a 7-day refresh token in a secure httpOnly cookie keeps
  students signed in. Same experience for students, much safer if a token leaks.
- **Prisma uses the Rust-free client** (`engineType = "client"` + `@prisma/adapter-pg`): smaller install and
  fewer platform problems on Windows.
- **Certificates** download as PDF through the browser's "Save as PDF" (works on every phone and computer
  with no server library). A server-generated PDF can come later if you need one.
- The vault adds a **Passport-size Photograph** slot, because the Apply checklist (spec §10.2) asks for it.

## 10. Brand files

- `brand/inuka-logo-original.png`: the official logo as supplied.
- `brand/inuka-logo-transparent-master.png`: the same logo, trimmed, with a transparent background (for print, social media and documents).
- `client/public/brand/`: web versions used by the site (colour and white versions, with and without the tagline, plus the icon), in WebP with PNG fallback.
- `client/public/favicon-*.png`, `apple-touch-icon.png`: browser tab and phone home-screen icons.

Contact details, address and social media links are in `client/src/config/site.js`.

