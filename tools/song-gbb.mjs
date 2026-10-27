// song-gbb.mjs -- "G Bb": a filtered pulse dyad over a chromatic bass (2026-10-22, the user's sketch).
//
//   node tools/song-gbb.mjs [out.sng]        (default music/gbb.sng)
//
// The user's spec, as given:
//   G Bb dyad -- quarter note repeating, fairly staccato, very filtered pulse
//   (then: "I should say 1/8th notes for the diad" ... "filtered to the point it sounds like a distant
//   thump. I do want it to sound like a synth chord" -- eighths, and the filter opened)
//   low notes, an 8-step bar:   1  2  3  4  5  6  7  8
//                               D        D     Db        (twice)
//                               D        D#    D#
//                               E        E#    E#
// Read as eighth notes (8 to a bar), four bars looping. A step is two rows, so the bar is a 16-row
// pattern and the dyad strikes every 2 rows (the eighths). What the sketch leaves open is a default
// here, each overridable: tempo, octaves, the envelopes, the filter.
//
// Voices: 1 the bass, 2 and 3 the dyad -- all one tone (see 'Tone'), all through the low-pass. The pulse
// width sweeps slowly through the loop, started only by each voice's first note so a strike never
// restarts it; that slow sweep under the filter is what moves.
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const OUT = process.argv[2] ?? 'music/gbb.sng';
const env = (k, d) => process.env[k] ?? d;
const hexv = (k, d) => parseInt(env(k, d), 16);

const TEMPO_T = +env('TEMPOT', 12);                // ticks a row: a step (8th) = 24 ticks, 75 BPM at 60 Hz (was 9, ~100: "slow the tempo about 25%")
const BASS_OCT = +env('BASSOCT', 2), DYAD_OCT = +env('DYADOCT', 4);   // dyad was G3/Bb3, bass octave 2: "bring the diad up an octave", then "bring the bass up an ocatve", then (RHY) "move the whole thing down an octave"
// The tone (every voice, the bass too -- the user: "bring back in the bass notes using the same tone"):
// "stuccato but not quite that stucato. The release is fine, but the sustain should be like a 16th note
// long" -> "maybe it should be a 32nd note?" -> "a dotted 32nd": held DYAD_HOLD ticks at sustain A, then
// let go by the WAVETABLE (a row is a 16th, too coarse for a key-off), released at 6 (~200 ms). Gate
// timer $82, as level 3's roll: the hard restart would cut the tail dead in VICE.
const DYAD_AD = hexv('DYADAD', '00'), DYAD_SR = hexv('DYADSR', 'a6'), DYAD_GT = hexv('DYADGT', '82');
const DYAD_HOLD = +env('DYADHOLD', 9);             // a dotted 32nd at tempo 12 (6.75 at 9)
// BASSHOLD=n lets the bass go n ticks in (it was 2 x DYAD_HOLD: "make the bass notes about twice as
// long"). 0, the default: held at sustain until the next note -- "less percussive ... hold the notes
// with sustain until the next note comes in"; the gate timer still drops the gate 2 ticks before it
const BASS_HOLD = +env('BASSHOLD', 0);
// DYADSTAG=n: the upper note n ticks late (a wavetable delay row first, gate still off). Tried at 2, then
// 1; then "remove the stagger. it sounded better just played together" -- off
const DYAD_STAG = +env('DYADSTAG', 0);
// SLAP=0 drops it. The slapback: "the note plays and releases as now, but right at the halfway point
// before the next note, do the note again but with a triangle wave" -- the dyad's wavetable re-gates
// the same note as triangle SLAP_AT ticks in (half an 8th = one row), held SLAP_HOLD
const SLAP = env('SLAP', '1') === '1';
// DYADSTEP=n: rows between dyad strikes. 2 = 8ths (it was); 4 = quarters, the slap following at half a
// quarter -- "cut the pulsing diad in half ... quarter notes ... with the triangle slapback halftime as well"
const DYAD_STEP = +env('DYADSTEP', 4);
const SLAP_AT = +env('SLAPAT', DYAD_STEP / 2 * TEMPO_T), SLAP_HOLD = +env('SLAPHOLD', DYAD_HOLD);
// $1c/C was "a distant thump"; $50/8 kept some edge; "open the filter more": $90; "back to $80"; then
// "try 4 for resonance ... drop the filter down to $60"; then (bass back in) "down two steps": $40; then
// "bass back in the filter, but bring it up to $50"
const FCUT = hexv('FCUT', '50'), FRES = hexv('FRES', '4');
// DYAD=1 brings the G/Bb dyads back: "turn off the G Bb diads for now and try to get a nice lively bass note"
const DYAD = env('DYAD', '0') === '1';
// BASS=0 drops it (it was off for a while: "let's do just the diad pulse for now. (skip the bass)")
const BASS = env('BASS', '1') === '1';
const PW_LO = hexv('PWLO', '02'), PW_SPD = hexv('PWSPD', '08');          // the sweep: $200 up to $5f8 (8 a tick, 127 ticks) and back

// ---- GoatTracker's encodings ----
const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
// sharps, flats and E#/B# as written in the sketch: Db = C#, E# = F
const ALIAS = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#', 'E#': 'F', 'B#': 'C' };
const n = (nm, oct) => { const k = ALIAS[nm] ?? nm; if (!(k in NOTE)) throw new Error(`note ${nm}`);
  return 0x60 + 12 * (oct + (nm === 'B#' ? 1 : 0)) + NOTE[k]; };
const REST = 0xbd, CMD_TEMPO = 0xf;

// ---- tables (1-based rows; a jump names an absolute row) ----
const T = { wave: [], pulse: [], filt: [], speed: [] };
const add = (t, rows) => { const at = T[t].length + 1; T[t].push(...rows.map(r => typeof r === 'function' ? r(at) : r)); return at; };
// pulse + gate, a delay row (DYAD_HOLD - 2 more ticks: the first row and the gate-off row are a tick each), gate off, stop
// (a delay row holds at most 15 ticks, so a longer hold takes two)
// wait n ticks: delay rows of at most 15
const waitRows = n => { const d = []; for (let t = n; t > 0; t -= 15) d.push([Math.min(15, t), 0x00]); return d; };
// waitF(n): rows that take EXACTLY n ticks. A delay row of v takes v+1 (player.s: it counts up to v,
// then advances on the next tick; the readme's "02 ... each step takes 3 ticks"). waitRows counted v
// and put the slap 2 ticks late, at 14 of the 8th's 24 -- "a bit of a swing feel" (the user). The
// pulse's hold was already right, by its own -2.
const waitF = n => { const d = []; for (; n > 0; n -= 16) d.push([Math.min(16, n) - 1, 0x00]); return d; };
// slap: after the pulse lets go, wait to SLAP_AT, then the same note again as triangle ($11), let go ($10).
// Every row is a tick, so: strike row, hold-1 ticks of delay, gate-off row, then SLAP_AT - hold - 1
const toneWave = (stag, hold = DYAD_HOLD, slap = false) => add('wave', [...(stag ? [[stag, 0x00]] : []),
  [0x41, 0x00], ...waitRows(hold - 2), [0x40, 0x00],
  ...slap ? [...waitF(SLAP_AT - hold - 1), [0x11, 0x00], ...waitF(SLAP_HOLD - 1), [0x10, 0x00]] : [],
  [0xff, 0x00]]);
if (SLAP && SLAP_AT - DYAD_HOLD - 1 < 0) throw new Error(`SLAPAT ${SLAP_AT} lands inside the note (hold ${DYAD_HOLD})`);
const WAVE = toneWave(0, DYAD_HOLD, SLAP), BWAVE = BASS_HOLD ? toneWave(0, BASS_HOLD) : add('wave', [[0x41, 0x00], [0xff, 0x00]]);   // gate on, and stay

// ---- SYL: the bass SPEAKS a phrase, a syllable a 16th ----
// "too regular and repetitive ... that glimmery rapid shimmer between octaves that makes it sound like a
// new type of tone. but only using it sometimes, and with different waveforms and pulse width in a longer
// pattern ... like dee dee WAK AH boo boo AK AH dee dee Ba Ba Choo choo AK AH". (Before it: the same four
// 16th steps -- root/octave, a gate dip, a filter 'wow' -- on every note: "too regular".)
// The PITCHES stay the written bass line, held from step to step; the phrase only picks the TIMBRE of
// each 16th. A syllable is an instrument (a strike: the note again, with its own wave, pulse and filter
// programs) or, for a vowel that carries on (AH), an 8XY on a row with no note: the wavetable jumps to
// its program, whose first rows point the pulse and filter at its own (F9/FA: commands run from the
// wavetable, a tick each). A carry-on syllable on a row where the written note CHANGES becomes a strike
// (AK's), so the note structure always wins. SYL=0: the plain held bass. SYLROWS=n: rows a syllable.
const SYL = env('SYL', '0') === '1', SYL_ROWS = +env('SYLROWS', 1);
const PHRASE = env('PHRASE', 'dee dee WAK AH boo boo AK AH dee dee Ba Ba Choo choo AK AH').split(/\s+/).map(x => x.toLowerCase());
const SRES = hexv('SYLRES', 'a') << 4 | 0x07;         // the syllables' low-pass resonance; all voices routed
const pw = (w, ...more) => add('pulse', [[0x80 | w >> 8, w & 0xff], ...more, [0xff, 0x00]]);
const lp = (cut, ...more) => add('filt', [[0x90, SRES], [0x00, cut], ...more, [0xff, 0x00]]);
// a falling cutoff: from..to over t ticks
const fall = (from, to, t) => lp(from, [t, Math.round((to - from) / t) & 0xff]);
// the shimmer: octave up, root, a tick each, round and round -- at 60 Hz the two fuse into one new tone.
// It starts `off` rows into its add() (a jump is ABSOLUTE; `at` is where the add starts)
const shimmer = (w, off) => [[w, 0x0c], [w, 0x00], at => [0xff, at + off]];
const SYLS = !SYL ? {} : {   // (only built when used: their tables would ride in every song)
  // dee: thin pulse, a closed-ish filter, short -- the gate goes 6 ticks in
  dee: { ad: 0x00, sr: 0xa6, wp: add('wave', [[0x41, 0x00], ...waitF(5), [0x40, 0x00], [0xff, 0x00]]), pp: pw(0x300), fp: lp(0x68) },
  // WAK: a tick of noise two octaves up (the W's crack), then sawtooth; the filter snaps open and falls
  wak: { ad: 0x00, sr: 0xc6, wp: add('wave', [[0x81, 0x18], [0x21, 0x00], [0xff, 0x00]]), pp: 0, fp: fall(0xd0, 0x40, 10) },
  // boo: triangle, dark and round
  boo: { ad: 0x00, sr: 0xa6, wp: add('wave', [[0x11, 0x00], [0xff, 0x00]]), pp: 0, fp: lp(0x38) },
  // AK: a pitch blip (a tick an octave up) into a wide pulse that sweeps fast, the filter falling
  ak: { ad: 0x00, sr: 0xb6, wp: add('wave', [[0x41, 0x0c], [0x41, 0x00], [0xff, 0x00]]), pp: pw(0x800, [0x0c, 0xd0 /* -48 a tick */]), fp: fall(0xb0, 0x50, 11) },
  // Ba: pulse+triangle together ($51, a nasal tone of its own on a 6581), square-ish, short
  ba: { ad: 0x00, sr: 0xa6, wp: add('wave', [[0x51, 0x00], ...waitF(7), [0x50, 0x00], [0xff, 0x00]]), pp: pw(0x600), fp: lp(0x70) },
  // Choo: two ticks of noise (the ch), then triangle shimmering a fifth up and down -- the oo
  choo: { ad: 0x00, sr: 0xa6, wp: add('wave', [[0x81, 0x24], [0x81, 0x24], [0x11, 0x07], [0x11, 0x00], at => [0xff, at + 2]]), pp: 0, fp: lp(0x50) },
};
// AH carries on: no strike. The SHIMMER lives here (only here and in Choo -- "only using it sometimes"),
// over a pulse widening and a filter opening as the vowel opens
const AH = { wp: SYL && add('wave', [[0xf9, pw(0x400, [0x0b, 0x30])], [0xfa, lp(0x48, [0x0a, 0x06])], ...shimmer(0x41, 2)]) };
if (SYL) for (const sy of PHRASE) if (!SYLS[sy] && sy !== 'ah') throw new Error(`PHRASE: no syllable '${sy}' (have ${Object.keys(SYLS).join(' ')} ah)`);

// ---- RHY: the user's two-line sketch (2026-10-24), the bass alone ----
//   ddddxxddddxxddxxddddxxddddxxddxx     rhythm, a 16th a character
//   11111111122222222111111112222222     note: 1 = D, 2 = C#
// "d=sweepy pulse notes, x= noisy squeltch?" -- 32 16ths, two bars. The rhythm repeats every bar but the
// note changes fall at 9/8/8/7, so the two lines cross. Every character is a strike.
//   d: pulse at a steady filter (DCUT), each note its own pulse-width program (DVARS, DSEQ). Was: one
//      continuous sweep across the strikes ($180-$780, 48 ticks a way) -- "the regular notes need refinement"
//   x: the squelch -- the filter snaps open to XHI and falls to XLO in XFALL ticks at resonance XRES. Its
//      SOURCE is XSRC: arp = pulse jumping root/octave every frame (the default), noise = noise XNOISEUP
//      semitones up, both = two frames of noise into the arp
// RHYTHM / NOTES / NOTEMAP override the sketch. RHY=0: the earlier modes.
const RHY = !SYL && env('RHY', '1') === '1';
const RHYTHM = env('RHYTHM', 'ddddxxddddxxddxxddddxxddddxxddxx'), NOTES = env('NOTES', '11111111122222222111111112222222');
const NOTEMAP = env('NOTEMAP', 'D,C#').split(',');
// the second section: "include the second pattern (from way back, where it rises chromatically)" -- the
// first sketch's bars 3-4 (D D# D# | E E# E#) were bars 1-2 (D D Db | D D Db) with the step going UP, and
// bar 4 a semitone higher again. Here that is NOTES' own shape (changes at 9/8/8/7), the notes D D# E D# (was
// ...E F: "let's move that last F to D#").
// The rhythm (and so the d programs and accents) repeats unchanged. BASS2=0: the 2-bar loop alone.
const BASS2 = env('BASS2', '1') === '1';
const NOTES2 = env('NOTES2', '11111111122222222333333334444444'), NOTEMAP2 = env('NOTEMAP2', 'D,D#,E,D#').split(',');
if (RHY && (RHYTHM.length !== 32 || NOTES.length !== 32 || NOTES2.length !== 32)) throw new Error(`RHYTHM/NOTES/NOTES2 must be 32 16ths (${RHYTHM.length}/${NOTES.length}/${NOTES2.length})`);
// every 16th of the loop, by note name: section 1, then (BASS2) section 2
const LINE = [[NOTES, NOTEMAP], ...BASS2 ? [[NOTES2, NOTEMAP2]] : []].flatMap(([ns, map]) => [...ns].map(c => {
  const nm = map[+c - 1]; if (!nm) throw new Error(`NOTES: no note '${c}' in ${map}`); return nm; }));
const XSRC = env('XSRC', 'arp');
const D_CUT = hexv('DCUT', '60'), D_RES = hexv('DRES', '6');
// ACCENTS: "make the 1 & 3 have a bit more bite than the 2 & 4" -- ACC names the places, within each run
// of d's (dddd: 1-4, dd: 1-2), that BITE: attack 0 to the peak and a decay down to sustain (the transient),
// the filter snapping open to AHI and settling at DCUT in AFALL ticks, resonance ARES. The others sit
// back: a softer attack (WAD), a lower level (WSR), a darker steady filter (WCUT). ACC='' = all as before
const ACC = env('ACC', '1,3').split(',').filter(Boolean).map(Number);
const A_AD = hexv('AAD', '06'), A_SR = hexv('ASR', 'a6'), A_HI = hexv('AHI', 'c0'), A_FALL = +env('AFALL', 6), A_RES = hexv('ARES', '9');
const W_AD = hexv('WAD', '10'), W_SR = hexv('WSR', '86'), W_CUT = hexv('WCUT', '48');
const X_HI = hexv('XHI', 'e0'), X_LO = hexv('XLO', '28'), X_FALL = +env('XFALL', 10), X_RES = hexv('XRES', 'f');
const X_NOISE_UP = hexv('XNOISEUP', '18');
// DVARS: the d's pulse programs, [start width, then [ticks, speed a tick] steps] -- a 16th is 12 ticks.
// Widths past $800 mirror (the same tone as $1000 minus them), so the swings that matter are $0xx..$800.
// DSEQ: which program each d takes, in turn (1-based, cycling); 6 against the 4-note groups never lines up
const pwProg = (w, ...steps) => [[0x80 | w >> 8, w & 0xff], ...steps.map(([t, v]) => [t, v & 0xff]), [0xff, 0x00]];
const DVARS = [
  pwProg(0x100, [12, 0x60]),                      // thin -> fat, fast: a rising 'wow'
  pwProg(0x780, [12, -0x58]),                     // near square -> thin: a closing 'yow'
  pwProg(0x300, [3, 0x7f], [3, -0x7f], [3, 0x7f], [3, -0x7f]),   // a rapid wobble: PWM vibrato
  pwProg(0x080, [6, 0x7f], [6, 0x00]),            // very thin, snapping open in 6 ticks, then holding
  pwProg(0x600, [12, -0x20]),                     // fat, drifting a little thinner: the plain one
  pwProg(0x200, [2, 0x7f], [2, 0x7f], [2, -0x7f], [6, 0x30]),    // a jab: thin-fat-back, then a slow rise
];
const DSEQ = env('DSEQ', '1,2,3,4,5,6').split(',').map(Number);
// ---- V2: a second voice on the bass line (2026-10-24: "what we could do with a second voice --
// doubling or echoing or... and how it would sound hitting a saturated filter?") ----
//   echo:   the same line V2DELAY rows (16ths) late, V2DROP sustain steps quieter -- the C64 echo
//           channel. (A delay of a few TICKS, by a silent first wave row, left each echo note 3 ticks
//           long: every row is a strike, and the gate timer lets go 2 ticks before the next one)
//   sub:    the same line an octave DOWN, sawtooth (the arp squelch arps in saw too)
//   chorus: the same line, same pulse programs, with a slow vibrato (speed V2VS, depth V2VD) on every
//           row -- the two pulses drift against each other
// V2TICK=n starts every voice-2 note n ticks late (a silent first wave row), on top of any V2DELAY: a
// small n is a flam that thickens the line rather than an echo -- "offsetting the second voice a touch".
// Each voice-2 note is then n ticks shorter (12 - 2 - n: see echo above), so keep n small.
// V2FILT=1 (default) routes voice 2 into the one filter WITH voice 1: two loud voices into a resonant
// 6581 filter is where it saturates. SAT=1 leans on it: every filter program at resonance F, both
// voices' sustain at F. V2='' (default): one voice.
const V2 = env('V2', ''), V2_FILT = env('V2FILT', '1') === '1', SAT = env('SAT', '1') === '1';
// SAT=1, DCUT 60, WCUT 48 the defaults (were 0/70/58): "this is pretty good. i'd actually bring the filter
// cutoff down a bit" -- then $50/$38 was tried and backed out: "the pulse gets a little more character" here
const V2_DELAY = +env('V2DELAY', 1), V2_DROP = +env('V2DROP', 3), V2_VS = hexv('V2VS', '05'), V2_VD = hexv('V2VD', '0a'), V2_TICK = +env('V2TICK', 0);
if (V2 && !['echo', 'sub', 'chorus'].includes(V2)) throw new Error(`V2 ${V2}: echo, sub or chorus`);
if (V2 && DYAD) throw new Error('V2 takes voice 2: drop DYAD=1');
const FMASK = V2 && V2_FILT ? 0x03 : 0x01;
const fres = r => (SAT ? 0xf : r) << 4 | FMASK;           // a filter program's resonance + routing byte
const satSr = sr => SAT ? 0xf0 | sr & 0x0f : sr;
// INTRO (2026-10-24): "it has to start much mellower and work its way up ... first 1 rep of the full bass
// pattern with the filter tuned down. then bring in the drums and the filter up to the current level, then
// bring in the lead and all that" -- bass alone, its filter down (one pass); bass at the song's filter and
// the drums (one pass); then the lead. The loop RESTARTS at the lead's entrance, so the intro plays once
// and the last bar's A#4 still falls onto the lead's A4. Default on for LEAD=longshred.
const INTRO = env('INTRO', ['longshred', 'longshred6', 'calm'].includes(env('LEAD', '')) ? '1' : '0') === '1';
// IDRUMS=1: the drums' pass (bars 5-8) keeps the intro's turned-down filter too -- "hear section 5-8 with
// the filter settings of 1-4" -- so the filter only opens when the lead comes in
const I_DRUMS = env('IDRUMS', '0') === '1';
const I_CUT = hexv('ICUT', '28'), I_DCUT = hexv('IDCUT', '34'), I_AHI = hexv('IAHI', '70'), I_XHI = hexv('IXHI', '70'), I_XLO = hexv('IXLO', '20');
let RHYI = {};
if (RHY) {
  const dF = add('filt', [[0x90, fres(D_RES)], [0x00, ACC.length ? W_CUT : D_CUT], [0xff, 0x00]]);
  const aF = add('filt', [[0x90, fres(A_RES)], [0x00, A_HI], [A_FALL, Math.round((D_CUT - A_HI) / A_FALL) & 0xff], [0xff, 0x00]]);
  const xF = add('filt', [[0x90, fres(X_RES)], [0x00, X_HI], [X_FALL, Math.round((X_LO - X_HI) / X_FALL) & 0xff], [0xff, 0x00]]);
  // wave programs for tone t ($40 pulse, $20 saw), `delay` ticks late (silent first: test bit, gate off)
  const late = delay => delay ? [[0x08, 0x00], ...waitF(delay - 1)] : [];
  const arp = (t, off) => [[t | 1, 0x0c], [t | 1, 0x00], at => [0xff, at + off]];
  const xRows = (t, delay = 0) => { const pre = late(delay), o = pre.length;
    return [...pre, ...XSRC === 'noise' ? [[0x81, X_NOISE_UP], [0xff, 0x00]]
      : XSRC === 'both' ? [[0x81, X_NOISE_UP], [0x81, X_NOISE_UP], ...arp(t, o + 2)]
      : XSRC === 'arp' ? arp(t, o) : (() => { throw new Error(`XSRC ${XSRC}: arp, noise or both`); })()]; };
  const dRows = (t, delay = 0) => [...late(delay), [t | 1, 0x00], [0xff, 0x00]];
  const xWave = xRows(0x40), dWave = add('wave', dRows(0x40));
  RHYI = {
    // the d's: "rapid pulse width sweep or change the pulse width a lot on each note ... more dynamic and
    // not as similar to each other" -- each d restarts its OWN pulse program (DVARS), struck in DSEQ order
    // d<k> sits back (or, with no ACC, is the old d); d<k>! bites -- the same pulse program either way
    ...Object.fromEntries(DVARS.flatMap((v, k) => { const pp = add('pulse', v);
      return [[`d${k + 1}`, { ad: ACC.length ? W_AD : 0x08, sr: satSr(ACC.length ? W_SR : 0x96), wp: dWave, pp, fp: dF, gt: 0x82, kind: 'd' }],
        ...ACC.length ? [[`d${k + 1}!`, { ad: A_AD, sr: satSr(A_SR), wp: dWave, pp, fp: aF, gt: 0x82, kind: 'd' }]] : []]; })),
    x: { ad: 0x00, sr: satSr(0xa6), wp: add('wave', xWave), pp: 0, fp: xF, gt: 0x82, kind: 'x' },
  };
  // voice 2's copy of each: name~ -- the filter left to voice 1's programs (fp 0), one wave program per
  // kind shared by all of that kind
  if (V2) { const t = V2 === 'sub' ? 0x20 : 0x40;
    const w2 = { d: add('wave', dRows(t, V2_TICK)), x: add('wave', xRows(t, V2_TICK)) };
    const quieter = sr => V2 === 'echo' ? Math.max(0, (sr >> 4) - V2_DROP) << 4 | sr & 0x0f : sr;
    for (const [nm, x] of Object.entries(RHYI)) RHYI[nm + '~'] = { ...x, sr: quieter(x.sr), wp: w2[x.kind], fp: 0 }; }
  // INTRO's copies: name_ -- the same notes and pulse programs through a filter turned DOWN (ICUT the
  // sitting-back d's, IDCUT the accents' floor, IAHI their snap, IXHI/IXLO the squelch's sweep)
  if (INTRO) {
    const dI = add('filt', [[0x90, fres(D_RES)], [0x00, I_CUT], [0xff, 0x00]]);
    const aI = add('filt', [[0x90, fres(A_RES)], [0x00, I_AHI], [A_FALL, Math.round((I_DCUT - I_AHI) / A_FALL) & 0xff], [0xff, 0x00]]);
    const xI = add('filt', [[0x90, fres(X_RES)], [0x00, I_XHI], [X_FALL, Math.round((I_XLO - I_XHI) / X_FALL) & 0xff], [0xff, 0x00]]);
    for (const [nm, x] of Object.entries(RHYI)) if (!nm.endsWith('~'))
      RHYI[nm + '_'] = { ...x, fp: x.kind === 'x' ? xI : nm.endsWith('!') ? aI : dI }; }
  RHYI.V2VIB = V2 === 'chorus' ? add('speed', [[V2_VS, V2_VD]]) : 0;
}
// ---- DRUMS: "a nice 'when the levee breaks' four-on-the-floor beat on another track" (2026-10-24) ----
// "highhats doing a chick-ah-chik-ah at the same rate as the bass, but with a nice buh-buh on 1 and crack!
// on 3 ... the kick a transient followed by a quick note-sweep ... the high hat noise, as well as the
// snare at a deeper note". Voice 3, outside the filter. Every sound is ABSOLUTE notes in its wavetable,
// so the pattern's note doesn't matter. DRUMLINE: a 16th a character, repeating over the bass's bars:
//   K kick   k the second, softer buh   S snare   h hat (chick)   a hat (ah, lighter)   . nothing
const DRUMS = env('DRUMS', '1') === '1';      // on by default: "damn, that's a pretty decent drum sound"
// Was 'KkhahahaSahahaha' -- "the kick and snare are halftime from what I was expecting. double those ...
// counting hi-hat notes, first time it's a quick 12, then snare on the next 1, and then kick on 4 and the
// next 3, then snare on next 1". One voice, so any hit cuts the one before: the hat after each snare is
// dropped to let it ring ("a longer release ... even if it steps on a hi-hat or two")
//   1 2 3 4 1 2 3 4 1 2 3 4 1 2 3 4
//   K k h a S . h K h a K a S . h a
const DRUMLINE = env('DRUMLINE', 'KkhaS.hKhaKaS.ha');
const an = (nm, oct) => 0x80 + n(nm, oct) - 0x60;      // a wavetable absolute note ($81 = C#0)
let DRUMI = {};
if (DRUMS) {
  const sq = pw(0x800);                                // a square for the kick and the snare's body
  // kick: one frame of noise (the beater's click), then a square diving from E3 to F#1 a tick a step
  const kick = add('wave', [[0x81, an('E', 4)], ...['E3', 'A#2', 'F2', 'C#2', 'A#1', 'G#1', 'F#1'].map(x =>
    [0x41, an(x.slice(0, -1), +x.slice(-1))]), [0xff, 0x00]]);
  // snare: a noise crack, the square's thwack (F#3, C3 -- the readme's snare body), then noise settling on
  // G#5: deeper than the hats, which sit at the top of the noise (B-7). Was crack C6, the tail falling to
  // D5 at decay 8 -- "the snare disappears. needs to be a bit brighter and have a longer release"
  const snare = add('wave', [[0x81, an('C', 7)], [0x41, an('F#', 3)], [0x41, an('C', 3)],
    [0x81, an('C', 6)], [0x81, an('A#', 5)], [0x81, an('G#', 5)], [0xff, 0x00]]);
  const hat = add('wave', [[0x81, an('B', 7)], [0xff, 0x00]]);
  // decay-only envelopes (sustain 0): the decay IS the length. gt 02: a hard restart, so every hit
  // starts from silence the same way
  DRUMI = {
    K: { name: 'kick', ad: hexv('KAD', '08'), sr: 0x00, wp: kick, pp: sq, fp: 0, gt: 0x02 },
    k: { name: 'kick soft', ad: hexv('KSAD', '06'), sr: 0x00, wp: kick, pp: sq, fp: 0, gt: 0x02 },
    S: { name: 'snare', ad: hexv('SAD', '09'), sr: 0x00, wp: snare, pp: sq, fp: 0, gt: 0x02 },
    h: { name: 'hat', ad: hexv('HAD', '03'), sr: 0x00, wp: hat, pp: 0, fp: 0, gt: 0x02 },
    a: { name: 'hat ah', ad: hexv('AHAD', '01'), sr: 0x00, wp: hat, pp: 0, fp: 0, gt: 0x02 },
  };
  if (DRUMLINE.length % 16 || /[^Kk.Sha]/.test(DRUMLINE)) throw new Error(`DRUMLINE: 16ths of K k S h a .`);
}
// ---- LEAD: voice 2 (2026-10-24) -- "a gliding pulse lead, mixing held notes with short runs. something
// like: A 2 3 4 1 A# 3 G A 2 3 4 -- and then playing around that scale, possibly mirroring the bass when
// it does the chromatic climb". A line is a token a 16th: a note (A4, A#4, Bb4) strikes, '-' holds, '.'
// rests (the first one keys off). A note straight after a held one GLIDES there (3XY, no new attack);
// !A4 strikes it anyway (a picked note in a fast lick).
// Two readings of the sketch's counts:
//   16:    counting 16ths, as the drums were -- A held, a quick A# G back to A
//   beats: counting quarters -- A a bar, A# for two beats, G, A a bar
// Both: bars 1-2 over D/C# play the figure and a D-minor run up to A; bars 3-4 MIRROR the climb, a fifth
// above the bass and changing where it does (A A# B A#), with a G G# pickup back to the top.
// main: "i got my figure wrong -- too quick -- half time it ... not sure about the other parts you added.
// ditch my suggestion and come up with something you think would be cool". The figure, half time, takes
// bar 1 and half of bar 2; a breath, then an answer stepping down E5 D5 C#5 onto D5 -- and D5 HOLDS while
// the bass climbs under it (an octave, then a minor 9th over D#, a 7th over E: the grind is the bass
// moving, the lead refusing to). A breath, then a quick run down D minor, the G# slipping up into the
// top A. (16 and beats are the first readings, kept for comparison.)
// long: "take the lead line further. double or quadruple the length of the song (same bass and drum
// patterns) and get some stairway-to-heaven-like leads as we go longer ... halfway through drop to
// pentatonic". 16 bars, four passes of the bass. The held note over the climb is a STAIR, one step up
// each pass: D5, F5, A5, D6. Passes 3-4 lift the register and quicken: Page-style repeated licks, picked
// (!) at the top of each, slurred in between. They WERE D minor pentatonic (D F G A C) -- "the pentatonic
// didn't work as well as I'd hoped ... notes that sound too far out ... maybe it needs to stay minor and
// just tweak the register and speed": its C natural grinds on the bass's C# (and D#), and the licks
// landed F and D on the C# bars. Now D harmonic minor throughout (C#, A#), and over a C# bar the licks
// keep to C# E G A# (and A). The last bar cascades two octaves down to land on the top's A4.
const LONG = [
  // pass 1: main
  'A4 - - - - - - - - - A#4 - - - G4 -', 'A4 - - - - - - - . . E5 - D5 - C#5 -',
  'D5 - - - - - - - - - - - E5 - D5 -', '- - - - - - - - . C5 A#4 A4 G4 F4 E4 G#4',
  // pass 2: the figure again, the answer climbing E F G A, the stair at F5
  'A4 - - - - - - - - - A#4 - - - G4 -', 'A4 - - - - - . . E5 - F5 - G5 - A5 -',
  'F5 - - - - - - - - - - - G5 - F5 -', '- - - - - - - - . E5 D5 C#5 A#4 A4 G4 G#4',
  // pass 3: up an octave -- a swoop up to D6, licks around A5, the stair at A5
  'D6 - - - - C#6 A5 !C#6 - A5 G5 A5 - - - -', '!A5 A#5 A5 G5 !A5 A#5 A5 G5 !F5 E5 F5 G5 E5 - C#5 -',
  'A5 - - - - - - - - - - - A#5 - A5 -', '- - - - - - - - . D6 C#6 A5 G5 F5 G5 C#6',
  // pass 4: the top -- licks off D6 (a C# E G arpeggio up to G6 over the C#), the stair at D6, the cascade home
  'D6 - - - - - - - !D6 C#6 E6 G6 E6 C#6 A5 C#6', 'D6 - - - !D6 C#6 A5 - !A5 G5 A5 A#5 A5 G5 E5 G5',
  'D6 - - - - - - - - - - - F6 - D6 -', '- - - - C#6 A5 G5 F5 E5 C#5 A#4 A4 G4 F4 E4 G#4',
];
// longblues (the default 16 bars): "i think you just hit the wrong pentatonic scale -- playing against the
// baseline on my keyboard D F G G# A C works great" -- D blues, the pentatonic with its G#. Passes 1-2 as
// LONG; 3-4 rewritten in it, the G# the bent step between G and A (G G# A up, A G# G F down). The cascade
// home stays in it too: its G#4 is what slips into the top's A4. (long: the harmonic-minor 3-4.)
const BLUES = [...LONG.slice(0, 8),
  // pass 3: a swoop up to D6, blues licks around A5, the stair at A5
  'D6 - - - - C6 A5 !C6 - A5 G#5 G5 F5 - - -', '!G5 G#5 A5 C6 !A5 G#5 G5 F5 !G5 G#5 A5 - F5 - D5 -',
  'A5 - - - - - - - - - - - C6 - A5 -', '- - - - - - - - . D6 C6 A5 G#5 G5 F5 G#5',
  // pass 4: the top -- licks off D6 up to F6, the stair at D6, the cascade home
  'D6 - - - - - - - !D6 C6 D6 F6 D6 C6 A5 C6', 'D6 - - - !D6 C6 A5 - !A5 G#5 G5 F5 !G5 G#5 A5 C6',
  'D6 - - - - - - - - - - - F6 - D6 -', '- - - - C6 A5 G#5 G5 F5 D5 C5 A4 G#4 G4 F4 G#4',
];
// "the higher registers read as slightly piercing/annoying -- can we bring the higher parts down an
// octave?" -- passes 3-4 an octave down (their A5-F6 is A4-F5 now, the stairs A4 and D5). The cascade home
// would now end on G#3, an octave under the top's A4, so its last bar dips and turns back up instead.
// longbluesHi: as it was.
const down = bar => bar.replace(/(\d)/g, d => d - 1);
const BLUES_LO = [...BLUES.slice(0, 8), ...BLUES.slice(8, 15).map(down),
  '- - - - C5 A4 G#4 G4 F4 D4 C4 D4 F4 G4 - G#4'];
// longarp (2026-10-24): "the lead can progress to more SID/hubbard style rapid arpeggios in the final
// sections" -- longblues with pass 4 (and the end of pass 3, a preview) as ARP CHORDS: D4m is a chord on
// D4, its notes cycled a frame each (see ARPS). Every chord is the user's scale (D F G G# A C): Dm over
// the D bars, D dim (D F G#) over the C# and the E, Fm (F G# C) over the D#. Struck on 8ths, the bass's
// pulse; the run home is plain lead notes again, G4 G#4 into the top.
const ARPLINE = [...BLUES_LO.slice(0, 11),
  '- - - - - - - - . F4m - F4m - F4m F4m F4m',
  'D4m - D4m - D4m - D4m - D4m D4d - D4d - D4d - D4d', 'D4d D4m - D4m - D4m - D4m - D4d - D4d - D4d - D4d',
  'D4m8 - - - D4m8 - - - D4m8 F4m - - F4m - - F4m', 'F4m D4d - D4d - D4d - D4d - F4m - F4m - G4 - G#4'];
// longshred (2026-10-24): "that is not what i was thinking for the arpeggiator ... more like
// malmsteen-style scales and sweeps in rhythm with the song. not just turning the synth into a new squelch
// sound". longblues, then FAST bars (48 tokens, three to a 16th -- see SHRED) from the end of pass 3: D
// harmonic minor, Malmsteen's language -- its C# and A# are the bass's own notes (the C# bars get the
// C# diminished sweep, C# E G A#), the D# bars an A diminished one (A C D#), the D bars D minor sweeps
// and the pedal lick (A D C# D, A D C# D). The top stays at F5 (the octave down: "piercing"). The last
// beat holds G#4 into the top's A4.
const beats = (...b) => b.map(x => x.trim()).join(' ');
// The Page pass, rebuilt to BUILD (2026-10-24): "the page pass got a few too many out notes ... a bit
// more build towards the malmsteen pass so that it didn't feel like a switch is flipped ... the blues
// gets up to shred speed towards the end and then the scales switch from pentatonic bluesy patterns to
// neo-classical patterns". The out notes were the user's scale on the WRONG BASS NOTE: F held a beat over
// the C# (E#, its major third: the chord goes major), D a semitone over the C#, G over the D#. Over the
// C# bars this keeps to G# A G; over the D# to G# A C. Bars 9-10 are 16ths, the second denser; bar 11
// accelerates (8ths, 16ths, then three to a 16th); bar 12 is blues at full speed, its last notes
// spilling down F D F C# -- the C#, the leading tone, is the first neo-classical note.
const BLUESBUILD = [
  'D5 - - - C5 A4 C5 D5 - G#4 - A4 - - G4 A4',
  '!A4 C5 D5 C5 !A4 C5 D5 F5 !D5 G#4 A4 G#4 !G4 G#4 A4 -',
  beats('D5 - - - - - C5 - - - - -', 'A4 - - C5 - - D5 - - F5 - -', 'D5 C5 A4 G#4 A4 C5 A4 G#4 A4',
        'C5 A4 G#4 A4 C5 D5 C5 A4 G#4 A4 C5 D5 F5 D5 C5'),
  beats('A4 C5 A4 G#4 A4 C5 G#4 A4 C5 D5 C5 A4', 'C5 D5 C5 A4 C5 D5 C5 A4 G#4 A4 C5 D5',
        'C5 D5 C5 A4 G#4 G4 F4 G4 G#4 A4 C5 A4', 'G#4 A4 C5 D5 C5 A4 G#4 G4 F4 D4 F4 C#4'),
];
// longshred1: the first take (the low blues pass 3, the shred from bar 12's second half)
const SHREDLINE1 = [...BLUES_LO.slice(0, 11),
  // bar 12: the stair held, then the first run -- an A dim sweep over the D#, falling into bar 13's D
  beats('- - - - - - - - - - - -', '- - - - - - - - - - - -', '. - - A4 C5 D#5 C5 A4 D#4 A4 C5 D#5',
        'F5 D#5 C5 A4 C5 D#5 C5 A4 F4 E4 D4 C#4'),
  // bar 13 (D, then C#): a D minor sweep up and back, the pedal lick, the C# dim sweep
  beats('D4 F4 A4 D5 F5 D5 A4 F4 D4 F4 A4 D5', 'A4 D5 C#5 D5 A4 D5 C#5 D5 A4 D5 E5 F5',
        'E5 D5 C#5 A#4 G4 E4 C#4 E4 G4 A#4 C#5 E5', 'C#5 A#4 G4 E4 G4 A#4 C#5 E5 C#5 A#4 G4 A4'),
  // bar 14 (C#, D, C#): sweeps and a harmonic-minor run down from F5
  beats('A#4 C#5 E5 D5 A4 F4 D4 F4 A4 D5 F5 D5', 'F5 E5 D5 C#5 D5 C#5 A#4 A4 A#4 A4 G4 F4',
        'E4 F4 D4 C#4 E4 G4 A#4 C#5 E5 C#5 A#4 G4', 'E4 G4 A#4 C#5 E5 C#5 A#4 G4 E4 G4 A#4 C#5'),
  // bar 15 (D, then D#): the climb's bar -- D minor, a three-note sequence, then the A dim sweeps
  beats('D4 F4 A4 D5 F5 D5 A4 F4 D4 F4 A4 D5', 'F5 D5 A4 F5 D5 A4 E5 D5 A4 E5 C#5 A4',
        'D5 A4 F4 D#4 A4 C5 D#5 C5 A4 D#4 A4 C5', 'D#5 C5 A4 D#4 A4 C5 D#5 C5 A4 D#4 A4 C5'),
  // bar 16 (D#, E, D#): over the E an E-G#-D sweep (its 7th chord, leaning on the top's A), down to G#4, held
  beats('D#5 C5 A4 G#4 D5 E5 D5 G#4 E4 G#4 D5 E5', 'F5 E5 D5 C5 A4 G#4 A4 C5 D5 E5 D5 C5',
        'A4 G#4 E4 D#4 A4 C5 D#5 C5 A4 D#4 A4 C5', 'D#5 C5 A4 G#4 - - - - - - - -'),
];
// longshred2 (the 16-bar take of the build): bars 9-10, the accelerating bar, the shred blues bar, Yngwie
const SHREDLINE2 = [...BLUES_LO.slice(0, 8), ...BLUESBUILD, ...SHREDLINE1.slice(12)];
// longshred: "I want the non-shred blues to go on longer, then a shorter shred blues and shred yngwie" --
// 20 bars, five passes of the bass: the blues at 16ths runs SIX bars (9-14), the accelerating bar is 15,
// shred blues is one bar (16), Yngwie is the last pass (17-20). The four new bars keep the bass rules
// above (no F/D/C held over the C#, no D/G over the D#): bar 11 holds the stair A4 through the climb with
// blues turns, 12 leans D5 over the E, 13-14 are denser picked 16ths -- the push into bar 15.
// longshred3: the 20-bar take with the continuous shred
const SHREDLINE3 = [...BLUES_LO.slice(0, 8), ...BLUESBUILD.slice(0, 2),
  'A4 - - - G#4 A4 C5 D5 - C5 A4 - G#4 - A4 -',
  'A4 C5 - D5 - - - C5 D5 C5 A4 - C5 - A4 G#4',
  '!D5 C5 D5 F5 !D5 C5 A4 C5 !D5 G#4 A4 G#4 !G4 A4 G#4 A4',
  '!G#4 A4 C5 D5 !F5 D5 C5 D5 !F5 G#4 A4 G4 !A4 G#4 G4 G#4',
  ...BLUESBUILD.slice(2), ...SHREDLINE1.slice(12)];
// longshred: "when it gets into the shredding (both blues and yngwie) it shouldn't be totally continuous,
// with little melodies and bends and destination notes mixed in" -- the fast bars breathe: each has a
// held DESTINATION (vibrato), most reached by a BEND (~): G# up to A over the D# (15), C up to D over the
// E (16), A up to A# over the D# (19); and a little melody at 8th/16th speed between bursts -- C A C over
// the E (16), F E D singing down over the D (18), E D C (20). Bar 17's C# dim sweep lands on a held C#5.
const SHREDLINE4 = [...SHREDLINE3.slice(0, 14),
  beats('D5 - - - - - C5 - - - - -', 'A4 - - C5 - - D5 - - F5 - -', 'D5 C5 A4 G#4 A4 C5 A4 G#4 A4 C5 D5 C5',
        'C5 A4 G#4 - - ~A4 - - - - - -'),
  beats('A4 C5 A4 G#4 A4 C5 - - ~D5 - - -', '- - - C5 - - A4 - - C5 - -', 'D5 C5 A4 G#4 G4 F4 G4 G#4 A4 C5 A4 G#4',
        'G#4 A4 C5 D5 C5 A4 G#4 G4 F4 D4 . C#4'),
  beats('D4 F4 A4 D5 F5 D5 A4 F4 D4 F4 A4 D5', 'A4 D5 C#5 D5 A4 D5 C#5 D5 A4 D5 E5 F5',
        'E5 D5 C#5 A#4 G4 E4 C#4 E4 G4 A#4 - -', '!C#5 - - - - - A#4 - - A4 - -'),
  beats('A#4 C#5 E5 D5 A4 F4 D4 F4 A4 D5 F5 D5', 'F5 - - - - - E5 - - D5 - -',
        'D5 - - C#4 E4 G4 A#4 C#5 E5 C#5 A#4 G4', 'E4 G4 A#4 C#5 E5 C#5 A#4 G4 E4 G4 A#4 C#5'),
  beats('D4 F4 A4 D5 F5 D5 A4 F4 D4 F4 A4 D5', 'F5 D5 A4 F5 D5 A4 E5 D5 A4 E5 C#5 A4',
        'D5 A4 F4 D#4 A4 C5 D#5 C5 A4 D#4 A4 C5', 'D#5 C5 A4 - - ~A#4 - - - - - -'),
  beats('- - - G#4 D5 E5 D5 G#4 E4 G#4 D5 E5', 'E5 - - - - - D5 - - C5 - -',
        'A4 G#4 E4 D#4 A4 C5 D#5 C5 A4 D#4 A4 C5', 'D#5 C5 A4 G#4 - - - - - - - -'),
];
// longshred: "more random stops rather than stops when it *feels* right ... try those rules, but even
// better take some guitar instruction ... or look at some classic solos (page & yngwie)". Bars 9-20 are
// PHRASED, by what the lessons and the solos do:
//   - the song's ARRIVALS are where the bass moves: the bar line (16th 1 in the bars with a pickup bass
//     note) and 16th 9; the snare cracks on 16ths 4 and 12. A phrase starts AFTER an arrival, runs, and
//     LANDS on the next one on the new bass note's chord tone (D: D F A; C#: A G#; D#: A C; E: D G#),
//     often bent up from a step below, then holds with vibrato through the snare and stops (silence is
//     the punctuation: call, then response)
//   - Page: Stairway's solo is ONE two-bar phrase repeated with variation, and the bass here is a two-bar
//     cycle -- so the blues comes in two-bar pairs (9-10, 11-12, 13-14), each a call and a varied
//     answer, the same shape climbing; 13-14 add his repeated three-note cell (D C A) across the beat
//   - Yngwie: a held note with wide vibrato LAUNCHES each run (F5 in 17 and 18, D5 in 19); sweeps spell the
//     bar's chord; runs resolve on the downbeat (bar 18's C#5 -> 19's D5, the leading tone); and it ends
//     down the harmonic minor into the E7 (G#4 over the E, the dominant pulling to the top's A)
// longshred4: the previous take (stops by the bar).
const SHREDLINE5 = [...SHREDLINE3.slice(0, 8),
  'D5 - - - - . C5 D5 C5 A4 - - - . G4 G#4',
  '- ~A4 - - - . D5 C5 A4 G4 ~G#4 - - - . A4',
  'D5 - - - - . F5 D5 C5 A4 - - - . G#4 A4',
  'C5 ~D5 - - - . D5 C5 A4 C5 - - - . A4 C5',
  'F5 !D5 C5 A4 !D5 C5 A4 !D5 C5 A4 - - - . G4 G#4',
  '- ~A4 - - !C5 D5 F5 !D5 C5 A4 - - !G#4 A4 G4 A4',
  beats('D5 - - - - - C5 - - D5 - -', 'F5 D5 C5 D5 C5 A4 C5 A4 G#4 A4 C5 D5',
        'C5 A4 C5 G#4 ~A4 - - - - - - -', '- - - A4 C5 D5 C5 A4 C5 D5 F5 D5'),
  beats('C5 A4 C5 ~D5 - - - - - - - -', 'D5 C5 A4 G#4 A4 C5 D5 C5 A4 G#4 G4 F4',
        'G4 F4 G4 C5 - - - - - - A4 G#4', 'A4 C5 D5 C5 A4 G#4 G4 F4 D4 F4 . C#4'),
  beats('D4 F4 A4 D5 F5 - - - - - - -', '- - - A4 D5 C#5 D5 A4 D5 C#5 D5 A4',
        'D5 E5 F5 E5 - - - - - C#5 A#4 G4', 'E4 G4 A#4 C#5 E5 C#5 A#4 G4 E4 G4 A#4 C#5'),
  beats('A#4 C#5 E5 F5 - - - - - - - -', 'F5 E5 D5 C#5 D5 C#5 A#4 A4 A#4 A4 G4 F4',
        'E4 F4 G4 A4 - - - - - E4 G4 A#4', 'C#5 E5 C#5 A#4 G4 E4 G4 A#4 C#5 E5 D5 C#5'),
  beats('D5 - - - - - - - - A4 F4 D4', 'F5 D5 A4 F5 D5 A4 E5 D5 A4 E5 C#5 A4',
        'D5 A4 F4 D#4 A4 C5 - - - - - -', 'C5 A4 D#4 A4 C5 D#5 C5 A4 D#4 A4 C5 D5'),
  beats('D#5 C5 A4 G#4 - - - - - - - -', 'E4 G#4 D5 E5 - - - - - - D5 C5',
        'A4 G#4 A4 C5 - - - - - A4 C5 D#5', 'C5 A4 G#4 E4 F4 G#4 - - - - - -'),
];
// longshred: "as the yngwie part progresses the pauses and spaces can become fewer, culminating in a few
// bars of nonstop shred (the notes you have now are good), but ending on a destination note a bar before
// the loop and holding it until the loop" -- 24 bars, six passes. Yngwie runs 17-24: 17-18 as before
// (held launches, spaces); 19-20 the same notes with the holds cut to a beat or less; 21-23 NONSTOP
// (bar 17's sweep and pedal lick, bar 14's run and C# dim sweeps, bar 15's sequences and A dim sweeps,
// every arrival still on its chord tone); 24 the destination, bent up from G#4 on the downbeat and held
// the whole bar with vibrato -- a semitone off the top's A4 (DEST, below), so the loop is the release.
// longshred5: the 20-bar take.
const SHREDLINE = [...SHREDLINE5.slice(0, 18),
  beats('D5 - - A4 F4 D4 F4 A4 D5 A4 F4 D4', 'F5 D5 A4 F5 D5 A4 E5 D5 A4 E5 C#5 A4',
        'D5 A4 F4 D#4 A4 C5 - - - A4 C5 D#5', 'D#5 C5 A4 D#4 A4 C5 D#5 C5 A4 D#4 A4 C5'),
  beats('D#5 C5 A4 G#4 - - - - E4 G#4 D5 E5', 'D5 G#4 E4 G#4 D5 E5 - - - D5 C5 A4',
        'G#4 A4 C5 A4 C5 D#5 C5 A4 D#4 A4 C5 D#5', 'C5 A4 D#4 A4 C5 D#5 C5 A4 G#4 A4 C5 D5'),
  beats('D4 F4 A4 D5 F5 D5 A4 F4 D4 F4 A4 D5', 'A4 D5 C#5 D5 A4 D5 C#5 D5 A4 D5 E5 F5',
        'E5 D5 C#5 E5 C#5 A#4 G4 E4 G4 A#4 C#5 E5', 'C#5 A#4 G4 E4 G4 A#4 C#5 E5 C#5 A#4 G4 A4'),
  beats('A#4 C#5 E5 D5 A4 F4 D4 F4 A4 D5 F5 D5', 'F5 E5 D5 C#5 D5 C#5 A#4 A4 A#4 A4 G4 F4',
        'E4 F4 D4 C#4 E4 G4 A#4 C#5 E5 C#5 A#4 G4', 'E4 G4 A#4 C#5 E5 C#5 A#4 G4 E4 G4 A#4 C#5'),
  beats('D5 A4 F4 D4 F4 A4 D5 F5 D5 A4 F4 A4', 'F5 D5 A4 F5 D5 A4 E5 D5 A4 E5 C#5 A4',
        'D5 A4 F4 D#4 A4 C5 D#5 C5 A4 D#4 A4 C5', 'D#5 C5 A4 D#4 A4 C5 D#5 C5 A4 C5 A4 G#4'),
  // bar 24: the destination -- bent up from bar 23's G#4, held the whole bar. NOT the top's A4: "it should
  // be something that feels a bit of tension so that loop brings release". DEST: A#4 (default) is a
  // tritone over the E and falls a semitone to the top's A over the D (b6 -> 5, the minor sigh); G#4 is
  // the leading tone, E7's third, rising to it. (A4 was the first take: no pull.)
  ['~' + env('DEST', 'A#4'), ...Array(47).fill('-')].join(' '),
];
// THE USER'S LEAD (2026-10-24, music/lead-example.m4a: "check out the lead line ... and use that for the
// first section"): transcribed by pitch tracking (YIN, 10 ms frames; the level's 0.45 s dips are the
// synth's tremolo, not new notes; two sub-0.15 s blips an octave up were attack octave errors). It sits
// on our 16th grid (0.2 s) almost exactly: A held, G A# in 3+3; again; then a 3+3+2 3+3+2 bar (the
// bass's own grouping); A held, a breath. It replaces pass 1; longshred6 is the take before.
const USERLEAD = ['A4 - - - - - - - - - G4 - - A#4 - -', 'A4 - - - - - - - - - G4 - - A#4 - -',
  'A4 - - A#4 - - C5 - D5 - - A#4 - - C5 -', 'A4 - - - - - - - - - - - . . . .'];
const SHREDLINE6 = SHREDLINE;
// calm (2026-10-24): "a less intense version ... start with the same filtered pattern, then bring in the
// drums, then bring in the first lead part, but instead of going into the bluesy section, have it end on a
// long release note as we cut down to just the drums without bass, then after half a full bass pattern
// (with the bass muted and the lead having faded out) we go back to the very beginning". 14 bars, looping
// to bar 1: intro, drums, the user's lead (its last A4 held the whole bar), then two bars of drums alone
// -- the bass keyed off, the lead's A4 let go with release CALMREL (C: ~3 s, the two bars).
const CALM = env('LEAD', '') === 'calm';
const LEADS = {
  calm: [...USERLEAD.slice(0, 3), ['A4', ...Array(15).fill('-')].join(' '),
    ['^' + env('CALMREL', 'C'), ...Array(15).fill('.')].join(' '), Array(16).fill('.').join(' ')],
  longshred: [...USERLEAD, ...SHREDLINE6.slice(4)],
  longshred6: SHREDLINE6,
  longshred5: SHREDLINE5,
  longshred1: SHREDLINE1,
  longshred2: SHREDLINE2,
  longshred4: SHREDLINE4,
  longshred3: SHREDLINE3,
  longarp: ARPLINE,
  longblues: BLUES_LO,
  longbluesHi: BLUES,
  long: LONG,
  main: ['A4 - - - - - - - - - A#4 - - - G4 -', 'A4 - - - - - - - . . E5 - D5 - C#5 -',
         'D5 - - - - - - - - - - - E5 - D5 -', '- - - - - - - - . C5 A#4 A4 G4 F4 E4 G#4'],
  16: ['A4 - - - - A#4 - G4 A4 - - - - - - -', '. . . . D4 E4 F4 G4 A4 - - - A#4 A4 G4 E4',
       'A4 - - - - - - - - A#4 - - - - - -', '- B4 - - - - - - - A#4 - - - - G4 G#4'],
  beats: ['A4 - - - - - - - - - - - - - - -', '- - - - A#4 - - - - - - - G4 - - -',
          'A4 - - - - - - - - A#4 - - - - - -', '- B4 - - - - - - - A#4 - - - - G4 G#4'],
};
// a lead token: [!]note[chord] -- the chord, if any, an ARP of these semitone offsets
const ARPS = { m: [0, 3, 7], d: [0, 3, 6], M: [0, 4, 7], s: [0, 5, 7], m8: [0, 3, 7, 12] };
// ~A4 BENDS into the note: the slow glide, never picked -- in a fast bar, a held destination note pulled
// up to (the shred's ties are instant)
const ARPRE = /^(!?)(~?)([A-G][#b]?)(\d)(m8|m|d|M|s)?$/;
// LEADBARS: the line bar by bar -- a bar is 16 tokens (16ths), or 48: a FAST bar, three to a 16th (see
// SHRED). LEADLINE=... (bars split by '|', or every 16 tokens) overrides LEAD's.
const LEAD = env('LEAD', ''), LEADBARS = (process.env.LEADLINE ? process.env.LEADLINE.includes('|') ? process.env.LEADLINE.split('|')
  : process.env.LEADLINE.trim().split(/\s+/).join(' ').match(/(\S+\s*){1,16}/g) : LEADS[LEAD] ?? []).map(b => b.trim().split(/\s+/));
for (const [k, b] of LEADBARS.entries()) if (b.length !== 16 && b.length !== 48) throw new Error(`lead bar ${k + 1}: ${b.length} tokens, not 16 or 48`);
const LEADLINE = LEADBARS.flat();
if (LEAD && !LEADLINE.length) throw new Error(`LEAD ${LEAD}: ${Object.keys(LEADS).join(', ')} (or LEADLINE=...)`);
if (LEAD && V2) throw new Error('LEAD takes voice 2: drop V2');
let LEADI = {};
if (LEAD) {
  // note-independent speeds (left $80+): a semitone's width >> right, a tick. Glide: a semitone in
  // 2 ticks at 1, so a 16th's run still lands. Vibrato: direction every 5 ticks (~6 Hz), a 16th of a
  // semitone a tick (~+-15 cents), starting LVIBDELAY ticks into a note -- only the held ones get it
  // A 16th is 12 ticks, so at 1 a minor third (A-C, D-F: the pentatonic's gaps) slid for HALF the note --
  // through A# and B -- and the licks sounded out of the scale. A note one 16th long glides at GLIDEFAST
  // (0: a semitone a tick, a minor third in 3); a longer one keeps the slow, vocal slide
  const glide = add('speed', [[0x80, +env('GLIDESHIFT', 1)]]), glideFast = add('speed', [[0x80, +env('GLIDEFAST', 0)]]), vib = add('speed', [[0x85, +env('LVIBSHIFT', 4)]]);
  // SHRED (2026-10-24): "malmsteen-style scales and sweeps in rhythm with the song" -- a 48-token bar runs
  // the lead channel at its OWN tempo (F8x: this channel only), TEMPO/3 ticks a row: three notes to the
  // bass's 16th, ~15 a second. The first of each three is PICKED (struck: the song's 16th grid, the
  // rhythm); the other two are TIED (3XY 00, the pitch moves without an attack -- legato, and no hard
  // restart eating half a 4-tick note). 'shred' is the lead with a 1-tick hard restart, no vibrato.
  // a bend (~) has its own, slower speed: a quarter of a semitone a tick (BENDSHIFT 2) -- a string being
  // pushed, not a slide. Measured in the LAST STRUCK note's semitones, and a fast row's tick 0 is skipped,
  // so the whole step in bar 16 takes ~10 ticks (~170 ms) and then sits. (At 3 it took ~460 ms, the whole
  // held note: the destination never arrived.) Only when the line bends
  const bend = LEADLINE.some(t => t.includes('~')) ? add('speed', [[0x80, +env('BENDSHIFT', 2)]]) : glide;
  // VOLUME BY SUSTAIN: attack 0 and decay 0 reach the sustain level within a few ms, so the sustain
  // nibble is the voice's volume. "bring the volume of the lead line down to about half": sustain 5 (was
  // AD 29 SR a9 -- held at A), release kept. The shred voice and the arps share it. LAD/LSR override.
  LEADI = { glide, glideFast, bend, lead: { name: 'lead', ad: hexv('LAD', '00'), sr: hexv('LSR', '59'), wp: add('wave', [[0x41, 0x00], [0xff, 0x00]]),
    // a slow sweep, $300 up to ~$6f0 and back (8 a tick): moving under the held notes
    pp: add('pulse', [[0x83, 0x00], [0x7f, 0x08], [0x7f, 0xf8], at => [0xff, at + 1]]),
    fp: 0, vp: vib, vd: +env('LVIBDELAY', 20), gt: 0x02 } };
  // the arp chords: a wavetable cycling the chord's offsets ARPTICKS ticks each (1: Hubbard's frame-rate
  // shimmer, 20 Hz round a triad), the lead's envelope and pulse sweep, no vibrato (it would wobble the
  // shimmer). Only the chords the line uses are built.
  const at = +env('ARPTICKS', 1);
  for (const c of new Set(LEADLINE.map(t => ARPRE.exec(t)?.[5]).filter(Boolean))) {
    const wp = add('wave', [...ARPS[c].flatMap(o => [[0x41, o], ...waitF(at - 1)]), a => [0xff, a]]);
    LEADI['arp ' + c] = { ...LEADI.lead, name: 'arp ' + c, wp, vp: 0, vd: 0 }; }
  if (LEADBARS.some(b => b.length === 48)) LEADI['arp shred'] = { ...LEADI.lead, name: 'shred', ad: hexv('SHAD', '00'), gt: 0x01,
    // the lead's vibrato only when SHREDVIB (longshred): the held destination notes sing; the runs stay
    // clean anyway (a tie's row carries a 3XY, which holds the instrument vibrato off)
    ...env('SHREDVIB', ['longshred', 'longshred4', 'longshred5', 'longshred6'].includes(LEAD) ? '1' : '0') === '1' ? {} : { vp: 0, vd: 0 } };
}
// the sweep: set $x00, up for 127 ticks, down for 127, round again -- ~8.5 s a cycle
const PULSE = add('pulse', [[0x80 | PW_LO, 0x00], [0x7f, PW_SPD], [0x7f, -PW_SPD & 0xff], at => [0xff, at + 1]]);
// low-pass ($10 in the type bits), resonance FRES, all three voices routed (the bass came out and went back
// in: "nah, bass back in the filter"); then the cutoff; then stop
const FILT = add('filt', [[0x90, FRES << 4 | 0x07], [0x00, FCUT], [0xff, 0x00]]);

// Every strike sets the filter (fp: static, so re-applying it is harmless -- an AXY on a later row left
// the very first strike unfiltered). The pulse sweep must NOT restart at every strike, so only each
// voice's first note of the loop starts it ('Tone start'); the rest leave it running ('Tone'). That also
// frees row 0 of every channel from commands but the tempo.
const INSTR = [
  { name: 'Tone', ad: DYAD_AD, sr: DYAD_SR, wp: WAVE, pp: 0, fp: FILT, gt: DYAD_GT },
  { name: 'Tone start', ad: DYAD_AD, sr: DYAD_SR, wp: WAVE, pp: PULSE, fp: FILT, gt: DYAD_GT },
  { name: 'Bass', ad: DYAD_AD, sr: DYAD_SR, wp: BWAVE, pp: 0, fp: FILT, gt: DYAD_GT },
  { name: 'Bass start', ad: DYAD_AD, sr: DYAD_SR, wp: BWAVE, pp: PULSE, fp: FILT, gt: DYAD_GT },
  ...DYAD_STAG ? [{ name: 'Tone hi', ad: DYAD_AD, sr: DYAD_SR, wp: toneWave(DYAD_STAG), pp: 0, fp: FILT, gt: DYAD_GT },
                  { name: 'Tone hi start', ad: DYAD_AD, sr: DYAD_SR, wp: toneWave(DYAD_STAG), pp: PULSE, fp: FILT, gt: DYAD_GT }] : [],
  ...Object.entries(RHYI).filter(([nm]) => nm !== 'V2VIB').map(([nm, x]) => ({ name: nm, ...x })),
  ...Object.values(DRUMI),
  ...LEAD ? Object.entries(LEADI).filter(([k]) => k === 'lead' || k.startsWith('arp ')).map(([, x]) => x) : [],
  ...SYL ? Object.entries(SYLS).map(([nm, x]) => ({ name: nm, ...x, gt: DYAD_GT })) : [],
];
const I = Object.fromEntries(INSTR.map((x, k) => [x.name, k + 1]));
const ins = (hi, first) => I[`Tone${hi && DYAD_STAG ? ' hi' : ''}${first ? ' start' : ''}`];

// ---- patterns: a bar is 16 rows (8 steps of 2) ----
const P = [];
const pat = (events, len = 16) => { const r = [...Array(len)].map(() => [REST, 0, 0, 0]);
  for (const [row, note, i = 0, cmd = 0, data = 0] of events) r[row] = [note === null ? REST : note, i, cmd, data];
  // an identical bar already written is reused: the orderlist names it again (the drums' one bar was
  // four copies -- ~100 bytes packed)
  const key = JSON.stringify(r), had = P.findIndex(p => p.length === len + 1 && JSON.stringify(p.slice(0, len)) === key);
  if (had >= 0) return had;
  P.push([...r, [0xff, 0, 0, 0]]); return P.length - 1; };
const step = s => (s - 1) * 2;                         // the sketch's step 1-8 -> its row

// the bass: [step 1, step 4, step 6]; bar 1 carries the tempo
const BARS = [['D', 'D', 'Db'], ['D', 'D', 'Db'], ['D', 'D#', 'D#'], ['E', 'E#', 'E#']];
// SYL: every row of the bar speaks; the pitch is the written note sounding there (a change on rows 0/6/10)
const sylBar = (b, bar, first) => { const at = { [step(1)]: b[0], [step(4)]: b[1], [step(6)]: b[2] };
  const ev = []; let nt;
  for (let r = 0; r < 16; r++) { const change = r in at; if (change) nt = n(at[r], BASS_OCT);
    const k = bar * 16 + r; if (k % SYL_ROWS) continue;
    let sy = PHRASE[(k / SYL_ROWS) % PHRASE.length]; if (sy === 'ah' && change) sy = 'ak';
    const tempo = first && r === 0 ? [CMD_TEMPO, TEMPO_T] : [];
    if (sy === 'ah' && !tempo.length) ev.push([r, null, 0, 0x8, AH.wp]);
    else ev.push([r, nt, I[sy === 'ah' ? 'ak' : sy], ...tempo]); }
  return pat(ev); };
const bassBar = (b, first, bar) => SYL && BASS ? sylBar(b, bar, first) : pat(BASS ? [
  [step(1), n(b[0], BASS_OCT), I[first ? 'Bass start' : 'Bass'], ...(first ? [CMD_TEMPO, TEMPO_T] : [])],
  [step(4), n(b[1], BASS_OCT), I.Bass], [step(6), n(b[2], BASS_OCT), I.Bass]]
  : first ? [[0, null, 0, CMD_TEMPO, TEMPO_T]] : []);
// a strike every DYAD_STEP rows; the wavetable lets it go DYAD_HOLD ticks in, and it releases from there
const dyadBar = (nm, hi, first) => pat([...Array(16 / DYAD_STEP)].map((_, k) => [k * DYAD_STEP, n(nm, DYAD_OCT), ins(hi, first && !k)]));
// RHY: bar k of the sketch, a strike every row
// v2: voice 2's copy (its instruments, an octave down for sub, the vibrato for chorus, V2DELAY rows late
// for echo -- the loop rotated, so the echo of the last 16th lands on the first)
// k counts bars over the whole LINE (4 with BASS2), so the echo of the loop's last 16th lands on its first
const rhyBar = (k, v2 = false, intro = false) => pat([...Array(16)].map((_, r) => { const L = LINE.length;
  const g = (k * 16 + r - (v2 && V2 === 'echo' ? V2_DELAY : 0) + L) % L, i = g % RHYTHM.length, c = RHYTHM[i];
  const nm = LINE[g];
  if (c !== 'd' && c !== 'x') throw new Error(`RHYTHM: '${c}' is not d or x`);
  let run = 0; while (run < i && RHYTHM[i - 1 - run] === 'd') run++;     // this d's place in its run, 0-based
  const q = DSEQ[[...RHYTHM.slice(0, i)].filter(x => x === 'd').length % DSEQ.length];   // the d's before it pick its turn
  const ins = I[(c === 'd' ? `d${q}${ACC.includes(run + 1) ? '!' : ''}` : c) + (v2 ? '~' : '') + (intro ? '_' : '')]; if (!ins) throw new Error(`DSEQ: no d program ${q}`);
  const cmd = v2 ? RHYI.V2VIB ? [0x4, RHYI.V2VIB] : [] : !k && !r ? [CMD_TEMPO, TEMPO_T] : [];
  return [r, n(nm, BASS_OCT) - (v2 && V2 === 'sub' ? 12 : 0), ins, ...cmd]; }));
// voice 3's drums: bar k of DRUMLINE (it repeats over the bass's bars)
const drumBar = k => pat([...Array(16)].map((_, r) => DRUMLINE[(k * 16 + r) % DRUMLINE.length]).flatMap((c, r) =>
  c === '.' ? [] : [[r, n('C', 4), I[DRUMI[c].name]]]));
// voice 2's lead: bar k of LEADLINE (repeating over the bass's bars)
// prev: '.' while silent, else sounding. The loop's top always STRIKES: the first time through nothing is
// sounding to glide from (a 3XY from silence never gates on), and the re-attack marks the top after
// THE GLIDE ONLY LASTS ITS ROW: GoatTracker cancels a 3XY on the next row whose command column is empty
// (gplay.c: CMD_DONOTHING sets command 0), so a slide that hasn't arrived in its first 16th STOPS where
// it is and the rest of the note holds that pitch -- "notes held on notes outside the pentatonic to the
// point it just sounded out of tune". And the speed is a semitone's width at the LAST STRUCK note (a
// glide never restarts the wavetable, which is what sets lastnote), so after a chain of glides up, every
// semitone takes longer. So the line is SIMULATED with the player's own arithmetic, tick by tick, and the
// 3XY is carried onto the held rows until the pitch arrives. LEADAUDIT=1 prints what the uncarried
// glides did (the bug).
const leadRows = carry => { const rows = [], stuck = [];
  // the NTSC-retuned frequency table (-G423.87): note 0 = C-0, A-4 = 57
  const fq = k => Math.round(423.87 * 2 ** ((k - 57) / 12) * 16777216 / 985248);
  const fast = b => LEADBARS[(b + LEADBARS.length) % LEADBARS.length].length === 48;
  let arp = false, sounding = false, freq = 0, last = 0, target = 0, spd = 0, sinceNote = 0, noteAt = '';
  for (let b = 0; b < LEADBARS.length; b++) { const bar = LEADBARS[b], F = fast(b), tpr = F ? TEMPO_T / 3 : TEMPO_T, out = [];
    // a change of speed (or a fast first bar) sets this channel's tempo on row 0 -- which then can't
    // hold a 3XY, so its note strikes
    const tempo = F !== fast(b - 1) ? [0xf, 0x80 | tpr] : null;
    for (let r = 0; r < bar.length; r++) { const t = bar[r]; let ev = null; const nextT = bar[r + 1] ?? LEADBARS[(b + 1) % LEADBARS.length][0];
      if (t === '.') { if (sounding) ev = [0xbe]; sounding = false; spd = 0; }
      else if (/^\^[0-9A-F]$/i.test(t)) { if (sounding) ev = [0xbe, 0, 0x6, (LEADI.lead.sr & 0xf0) | parseInt(t[1], 16)]; sounding = false; spd = 0; }
      else if (t === '-') { if (sounding && spd && freq !== target && carry) ev = [REST, 0, 0x3, spd]; else if (!carry) spd = 0; sinceNote++; }
      else { const m = ARPRE.exec(t); if (!m) throw new Error(`LEADLINE: '${t}'`);
        const nt = n(m[3], +m[4]), k = nt - 0x60;
        if (sounding && freq !== target && sinceNote > 1) stuck.push({ at: noteAt, t: noteT, cents: Math.round(1200 * Math.log2(freq / target)), rows: sinceNote });
        const pick = F && r % 3 === 0 && !m[2], strike = !sounding || m[1] || arp || pick || (tempo && !r);
        // an arp always strikes (its own wavetable); so does the note after one -- a glide's frequency would
        // fight the arp's wavetable, which keeps writing it
        if (m[5]) { ev = [nt, I['arp ' + m[5]]]; freq = fq(k); last = k; spd = 0; arp = true; }
        else if (strike) { ev = [nt, I[F ? 'shred' : 'lead']]; freq = fq(k); last = k; spd = 0; arp = false; }
        else if (F && !m[2]) { ev = [nt, 0, 0x3, 0]; freq = fq(k); spd = 0; }     // tied: the pitch, no attack
        else { spd = m[2] ? LEADI.bend : nextT !== '-' ? LEADI.glideFast : LEADI.glide; ev = [nt, 0, 0x3, spd]; }
        target = fq(k); sounding = true; sinceNote = 1; noteAt = `bar ${b + 1} row ${r}`; var noteT = t; }
      // ticks 1..tpr-1 of this row (tick 0's realtime effects are skipped: GoatTracker's default -R)
      if (spd && ev?.[2] === 0x3) for (let tk = 1; tk < tpr; tk++) {
        const v = (fq(last + 1) - fq(last)) >> T.speed[spd - 1][1];
        if (freq < target) freq = Math.min(target, freq + v); else if (freq > target) freq = Math.max(target, freq - v); }
      if (tempo && !r) { if (ev?.[2] === 0x3) throw new Error(`lead bar ${b + 1}: row 0 needs the tempo AND a glide`); ev = [...(ev ?? [REST]), ...(ev?.length > 1 ? [] : [0]), ...tempo]; }
      out.push(ev); }
    rows.push(out); }
  return { rows, stuck }; };
const LEADROWS = LEAD ? leadRows(true).rows : [];
if (LEAD && env('LEADAUDIT', '0') === '1') for (const [what, s] of [...leadRows(false).stuck.map(s => ["BUG", s]), ...leadRows(true).stuck.map(s => ["FIXED", s])])
  console.log(`  ${what} ${s.at}: ${s.t} held ${s.rows} rows ${s.cents > 0 ? '+' : ''}${s.cents} cents off`);
const leadBar = k => { const rows = LEADROWS[k % LEADROWS.length]; return pat(rows.flatMap((ev, r) => ev ? [[r, ...ev]] : []), rows.length); };
// the song is as long as the longer of the bass's LINE and the lead; the bass and drums repeat under it
if (LEAD && !CALM && LEADBARS.length * 16 % LINE.length) throw new Error(`lead: ${LEADBARS.length} bars is not whole passes of the bass's ${LINE.length / 16}`);
const RBARS = [...Array(Math.max(LINE.length / 16, LEAD ? LEADBARS.length : 0)).keys()];
// with INTRO each channel opens on the two intro passes (8 bars) and restarts after them
const IBARS = [...Array(INTRO ? LINE.length / 16 : 0).keys()], RESTART = CALM ? 0 : 2 * IBARS.length;
const ORDER = CALM ? (() => { const e = pat([]), lead = LEADROWS.map((_, k) => leadBar(k)), tail = lead.length - 4;
  return [
    // bass: the intro, the drums' pass, the lead's pass, then keyed off (its sustain-F note would ring on)
    [...IBARS.map(k => rhyBar(k, false, true)), ...IBARS.map(k => rhyBar(k, false, I_DRUMS)), ...IBARS.map(k => rhyBar(k)), pat([[0, 0xbe]]), ...Array(tail - 1).fill(e)],
    [...IBARS.map(() => e), ...IBARS.map(() => e), ...lead],
    [...IBARS.map(() => e), ...[...IBARS, ...IBARS, ...Array(tail).keys()].map(drumBar)]]; })() : [
  RHY ? [...IBARS.map(k => rhyBar(k, false, true)), ...IBARS.map(k => rhyBar(k, false, I_DRUMS)), ...RBARS.map(k => rhyBar(k))] : BARS.map((b, k) => bassBar(b, !k, k)),
  ...[['G', false], ['Bb', true]].map(([nm, hi]) => { if (RHY && V2 && !hi) return RBARS.map(k => rhyBar(k, true));
    if (DRUMS && hi) return [...IBARS.map(() => pat([])), ...IBARS.map(drumBar), ...RBARS.map(drumBar)];
    if (LEAD && !hi) return [...IBARS.map(() => pat([])), ...IBARS.map(() => pat([])), ...RBARS.map(leadBar)];
    if (!DYAD) { const e = pat([]); return [e, e, e, e]; }
    const rest = dyadBar(nm, hi, false); return [dyadBar(nm, hi, true), rest, rest, rest]; }),
];

// ---- the .sng (GoatTracker 2 "GTS5") ----
const b = [];
const str = (s, len) => { for (let k = 0; k < len; k++) b.push(k < s.length ? s.charCodeAt(k) : 0); };
str('GTS5', 4); str('G Bb', 32); str('', 32); str('', 32);
b.push(1);                                             // one subtune
for (const o of ORDER) b.push(o.length + 1, ...o, 0xff, o.length > RESTART ? RESTART : 0);   // loop to the top (or past the intro)
b.push(INSTR.length);
// 1st-frame wave $08 (test bit, gate OFF): see song-deep.mjs -- $09 clicks on a 6581
for (const i of INSTR) { b.push(i.ad, i.sr, i.wp, i.pp, i.fp, i.vp ?? 0, i.vd ?? 0, i.gt ?? 0x02, 0x08); str(i.name, 16); }
for (const t of ['wave', 'pulse', 'filt', 'speed']) b.push(T[t].length, ...T[t].map(r => r[0]), ...T[t].map(r => r[1]));
b.push(P.length);
for (const p of P) { b.push(p.length); for (const row of p) b.push(...row); }
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, Buffer.from(b));
console.log(`${OUT}: ${b.length} bytes, ${P.length} patterns, ${RHY ? ORDER[0].length : 4} bars${RESTART ? ` (looping from bar ${RESTART + 1})` : ""} x 16 rows at tempo ${TEMPO_T} (~${Math.round(3600 / (TEMPO_T * 4))} BPM)`);
