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

// Scholarships page hero: graduation photos of young Africans that fade from one to the next.
export const SCHOLAR_PHOTOS = [
  { src: unsplash('photo-1645263012710-35e2fc89cb5c'), alt: 'A group of graduates celebrating together in Nairobi, Kenya', credit: 'Oscar Omondi, Nairobi · Unsplash', page: 'https://unsplash.com/photos/BZbPR9JbalA', focus: 'center 30%' },
  { src: unsplash('photo-1594750852517-f37738fa2384'), alt: 'Two young graduates in gowns celebrating', credit: 'Nqobile Vundla · Unsplash', page: 'https://unsplash.com/photos/DwEfVKirLW4', focus: 'center 30%' },
  { src: unsplash('photo-1645262960695-ec79787ffeac'), alt: 'Two young women in graduation gowns celebrating in Nairobi, Kenya', credit: 'Oscar Omondi, Nairobi · Unsplash', page: 'https://unsplash.com/photos/y8_SpTKpUYg', focus: 'center 25%' },
  { src: unsplash('photo-1719408937898-e15b8638e1d8'), alt: 'A group of students in graduation gowns posing for a photo', credit: '150 Billi · Unsplash', page: 'https://unsplash.com/photos/FQqRVH1EVjg', focus: 'center 30%' },
  { src: unsplash('photo-1640117743090-93ce4f4450dd'), alt: 'A young woman in her graduation gown being congratulated, Addis Ababa, Ethiopia', credit: 'Unsplash', page: 'https://unsplash.com/', focus: 'center 30%' },
];

// Scholarship card photos, one per scholarship (keyed by slug): the place where you would study, or young African
// scholars for programmes across Africa. All free under the Unsplash License.
// A scholarship's own "Card photo link" (Admin → Scholarships) always wins. New scholarships without a photo get
// one for their country (SCHOLARSHIP_BY_COUNTRY), otherwise a graduation photo.
const sp = (id, alt) => ({ src: unsplash(id, 900), alt });
const PLACES = {
  london: sp('photo-1486299267070-83823f5448dd', 'Big Ben and the Houses of Parliament, London'),
  oxford: sp('photo-1612563958093-2c3bcfbd8760', 'The Radcliffe Camera and university colleges in Oxford, England'),
  heidelberg: sp('photo-1777902120356-eb10639611e5', 'Heidelberg, a university town in Germany'),
  seoul: sp('photo-1599033769063-fcd3ef816810', 'A traditional palace roof in Seoul, South Korea'),
  beijing: sp('photo-1547981609-4b6bfe67ca0b', 'The Forbidden City in Beijing, China'),
  istanbul: sp('photo-1623439844752-524658b16ce6', 'The Süleymaniye Mosque in Istanbul, Türkiye'),
  paris: sp('photo-1511739001486-6bfe10ce785f', 'The Eiffel Tower in Paris, France'),
  tokyo: sp('photo-1513407030348-c983a97b98d8', 'Tokyo Tower and the city skyline, Japan'),
  usa: sp('photo-1736451497343-6053161bcdde', 'A red-brick university building in the United States'),
  kigali: sp('photo-1687986261123-b17f08f2796c', 'Kigali city at sunset, Rwanda'),
  uct: sp('photo-1661324992305-afec62cd1b52', 'The University of Cape Town below the mountain, South Africa'),
  capeTown: sp('photo-1626894169601-482d26b23f35', 'Cape Town and Table Mountain from the sea, South Africa'),
  nairobi: sp('photo-1611348524140-53c9a25263d6', 'The Nairobi city skyline, Kenya'),
  kampala: sp('photo-1675756261486-09bd1e0f6c8a', 'Kampala city seen from a tall building, Uganda'),
  gradGroup: sp('photo-1645263012710-35e2fc89cb5c', 'A group of graduates celebrating together in Nairobi, Kenya'),
  gradTwo: sp('photo-1594750852517-f37738fa2384', 'Two young graduates in gowns celebrating'),
  gradGowns: sp('photo-1719408937898-e15b8638e1d8', 'A group of students in graduation gowns'),
  gradWoman: sp('photo-1689255170246-9073b4818667', 'A young woman in her graduation cap and gown'),
  gradMan: sp('photo-1594750852563-5ed8e0421d40', 'A young graduate in his gown'),
  studyGroup: sp('photo-1655720348590-c739c860beed', 'A group of young Africans studying on laptops'),
};
export const SCHOLARSHIP_PHOTOS = {
  'mastercard-foundation-scholars': PLACES.gradGroup,
  'unhcr-dafi': PLACES.studyGroup,
  'daad-development': PLACES.heidelberg,
  'african-union-scholarships': PLACES.gradGowns,
  'aga-khan-isp': PLACES.gradWoman,
  'korean-gks': PLACES.seoul,
  'chinese-government-csc': PLACES.beijing,
  'turkiye-burslari': PLACES.istanbul,
  'eiffel-excellence': PLACES.paris,
  'mext-japan': PLACES.tokyo,
  'commonwealth-masters': PLACES.oxford,
  chevening: PLACES.london,
  'fulbright-foreign-student': PLACES.usa,
  'intra-africa-mobility': PLACES.gradTwo,
  'rwanda-government': PLACES.kigali,
  'uct-international': PLACES.uct,
  'uon-bursary': PLACES.nairobi,
  'makerere-international': PLACES.kampala,
  'afdb-japan': PLACES.gradMan,
  'mandela-rhodes': PLACES.capeTown,
};
export const SCHOLARSHIP_BY_COUNTRY = {
  'United Kingdom': PLACES.london, Germany: PLACES.heidelberg, 'South Korea': PLACES.seoul, China: PLACES.beijing,
  'Türkiye': PLACES.istanbul, Turkey: PLACES.istanbul, France: PLACES.paris, Japan: PLACES.tokyo, 'United States': PLACES.usa,
  Rwanda: PLACES.kigali, 'South Africa': PLACES.capeTown, Kenya: PLACES.nairobi, Uganda: PLACES.kampala,
};
export function scholarshipPhoto(s) {
  if (s?.imageUrl) return { src: s.imageUrl, alt: '' };
  return SCHOLARSHIP_PHOTOS[s?.slug] || SCHOLARSHIP_BY_COUNTRY[s?.hostCountry] || PLACES.gradGroup;
}

// Scholarship page side box ("Need help applying?").
export const HELP_PHOTO = { src: unsplash('photo-1655720357872-ce227e4164ba', 800), alt: 'Young people looking at a laptop together' };
