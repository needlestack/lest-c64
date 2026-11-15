// levels.mjs -- THE LEVELS, as data: every map, wall group, socket, pedestal, exit (and where it
// leads), entity placement, start pose and ink of the game's ten levels, with the history of each.
//
// Moved out of src/build-iray.mjs on 2026-11-15 (the user: "the levels are just data that can be read
// out? do we really have to build?"). A level sheet (docs/levels/LEVELn.txt) used to be a whole run
// of the build with LEVELSHEET=1, which ran a table dump of every other level and a rebuild per
// breakable wall before it printed -- minutes a sheet, for data that needs no build at all. Now
// tools/levelsheet.mjs reads this module and prints all ten at once, and the build imports it, so
// the sheets and the game still come from one source.
//
// WHAT BELONGS HERE: what a level IS -- the definitions, and the small pure derivations of them that
// anything reading levels needs (mapOf, entitiesOf, exitsOf, socketsOf, palOf, nextLevel...). No
// assembly, no engine tables, and none of the build's TEST switches: those (NOORB, ANGEL=0, NOSV,
// NOHOLE, HOLEX/HOLEY, SOCKETS, PEDESTALS, EXITCOLS, LEASH, PX/PY/PA/PAF, STAGE, L10OPEN, FLKLIT,
// PALTEST, ENDTEST, WALLOFF) stay in the build and are applied there, on top of these.
// THE ENV THIS MODULE STILL READS, deliberately: the knobs that RE-TONE or RE-SHAPE a level's own
// content, which the build used to read right where the definition stood -- CEILn/SEAMn, SEAMCOL,
// FLKTONE/FLKDSEAM/FLKGND/FLKWALL/FLKSEAM, FLOORDK, IDOLBn, IDOLROOMB, BOLTCOL, RAGGED (level 10's
// exit ink), BIG=0 and BREAK=0. Read once, at import, exactly as before; a sheet printed under one of
// them shows that variant, as a LEVELSHEET build did.
import { END_DST } from './ending-src.mjs';
//
// The maps below are the user's sheets of 2026-11-04 on (each level's own comment says which). The
// layouts before them -- level 1's 23x11 room-corridor-ring of 2026-09-15, and levels 2 (16x16) and
// 3 as first drawn on 2026-09-18 -- went with MAPSET=v1 (2026-11-15) and live in git.
// "Interesting rooms are about 1/4-1/3 the size of the map; with pillars a space can be bigger
// as a whole but broken up." (the user, 2026-09-18)
//
// Levels do NOT share a grid: lvlDimT/rowMulT/bfsDCT travel with the level and every stride site
// reads them, so the only rule is W x H <= 256 per level.
// (2026-11-15: MAPSET=v1, the map set before the user's 2026-11-04 revisions, went with the level 2,
// 3 and 5 trials, L2VAR/L3VAR/L5VAR: "The maps in the latest build are the maps.")
// ---- EVERY LEVEL THE GAME HAS: the disk carries them all ----
// Every feature flag asks "does any level of the GAME use it" (LEVEL_IDS), never "does a level on
// this disk": a mechanic is part of the engine. (Under CHAIN, a 1-4 disk compiled the idol out, 1,166
// bytes of code, so a small chain was a dishonest measurement of the engine.)
// 8 SHIPS (2026-10-13, the user: "let's keep this as level 8 ... where you drop after completing the
// errands and dropping through the black exit on level 4"). It was the flicker / lighting test from
// 2026-10-09.
// 9 SHIPS (2026-10-15, the user: "level 9 is great. let's add it"), after 8: the sentries' level.
// 10 SHIPS (2026-11-13, the user: "level 10 should be shipping now. it's good. everything is good"):
// the BIG ANGEL's level, after 9 -- see L10. It brings the flute with it (LEVEL_FLUTE borrows its ball).
// (WIP_LEVEL_IDS / WIP=1, the unshipped levels defined but kept out of the engine, went 2026-11-15
// with the list empty: a level not ready is a level not yet in SHIP_LEVEL_IDS.)
const SHIP_LEVEL_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const LEVEL_IDS = SHIP_LEVEL_IDS;
// LEVEL 2 (the user's sheet, 2026-11-04): 15x16. The start room (x1-5, y1-9) holds two orbs at
// its east edge; S1 (6,5) sits in its east door and opens |1 (8,5), the wall between the little
// (7-8,4-6) pocket and A1 (10,5) in the corridor east of it. A third orb at (8,1) is up the north
// corridor, which runs east and down col 12 past the corridor to row 9, then south through (8,10)
// to the lower half: S2 (11,14) opens |2 (10,14), and S3 (6,14) opens |3 (5,14), behind which A2
// (4,14) guards the exit's room (x1-3, y11-14), exit (2,11). Start (4,9), ~30 degrees east of north (the
// user, 2026-11-13: "about 2 cells south and turning clockwise about 20 degrees", then 10 more, with
// the first orb about one orb-width in from the right edge; it was (4,7) due north).
const L2 = { map: ["###############",
                   "#......#......#",
                   "#......#####.##",
                   "#.....######.##",
                   "#.....#..###.##",
                   "#.......#....##",
                   "#.....#..###.##",
                   "#.....######.##",
                   "#......#####.##",
                   "#......#......#",
                   "########.######",
                   "#...####......#",
                   "#...########..#",
                   "#...########..#",
                   "#....#....#...#",
                   "###############"],
             walls: [[[8, 5]], [[10, 14]], [[5, 14]]], socks: '6,5;11,14;6,14',
             orbs: [[8, 1], [6, 2], [6, 8]], a1: [10, 5], a2: [4, 14], start: [0x0480, 0x0980, 0xd9, 0x00] };
// LEVEL 3 (the user's sheets, 2026-09-18 and 2026-11-04): a 2x2 chamber in the middle with an angel
// INSIDE it, whose north-west corner (two cells) goes when S1 (5,5) is fed, and angels in two far
// corners. The exit is at (10,10), walled in on all four sides, with S2 (7,7) inside the chamber
// opening (11,10), (10,11) and (11,11) round it. The east room is col 9, one wide, from row 4 down
// to the orb at (9,9), between walls at cols 10-11; col 12 runs down to the other orb in the corner,
// (12,12). Walls north of the chamber at (5,3)-(6,3) and (6,4)-(7,4), and west of it at (3,5)-(3,6)
// and (4,6)-(4,7), leave S1 reached from (4,5). Rows 10-11 are walled from col 5.
const L3 = { map: ["##############",
                   "#............#",
                   "#............#",
                   "#....##......#",
                   "#.....##.....#",
                   "#..#..###.##.#",
                   "#..###..#.##.#",
                   "#...##..#.##.#",
                   "#....####.##.#",
                   "#.........##.#",
                   "#....#####.#.#",
                   "#....#######.#",
                   "#............#",
                   "##############"],
             wall2: [[11, 10], [10, 11], [11, 11]], orbs: [[9, 9], [12, 12]], exit: [10, 10] };
// LEVEL 5 (the user's sheet, 2026-11-04; their row labels skip 5, so the grid is the 10 rows drawn):
// 17x10, two angels, ONE socket. The start (1,7) faces east with A1 (5,7) at the start room's
// one-wide neck. The exit is open from the start, at the west end of row 4 (1,4), with A2 (2,4)
// standing in front of it and an orb (3,4) beside A2; the other orb waits up the comb at (12,2).
// S1 (14,8) opens |1 (15,8) into col 15, the idol at its top, (15,2) (it was (15,1) until the user
// shortened the column, 2026-11-04). The oracle (beam 300) did NOT solve the (15,1) version: it takes
// A2's orb, and coming back with the idol both angels cork the row-8 hall.
const L5 = { map: ["#################",
                   "#################",
                   "###########...#.#",
                   "###########.#.#.#",
                   "#...........#.#.#",
                   "###########.#.#.#",
                   "#.....##....#.#.#",
                   "#........####.#.#",
                   "#.....##.......##",
                   "#################"],
             walls: [[[15, 8]]], sockWall: [0], socks: '14,8', orbs: [[12, 2], [3, 4]],
             angels: [[5, 7], [2, 4]], idol: [15.5, 2.5], exit: [1, 4], start: [0x0180, 0x0780, 0x00, 0x00] };
// LEVEL 6 (the user's sheet, 2026-11-04; their row labels skip 3 and 9, so the grid is the 11 rows
// drawn). Both angels are caged in col 7, A1 (7,4) above A2 (7,6), with |2 (7,5) between them.
// The two S1s, (8,1) and (8,9), open the SAME group, |1: (9,1) and (9,9) into the east room, and the
// cage's top (7,3) and bottom (7,7). Whichever is fed first opens it; the other then opens nothing
// (orbMove skips a wall that is already out). The orb (1,4) is the far side of the exit from the
// start. The second orb (9,5) is in the east room, for S2 (12,5), which opens |2: the idol's door
// (13,5), the wall between the angels, and (4,5), which joins cols 3 and 5. S2 also CLOSES W2,
// (4,1) and (4,9), cutting rows 1 and 9 in two (see LEVEL_CLOSE). The idol is at (14,5) and the
// exit at (1,5). The user wants the angels to trap the player in the east room.
// Markers for the reader: | a door and W a closer (both SOLID in the map, see stInit), the rest floor.
const L6 = {
  map: ["################",
        "#...W...S|.....#",
        "#.#.#.#.###....#",
        "#.#.#.#|#...####",
        "#O#.#.#A##..#..#",
        "#X#.|.#|#O..S|I#",
        "#P#.#.#A##..#..#",
        "#.#.#.#|#...####",
        "#.#.#.#.###....#",
        "#...W...S|.....#",
        "################"].map(r => r.replace(/[|W]/g, '#').replace(/[XAOPSI]/g, '.')),
  walls: [[[9, 1], [7, 3], [7, 7], [9, 9]],          // |1: either S1
          [[13, 5], [7, 5], [4, 5]],                 // |2: S2
          [[4, 1], [4, 9]]],                         // W2: S2 puts these back (a closer, LEVEL_CLOSE)
  sockWall: [0, 0, 1], socks: '8,1;8,9;12,5',
  close: [{ wall: 2, socks: [2] }],                  // wall 2 is a closer, shut by socket 2 (S2)
  orbs: [[1, 4], [9, 5]], angels: [[7, 4], [7, 6]], idol: [14.5, 5.5], exit: [1, 5],
  start: [0x0180, 0x0680, 0xc0, 0x00],               // (1.5, 6.5) facing north, at the exit
};
// LEVEL 7 (the user's sheet, 2026-11-08): three angels. A1 (3,4) is plugged in its pocket by the
// orb (2,4); A2 (3,6) waits behind |1 (3,7); A3 (12,5) stands beside the second orb (11,5). S1 (1,1)
// opens |1: A2's door, (2,10) at the foot of col 1 and (12,10) to the east side. S2 (10,1) opens
// |2 (9,1), the exit room's only way in -- (5,2) and (6,3) wall it off from the west. The idol
// (7,8) sits two cells north of the start, free for the taking; the way OUT is the puzzle.
const L7 = {
  map: ["################",
        "#S..#X...|S.#..#",
        "#.#..#...#..#..#",
        "#.##..#..#.....#",
        "#.OA#..#######.#",
        "#.###..#...OA..#",
        "#.#A#..#...#####",
        "#.#|..###......#",
        "#.#..##I##.....#",
        "#.#.##...####..#",
        "#.|....P....|..#",
        "################"].map(r => r.replace(/\|/g, '#').replace(/[XAOPSI]/g, '.')),
  walls: [[[3, 7], [2, 10], [12, 10]],              // |1: S1
          [[9, 1]]],                                 // |2: S2, into the exit room
  sockWall: [0, 1], socks: '1,1;10,1',
  orbs: [[2, 4], [11, 5]], angels: [[3, 4], [3, 6], [12, 5]],
};
// LEVEL 10 (ships since 2026-11-13): THE BIG ANGEL, gold, in the pillar halls below. (The user's first
// sheet, 2026-11-10 -- 17x15, the angel caged at the centre of two rings by an orb in its doorway, a
// socket opening the exit door -- was set aside 2026-11-11.)
const L10 = {
  // THE PILLAR HALLS (the user, 2026-11-11, for the follow/fire/back-off AI): a 10x12 floor of halls
  // between 2x2 pillars -- one-wide halls north-south, single rows at the ends and double rows between --
  // in a two-thick wall: the outer ring stands, the inner one breaks ("the outer ring of the outer wall
  // I gave would be the indestructable edge and the inner ring of the exterior wall would be
  // destructable"). 14x16, as drawn. Before it: the quarry, the grid and the sheet, all set aside.
  map: ["##############",
        "##############",
        "##..........##",
        "##.##.##.##.##",
        "##.##.##.##.##",
        "##..........##",
        "##..........##",
        "##.##.##.##.##",
        "##.##.##.##.##",
        "##..........##",
        "##..........##",
        "##.##.##.##.##",
        "##.##.##.##.##",
        "##..........##",
        "##############",
        "##############"],
  socks: '',
  // No exit, no orbs. Opposite corners: the angel north-east, the player south-west facing north.
  // The exit at the central pillar's centre: cell (7, 8), drawn at its north-west corner (7.0, 8.0) --
  // where the pillar's four cells (6-7, 7-8) meet. See LEVEL_CORNER.
  orbs: [], angels: [[11, 2]], exit: [7, 8],
  start: [0x0280, 0x0d80, 0xc0, 0x00],               // (2.5, 13.5) facing north
};
// ---- 5, 6 and 7: the hub's three errands ----
// One room, one idol, one hole, straight back to the hub. Each is told apart by COLOUR as well as
// by its map: red, green and blue for the hub's three coloured holes, and an idol whose body is the
// light version of the room it stands in. (STUB_MAP, the 6x6 stub room, went 2026-11-14.)
// LEVEL 1 (the user's sheet, 2026-11-04): 22x11. The west room holds A1 behind the orb (6,5) in its
// corridor mouth; the exit is at (15,5). The east chamber's inner ring is closed on the east (col 19
// is solid but for row 5's orb), so its angel A2 stands at (18,5) inside it with the orb (19,5)
// behind it in the door to the outer column, and A2's leash is (20,2)/(20,8).
const L1_MAP = [
  "######################",
  "#..##..######........#",
  "#......######.######.#",
  "##....#######.#....#.#",
  "##....#######.#.##.#.#",
  "##............#.##...#",
  "##....#######.#.##.#.#",
  "##....#######.#....#.#",
  "#......######.######.#",
  "#..##..######........#",
  "######################",
];
// (Level 9 is parsed up here, ahead of LEVEL_WALLS, which takes its door from the sheet.)
// ---- LEVEL 9: SENTRIES -- the user's map, in the user's own notation ----
// The silver orbs no longer chase -- "you run away and don't look at them (wasting their cool large
// & animated effect)" -- they PATROL: each runs its own closed path at a fixed rate, a timing
// challenge. The sheet is the source: ~n is sentry n's path, ~# a cell two paths share, and ~<
// ~> ~^ ~v a sentry's start cell and first heading. A path is traced from its start: at each cell
// the sentry goes on to a neighbour on its own path (its number, ~#, or its own start), preferring
// straight on, never back, until it is home. "Not a complete level, just a test."
// v3 (the user, 2026-10-13): EIGHT sentries, four round each pillar, both loops clockwise -- so the
// two lanes that touch (rows 4 and 5) run in opposite directions. The user wrote the paths ~~;
// they are numbered here because the loops touch and a bare ~~ would fork at (2,4)/(2,5).
// v4 (the user, 2026-10-14): the PUZZLE on the normal machinery -- OO at (6,8) is an ordinary orb,
// S1 at (6,1) an ordinary socket, and |1 at (7,1) the door it opens (LEVEL_WALLS[9], from this
// sheet). Pick the orb up at the bottom of loop 2, carry it round to the top of loop 1, and the way
// east opens. Right of the door is placeholder; (12,6) is OPENED here as it was in v3, or (12,7)-(12,8)
// is a pocket nothing can reach and the angel-path connectivity check refuses the map.
// v5 (the user, 2026-10-14): Loops 1 and 2 as before; past the door, column 8 runs
// south through three back-and-forth lanes (4, 5, 6: three cells each, so a dead end turns a
// sentry round) to the long corridor on row 10, with the second orb at its west end; the final
// room is four loops (9, 0, 7, 8), two sentries each, guarding the way up to S2 and the exit.
// AA is the angel, and |1 is also its LEASH (it may never come west through the open door).
// Transcribed with the user's bare ~~ numbered (loops 1 and 2 touch, so a bare ~~ would fork),
// the row labels renumbered 0-11 (the sheet skipped 9 and 11), and loop 8's top-left start v8 (the
// user's first draft had <8, heading off the loop into loop 7).
// v6 (the user, 2026-10-14): THE ROOMS ARE SEALED. Wn is a wall that CLOSES when socket Sn is fed
// (|n opens at the same moment), and the room behind it is gone for good: its entities are dropped
// and the next room's take their slots -- the STAGES (see L9_STAGES). S1 can only be fed from (7,1),
// with W1 right behind it; S2 only from (9,10), with W2 two cells up column 8 -- so the angel, let
// out of its pocket at (10,1) when S1 opens |1, usually follows you past W2 into room 3. If W2
// closes on it, it is pushed FORWARD (the user). Loops 9 and 0 now run the other way. Room 3's orb,
// for S3, at (12,1) in the alcove beside it.
// v7 (the user, 2026-10-14): NO ANGEL. Its pocket is wall, (9,1) is floor beside S1, |1 is (8,2)
// alone; W2 drops to (8,9), sealing column 8 just above the corridor, which now starts at (6,10)
// with the second orb at its west end.
// v8 (the user, 2026-10-15): NO THIRD SOCKET. S3, |3 and room 3's orb are gone; the exit moves to (11,1),
// reached from room 3 up (15,2) and west along row 1. Section 2's lanes renumbered 3/4/5 (the user's
// bare ~~ numbered with their lane's sentry), room 3's loops 8/9/6/7.
const L9_SHEET = `
 0  [] [] [] [] [] [] [] [] [] [] [] [] [] [] [] [] [] []
 1  [] [] >1 ~1 ~1 v1 W1 .. S1 .. [] XX .. .. .. .. .. []
 2  [] [] ~1 [] [] ~1 [] [] |1 [] [] [] [] [] [] .. [] []
 3  [] .. ~1 [] [] ~1 [] >3 ~3 ~3 [] ~8 ~8 <8 ~9 ~9 v9 []
 4  [] PP ^1 ~1 ~1 <1 [] [] .. [] [] ~8 .. ~8 ~9 .. ~9 []
 5  [] PP ~2 >2 ~2 ~2 [] ~4 >4 ~4 [] >8 ~8 ~8 ^9 ~9 ~9 []
 6  [] .. ~2 [] [] v2 [] [] .. [] [] >6 ~6 ~6 v7 ~7 ~7 []
 7  [] [] ^2 [] [] ~2 [] ~5 ~5 <5 [] ~6 .. ~6 ~7 .. ~7 []
 8  [] [] ~2 ~2 <2 ~2 OO [] .. [] [] ~6 .. ~6 ~7 .. ~7 []
 9  [] [] [] [] [] [] [] [] W2 [] [] ~6 ~6 <6 ~7 ~7 ^7 []
10  [] [] [] [] [] [] OO .. .. .. S2 |2 .. .. .. .. .. []
11  [] [] [] [] [] [] [] [] [] [] [] [] [] [] [] [] [] []`;
// v2 of the notation (the user, 2026-10-13, four sentries, two per loop): a start is its HEADING and
// its path -- v1 ^1 <2 -- or ># on a cell two paths share. (The first sheet's ~v, heading only, still
// reads: its number is the first numbered cell ahead.) A path cell is ~n, ~# or any start on it.
const L9 = (() => {
  const g = L9_SHEET.trim().split('\n').map(l => l.trim().split(/\s+/).slice(1));
  const tok = (x, y) => g[y]?.[x] ?? '[]';
  const D = { '>': [1, 0], '<': [-1, 0], 'v': [0, 1], '^': [0, -1] };
  // which path a token puts its cell on: '1'..'9', '#' (shared), or null; and a start's heading
  const pathOf = t => t[0] === '~' && /[\d#]/.test(t[1]) ? t[1] : D[t[0]] && /[\d#]/.test(t[1]) ? t[1] : t[0] === '~' && D[t[1]] ? '?' : null;
  const headOf = t => D[t[0]] && /[\d#]/.test(t[1]) ? D[t[0]] : t[0] === '~' && D[t[1]] ? D[t[1]] : null;
  // |n is a DOOR, a wall until socket Sn is fed: a wall in the map, and LEVEL_WALLS[9] names it
  // Wn is a wall too: the map is drawn with every removable cell SOLID, and Wn is opened at the
  // start of the level (stInit) so that it can be put back later -- the same machinery the other way
  const rows = g.map(r => r.map(t => t === '[]' || t[0] === '|' || /^W\d$/.test(t) ? '#' : '.').join(''));
  let player = null, exit = null;
  const starts = [], socks = [], doors = {}, orbs = [], angels = [], closers = {};
  g.forEach((r, y) => r.forEach((t, x) => {
    if (t === 'PP') player = [x, y];
    if (t === 'AA') angels.push([x, y]);
    if (t === 'XX') exit = [x, y];
    if (t === 'OO') orbs.push([x, y]);
    if (/^S\d$/.test(t)) socks.push({ x, y, n: +t[1] });
    if (/^\|\d$/.test(t)) (doors[t[1]] ??= []).push([x, y]);
    if (/^W\d$/.test(t)) (closers[t[1]] ??= []).push([x, y]);
    if (headOf(t)) starts.push({ x, y, d: headOf(t), p: pathOf(t) });
  }));
  // trace one path from a start: on to a neighbour on path id (its number, #, or a '?' start),
  // straight on preferred, never back -- except at a DEAD END, where it turns round (v5's lanes:
  // a sentry runs back and forth). Done when it is home AND about to set off the way it started,
  // so a lane sentry starting mid-lane does the far half too; null if it forks, or is a dead end
  // both ways (an isolated cell)
  const trace = (st, id) => {
    const own = (x, y) => { const p = pathOf(tok(x, y)); return p === id || p === '#' || p === '?'; };
    if (!own(st.x + st.d[0], st.y + st.d[1])) return null;
    const dirs = [];
    let cx = st.x, cy = st.y, d = st.d;
    for (let k = 0; k <= 256; k++) {
      dirs.push(d); cx += d[0]; cy += d[1];
      let opts = [d, [d[1], -d[0]], [-d[1], d[0]]].filter(([dx, dy]) => own(cx + dx, cy + dy));
      if (!opts.length) opts = [[-d[0], -d[1]]].filter(([dx, dy]) => own(cx + dx, cy + dy));
      if (!opts.length || (opts.length > 1 && opts[0] !== d)) return null;
      d = opts[0];
      if (cx === st.x && cy === st.y && d[0] === st.d[0] && d[1] === st.d[1]) return dirs;
    }
    return null;
  };
  const ids = [...new Set(g.flat().map(pathOf).filter(p => p && /\d/.test(p)))].sort();
  const count = {};
  const sentries = [];
  // numbered starts first, so a # start can go to the path with fewer sentries
  for (const st of [...starts.filter(s => /\d/.test(s.p)), ...starts.filter(s => !/\d/.test(s.p))]) {
    let id = st.p, dirs = null;
    if (id === '?') {             // v1 notation: the first numbered cell straight ahead
      let x = st.x, y = st.y;
      for (let k = 0; k < 64 && id === '?'; k++) { x += st.d[0]; y += st.d[1]; const p = pathOf(tok(x, y));
        if (p && /\d/.test(p)) id = p; else if (p !== '#') break; }
    }
    if (id === '#') {             // a shared cell: whichever path runs through it this way, fewest sentries first
      const fits = ids.filter(i => trace(st, i)).sort((a, b) => (count[a] ?? 0) - (count[b] ?? 0));
      if (!fits.length) throw new Error(`L9_SHEET: the sentry starting at (${st.x},${st.y}) fits no path`);
      id = fits[0];
      console.error(`  L9_SHEET: the # start at (${st.x},${st.y}) could be path ${fits.join(' or ')}; it goes to ${id}, which had fewer sentries (write ${Object.keys(D).find(k => D[k] === st.d)}${id} to say so)`);
    }
    if (!/\d/.test(id)) throw new Error(`L9_SHEET: the sentry starting at (${st.x},${st.y}) heads off its path`);
    dirs = trace(st, id);
    if (!dirs) throw new Error(`L9_SHEET: sentry ${id}'s path from (${st.x},${st.y}) forks or dead-ends`);
    count[id] = (count[id] ?? 0) + 1;
    sentries.push({ id, x: st.x, y: st.y, dirs });
  }
  // door n is wall group n-1, and socket Sn opens it: the numbers must run 1..k with a socket each
  const walls = Object.keys(doors).sort().map((n, k) => {
    if (+n !== k + 1) throw new Error(`L9_SHEET: the doors are numbered ${Object.keys(doors).sort()}, not 1..${Object.keys(doors).length}`);
    return doors[n];
  });
  for (const sk of socks) if (!doors[sk.n]) throw new Error(`L9_SHEET: S${sk.n} at (${sk.x},${sk.y}) has no door |${sk.n} to open`);
    // ---- THE STAGES: stage n begins when Sn is fed, if there is a Wn to close behind it ----
  // Rooms by flood fill, each in its own stage's walls: room 0 from PP with every Wn open and every
  // stage door shut; room n from Sn's cell with doors 1..n open and W1..Wn shut. Doors that start no
  // stage (|3, the exit's) count as open: what they lead to is part of the room they open from.
  const stN = 1 + Object.keys(closers).length;
  for (let n = 1; n < stN; n++) {
    if (!closers[n]) throw new Error(`L9_SHEET: the closing walls are ${Object.keys(closers)}, not W1..W${stN - 1}`);
    if (!socks.some(sk => sk.n === n)) throw new Error(`L9_SHEET: W${n} has no S${n} to close it`);
    if (closers[n].length !== 1) throw new Error(`L9_SHEET: W${n} is ${closers[n].length} cells; the push-forward handles one`);
  }
  const shut = (x, y, st) => { const t = tok(x, y);
    if (t === '[]') return true;
    if (t[0] === '|') return +t[1] < stN && +t[1] > st;      // a stage's door: shut until its stage
    if (t[0] === 'W') return +t[1] <= st;                     // a closer: shut from its stage on
    return false; };
  const flood = (sx, sy, st) => { const seen = new Set([`${sx},${sy}`]), q = [[sx, sy]];
    while (q.length) { const [x, y] = q.pop();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
        if (!seen.has(k) && !shut(nx, ny, st)) { seen.add(k); q.push([nx, ny]); } } }
    return seen; };
  const rooms = [...Array(stN)].map((_, n) => n === 0 ? flood(...player, 0)
    : (sk => flood(sk.x, sk.y, n))(socks.find(sk => sk.n === n)));
  const roomOf = (x, y) => rooms.findIndex(R => R.has(`${x},${y}`));
  // a sentry lives in ONE room, for that room's stage; its whole path must be in it and no other
  for (const sn of sentries) {
    const cells = [[sn.x, sn.y]]; let x = sn.x, y = sn.y;
    for (const [dx, dy] of sn.dirs) { x += dx; y += dy; cells.push([x, y]); }
    const inR = rooms.map(R => cells.some(([cx, cy]) => R.has(`${cx},${cy}`)));
    sn.stage = inR.indexOf(true);
    if (sn.stage < 0 || inR.filter(Boolean).length > 1 || !cells.every(([cx, cy]) => rooms[sn.stage].has(`${cx},${cy}`)))
      throw new Error(`L9_SHEET: sentry ${sn.id} from (${sn.x},${sn.y}) runs through more than one room (${inR.map((v, i) => v ? i : '').join('')})`);
    sn.cells = cells;
  }
  // each closer: its cell, and the cell AHEAD of it -- its neighbour in the room it seals you into
  const close = [...Array(stN - 1)].map((_, k) => { const [wx, wy] = closers[k + 1][0];
    const ahead = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [wx + dx, wy + dy]).filter(([ax, ay]) => rooms[k + 1].has(`${ax},${ay}`));
    if (ahead.length !== 1) throw new Error(`L9_SHEET: W${k + 1} at (${wx},${wy}) has ${ahead.length} neighbours in room ${k + 1}; it needs exactly one to push into`);
    return { x: wx, y: wy, ax: ahead[0][0], ay: ahead[0][1] }; });
  return { rows, player, exit, sentries, socks, orbs, angels, walls: [...walls, ...Object.keys(closers).sort().map(n => closers[n])],
           nDoor: walls.length, sockWall: socks.map(sk => sk.n - 1), stN, rooms, roomOf, close, shut };
})();
const L9_MAP = L9.rows;
// THE CAST, BY STAGE. Sentry slots 0..SV_MAX-1 are shared: in each stage they hold that room's
// sentries, in sheet order, and the rest are hidden. ROLES are every sentry, stage 0's first and
// padded to SV_MAX (so stage 0's role k is slot k, which is how objInit already places them), then
// each later stage's in turn. Orbs and angels keep a slot each for the whole level: they appear when
// the room they start in comes into play, and leave only by being left behind (see stGo).
const L9_STAGES = (() => {
  const byS = [...Array(L9.stN)].map((_, n) => L9.sentries.filter(sn => sn.stage === n));
  const svMax = Math.max(1, ...byS.map(a => a.length));
  const roles = [...byS[0], ...Array(svMax - byS[0].length).fill(null), ...byS.slice(1).flat()];
  let r = svMax;
  const slotRole = byS.slice(1).map(a => [...Array(svMax)].map((_, k) => k < a.length ? r++ : 0xff));
  const firstOf = (x, y) => L9.rooms.findIndex(R => R.has(`${x},${y}`));
  return { svMax, roles, slotRole, firstOf, byS };
})();
// A removable "wall" is a GROUP of cells that go together (2026-09-18, level 3's L-shaped
// ones). WALLS[k] is group k's cells; SOCK_WALL[i] is the group socket i (SOCKETS_AT order)
// takes out, $ff for none. Per level, and ANY NUMBER of levels may have walls -- see WALLS_ALL
// in the build, which flattens them into one global id space. (WALLOFF=k builds a level with wall
// k-1 gone, for its delta.)
const LEVEL_WALLS = {
  // THE HUB (revised by the user 2026-09-24). Column 9 is open only at rows 3-5, where the
  // three pedestals stand; column 10 is the removable wall behind them. Feed all three and the
  // whole of column 10 goes, which is the only way into the east half and its exit. ONE group,
  // not one per pedestal: nothing opens until all three are seated
  // and then everything opens at once, so there is only ever one collapse to animate -- and
  // wallTog is single-wall state (wsWall, wsN), so three of them in one frame would leave the
  // first two with doomT set and a map that never changed. All three pedestals name wall 0;
  // the gate that holds it shut until the last one is fed is in orbMove, at omPdC.
  4: { walls: [[[10, 6]]],                          // the east ring's mouth (v3, 2026-10-27)
       sockWall: [0, 0, 0] },
  2: { walls: L2.walls, sockWall: [0, 1, 2] },
  5: { walls: L5.walls, sockWall: L5.sockWall },     // S1 into the idol's column
  6: { walls: L6.walls, sockWall: L6.sockWall },     // both S1s name |1, and W2 is group 3
  7: { walls: L7.walls, sockWall: L7.sockWall },
  8: { walls: [[[15, 5]]],                           // S1 (14,5): the door to the exit
       sockWall: [0] },
  9: { walls: L9.walls, sockWall: L9.sockWall },     // from the sheet: |1 (7,1), opened by S1 (6,1)
  3: { walls: [[[6, 5], [5, 6]],                                // S1 (5,5): the chamber's NW corner
              L3.wall2],                                       // S2 (7,7): the exit's corner
       sockWall: [0, 1] },
};
// Any level's map by number, for the few places that need a level OTHER than the live one --
// a wall's cell ids are in its own level's width, which need not be the live one's.
// (2026-11-15: mapOf, not MAP_OF -- the build's MAP_OF wraps this to give level 2's through SOCK_MAP,
// which a WALLOFF sub-build punches. Here every map is as authored.)
const mapOf = n => n === 2 ? L2.map : n === 3 ? L3_MAP : n === 4 ? L4_MAP
                 : n === 5 ? L5_MAP : n === 6 ? L6_MAP : n === 7 ? L7_MAP : n === 8 ? L8_MAP : n === 9 ? L9_MAP : n === 10 ? L10.map : L1_MAP;
// Which levels carry an IDOL, and where. Declared up here with the other level facts because
// the sprite ladder is built long before ORBS exists, and a ladder nothing uses is 1K of bank 3
// -- which bank 3 does not have. Levels 1-3 are unaffected by the idol existing at all.
// One per errand room. Level 5's
// stands at the top of the column its SECOND socket opens, so reaching it is the room.
const LEVEL_IDOL = { 5: L5.idol, 6: L6.idol, 7: [7.5, 8.5] };
// ---- ...and an idol is a GAME object, not a level object ----
// Which is the whole difference between it and an orb. An orb belongs to the room it is in and
// objInit puts it back on every arrival; an idol has a PLACE in the game that outlives the room
// and outlives dying -- "everything resets except the idols", so a delivered one stays on its
// pedestal and stays gone from the room it came out of.
// So each idol gets an ID, every level that can hold one declares a SLOT for it, and one byte
// per idol says which level it is actually in. objInit still resets everything from the build
// data; idolPlace then applies those three bytes over the top. That is much less invasive than
// making arrival stop resetting -- and it is what makes death cheap, because the three bytes
// are simply not among the things a restart touches.
// The idol INDEX has to match the PEDESTAL index, because pedGate's rule is "idol n belongs on drum
// n" and the player reads the rule off the COLOURS. Pedestals are red/green/blue (PED_COLS), and
// (the user, 2026-11-08) level 6 is the GREEN room and 7 the BLUE one, so 6's idol is idol 1 and
// 7's idol 2. The idols, the LEVEL_PAL inks and the hub's exit colours (LEVEL_EXITCOL) must agree.
const IDOL_HOME = { 5: 0, 6: 1, 7: 2 };   // level -> the idol that lives there
// Its IDENTITY colour -- the light version of its home room, carried wherever it goes, which is
// what says which pedestal it belongs on once it is out of that room. Distinct from idolCar,
// the tint the room you are standing in puts on whatever is in your hands.
// THE one source. It was duplicated in LEVEL_IDOL_SPR's `body` entries -- the same three
// numbers written twice -- which is how a held idol came to take the room's value instead of
// its own. IDOLB<home level> overrides one.
const IDOL_BODY_OF = [0x02, 0x05, 0x06].map((c, i) => {   // red, green, blue -- PED_COLS' order
  const home = +(Object.keys(IDOL_HOME).find(n => IDOL_HOME[n] === i) ?? 0);
  return process.env[`IDOLB${home}`] === undefined ? c : +process.env[`IDOLB${home}`];
});   // ...the PEDESTALS' own three, so a seated idol matches the drum it
      // stands on, and a dark body reads as a midtone against the grey1/grey2 shared pair
      // rather than as a second highlight competing with the grey3 cap.
const IDOL_N = 3;
// ---- a level's whole LOOK is three bytes ----
// The three inks each own a register (00 = $d021 ceiling and floor, 01 = $d022 walls,
// 10 = $d023 seams -- see the charset note), which is precisely so a level can be re-toned
// without touching a single charset entry. Only the overrides are listed; PAL_DEF below fills
// the rest. Applied at boot for the starting level and on every arrival (lvlLook) for the one
// arrived at, so it travels with the level rather than with the slot.
// level 4: grey 1 ground, light blue seams. Overridable so a colour can be tried without an
// edit -- CEIL4=2 SEAM4=7, say -- which also makes the raster split visible when it is loud.
// LEVEL 5 is RED (light red seams), like the hub hole that leads to it. (Its first design was black
// ground and ceiling, the wall/ceiling outline -- LEVEL_SEAM -- the whole image; retired with it.)
const LEVEL_PAL = { 4: { ceil: +(process.env.CEIL4 ?? 0x0b), seam: +(process.env.SEAM4 ?? 0x0e) },
                    5: { ceil: +(process.env.CEIL5 ?? 0x02), seam: +(process.env.SEAM5 ?? 0x0a) },
                    // 6 is GREEN and 7 is BLUE, the colours of the hub holes that lead to them
                    // (see IDOL_HOME and LEVEL_EXITCOL): the colour is what says where you went.
                    6: { ceil: +(process.env.CEIL6 ?? 0x05), seam: +(process.env.SEAM6 ?? 0x0d) },
                    7: { ceil: +(process.env.CEIL7 ?? 0x06), seam: +(process.env.SEAM7 ?? 0x0e) },
                    // 8 is DARK: ground and walls black, seams the flicker tone's dark ink (FLKDSEAM,
                    // set below). LEVEL_FLICKER lights it.
                    8: { ceil: 0x00, wall: 0x00, seam: 0x0b },
                    // 10, the big angel's: a dark grey ground, so its gold reads (yellow on
                    // level 1's white would vanish, as the silver orb's white did)
                    10: { ceil: +(process.env.CEIL10 ?? 0x0b), seam: +(process.env.SEAM10 ?? 0x0c) } };
                    // 9 (the silver orb lab) is level 1's white and black on purpose: the user
                    // rendered the ball's reflections for that scheme.
// ---- LEVEL_FLICKER: a failing fluorescent tube (the user's lighting test, 2026-10-09) ----
// A level listed here is lit, for single 60Hz frames at random, in these inks: ground (ceiling
// AND floor), walls and seams. Between flashes it shows its LEVEL_PAL inks. The flashes come in
// BURSTS -- a stutter of a few frames, some lit and some not -- with a quiet gap between, which
// is what a bad tube does; see flkTick. Done in the top-of-frame IRQ, so a flash is exactly one
// video frame whatever the render rate: hooked to the renderer it would last a whole rendered
// frame, ~4 of them at 15 fps, and read as a blink rather than a flicker.
// The occluder cells -- the wall drawn in pair 11 so a sprite can pass behind an edge -- take pair
// 11's ink from colour RAM, which in multicolour holds only 0..7. So the LIT WALL must be 0..7 for
// them to flash with it (FLKINK, in build-iray.mjs). Black lit walls also match, and were tried and rejected.
// FLKTONE picks a whole tone for level 8: the dark seam, then the lit ground / wall / seam. Blue
// is the default, being the one whose lit wall (6) colour RAM can show -- see FLKINK. Grey and amber
// looked as good (the user, 2026-10-09) but light the walls 11 and 9, so they build only with
// FLKANYWALL=1. FLKGND/FLKWALL/FLKSEAM still override one lit ink of whichever tone, and
// FLKDSEAM the dark seam: FLKDSEAM=11 FLKSEAM=11 is a grey seam that never changes.
const FLK_TONES = { grey:  { dark: 0x0b, gnd: 0x0c, wall: 0x0b, seam: 0x0f },   // grey 1 / 2 / 3
                    amber: { dark: 0x09, gnd: 0x08, wall: 0x09, seam: 0x07 },   // brown / orange / yellow
                    blue:  { dark: 0x06, gnd: 0x0e, wall: 0x06, seam: 0x01 },   // blue / light blue / white
                    green: { dark: 0x05, gnd: 0x0d, wall: 0x05, seam: 0x01 },   // green / light green / white
                    red:   { dark: 0x02, gnd: 0x0a, wall: 0x02, seam: 0x01 },   // red / light red / white
                    ember: { dark: 0x02, gnd: 0x08, wall: 0x02, seam: 0x01 } }; // red / orange / white
const FLK_TONE = FLK_TONES[process.env.FLKTONE ?? 'blue'];
if (!FLK_TONE) throw new Error(`FLKTONE=${process.env.FLKTONE}: known tones are ${Object.keys(FLK_TONES).join(', ')}`);
LEVEL_PAL[8].seam = +(process.env.FLKDSEAM ?? FLK_TONE.dark);
const LEVEL_FLICKER = { 8: { gnd: +(process.env.FLKGND ?? FLK_TONE.gnd), wall: +(process.env.FLKWALL ?? FLK_TONE.wall),
                             seam: +(process.env.FLKSEAM ?? FLK_TONE.seam) } };
// ---- a mark in the middle of every solid wall cell, per level ----
// Drawn as fat bits over the 4x8 multicolor cell and installed at RUNTIME, because it is a
// property of the LEVEL, not of the charset: falling out of a marked level has to take it away
// again. SOLID (code 1) only. Occluders and seam cells are deliberately left alone -- an
// occluder is a foreground-black char whose whole job is to clip sprites, and pair 11 there
// reads colour RAM, which is $08 (black) everywhere; a seam is a solid cell with a full-height
// pair-10 column that this symbol's columns would collide with.
// A single dot, as [column, row] in the 4x8 cell -- or a .png read as fat bits.
const LEVEL_SYM = { 4: [[1, 3]] };   // 5 was marked while it was a real level; the stubs are plain
// ---- FLOOR DITHER: the only way to get a darker ground on a coloured level ----
// Floor and ceiling are the SAME register ($d021, bit pair 00) because the render is mirrored,
// so a coloured room's floor is exactly as light as its sky and reads as fog rather than ground.
// There is no darker shade to reach for -- one register, one colour. So the darkening comes
// from DITHER: bit pair 01 is $d022, which is black on every one of these levels, checkered
// over the ground's pair 00 at 50%.
// Written into CHARSET B ONLY, and that is what makes it a floor treatment rather than a room
// treatment: B is the half below the horizon, so the ceiling keeps the flat colour and only the
// ground goes dark. BLANK (code 0) is the whole of it -- the solid-colour char the ceiling and
// floor runs are painted with.
// FLOORDK=n,n,... overrides the table outright, so a level can be tried dithered without an
// edit -- and so a DROP can be photographed leaving a dithered level, which the shipped table
// cannot do on its own: the hub is the only level you can fall out of and it is not in it.
const LEVEL_FLOORDK = process.env.FLOORDK
  ? Object.fromEntries(process.env.FLOORDK.split(',').map(n => [+n.trim(), 1]))
  : { 5: 1, 6: 1, 7: 1 };
// The body an idol takes in the room it is GATHERED from: orange, the midtone of that ramp.
// In the hub it takes its identity colour instead (IDOL_BODY_OF), because there the colour has
// a job -- saying which pedestal it belongs on.
const IDOL_ROOM_BODY = +(process.env.IDOLROOMB ?? 0x08);
// Which levels stand pedestals, and where. Keyed by level like LEVEL_WALLS rather than derived
// from HUBROOM, because HAS_PED has to be true for the whole game -- the ladder is emitted once
// and every level's pedestals draw from it, so asking only about the live level would
// leave a shadow level's pedestals pointing at bitmaps that were never built.
const LEVEL_PEDESTALS = { 4: '9,5;9,6;9,7' };
// ---- LEVEL_BIG: levels whose angels are the BIG angel (2 columns x 3 rows of sprites) ----
// The user, 2026-11-10: "let's try a six sprite angel and see how big it feels -- it's only worth doing
// if it's noticeably bigger". Its close rungs are six magnified sprites; its art rides in IAR2 at
// OVLBASE, loaded with the level (lvlArt), so it costs bank 3 nothing anywhere else. See BIG_V0.
const LEVEL_BIG = process.env.BIG === '0' ? {} : { 10: true };   // BIG=0: level 10's angel at the ordinary size, to compare
const HAS_BIG = LEVEL_IDS.some(n => LEVEL_BIG[n]);
// ---- BREAKABLE WALLS (the user, 2026-11-11: "every non-edge wall" breakable, "filled with the dotted
// look from level 4") ----
// The big angel's ball lightning breaks the wall cell it flies into. Which cells: every wall but the
// map's OUTER RING (the user: "the rest is destroyable walls except the outer ring"). (It was every wall
// not joined through walls to the edge, for the pillar grid; in a quarry that is none of them.) One cell a hit, through the doors' own collapse (wallTog: the sink, the
// sound, the runs, the angel's map); see brHit. BREAK=0 builds level 10 with none.
const LEVEL_BREAK = process.env.BREAK === '0' ? {} : { 10: true };
// THE CORNER EXIT (the user, 2026-11-11: "put an exit right in the middle of the central column, so that
// all four walls there need to be destroyed before you can fall through" -- "true center"). A level's
// exit 0 can sit at its cell's NORTH-WEST CORNER, where four cells meet: drawn there (a frozen slide,
// CORNER_SLD), hidden until one of the four cells round it is open, and fallen through within BRKFALLR of
// that point once all four are (bhStep). lvlCorT (per level) names the hole's entity, $ff elsewhere.
const LEVEL_CORNER = { 10: true };
const HAS_CORNER = LEVEL_IDS.some(n => LEVEL_CORNER[n] && LEVEL_BREAK[n] && LEVEL_BIG[n]);
const L3_MAP = L3.map;   // (the user, 2026-09-18: "interesting rooms are about 1/4-1/3 the size of the map")
// ---- LEVEL 4: THE HUB ----
// Five ways down (four before v3) and three pedestals. The three exits in the west are the levels you
// go and fetch an idol from; the ones behind the pedestal wall are the way onward, and only open
// when all three are filled. History of the earlier layouts: The barrier is deliberately awkward: column 9 is
// pedestal/wall/pedestal/wall/pedestal, so the only way through is the two removable cells at
// (9,3) and (9,5), and column 10 shuts those off again at rows 2, 4 and 6.
// Revised by the user 2026-10-05 for the torture view: the east room was a stepped outline seen
// whole from across the hall (35 rays, 10.5 DDA steps each, 8 fps at the worst pose). Now it is a
// small plus-shaped room reached through a one-cell corridor from behind the middle pedestal, so
// it is never seen whole from far away. The wall is the corridor's mouth. Second pass the same day:
// the west chamber is a plain 6x5 box and the three errand exits sit in one-cell alcoves.
// v3 (the user's sketch, 2026-10-27: "love the new hub -- so let's make it official"): 16x13, FIVE
// exits. The west hall holds 5, 6 and 7 in alcoves at its corners and its middle; behind the pedestal
// wall the east side is a ring with TWO ways on, 8 (north) and 9 (south), "so the player can choose to go
// to either 8 or 9" -- the routing past them is for now (8 -> 9 -> the ending, so taking 9 first skips 8).
// Pedestals (9,5..7), the wall (10,6), the start (3,6). The 16x9 map before it is in git (c2b6aff).
const L4_MAP = [
  "################",
  "#X...####X.....#",
  "####.#########.#",
  "###...#.###.##.#",
  "#........##..#.#",
  "#.#......T#....#",
  "#X#P.....T|....#",
  "#.#......T#....#",
  "#........##..#.#",
  "###...#.###.##.#",
  "####.#########.#",
  "#X...#F.#C.....#",
  "################",
// T = pedestal and X = exit, markers for the reader like O/S/A/P elsewhere: the real positions
// come from the tables. '|' is a removable wall and must be SOLID in the base map, or the wall
// delta diffs two identical maps and removes nothing -- which is exactly what it did first try.
// 2026-11-12 (the user): the bottom-right exit is gone. Its tunnel runs on three cells west into a
// hidden hall, F the FLUTE at its end, behind the CURTAIN (LEVEL_CURTAIN): a plane on the west edge of
// C. The '#' between F and C is the curtain's west cell, a wall in the base map (you start east of it).
].map(r => r.replace(/\|/g, '#').replace(/[TXPFC]/g, '.'));
// ---- THE CURTAIN (the user, 2026-11-12: "a vertical plane that is visible from either side if you're
// looking at it and occludes what is behind it. but when you step through it's like it wasn't there
// physically"; "draw it like any other wall, just without the dots") ----
// The plane is the boundary between two cells, w (west) and e (east). The renderer knows only whole-cell
// walls, so the cell on the FAR side of the plane is drawn as the wall: w while you are east of it, e once
// you are west -- its face sits exactly on the boundary either way, and you are never inside it. Neither
// blocks movement. ctDot (level code) swaps them as you cross and draws the face with CURT_MK.
const LEVEL_CURTAIN = { 4: { x: 9, y: 11 } };   // the plane on the WEST edge of (x, y)
// ---- THE FLUTE (the user, 2026-11-12): behind the curtain, at the end of its hall. Picked up like an orb,
// it vanishes for good (fluteGot, never reset), and the ending plays its tune only if you have it. It
// borrows the BALL LIGHTNING's machinery -- its entity index (bltIxT), its own rungs, a hi-res slot and
// the two hooks for its height and its other sprites -- which level 10 alone uses; see FLUTE for the art.
const LEVEL_FLUTE = LEVEL_CURTAIN[4] && HAS_BIG ? { 4: [6, 11] } : {};   // (the ball's machinery is HAS_BIG's)
const L5_MAP = L5.map;
const L6_MAP = L6.map;
// ---- CLOSERS: walls that come BACK when a socket is fed (2026-11-04, level 6's W2) ----
// Level 9 has its own (stGo, part of its stages); this is the plain kind any level may use: a wall
// group that starts OUT and returns, instantly, when one of its sockets is fed. Per level, a list of
// { wall: local group id, socks: socket indices (SOCKETS_AT order) that shut it, cells }. Each cell
// carries the floor cell anything standing in it is PUSHED to -- the open neighbour nearest the
// socket, so an angel caught there comes towards you (level 9's rule) -- and nothing can stand in
// the cell once the wall is there.
const LEVEL_CLOSE = Object.fromEntries([[6, L6.close]].filter(([, c]) => c).map(([n, list]) => {
  const rows = mapOf(n), socks = (n === 6 ? L6.socks : '').split(';').map(q => q.split(',').map(Number));
  return [n, list.map(({ wall, socks: si }) => {
    if (si.length !== 1) throw new Error(`level ${n}: closer ${wall} is shut by ${si.length} sockets; the push picks its side from ONE`);
    const [sx, sy] = socks[si[0]];
    const cells = LEVEL_WALLS[n].walls[wall].map(([x, y]) => {
      // the player feeds from a cell beside the socket, so a closer that near could shut on them
      if (Math.max(Math.abs(x - sx), Math.abs(y - sy)) < 3) throw new Error(`level ${n}: closer cell (${x},${y}) is within 2 cells of its socket (${sx},${sy}); the player could be standing in it`);
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [x + dx, y + dy]).filter(([ax, ay]) => rows[ay]?.[ax] === '.')
        .sort((a, b) => (Math.abs(a[0] - sx) + Math.abs(a[1] - sy)) - (Math.abs(b[0] - sx) + Math.abs(b[1] - sy)));
      if (!nb.length) throw new Error(`level ${n}: closer cell (${x},${y}) has no floor beside it to push into`);
      return { x, y, ax: nb[0][0], ay: nb[0][1] };
    });
    return { wall, sock: si[0], cells };
  })];
}));
const L7_MAP = L7.map;
// ---- LEVEL 8, the user's maze (16x11 2026-10-12, 18x11 v4 2026-10-13): lit by a failing tube ----
// Everything is black but the seams, and a failing fluorescent tube lights the room for single
// 60Hz frames now and then (LEVEL_FLICKER). Two avenues (cols 1 and 13; 1 and 14-16 in v4) joined by three halls (rows
// 1, 5, 9), with col 7 crossing them; the blocks between are hollowed into open bays off the outer
// halls, so you can keep an angel in sight round more of the corners (the first draft's solid
// pillars made it "one hard level" -- the user, 2026-10-12). v3, the user's pocketed tweak
// (2026-10-13): the bays no longer reach the middle hall, so each is a dead-end pocket, and the
// halls meet only round the pillar at (7,5); v2's extra crossings at cols 4 and 10 made loops.
// v4, the user's (2026-10-13): 18x11. The crossing moves to col 8, round the (7,5) pillar, with
// the ONE orb at (8,5) in it; the angels move to col 13, and the exit hides behind a socket at the
// end of the middle hall: S1 (14,5) opens |1 (15,5), and the exit is X (16,5). The east avenue is
// three wide so the door and exit sit inside the border (castRay needs it solid). A fed socket
// leaves the world, so (14,5) is floor again and the way in is (14,4)/(14,6) -> (14,5) -> (15,5).
// X exit, P player, A angel, O orb, S socket, | the socket's door: markers for the reader only.
// NRUN sizes engine tables for the whole build, and every free-standing pillar is more wall RUNS:
// a 2026-10-09 draft with a room and twelve loops pushed an engine buffer out of the image.
const L8_MAP = [
  "##################",
  "#............A...#",
  "#.#...##.#...#...#",
  "#.######.#####...#",
  "#.####....####.###",
  "#P.....#O....AS|X#",
  "#.####....####.###",
  "#.######.#####...#",
  "#.#...##.#...#...#",
  "#............A...#",
  "##################",
].map(r => r.replace(/\|/g, '#').replace(/[XAOPS]/g, '.'));
// ---- where each level STARTS ----
// Per level, not per build: the death restart is "jmp entry", and lvlMeT is RAM, so after dying
// on level 4 the boot used to place you at the BUILD's start -- level 1's (2.5, 2.5) -- on level
// 4's map, which is inside a wall. lvlStart reads the live level instead, so a death always
// returns you to the official start point of the level you died on.
const LEVEL_START = {
  1: [0x0280, 0x0280, 0x19, 0xc0],
  2: L2.start,
  3: [0x0180, 0x0180, 0x20, 0x00],
  4: [0x0380, 0x0680, 0x00, 0x00],   // the hub: the player's cell (3,6), facing the pedestals
  5: L5.start,   // (1.5, 7.5), the west end of the start room, facing east
  6: L6.start,
  7: [0x0780, 0x0a80, 0xc0, 0x00],   // (7.5, 10.5) facing NORTH, the idol two cells ahead
  8: [0x0180, 0x0580, 0x00, 0x00],   // (1.5, 5.5), the west avenue, facing east down the middle hall
  10: L10.start,
  9: [0x0180, 0x0500, 0x00, 0x00],   // the sentry test's two PPs, (1,4) and (1,5): ON the line between them, (1.5, 5.0), facing east
};
const SEAMCOL = +(process.env.SEAMCOL ?? 11);   // $d023: 11 = dark grey (grey 1), 1 = white
// white ground, black walls, SEAMCOL seams -- what every level had before LEVEL_PAL existed.
const PAL_DEF = { ceil: 0x01, wall: 0x00, seam: SEAMCOL };
const palOf = n => ({ ...PAL_DEF, ...(LEVEL_PAL[n] ?? {}) });
const GOLD_BODY = 0x08;                          // level 10's orb and angel: orange, between brown and yellow
// entitiesOf(n): level n's ENTITIES, in slot order -- the orbs, then the idol, the hub's idol slots,
// the flute, then the angels (level 9: the sentries first; level 10: the ball after its orb). Each is
// { x, y, c, ... } at a cell centre, with tall/idol/silver/bolt/flute/hidden/stage/body as the level
// says. The three switches are TESTS the build passes in (NOORB=1, ANGEL=0, NOSV=1): the module reads
// no env for them. BOLTCOL, the ball's ink, is read here: it is part of the level's look.
// (2026-11-15: this was the build's ORBS, built inline for the live level only; a function of n lets
// the level sheets ask for every level without a build.)
// ---- LEVEL 1 places its objects by hand ----
// One orb at the mouth of the corridor, one hole at the far end, and (later) one angel halfway
// between them. The orb both blocks the way through and cages the angel, which is the whole
// lesson of the level -- so the placement is the design, not a scatter.
const entitiesOf = (n, { noOrb = false, noAngel = false, noSv = false } = {}) => {
  const ORBS = [];

  // NOORB=1: the angel only. It shares the sprite budget and the priority ordering with every
  // orb on screen, so having one standing in front of it is the wrong thing to be looking at
  // while judging the angel's own scaling.
  if (noOrb) { /* no plain orbs */ }
  // Level 2: three orbs for its three sockets (L2.orbs). (Its first design had ONE, in the doorway
  // to the exit's chamber: level 1's caging orb again, but one the player has to put back.)
  else if (n === 2) {                         // level 2: OO in each alcove and one on the spine
    for (const [x, y] of L2.orbs) ORBS.push({ x: x + 0.5, y: y + 0.5, c: 0 });
  }
  else if (n === 3) {                          // level 3: one in col 9, one in col 12's foot
    for (const [x, y] of L3.orbs) ORBS.push({ x: x + 0.5, y: y + 0.5, c: 0 });
  }
  else if (n === 4) {                          // (HUBTEST, three test orbs by the pedestals, went 2026-11-14)
  }                                            // THE HUB IS EMPTY. No orbs, no angel: it is the
                                               //   room you come back to, and the only things in
                                               //   it are the three pedestals and four holes.
  // The errand rooms' (5-7) own orbs are their sheets'. The idol each holds is pushed below, from
  // LEVEL_IDOL, because "which levels have an idol and where" is already written down there and a
  // second list that has to agree with it is the bug this file keeps re-learning.
  else if (n === 5) {                          // one up the comb, one beside A2
    for (const [x, y] of L5.orbs)
      ORBS.push({ x: x + 0.5, y: y + 0.5, c: 0 });
  }
  else if (n === 6) {                          // (1,4) past the exit, (9,5) in the east room
    for (const [x, y] of L6.orbs)
      ORBS.push({ x: x + 0.5, y: y + 0.5, c: 0 });
  }
  else if (n === 7) {                          // (2,4) plugs A1's pocket, (11,5) beside A3
    for (const [x, y] of L7.orbs)
      ORBS.push({ x: x + 0.5, y: y + 0.5, c: 0 });
  }
  else if (n === 8) ORBS.push({ x: 8.5, y: 5.5, c: 0 });   // v4: one orb, in the col-8 crossing
  else if (n === 10) {
    for (const [x, y] of L10.orbs) ORBS.push({ x: x + 0.5, y: y + 0.5, c: 0, body: GOLD_BODY });
    // the BALL LIGHTNING: one, hidden until the big angel throws it (bgStep); cyan its own ink
    // BOLTCOL: its own ink, cyan (3) by default -- brighter than light blue (14, 0e), which matches grey2
    if (LEVEL_BIG[10]) ORBS.push({ x: L10.angels[0][0] + 0.5, y: L10.angels[0][1] + 0.5, c: 0, bolt: true, hidden: true, body: parseInt(process.env.BOLTCOL ?? '03', 16) });
  }
  else if (n === 9) {                          // the sentries, at their starts -- FIRST, see SVN --
    // stage 0's sentries in the shared slots (a slot it does not fill starts hidden, on the first one's cell)
    L9_STAGES.roles.slice(0, L9_STAGES.svMax).forEach(sn => { const at = sn ?? L9_STAGES.roles.find(Boolean);
      ORBS.push({ x: at.x + 0.5, y: at.y + 0.5, c: 0, silver: true, hidden: !sn || noSv }); });
    // ...then the sheet's OO, each hidden until the stage of the room it lies in
    for (const [x, y] of L9.orbs) ORBS.push({ x: x + 0.5, y: y + 0.5, c: 0, stage: L9_STAGES.firstOf(x, y), hidden: L9_STAGES.firstOf(x, y) > 0 });
  }
  else if (n === 1) {                          // the user's markers: OO at (6,5), 00 at (19,5)
    ORBS.push({ x: 6.5, y: 5.5, c: 0 });         // in the corridor mouth, at the room's edge
    ORBS.push({ x: 19.5, y: 5.5, c: 0 });         // in the chamber's east door
  }
  // Loudly, not by inheriting level 1. A new level that nobody remembered to give a branch to
  // used to be built with level 1's entities standing at level 1's coordinates -- which is how
  // 6 and 7 came to have two orbs and two angels each, off the edge of a 6x6 room.
  else throw new Error(`no orb placement for level ${n} -- add a branch (an empty one is fine)`);
  // ---- the IDOL, from LEVEL_IDOL, for whichever level is being built ----
  // Driven by the declaration rather than by a branch of its own, so a level gets an idol by
  // being listed there and by nothing else. It used to be pushed inside level 5's branch with
  // LEVEL_IDOL[5] hardcoded, which meant the table said where the idol was and the placement
  // said which level had one, and only one of them was true for levels 6 and 7.
  // Pushed AFTER the orbs and BEFORE the angels, which is the order level 5 had.
  // The IDOL is luggage like an orb -- carried, dropped, and a real obstacle where it stands.
  // What it is NOT is a key: hlAt still finds the socket under it and okPlain still puts it
  // down, but nothing seats. Everything else it does, it does because it is an orb.
  if (LEVEL_IDOL[n])
    ORBS.push({ x: LEVEL_IDOL[n][0], y: LEVEL_IDOL[n][1], c: 0, idol: true,
                idolId: IDOL_HOME[n], body: IDOL_ROOM_BODY });
  // ---- the hub declares a SLOT for every idol, standing on its pedestal, HIDDEN ----
  // A delivered idol has to exist as an entity in the hub, and an entity's art, colour and
  // cell are build-time per-level data -- there is no way to conjure one at runtime. So the
  // hub carries all three from the start with orbHid0T set, and delivering one is un-hiding
  // the slot that was always there. Costs three entity slots in the hub's tables, which NORB
  // already had spare because the hub has no orbs of its own.
  // They stand ON the pedestals, in pedestal order, so idol i belongs to pedestal i.
  // LEVEL_PEDESTALS, not PEDESTALS_AT: that is declared further down, and entity placement
  // runs before it. Same string, parsed here.
  if (n === 4) (LEVEL_PEDESTALS[n] ?? '').split(';').filter(Boolean)
      .map(p => p.split(',').map(Number)).forEach(([px_, py_], i) => {
    if (i < IDOL_N) ORBS.push({ x: px_ + 0.5, y: py_ + 0.5, c: 0, idol: true,
                                idolId: i, body: IDOL_BODY_OF[i], hidden: true });
  });
  if (LEVEL_FLUTE[n]) ORBS.push({ x: LEVEL_FLUTE[n][0] + 0.5, y: LEVEL_FLUTE[n][1] + 0.5, c: 0, flute: true, body: 2 });
  // The angel starts IMMEDIATELY BEHIND the orb. Walking up to the orb -- the one thing a new
  // player is drawn to -- then puts them at nearly the closest range, so they get the heartbeat
  // end of the detune straight away instead of the far-off flange. It also stops the encounter
  // depending on them happening to look away long enough for it to close the distance.
  // Level 2's angel starts INSIDE the chamber at (5,3), immediately behind the orb that plugs the
  // door -- level 1's teaching image, rebuilt: the thing is caged and you can see it pressing on
  // the cage. It stays put because the pathing is blind to orbs (anPath routes for WALLS only), so
  // it walks into the orb, anTry refuses, and the greedy fallback has nowhere to go in a one-wide
  // doorway. Take the orb and it comes straight out at you.
  // The chamber is too tight to dodge it in and the door is one wide, so the level is: lure it out
  // onto the ring, then beat it round the other arc. ANGEL=0 takes it out to look at the room on
  // its own; the pathing and the death trigger both cope with there being none (angStep's loop
  // finds no tall entity, marked stays 0, and the HUD's E readout is gated on one existing).
  // The socket room has no angel: it is a puzzle, not a chase, and an entity count that differs
  // from the other levels' is exactly what nOrbT was made swappable for.
  if (!noAngel) {
    if (n === 2) {                               // level 2: AA behind the wall
      for (const [x, y] of [L2.a1, L2.a2]) ORBS.push({ x: x + 0.5, y: y + 0.5, c: 0, tall: true });
    }
    else if (n === 4) { }                      // no angel in the hub either
    // (retired with level 5's design: an angel at 6.5,8.5 in the hall)
    else if (n === 3) {                           // level 3: one in each far corner, and one
      ORBS.push({ x: 12.5, y: 1.5, c: 0, tall: true });   //   caged in the chamber
      ORBS.push({ x: 1.5, y: 12.5, c: 0, tall: true });
      ORBS.push({ x: 6.5, y: 6.5, c: 0, tall: true });
    }
    else if (n === 5) for (const [x, y] of L5.angels)   // A1 at the start room's neck, A2 at the exit
      ORBS.push({ x: x + 0.5, y: y + 0.5, c: 0, tall: true });
    else if (n === 6)                           // both caged in col 7
      for (const [x, y] of L6.angels)
        ORBS.push({ x: x + 0.5, y: y + 0.5, c: 0, tall: true });
    else if (n === 7)                           // three
      for (const [x, y] of L7.angels)
        ORBS.push({ x: x + 0.5, y: y + 0.5, c: 0, tall: true });
    else if (n === 8) {                         // AA in col 13, one in each hall
      ORBS.push({ x: 13.5, y: 1.5, c: 0, tall: true });
      ORBS.push({ x: 13.5, y: 5.5, c: 0, tall: true });
      ORBS.push({ x: 13.5, y: 9.5, c: 0, tall: true });
    }
    else if (n === 10) for (const [x, y] of L10.angels)        // the BIG angel, gold
      ORBS.push({ x: x + 0.5, y: y + 0.5, c: 0, tall: true, big: true, body: GOLD_BODY });
    else if (n === 9) for (const [x, y] of L9.angels)            // the sheet's AA, hidden until its room's stage
      ORBS.push({ x: x + 0.5, y: y + 0.5, c: 0, tall: true, stage: L9_STAGES.firstOf(x, y), hidden: L9_STAGES.firstOf(x, y) > 0 });
    else if (n === 1) {                         // AA at (7,5) and (18,5): one beside each orb
      ORBS.push({ x: 7.5, y: 5.5, c: 0, tall: true });
      ORBS.push({ x: 18.5, y: 5.5, c: 0, tall: true });
    }
    else throw new Error(`no angel placement for level ${n} -- add a branch (an empty one is fine)`);
  }
  return ORBS;
};
// ---- and the EXITS take colours too ----
// An exit hole is already a single flat bit pair 2 -- obC, the per-sprite ink (makeHoleLadder
// emits no rim for one, and a build guard in build-iray.mjs asserts it) -- so it has always been able to be
// any colour; it was simply black on every level so far.
// The hub's four, in HUB_HOLES order (N, W, E, S). The three the player can REACH are the
// pedestals' three colours, because those are the three errands: go and bring back that orb.
// The fourth is the one behind the pedestal wall, which nothing opens until all three are
// seated, so it is NOT an errand and is deliberately not one of the three -- it stays black,
// the way every other exit in the game reads.
// Seen from the start, facing the pedestals, the holes behind read red / green / blue left to right
// like the drums (the user, 2026-11-08) -- (1,1), then (1,6) right behind you, then (1,11) -- and
// lead to 5 / 6 / 7. So (1,11) is BLUE and (1,6) GREEN: the colours follow the levels.
// 10's corner exit is YELLOW (RAGGED, 2026-11-13). It lies ACROSS the faces of the blocks still standing
// round it, which no other entity does, so it is stamped its own way -- every face in its box, and the
// cells a block's base crosses filled to the wall's own height (RAGGED, at the rubble glyphs). Without
// that it went unstamped, and had to be black on black walls to hide it (RAGGED=0, drawn 1.5x to be seen).
const LEVEL_EXITCOL = { 4: [2, 6, 5, 0], ...(process.env.RAGGED !== '0' ? { 10: [7] } : {}) };   // red, green, blue, black; 10's yellow
// ---- and where each exit GOES ----
// lvlNxtT is nExit bytes a level, indexed by the exit fallChk matched: the hub has four, and the
// whole point of that room is that they are four CHOICES. null = the next level in LEVEL_IDS
// (nextLevel), which is what every one-exit level wants.
// The hub (2026-09-26): each coloured exit goes where it is PAINTED -- red to the idol level, green
// and blue to its two siblings (see LEVEL_EXITCOL: the destinations are [5, 7, 6]).
// Index 3 is BLACK, the hole behind the pedestal wall, the way onward: level 8 since 2026-10-13
// (the user: "where you drop after completing the errands and dropping through the black exit on
// level 4"), then 8 -> 9 -> 10, and level 10's exit is the ending.
// (2026-11-15: every disk has every level, so the fallbacks for a disk without 5-7, 8, 9 or 10 --
// HUB_WIRED, BLACK_DST, ROUTE_END -- went with CHAIN. Every destination is checked against the
// disk's files after it is built: see "EVERY SHIPPING LEVEL IS ON THE DISK".)
// levelExitDst(ending, endTest) -> LEVEL_EXITDST. A function because ENDING is the BUILD's answer (is
// the ending on this disk at all: its data files, NOENDING, a dump), and ENDTEST a test switch; the
// level sheets pass ending = true, the shipping game's.
const levelExitDst = (ENDING, ENDTEST) => ({ 4: [5, 7, 6, 8], 5: [4], 6: [4], 7: [4], 8: [9], 9: [10],
                        10: [ENDING ? END_DST : 1],   // the ending; level 1 under NOENDING (and in a dump)
                        ...(ENDING && ENDTEST ? { 1: [END_DST] } : {}) });
// TWO holes, alternating, so the drop can be exercised over and over without reloading: the
// one you land next to takes you back where you came from. Same maze both ways for now -- only
// the hole cell and the landing spot differ, which is all the level transition actually needs.
// Level 1 has ONE hole, at the far end of the corridor. The fall machinery alternates between two
// so a drop can be exercised on a loop, so the second entry is the same cell: fall through it,
// land back in the room, walk out again.
// Level 2's hole sits BEHIND the chamber's column, at (6,5). Not for distance -- the chamber is
// small -- but so that standing in the doorway you cannot see the way out, and getting to it means
// committing to one side of the column. "Am I trapped in here?" for about a second and a half.
// THE HUB HAS FOUR. One exit per level was the rule from 2026-09-18 (see below); the hub is the
// level that needs it back, so HOLE_D may now be a LIST of cells as well as a single one.
// THREE, not four. The fourth was the BLACK one behind the wall, kept for a level 8 that does
// not exist -- and an exit costs a holeSeeT row, an lvlNxtT byte, a fill colour and an entity's
// worth of tables whether anything is through it or not. It comes back with level 8. The wall
// that hides it stays: it is what the three pedestals open, and it now reveals an empty alcove.
const HUB_HOLES = [[1, 1], [1, 11], [1, 6], [9, 1]];   // red 5, blue 7, green 6, black 8. (9,11), black to 9, went 2026-11-12: the curtain
// exitCellOf(n): level n's exit cell [x, y], or the hub's LIST of them (the build's HOLE_D, which
// NOHOLE/HOLEX/HOLEY then override for the live level); exitsOf(n) is always the list.
const exitCellOf = n => n === 2 ? [2, 11] : n === 3 ? L3.exit
             : n === 5 ? L5.exit : n === 6 ? L6.exit : n === 7 ? [5, 1] : n === 8 ? [16, 5] : n === 9 ? L9.exit : n === 10 ? L10.exit : n === 4 ? HUB_HOLES : [15, 5];
const exitsOf = n => { const d = exitCellOf(n); return Array.isArray(d[0]) ? d : [d]; };   // level 2: XX behind the last socket; 3: none yet
// SOCKETS=x,y;x,y -- puzzle sockets. Same projection, same code and (nearly) the same art as
// the exit hole: a socket is a hole at half the radius with a different fill ink. They live in
// orbXCT/orbYCT past the exit holes, so orbOne's "index above the orbs is hole-like" dispatch
// picks them up for free.
// (3,5) and (7,3) are open chamber cells in the ring map -- the old (2,2)/(6,6) are walls now
// Level 2's '3,5;7,3' was a placeholder from when it was being designed, and it never shipped --
// sockets were forced off because the entity counts had to match. Now that they need not, leaving
// the placeholder in would have quietly put two sockets into the ring level. A level declares
// sockets when its design calls for them; SOCKETS=x,y overrides for the live level, and the other
// level keeps its own.
// socketsOf(n): level n's sockets as the "x,y;x,y" string the build's SOCKETS= override also takes
// (in SOCKETS_AT order: what sockWall indexes); cellsOf parses one, as it does LEVEL_PEDESTALS'.
const socketsOf = n => n === 2 ? L2.socks : n === 3 ? '5,5;7,7'
                    : n === 5 ? L5.socks : n === 6 ? L6.socks
                    : n === 7 ? L7.socks : n === 8 ? '14,5'
                    : n === 9 ? L9.socks.map(sk => `${sk.x},${sk.y}`).join(';') : n === 10 ? L10.socks : '';
const cellsOf = s => s.split(';').filter(Boolean).map(p => p.split(',').map(Number));
// THE LEVELS LOOP (2026-09-16): a one-exit level with no destination of its own (LEVEL_EXITDST)
// leads to the next level, wrapping round to 1.
const nextLevel = n => LEVEL_IDS[(LEVEL_IDS.indexOf(n) + 1) % LEVEL_IDS.length];
// Level 1's moved out from (21,2)/(21,8) to the corners on 2026-10-30: with diagonal steps and fresher
// maps (BFSJIT/ANGDIAG) angel 2 got round the ring to the door too fast -- the user needed room to
// draw it further up or down the east column before slipping past to the hole. Moved back on
// 2026-11-01 for a playtest, then OUT to the corners again the same day once the fixed reaction
// (ANGREACT) made the race consistent: "now we have to move the leash out to the corners". A group
// is cells the angel may NOT enter, as before; an empty group is an unleashed angel.
// LEVEL_LEASH: each level's default LEASH string (the build's LEASH= overrides the live level's, and
// ANGEL=0 drops it with the angels). leashGroups parses one: one group of cells per angel, in angel
// order, '|' between groups.
const LEVEL_LEASH = { 1: '|20,2;20,8' };
const leashGroups = s => s.split('|').map(g => g.split(';').filter(Boolean).map(q => q.split(',').map(Number)));

export {
  SHIP_LEVEL_IDS, LEVEL_IDS, L1_MAP, L2, L3, L5, L6, L7, L10, L9_SHEET, L9, L9_MAP, L9_STAGES,
  L3_MAP, L4_MAP, L5_MAP, L6_MAP, L7_MAP, L8_MAP, mapOf, LEVEL_WALLS, LEVEL_CLOSE,
  LEVEL_IDOL, IDOL_HOME, IDOL_BODY_OF, IDOL_N, IDOL_ROOM_BODY, GOLD_BODY,
  LEVEL_PAL, SEAMCOL, PAL_DEF, palOf, LEVEL_FLICKER, LEVEL_SYM, LEVEL_FLOORDK,
  LEVEL_PEDESTALS, LEVEL_BIG, HAS_BIG, LEVEL_BREAK, LEVEL_CORNER, HAS_CORNER, LEVEL_CURTAIN, LEVEL_FLUTE,
  LEVEL_START, entitiesOf, LEVEL_EXITCOL, levelExitDst, HUB_HOLES, exitCellOf, exitsOf, socketsOf, cellsOf,
  nextLevel, LEVEL_LEASH, leashGroups, END_DST,
};
