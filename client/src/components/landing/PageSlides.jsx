// Hero slideshows for the Courses (/learn) and Opportunities (/opportunities) pages.
// Same flat style as the home hero. Elements with class "pop" animate in when their slide appears,
// so they never carry their own `transform` (rotations sit on an inner <g>).
import { ArtDiscover, ArtGuide, ArtLearn, ArtSucceed, Person, Sparkle } from './HeroSlides';

const GOLD = '#00B4F0';
const FOREST = '#0A6CF0';
const SPROUT = '#06B6D4';
const PAPER = '#F9FAFB';
const INK = '#1A1A2E';
const LEAF = '#E8F1FE';
const SKY = '#3B82C4';
const LINE = '#E5E7EB';
const RED = '#EF4444';

const d = (s) => ({ '--d': `${s}s` });
const Shadow = () => <ellipse cx="210" cy="318" rx="170" ry="18" fill="#000" opacity=".15" />;
const Tick = ({ x, y, s = 1, color = PAPER }) => (
  <path d={`M${x - 5 * s} ${y} l${4 * s} ${4 * s} l${7 * s} ${-8 * s}`} stroke={color} strokeWidth={2.6 * s} fill="none" strokeLinecap="round" strokeLinejoin="round" />
);

/* ---------- Courses ---------- */

// A student with headphones reading an open book, letters floating around.
export function ArtEnglish() {
  return (
    <svg viewBox="0 0 420 360" className="w-full" role="img" aria-label="A young woman with headphones reading an English book">
      <Shadow />
      <Person x={210} y={130} skin="#6B4027" hair="puff" shirt={PAPER} />
      {/* headphones */}
      <path d="M174 134 A37 37 0 0 1 246 134" stroke={INK} strokeWidth="7" fill="none" strokeLinecap="round" />
      <rect x="165" y="120" width="15" height="26" rx="7" fill={INK} />
      <rect x="240" y="120" width="15" height="26" rx="7" fill={INK} />
      <rect x="168" y="124" width="9" height="18" rx="4" fill={GOLD} />
      <rect x="243" y="124" width="9" height="18" rx="4" fill={GOLD} />
      {/* sound waves */}
      <g className="pop" style={d(0.3)} fill="none" stroke={PAPER} strokeWidth="3" strokeLinecap="round">
        <path d="M266 122 q9 11 0 22" />
        <path d="M276 114 q15 19 0 38" opacity=".6" />
      </g>
      {/* open book held in front */}
      <path d="M100 292 c32 -15 68 -15 110 4 c42 -19 78 -19 110 -4 V220 c-32 -15 -68 -15 -110 4 c-42 -19 -78 -19 -110 -4z" fill={PAPER} />
      <path d="M100 292 c32 -15 68 -15 110 4 V224 c-42 -19 -78 -19 -110 -4z" fill={LEAF} />
      <path d="M210 224 v72" stroke={FOREST} strokeWidth="2.5" />
      {[0, 1, 2].map((i) => (
        <g key={i} fill="none" stroke={FOREST} strokeOpacity=".3" strokeWidth="3" strokeLinecap="round">
          <path d={`M122 ${244 + i * 15} c24 -8 48 -8 74 2`} />
          <path d={`M226 ${246 + i * 15} c26 -9 50 -9 74 -2`} />
        </g>
      ))}
      <ellipse cx="102" cy="258" rx="11" ry="9" fill="#6B4027" />
      <ellipse cx="318" cy="258" rx="11" ry="9" fill="#6B4027" />
      {/* floating letters and a greeting */}
      <g className="pop float" style={d(0.35)}>
        <rect x="46" y="60" width="50" height="50" rx="12" fill={GOLD} />
        <text x="71" y="96" textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="700" fontSize="30" fill={INK}>A</text>
      </g>
      <g className="pop float-slow" style={d(0.5)}>
        <rect x="324" y="48" width="46" height="46" rx="12" fill={SPROUT} />
        <text x="347" y="82" textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="700" fontSize="27" fill={PAPER}>B</text>
      </g>
      <g className="pop float" style={d(0.65)}>
        <rect x="344" y="150" width="42" height="42" rx="11" fill={SKY} />
        <text x="365" y="180" textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="700" fontSize="25" fill={PAPER}>C</text>
      </g>
      <g className="pop float-slow" style={d(0.8)}>
        <rect x="14" y="150" width="132" height="42" rx="14" fill={PAPER} />
        <path d="M112 190 l10 14 l4 -16z" fill={PAPER} />
        <text x="80" y="177" textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="700" fontSize="15" fill={FOREST}>Good morning!</text>
      </g>
      <Sparkle x={150} y={52} delay={0.95} />
      <Sparkle x={300} y={120} r={5} delay={1.05} color={PAPER} />
    </svg>
  );
}

// A quiz card with a correct answer, a certificate and a medal.
export function ArtCertificate() {
  return (
    <svg viewBox="0 0 420 360" className="w-full" role="img" aria-label="A quiz with a correct answer, a certificate of completion and a gold medal">
      <Shadow />
      {/* quiz card */}
      <g className="pop" style={d(0.15)}>
        <g transform="rotate(-8 115 170)">
          <rect x="40" y="76" width="152" height="182" rx="14" fill={PAPER} />
          <rect x="56" y="94" width="70" height="9" rx="4.5" fill={FOREST} opacity=".75" />
          <rect x="56" y="110" width="110" height="6" rx="3" fill={FOREST} opacity=".25" />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x="56" y={132 + i * 34} width="120" height="26" rx="8" fill={i === 1 ? '#E0F2FE' : LEAF} stroke={i === 1 ? SPROUT : LINE} strokeWidth="2" />
              <circle cx="72" cy={145 + i * 34} r="7" fill={i === 1 ? SPROUT : PAPER} stroke={i === 1 ? SPROUT : '#C9CED6'} strokeWidth="2" />
              {i === 1 && <Tick x={72} y={145 + i * 34} s={0.6} />}
              <rect x="86" y={141 + i * 34} width={i === 1 ? 64 : 52} height="7" rx="3.5" fill={FOREST} opacity={i === 1 ? 0.55 : 0.2} />
            </g>
          ))}
        </g>
      </g>
      {/* certificate */}
      <g className="pop" style={d(0.35)}>
        <g transform="rotate(5 270 200)">
          <rect x="160" y="118" width="226" height="164" rx="10" fill={PAPER} />
          <rect x="170" y="128" width="206" height="144" rx="6" fill="none" stroke={FOREST} strokeWidth="3" />
          <path d="M273 166 c0 -12 2 -20 2 -20" stroke={GOLD} strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <path d="M275 150 c7 -6 14 -5 16 0 -6 5 -11 4 -16 0z M274 158 c-7 -5 -13 -3 -14 1 6 4 10 3 14 -1z" fill={GOLD} />
          <rect x="210" y="176" width="130" height="10" rx="5" fill={FOREST} opacity=".8" />
          <rect x="228" y="196" width="94" height="8" rx="4" fill={GOLD} />
          <rect x="200" y="216" width="150" height="6" rx="3" fill={FOREST} opacity=".25" />
          <rect x="216" y="230" width="118" height="6" rx="3" fill={FOREST} opacity=".25" />
          <path d="M338 250 l-6 26 l10 -6 l8 8 l2 -26z" fill="#0284C7" />
          <circle cx="344" cy="250" r="16" fill={GOLD} />
          <Tick x={344} y={250} s={0.9} />
        </g>
      </g>
      {/* medal */}
      <g className="pop float" style={d(0.6)}>
        <path d="M322 30 l16 40 h14 l-16 -40z" fill={SPROUT} />
        <path d="M372 30 l-16 40 h-14 l16 -40z" fill={FOREST} />
        <circle cx="347" cy="86" r="24" fill={GOLD} />
        <circle cx="347" cy="86" r="17" fill="#7DD3FC" />
        <path d="M347 74 l3.6 7.4 8.1 1.2 -5.9 5.7 1.4 8.1 -7.2 -3.8 -7.2 3.8 1.4 -8.1 -5.9 -5.7 8.1 -1.2z" fill={PAPER} />
      </g>
      {/* score */}
      <g className="pop float-slow" style={d(0.75)}>
        <rect x="30" y="34" width="96" height="40" rx="20" fill={GOLD} />
        <text x="78" y="60" textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="700" fontSize="17" fill={INK}>100%</text>
      </g>
      {[[160, 60, GOLD, 20], [206, 36, PAPER, -30], [250, 70, SPROUT, 40], [118, 300, GOLD, -20], [300, 312, PAPER, 30]].map(([x, y, c, r], i) => (
        <g key={i} className="pop confetti" style={d(0.8 + i * 0.07)}><rect x={x} y={y} width="12" height="7" rx="2" fill={c} transform={`rotate(${r} ${x + 6} ${y + 3})`} /></g>
      ))}
    </svg>
  );
}

// A phone showing an INUKA lesson with audio and progress.
export function ArtPhone() {
  return (
    <svg viewBox="0 0 420 360" className="w-full" role="img" aria-label="A phone showing an INUKA lesson with an audio player and a progress bar">
      <Shadow />
      {/* palm behind the phone */}
      <ellipse cx="236" cy="286" rx="62" ry="40" fill="#7A4A2C" />
      {/* phone */}
      <rect x="148" y="34" width="136" height="264" rx="24" fill={INK} />
      <rect x="158" y="52" width="116" height="228" rx="14" fill={PAPER} />
      <rect x="198" y="40" width="36" height="6" rx="3" fill="#2E2E48" />
      {/* screen: header */}
      <path d="M158 66 a14 14 0 0 1 14 -14 h88 a14 14 0 0 1 14 14 v20 h-116z" fill={FOREST} />
      <path d="M174 80 c0 -8 1 -13 1 -13" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M176 69 c5 -4 10 -3 11 0 -4 3 -8 3 -11 0z" fill={GOLD} />
      <text x="192" y="78" fontFamily="Poppins, sans-serif" fontWeight="700" fontSize="11" fill={PAPER}>INUKA</text>
      {/* screen: lesson */}
      <rect x="170" y="100" width="82" height="9" rx="4.5" fill={INK} opacity=".8" />
      <rect x="170" y="116" width="60" height="6" rx="3" fill={INK} opacity=".3" />
      <rect x="170" y="134" width="92" height="7" rx="3.5" fill={LINE} />
      <rect x="170" y="134" width="56" height="7" rx="3.5" fill={GOLD} />
      {/* audio player */}
      <rect x="168" y="154" width="96" height="44" rx="12" fill={LEAF} />
      <circle cx="188" cy="176" r="13" fill={SPROUT} />
      <path d="M184 169 v14 l11 -7z" fill={PAPER} />
      {[6, 14, 9, 18, 11, 16, 7, 12].map((h, i) => (
        <rect key={i} x={208 + i * 6.5} y={176 - h / 2} width="3.5" height={h} rx="1.75" fill={FOREST} opacity={i < 4 ? 0.8 : 0.3} />
      ))}
      {[0, 1, 2].map((i) => <rect key={i} x="170" y={212 + i * 12} width={[90, 76, 84][i]} height="6" rx="3" fill={INK} opacity=".2" />)}
      <rect x="170" y="252" width="92" height="18" rx="9" fill={FOREST} />
      <text x="216" y="265" textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="600" fontSize="9.5" fill={PAPER}>Next lesson</text>
      {/* fingers wrapping the right edge, thumb on the left */}
      {[0, 1, 2, 3].map((i) => <rect key={i} x="274" y={166 + i * 26} width="24" height="20" rx="10" fill="#7A4A2C" />)}
      <path d="M150 250 c-18 4 -24 26 -8 36 l24 -6z" fill="#7A4A2C" />
      {/* chips */}
      <g className="pop float" style={d(0.35)}>
        <rect x="0" y="70" width="140" height="42" rx="21" fill={PAPER} />
        {[0, 1, 2, 3].map((i) => <rect key={i} x={16 + i * 7} y={96 - (i + 1) * 5} width="4.5" height={(i + 1) * 5} rx="1.5" fill={i < 2 ? SPROUT : '#C9CED6'} />)}
        <text x="50" y="96" fontFamily="Poppins, sans-serif" fontWeight="600" fontSize="12.5" fill={INK}>Light on data</text>
      </g>
      <g className="pop float-slow" style={d(0.55)}>
        <rect x="298" y="52" width="112" height="42" rx="21" fill={GOLD} />
        <text x="354" y="78" textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="600" fontSize="13" fill={INK}>Lesson 3 of 8</text>
      </g>
      <g className="pop float" style={d(0.75)}>
        <circle cx="352" cy="154" r="28" fill={SKY} />
        <path d="M338 160 v-6 a14 14 0 0 1 28 0 v6" stroke={PAPER} strokeWidth="4" fill="none" strokeLinecap="round" />
        <rect x="334" y="156" width="8" height="12" rx="3" fill={PAPER} />
        <rect x="362" y="156" width="8" height="12" rx="3" fill={PAPER} />
      </g>
      <Sparkle x={80} y={176} delay={0.9} />
      <Sparkle x={330} y={232} r={5} delay={1} color={PAPER} />
    </svg>
  );
}

/* ---------- Opportunities ---------- */

// A checklist on a clipboard, an ID card and a PDF file.
export function ArtDocuments() {
  return (
    <svg viewBox="0 0 420 360" className="w-full" role="img" aria-label="A document checklist on a clipboard with an ID card and a PDF file">
      <Shadow />
      {/* clipboard */}
      <rect x="128" y="52" width="170" height="250" rx="16" fill="#3B82C4" />
      <rect x="140" y="72" width="146" height="218" rx="8" fill={PAPER} />
      <rect x="178" y="40" width="70" height="28" rx="9" fill={INK} />
      <circle cx="213" cy="54" r="5" fill="#3B82C4" />
      <rect x="156" y="88" width="84" height="9" rx="4.5" fill={FOREST} opacity=".8" />
      {[0, 1, 2, 3].map((i) => {
        const done = i < 3;
        const y = 118 + i * 40;
        return (
          <g key={i} className="pop" style={d(0.25 + i * 0.15)}>
            <rect x="156" y={y} width="22" height="22" rx="6" fill={done ? SPROUT : PAPER} stroke={done ? SPROUT : '#C9CED6'} strokeWidth="2.5" />
            {done && <Tick x={167} y={y + 11} s={0.8} />}
            <rect x="188" y={y + 4} width={[80, 64, 74, 58][i]} height="7" rx="3.5" fill={INK} opacity={done ? 0.55 : 0.25} />
            <rect x="188" y={y + 15} width={[52, 44, 60, 40][i]} height="5" rx="2.5" fill={INK} opacity=".15" />
          </g>
        );
      })}
      {/* ID card */}
      <g className="pop float" style={d(0.7)}>
        <g transform="rotate(-9 88 196)">
          <rect x="26" y="152" width="124" height="82" rx="12" fill={PAPER} />
          <rect x="26" y="152" width="124" height="18" rx="9" fill={SKY} />
          <rect x="26" y="162" width="124" height="8" fill={SKY} />
          <rect x="38" y="180" width="38" height="44" rx="6" fill={LEAF} />
          <circle cx="57" cy="196" r="9" fill="#7A4A2C" />
          <path d="M42 222 c2 -12 28 -12 30 0z" fill={SKY} />
          <rect x="84" y="184" width="54" height="6" rx="3" fill={INK} opacity=".5" />
          <rect x="84" y="198" width="42" height="5" rx="2.5" fill={INK} opacity=".2" />
          <rect x="84" y="210" width="48" height="5" rx="2.5" fill={INK} opacity=".2" />
        </g>
      </g>
      {/* PDF */}
      <g className="pop float-slow" style={d(0.85)}>
        <g transform="rotate(8 344 170)">
          <path d="M302 112 h60 l24 24 v86 a8 8 0 0 1 -8 8 h-76 a8 8 0 0 1 -8 -8 v-102 a8 8 0 0 1 8 -8z" fill={PAPER} />
          <path d="M362 112 v18 a6 6 0 0 0 6 6 h18z" fill={LINE} />
          <rect x="304" y="150" width="46" height="22" rx="6" fill={RED} />
          <text x="327" y="166" textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="700" fontSize="12" fill={PAPER}>PDF</text>
          {[0, 1, 2].map((i) => <rect key={i} x="306" y={184 + i * 12} width={[64, 52, 60][i]} height="5" rx="2.5" fill={INK} opacity=".2" />)}
        </g>
      </g>
      <Sparkle x={330} y={70} delay={1} />
      <Sparkle x={70} y={110} r={5} delay={1.1} color={PAPER} />
      <Sparkle x={112} y={276} r={5} delay={1.15} />
    </svg>
  );
}

// A calendar with a marked deadline, an alarm clock and a reminder card.
export function ArtDeadlines() {
  const cells = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 7; c++) cells.push([c, r]);
  return (
    <svg viewBox="0 0 420 360" className="w-full" role="img" aria-label="A calendar with a deadline marked, an alarm clock and a card showing a scholarship closes in 7 days">
      <Shadow />
      {/* calendar */}
      <rect x="106" y="74" width="222" height="226" rx="18" fill={PAPER} />
      <path d="M106 92 a18 18 0 0 1 18 -18 h186 a18 18 0 0 1 18 18 v34 h-222z" fill={FOREST} />
      <rect x="146" y="58" width="12" height="32" rx="6" fill={INK} />
      <rect x="276" y="58" width="12" height="32" rx="6" fill={INK} />
      <text x="217" y="112" textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="700" fontSize="17" fill={PAPER}>October</text>
      {cells.map(([c, r]) => {
        const x = 124 + c * 27; const y = 142 + r * 36;
        const marked = c === 4 && r === 1;
        const soon = c === 2 && r === 2;
        return (
          <g key={`${c}-${r}`}>
            <rect x={x} y={y} width="20" height="20" rx="5" fill={marked ? '#FDE2E2' : soon ? '#E0F2FE' : LEAF} />
            {marked && <circle className="pop" style={d(0.45)} cx={x + 10} cy={y + 10} r="16" fill="none" stroke={RED} strokeWidth="3.5" />}
          </g>
        );
      })}
      {/* alarm clock */}
      <g className="pop" style={d(0.3)}>
        <circle cx="86" cy="262" r="40" fill={GOLD} />
        <circle cx="86" cy="262" r="31" fill={PAPER} />
        <path d="M86 262 V240 M86 262 L100 270" stroke={INK} strokeWidth="4" strokeLinecap="round" />
        <circle cx="86" cy="262" r="4" fill={INK} />
        <path d="M52 232 a14 14 0 0 1 20 -18z M120 232 a14 14 0 0 0 -20 -18z" fill={GOLD} />
        <path d="M60 300 l-8 10 M112 300 l8 10" stroke={GOLD} strokeWidth="6" strokeLinecap="round" />
      </g>
      {/* reminder card */}
      <g className="pop float" style={d(0.6)}>
        <rect x="232" y="18" width="180" height="56" rx="16" fill={PAPER} />
        <circle cx="258" cy="46" r="15" fill={GOLD} />
        <path d="M252 50 v-6 a6 6 0 0 1 12 0 v6 l2 2 h-16z" fill={INK} />
        <circle cx="258" cy="55" r="2.4" fill={INK} />
        <text x="282" y="42" fontFamily="Poppins, sans-serif" fontWeight="700" fontSize="13" fill={INK}>Closes in 7 days</text>
        <rect x="282" y="52" width="104" height="6" rx="3" fill={INK} opacity=".2" />
      </g>
      <Sparkle x={364} y={130} delay={0.9} />
      <Sparkle x={356} y={250} r={5} delay={1} color={PAPER} />
      <Sparkle x={62} y={120} r={6} delay={1.05} />
    </svg>
  );
}

export const COURSE_SLIDES = [
  { key: 'english', caption: 'Learn English step by step', Art: ArtEnglish },
  { key: 'computer', caption: 'Build computer skills from zero', Art: ArtLearn },
  { key: 'certificate', caption: 'Pass quizzes, earn certificates', Art: ArtCertificate },
  { key: 'phone', caption: 'Learn on any phone', Art: ArtPhone },
];

export const OPPORTUNITY_SLIDES = [
  { key: 'discover', caption: 'Scholarships in Africa and worldwide', Art: ArtDiscover },
  { key: 'documents', caption: 'Know which documents you need', Art: ArtDocuments },
  { key: 'deadlines', caption: 'Track every deadline', Art: ArtDeadlines },
  { key: 'guide', caption: 'Get guidance before you apply', Art: ArtGuide },
  { key: 'succeed', caption: 'Rise to university', Art: ArtSucceed },
];
