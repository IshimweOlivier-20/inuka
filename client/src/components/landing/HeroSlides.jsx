// Hero illustrations, all in the same flat INUKA style (forest, gold, off-white), drawn as inline SVG
// so they cost nothing to download. Elements with class "pop" animate in each time their slide appears.

const INK = '#1A1A2E';
const GOLD = '#FAAC00';
const PAPER = '#F9FAFB';
const LEAF = '#F1F8F4';
const MINT = '#DDEFE4';

const d = (s) => ({ '--d': `${s}s` }); // animation delay helper

// A young person, drawn around the centre of the head (0, 0).
function Person({ x, y, s = 1, skin = '#8D5A3B', hair = 'short', hairColor = '#1F140D', shirt = GOLD, glasses, body = 'bust', smile = true }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {hair === 'puff' && <circle cx="0" cy="-50" r="22" fill={hairColor} />}
      {hair === 'puff' && <ellipse cx="0" cy="-31" rx="13" ry="4.5" fill={GOLD} />}
      {body === 'gown' ? (
        <>
          <rect x="-11" y="22" width="22" height="30" fill={skin} />
          <path d="M-58 185 L-48 70 C-46 50 -28 42 0 42 C28 42 46 50 48 70 L58 185 Z" fill={shirt} />
          <path d="M-12 44 L-20 150 L-8 150 L0 58 Z M12 44 L20 150 L8 150 L0 58 Z" fill={GOLD} />
          <path d="M-12 42 L0 58 L12 42 Z" fill={skin} />
          <ellipse cx="-20" cy="188" rx="14" ry="6" fill={INK} />
          <ellipse cx="20" cy="188" rx="14" ry="6" fill={INK} />
        </>
      ) : (
        <>
          <rect x="-11" y="22" width="22" height="30" fill={skin} />
          <path d="M-64 112 C-64 66 -42 46 0 46 C42 46 64 66 64 112 Z" fill={shirt} />
          <path d="M-13 46 L0 64 L13 46 Z" fill={skin} />
        </>
      )}
      <circle cx="-32" cy="4" r="7" fill={skin} />
      <circle cx="32" cy="4" r="7" fill={skin} />
      <circle cx="0" cy="0" r="33" fill={skin} />
      {hair === 'short' && <path d="M-34 -2 C-38 -42 38 -42 34 -2 C30 -20 -30 -20 -34 -2 Z" fill={hairColor} />}
      {hair === 'puff' && <path d="M-33 -4 C-34 -36 34 -36 33 -4 C24 -18 -24 -18 -33 -4 Z" fill={hairColor} />}
      {hair === 'wrap' && (
        <>
          <path d="M-36 -2 C-42 -52 42 -52 36 -2 C28 -16 -28 -16 -36 -2 Z" fill={GOLD} />
          <path d="M-20 -30 C-6 -40 10 -40 24 -28" stroke="#D98E0B" strokeWidth="4" fill="none" strokeLinecap="round" />
          <circle cx="22" cy="-40" r="11" fill={GOLD} />
        </>
      )}
      {hair === 'grey' && <path d="M-34 -2 C-38 -40 38 -40 34 -2 C30 -16 -30 -16 -34 -2 Z" fill="#9CA3AF" />}
      <circle cx="-11" cy="3" r="3.4" fill={INK} />
      <circle cx="11" cy="3" r="3.4" fill={INK} />
      {glasses && (
        <g fill="none" stroke={INK} strokeWidth="2.5">
          <circle cx="-11" cy="3" r="9" /><circle cx="11" cy="3" r="9" /><path d="M-2 3 H2" />
        </g>
      )}
      {smile && <path d="M-9 15 Q0 22 9 15" stroke={INK} strokeWidth="2.6" fill="none" strokeLinecap="round" />}
    </g>
  );
}

function Shadow() {
  return <ellipse cx="210" cy="318" rx="170" ry="18" fill="#000" opacity=".15" />;
}

function Sparkle({ x, y, r = 7, delay = 0, color = GOLD }) {
  return <path className="pop" style={d(delay)} d={`M${x} ${y - r}L${x + r * 0.3} ${y - r * 0.3}L${x + r} ${y}L${x + r * 0.3} ${y + r * 0.3}L${x} ${y + r}L${x - r * 0.3} ${y + r * 0.3}L${x - r} ${y}L${x - r * 0.3} ${y - r * 0.3}Z`} fill={color} />;
}

/* 1. Rise: the INUKA mark, a sprout growing out of an open book */
export function ArtRise() {
  return (
    <svg viewBox="0 0 420 360" className="w-full" role="img" aria-label="A seedling growing out of an open book">
      <Shadow />
      <path d="M40 300c55-24 110-24 170 6 60-30 115-30 170-6V150c-55-24-110-24-170 6-60-30-115-30-170-6z" fill={PAPER} />
      <path d="M40 300c55-24 110-24 170 6V156c-60-30-115-30-170-6z" fill={LEAF} />
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i} fill="none" stroke="#00652F" strokeOpacity=".25" strokeWidth="3" strokeLinecap="round">
          <path d={`M70 ${190 + i * 20}c35-12 70-12 110 2`} />
          <path d={`M240 ${192 + i * 20}c40-14 75-14 110-2`} />
        </g>
      ))}
      <path d="M210 156v150" stroke="#00652F" strokeWidth="3" />
      <path className="sprout-stem" pathLength="1" d="M210 170C210 110 222 60 222 40" stroke={GOLD} strokeWidth="7" strokeLinecap="round" fill="none" />
      <path className="sprout-leaf leaf-1" d="M216 132c26-18 50-12 56 2-22 16-42 14-56-2z" fill="#FBC565" />
      <path className="sprout-leaf leaf-2" d="M214 96c-36-22-68-12-74 6 30 16 56 12 74-6z" fill={GOLD} />
      <path className="sprout-leaf leaf-3" d="M220 58c34-30 72-22 80-4-32 24-60 22-80 4z" fill={GOLD} />
    </svg>
  );
}

/* 2. Learn: a young woman studying on a laptop */
export function ArtLearn() {
  return (
    <svg viewBox="0 0 420 360" className="w-full" role="img" aria-label="A young woman learning English and computer skills on a laptop">
      <Shadow />
      <Person x={210} y={118} skin="#7A4A2C" hair="wrap" shirt="#F9FAFB" />
      {/* arms and hands */}
      <path d="M156 196 L136 232" stroke={PAPER} strokeWidth="24" strokeLinecap="round" />
      <path d="M264 196 L284 232" stroke={PAPER} strokeWidth="24" strokeLinecap="round" />
      <ellipse cx="136" cy="236" rx="15" ry="9" fill="#7A4A2C" />
      <ellipse cx="284" cy="236" rx="15" ry="9" fill="#7A4A2C" />
      {/* desk */}
      <rect x="62" y="236" width="296" height="16" rx="6" fill={PAPER} />
      <rect x="82" y="252" width="256" height="50" rx="4" fill={MINT} />
      {/* laptop, seen from behind, with the INUKA sprout on the lid */}
      <rect x="158" y="164" width="104" height="72" rx="8" fill="#E5E7EB" />
      <rect x="150" y="232" width="120" height="8" rx="4" fill="#C9CED6" />
      <path d="M210 216c0-14 3-24 3-24" stroke={GOLD} strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <path d="M212 196c8-6 15-4 17 0-7 5-12 4-17 0z M211 204c-8-5-14-3-15 1 6 4 11 3 15-1z" fill={GOLD} />
      {/* notebook */}
      <path d="M296 238 l40 -6 l6 10 l-40 6z" fill="#FBC565" />
      {/* floating learning cues */}
      <g className="pop float" style={d(0.35)}>
        <rect x="42" y="58" width="104" height="44" rx="14" fill={PAPER} />
        <path d="M74 100 l-6 16 l20 -14z" fill={PAPER} />
        <text x="94" y="87" textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="700" fontSize="19" fill="#00652F">Hello!</text>
      </g>
      <g className="pop float-slow" style={d(0.55)}>
        <rect x="296" y="46" width="76" height="40" rx="12" fill={GOLD} />
        <text x="334" y="73" textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="700" fontSize="18" fill={INK}>ABC</text>
      </g>
      <g className="pop float" style={d(0.75)}>
        <rect x="318" y="118" width="64" height="38" rx="12" fill={LEAF} />
        <text x="350" y="143" textAnchor="middle" fontFamily="'Fira Code', monospace" fontWeight="700" fontSize="17" fill="#00652F">&lt;/&gt;</text>
      </g>
      <Sparkle x={70} y={160} delay={0.9} />
      <Sparkle x={372} y={200} r={5} delay={1} color={PAPER} />
    </svg>
  );
}

/* 3. Discover: scholarships across Africa and the world */
export function ArtDiscover() {
  return (
    <svg viewBox="0 0 420 360" className="w-full" role="img" aria-label="A globe with scholarship locations and a scholarship certificate">
      <Shadow />
      <g className="pop" style={d(0.2)}><ellipse cx="180" cy="172" rx="136" ry="42" fill="none" stroke={GOLD} strokeWidth="3" strokeDasharray="4 10" strokeLinecap="round" transform="rotate(-14 180 172)" /></g>
      <circle cx="180" cy="172" r="104" fill={LEAF} />
      <g fill="none" stroke="#00652F" strokeOpacity=".18" strokeWidth="2.5">
        <ellipse cx="180" cy="172" rx="46" ry="104" />
        <ellipse cx="180" cy="172" rx="86" ry="104" />
        <path d="M76 172h208M88 122h184M88 222h184" />
      </g>
      {/* land shapes, with Africa in the centre */}
      <path d="M160 108c14-8 34-6 44 4 6 8 20 8 24 20 4 12-6 18-4 30 2 14 12 22 8 38-4 14-14 22-22 36-6 10-16 12-20 2-4-12-2-24-8-34-6-12-18-16-20-30-2-12 4-20 0-30-2-12-10-24-2-36z" fill="#A7D7B8" />
      <path d="M96 116c10-10 26-10 34-2 6 8-2 16-10 18-12 2-30-4-24-16z M244 104c16-6 32 2 34 14 2 10-12 12-22 8-10-4-20-16-12-22z" fill="#A7D7B8" />
      {/* pins */}
      {[[196, 168, 0.4], [150, 128, 0.55], [262, 116, 0.7], [206, 232, 0.85]].map(([x, y, t]) => (
        <g key={`${x}`} className="pop" style={d(t)}>
          <path d={`M${x} ${y}c-11 -14 -16 -22 -16 -30a16 16 0 1 1 32 0c0 8 -5 16 -16 30z`} fill={GOLD} />
          <circle cx={x} cy={y - 30} r="6" fill={PAPER} />
        </g>
      ))}
      {/* scholarship certificate */}
      <g className="pop float-slow" style={d(0.6)}><g transform="rotate(8 320 238)">
        <rect x="262" y="196" width="128" height="94" rx="8" fill={PAPER} />
        <rect x="278" y="214" width="70" height="7" rx="3.5" fill="#00652F" opacity=".7" />
        <rect x="278" y="230" width="92" height="5" rx="2.5" fill="#00652F" opacity=".25" />
        <rect x="278" y="242" width="80" height="5" rx="2.5" fill="#00652F" opacity=".25" />
        <path d="M356 262 l-6 26 l10 -6 l8 8 l2 -26z" fill="#D98E0B" />
        <circle cx="362" cy="262" r="14" fill={GOLD} />
        <path d="M356 262 l4 4 l8 -8" stroke={PAPER} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g></g>
      {/* magnifying glass */}
      <g className="pop" style={d(0.9)}>
        <path d="M100 262 L62 300" stroke={INK} strokeWidth="12" strokeLinecap="round" />
        <circle cx="116" cy="246" r="26" fill={PAPER} fillOpacity=".35" stroke={GOLD} strokeWidth="8" />
      </g>
      <Sparkle x={330} y={70} delay={1} />
      <Sparkle x={52} y={92} r={5} delay={1.1} color={PAPER} />
    </svg>
  );
}

/* 4. Guidance: a student and a mentor talking */
export function ArtGuide() {
  return (
    <svg viewBox="0 0 420 360" className="w-full" role="img" aria-label="A student talking with a mentor who is helping her">
      <Shadow />
      <Person x={124} y={150} s={0.92} skin="#5E3A22" hair="puff" shirt={GOLD} />
      <Person x={296} y={146} s={0.96} skin="#9A6440" hair="grey" shirt={PAPER} glasses />
      {/* table with a document */}
      <rect x="44" y="248" width="332" height="16" rx="6" fill={PAPER} />
      <rect x="64" y="264" width="292" height="40" rx="4" fill={MINT} />
      <g transform="rotate(-6 210 238)">
        <rect x="178" y="214" width="66" height="36" rx="4" fill={PAPER} stroke="#E5E7EB" strokeWidth="2" />
        <rect x="186" y="222" width="42" height="4" rx="2" fill="#00652F" opacity=".5" />
        <rect x="186" y="231" width="50" height="4" rx="2" fill="#00652F" opacity=".25" />
        <rect x="186" y="240" width="34" height="4" rx="2" fill="#00652F" opacity=".25" />
      </g>
      <path d="M252 232 l26 -8" stroke={GOLD} strokeWidth="5" strokeLinecap="round" />
      {/* speech bubbles */}
      <g className="pop float" style={d(0.35)}>
        <rect x="40" y="36" width="72" height="54" rx="16" fill={PAPER} />
        <path d="M84 88 l6 16 l8 -18z" fill={PAPER} />
        <text x="76" y="75" textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="700" fontSize="30" fill="#00652F">?</text>
      </g>
      <g className="pop float-slow" style={d(0.7)}>
        <rect x="300" y="28" width="82" height="56" rx="16" fill={GOLD} />
        <path d="M322 82 l-4 18 l16 -16z" fill={GOLD} />
        <circle cx="341" cy="52" r="12" fill={PAPER} />
        <rect x="335" y="64" width="12" height="8" rx="2" fill={PAPER} />
        <path d="M341 28 v-2 M322 40 l-3 -2 M360 40 l3 -2" stroke={PAPER} strokeWidth="3" strokeLinecap="round" />
      </g>
      <Sparkle x={210} y={72} delay={0.95} />
      <Sparkle x={196} y={112} r={5} delay={1.05} color={PAPER} />
    </svg>
  );
}

/* 5. Succeed: a graduate celebrating */
const CONFETTI = [
  [70, 70, GOLD, 20], [110, 40, PAPER, -30], [320, 60, '#A7D7B8', 40], [356, 110, GOLD, -15], [92, 150, '#A7D7B8', 60],
  [340, 180, PAPER, 25], [140, 96, GOLD, 10], [60, 210, PAPER, -40], [372, 240, GOLD, 70], [290, 30, PAPER, 15],
];
export function ArtSucceed() {
  return (
    <svg viewBox="0 0 420 360" className="w-full" role="img" aria-label="A graduate in cap and gown raising a diploma">
      <Shadow />
      {CONFETTI.map(([x, y, c, r], i) => (
        <g key={i} className="pop confetti" style={d(0.3 + i * 0.07)}><rect x={x} y={y} width="12" height="7" rx="2" fill={c} transform={`rotate(${r} ${x + 6} ${y + 3})`} /></g>
      ))}
      {/* raised arm with diploma (behind the gown) */}
      <path d="M244 172 L286 96" stroke="#1A1A2E" strokeWidth="26" strokeLinecap="round" />
      <circle cx="288" cy="90" r="13" fill="#6B4027" />
      <g className="pop" style={d(0.5)}><g transform="rotate(-28 300 76)">
        <rect x="262" y="66" width="82" height="20" rx="10" fill={PAPER} />
        <circle cx="344" cy="76" r="10" fill="#E5E7EB" />
        <rect x="296" y="66" width="10" height="20" fill={GOLD} />
      </g></g>
      <Person x={210} y={120} skin="#6B4027" hair="short" shirt="#1A1A2E" body="gown" />
      {/* mortarboard */}
      <g className="pop" style={d(0.2)}>
        <path d="M168 94 h84 v14 c-10 6 -74 6 -84 0z" fill="#111827" />
        <path d="M150 90 L210 66 L270 90 L210 112 Z" fill="#111827" />
        <path d="M210 90 L162 100 L162 126" stroke={GOLD} strokeWidth="3" fill="none" />
        <circle cx="162" cy="130" r="6" fill={GOLD} />
      </g>
      <Sparkle x={112} y={250} delay={1} />
      <Sparkle x={316} y={260} r={5} delay={1.1} color={PAPER} />
    </svg>
  );
}

export const HERO_SLIDES = [
  { key: 'rise', caption: 'Rise. Learn. Succeed.', Art: ArtRise },
  { key: 'learn', caption: 'Learn English and computer skills', Art: ArtLearn },
  { key: 'discover', caption: 'Discover scholarships in Africa and worldwide', Art: ArtDiscover },
  { key: 'guide', caption: 'Get guidance from mentors', Art: ArtGuide },
  { key: 'succeed', caption: 'Rise to university', Art: ArtSucceed },
];
