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
Alert emails go out automatically when an admin adds a new scholarship or publishes a guide/news article (see section 36).

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
│   ├── src/services/             # email (Nodemailer), reminders, alerts, file storage (disk/S3), AI, scholarship search
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
| §9 My Learning (tracks, streak heatmap, badges, certificates, weekly bar chart, quiz history) | ✅ Done |
| §10 Scholarships: search, filters, save, detail, **Document Checklist modal**, application tracker | ✅ Done |
| §14 Profile + Document Vault | ✅ Done (local disk or Amazon S3: `STORAGE_DRIVER`) |
| §15 Notifications | ✅ Done: in-app + email (Nodemailer), deadline and session reminders, announcements by email, scholarship alerts |
| §17 Database schema | ✅ All tables |
| §12 Mentorship | ✅ Done: mentor directory with filters, ratings and "Available this week"; booking (topic, real free times for 14 days in the student's time zone, 200-word message); accept/decline with message; video link; Join button from 15 minutes before; cancel; mark as done; session notes (shown in My Learning); 1–5 star reviews; First Mentor Session badge; emails and notifications for every step; mentor calendar, history and availability editing |
| §13 INUKA AI chatbot | ✅ Done: full page `/ai` with saved conversations, floating bubble on every student page, greeting and the 5 quick-start buttons, the hardcoded system prompt from §13.5, 30 messages per student per hour. Needs an API key (see section 15) |
| §16 Admin dashboard | ✅ Done: overview (§16.1) and every capability in §16.2: users, mentor approval with feedback, course/lesson/quiz editor, scholarship listings, analytics with drop-off points, anonymised AI query themes, announcements |
| §19.4 PWA / offline | ✅ Done: installable app, lessons readable offline |
| §11 University directory, i18n (French) | ⏳ Not built yet |

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
The home page uses real photos of young Africans instead of illustrations (see section 22).

## 12. Sign in with Google ("Sign up with Google")

The sign-in page has **Sign in with Google** and the sign-up page has **Sign up with Google** (spec 4.2 and 4.4).
Google's own page opens, the person picks their Google account, and comes back signed in. Until you set it up,
the button shows a short "not switched on yet" note while developing, and is hidden on the live website.

1. Go to https://console.cloud.google.com → create a project (for example "INUKA").
2. **APIs & Services → OAuth consent screen**: choose External, fill in the app name (INUKA) and your email, and save.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID** → type **Web application**.
4. Under **Authorised redirect URIs** add exactly:
   `http://localhost:5173/api/auth/google/callback`
   (later also `https://your-website/api/auth/google/callback`).
5. Copy the **Client ID** and **Client secret** into `backend/.env`:
   ```
   GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-secret
   ```
   The redirect address is built from `FRONTEND_URL`. If your backend is on a different address, set
   `GOOGLE_REDIRECT_URI` to the full callback address instead (it must match the one in Google exactly).
6. Restart the backend. The Google button now works.

People who sign up with Google become **students**, skip the form (name, email and photo come from Google), and are
asked on their dashboard to finish their profile (countries, education, language). Mentors always use the mentor form,
because they need a photo, bio and weekly times. Someone who already has an account with the same email can also
sign in with Google. If something goes wrong (cancelled, email not verified, account suspended), the sign-in page says so.

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
Nodemailer (printed in the backend terminal while `SMTP_USER`/`SMTP_PASS` are empty). Times in emails use
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
email set up (SMTP), the link is shown on the screen instead. Mentors created this way are approved straight away and add
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

## 21. Admin: create pages, editor everywhere, "Are you sure?"

- **Create and edit on full pages, not pop-ups.** New course (`/admin/courses/new`), add lesson
  (`/admin/courses/<id>/lessons/new`), add or edit an account (`/admin/users/new`, `/admin/users/<id>`), scholarships,
  and all website content (`/admin/content/<type>/new`, e.g. testimonials, team, partners, FAQ, tips, articles).
  Each page has a "← Back" link and a Save / Cancel bar that stays at the bottom of the screen.
- **The text editor is on every text field that needs formatting**: course descriptions, lesson summaries and
  content, scholarship descriptions, announcements (with a 400-character counter), article summaries and full
  articles, testimonials, team bios, partner descriptions, tips and FAQ answers. Short fields get the compact
  editor (bold, italic, underline, colour, highlight, lists, links); long content gets the full one (headings,
  fonts, sizes, images, YouTube videos). Lists like "Who can apply" stay one item per line, because they feed
  the filters.
- **"Are you sure?" before every important action**, in an INUKA-styled box (not the browser's grey box):
  deleting a course, lesson, quiz question, scholarship, account, website item or subscriber; hiding a scholarship
  or all expired ones; approving a mentor; sending an announcement ("Send to 120 people?"); suspending an account;
  a mentor marking a session as done; a student cancelling a session or deleting an AI conversation.
  Dangerous actions have a red button. After each action a short message appears at the top ("Course saved.",
  "Lesson deleted.").

## 22. Home page photos

The home page now uses **real photos of young Africans** instead of illustrations:

- **Hero**: three wide photos fade slowly from one to the next behind the text (it pauses when the mouse is over it,
  and stays still for people who turn off animations). A dark navy shade on the left keeps the text easy to read.
- **Mission section**: a large photo with a small photo on its corner.

The hero is kept simple, like the reference design: menu, photo, heading, short text and two buttons.
Under it, a navy panel overlaps the bottom of the photo: "One place to learn, apply and grow" with coloured cards
(Courses, Lessons, Scholarships, Open to refugees, Mentors, INUKA AI, Certificates) showing live numbers. Arrows (or a
swipe on phones) slide the cards; each card opens the matching page. The Mentors card shows the number of approved
mentors once there are 10 or more, and "Free" before that. Edit the cards in `components/landing/PlatformPanel.jsx`.

**Fonts** (free Google Fonts, loaded in `index.html`), like the Edubin reference: *Roboto* bold for headings, *Open Sans* for text, buttons and links (regular weight, soft grey paragraphs, line height 1.7).

All photos are listed in **`frontend/src/config/photos.js`**. The current ones are free photos from Unsplash
(Lagos, Kumasi, Nairobi and others), loaded straight from Unsplash, so they need an internet connection.
If a photo cannot load, the hero shows plain dark navy and still looks fine.

**Before launch, use your own photos** of INUKA students and mentors, with their written permission:
put the files in `frontend/public/photos/` and change `src` in `photos.js` to e.g. `'/photos/hero-1.jpg'`.
Wide photos (at least 1920 px wide, person on the right side) work best for the hero; tall photos for the mission
section. Update `alt` (what the photo shows) and `credit` too. Keep each photo under about 400 KB so the page loads
fast on phones (for example, export as JPG at quality 75).

## 23. Colours and logo

**Main colours**: white backgrounds and **dark blue** `#07294D` (menu text, headings, panels, footer, sidebar).
**Accent colours**, used where they help, like the Edubin reference:
- **Yellow** `#FFC600`: the main call-to-action button in the hero, the "Free" badges, subject badges, small labels
  above headings, progress bars and the back-to-top ring.
- **Green** `#2E9E5B`: success ticks, "completed", Computer skills.
- **Coral red** `#E5533D` and **blue** `#2F6FEB`: coloured tiles (e.g. the cards under the hero, course pictures).
- Red `#DC2626` stays for errors and alerts.
All colours are set once at the top of `frontend/src/index.css` (`@theme`).

**Logo**: the INUKA "i" mark (a rounded square with a tall bar and a dot), dark blue with a white bar and a soft
blue dot, next to the INUKA wordmark. It is in `frontend/src/components/layout/Logo.jsx`; the browser tab icon is
`frontend/public/favicon.svg` and the phone icon is `frontend/public/apple-touch-icon.png`.

**Home page sections** (ideas taken from the reference, not copied): hero with a yellow "Get started" and a white
"Explore courses" button → navy panel with coloured cards → About INUKA → **Featured courses** (cards with a coloured
picture area, yellow subject badge and a round yellow "Free" badge) → Who it's for → How it works → impact, stories,
team, partners, FAQ. Each section heading has a small label above it with a yellow line (e.g. "OUR COURSES").

**Buttons, cards, links, footer** (reference style):
- Buttons have small square corners. The main button is yellow with dark blue text (`<Button>`); `variant="dark"`
  gives a dark blue button, `variant="outline"` a dark blue outline that fills on hover.
- Cards have small corners (6 px), a thin border and a very light shadow.
- Menu links are medium weight (not bold) and turn yellow on hover; the current page is yellow too.
  Dashboard sidebar links also turn yellow on hover.
- Footer: four columns (INUKA + short text, Company, Information, Contact us with **Phone:** / **Email:** and yellow
  social icons), white text that turns yellow on hover, and a darker bottom bar with © and Terms | Privacy | FAQs.

## 24. Query form, FAQ and team

- **Join INUKA + "Get scholarship alerts"** (just above the footer, white background): on the left the invitation and
  "Create your free account"; on the right a short form with **email**, an optional **message**, a tick box
  "Also email me when new scholarships and guides are added", and **Submit**. Ticked → the email joins the scholarship
  alerts list (Website content → Email subscribers). A message → saved in **Admin → Website content → Messages**
  (reply by email in one click, mark as read, delete), and emailed to `CONTACT_EMAIL` in `backend/.env` if set.
  The person must tick the box or write a message. A hidden field and a limit of 5 sends per hour stop spam.
  **Run `npx prisma migrate deploy` once** to create the `contact_messages` table.
- **FAQ**: questions on the left (click to open), a photo on the right (set in `frontend/src/config/photos.js`,
  `FAQ_PHOTO`). "Send it to us" jumps to the query form.
- **Our team**: photo cards with a white name box on top, sliding one card at a time (arrows, or automatically every
  few seconds; it pauses when the mouse is over it; no scroll bar). Add each person's own photo in
  Admin → Website content → Team (photo link). People without a photo show their initials on dark blue.
  The three "Sample team member" placeholders have free Unsplash photos of young Africans (Accra, Ghana; Zaria,
  Nigeria; Kumasi, Ghana) and are hidden in production. **Real team members are never given a stranger's photo.**
  Run `npm run db:seed` to add the sample photos to an existing database.

## 25. Team hover, testimonials and goals band

- **Team cards**: hover a card (or tap on a phone) and the name turns yellow and the social icons slide in
  (Facebook, X, LinkedIn, Instagram). Add each person's links in **Admin → Website content → Team**; only the icons
  with a link are shown. Placeholder "Sample team member" cards show all four icons so you can see the design.
  **Run `npx prisma migrate deploy`** once (new columns `facebook_url`, `x_url`, `instagram_url`).
- **Photos for placeholders**: sample team members and sample testimonials now always show a stock photo of a young
  African, even if the database has no photo yet (list in `frontend/src/config/photos.js`, `SAMPLE_PHOTOS`).
  Real people always need their own photo, added in the admin with their permission.
- **Testimonials**: one story at a time — a round photo with soft circles behind it, the quote in italics, then the
  name and role. Arrows on the sides (below on phones); it moves on by itself every 7 seconds and pauses on hover.
- **Goals band** ("Where INUKA is going"): a photo of graduates under a dark blue shade, four big white numbers that
  count up, a short yellow line under each, and a bold white label. Numbers are set in `frontend/src/config/site.js`
  (`IMPACT`); the photo in `photos.js` (`STATS_PHOTO`).

## 26. Partner logos, story dots, panel cards

- **Partners & sponsors**: logos slide one by one (5 visible on a computer, 3 on a tablet, 2 on a phone), in full
  colour, endlessly, pausing when the mouse is over them. Logo files are in `frontend/public/partners/`
  (ALU, MINEMA, Mastercard Foundation, Red Cross, Save the Children, World Vision, Inkomoko and UNICEF are added;
  MINEDUC, REMA and Alight still need their files and show their name meanwhile).
  **On the live website a partner only appears after you publish it**: Admin → Website content → Partners →
  open it → tick "Show on the website". Publish each one only once that organisation has agreed to be listed.
  While developing, all partners are shown so you can preview the logos.
- **Testimonials**: small dots under the story show how many stories there are; the current one is a longer yellow
  dot. Click a dot to jump to that story.
- **Cards under the hero** ("One place to learn, apply and grow"): white cards with a coloured icon, a dark blue
  number and a grey label.

## 27. Who INUKA is for, team hover

- **Who INUKA is for**: each card has a photo across the top (it zooms in slowly on hover), then the title, a short
  description and a full-width button ("Start for free" / "Become a mentor"). Photos are in
  `frontend/src/config/photos.js` (`AUDIENCE_PHOTOS`).
- **Team cards**: the white name box is narrower (centred, about three quarters of the card). On hover the photo
  zooms in with a slight tilt and darkens a little, the name turns yellow and the social icons appear.
- The dark "Support INUKA" box under the partner logos was removed. The "Become a partner" email is still reachable
  from the contact details in the footer.

## 28. INUKA logo and sign-in card

- **Logo**: the INUKA logo (open book, growing sprout, rising sun) recoloured to the site colours: dark blue book and
  letters, yellow sun, green leaves. Files in `frontend/public/brand/`:
  `inuka-logo.png` (menu), `inuka-logo-tagline.png` (with "Rise. Learn. Succeed."), `inuka-mark.png` (symbol only),
  and `-white` versions of each for dark backgrounds (footer, dashboard sidebar, dark mode).
  The browser tab icon is `frontend/public/favicon.png`, the phone icon `apple-touch-icon.png`.
  To change the logo later, replace these files (keep the names) — `components/layout/Logo.jsx` uses them everywhere.
- **Sign in / sign up card**: much shorter. The blue side shows one plain white icon that matches the form (no
  circles, dots or badges): a sign-in icon on the sign-in page, an add-person icon on the sign-up page, and a
  heart-handshake for mentors (`components/auth/AuthArt.jsx`).
  Smaller headings and text, password and confirm side by side.


## 29. Course pictures

Every course card (home page "Featured courses", the Courses page, the student "My courses" page and the dashboard's
"Continue learning" box) now has a photo that matches the course:

| Course | Photo |
|---|---|
| Reading & Comprehension | Young man reading a book on a library floor (Makmot Robin) |
| Writing: Sentences & Paragraphs | Young woman writing in a notebook (Iwaria Inc.) |
| Essay Composition | Student writing on paper, Accra, Ghana (Kingsley Hemans) |
| Speaking & Pronunciation | Young woman speaking into a microphone, Luanda, Angola (Emmanuel Zua) |
| Writing for Scholarships | Young woman writing on her laptop (Iwaria Inc.) |
| Introduction to Computers | Young man at a laptop in a computer class, Lagos (NESA by Makers) |
| Internet & Email Basics | Young man browsing on a laptop, Yaba, Nigeria (NESA by Makers) |
| Digital Tools for Education | Young man using a smartphone, Lagos (Olumide Bamgbelu) |
| Preparing for University Online | College student holding a laptop (Seth Ebenezer Tetteh) |

All are free under the Unsplash License. They are set in `frontend/src/config/photos.js` (`COURSE_PHOTOS`, by course
slug). To use your own picture for a course, paste its link in **Admin → Courses → Thumbnail image link**; that always
wins over these photos. No database change or re-seed is needed.

## 30. Courses page redesign

- **Hero**: the course photos slide (fade) behind the title and search box. The course slider card on the right is gone.
- **Course cards**: white cards (no coloured band) with the course photo, a yellow "Free" badge, the course letter,
  a round subject icon on the photo's edge, subject and level, the title, and a footer with the number of lessons
  and **View details**. Visitors get a details window (description, skills, all lessons, "Start this course for
  free"); signed-in students go straight to the course (or "Continue" / "Review" when they have started it).
- **Grid / List switch** at the top right (next to "Sort by"). The choice is remembered on that device.
- **Page numbers** (1 2 ›) under the cards: 6 courses per page. Change `PER_PAGE` in `pages/public/Learn.jsx`.
- Files: `components/courses/CourseCards.jsx` (cards, switch, page numbers, details) and `PageHero` in
  `components/landing/PublicShell.jsx` (new `photos` option for a sliding photo background).

## 31. Scholarships page hero and navy page buttons

- **Scholarships page hero**: graduation photos of young Africans fade behind the title and search box (set in
  `SCHOLAR_PHOTOS`, `frontend/src/config/photos.js`). The "Featured scholarships" card slider is removed
  (`components/landing/Showcase.jsx` was deleted, nothing uses it any more).
- **Courses page**: the page numbers and the Grid / List switch now use the navy primary colour instead of blue.

## 32. Scholarship cards with photos, Grid / List and page numbers

- **Every scholarship has a photo**: the place where you would study (Big Ben for Chevening, Oxford for
  Commonwealth, Heidelberg for DAAD, Seoul, Beijing, Istanbul, Paris, Tokyo, a US campus, Kigali, UCT, Cape Town,
  Nairobi, Kampala) or young African graduates for programmes across Africa (Mastercard, DAFI, African Union,
  Aga Khan, Intra-Africa, AfDB). Set in `SCHOLARSHIP_PHOTOS` in `frontend/src/config/photos.js`.
- **Your own photo**: Admin → Scholarships → *Card photo link*. New scholarships without one get a photo for their
  country, otherwise a graduation photo. **Database change**: run `npx prisma migrate deploy` in `backend`
  (migration `20261003000000_scholarship_image` adds the `image_url` column).
- **New card**: photo with a **Save** button (bookmark icon) at the top right, country, name and organisation,
  then **Learn more** and **Apply now** side by side, then the deadline and the days left.
  Funding, "Open to refugees", study level and language are shown when you click **Learn more** (the details
  window now also shows the photo). The student "Scholarships" page uses the same card.
- **Grid / List switch** and **page numbers** (1 2 3 ›, 9 per page) on the public Scholarships page. The "Show more"
  button is gone. The switch and page numbers live in `components/ui/ListControls.jsx` (shared with Courses).

## 33. A page for every scholarship

- **`/opportunities/<slug>`** (e.g. `/opportunities/chevening`) replaces the old pop-up window
  (`pages/public/ScholarshipPage.jsx`; `components/scholarships/ScholarshipDetail.jsx` was deleted).
  - Hero with the scholarship's photo, country (yellow), name, organisation, **Apply now** and **Save**.
  - Main column: About, Who can apply and What it covers (green-tick lists), How to apply (numbered steps).
  - Side panel: deadline and days left, then **key facts as a list with icons** (Funding, Refugees, Study level,
    Language, Country, University, Region) instead of coloured tags; Apply now, Save for later, Official website.
  - "Need help applying?" box with a photo and a **Find a mentor** button; "You may also like" cards.
- **Save / Apply**: visitors are asked to sign in and come back to the same page. Signed-in users save right away
  (also from the cards on the Scholarships page, which now show what is already saved). "Apply now" (on the page
  or on a card) opens the document checklist, then the official website.
- "Learn more" everywhere (public page, student Scholarships page, dashboard, the top search) opens this page.
- Cards: the "days left" is plain coloured text (no background). Scholarships page title: the word "and" is yellow.

## 34. White sidebar, status colours, and INUKA AI for everyone (free)

**Dashboard sidebar** (`components/layout/AppLayout.jsx`): white background, grey links, navy on hover. The active
link has a light navy background, navy bold text and a **yellow bar** on the left. "Log out" turns red on hover.

**Status colours** — use the same ones everywhere (tokens in `src/index.css`, each with a `-soft` background and
`-ink` text colour, also in dark mode):

| Colour | Meaning | Examples |
|---|---|---|
| green `success` | done, accepted, active, plenty of time | "Active" users, accepted applications, deadline 30+ days |
| amber `warning` | needs attention soon, waiting | mentors waiting for approval, "Email not confirmed", "Awaiting response", deadline in 14–29 days |
| red `danger` / `urgent` | urgent, error, rejected | suspended, rejected, deadline in under 14 days, errors |
| blue `info` | neutral, in progress | "In progress", "Submitted", information notes |

Use them with `<Pill tone="success|warning|danger|info">`, `<Alert tone="success|warning|error|info">` and
`toast.success / toast.warning / toast.error / toast.info`. "My applications" now shows a coloured status badge and
a coloured left edge per application; the admin dashboard colours "waiting for approval" (amber) and "close within
30 days" (red).

**INUKA AI — chatbot + AI agent, free for everyone**
- **Chat button** (bottom right, yellow "AI" badge) on every public page *and* every dashboard (students, mentors,
  admins). Visitors can use it without an account; their chat stays while they move between pages (this tab only).
  Students keep their saved conversations on the full **INUKA AI** page as before.
- **It is an agent**: instead of guessing, it looks things up on INUKA with tools
  (`backend/src/services/agent.js`): search scholarships (country, level, fully funded, open to refugees, closing
  soon), scholarship details, upcoming deadlines, free courses — and for signed-in students: their course progress,
  saved scholarships, document checklist for a scholarship, mentors, and it can **save a scholarship** when asked.
  Answers include links (e.g. to `/opportunities/chevening`).
- **Always free**:
  - *AI mode*: set a FREE key in `backend/.env` — `AI_PROVIDER=gemini` + key from aistudio.google.com/apikey
    (or `groq`, or `ollama` on your own computer, no key). Restart the backend.
  - *Basic mode*: with no key (or if the AI service is down) the assistant still answers using the same tools and
    simple rules — no outside service, no cost. The chat shows "Free · Basic mode" or "Free · AI answers by …".
- Limits: 40 messages per hour per person (visitors: per internet address), 30 per hour on the student INUKA AI page.
- New API: `GET /api/assistant/status`, `POST /api/assistant/chat` (`backend/src/routes/assistant.js`).

## 35. INUKA AI — checked against the INUKA document (section 13, 18.5 and the course plan)

| Requirement in the document | Where it is |
|---|---|
| Conversational AI for guidance, chatbot 24/7 | Chat bubble on every page + `/ai` page (students). Always on: AI mode or free basic mode. |
| AI calls proxied through the Node.js backend, key protected | All calls go `browser → /api/ai/…, /api/assistant/… → backend → AI service`. Keys only in `backend/.env`. |
| OpenAI GPT-4o, or Amazon Bedrock as alternative | `AI_PROVIDER=openai` (GPT-4o) or **`AI_PROVIDER=bedrock`** (new: uses `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`; default model `amazon.nova-lite-v1:0`, change with `AI_MODEL`). Free options: `gemini`, `groq`, `ollama`. |
| 13.5 System prompt hardcoded, sent with every call | `SYSTEM_PROMPT` in `backend/src/services/aiService.js` (exact text), sent with every call: chat, agent, writing review, speaking practice. |
| 13.2 Floating bubble bottom-right, minimised; full page `/ai` in the sidebar | `components/ai/ChatBubble.jsx`; sidebar "INUKA AI". |
| 13.3 Sprout avatar (animated), header "INUKA AI — Your Learning Guide", greeting, 5 quick-start buttons | Exact wording and buttons in `components/ai/ChatPanel.jsx` / `ChatBubble.jsx`. |
| 13.4 Capabilities (scholarships, essays, documents, grammar, course advice, forms, refugee rights, computer help) | System prompt + agent tools (`services/agent.js`): scholarship search/details/deadlines, **profile matching**, courses, mentors, progress, saved list, document checklist, save. |
| 13.6 Conversations saved per user, scroll back; admin sees only anonymised themes | Saved in `chat_messages`; `/ai` lists them; Admin → Analytics shows theme counts only. |
| 18.5 `POST /api/ai/chat`, `GET /api/ai/history` | Both exist (**`/api/ai/history` is new**: all conversations with messages; `?conversationId=` for one). |
| English Writing L8 "Final Writing Task + AI Feedback" | **New** box in the lesson: paste text → INUKA AI review (score, strengths, what to improve, small fixes, next step). |
| Essays L10 "Full Essay Practice" (400 words + AI feedback) | **New**, same box, checks thesis, paragraphs, PEEL examples, conclusion. |
| Scholarship Writing L8 "Full Draft Review" | **New**, same box, reviews like a scholarship reader (goals, why this scholarship, community, real story). |
| Speaking L4 "Introducing Yourself — practice conversation with AI voice" | **New** speaking partner: INUKA AI asks questions out loud, the student answers with the microphone (or types), gets tips and a model introduction at the end. Uses the browser's free speech features (Chrome/Edge/Android for the microphone). |
| AI-powered scholarship matching from the student profile | **New** `GET /api/scholarships/matches`: scores open scholarships by study level, refugee status, country/region, language, funding and time left, with reasons. Shown as **"Recommended for you"** on the student dashboard, the **"For you"** tab on Scholarships, and used by INUKA AI ("Find a Scholarship"). |

All of this is **free**: with a free AI key (Gemini/Groq/Ollama) you get full AI answers; with no key INUKA uses its
built-in basic mode — the writing checker (spelling, capital letters, sentence length, repeated words, linking words,
structure), a scripted speaking partner, and rule-based answers using the same tools. Writing reviews are also saved
on the student's INUKA AI page. Activities are matched by course and lesson title in
`backend/src/services/lessonAi.js` (`AI_ACTIVITIES`) — edit there to add AI activities to other lessons.
After updating: run `npm install` in `backend` (adds the Amazon Bedrock library).


## 36. Emails with Nodemailer, reminders, alerts, S3, offline app, My Learning charts

**Emails (Nodemailer / SMTP)** — `backend/src/services/emailService.js`. Every email has a branded HTML version
(navy header, yellow button) and a plain-text version. Set in `backend/.env`:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=hello.inuka@gmail.com
SMTP_PASS=your16letterapppassword
EMAIL_FROM="INUKA <hello.inuka@gmail.com>"
```

Gmail: turn on **2-Step Verification**, then create an **App password** at myaccount.google.com/apppasswords and use
it as `SMTP_PASS` (not your normal password). Gmail sends about 500 emails a day; for more, use any SMTP service
(Brevo, Zoho, Mailgun…). Check the setup with `npm run email:test -- your.email@example.com` (in `backend`).
The backend also prints `✓ Email: sending through smtp.gmail.com` when it starts. Without SMTP settings, emails are
printed in the terminal (development).

**What is emailed**
- Account: confirm email (button), reset password (button), account created by an admin.
- Mentorship: request, confirmed, declined, cancelled, video link added, session done (rate it), session notes.
- Learning: course completed (certificate). Badges stay in the app only.
- **Reminders** (`services/reminders.js`, checked every 15 minutes, each sent only once): saved scholarships 7 days and
  1 day before the deadline (not if already applied); mentor sessions 24 hours and 1 hour before (student and mentor).
  `REMINDERS=off` turns them off.
- **Announcements**: the admin form has "Also send it by email" (on by default).
- **Scholarship alerts** (`services/alerts.js`): subscribers get an email when an admin adds a new scholarship or
  publishes a guide/news article — once per item, with an **Unsubscribe** link (`/unsubscribe` page).
- Home page "Submit your query": emailed to `CONTACT_EMAIL` (or `SMTP_USER`), with Reply-To set to the sender.

Database change: run `npx prisma migrate deploy` (migration `20261012000000_reminders_alerts`).

**Amazon S3 storage** — `STORAGE_DRIVER=s3` plus `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`,
`AWS_S3_BUCKET`. The bucket stays private (encrypted); INUKA's backend serves documents only to their owner and
photos/images to everyone.

**Installable app + offline (spec §19.4)** — `frontend/public/manifest.webmanifest` and `frontend/public/sw.js`.
On phones, "Add to Home screen" installs INUKA. Lessons and courses a student has opened can be read again without
internet ("You are offline" bar). Sign-in, documents and AI need internet. Signing out removes the saved lessons.
Works on the built site (`npm run build`), not in `npm run dev`.

**My Learning** — new "Lessons per week" bar chart (last 8 weeks) and "Quiz history" table.

## 37. Course builder: lessons, quizzes and final exams

**Database change:** run `npx prisma migrate deploy` in `backend` (migration `20261012100000_course_tools_exams`).
Existing quiz questions keep working (their single answer is copied to the new list of correct answers).

**Courses** (Admin → Courses)
- Reorder courses (↑ ↓ = order on the website) and **Duplicate** a course (a hidden copy with all lessons, quizzes and exam).
- Edit subject (English / Computer skills), course letter (A–Z), level, skills, description, and **upload the course picture**.
- Numbers on top: students started, finished all lessons, passed the exam, certificates. Each lesson row shows how many
  finished it and the average quiz score.

**Lessons** (open a lesson)
- Time to study ("About 15 minutes"), its own **quiz pass mark** (empty = 60%).
- **Upload listening audio** (MP3/M4A) — students get an audio player.
- **Files to download**: upload worksheets, slides or readings (PDF, Word, PowerPoint, Excel, pictures; 25 MB) or add links.
- **INUKA AI activity**: writing feedback (paragraph / essay / personal statement, task, word limits) or speaking practice,
  or none. Lessons without a setting keep INUKA's built-in activities.
- **Duplicate** a lesson.

**Questions** (lesson quizzes and exams use the same editor)
- Four types: one correct answer, several correct answers, true or false, short typed answer (several accepted answers;
  capital letters, accents and full stops do not matter).
- A picture on any question, an explanation, reorder ↑ ↓, and "x% right" labels from students' answers.
- **Paste many**: write questions as text (`Q:` question, `-` wrong answer, `*` correct answer, `A: True`, `A: answer`,
  `E:` explanation), press **Check** to preview, then **Add**.

**Final exam** (course page → Create final exam, `/admin/courses/:id/exam`)
- Settings: title, instructions, pass mark, time limit, random set of questions per student, shuffle, number of tries,
  hours to wait after a failed try, show correct answers after submitting, required for the certificate, published.
- Questions: add, paste many, or **Copy lesson quiz questions** in one click; points per question.
- Results: every attempt (score, time taken), pass rate, average, hardest questions first, and **Another try** for a student.

**Students**
- Lesson page: time, audio player, files to download, the new question types.
- When a course has a published exam that is required, finishing the last lesson **opens the exam** (no certificate yet).
  The exam page (`/courses/:slug/exam`) shows the rules, a timer, question numbers, and saves answers as the student goes —
  if the connection or phone stops, opening the page again continues the exam. When the time is up the answers are
  sent automatically. Passing it gives the certificate (notification + email).

API: `/api/admin/files`, `/api/admin/courses/:id/(move|duplicate|stats|exam…)`, `/api/admin/lessons/:id/(duplicate|quizzes/import)`,
`/api/admin/exam-questions/:id`, `/api/admin/exam-attempts/:id`; students: `/api/courses/:slug/exam`, `/api/courses/:slug/exam/start`,
`/api/exam-attempts/:id` (GET, `PUT …/answers`, `POST …/submit`).

## 38. Mentor sessions (book, reschedule, cancel) and Messages

**Database change:** run `npx prisma migrate deploy` in `backend` (migration `20261014090000_sessions_messages`).

**Students — Mentorship → My sessions** has three tabs: **Upcoming**, **Completed**, **Cancelled**. Each card shows the
mentor's photo, how you meet (video call, voice call or messages), the status, date and time, and a round button to
message the mentor.
- **Book a session** (`/mentorship/book/:mentorId`): 1) choose a day on the calendar and a free hour → 2) choose video
  call, voice call or messages, the topic and your message → 3) check and send. A "Request sent!" message follows.
- **Session page** (`/mentorship/sessions/:id`): mentor, date and time, your details, how you meet, mentor notes, the
  Join / Messages button (opens 15 minutes before), rating after the session. The ⋯ menu has Reschedule, Message and Cancel.
- **Reschedule**: choose a reason → choose a new day and hour → "Session moved!". The mentor confirms the new time
  again (the session goes back to "Waiting for mentor"). A session can be moved 3 times.
- **Cancel**: "Are you sure?" → choose a reason → "Session cancelled". The mentor gets an email with the reason.

**Mentors — Sessions** uses the same three tabs. Mentors see when a student asked to move a session (old time and reason),
can cancel a confirmed session with a reason (the student is emailed), and message the student from each card.

**Messages** (`/messages`, in the menu for students and mentors, with an unread number):
- A student can message a mentor after booking them; the mentor can then reply.
- Text, pictures (also from the phone camera), PDF/Word files and **voice messages** (press the microphone), 10 MB at most.
  Files are private: only the two people can open them.
- Ticks show sent ✓ and read ✓✓ (yellow). New messages appear by themselves (checked every 4 seconds).
- INUKA writes short grey lines in the chat when a session is requested, confirmed, moved, cancelled or completed.
- ⋯ menu: Sessions, **Export chat** (text file), **Clear chat** (hides the messages for you only). The search icon finds words in the chat.

## 39. Google sign-in: if it still says "not switched on"

- The keys must be in **backend/.env** (not frontend/.env), named exactly `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
- While developing, saving backend/.env is now enough: the backend reads it again by itself (before, `npm run dev`
  had to be stopped and started again). The terminal prints `✓ Google sign-in: on` or what is wrong.
- The Client ID ends with `.apps.googleusercontent.com`. The note under the button now says exactly what is missing.
- In Google Cloud → Credentials → your OAuth client, **Authorized redirect URIs** must contain
  `http://localhost:5173/api/auth/google/callback` (and your real site's address in production).
- While the OAuth consent screen is in "Testing", only the Google accounts added as **Test users** can sign in.

## 40. Dashboard look: dark sidebar, calmer text, hours on the booking calendar

- **Sidebar** (all three dashboards): a dark-blue floating panel with white icons. The open page is a light "tab"
  that comes out of the panel (curved corners, `.side-tab` in `index.css`). The round button at the bottom folds it
  to icons only. On phones it opens from the menu button.
- **Text size**: dashboards use a slightly smaller scale (15px base, `html.dash` in `index.css`) and smaller page titles.
  The public website is unchanged.
- **Booking calendar**: under "Select hour" you see all the mentor's hours for the chosen day; hours already booked
  are crossed out. The calendar and hours always show, even when a mentor is fully booked.

## 41. More hours, News & guides with pictures, likes, comments and sharing

**Database change:** run `npx prisma migrate deploy` in `backend` (migration `20261014140000_post_reactions`).

**Hours when booking a mentor.** A session (1 hour) can now start every half hour: 09:00, 09:30, 10:00…, inside the
hours the mentor set in **Mentor → My profile** (touching hours are joined, so 09:00–10:00 + 10:00–11:00 also offers 09:30).
The test mentor used to have only two hours a week (that is why you saw only 4:00 PM). Run `npm run seed` in
`backend` once: it gives the test mentor Monday–Friday 09:00–12:00 and 14:00–18:00, Saturday 10:00–13:00 (Kigali time).
Moving a session can now use a time close to its old time.

**Courses (student dashboard).** The course cards have no coloured box any more: the picture, then the course letter,
level, title, description, progress and button directly below it.

**News & guides** (`/news`)
- Every article has a picture: the one uploaded in **Admin → Website content → News & guides → Article picture**, or else a
  matching photo (`postPhoto` in `config/photos.js`).
- The newest article is shown big at the top. Filters: All / Guides / News / Student stories (with numbers), a search box,
  and Latest / Most liked.
- Article page: big picture, author and date, **Like / Unlike**, **Comment**, **Share** (WhatsApp, Facebook, X, LinkedIn,
  copy link, or the phone's share menu), comments with name, photo and a "Mentor" or "INUKA team" label,
  "Keep reading" with pictures.
- Liking and commenting need an account (the page sends people to sign in and back). People can delete their own
  comments; admins can delete any comment. At most 10 comments per person in 10 minutes.
