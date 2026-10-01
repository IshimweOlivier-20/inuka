import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import PublicShell, { PublicHeader } from '../../components/landing/PublicShell';
import { SITE } from '../../config/site';

// Terms of Use and Privacy Policy, in plain language (spec 4.2: the sign-up checkbox links here).
// Edit the text below. Have it reviewed by a lawyer before launch (see README).
const UPDATED = '1 October 2026';

function LegalPage({ title, intro, sections }) {
  useEffect(() => { document.title = `${title} — INUKA`; }, [title]);
  return (
    <PublicShell>
      <PublicHeader title={title} intro={intro}>
        <p className="mt-3 text-sm text-ink-soft">Last updated: {UPDATED}</p>
      </PublicHeader>
      <div className="max-w-[760px] mx-auto px-5 py-10 md:py-14">
        <nav aria-label="On this page" className="mb-10 rounded-xl bg-white border border-line p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">On this page</h2>
          <ol className="mt-2 grid sm:grid-cols-2 gap-x-6 gap-y-1 list-decimal list-inside text-[15px]">
            {sections.map(([id, heading]) => <li key={id}><a href={`#${id}`} className="text-brand hover:underline">{heading}</a></li>)}
          </ol>
        </nav>
        <div className="space-y-10">
          {sections.map(([id, heading, body], i) => (
            <section key={id} id={id} className="scroll-mt-24">
              <h2 className="text-2xl font-bold">{i + 1}. {heading}</h2>
              <div className="mt-3 space-y-3 text-[17px] leading-relaxed text-ink [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1.5 [&_a]:text-brand [&_a]:underline">{body}</div>
            </section>
          ))}
        </div>
        <p className="mt-12 pt-6 border-t border-line text-ink-soft">
          Questions? Write to us at <a href={`mailto:${SITE.contactEmail}`} className="text-brand underline">{SITE.contactEmail}</a>.
        </p>
      </div>
    </PublicShell>
  );
}

export function Terms() {
  return (
    <LegalPage
      title="Terms of Use"
      intro="The rules for using INUKA. We have kept them short and simple. Please read them before you create an account."
      sections={[
        ['about', 'What INUKA is', <>
          <p>INUKA is a free website that helps African high school graduates and refugees prepare for university. You can take English and computer courses, find scholarships, keep your application documents in one place and, soon, talk to mentors.</p>
          <p>INUKA is free for students. We will never ask you to pay to use the courses or to see scholarships.</p>
        </>],
        ['account', 'Your account', <>
          <ul>
            <li>You must be at least 13 years old to create an account. If you are under 18, please ask a parent, guardian or teacher to read these terms with you.</li>
            <li>Give true information about yourself. Scholarship suggestions depend on it.</li>
            <li>Keep your password secret. You are responsible for what happens in your account.</li>
            <li>One account per person. Do not create accounts for other people without their permission.</li>
          </ul>
        </>],
        ['use', 'Using INUKA fairly', <>
          <p>Please do not:</p>
          <ul>
            <li>upload documents that are not yours, or that you have changed to be untrue;</li>
            <li>harass, threaten or insult other students, mentors or the INUKA team;</li>
            <li>try to break, overload or get around the security of the website;</li>
            <li>copy INUKA's courses to sell them or publish them as your own.</li>
          </ul>
          <p>If someone breaks these rules, we may suspend or close their account.</p>
        </>],
        ['scholarships', 'Scholarship information', <>
          <p>We collect scholarship details from each programme's official website and check them carefully. But programmes change their rules and deadlines every year, and we cannot guarantee that every detail is still correct.</p>
          <p><strong>Always check the official website of the scholarship before you apply.</strong> INUKA does not decide who receives a scholarship and cannot promise that you will get one.</p>
        </>],
        ['mentors', 'Mentors', <>
          <p>Mentors are volunteers. The INUKA team reviews every mentor before students can book them. Mentors give advice, but you make your own decisions about your studies and applications.</p>
          <p>Mentors must be respectful, keep what students share private, and never ask students for money or personal favours. If a mentor makes you uncomfortable, tell us at <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.</p>
        </>],
        ['content', 'Your content and ours', <>
          <p>The documents and information you add stay yours. You let us store them so we can show them to you and help you with applications.</p>
          <p>The courses, lessons and design of INUKA belong to INUKA. You may use them for your own learning.</p>
        </>],
        ['changes', 'Changes and ending your account', <>
          <p>INUKA is growing, and we may change features or these terms. If we make an important change, we will tell you on the website or by email.</p>
          <p>You can delete your account at any time from <strong>Profile → Personal information → Delete account</strong>. This removes your progress, documents and applications.</p>
          <p>Please also read our <Link to="/privacy">Privacy Policy</Link>.</p>
        </>],
      ]}
    />
  );
}

export function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="What information INUKA keeps about you, why, and how you stay in control of it."
      sections={[
        ['collect', 'What we collect', <>
          <ul>
            <li><strong>Account details:</strong> your name, email address and password (stored scrambled, so nobody can read it). If you sign in with Google, we receive your name, email address and Google profile photo.</li>
            <li><strong>Your profile:</strong> country of origin, country where you live, education level, language, and if you choose to share them, your age, refugee or displaced status and a profile photo.</li>
            <li><strong>Your learning:</strong> lessons completed, quiz answers, study streak, badges and certificates.</li>
            <li><strong>Your scholarships:</strong> scholarships you save and the applications you track.</li>
            <li><strong>Your documents:</strong> files you upload to your Documents vault, such as your ID or school reports.</li>
          </ul>
        </>],
        ['why', 'Why we use it', <>
          <ul>
            <li>To run your account and show your progress.</li>
            <li>To suggest scholarships that fit you. For example, your refugee status helps us show scholarships made for refugees.</li>
            <li>To send you important emails, such as the link to confirm your email or reset your password.</li>
            <li>To understand, in total numbers only, how INUKA is used, so we can improve it.</li>
          </ul>
          <p><strong>We never sell your information</strong> and we do not show you advertising.</p>
        </>],
        ['who', 'Who can see your information', <>
          <ul>
            <li><strong>You.</strong> You can see everything in your Profile.</li>
            <li><strong>Your documents are private.</strong> Only you can open them.</li>
            <li><strong>Mentors</strong> you book will see your name, country and photo, and what you write in your booking request.</li>
            <li><strong>Mentors' profiles</strong> (name, photo, title, bio, languages) are shown to students so they can choose who to book.</li>
            <li><strong>A small INUKA team</strong> can see account information to keep the website safe and help you when you ask.</li>
          </ul>
          <p>We use trusted services to run INUKA, such as our web hosting and our email service (SendGrid). They only use your information to provide that service to us.</p>
        </>],
        ['sensitive', 'Refugee status', <>
          <p>Telling us whether you are a refugee or displaced person is always optional, and you can choose "Prefer not to say". We only use it to show you suitable scholarships. We never share it with anyone outside the INUKA team. You can change or remove it at any time in your Profile.</p>
        </>],
        ['security', 'Keeping it safe', <>
          <p>Your connection to INUKA is encrypted, passwords are stored scrambled, and uploaded files are checked and kept private. No website can be completely secure, so please use a strong password and never share it.</p>
          <p>INUKA uses one small cookie to keep you signed in. We do not use advertising or tracking cookies.</p>
        </>],
        ['control', 'Your choices', <>
          <ul>
            <li>Change your profile details and photo at any time in your Profile.</li>
            <li>Delete any document from your Documents vault.</li>
            <li>Delete your account at any time. Your information, progress and documents are then removed.</li>
            <li>Ask us what information we hold about you by writing to <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.</li>
          </ul>
          <p>Please also read our <Link to="/terms">Terms of Use</Link>.</p>
        </>],
      ]}
    />
  );
}
