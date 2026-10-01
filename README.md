# INUKA — Rise. Learn. Succeed.

A free learning and scholarship platform for African high school graduates and refugees.
Built from the *INUKA Full Project Specification* by Olivier Ishimwe.

**Stack:** React 19 + Vite + Tailwind CSS 4 (frontend) · Node.js + Express 5 (backend) · PostgreSQL + Prisma 6

---

## 1. What you need

- **Node.js 22 LTS** (or at least 20.19). Check with `node -v`.
- **PostgreSQL** running, with an empty database called `inuka` (you already have this).

## 2. First-time setup

Open a terminal in the `Inuka` folder. It has two folders: `backend` (the API and database) and `frontend` (the website).

### Backend

```bash
cd backend
copy .env.example .env        # Windows   (Mac/Linux: cp .env.example .env)
```

Open `backend/.env` and fill in two things:

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

### Frontend (in a second terminal)

```bash
cd frontend
npm install
npm run dev          # opens on http://localhost:5173
```

## 3. Try it

1. Open http://localhost:5173 and click **Get started**.
2. Register as a student. Email is not sent in development — the confirmation link is shown on the screen
   **and** printed in the backend terminal. Click it.
3. Start **Reading & Comprehension → Lesson 1**, pass the quiz, mark it complete → you earn 🌱 First Step.
4. Go to **Profile → Documents vault** and upload your ID (PDF/JPG/PNG).
5. Go to **Scholarships**, click **Apply now** → the Document Checklist shows your ID ticked ✅.

### The three dashboards and test accounts

INUKA has one dashboard per role. After signing in, each person goes to their own. All test accounts use the
password `ChangeMe123`. The student and mentor accounts are created by `npm run db:seed` in development only
(not when `NODE_ENV=production`).

| Role | Test account | What they can do |
|---|---|---|
| **Student** | `student@inuka.app` | Courses and progress, scholarships (save, apply, document checklist), documents vault, **book mentors** (`/mentorship`), rate sessions and read mentor notes, **INUKA AI** chat (`/ai` and the bubble at the bottom right) |
| **Mentor** | `mentor@inuka.app` | Dashboard with new requests (**accept or decline**, with a message), upcoming sessions with the video link and Join button, **Sessions** page (calendar, history, ratings, **session notes**, "Mark as done"), **My profile** (bio, expertise, languages, photo, **weekly availability**) |
| **Admin** | `admin@inuka.app` | Overview (growth chart, active users, popular courses, most bookmarked scholarships), **Users** (**add accounts** for students, mentors or admins, search, edit, suspend, delete), **Mentors** (approve, or send back with feedback), **Courses** (**new courses**, delete courses, add/reorder/edit lessons and quiz questions), **Scholarships** (add, edit, hide, hide all expired, refugee flag), **Website content** (add, edit and delete news & guides, testimonials, team, partners, FAQ and tips; email subscribers with CSV download), **Analytics** (finish rates, drop-off lessons, AI question themes), **Announcements** (to all students, refugees, one country, mentors or everyone) |

Every dashboard has a **search bar** at the top (press `/` to jump to it). Results depend on the role.
People cannot open another role's dashboard or its API: they are sent back to their own.
**Change the admin password** in `backend/.env` (`SEED_ADMIN_PASSWORD`) before seeding a real server.

**Try the whole mentorship flow:** sign in as the student → Mentorship → Book a session → sign in as the mentor
(another browser or a private window) → Accept → after the session time, Sessions → Mark as done and Add notes →
back as the student → rate the session; the notes appear in My Learning and the 🤝 First Mentor Session badge is earned.

Useful commands (in the `backend` folder):

| Command | What it does |
|---|---|
| `npm run db:studio` | Opens Prisma Studio — a web UI to browse and edit every table |
| `npm run db:seed` | Re-runs the seed (safe to run again; it updates, not duplicates) |
| `npm run db:migrate` | After you change `schema.prisma`, creates and applies a new migration |
| `npm run db:reset` | ⚠️ Deletes all data and rebuilds the database |

## 4. Editing the home page content

The home page sections (tips, testimonials, news & guides, team, partners & sponsors, FAQ) come from the
database, so you can change them without touching code.

**Easiest way:** in `backend/`, run `npm run db:studio`. Prisma Studio opens in your browser. Choose a table
(`testimonials`, `posts`, `team_members`, `partners`, `tips`, `faq_items`), then add, edit or delete rows.
Refresh the home page to see the change. You can also use pgAdmin.

| Field | Meaning |
|---|---|
| `isSample` | Placeholder content: **hidden automatically in production**. Set it to `false` only for real content. |
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
  (2) put the logo file they give you in `frontend/public/partners/` (names listed in the README there),
  (3) in Prisma Studio, open `partners`, check `kind` (partner or sponsor) and `websiteUrl`, and set `isPublished` to `true`.
  Showing an organisation's logo without its agreement suggests an endorsement that does not exist and can break
  its brand rules. The "Become a partner" invitation always shows.

**News & guides** are in the `posts` table. `contentHtml` holds the article text as simple HTML
(`<p>`, `<h3>`, `<ul><li>`, `<strong>`). `category` is `news`, `guide` or `story`. Setting `publishedAt`
to a future date schedules the article.

**Email sign-ups** from the "Get scholarship alerts" box are saved in the `subscribers` table.
Sending the alert emails comes in a later phase.

**Course skill tags** (used by the "Skills you will build" filter on `/learn`) are in the `skills` column of the `courses` table. Edit them in Prisma Studio.

**Contact email and social media links** are in `frontend/src/config/site.js`.

**Impact goals** (the big numbers such as 20K+) are in `IMPACT` in `frontend/src/config/site.js`. The page presents them as goals for the year you set. The live numbers underneath come from the database automatically. Social icons appear in the
footer only when you add a URL.

## 5. Troubleshooting

| Problem | Fix |
|---|---|
| `Can't reach database server` | Start the PostgreSQL service (Windows: Services → postgresql → Start). Check `DATABASE_URL`. |
| `password authentication failed` | Wrong password in `DATABASE_URL`. |
| `Missing JWT_SECRET` | You did not fill in `JWT_SECRET` in `backend/.env`. |
| The website shows "We could not reach INUKA" | The backend is not running. Start it with `npm run dev` in `backend/`. |
| Port 3000 or 5173 already in use | Close the other program, or change `PORT` in `.env` and the proxy in `frontend/vite.config.js`. |

## 6. Project structure

```
Inuka/
├── backend/                      # API + database (Node.js, Express, Prisma)
│   ├── prisma/schema.prisma      # Full database schema (spec §17), 24 tables
│   ├── prisma/migrations/        # SQL migrations
│   ├── prisma/seed.js            # Seed script
│   ├── seed/                     # courses.json (9 courses, 72 lessons), badges.json (17), scholarships.json (20), home.json
│   ├── src/routes/
│   │   ├── public.js             # Public website: courses, scholarships, news, home page content
│   │   ├── auth.js, account.js   # Sign in, sign up, profile, notifications (every role)
│   │   ├── student/              # Student dashboard: learning, scholarships, documents
│   │   ├── mentor/               # Mentor dashboard: /api/mentor/...
│   │   └── admin/                # Admin dashboard: /api/admin/...
│   ├── src/middleware/           # JWT auth, roles, rate limit, upload validation, errors
│   ├── src/services/             # email (SendGrid), file storage, scholarship search
│   ├── src/utils/                # streaks, badges, tokens, notifications
│   ├── uploads/                  # uploaded documents (development)
│   ├── .env                      # your settings (copy from .env.example)
│   └── index.js
└── frontend/                     # Website (React, Vite, Tailwind)
    ├── public/                   # favicon, partner logos
    └── src/
        ├── pages/
        │   ├── public/           # Landing, Learn (/learn), Opportunities (/opportunities), News
        │   ├── auth/             # Login, Register, verify email, reset password
        │   ├── student/          # StudentDashboard, Courses, CourseDetail, LessonPage, Scholarships, MyLearning, Certificate, Profile
        │   ├── mentor/           # MentorDashboard
        │   ├── admin/            # AdminDashboard
        │   └── shared/           # "Coming soon" and "Page not found"
        ├── components/           # layout, ui, landing, filters, courses, scholarships
        ├── config/roles.js       # Each role's home page and sidebar links
        ├── config/site.js        # Contact, social links, navbar, impact goals
        ├── context/AuthContext.jsx
        └── services/api.js       # Axios + automatic token refresh
```

To add a page to a dashboard: create it in that role's folder (for example `pages/mentor/Sessions.jsx`),
add its route in the matching block of `frontend/src/App.jsx`, and add a sidebar link in `config/roles.js`.

## 7. Build status by spec section

| Spec section | Status |
|---|---|
| §4 Auth | ✅ Done: two-step student sign-up (all 4.2 fields, optional profile photo), mentor sign-up (title, organisation, expertise, 300-word bio, LinkedIn, languages, weekly availability calendar, required photo, Pending until an admin approves), Sign in / Sign up with Google (see section 12), Student login / Mentor login toggle, forgot password by email, email verification, rate limiting, refresh tokens, each role sent to its own dashboard |
| §5 Landing page | ✅ Hero slideshow, mission, who it's for, how it works, **our impact** (goals + live numbers), testimonials, team, partners, FAQ, email alerts. Tips and news have their own data ready for their future pages (`/news` already works). |
| Public pages for visitors | ✅ `/learn` and `/opportunities` each have a blue hero (search box and a slider of real courses or featured scholarships) and professional filters: a sidebar with counts next to every option, removable filter chips, sorting, a slide-up filter sheet on phones, and filters saved in the page address so a search can be shared. Scholarship filters: refugee eligibility, funding, study level, deadline, what it covers, region, study destination, language. Course filters: subject, level, skills, length, and (when signed in) my progress. `/news` also public. Navbar: Courses, Opportunities, News, About ▾ (edit `NAV_ITEMS` in `frontend/src/config/site.js`). |
| §6 Student dashboard | ✅ Done: collapsible sidebar (remembered on the device) with all 8 links including `/logout`, bottom tabs on phones; welcome banner with date and a daily quote from 100 (`frontend/src/utils/quotes.js`); progress bar; Continue Learning card with thumbnail; English and Computer levels calculated from quiz scores; scholarship card; mentorship card with the next session and a Join button that opens 15 minutes before; streak, latest badge; quick actions |
| §7–8 Courses, lessons, quizzes (60% pass mark), lesson locking, listen-aloud audio | ✅ Done — 5 lessons have full content; the other 67 have titles and need content |
| §9 My Learning (tracks, streak heatmap, badges, certificates) | ✅ Done (weekly bar chart and quiz history table: Phase 2) |
| §10 Scholarships: search, filters, save, detail, **Document Checklist modal**, application tracker | ✅ Done |
| §14 Profile + Document Vault | ✅ Done (local disk storage; S3 in Phase 4) |
| §15 In-app notifications | ✅ Done (email reminders: Phase 4) |
| §17 Database schema | ✅ All tables |
| §12 Mentorship | ✅ Done: mentor directory with filters, ratings and "Available this week"; booking (topic, real free times for 14 days in the student's time zone, 200-word message); accept/decline with message; video link; Join button from 15 minutes before; cancel; mark as done; session notes (shown in My Learning); 1–5 star reviews; First Mentor Session badge; emails and notifications for every step; mentor calendar, history and availability editing |
| §13 INUKA AI chatbot | ✅ Done: full page `/ai` with saved conversations, floating bubble on every student page, greeting and the 5 quick-start buttons, the hardcoded system prompt from §13.5, 30 messages per student per hour. Needs an API key (see section 15) |
| §16 Admin dashboard | ✅ Done: overview (§16.1) and every capability in §16.2: users, mentor approval with feedback, course/lesson/quiz editor, scholarship listings, analytics with drop-off points, anonymised AI query themes, announcements |
| §11 University directory, §19.4 PWA/offline, i18n (French) | ⏳ Phase 4 |

## 8. Before launch: verify the scholarship data

The 20 seed scholarships use each programme's **official website**, but deadlines are **estimates from past
cycles** (each one is labelled that way in the app). Programmes change every year. Before real students use
INUKA, check each entry in `backend/seed/scholarships.json` against the official page — especially:

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

## 10. Logo

The site currently shows a text wordmark ("INUKA") while a new logo is being designed. It lives in one component,
`frontend/src/components/layout/Logo.jsx`, used by the navbar, app sidebar, sign-in pages, footer and certificates.
When the new logo is ready, put the files in `frontend/public/` and replace the text in that component with an image.
The browser tab icon is `frontend/public/favicon.svg` (and `apple-touch-icon.png` for phone home screens).

## 11. Colours

INUKA uses an all-blue palette: azure primary, deep blue backgrounds and sky-blue highlights. There is no green
and no yellow anywhere on the site. All colours are defined once, in the `@theme` block at the top of
`frontend/src/index.css`. Change a value there and the whole site follows.

| Token | Colour | Used for |
|---|---|---|
| `brand` | `#0A6CF0` azure | Main buttons, links, headings, active states |
| `brand-dark` | `#0056CC` | Hover and pressed states |
| `brand-deep` | `#0A3D91` deep blue | Page heroes, app sidebar, impact band |
| `brand-soft` | `#E8F1FE` pale blue | Card and chip backgrounds, info boxes |
| `cyan` / `sky` | `#0891B2` / `#00B4F0` | Secondary accents (icons, Computer Skills track, glows) |
| `accent` | `#00B4F0` sky blue | Highlights, goal numbers, progress bars |
| `accent-dark` | `#0369A1` | Sky-blue text on light backgrounds |
| `paper` / `ink` | `#F5F9FF` / `#0F1E3D` | Page background / body text |
| `success` | `#0284C7` | Completed lessons and ticks |

The home page hero is pure white. Buttons on blue backgrounds are white.
Deadline badges: red under 30 days, blue 30 to 90 days, light blue over 90 days.
The illustrations use the same colours, set at the top of `HeroSlides.jsx`, `PageSlides.jsx` and `MissionSection.jsx`.

## 12. Sign in with Google (optional)

The Google button appears on the sign-in and sign-up pages only when it is set up:

1. Go to https://console.cloud.google.com → create a project (for example "INUKA").
2. **APIs & Services → OAuth consent screen**: choose External, fill in the app name (INUKA) and your email, and save.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID** → type **Web application**.
   Under **Authorised JavaScript origins** add `http://localhost:5173` (and later your real website address).
4. Copy the **Client ID** (it ends in `.apps.googleusercontent.com`) into `backend/.env`:
   `GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com`
5. Restart the backend. The Google button now shows.

People who sign up with Google become **students**, skip the form, and are asked on their dashboard to finish
their profile (countries, education, language). Mentors always use the mentor form, because they need a photo,
bio and weekly times. Someone who already has an account with the same email can also sign in with Google.

## 13. Terms of Use and Privacy Policy

The sign-up checkbox links to `/terms` and `/privacy`. The text is in `frontend/src/pages/public/Legal.jsx`,
written in plain language to match how INUKA works today. **Before launch, have both pages reviewed by a lawyer**
who knows the data protection law of the countries you serve (in Rwanda: Law No. 058/2021 on the protection of
personal data and privacy), and update them whenever INUKA starts collecting something new.

## 14. Profile photos

Students can add a photo when they sign up or later in **Profile**; mentors must add one. Photos are JPG, PNG or
WebP up to 3 MB, saved in `backend/uploads/photos/` with random names, and shown at `/api/public/photos/…`
(mentor photos have to be visible to students). Documents in the vault stay private.

## 15. INUKA AI: switch it on (free options)

INUKA AI works with free and paid AI services. Without one, the chat says it is not switched on yet and points
students to mentors. Choose in `backend/.env`, then restart the backend:

| `AI_PROVIDER` | Cost | How to get started | Notes |
|---|---|---|---|
| `gemini` (recommended to start) | **Free tier** | Get a key at https://aistudio.google.com/apikey and put it in `AI_API_KEY` | Good quality, understands French and Swahili too. On the free tier, Google may use the conversations to improve its products (the Privacy Policy says so). Free tier has daily limits. |
| `groq` | **Free tier** | Key at https://console.groq.com/keys | Very fast Llama models. Free tier has per-minute and daily limits. |
| `ollama` | **Completely free and private** | Install https://ollama.com, run `ollama pull llama3.2`, leave `AI_API_KEY` empty | Runs on your own computer or server, so nothing leaves it. Needs a reasonably strong machine (8 GB RAM or more) and answers more slowly. |
| `openai` | Paid | Key at https://platform.openai.com | GPT-4o, as written in the spec. |
| `anthropic` | Paid | Key at https://console.anthropic.com | Claude. |

Example for the free Gemini tier:

```
AI_PROVIDER=gemini
AI_API_KEY=your-key-from-aistudio
```

`AI_MODEL` changes the model (defaults: `gemini-3.5-flash`, `llama-3.3-70b-versatile`, `llama3.2`, `gpt-4o`,
`claude-haiku-4-5-20251001`). Free tiers and model names change from time to time; if the chat shows
"INUKA AI could not answer", the backend terminal prints the reason (for example a renamed model or a used-up
daily limit).

The system prompt from spec §13.5 is in `backend/src/services/aiService.js` and is sent with every message,
together with the student's first name, country, education level and the list of INUKA courses (so it can
recommend one). Conversations are saved in `chat_messages`; admins only see topic counts, never anyone's
messages. Each student can send 30 messages per hour.

## 16. Emails for mentorship

Booking requests, confirmations, declines and cancellations are emailed to the student and the mentor through
SendGrid (printed in the backend terminal while `SENDGRID_API_KEY` is empty). Times in emails use
`APP_TIMEZONE` (default `Africa/Kigali`); on the website everyone sees times in their own time zone.

## 17. Light and dark mode

Every page has a sun / moon button (top right) to switch between light and dark mode. The first time, INUKA
follows the device setting; after someone clicks the button, their choice is remembered on that device.

The colours are set in `frontend/src/index.css`: light colours in the `@theme` block, dark colours under
`[data-theme=dark]`. Cards and panels use the `bg-surface` colour (white in light mode, dark blue-grey in dark
mode); use it instead of `bg-white` in new pages so they work in both modes. For anything special in dark mode,
Tailwind's `dark:` prefix works, for example `dark:bg-black`.

## 18. Accounts created by an admin

In **Users → Add account**, an admin can create a student, mentor or admin. Nobody types a password for them:
the person receives an email with a link to choose their own password (valid 3 days). In development, without
SendGrid, the link is shown on the screen instead. Mentors created this way are approved straight away and add
their photo and weekly availability after signing in.

## 19. Writing content: the text editor

Everywhere admins write longer content there is a text editor with a toolbar, like a word processor: lessons,
News & guides articles and FAQ answers.

- Text style (paragraph, heading 1–3), font, font size
- **Bold**, *italic*, underline, strikethrough, text colour and highlight (12 colours plus any colour you choose)
- Alignment (left, centre, right, justify), bullet and numbered lists, quotes, divider line
- Links, **images** (upload from your computer, JPG/PNG/WebP/GIF up to 5 MB, or paste a link) and **YouTube videos**
- Undo / redo, clear formatting, word count, and "Edit HTML" for advanced changes

Uploaded images are saved in `backend/uploads/media/` and shown at `/api/public/media/…`. Before anything is shown
on the website it is cleaned (`frontend/src/utils/sanitize.js`): formatting, images and YouTube videos stay,
anything unsafe (scripts, other websites' frames) is removed. Short fields that appear on cards (titles,
summaries, descriptions) stay plain text on purpose, so cards look tidy.

Tip for dark mode: leave text on "Default" colour unless you really need a colour; a very dark colour chosen for
light mode can be hard to read in dark mode.

## 20. Sign in and sign up

`/login` and `/register` are one card with two halves. On a computer, the blue panel slides across when someone
switches between "Sign in" and "Create account"; on a phone, one form shows at a time with a blue banner and a
button to switch. The code is in `frontend/src/pages/auth/AuthPage.jsx` (the card), `Login.jsx` and
`Register.jsx` (the forms) and `AuthShell.jsx` (the blue panel, also used by the forgot/reset password pages).

