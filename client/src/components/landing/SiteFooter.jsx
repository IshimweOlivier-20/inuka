import { Link } from 'react-router-dom';
import Logo from '../layout/Logo';
import { SectionLink } from './common';
import { SITE } from '../../config/site';

const ICONS = {
  facebook: <path d="M14 8h3V4h-3c-2.8 0-5 2.2-5 5v2H7v4h2v7h4v-7h3l1-4h-4V9c0-.6.4-1 1-1z" />,
  instagram: <><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="17.5" cy="6.5" r="1.2" /></>,
  x: <path d="M4 4h4.5l4 5.6L17 4h3l-6.1 7.2L21 20h-4.5l-4.4-6.1L7 20H4l6.6-7.8z" />,
  linkedin: <path d="M4 9h4v11H4zM6 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm4 6h3.8v1.6C14.4 9.6 15.7 9 17.3 9 20 9 21 10.8 21 14v6h-4v-5.3c0-1.4-.3-2.4-1.7-2.4s-1.9 1-1.9 2.4V20H10z" />,
  whatsapp: <path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3zm4.6 12.6c-.2.6-1.2 1.1-1.7 1.2-.4 0-1 .1-3.1-.8-2.6-1.1-4.2-3.7-4.3-3.9-.1-.2-1-1.4-1-2.6s.6-1.8.9-2.1c.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.7 1.2 1.6 2 1.1 1 2 1.3 2.3 1.4.3.1.4.1.6-.1l.8-1c.2-.2.4-.2.6-.1l1.8.9c.3.1.4.2.5.3 0 .2 0 .7-.2 1.2z" />,
  youtube: <path d="M21.6 7.2a2.6 2.6 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.6 2.6 0 0 0 2.4 7.2 27 27 0 0 0 2 12a27 27 0 0 0 .4 4.8 2.6 2.6 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.6 2.6 0 0 0 1.8-1.8A27 27 0 0 0 22 12a27 27 0 0 0-.4-4.8zM10 15V9l5.2 3z" />,
};
const LABELS = { facebook: 'Facebook', instagram: 'Instagram', x: 'X (Twitter)', linkedin: 'LinkedIn', whatsapp: 'WhatsApp', youtube: 'YouTube' };

function SocialIcon({ name, url }) {
  const cls = 'w-11 h-11 rounded-full bg-white/10 flex items-center justify-center transition-colors';
  const svg = <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{ICONS[name]}</svg>;
  if (url) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`INUKA on ${LABELS[name]}`} className={`${cls} hover:bg-accent hover:text-ink`}>{svg}</a>
    );
  }
  // No link yet: show the icon, but don't pretend it is a working link.
  return (
    <span className={`${cls} opacity-60`} role="img" aria-label={`${LABELS[name]} (coming soon)`}
      title={import.meta.env.DEV ? `Add the ${LABELS[name]} link in client/src/config/site.js` : `${LABELS[name]}: coming soon`}>{svg}</span>
  );
}

function ContactLine({ icon, children }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 w-5 shrink-0 text-accent" aria-hidden="true">{icon}</span>
      <span>{children}</span>
    </li>
  );
}

const pin = <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" /></svg>;
const mail = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>;
const phone = <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.2 11.4 11.4 0 0 0 3.6.6 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.3.2 2.5.6 3.6a1 1 0 0 1-.3 1z" /></svg>;

export default function SiteFooter() {
  const col = 'text-white/75 hover:text-white';
  const { address } = SITE;
  return (
    <footer className="bg-ink text-white/80">
      <div className="max-w-[1200px] mx-auto px-5 pt-14 pb-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1.3fr]">
          <div>
            <Link to="/" aria-label="INUKA home"><Logo light tagline /></Link>
            <p className="mt-4 text-sm text-white/65 max-w-xs">Free learning, scholarships and guidance for African high school graduates and refugee youth.</p>
          </div>
          <FooterCol title="Platform">
            <Link to="/learn" className={col}>Free courses</Link>
            <Link to="/opportunities" className={col}>Scholarships & opportunities</Link>
            <Link to="/register" className={col}>Create an account</Link>
          </FooterCol>
          <FooterCol title="Resources">
            <Link to="/news" className={col}>News & guides</Link>
            <SectionLink id="how-it-works" className={col}>How it works</SectionLink>
            <SectionLink id="faq" className={col}>FAQ</SectionLink>
          </FooterCol>
          <FooterCol title="Organisation">
            <SectionLink id="mission" className={col}>Our mission</SectionLink>
            <SectionLink id="impact" className={col}>Our impact</SectionLink>
            <SectionLink id="team" className={col}>Our team</SectionLink>
            <SectionLink id="partners" className={col}>Partners & sponsors</SectionLink>
          </FooterCol>
          <div>
            <h3 className="text-white font-semibold mb-3">Contact</h3>
            <address className="not-italic">
              <ul className="space-y-3 text-sm">
                <ContactLine icon={pin}>
                  {address.mapUrl
                    ? <a href={address.mapUrl} target="_blank" rel="noopener noreferrer" className={col}>{address.lines.map((l) => <span key={l} className="block">{l}</span>)}</a>
                    : address.lines.map((l) => <span key={l} className="block">{l}</span>)}
                </ContactLine>
                <ContactLine icon={mail}><a href={`mailto:${SITE.contactEmail}`} className={`${col} break-all`}>{SITE.contactEmail}</a></ContactLine>
                {SITE.phone && <ContactLine icon={phone}><a href={`tel:${SITE.phone.replace(/\s/g, '')}`} className={col}>{SITE.phone}</a></ContactLine>}
              </ul>
            </address>
          </div>
        </div>
        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col-reverse md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/55">
            <span>© {new Date().getFullYear()} INUKA Platform. All rights reserved.</span>
            <a href="/privacy" className="hover:text-white">Privacy Policy</a>
            <a href="/terms" className="hover:text-white">Terms of Use</a>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-white font-semibold text-sm">Follow us</h3>
            <ul className="flex flex-wrap gap-2">
              {Object.keys(ICONS).map((name) => <li key={name}><SocialIcon name={name} url={SITE.social[name]} /></li>)}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }) {
  return (
    <div>
      <h3 className="text-white font-semibold mb-3">{title}</h3>
      <ul className="space-y-2 text-sm">{[children].flat().map((c, i) => <li key={i}>{c}</li>)}</ul>
    </div>
  );
}
