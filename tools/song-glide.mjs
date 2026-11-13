// song-glide.mjs -- "Glide": slow pulse chords that slide into each other, written as a GoatTracker 2 song.
//
//   node tools/song-glide.mjs [out.sng]        (default music/glide.sng)
//
// The brief (2026-10-30): the user liked the first 30 s of "I Pushed the C64 SID to Its LIMITS!!"
// (music/, a SID used as a synth): F minor, a chord every ~3.7 s, pulse waves swept about once a second,
// whole voices gliding slowly from one chord to the next. "I want the musical variety of major instead of
// minor and yet this opening 30 seconds doesn't sound overly cheery ... keep it in a similar musical space
// but not use the exact chords or timing", in three voices.
//
// Take 1 (music/glide-v1.sng) was D major made dark -- thirds left out, borrowed Bb/F/C, semitone slides
// DOWN, all low through a slow low-pass. The user: "sounds much darker than what I showed you -- feels like
// a minor song? also the filtering is too much ... move in the direction of the file I showed you, which
// was brighter", and "don't try to make this sound like the other songs ('jonathan likes slow, deep
// filters') ... this is hopefully going to sound like something else". The source's chords are mostly
// full MAJOR triads (Bb Eb Db Ab C) over a minor home, bright unfiltered pulses. So take 2 turns that
// round: a MAJOR home (E) whose colour comes from its other chords, all full triads --
// - F#/E: the Lydian II over the held E, a lift rather than a cadence;
// - C#m and G#m, the relative minors, between the majors;
// - Am, the one borrowed chord: A major's C# sliding down to C, bittersweet, then back up to C# for F#m;
// - B arrives suspended (E over B) and resolves late, by a glide.
// Unfiltered (FILT=1 brings the low-pass back), quick attacks, the pulse sweeps wider (brighter), and a
// gentle vibrato on the two upper voices once a struck note has sounded half a second (the source's
// last chords waver).
// Take 1 again: CHORDS='36 D2 A3 E4 / 24 = Bb3~.8 F4~.8 / 24 B1~.6 B3~.5 G4~.7 / 24 E2 = F#4~.6 / 36 F2~.4
// A3 F4~.7 / 24 C2 G3~.6 E4 / 24 G1 A3 D4~.8 / 36 A1~.5 D4~1.2 E4 @18 - C#4~1 - / 0 D2 A3~1 =' BASSAD=59
// BASSSR=b9 PADAD=a9 PADSR=aa BASSPW=300,32,24 PADAPW=280,24,30 PADBPW=300,20,39 FILT=1 VIB=0.
//
// Voices: 1 bass (pulse), 2 and 3 upper voices (pulse). Each pulse width sweeps up and back at its own
// rate -- ~1.2 s, ~1.0 s, ~0.9 s -- so the three beat against each other: the "pulse waves swept about
// once a second".
//
// GLIDES. A pattern's 3xy toneportamento lasts only its row (the next empty row cancels it and the pitch
// stays mid-slide: goattracker.md's GLIDE TRAP), so each glide runs from the WAVETABLE as in
// song-hub.mjs: a toneportamento step that jumps to itself, every frame, toward the voice's note. The row
// before the glide points the wavetable at it (8xy), the glide's row sets the new note with 3xy (no
// re-strike). The next struck note resets the wavetable to the instrument's own program.
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const OUT = process.argv[2] ?? 'music/glide.sng';
const env = (k, d) => process.env[k] ?? d;
const hexv = (k, d) => parseInt(env(k, d), 16);

// a row is TEMPOT ticks: 10 = a sixth of a second at 60 Hz (the chords' lengths below are in rows)
const TEMPO_T = +env('TEMPOT', 10), ROW_S = TEMPO_T / 60;
// CHORDS: one chord per `/`: `rows bass padA padB [@row bass padA padB]...`. A note strikes, `note~secs`
// glides there over secs, `=` (or `-` after an @) holds, `.` lets the note go (key off), `vib` wavers it
// from that row to the chord's end. The song starts by striking chord 1's notes; the
// loop comes back to chord 1 as written (its glides from the last chord).
// SOURCE (music/glide-source.sng, "just for fun, can you recreate the chord progression of the file i sent you
// exactly?"): the source's first 30 s on its own timing, rows of a tenth of a second (TEMPOT=6). Take 2 of
// it (2026-10-30, "verify against the original ... all the glides, transition notes, and overall chord
// structure"), re-measured with quarter-second pitch tracks: the opening slide is the F3 voice going up an
// OCTAVE, C4 steps to D4 a bar early (3.15 s), the bass arrives at 4.0, the slide into Bb is Eb3 -> F4,
// the Ab chord at 18.6 is really an Eb SUS4 that resolves Ab -> G at 20.2, the Csus4 slide starts 22.3 with the
// vibrato from 23.4, and C lands at 25.7. Three voices can't hold every line, so the voices SWAP ROLES
// (voice 2 carries the bass from 4.0; voice 1 is the slider). Left out: the noise burst at 8 s, the doubled
// octaves, the fast pulse flutter on the Bb3/Ab3 line.
// Take 3 (current): "this vibrato depth is off the charts ... turn it off entirely? maybe the movement is
// just the pulse modulation. And for that I'd say slow it down to a full sweep every 2 seconds":
//   TEMPOT=6 VIB=0 BASSPW=400,14,60 PADAPW=180,18,60 PADBPW=200,18,60 CHORDS='40 F3 Ab3 C4 @17 F4~.55 - -
//   @31 - - D4 / 40 = Bb2 = @20 F3~.6 - - / 19 F4 . Ab4 / 16 Eb3 Eb2 G4 @9 F4~.6 - - / 40 = Bb2 D4 @31 F3~.6 - - /
//   31 = Db2 Db4 / 37 Ab3 Eb3 Eb4 @16 G3~.2 - - / 34 C4~.45 G3~.45 F4~.45 / 43 G3 C3 E4 / 0 F3 Ab3 C4'
// The offset version (music/glide-source-offset.sng): take 3 with the sweeps at 1.9 / 2.0 / 2.1 s, so the
// voices drift against each other: BASSPW=400,15,57 PADAPW=180,18,60 PADBPW=200,17,63.
// "offset adds a nice subtle depth. Can we try adding a subtle low-pass with some resonance sweeping over 4
// seconds or so?": the offset version + FILT=1 FRES=8 FLO=50 FHI=90 FCYCLE=4 (music/glide-source-filt-v1.sng);
// then "cutoff too low -- bring it up so it's only trimming the highest harmonics": FLO=a0 FHI=e0
// (music/glide-source-filt-v2.sng). Then "I actually meant to have resonance sweep originally, not cutoff
// ... fix the cutoff at $c0 and sweep resonance": FCUT=c0 RSWEEP=2,e (music/glide-source-filt-v3.sng). Then
// "Add in a $B0-$D0 filter cutoff sweep as well, slow, your choice": CSWEEP=b0,d0,16, the cutoff up and back
// over 16 s, four resonance cycles (music/glide-source-filt.sng).
// Take 2 (music/glide-source-v2.sng) = take 3 with VIB=8,3,6, the default sweeps, and `@11 vib vib vib` on the
// Csus4 chord.
// Take 1 (music/glide-source-v1.sng): TEMPOT=6 CHORDS='37 F3 Ab3 C4 @17 - - F4~.7 / 43 Bb2 D4 = @27 - - F3~.6 /
//   19 . F4 Ab4 / 20 Eb2 Bb3 G4 @7 - D4~1.3 - / 40 Bb2 = F4 @29 - - F3~.8 / 30 Db2 Ab3 = / 35 Eb2 = Eb4 @15 - Bb3 - /
//   35 G2~.5 C4~.5 F4~.5 / 41 C3 G3 E4 / 0 F3 Ab3 C4'
// SPELL (music/glide-spell.sng): "use music theory to capture what's cool about this progression and make
// something that casts a similar spell. Keep the idea of glides and ghost notes at roughly this pace ...
// some sus4 chords. Maybe a 2nd ... the balance of major chord resolutions and minor tensions". What the
// source does, kept here in D minor (Dorian):
// - a MINOR home whose other chords are nearly all MAJOR (IV G Dorian, bVII C, bIII F, V A): the tonic
//   supplies the tension, every other chord a little light;
// - roots climbing by fourths in places (C -> F, Gm -> C), the plagal pull, not V -> I;
// - GHOST GLIDES: a voice slides an OCTAVE on a note the next chord keeps (D3 -> D4 over Dm, D4 -> D3 over
//   G, A3 -> A2 over F) -- movement with no change of harmony; and one long slide UP into a chord (C3 -> A3
//   over the short C, like the source's Eb3 -> F4);
// - an early step that leans into the next chord (F4 -> E4 at 3.1 s, the 2nd over Dm);
// - sus4s that resolve to MAJOR by a short glide (Csus4 -> C), and the whole chord sliding up into the
//   last one, D3 A4 E4: Asus4 and Dsus2 at once, before A major ends it on the dominant, C# the one bright
//   leading note, pulling back to Dm.
// New against the source: the 2nds (Dm add9, the D4 + E4 cluster in the break, the Dsus2/Asus4), Gm (iv)
// as the one minor chord in the middle, and the order and lengths.
//   FILT=1 FTYPE=lp FMASK=7 RSWEEP=2,e CSWEEP=b0,d0,16 FCYCLE=4 TEMPOT=6 VIB=0 BASSPW=400,15,57
//   PADAPW=180,18,60 PADBPW=200,17,63 CHORDS='42 D3 D2 F4 @18 D4~.55 - - @31 - - E4 / 38 = G2 B3 @20 D3~.6 - - /
//   18 D4 . E4 / 14 C3 C2 = @8 A3~.6 - - / 38 = F2 C4 @29 A2~.6 - - / 32 Bb2 G2 D4 / 38 F3 C3 G4 @18 E3~.2 - - /
//   36 E4~.45 D3~.45 A4~.45 / 44 C#4 A2 E4 / 0 D3 D2 F4'   (Dm  G  (D+E)  C  F  Gm  Csus4 -> C  Asus4  A)
// (that is take 1, music/glide-spell-v1.sng.) Take 2, "add a slide between DAE and A major. Maybe an extra
// ghost note or two?": the sus slides DOWN into A (E4 -> C#4, D3 -> A2, A4 held: the sus4's D sinking to
// the bass), and two more octave ghosts, Bb2 -> Bb3 over Gm and A4 -> A3 over A -- the same CHORDS with
//   '32 Bb2 G2 D4 @15 Bb3~.5 - -' and '44 C#4~.5 A2~.5 = @24 - - A3~.6' (music/glide-spell-v2.sng).
// Take 3: "the glide just before the break (D+E) should be a regular note": G's D4 -> D3 is struck,
//   '38 = G2 B3 @20 D3 - -' (music/glide-spell-v3.sng). Take 4: "the glide just before it loops should be a
// regular note": A's A4 -> A3 is struck, '44 C#4~.5 A2~.5 = @24 - - A3' (music/glide-spell-v4.sng).
// Take 5: "switch the glide at 0:14 to a regular note": F's A3 -> A2 is struck, '38 = F2 C4 @29 A2 - -'
// (music/spell.sng, LOCKED: "This is great ... Lock this in"), with:
//   SPELL = FILT=1 FTYPE=lp FMASK=7 RSWEEP=2,e CSWEEP=b0,d0,16 FCYCLE=4 TEMPOT=6 VIB=0 BASSPW=400,15,57
//           PADAPW=180,18,60 PADBPW=200,17,63
//   CHORDS='42 D3 D2 F4 @18 D4~.55 - - @31 - - E4 / 38 = G2 B3 @20 D3 - - / 18 D4 . E4 / 14 C3 C2 = @8 A3~.6 - - /
//   38 = F2 C4 @29 A2 - - / 32 Bb2 G2 D4 @15 Bb3~.5 - - / 38 F3 C3 G4 @18 E3~.2 - - / 36 E4~.45 D3~.45 A4~.45 /
//   44 C#4~.5 A2~.5 = @24 - - A3 / 0 D3 D2 F4'
//
// SPELL'S VARIANTS -- the ones the user kept (2026-10-31, "these are the only ones that matter now, after
// having listened to them all"; the rest were deleted). All but spell.sng are on the ALIGNED grid:
//   ALIGNED = TEMPOT=6 VIB=0 BASSPW=400,15,57 PADAPW=180,18,60 PADBPW=200,17,63 GLIDEFIRST=1
//   CA='40 D3 D2 F4 @15 D4~.5 - - @30 - - E4 / 40 = G2 B3 @20 D3 - - / 20 D4 . E4 / 20 C3 C2 = @15 A3~.5 - - /
//   40 = F2 C4 @30 A2 - - / 40 Bb2 G2 D4 @15 Bb3~.5 - - / 35 F3 C3 G4 @15 E3~.2 - - / 40 E4~.5 D3~.5 A4~.5 /
//   45 C#4~.5 A2~.5 = @25 - - A3 / 0 D3 D2 F4'
// - music/spell-aligned.sng: "make it fit a grid, so every chord changes on quarter note, big changes on 1
//   or 3, glides starting on 2 or 4". 120 BPM, a beat = 5 rows (0.5 s), 16 bars = 32 s; every slide a beat
//   long on a 2 or 4; the two chords that arrive BY a slide (D A E, A) change on the 4 before, so the slide
//   lands on the 1. C is a bar and Gm two ("right after the break D+E sounds like it's missing a couple
//   beats" with a 2-beat C). GLIDEFIRST=1 starts each slide ON its row. The user can't hear it from
//   spell.sng's free time. ALIGNED + FILT=1 FTYPE=lp FMASK=7 RSWEEP=2,e FCYCLE=4 CSWEEP=b0,d0,16, CHORDS=CA
// - music/spell-aligned-arp-tri.sng: triangle arps in 8ths on the top voice, starting with their notes on
//   the grid; Chu-ka-Ti-ka noise in 8ths on the bass, two octaves deep; the sweep $20 lower; the filter
//   opening from $00 at the very start ("combined with the triangle arpeggios i think it's great"). An arp
//   changes only on its own 2-beat cycle (Csus4's change waits for the 1, "it changes the pattern before
//   it should"), and the new arps of D A E and A start where their slides land. ALIGNED + ARPSAME=1 ARPT=15
//   ARPDIR=down RHYTHM=2:CkTk RHYTHMBEAT=0.25 WAVES=p,p,t HITDROP=24 FILT=1 FTYPE=lp FMASK=7 RSWEEP=2,e
//   FCYCLE=4 CSWEEP=90,b0,16 FADEIN=0.4, CHORDS='40 D3 D2 F4^4,9 @15 D4~.5 - - @30 - - E4^5,10 /
//   40 = G2 B3^3,8 @20 D3 - - / 20 D4 . E4^5,10 / 20 C3 C2 =^3,8 @15 A3~.5 - - / 40 = F2 C4^5,9 @30 A2 - - /
//   40 Bb2 G2 D4^5,8 @15 Bb3~.5 - - / 35 F3 C3 G4^5,10 @15 E3~.2 - - @20 - - =^5,9 /
//   40 E4~.5 D3~.5 = @5 - - A4^5,7 / 45 C#4~.5 A2~.5 = @5 - - =^4,7 @25 - - A3^4,7 / 0 D3 D2 F4^4,9'
// - music/spell-tri-bp.sng: all triangles through a band-pass sweeping $10..$70 over 8 s, no resonance (the
//   SID's band-pass has no width control -- resonance IS its narrowness, so at 0 the band is broad).
//   ALIGNED + WAVES=t,t,t FILT=1 FTYPE=bp FRES=0 FMASK=7 FLO=10 FHI=70 FSTEP=2 FCYCLE=8, CHORDS=CA.
//   The user's notes on it: "try without filter" -> music/spell-tri.sng (ALIGNED + WAVES=t,t,t); "try with
//   high pass cutoff sweep" -> music/spell-tri-hp.sng (FTYPE=hp FLO=08 FHI=48, the rest as tri-bp)
// - music/spell-lowbass.sng: the bass an octave lower; the two upper voices' sustain halved ("the sustain
//   trick"); an aggressive low-pass sweeping $30..$60 at low resonance, to soften with less distortion.
//   ALIGNED + VOCT=0,-1,0 BASSSR=69 PADBSR=59 FILT=1 FTYPE=lp FRES=2 FMASK=7 FLO=30 FHI=60 FSTEP=2 FCYCLE=16
// - music/spell-beatfilt.sng: "a hard lowpass timed to the beat ... $20 to $80 in swells every 2 beats, the
//   peaks on 1 and 3". ALIGNED + FILT=1 FTYPE=lp FRES=c FMASK=7 BEATSWEEP=20,80, CHORDS=CA
// - music/spell-robin.sng: every voice walks its own looping waveform series -- prime lengths 7, 11, 13, so
//   they never line up the same way in the song ("if each voice has a different length pattern then they
//   overlap in different ways") -- one change every half beat, one voice at a time, round robin ("it gets
//   the vibe across without being too harsh"). ALIGNED + FILT=1 FTYPE=lp FMASK=7 RSWEEP=2,e FCYCLE=4
//   CSWEEP=b0,d0,16 BEATCYCLE=7,11,13 ROBIN=1, CHORDS=CA
// - music/spell-lead-a.sng (2026-10-31; take B, music/spell-lead-b.sng, was dropped): arp-tri with its top voice a LEAD
//   line instead ("a 3-6 note run then holds a key note ... before rhythmically anticipating the upcoming
//   chord change with a new run ... scale notes ... approach it as a classical guitar player"). Two 8-bar
//   phrases, the first peaking on A5 over the break, the second on the Csus4's F5 (a 4-3 suspension slurred
//   to E5 with the slider) and sinking to C#5, the leading note, over A; held notes are chord tones, the
//   runs' passing notes D Dorian (Bb over Gm, A Bb C# D E over A). A: the runs land ON the change.
//   B: they arrive an 8th early and hold over it, with triplet turns. ALIGNED + RHYTHM=2:CkTk RHYTHMBEAT=0.25
//   WAVES=p,p,t HITDROP=24 FILT=1 FTYPE=lp FMASK=7 RSWEEP=2,e FCYCLE=4 CSWEEP=90,b0,16 FADEIN=0.4, CHORDS=CA,
//   LEAD='F5:4 E5 D5 ~C5 D5 | A4:4 G4 A4 B4 C5 | D5:3 ~C5 B4:4 | B4:3 G4 A4 B4 C5 D5 | E5:3 F5 G5 A5:2 G5 |
//   G5:3 F5 E5 D5 C5 B4 | A4:4 C5 A4 F4 G4 | A4:3 C5 D5 E5 F5 E5 | D5:4 ~C5 Bb4 A4 Bb4 | Bb4:3 A4 Bb4 C5 D5 E5 |
//   F5:6 ~E5:2 | E5:3 G5 F5 E5 D5:2 | E5:4 D5 E5 ~D5 A4 | A4:3 B4 C5 D5 E5 D5 | C#5:4 D5 E5 F5 E5 |
//   E5:3 A4 Bb4 C#5 D5 E5 |' (A); B = 'F5:3 E5:1t F5:1t E5:1t D5:2 A4 | D5:3 C5 B4 A4 G4 B4 | -:3 C5 D5 E5 D5 B4 |
//   G4:2 A4 B4 C5:1t D5:1t E5:1t D5 E5 | -:2 F5 G5 A5:3 G5 | -:3 E5 D5 C5 A4 C5 | -:3 A4 F4 A4 C5:2 |
//   D5:1t C5:1t A4:1t C5:3 E5:1t F5:1t E5:1t D5 | -:3 C5 Bb4 A4 Bb4:2 | G4 A4 Bb4 C5 D5 E5 F5:2 | -:4 G5 F5 ~E5:2 |
//   -:2 D5 C5 G4 A4 B4 E5 | -:3 D5 E5 A5:3 | G5 F5 E5 D5:2 E5 D5 C#5 | -:3 E5 D5 C#5 Bb4 A4 | A4:2 Bb4 C#5 D5 E5 G5 E5 |'
//   The user: "these are pretty good -- i like A better", then "all voices triangles, and another where all
//   voices (including the lead) were pulse waves": A with WAVES=t,t,t (music/spell-lead-a-tri.sng) and
//   WAVES=p,p,p (music/spell-lead-a-pulse.sng; the lead's pulse sweeps as PADBPW, from its first note)
//   Unfiltered triangles (FILT=0, the rest as -tri) were tried and dropped: "nah, that's not working".
//
// THE DEFAULT CHORDS below are glide.sng (take 2, E major):
//   E  F#/E  C#m  A  G#m  Am  F#m  Bsus4 -> B   (3-5 s each)
const CHORDS = env('CHORDS',
  '24 E2 B3 G#4 / 24 = C#4~.7 A#4~.7 / 18 C#2~.5 E4 G#4~.6 / 24 A2 C#4~.6 A4~.4 / ' +
  '18 G#2 B3~.5 G#4~.5 / 24 A2~.4 C4~.8 E4~.6 / 18 F#2 C#4~.4 A4~.7 / 30 B2 E4~.7 F#4~.5 @15 - D#4~.8 - / ' +
  '0 E2 B3~.8 G#4~.6');
// (the last entry, 0 rows, is chord 1 as the loop returns to it: its moves are made on chord 1's row 0)

// envelopes (AD, SR): quick attacks (3 ~24 ms), decay 9 to a high sustain, so a strike speaks then settles
const BASS_AD = hexv('BASSAD', '29'), BASS_SR = hexv('BASSSR', 'c9');
const PAD_AD = hexv('PADAD', '39'), PAD_SR = hexv('PADSR', 'b9');
// PADBSR: the top voice's own SR (default PADSR). The SID has no per-voice volume: a voice's SUSTAIN
// level is its loudness once the decay settles, so BASSSR=69 PADBSR=59 roughly halves the two upper voices
const PADB_SR = hexv('PADBSR', PAD_SR.toString(16));
// pulse sweeps: low width, speed a tick (12-bit units), ticks each way -> [lo, spd, ticks]. A pulse near
// $800 is a square (hollow); toward the edges it thins and brightens, so wide sweeps shimmer
const PW = [env('BASSPW', '400,24,36'), env('PADAPW', '180,36,30'), env('PADBPW', '200,40,27')]
  .map(s => { const [lo, spd, t] = s.split(','); return [parseInt(lo, 16), +spd, +t]; });
// VIB: the upper voices' vibrato -- speed (ticks a swing), depth (a semitone >> depth a tick), delay
// (ticks after the strike); VIB=0 none. GoatTracker runs an instrument's vibrato on rows with no command,
// so it colours struck notes only (a glide's own wavetable porta holds the pitch on its target)
const VIB = env('VIB', '6,4,30') === '0' ? null : env('VIB', '6,4,30').split(',').map(Number);
// FILT=1: the low-pass ($90; FTYPE=bp $a0), resonance FRES, voices FMASK; the cutoff FLO..FHI and back,
// FSTEP units a step, over FCYCLE seconds. VICE's 6581 does most of its brightening below ~$60.
const FILT = env('FILT', '0') === '1';
const FTYPE = { lp: 0x90, bp: 0xa0, hp: 0xc0 }[env('FTYPE', 'lp')], FRES = hexv('FRES', '6'), FMASK = hexv('FMASK', '7');
const FLO = hexv('FLO', '18'), FHI = hexv('FHI', '48'), FSTEP = +env('FSTEP', 2), FCYCLE = +env('FCYCLE', 14);

// ---- GoatTracker's encodings (as song-hub.mjs) ----
const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const ALIAS = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };
const idx = s => { const m = /^([A-G][b#]?)(\d)$/.exec(s); if (!m) throw new Error(`note ${s}`); const k = ALIAS[m[1]] ?? m[1]; return 12 * +m[2] + NOTE[k]; };
const REST = 0xbd, KEYOFF = 0xbe, CMD_TONEPORTA = 0x3, CMD_VIBRATO = 0x4, CMD_WAVEPTR = 0x8, CMD_TEMPO = 0xf;
const freq = k => Math.round(440 * 2 ** ((k - 57) / 12) * 16777216 / 985248);

// ---- tables (1-based rows) ----
const T = { wave: [], pulse: [], filt: [], speed: [] };
const add = (t, rows) => { const at = T[t].length + 1; T[t].push(...rows); return at; };
const shared = {};
const addOnce = (t, rows) => shared[t + JSON.stringify(rows)] ??= add(t, rows);
// WAVES: each voice's waveform, p (pulse, $41) or t (triangle, $11) -- slider, bass, top
const WAVES = env('WAVES', 'p,p,p').split(',').map(w => ({ p: 0x41, t: 0x11 })[w] ?? (() => { throw new Error(`WAVES: ${w}`); })());
// VOCT=a,b,c: each voice's notes moved that many octaves (VOCT=0,-1,0: the bass an octave lower)
const VOCT = env('VOCT', '0,0,0').split(',').map(Number);
const WP = WAVES.map(w => addOnce('wave', [[w, 0x00], [0xff, 0x00]]));
// ARPEGGIOS (a `^a,b,..` after a top-voice note or `=`): the wavetable steps through the note + a, b, ..
// (semitones), up to the octave and back down, ARPT ticks a step, looping until the next strike or glide.
// A struck note's own wave program starts it, so the arp comes in a row later
// ARPDIR: updown (to the octave and back), up, or down (from the octave down to the note, then again)
const ARPSAME = env('ARPSAME', '0') === '1';
const ARPT = +env('ARPT', 3), ARPDIR = env('ARPDIR', 'updown');
const arpWave = (v, offs) => { const seq = [0, ...offs, 12];
  const cyc = { updown: [...seq, ...seq.slice(1, -1).reverse()], up: seq, down: [...seq].reverse() }[ARPDIR];
  if (!cyc) throw new Error(`ARPDIR: ${ARPDIR}`);
  // a step: the note (1 tick), then delay rows for the rest -- a delay row of value d takes d+1 ticks
  // (gplay.c counts up to d, then moves on) and its note $80 changes nothing; at most 16 ticks a row
  const hold = left => left <= 0 ? [] : [[Math.min(16, left) - 1, 0x80], ...hold(left - 16)];
  return shared[`arp${v}:${offs}`] ??= (at => add('wave', [...cyc.flatMap(o => [[WAVES[v], o], ...hold(ARPT - 1)]), [0xff, at]]))(T.wave.length + 1); };
// RHYTHM=v:pattern -- bits of noise in voice v's sound: one character a row, repeating over the song
// ('.' nothing, 'h' a tick of high noise, 's' a short falling noise burst; for a steady accented stream,
// 'C' strong (3 frames), 'T' medium (2), 'k' and 't' light (1) -- "CHi-ka-ta-Ti-ka-ta" is CktTkt), on rows where that voice
// has nothing else to do and is not mid-glide. A hit points the voice's wavetable at noise for a few
// frames and back to its own waveform -- no new note, no envelope: the noise plays at the held note's
// volume, so a hit on a released voice is silent
const GLIDEFIRST = env('GLIDEFIRST', '0') === '1';
const RHYTHMSTEP = +env('RHYTHMSTEP', 0);
// RHYTHMBEAT=secs: a plain beat instead -- one hit (the pattern's characters in turn, no dots) every secs,
// placed to the TICK (a hit lands on the row before and waits the rest), so beats that don't fall on
// rows stay even; the loop must hold a whole number of them
const RHYTHMBEAT = +env('RHYTHMBEAT', 0);
const RHYTHM = env('RHYTHM', '') && (([v, pat]) => ({ v: +v - 1, pat }))(env('RHYTHM').split(':'));
// HITDROP=n: every hit's noise n semitones lower (deeper; the noise "pitch" is its clock rate)
const HITDROP = +env('HITDROP', 0);
const HIT = Object.fromEntries(Object.entries({ h: [[0x81, 0xdc]], s: [[0x81, 0xc4], [0x81, 0xc0], [0x81, 0xbc]],
  C: [[0x81, 0xd8], [0x81, 0xd8], [0x81, 0xd4]], T: [[0x81, 0xda], [0x81, 0xda]], k: [[0x81, 0xdc]], t: [[0x81, 0xdc]] })
  .map(([k, rows]) => [k, rows.map(([w, nt]) => [w, nt - HITDROP])]));
// (d: ticks to wait first -- a delay row of value d-1 takes d ticks -- to place a hit between rows)
const hitWave = (v, k, d = 0) => shared[`hit${v}${k}${d}`] ??= add('wave', [...d ? [[d - 1, 0x80]] : [], ...HIT[k], [WAVES[v], 0x00], [0xff, 0x00]]);
// BEATLOOP=1 (with RHYTHMBEAT): the hits as ONE looping wave program -- the pattern's characters in turn,
// each hit exactly as hitWave plays it, then the holds to the next -- so a run of hits costs the pattern two
// commands, not one a hit: the run's first hit enters the loop (at its hit, through the same pre-wait
// hitWave has), the hits between are left to the loop, and the run's LAST stays a one-shot hitWave, whose
// stop ends the loop where the hits end (the generator skips hits on glides; a loop running on would
// sound them, and a hit's return row would snap a glide's pitch). Plays tick for tick as without it
const BEATLOOP = env('BEATLOOP', '0') === '1';
const beatLoop = v => shared[`beatloop${v}`] ??= (() => { const bt = RHYTHMBEAT * 60, n = RHYTHM.pat.length, rows = [], entry = [];
  if (!Number.isInteger(bt) || (n * bt) % TEMPO_T) throw new Error('BEATLOOP: the hits must repeat on a row');
  // (the hold after each hit is cut at the next hit's row, so that row's entry waits as hitWave's pre-wait does)
  const hold = t => { const out = []; for (; t > 0; t -= 16) out.push([Math.min(16, t) - 1, 0x80]); return out; };
  let at = 0;                                       // ticks into the loop
  for (let j = 0; j < n; j++) { const tj = j * bt, row0 = tj - tj % TEMPO_T;
    rows.push(...hold(row0 - at)); entry.push(rows.length); rows.push(...hold(tj - row0));
    rows.push(...HIT[RHYTHM.pat[j]], [WAVES[v], 0x00]); at = tj + HIT[RHYTHM.pat[j]].length + 1; }
  rows.push(...hold(n * bt - at));
  const base = T.wave.length + 1; add('wave', [...rows, [0xff, base]]);
  return { entry: entry.map(e => base + e), n }; })();
// BEATCYCLE=a,b,c with ROBIN=1: every voice walks its own looping series of waveforms -- saw, triangle,
// wide pulse, narrow pulse (BEATPW=wide,narrow widths) -- a, b, c steps long, drawn at random (BEATSEED; no
// waveform twice running, the wrap included; four or more steps use all four). The changes fall every
// half beat, one voice at a time, round robin -- voice 1, 2, 3, 1, ... -- so each voice changes every 1.5
// beats, its steps offset half a beat from the last's. Lengths with no common factor (7,11,13) line up
// again only after their product -- but the strikes re-enter each series where it stands, so the song's
// 32-s loop still repeats exactly. A series is ONE looping wave program a voice; patterns carry a command
// only on a strike (whose instrument restarts the wave program)
const BEATCYCLE = env('BEATCYCLE', '') && env('BEATCYCLE').split(',').map(Number);
const ROBIN = env('ROBIN', '0') === '1';
if (BEATCYCLE && !ROBIN) throw new Error('BEATCYCLE needs ROBIN=1');
if (BEATCYCLE && RHYTHM) throw new Error('BEATCYCLE: a hit would borrow the wave program the series runs in');
const BEATROWS = 5, HALF = BEATROWS * TEMPO_T / 2;
if (BEATCYCLE && !Number.isInteger(HALF)) throw new Error('BEATCYCLE: half a beat is not a whole number of ticks');
const BEATPW = env('BEATPW', '800,180').split(',').map(x => parseInt(x, 16));
const BW = !BEATCYCLE ? [] : [{ w: 0x21 }, { w: 0x11 }, ...BEATPW.map(pw => ({ w: 0x41, pp: add('pulse', [[0x80 | pw >> 8, pw & 0xff], [0xff, 0x00]]) }))];
const rnd = (a => () => { a = a + 0x6d2b79f5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; })(+env('BEATSEED', 7));
// a waveform's rows: the waveform with the note, then for a pulse its pulse program
const bwRows = i => [[BW[i].w, 0x00], ...BW[i].pp ? [[0xf9, BW[i].pp]] : []];
const wait = t => t <= 0 ? [] : [[Math.min(16, t) - 1, 0x80], ...wait(t - 16)];
const stepT = () => 3 * HALF;
const stepOff = v => v * HALF;
const cyc = !BEATCYCLE ? [] : BEATCYCLE.map(n => { for (;;) { const c = [...Array(n)].map(() => Math.floor(rnd() * 4));
  if (c.every((x, k) => n === 1 || x !== c[(k + 1) % n]) && (n < 4 || new Set(c).size === 4)) return c; } });
// where in its step a row falls: [step, ticks into it]
const stepPos = (v, gRow) => { const L = stepT(v), n = cyc[v].length, t = ((gRow * TEMPO_T - stepOff(v)) % (n * L) + n * L) % (n * L);
  return [Math.floor(t / L), t % L]; };
// every global row a move is on (strikes are among them; filled in once the chords are read)
const moveRows = [];
// A strike restarts the wave program, so it re-enters the series through a stub: the step's waveform
// with the pitch (note $00, in place of what the series plays on that tick), then a jump to the series
// row that starts on the NEXT tick. So each step is cut into delay rows that start one tick after every
// point a strike can land in it (from moveRows), plus two after the opening strike's point -- the series
// never ran before it, so its stub must also set the pulse (one row more)
const cycProg = v => shared[`cyc${v}`] ??= (() => { const at = T.wave.length + 1, L = stepT(v), entry = [], pos = new Map(), rows = [];
  const intos = new Set(moveRows.map(g => stepPos(v, g)[1])), open = stepPos(v, 0)[1];
  const cuts = [...new Set([1, ...[...intos].map(t => t + 1), ...open ? [open + 2] : []])].filter(t => t < L).sort((x, y) => x - y);
  cyc[v].forEach((i, k) => { entry.push(at + rows.length);
    // (a step changes the WAVEFORM only, note $80: the series runs on through a slide's start, and a step
    // that set the pitch would snap it to the slide's new note on the beat -- the slide then never moved)
    const w = bwRows(i).map(([a, b], j) => j ? [a, b] : [a, 0x80]);
    rows.push(...w);
    let t = w.length;
    for (const c of [...cuts, L]) { if (c < t) { if (c >= 1 && c < w.length) pos.set(`${k}:${c}`, at + rows.length - w.length + c); continue; }
      if (c > t) { rows.push(...wait(c - t)); t = c; }
      pos.set(`${k}:${c}`, at + rows.length); } });
  add('wave', [...rows, [0xff, at]]);
  const n = cyc[v].length;
  return { entry, row: (k, c) => c >= L ? entry[(k + 1) % n] : pos.get(`${k}:${c}`) ?? (() => { throw new Error(`BEATCYCLE: no series row at step ${k} tick ${c}`); })() }; })();
const cycStub = (v, gRow, opening) => { const [k, into] = stepPos(v, gRow), b = BW[cyc[v][k]], full = opening && into && b.pp;
  return shared[`cycS${v}:${k}:${into}:${full ? 1 : 0}`] ??= add('wave', [[b.w, 0x00], ...full ? [[0xf9, b.pp]] : [], [0xff, cycProg(v).row(k, into + (full ? 2 : 1))]]); };
// a glide: a toneportamento step at speed-table row sp, jumping to itself (every frame toward the note)
const glideWave = sp => shared[`glide${sp}`] ??= add('wave', [[0xf3, sp], [0xff, T.wave.length + 1]]);
const speedFor = (from, to, secs) => { const v = Math.max(1, Math.round(Math.abs(freq(idx(to)) - freq(idx(from))) / (secs * 60)));
  return addOnce('speed', [[v >> 8, v & 0xff]]); };
// a pulse program: set lo, up `t` ticks at spd, back down, loop to the up step
const pulseProg = ([lo, spd, t]) => { if (t > 127 || spd > 127) throw new Error('pulse step: t and spd must be <= 127');
  const at = T.pulse.length + 1; return add('pulse', [[0x80 | lo >> 8, lo & 0xff], [t, spd], [t, -spd & 0xff], [0xff, at + 1]]); };
const PP = PW.map(pulseProg);
// the filter: type/resonance/routing, the cutoff at FLO, then FSTEP up a step with holds, FHI, and back.
// RSWEEP=lo,hi instead holds the cutoff at FCUT and sweeps the RESONANCE lo..hi and back over FCYCLE: it
// has only 16 levels and no slide, so each level is a filter-parameter step (a tick) and a hold
const RSWEEP = env('RSWEEP', '') && env('RSWEEP').split(',').map(x => parseInt(x, 16)), FCUT = hexv('FCUT', env('FLO', '18'));
// RSTEP=n: the resonance moves n levels a step, each step n times as long -- the same sweep in 1/n the filter
// table (the user, 2026-10-31: "you can step at 2s, but keep both resonance and cutoff"; the 16-s program
// was ~230 of the table's 255 rows)
const RSTEP = +env('RSTEP', 1);
if (RSWEEP && (RSWEEP[1] - RSWEEP[0]) % RSTEP) throw new Error(`RSTEP=${RSTEP} does not divide the resonance span`);
const units = RSWEEP ? 2 * (RSWEEP[1] - RSWEEP[0]) / RSTEP : Math.round((FHI - FLO) / FSTEP);
const hold = Math.round(FCYCLE * 60 / (RSWEEP ? units : 2 * units)) - 1;
// BEATSWEEP=lo,hi[,ticks]: the cutoff swells instead, from hi down to lo and back over 2 x ticks (default
// 30 ticks = a beat at TEMPOT=6), peak first: the song starts on a 1, so the peaks fall on 1 and 3.
// Resonance FRES. Exact to the tick (a step of n units over t ticks is two modulation rows: the speeds
// floor(n/t) and one more), so the swell never drifts off the beat
const BEATSWEEP = env('BEATSWEEP', '') && env('BEATSWEEP').split(',').map((x, k) => k < 2 ? parseInt(x, 16) : +x);
if (FILT && !BEATSWEEP && (hold < 1 || hold > 127)) throw new Error(`FCYCLE: a ${hold + 1}-tick step is out of range`);
// CSWEEP=lo,hi,secs (with RSWEEP): the cutoff ALSO sweeps, lo..hi and back over about secs -- a whole
// number of resonance cycles, as the program is one loop. A filter program runs one step at a time, so
// the cutoff moves INSIDE the resonance steps: a moving step is parameter (1 tick), +-CSTEP (1 tick), hold
// (hold-1), the same length as a still one, the moves spread evenly over each half of the loop
const CSWEEP = env('CSWEEP', '') && env('CSWEEP').split(',').map((x, k) => k < 2 ? parseInt(x, 16) : +x), CSTEP = +env('CSTEP', 2);
// FADEIN=secs (with RSWEEP): the song opens with the cutoff at $00 and runs it up to the sweep's start
// over secs -- a quick filter fade-in on the first notes -- before the loop. (On a 6581 even $00 passes
// the lowest notes, so the bass fades less than the rest.)
const FADEIN = +env('FADEIN', 0);
// CLOOPE=n / CLOOPL=n: how many rows early / late a switch may come where no voice has the row free (each a
// wait row and a jump a direction; rounds sharing one filter program must use the same)
const CLOOP = env('CLOOP', '0') === '1', CLOOPE = +env('CLOOPE', 0), CLOOPL = +env('CLOOPL', 0), CMD_FILTPTR = 0xa;
let FHALF = null;                                   // CLOOP's two loops and the rows between their switches
let FSW = null;                                     // (the same for a plain cutoff sweep, whose halves fall between rows)
const fadeRows = to => { const ticks = Math.max(1, Math.round(FADEIN * 60)), spd = Math.ceil(to / ticks), out = [];
  for (let left = to; left > 0; left -= spd * Math.min(127, Math.floor(left / spd) || 1)) {
    const t = Math.min(127, Math.floor(left / spd)); if (!t) break; out.push([t, spd]); }
  return out; };
const FP = !FILT ? 0 : BEATSWEEP ? (() => { const [lo, hi, t = 30] = BEATSWEEP, n = hi - lo, spd = Math.floor(n / t), more = n - spd * t;
  if (t > 127 || spd + 1 > 127 || n <= 0) throw new Error('BEATSWEEP: out of range');
  const half = d => [[t - more, d * spd & 0xff], [more, d * (spd + 1) & 0xff]].filter(([k]) => k);
  const at = T.filt.length + 1;
  return add('filt', [[FTYPE, FRES << 4 | FMASK], [0x00, hi], ...half(-1), ...half(1), [0xff, at + 2]]); })()
  : RSWEEP ? (() => { const [lo, hi] = RSWEEP, at = T.filt.length + 1, start = CSWEEP ? CSWEEP[0] : FCUT;
  const fade = FADEIN ? [[0x00, 0x00], ...fadeRows(start)] : [];
  // (the set-cutoff row after the fade lands it exactly; the loop starts after it)
  const rows = [[FTYPE, lo << 4 | FMASK], ...fade, [0x00, start]];
  let loopAt = at + rows.length;
  const n = (hi - lo) / RSTEP, resCycle = [...Array(n)].map((_, k) => lo + RSTEP * (k + 1)).concat([...Array(n)].map((_, k) => hi - RSTEP * (k + 1)));
  const k = CSWEEP ? Math.max(1, Math.round(CSWEEP[2] / FCYCLE)) : 1, steps = [].concat(...Array(k).fill(resCycle));
  const half = steps.length / 2, m = CSWEEP ? Math.round((CSWEEP[1] - CSWEEP[0]) / CSTEP) : 0;
  if (m > half || !Number.isInteger(half)) throw new Error(`CSWEEP: ${m} moves will not fit ${half} steps`);
  const stepRows = (r, i) => { const j = i % half, move = m && Math.floor((j + 1) * m / half) > Math.floor(j * m / half);
    return [[FTYPE, r << 4 | FMASK], ...move ? [[0x01, (i < half ? CSTEP : -CSTEP) & 0xff], [hold - 1, 0x00]] : [[hold, 0x00]]]; };
  // CLOOP=1: each half of the drift is k/2 copies of one resonance cycle, its cutoff moves the same in each
  // (they are relative), so the table holds ONE cycle a direction, each looping on itself, and a filter-
  // pointer command (Axx, voice 1) every half drift points the filter at the other -- half the rows again
  if (CLOOP && CSWEEP && k >= 4 && k % 2 === 0) {
    // (a FADEIN's rows go after the loops: the table opens with the plain entry, type and cutoff, as a
    // join's -- song-rounds reads the loop from there)
    const fadePart = rows.splice(1, fade.length); loopAt -= fade.length;
    const cyc = resCycle.length, one = d => resCycle.flatMap((r, i) => stepRows(r, i + d * half));
    for (let c = 1; c < k / 2; c++) for (const d of [0, 1])
      if (JSON.stringify(resCycle.flatMap((r, i) => stepRows(r, i + c * cyc + d * half))) !== JSON.stringify(one(d)))
        throw new Error('CLOOP: the cutoff moves differ from cycle to cycle');
    // (an Axx starts its row on the tick it is read, a tick before the loop it replaces would have ended:
    // each points at a wait, 1 tick + a row for each row it comes early, then the loop)
    const up = one(0), down = one(1), downAt = loopAt + up.length + 1, ticks = half * (hold + 1);
    if (ticks % TEMPO_T) throw new Error('CLOOP: half the drift is not a whole number of rows');
    for (const l of [up, down]) if (l.at(-1)[0] < 1 + CLOOPE * TEMPO_T) throw new Error('CLOOP: a loop ends on a hold shorter than CLOOPE rows');
    // (CLOOPL=n: or up to n rows LATE -- the old loop then wraps into its own first step, the same rows as the
    // new one's (a resonance level and a hold, no cutoff move), and the switch points at the rest of that
    // hold, then the new loop's second step)
    const step0 = up.findIndex(([l], k) => k && l >= 0x80);
    if (CLOOPL && (JSON.stringify(up.slice(0, step0)) !== JSON.stringify(down.slice(0, step0)) || step0 !== 2 || up[1][0] < CLOOPL * TEMPO_T))
      throw new Error('CLOOP: the loops do not begin on the same plain step, so a switch cannot come late');
    const padAt = downAt + down.length + 1, pads = [];
    for (let e = 0; e <= CLOOPE; e++) pads.push([e, loopAt, [1 + e * TEMPO_T, 0x00]], [e, downAt, [1 + e * TEMPO_T, 0x00]]);
    for (let l = 1; l <= CLOOPL; l++) pads.push([-l, loopAt + step0, [up[1][0] + 2 - l * TEMPO_T, 0x00]], [-l, downAt + step0, [up[1][0] + 2 - l * TEMPO_T, 0x00]]);
    FHALF = { up: {}, down: {}, rows: ticks / TEMPO_T };
    pads.forEach(([e, to], k) => { FHALF[to < downAt ? 'up' : 'down'][e] = padAt + 2 * k; });
    const body = [...rows, ...up, [0xff, loopAt], ...down, [0xff, downAt], ...pads.flatMap(([, to, w]) => [w, [0xff, to]])];
    if (!FADEIN) return add('filt', body);
    // The fade: the program opens with it, then joins the up loop where the loop stands at that tick in every
    // later lap -- the switches sit on the same rows in every lap, so the sweep must too. A join's entry
    // (type, cutoff: 1 tick) starts the loop's tick 0 on the program's tick 1, so on the fade's last tick
    // the loop is at tick `last`; that tick sets the resonance and cutoff the loop has after it, and the loop
    // goes on from the next (a hold entered part-way: its rest, then the row after)
    const last = fadePart.reduce((t, [l]) => t + (l ? l : 0), 0);
    let tk = 0, res = lo, cut = start, enter = null;
    for (let r = 0; r < up.length && !enter; r++) { const [l, x] = up[r], len = l >= 0x80 ? 1 : l;
      if (tk <= last) { if (l >= 0x80) res = x >> 4; else if (l === 0x01 && x) cut += x < 0x80 ? x : x - 256; }
      if (tk + len > last + 1) enter = tk === last + 1 ? [loopAt + r] : [loopAt + r + 1, [tk + len - last - 1, 0x00]];
      tk += len; }
    if (!enter || cut < 0 || cut > 0xff) throw new Error('CLOOP: the fade is longer than a resonance cycle');
    const [to, rest] = enter;
    return add('filt', [...body, [FTYPE, lo << 4 | FMASK], ...fadePart, [FTYPE, res << 4 | FMASK], [0x00, cut], ...rest ? [rest] : [], [0xff, to]]) + body.length; }
  steps.forEach((r, i) => rows.push(...stepRows(r, i)));
  return add('filt', [...rows, [0xff, loopAt]]); })()
  : (() => { const at = T.filt.length + 1, rows = [[FTYPE, FRES << 4 | FMASK], [0x00, FLO]];
  // CLOOP=1: one step a direction, each looping on itself, and a switch (Axx) each half -- the halves fall
  // between rows, so the switch comes on the row before, pointing at a wait for the ticks left (the loops'
  // hold); each lap starts the program again (the loop's chord 1 points at its start), so the switches
  // fall the same in every lap. As song-rounds starts each round's program at the join, a round plays the same
  if (CLOOP) { const up = at + 2, down = up + 3;
    FSW = { entry: at, up, down, H: units * (hold + 1), tail: hold,
      pad: (to, w) => shared[`fpad${to},${w}`] ??= add('filt', [[w, 0x00], [0xff, to]]) };
    return add('filt', [...rows, [0x01, FSTEP & 0xff], [hold, 0x00], [0xff, up], [0x01, -FSTEP & 0xff], [hold, 0x00], [0xff, down]]); }
  for (const d of [FSTEP, -FSTEP]) for (let k = 0; k < units; k++) rows.push([0x01, d & 0xff], [hold, 0x00]);
  return add('filt', [...rows, [0xff, at + 2]]); })();

// instruments: a 'start' one (the pulse program, and on the bass the filter) for each voice's first
// note, and a plain one after -- a pointer restarts its program on every note (goattracker.md trap 3).
// Gate timer $82: the gate drops 2 ticks before a new note, with NO hard restart (it would cut the tails)
const INSTR = [];
// (a vibrato is a speed-table row: left = the swing's ticks, bit 7 = depth relative to the note's semitone)
const VIBP = VIB ? add('speed', [[0x80 | VIB[0], VIB[1]]]) : 0, VIBD = VIB ? VIB[2] : 0;
const ins = (name, ad, sr, pp, fp, vib = false, v = 0) => (INSTR.push({ name, ad, sr, wp: WP[v], pp, fp, vp: vib ? VIBP : 0, vd: vib ? VIBD : 0, gt: 0x82, fw: WAVES[v] }), INSTR.length);
const I_START = [ins('Bass start', BASS_AD, BASS_SR, PP[0], FP, false, 0), ins('Pad A start', PAD_AD, PAD_SR, PP[1], 0, true, 1), ins('Pad B start', PAD_AD, PADB_SR, PP[2], 0, true, 2)];
const I_PLAIN = [ins('Bass', BASS_AD, BASS_SR, 0, 0, false, 0), ins('Pad A', PAD_AD, PAD_SR, 0, 0, true, 1), ins('Pad B', PAD_AD, PADB_SR, 0, 0, true, 2)];

// LEAD: a melody in the top voice in place of its CHORDS notes -- one token a note, `|` a bar line
// (checked: 4 beats): `D5` an 8th, `D5:3` three 8ths, `D5:1t` a triplet 8th, `~D5` slurred (3xy with speed 0:
// the pitch moves at once with no new pluck, a guitarist's hammer-on or pull-off), `-:2` the last note
// held on, `r` let go (key off). An 8th is 15 ticks, which no 6-tick row lands on (it is 2.5 rows), so the
// lead's channel runs its OWN tempo (Fxy with bit 7: that channel only), LEADT ticks a row -- 5 makes an 8th
// 3 rows and a triplet 8th 2; 15 (a line with no triplets) makes an 8th ONE row, a third the pattern bytes,
// playing the same. The other voices keep TEMPOT. A channel tempo applies from the row that sets it
// (gplay.c reloads the tick counter from it on the next tick), so the lead starts exactly with the rest.
// Each note is plucked (gate timer $82 lifts the gate 2 ticks before it); LEADAD/LEADSR its envelope, quick
// attack and a guitar's decay; LEADVIB=swing,shift,delay a mild vibrato (a semitone >> shift a tick, from
// delay ticks after the note), so only notes held past the delay waver.
const LEAD = env('LEAD', ''), LEAD_T = +env('LEADT', 5);
const LEADVIB = env('LEADVIB', '10,5,20').split(',').map(Number);
// (a pulse lead's first note starts the top voice's pulse sweep, PADBPW, and the others leave it running --
// a pointer restarts its program on every note, as the other voices' start/plain instruments)
const leadIns = (name, pp) => (INSTR.push({ name, ad: hexv('LEADAD', '0a'), sr: hexv('LEADSR', '7a'), wp: WP[2], pp, fp: 0,
  vp: addOnce('speed', [[0x80 | LEADVIB[0], LEADVIB[1]]]), vd: LEADVIB[2], gt: 0x82, fw: WAVES[2] }), INSTR.length);
const I_LEAD = LEAD ? leadIns('Lead', 0) : 0, I_LEADSTART = LEAD && WAVES[2] === 0x41 ? leadIns('Lead start', PP[2]) : I_LEAD;
// the line as [lead row, pattern row]: an 8th and a triplet 8th in lead rows, and the bar
const leadEv = !LEAD ? [] : (() => { const beat = 5 * TEMPO_T, e8 = beat / 2 / LEAD_T, t8 = beat / 3 / LEAD_T, bar = 4 * beat / LEAD_T;
  if (!Number.isInteger(e8)) throw new Error(`LEADT: ${LEAD_T} ticks a row doesn't divide an 8th`);
  const ev = []; let at = 0, bars = 0;
  for (const tok of LEAD.trim().split(/\s+/)) {
    if (tok === '|') { if (at !== ++bars * bar) throw new Error(`LEAD: bar ${bars} is ${(at - (bars - 1) * bar) / e8} 8ths`); continue; }
    const [, slur, n, k = '1', t] = /^(~)?([A-G][b#]?\d|r|-)(?::(\d+)(t)?)?$/.exec(tok) ?? [];
    if (!n) throw new Error(`LEAD: ${tok}`);
    if (t && !Number.isInteger(t8)) throw new Error(`LEADT: ${LEAD_T} ticks a row doesn't divide a triplet 8th`);
    if (n === 'r') ev.push([at, [KEYOFF, 0, 0, 0]]);
    else if (n !== '-') ev.push([at, slur ? [0x60 + idx(n), 0, CMD_TONEPORTA, 0] : [0x60 + idx(n), ev.length ? I_LEAD : I_LEADSTART, 0, 0]]);
    at += +k * (t ? t8 : e8); }
  return { ev, rows: at }; })();
const leadPat = (g0, rows) => { const per = TEMPO_T / LEAD_T, a = g0 * per, n = rows * per;
  if (!Number.isInteger(a) || !Number.isInteger(n)) throw new Error('LEAD: a chord is not a whole number of lead rows');
  const r = [...Array(n)].map(() => [REST, 0, 0, 0]);
  for (const [at, e] of leadEv.ev) if (at >= a && at < a + n) r[at - a] = [...e];
  if (!g0) { if (r[0][2]) throw new Error('LEAD: the first note is slurred'); r[0][2] = CMD_TEMPO; r[0][3] = 0x80 | LEAD_T; }
  return r; };

// ---- the chords -> per-voice events ----
const chords = CHORDS.split('/').map(s => s.trim()).filter(Boolean).map(s => {
  const [head, ...mids] = s.split('@').map(x => x.trim().split(/\s+/));
  const rows = +head[0], moves = [[0, head.slice(1)]];
  for (const m of mids) moves.push([+m[0], m.slice(1)]);
  for (const [, mv] of moves) if (mv.length !== 3) throw new Error(`CHORDS: "${s}" needs bass padA padB`);
  for (const [, mv] of moves) mv.forEach((m, v) => { mv[v] = m.replace(/^([A-G][b#]?)(\d)/, (_, n, o) => n + (+o + VOCT[v])); });
  return { rows, moves }; });
const back = chords.at(-1).rows === 0 ? chords.pop() : null;          // the loop's return to chord 1
{ let g = 0; for (const c of chords) { for (const [at] of c.moves) moveRows.push(g + at); g += c.rows; } }
// each voice's note before each chord, walking the song once (the start strikes chord 1)
const P = [];
const pat = rows => { const key = JSON.stringify(rows), had = P.findIndex(p => JSON.stringify(p.slice(0, -1)) === key);
  if (had >= 0) return had;
  P.push([...rows, [0xff, 0, 0, 0]]); return P.length - 1; };
const cur = [null, null, null];
// per voice: the global row a running glide arrives by, and whether an arp owns the wavetable
const glideTo = [-1, -1, -1], arpOn = [false, false, false], glideSp = [0, 0, 0];
const voicePat = (v, rows, moves, first, tempo, g0) => {
  const r = [...Array(rows)].map(() => [REST, 0, 0, 0]);
  const put = (at, e) => { if (at >= rows) throw new Error(`voice ${v + 1}: a move at row ${at} runs past its chord`);
    // (a note and a command may share a row, in either order: each fills its own columns)
    const noteClash = e[0] !== REST && r[at][0] !== REST, cmdClash = e[2] && r[at][2];
    if (noteClash || cmdClash) throw new Error(`voice ${v + 1}: two moves on row ${at}`);
    r[at] = e[0] !== REST ? [e[0], e[1], r[at][2] || e[2], r[at][2] ? r[at][3] : e[3]] : [r[at][0], r[at][1], e[2], e[3]]; };
  let vibFrom = null;
  // (this chord's glides as [first wavetable row, arrival row, speed]; one still running in from the last chord first)
  const glides = glideTo[v] >= g0 ? [[0, glideTo[v] - g0, glideSp[v]]] : [];
  for (const [at, mv] of moves) {
    const m = mv[v];
    if (m === '=' || m === '-') continue;
    if (m === '.') { put(at, [KEYOFF, 0, 0, 0]); cur[v] = null; continue; }
    // `vib`: vibrato from here to the chord's end, on a held (or glided) note. The instrument's own vibrato
    // only follows a STRIKE, so this is pattern command 4xy -- on EVERY row, as a realtime command runs only
    // on rows that carry it. First 8xy points the wavetable back at the plain pulse program: a finished
    // glide's toneportamento still pulls the pitch onto its target every frame and would flatten the vibrato
    if (m === 'vib') { if (!VIBP) throw new Error('CHORDS: vib needs VIB'); put(at, [REST, 0, CMD_WAVEPTR, WP[v]]); vibFrom = at + 1; arpOn[v] = false; continue; }
    const [, hold, note, secs, arp] = /^(?:(=)|([A-G][b#]?\d)(?:~([\d.]+))?)(?:\^([\d,]+))?$/.exec(m) ?? [];
    if (!hold && !note) throw new Error(`CHORDS: ${m}`);
    if (arp && secs) throw new Error(`CHORDS: ${m} -- an arp can't ride a glide (both are the wavetable)`);
    if (hold) { put(at, [REST, 0, CMD_WAVEPTR, arpWave(v, arp.split(',').map(Number))]); arpOn[v] = true; continue; }
    arpOn[v] = false;
    // (ARPSAME=1: the arp's 8xy on the strike's own row -- the row's command runs after the note sets up
    // its instrument (gplay.c), so the arp starts WITH the note, on the beat, not a row later)
    if (arp) { put(at + (ARPSAME ? 0 : 1), [REST, 0, CMD_WAVEPTR, arpWave(v, arp.split(',').map(Number))]); arpOn[v] = true; }
    // (the song's opening strike is chord 1's row 0 only: a glide later in chord 1 is still a glide)
    const opening = first && at === 0;
    if (secs && cur[v] && !opening) {
      // BEATCYCLE: the series owns the wavetable all song, so the slide is pattern 3xy on every row it moves
      // (a realtime command runs only on rows that carry it), filled in after the moves. GoatTracker may skip
      // a realtime command on a row's tick 0, so the speed assumes 5 ticks a row, and one row more is filled
      if (BEATCYCLE) { const n = Math.ceil(+secs / ROW_S), sp = speedFor(cur[v], note, +secs * 5 / 6);
        put(at, [0x60 + idx(note), 0, CMD_TONEPORTA, sp]); glideTo[v] = g0 + at + n; glideSp[v] = sp; glides.push([at + 1, at + n, sp]); }
      else {
        // the wavetable glide on this row, the new note (3xy, no strike) on the next
        const sp = speedFor(cur[v], note, +secs);
        // GLIDEFIRST=1: the note (3xy) on the glide's own row and the wavetable glide on the next, so the
        // pitch moves FROM that row (3xy slides on its row's later ticks; the 8xy row's command then hands the
        // slide to the wavetable before an empty row could stop it). Off: the 8xy first, moving a row later
        if (GLIDEFIRST) { put(at, [0x60 + idx(note), 0, CMD_TONEPORTA, sp]); put(at + 1, [REST, 0, CMD_WAVEPTR, glideWave(sp)]); }
        else { put(at, [REST, 0, CMD_WAVEPTR, glideWave(sp)]); put(at + 1, [0x60 + idx(note), 0, CMD_TONEPORTA, sp]); }
        // (the row it lands on: with GLIDEFIRST it moves from `at`, else from the row after; a hit may take
        // that row's tick 0 -- the slide is then a tick short of its 30, a few cents, inaudible)
        glideTo[v] = g0 + at + Math.ceil(+secs / ROW_S) - (GLIDEFIRST ? 1 : -1); }
    } else put(at, [0x60 + idx(note), (opening ? I_START : I_PLAIN)[v], 0, 0]);
    cur[v] = note; }
  // (BEATCYCLE: each slide's 3xy on its rows, up to the next row with anything on it; a strike enters
  // its voice's series through the stub for the step it is on -- nothing else touches the wavetable)
  if (BEATCYCLE) {
    for (const [a, z, sp] of glides) for (let k = a; k <= Math.min(z, rows - 1) && r[k][0] === REST && !r[k][2]; k++) r[k] = [REST, 0, CMD_TONEPORTA, sp];
    for (let k = 0; k < rows; k++) if (r[k][0] >= 0x60 && r[k][0] < 0xbd && r[k][2] !== CMD_TONEPORTA) {
      const gk = g0 + k;
      if (r[k][2]) throw new Error(`BEATCYCLE: voice ${v + 1} strikes on a command (row ${gk})`);
      r[k] = [r[k][0], r[k][1], CMD_WAVEPTR, cycStub(v, gk, first && k === 0)]; } }
  if (vibFrom !== null) for (let k = vibFrom; k < rows; k++) if (r[k][0] === REST && !r[k][2]) r[k] = [REST, 0, CMD_VIBRATO, VIBP];
  // (arpOn is the state at the chord's END: a voice whose arp a strike ended mid-chord takes no hits after)
  // RHYTHMSTEP=n locks the rhythm to the CHORDS instead: each chord restarts the pattern (no dots: one
  // character a hit) on its first row, with round(rows / n) hits spread evenly across it, so every chord
  // change lands on the pattern's first, strongest hit. A hit may share a STRIKE's row: the row's command
  // runs after the note sets up its instrument (gplay.c), so the noise comes first, then the note's wave
  const bt = RHYTHMBEAT * 60, hitRows = !RHYTHM ? [] : RHYTHMBEAT
    ? [...Array(Math.ceil((g0 + rows) * TEMPO_T / bt))].map((_, k) => Math.round(k * bt)).map((tk, k) => [Math.floor(tk / TEMPO_T) - g0, RHYTHM.pat[k % RHYTHM.pat.length], tk % TEMPO_T, k])
      .filter(([k]) => k >= 0 && k < rows)
    : RHYTHMSTEP
    ? [...Array(Math.max(1, Math.round(rows / RHYTHMSTEP)))].map((_, k, a) => [Math.round(k * rows / a.length), RHYTHM.pat[k % RHYTHM.pat.length]])
    : [...Array(rows)].map((_, k) => [k, RHYTHM.pat[(g0 + k) % RHYTHM.pat.length]]);
  if (RHYTHM && RHYTHM.v === v && !arpOn[v]) for (const [k, c, d, j] of hitRows) {
    if (c === '.' || r[k][2] || (r[k][0] !== REST && !RHYTHMSTEP && !RHYTHMBEAT) || g0 + k <= glideTo[v]) continue;
    // (nor on the row before a glide's 8xy: it is free, but the glide starts there)
    if (k + 1 < rows && r[k + 1][2] === CMD_WAVEPTR) continue;
    r[k] = [r[k][0], r[k][1], CMD_WAVEPTR, hitWave(v, c, d)]; r[k].hit = j; }
  // BEATLOOP: runs of hits, each the loop's next with nothing between (no note, no command) and none on a
  // strike, become entry .. one-shot
  if (RHYTHM && RHYTHM.v === v && BEATLOOP) { const L = beatLoop(v); let run = [];
    const end = () => { if (run.length > 1) { const [a, ...mid] = run.slice(0, -1);
      r[a] = [r[a][0], r[a][1], CMD_WAVEPTR, L.entry[r[a].hit % L.n]]; for (const k of mid) r[k] = [REST, 0, 0, 0]; }
      run = []; };
    for (let k = 0; k < rows; k++) { const x = r[k];
      // (a hit on a strike stays a one-shot and starts no run: the note's set-up takes the row's first tick,
      // so that hit sounds a tick late -- the loop would carry the tick on to every hit after it)
      if (x.hit !== undefined && x[0] !== REST) end();
      else if (x.hit !== undefined) { const p = run.at(-1);
        if (p === undefined || x.hit !== r[p].hit + 1) end(); run.push(k); }
      else if (x[0] !== REST || x[2]) end(); }
    end(); }
  // (BEATCYCLE's opening stub takes row 0's command: the tempo goes on the first free row -- GoatTracker plays every
  // channel at tempo 6 until then, so that is exact only at TEMPOT=6)
  if (tempo) { const tr = r.findIndex(x => !x[2]);
    if (tr < 0 || (tr && TEMPO_T !== 6)) throw new Error('tempo row'); r[tr][2] = CMD_TEMPO; r[tr][3] = TEMPO_T; }
  return r; };
// CLOOP: a voice switches the filter's loop every half drift -- the down loop on odd halves -- but not at the
// song's first row, where the start instrument begins the program. On the row itself in the first voice
// free there (the lead's rows are another tempo's), else up to CLOOPE rows early -- into the chord before,
// which plays just before it (but at the loop's chord 1) -- at a wait as long (the loops end on a hold that long). So a
// chord's patterns are stored once the next chord has placed its switches
let held = null;
// (a chord's switches: [its row, { rows early (negative: late): the table row to point at }])
const switchesIn = (g0, n, first) => { const out = [];
  if (FHALF) for (let k = 0; k < n; k++) { const gk = g0 + k;
    if (!(gk % FHALF.rows) && !(first && !gk)) out.push([k, (gk / FHALF.rows) % 2 ? FHALF.down : FHALF.up]); }
  if (FSW) { if (!first && !g0) out.push([0, { 0: FSW.entry }]);
    for (let h = 1; ; h++) { const s = 1 + h * FSW.H, R = Math.floor((s - 1) / TEMPO_T), w = s - R * TEMPO_T, to = {};
      if (R >= g0 + n) break; if (R < g0) continue;
      for (let e = 0; w + e * TEMPO_T <= FSW.tail; e++) to[e] = FSW.pad(h % 2 ? FSW.down : FSW.up, w + e * TEMPO_T);
      out.push([R - g0, to]); } }
  return out; };
const chordPats = (rs, g0, first) => {
  for (const [k, to] of switchesIn(g0, rs[0].length, first)) { const gk = g0 + k;
    const row = (v, kk) => kk >= rs[v].length ? null : kk >= 0 ? [rs[v], kk] : held && kk + held[v].length >= 0 ? [held[v], kk + held[v].length] : null;
    const offs = Object.keys(to).map(Number).sort((a, b) => Math.abs(a) - Math.abs(b) || b - a);
    // (never early at the loop's chord 1: in song-rounds the chord before it is the OTHER round's last)
    const at = offs.filter(e => !(e > 0 && !gk)).flatMap(e => [0, 1, 2].filter(v => !(LEAD && v === 2)).map(v => [row(v, k - e), e]))
      .find(([x]) => x && !x[0][x[1]][2]);
    if (!at) throw new Error(`CLOOP: no voice is free for the filter switch at row ${gk}`);
    const [[r, kk], e] = at; r[kk] = [r[kk][0], r[kk][1], CMD_FILTPTR, to[e]]; }
  if (held) held.forEach((r, v) => ORDER[v].push(pat(r)));
  held = rs; };
const ORDER = [[], [], []];
const timeline = [];
let t0 = 0, g = 0;
chords.forEach((c, k) => {
  chordPats([0, 1, 2].map(v => LEAD && v === 2 ? leadPat(g, c.rows) : voicePat(v, c.rows, c.moves, k === 0, k === 0 && v === 0, g)), g, k === 0);
  g += c.rows;
  timeline.push([t0, c.moves.map(([at, mv]) => (at ? `@${(at * ROW_S).toFixed(0)}s ` : '') + mv.join(' ')).join('  ')]); t0 += c.rows * ROW_S; });
// the loop's chord 1: its own moves (glides from the last chord), then chord 1's rest as at the start
if (back) { const c1 = chords[0], moves = [[0, back.moves[0][1]], ...c1.moves.slice(1)];
  for (let v = 0; v < 3; v++) glideTo[v] -= g;
  chordPats([0, 1, 2].map(v => LEAD && v === 2 ? leadPat(0, c1.rows) : voicePat(v, c1.rows, moves, false, false, 0)), 0, false); }
held.forEach((r, v) => ORDER[v].push(pat(r)));
if (LEAD && leadEv.rows * LEAD_T !== g * TEMPO_T) throw new Error(`LEAD: ${leadEv.rows * LEAD_T / 15} 8ths, the song ${g * TEMPO_T / 15}`);
const RESTART = back ? 1 : 0;

// ---- the .sng (GoatTracker 2 "GTS5") ----
const b = [];
const str = (s, len) => { for (let k = 0; k < len; k++) b.push(k < s.length ? s.charCodeAt(k) : 0); };
str('GTS5', 4); str('Glide', 32); str('', 32); str('', 32);
b.push(1);
for (const o of ORDER) b.push(o.length + 1, ...o, 0xff, RESTART);
b.push(INSTR.length);
for (const i of INSTR) { b.push(i.ad, i.sr, i.wp, i.pp, i.fp, i.vp, i.vd, i.gt, i.fw); str(i.name, 16); }
for (const t of ['wave', 'pulse', 'filt', 'speed']) {
  if (T[t].length > 255) throw new Error(`${t} table: ${T[t].length} rows`);
  b.push(T[t].length, ...T[t].map(r => r[0]), ...T[t].map(r => r[1])); }
b.push(P.length);
for (const p of P) { b.push(p.length); for (const row of p) b.push(...row); }
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, Buffer.from(b));
console.log(`${OUT}: ${b.length} bytes, a ${t0.toFixed(0)} s loop at ${TEMPO_T} ticks a row; ` + (!FILT ? 'unfiltered' : BEATSWEEP ? `cutoff $${BEATSWEEP[1].toString(16)} down to $${BEATSWEEP[0].toString(16)} and back every ${2 * (BEATSWEEP[2] ?? 30)} ticks, resonance ${FRES.toString(16)}` : RSWEEP ? (CSWEEP ? `cutoff $${CSWEEP[0].toString(16)}..$${CSWEEP[1].toString(16)} over ~${CSWEEP[2]} s, ` : `cutoff $${FCUT.toString(16)}, `) + `resonance ${RSWEEP.map(x => x.toString(16)).join('..')} and back over ${FCYCLE} s` : `filter $${FLO.toString(16)}..$${FHI.toString(16)} over ${FCYCLE} s`));
for (const [t, s] of timeline) console.log(`  ${t.toFixed(0).padStart(3)} s  ${s}`);
if (back) console.log(`  ${t0.toFixed(0).padStart(3)} s  ${back.moves[0][1].join(' ')}  (loop)`);
