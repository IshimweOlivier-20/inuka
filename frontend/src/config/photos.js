// ─────────────────────────────────────────────────────────────
//  Photos of young Africans used on the home page.
//
//  These are free photos from Unsplash (Unsplash License: free for commercial use, no permission needed).
//  Before launch, the best choice is your OWN photos of INUKA students and mentors, taken with their
//  written permission. To use your own photo:
//    1. put the file in  frontend/public/photos/  (e.g. frontend/public/photos/hero-1.jpg)
//    2. change `src` below to  '/photos/hero-1.jpg'
//    3. update `alt` (what the photo shows, for people who cannot see it) and `credit`.
//  Wide (landscape) photos work best for the hero; tall (portrait) photos for the mission section.
// ─────────────────────────────────────────────────────────────
const unsplash = (id, w = 1920) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=75`;

// Big photos behind the home page hero (they fade from one to the next).
// `focus` moves the crop so faces stay visible, e.g. 'center', '70% center', 'right center'.
export const HERO_PHOTOS = [
  {
    src: unsplash('photo-1531482615713-2afd69097998'),
    alt: 'Two young people working together at a computer during a coding class in Lagos, Nigeria',
    credit: 'NESA by Makers, Lagos · Unsplash',
    page: 'https://unsplash.com/photos/IgUR1iX0mqM',
    focus: '65% center',
  },
  {
    src: unsplash('photo-1620829813573-7c9e1877706f'),
    alt: 'A young man studying on a laptop at a university internet café in Kumasi, Ghana',
    credit: 'Kojo Kwarteng, Kumasi · Unsplash',
    page: 'https://unsplash.com/photos/KUzlAah2dog',
    focus: '70% center',
  },
  {
    src: unsplash('photo-1655720348590-c739c860beed'),
    alt: 'A group of young Africans sitting on a bench, each working on a laptop',
    credit: 'Iwaria Inc. · Unsplash',
    page: 'https://unsplash.com/photos/vWqBjWbc_H4',
    focus: 'center',
  },
];

// Mission section: one large photo and one small photo on top of it.
export const MISSION_PHOTOS = {
  main: {
    src: unsplash('photo-1645262960695-ec79787ffeac', 1000),
    alt: 'Two young women in graduation gowns celebrating together in Nairobi, Kenya',
    credit: 'Oscar Omondi, Nairobi · Unsplash',
    page: 'https://unsplash.com/photos/y8_SpTKpUYg',
  },
  small: {
    src: unsplash('photo-1771412198236-c2a5a5778fb8', 600),
    alt: 'A young woman with braided hair holding a laptop, an ICT student',
    credit: 'Mudadi Saidi · Unsplash',
    page: 'https://unsplash.com/photos/1ubI4WCH4Q4',
  },
};

// FAQ section: photo on the right of the questions.
export const FAQ_PHOTO = {
  src: unsplash('photo-1771412205065-6e8c5ec159bd', 900),
  alt: 'A young man holding a laptop in a computer class, an ICT student',
  credit: 'Mudadi Saidi · Unsplash',
  page: 'https://unsplash.com/photos/DhG1F9j8gfw',
};

// Placeholder people ("Sample team member", "Sample student"): stock photos of young Africans, used only for
// sample items (hidden in production) that have no photo yet. Real people always need their own photo.
const portrait = (id) => unsplash(id, 700);
export const SAMPLE_PHOTOS = {
  team: {
    'Mentorship Lead': portrait('photo-1624670319970-37aa780d4874'),       // Kojo Kwarteng, Kumasi (Ghana)
    'Curriculum Lead': portrait('photo-1620424037570-15137a4a562d'),       // Belinda Amoah, Accra (Ghana)
    'Refugee Outreach Lead': portrait('photo-1586171984069-1dbce3573a10'), // Muhammad-Taha Ibrahim, Zaria (Nigeria)
  },
  testimonials: {
    'S6 graduate': portrait('photo-1603085356448-6857558a32b5'),           // Dapo Abideen
    'University applicant': portrait('photo-1741940365182-bc0ffdc1262d'),  // Lisa Marie Theck, Kampala (Uganda)
    'Admissions counsellor': portrait('photo-1716654716572-9f31d7f0f897'), // Makmot Robin
  },
};
export const samplePhoto = (kind, item) => item.photoUrl || (item.isSample ? SAMPLE_PHOTOS[kind]?.[item.role] : null) || null;

// Background of the "Our goals" numbers band.
export const STATS_PHOTO = {
  src: unsplash('photo-1635038726688-6c5d78b6d0ef', 1920),
  alt: '',
  credit: 'Emmanuel Offei · Unsplash',
  page: 'https://unsplash.com/photos/GHpLx98pxSQ',
};

// Course pictures, one per course (matched to the course title and description), keyed by the course slug.
// Used when a course has no "Thumbnail image link" set in Admin → Courses. All free under the Unsplash License.
const coursePic = (id, alt, credit, page) => ({ src: unsplash(id, 900), alt, credit, page });
export const COURSE_PHOTOS = {
  'english-reading': coursePic('photo-1716654716572-7b13ad56ba63', 'A young man sitting on a library floor reading a book', 'Makmot Robin · Unsplash', 'https://unsplash.com/photos/QLSTZdXrBkE'),
  'english-writing-basics': coursePic('photo-1655720348598-526764cd2bca', 'A young woman writing in a notebook', 'Iwaria Inc. · Unsplash', 'https://unsplash.com/photos/Rbus5PbeBzM'),
  'english-essays': coursePic('photo-1721468184185-214871ec4411', 'A student writing on a sheet of paper, Accra, Ghana', 'Kingsley Hemans, Accra · Unsplash', 'https://unsplash.com/photos/MAtFlkixDf4'),
  'english-speaking': coursePic('photo-1537344845089-c7f47b3210ab', 'A young woman speaking into a microphone at a university event in Luanda, Angola', 'Emmanuel Zua, Luanda · Unsplash', 'https://unsplash.com/photos/1Q8WP77OWv0'),
  'english-scholarship-writing': coursePic('photo-1655720348593-8ff1d2086dc8', 'A young woman writing on her laptop', 'Iwaria Inc. · Unsplash', 'https://unsplash.com/photos/ai0BVt-ZKwo'),
  'computer-intro': coursePic('photo-1528901166007-3784c7dd3653', 'A young man learning on a laptop in a computer class in Lagos, Nigeria', 'NESA by Makers, Lagos · Unsplash', 'https://unsplash.com/photos/kwzWjTnDPLk'),
  'computer-internet-email': coursePic('photo-1541178735493-479c1a27ed24', 'A young man browsing the internet on a laptop in Yaba, Nigeria', 'NESA by Makers, Lagos · Unsplash', 'https://unsplash.com/photos/7d4LREDSPyQ'),
  'computer-digital-tools': coursePic('photo-1576814547952-f8531781d7ef', 'A young man using his smartphone in Lagos, Nigeria', 'Olumide Bamgbelu, Lagos · Unsplash', 'https://unsplash.com/photos/Ciba8rvHYng'),
  'computer-university-online': coursePic('photo-1694175271713-a6e2cc378980', 'A college student holding a laptop', 'Seth Ebenezer Tetteh · Unsplash', 'https://unsplash.com/photos/DeqswsZEO3Y'),
};
// The picture for a course: the admin's own image if set, otherwise the matching photo above (or null).
export const coursePhoto = (c) => c?.thumbnailUrl || COURSE_PHOTOS[c?.slug || c?.courseSlug]?.src || null;

// "Who INUKA is for" cards: one photo on top of each card.
export const AUDIENCE_PHOTOS = {
  graduates: { src: unsplash('photo-1640117743090-93ce4f4450dd', 800), alt: 'A young woman in her graduation gown being congratulated, Addis Ababa, Ethiopia' },
  refugees: { src: unsplash('photo-1634951401794-6c84f593db82', 800), alt: 'Two young men studying together at a table in a library in Lagos, Nigeria' },
  mentors: { src: unsplash('photo-1655720357872-ce227e4164ba', 800), alt: 'A small group of young people looking at a laptop together' },
};
