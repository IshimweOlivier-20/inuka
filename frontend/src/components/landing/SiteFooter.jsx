import { Link } from 'react-router-dom';
import Logo from '../layout/Logo';
import { SectionLink } from './common';
import { SITE } from '../../config/site';
import FloatingActions from './FloatingActions';
import { ICONS } from './socialIcons';

const LABELS = { facebook: 'Facebook', instagram: 'Instagram', x: 'X (Twitter)', linkedin: 'LinkedIn', whatsapp: 'WhatsApp', youtube: 'YouTube' };

function SocialIcon({ name, url }) {
  const cls = 'w-8 h-8 flex items-center justify-center text-accent transition-colors';
  const svg = <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{ICONS[name]}</svg>;
  if (url) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`INUKA on ${LABELS[name]}`} className={`${cls} hover:text-white`}>{svg}</a>
    );
  }
  // No link yet: show the icon, but don't pretend it is a working link.
  return (
    <span className={`${cls} opacity-60`} role="img" aria-label={`${LABELS[name]} (coming soon)`}
      title={import.meta.env.DEV ? `Add the ${LABELS[name]} link in frontend/src/config/site.js` : `${LABELS[name]}: coming soon`}>{svg}</span>
  );
}

export default function SiteFooter() {
  const col = 'text-white hover:text-accent transition-colors';
  const { address } = SITE;
  const social = Object.keys(ICONS).filter((n) => SITE.social[n] || import.meta.env.DEV);
  return (
    <>
    <FloatingActions />
    <footer className="bg-night text-white font-body border-t border-white/10">
      <div className="max-w-[1200px] mx-auto px-5 pt-14 pb-12">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1.6fr]">
          <div>
            <Link to="/" aria-label="INUKA home"><Logo light tagline size="lg" /></Link>
            <p className="mt-5 text-[15px] leading-[1.7] text-white/85 max-w-sm">
              INUKA is a free place to learn English and computer skills, find scholarships and meet mentors,
              made for African high school graduates and refugee youth.
            </p>
          </div>
          <FooterCol title="Company">
            <SectionLink id="mission" className={col}>About us</SectionLink>
            <Link to="/news" className={col}>Latest news</Link>
            <Link to="/learn" className={col}>Our courses</Link>
            <SectionLink id="team" className={col}>Our team</SectionLink>
            <SectionLink id="partners" className={col}>Partners</SectionLink>
          </FooterCol>
          <FooterCol title="Information">
            <Link to="/opportunities" className={col}>Scholarships</Link>
            <SectionLink id="how-it-works" className={col}>How it works</SectionLink>
            <SectionLink id="faq" className={col}>FAQs</SectionLink>
            <Link to="/terms" className={col}>Terms of use</Link>
            <Link to="/privacy" className={col}>Privacy policy</Link>
          </FooterCol>
          <div>
            <h3 className="font-display text-white text-lg font-bold mb-5">Contact us</h3>
            <address className="not-italic text-[15px] leading-[1.7] space-y-3">
              <p>
                {address.mapUrl
                  ? <a href={address.mapUrl} target="_blank" rel="noopener noreferrer" className={col}>{address.lines.join(', ')}</a>
                  : address.lines.join(', ')}
              </p>
              {SITE.phone && <p><span className="font-bold">Phone: </span><a href={`tel:${SITE.phone.replace(/\s/g, '')}`} className={col}>{SITE.phone}</a></p>}
              <p><span className="font-bold">Email: </span><a href={`mailto:${SITE.contactEmail}`} className={`${col} break-all`}>{SITE.contactEmail}</a></p>
            </address>
            {social.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-5" aria-label="INUKA on social media">
                {social.map((name) => <li key={name}><SocialIcon name={name} url={SITE.social[name]} /></li>)}
              </ul>
            )}
          </div>
        </div>
      </div>
      <div className="bg-[#041B33]">
        <div className="max-w-[1200px] mx-auto px-5 py-5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-sm">
          <p>© {new Date().getFullYear()} INUKA. Free for every student.</p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Link to="/terms" className={col}>Terms</Link><span className="text-white/40" aria-hidden="true">|</span>
            <Link to="/privacy" className={col}>Privacy</Link><span className="text-white/40" aria-hidden="true">|</span>
            <SectionLink id="faq" className={col}>FAQs</SectionLink>
          </p>
        </div>
      </div>
    </footer>
    </>
  );
}

function FooterCol({ title, children }) {
  return (
    <div>
      <h3 className="font-display text-white text-lg font-bold mb-5">{title}</h3>
      <ul className="space-y-2.5 text-[15px]">{[children].flat().map((c, i) => <li key={i}>{c}</li>)}</ul>
    </div>
  );
}
