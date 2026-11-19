// end-tunes.mjs -- the song in the distance on the winning screen, ONE definition read twice: by
// ending-src.mjs (the ending's own little player) and by tools/song-end.mjs (a GoatTracker .sng of the
// same notes, to hear and edit in the tracker).
//
// From the user's "Test Song" (2026-11-10, played in on the typing keyboard, so the rhythm is redone
// here on a 6/8 grid; the notes are theirs). Their line is D PHRYGIAN -- natural minor plus the flat
// second (Eb). The variants answer "make it a bit more interesting" and the Edmund Fitzgerald
// question: that song floats between Dorian and Mixolydian on sus2 chords that leave the third out.
//   phrygian  the user's notes: Bb in the A-Bb-A turn, Eb in the last bar
//   dorian    B natural and E natural: the raised sixth, sad but open
//   mixed     Dorian's B in the first phrase, Phrygian's Eb kept as the one dark turn at the end
//   open      no third leading the way: D-G-A, A-C-A; the minor third (F) touched once, at the top
//
// A token is NOTE:rows, a row a sixteenth (TUNE_ROW frames); r:rows is a rest. Bars are 12 rows (6/8).
export const TUNE_ROW = 8;          // frames a sixteenth: a dotted quarter is 48 frames, 75 a minute
export const TUNE_GAP = 64;         // rows of silence before it comes round again (~8.5 s)
export const TUNES = {
  phrygian: 'D4:1 F4:1 G4:2 | A4:4 A#4:2 A4:6 | F4:2 D4:10 | r:8 C5:1 D5:3 | C5:12 | D#5:2 D5:2 C5:2 D5:6 | r:12',
  dorian:   'D4:1 F4:1 G4:2 | A4:4 B4:2 A4:6  | F4:2 D4:10 | r:8 C5:1 D5:3 | C5:12 | E5:2 D5:2 C5:2 D5:6  | r:12',
  mixed:    'D4:1 F4:1 G4:2 | A4:4 B4:2 A4:6  | F4:2 D4:10 | r:8 C5:1 D5:3 | C5:12 | D#5:2 D5:2 C5:2 D5:6 | r:12',
  open:     'D4:1 G4:1 A4:2 | A4:4 C5:2 A4:6  | G4:2 D4:10 | r:8 C5:1 D5:3 | C5:12 | F5:2 D5:2 C5:2 D5:6  | r:12',
};
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
// -> [{ semi, rows }]: semi = octave*12 + note (C0 = 0; GoatTracker's note byte is $60 + semi), null = rest
export function parseTune(name) {
  const s = TUNES[name];
  if (!s) throw new Error(`no end tune '${name}' (${Object.keys(TUNES).join(', ')})`);
  return s.split(/\s+/).filter(t => t && t !== '|').map(t => {
    const [n, r] = t.split(':'), rows = +r;
    if (!(rows > 0)) throw new Error(`end tune ${name}: bad length in '${t}'`);
    if (n === 'r') return { semi: null, rows };
    const m = n.match(/^([A-G]#?)(\d)$/), k = m && NAMES.indexOf(m[1]);
    if (!m || k < 0) throw new Error(`end tune ${name}: bad note '${t}'`);
    return { semi: +m[2] * 12 + k, rows };
  });
}
// ---- GEN: the flute that goes on and on (the user, 2026-11-10: "plays flute lines forever, changing
// scales sometimes, leaving long spaces ... it should sound like the fixed-flute stuff you've made, but
// branching out from there"). ending-src.mjs's genCode plays these; ENDTUNE=gen.
//
// It opens with the user's own two phrases (GEN_QUOTES), then makes PHRASES, not notes: rhythm cells
// (GEN_CELLS) chained into a line, a melody that mostly steps, sometimes leaps a third or fourth
// and then steps back against it, ending on a home note (D or A) near where it got to. A third of the
// phrases repeat the one before, moved up or down the scale (a sequence: what makes a line sound
// meant); one in six quotes the user's tune again, in whatever mode it is in by then. Between phrases a
// long silence (5-22 s), or a short one (1-3 s) that lets the next sound like an answer.
//
// THE MODES all sit on D, and form a RING in which each neighbour differs by one note -- so a change of
// scale (every 3-6 phrases, one step either way round) is a change of mood, never a change of key:
//   Phrygian (b2 b6) -- Aeolian (raise the 2nd) -- Dorian (raise the 6th) -- "mixed" (Dorian with the
//   b2: the user's mixed tune) -- back to Phrygian (lower the 6th)
// Degrees: 0 = D4 ... 7 = D5 ... 13 = C6; GEN_LOW is degree 0's semitone.
export const GEN_LOW = 50;           // D4
export const GEN_MODES = [
  [0, 1, 3, 5, 7, 8, 10],            // Phrygian: the user's
  [0, 2, 3, 5, 7, 8, 10],            // Aeolian
  [0, 2, 3, 5, 7, 9, 10],            // Dorian
  [0, 1, 3, 5, 7, 9, 10],            // mixed: Dorian with Phrygian's b2
];
// A phrase is CELLS chained until it has GEN_LEN[0]..GEN_LEN[1] notes, then a long home note
// (GEN_ENDS rows). Rhythm cells in rows (sixteenths), from the user's tune and its 6/8 lilt: three
// eighths, quarter-eighth, a quick run into an eighth, the turn, a held note to breathe on; and two
// faster sixteenth runs (the user, 2026-11-10: "longer lines and some slightly faster runs. not a lot").
// One cell in GEN_TRILL_IN (at most one a phrase) is instead a TRILL ("maybe some two-note trills"):
// the note and the one above, alternating GEN_TRILL frames each, slurred -- only its first note is
// tongued -- then landing back on the note for GEN_TRILL_LAND frames.
// (2026-11-10, first take: whole phrases of 2-8 notes from the user's tune; "right now it does a lot
// of 2 or 3 note entries. It should be more like 6-20")
export const GEN_LEN = [6, 20];
export const GEN_CELLS = [
  [2, 2, 2], [4, 2], [1, 1, 2], [4, 2, 6],
  [2, 2, 2, 6], [1, 1, 1, 1, 2], [6], [2, 1, 1, 2],
];
export const GEN_ENDS = [6, 12];
export const GEN_TRILL = 4, GEN_TRILL_LAND = 16, GEN_TRILL_IN = 12;
// the user's two phrases, as degrees (in Phrygian these are exactly their notes)
export const GEN_QUOTES = [
  { deg: [0, 2, 3, 4, 5, 4, 2, 0], rows: [1, 1, 2, 4, 2, 6, 2, 10] },     // D F G A Bb A F D
  { deg: [6, 7, 6, 8, 7, 6, 7], rows: [1, 3, 12, 2, 2, 2, 6] },            // C D C Eb D C D
];
// a step: picked from 16, so 5 up, 5 down, 2 the same, and the four leaps (a third or fourth, either way)
export const GEN_MOVES = [1, 1, 1, 1, 1, -1, -1, -1, -1, -1, 0, 0, 2, -2, 3, -3];
// a phrase ends on the home note (D or A, degrees 0 4 7 11) nearest the note before it...
export const GEN_HOMES = [0, 4, 7, 11];
// ...most of the time. The rest it ends somewhere else (the user, 2026-11-10: "allow ending on other
// notes sometimes ... a bit exotic without sounding outright wrong"), picked from 32 by these weights;
// a degree of the octave (in whatever mode is playing), 'home' = the nearest D or A as above:
//   6  C, the flat 7th: the open, folk "question"            3  G, the 4th: suspended, a held breath
//   2  F, the minor 3rd: soft, almost settled                1  the 2nd and 5 the 6th: THE MODE'S OWN
//   COLOUR -- Eb (Phrygian, mixed) or E (Aeolian, Dorian); Bb (Phrygian, Aeolian) or B (Dorian, mixed)
// Three rules keep them from sounding like slips: the note before is moved to a step above or below
// (an odd note LEAPT to sounds wrong, stepped to it sounds chosen); the ones in GEN_OPEN are held the
// long length; and after one of those the silence is a short one, so the next line answers it.
export const GEN_ENDINGS = [['home', 22], [6, 3], [2, 2], [3, 2], [1, 2], [5, 1]];
export const GEN_OPEN = [1, 3, 5, 6];
// GLIDES and BENDS (the user, 2026-11-10: "some notes should be fast glides (i.e. no new attack sound)
// and maybe even a few bends"). A GLIDE is slurred -- no tonguing, no scoop -- and slides from the
// note before, half the remaining way a frame (there in ~5 frames); one note in GEN_GLIDE_IN, never the
// first or onto the same note. A BEND is tongued but rises into its note from ~a semitone below, an
// eighth of the way a frame (~20 frames, a lazy shakuhachi lift); one in GEN_BEND_IN of the notes at
// least GEN_BEND_MIN rows long. Both are flags on the phrase's notes (bits 6/7), so a repeated phrase
// keeps its gestures; the user's quotes have none.
export const GEN_GLIDE_IN = 10, GEN_BEND_IN = 6, GEN_BEND_MIN = 4;
// SLURS: no tonguing, the pitch just changes (as a trill's notes) -- likelier the closer the notes
// (the user, 2026-11-10: "notes closer together should be more likely to skip the attack"). The chance
// by the distance from the note before: [the same note (never: they would merge), a step, a third,
// a fourth or more]. A note not slurred may still glide (GEN_GLIDE_IN).
// Then (the user: "the first notes always has an attack, then there can be periodic attacks, always
// after any gap. but legato notes are less likely to"): a line is LEGATO with tonguings now and then --
// its first note always tongued (it follows a silence), and never more than GEN_SLUR_RUN notes in a
// row without one.
export const GEN_SLUR = [0, 3 / 4, 1 / 2, 1 / 5];
export const GEN_SLUR_RUN = 5;
// the vibrato: one note in VIB_DEEP_IN gets it twice as deep (the user: "bump the vibrato up one step
// (16 to 32, I think?) sometimes"); a step is twice the usual. Both a step deeper since 2026-11-19
// ("increase the depth of the vibrato by a step"): the usual is the frequency's high byte (was half
// of it), the deep one twice it (was the high byte).
export const VIB_DEEP_IN = 4;
// the vibrato's RATE and DEPTH, separately: it turns every VIB_TURN frames (a triangle of 2 *
// VIB_TURN frames), and each swing, peak to peak, is VIB_SWING times the note's frequency high byte
// (twice that deep) -- so it moves VIB_SWING / VIB_TURN of that a frame, from a table (vstep).
// 2026-11-19, the user: a step deeper, then slower, then "go for 3 hz - leave depth as it is": 10
// frames, 3 a second, swinging 6 (it was 5 frames, 6 a second, swinging 2.5).
export const VIB_TURN = 10, VIB_SWING = 6;

// the SID's frequency word for a semitone, A4 = 440 Hz, on the NTSC clock (the game's tuning)
export const sidFreq = semi => Math.round(440 * 2 ** ((semi - 57) / 12) * 16777216 / 1022727);
