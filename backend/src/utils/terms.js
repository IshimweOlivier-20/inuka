// Version of the Terms of Use and Privacy Policy people must accept.
// When the Terms or Privacy Policy change in an important way, set this to the new "Last updated" date
// (frontend/src/pages/public/Legal.jsx): everyone is then asked to accept again when they next open INUKA.
export const TERMS_VERSION = '2026-10-01';
export const termsAccepted = (u) => !!u?.termsAcceptedAt && u.termsVersion === TERMS_VERSION;
export const acceptedNow = () => ({ termsAcceptedAt: new Date(), termsVersion: TERMS_VERSION });
