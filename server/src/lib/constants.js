// Document vault types (spec 14.1, tab 2). `checklist` links a vault type to the Apply checklist.
export const DOCUMENT_TYPES = [
  { key: 'national_id', label: 'National ID or Passport', status: 'required', formats: ['pdf', 'jpg', 'png'] },
  { key: 's4_report', label: 'S4 Academic Report', status: 'required', formats: ['pdf', 'jpg', 'png'] },
  { key: 's5_report', label: 'S5 Academic Report', status: 'required', formats: ['pdf', 'jpg', 'png'] },
  { key: 's6_report', label: 'S6 Academic Report / Diploma', status: 'required', formats: ['pdf', 'jpg', 'png'] },
  { key: 'leaving_certificate', label: 'School Leaving Certificate', status: 'required', formats: ['pdf', 'jpg', 'png'] },
  { key: 'passport_photo', label: 'Passport-size Photograph', status: 'required', formats: ['jpg', 'png'] },
  { key: 'refugee_document', label: 'UNHCR / Refugee Status Document', status: 'if_applicable', formats: ['pdf', 'jpg', 'png'] },
  { key: 'personal_statement', label: 'Personal Statement', status: 'recommended', formats: ['pdf', 'docx'] },
  { key: 'recommendation_1', label: 'Letter of Recommendation 1', status: 'recommended', formats: ['pdf', 'docx'] },
  { key: 'recommendation_2', label: 'Letter of Recommendation 2', status: 'recommended', formats: ['pdf', 'docx'] },
  { key: 'english_certificate', label: 'English Proficiency Certificate', status: 'if_required', formats: ['pdf', 'jpg'] },
  { key: 'other', label: 'Other Documents', status: 'optional', formats: ['pdf', 'jpg', 'png'] },
];

// Always shown in the Apply checklist (spec 10.2). `vault` = which vault types satisfy it.
export const ALWAYS_REQUIRED_DOCS = [
  { key: 'national_id', label: 'National ID or Passport (valid, not expired)', vault: ['national_id'] },
  { key: 's4_report', label: 'S4 Academic Report / Official Results', vault: ['s4_report'] },
  { key: 's5_report', label: 'S5 Academic Report / Official Results', vault: ['s5_report'] },
  { key: 's6_report', label: 'S6 Academic Report / Final Results (or school-leaving certificate)', vault: ['s6_report'] },
  { key: 'leaving_certificate', label: 'Secondary School Leaving Certificate / Diploma', vault: ['leaving_certificate'] },
  { key: 'passport_photo', label: 'Recent passport-size photograph (digital, JPG or PNG)', vault: ['passport_photo'] },
  { key: 'personal_statement', label: 'Personal Statement or Motivation Letter (typed, PDF)', vault: ['personal_statement'] },
  { key: 'refugee_document', label: 'Proof of Refugee / Displaced Status (if applicable)', vault: ['refugee_document'], refugeeOnly: true },
];

export const CONDITIONAL_DOCS = {
  english_proficiency: { label: 'English Proficiency Certificate (IELTS / TOEFL) — or your INUKA English Course Certificate', vault: ['english_certificate'] },
  recommendation_letters: { label: 'Two Letters of Recommendation from teachers or community leaders', vault: ['recommendation_1', 'recommendation_2'], needsAll: true },
  financial_need: { label: 'Financial Need Statement / Proof of Income', vault: [] },
  birth_certificate: { label: 'Birth Certificate', vault: [] },
  medical_certificate: { label: 'Medical Certificate', vault: [] },
  community_service: { label: 'Community Service or Volunteer Record', vault: [] },
  research_proposal: { label: 'Research Proposal (postgraduate only)', vault: [] },
  transcripts: { label: 'Transcripts (if different from school reports)', vault: [] },
};

export const MIME_BY_EXT = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  png: 'image/png',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

export const QUIZ_PASS_MARK = 60;
