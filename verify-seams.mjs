#!/usr/bin/env node
// Check the panel seams in a screenshot against the reference model.
//   node verify-seams.mjs shot.png PX PY PA
// verify-render.mjs deliberately knows nothing about seams -- a white seam pixel reads as
// "not wall" and inflates its count -- so seam correctness needs its own check. This one
// looks at the horizon row, where every column is wall, so a white pixel there is a seam
// and nothing else.
import { execSync } from 'child_process';
const M=["1111111111111111","1000000100000001","1000000100000001","1000000100011101",
 "1011100000010001","1010000110010111","1010111100010001","1010100000000101",
 "1010101111100101","1000101000000101","1110101011110001","1000001010000001",
 "1011111010111111","1000000000100001","1000110000000001","1111111111111111"];
const map=[];for(let y=0;y<16;y++)for(let x=0;x<16;x++)map.push(+M[y][x]);
const mapW=(x,y)=>(x<0||y<0||x>15||y>15)?1:map[y*16+x];

// connected-wall-run ids, same construction as build-iray.mjs -- the engine merges spans by
// run, so a "corner" is a run change and a "seam" is a cell change inside one run.
const runW=new Array(256).fill(0),runE=new Array(256).fill(0),runN=new Array(256).fill(0),runS=new Array(256).fill(0);
let nextRun=1;
for(let x=0;x<16;x++){let wp=false,ep=false,wId=0,eId=0;
  for(let y=0;y<16;y++){const wf=mapW(x,y)&&!mapW(x-1,y),ef=mapW(x,y)&&!mapW(x+1,y);
    if(wf){if(!wp)wId=nextRun++;runW[y*16+x]=wId;}wp=wf;
    if(ef){if(!ep)eId=nextRun++;runE[y*16+x]=eId;}ep=ef;}}
for(let y=0;y<16;y++){let np=false,sp=false,nId=0,sId=0;
  for(let x=0;x<16;x++){const nf=mapW(x,y)&&!mapW(x,y-1),sf=mapW(x,y)&&!mapW(x,y+1);
    if(nf){if(!np)nId=nextRun++;runN[y*16+x]=nId;}np=nf;
    if(sf){if(!sp)sId=nextRun++;runS[y*16+x]=sId;}sp=sf;}}
const RUN=[runW,runE,runN,runS];

const W=160,FOV=47,CTR=(W-1)/2,TANHALF=Math.tan(FOV/2/256*2*Math.PI);
const camXs=[...Array(W)].map((_,c)=>(c-CTR)/CTR*TANHALF);
const rayAng=camXs.map(cx=>Math.atan(cx));
function cast(px,py,ang){const dx=Math.cos(ang),dy=Math.sin(ang);
 let mx=Math.floor(px),my=Math.floor(py);
 const ddx=Math.abs(1/(dx||1e-9)),ddy=Math.abs(1/(dy||1e-9));let sx,sy,sdx,sdy;
 if(dx<0){sx=-1;sdx=(px-mx)*ddx}else{sx=1;sdx=(mx+1-px)*ddx}
 if(dy<0){sy=-1;sdy=(py-my)*ddy}else{sy=1;sdy=(my+1-py)*ddy}
 let side=0;
 for(let i=0;i<64;i++){if(sdx<sdy){sdx+=ddx;mx+=sx;side=0}else{sdy+=ddy;my+=sy;side=1}
  if(mx<0||my<0||mx>15||my>15)return null;
  if(map[my*16+mx]){const f=side===0?(sx>0?0:1):(sy>0?2:3);
   return {cell:my*16+mx,run:RUN[f][my*16+mx]};}}
 return null;}

// DUMP=1 C0=.. C1=.. prints the per-column cell and run id, for chasing a seam the engine
// draws and the model does not (or vice versa).
const [shotFile,PXs,PYs,PAs]=process.argv.slice(2);
const PX=parseInt(PXs,16),PY=parseInt(PYs,16),PA=parseInt(PAs,16);
const px=(PX>>8)+(PX&255)/256, py=(PY>>8)+(PY&255)/256, base=PA/256*2*Math.PI;
const hit=[...Array(W)].map((_,c)=>cast(px,py,base+rayAng[c]));

// A boundary between columns c-1 and c is drawn at whichever of them the engine's
// projection rounds to, so accept either.
// EVERY run-to-run boundary carries a line as of CVXSEAM (2026-08-11), including a corner
// facing AWAY -- one face visible, an unrelated wall across the boundary. That used to draw
// nothing, on the grounds that the 20+ row step in the wall top already shows it. But the step
// only shows it ABOVE the far wall's top; below that both sides are black, and the grey stripe
// is the only thing dividing them. seamT applies to the solid run alone, so the line lands
// exactly in that black-on-black region and nowhere else.
//
// This check encoded the OLD rule and therefore reported the new lines as spurious -- a
// checker enforcing a spec the engine had deliberately moved past. Kept as a separate count
// so the two classes stay legible; set CVXSEAM=0 to score the old behaviour.
// Same derivation as build-iray.mjs: concave partners from open-cell corners, convex partners
// from each run's own end cell.
const partner=new Set();
const pair=(a,b)=>{if(a&&b&&a!==b){partner.add(`${a},${b}`);partner.add(`${b},${a}`);}};
for(let y=0;y<16;y++)for(let x=0;x<16;x++){
  if(mapW(x,y)) continue;
  const W_=mapW(x-1,y),E_=mapW(x+1,y),N_=mapW(x,y-1),S_=mapW(x,y+1);
  if(W_&&N_) pair(runE[y*16+(x-1)], runS[(y-1)*16+x]);
  if(E_&&N_) pair(runW[y*16+(x+1)], runS[(y-1)*16+x]);
  if(W_&&S_) pair(runE[y*16+(x-1)], runN[(y+1)*16+x]);
  if(E_&&S_) pair(runW[y*16+(x+1)], runN[(y+1)*16+x]);
}
// This file builds the run arrays but no runFace, so recover each run's face from the array it
// appears in rather than duplicating build-iray's newRun bookkeeping.
{ const runInfo=new Map();
  for(const [f,arr] of [['W',runW],['E',runE],['N',runN],['S',runS]])
    for(let c=0;c<256;c++){const r=arr[c]; if(!r) continue;
      if(!runInfo.has(r)) runInfo.set(r,{f,cells:[]});
      runInfo.get(r).cells.push({x:c%16,y:c>>4});}
  for(const [r,{f,cells}] of runInfo){
    const vert=(f==='W'||f==='E'), key=c=>vert?c.y:c.x;
    const lo=cells.reduce((a,b)=>key(a)<key(b)?a:b), hi=cells.reduce((a,b)=>key(a)>key(b)?a:b);
    if(vert){
      if(!mapW(lo.x,lo.y-1)) pair(r, runN[lo.y*16+lo.x]);
      if(!mapW(hi.x,hi.y+1)) pair(r, runS[hi.y*16+hi.x]);
    } else {
      if(!mapW(lo.x-1,lo.y)) pair(r, runW[lo.y*16+lo.x]);
      if(!mapW(hi.x+1,hi.y)) pair(r, runE[hi.y*16+hi.x]);
    }
  }
}
const CVXSEAM = process.env.CVXSEAM !== '0';
const want=[]; let convexSkipped=0;
for(let c=1;c<W;c++){const a=hit[c-1],b=hit[c]; if(!a||!b) continue;
  if(a.run!==b.run){ const corner=partner.has(`${a.run},${b.run}`);
                     if(corner) want.push({c,kind:'corner'});
                     else if(CVXSEAM) { want.push({c,kind:'silhouette'}); convexSkipped++; }
                     else convexSkipped++; }
  else if(a.cell!==b.cell) want.push({c,kind:'seam'});}
// Do NOT pre-dedupe the expectation. Only one line per 4-px cell can be drawn, but which
// of two colliding boundaries wins depends on the order the subdivision happens to visit
// spans -- guessing that here produced false "spurious" reports for boundaries that were
// perfectly real. Match drawn lines to boundaries instead, and treat any boundary left
// over as a collision (expected, by design) rather than a failure.

// horizon row = display row 100 -> y=123; logical col c -> x=32+2c. Every column is wall at
// the horizon, so a pixel that is not the wall colour there is a seam and nothing else.
//
// Test the COLOUR against the wall, not the brightness. This used to look for a '#' from
// shot.mjs, which thresholds luminance at 128: correct while the seams were white, but the
// recolour to dark grey (lum 98, on a black wall) put every seam below the threshold and the
// check reported "boundaries 9  drawn 0" for all six views -- a clean bill of health for a
// render with no seams at all. Comparing against whatever colour the wall happens to be
// survives the next recolour of either.
const row=execSync(`node ${new URL('shot.mjs', import.meta.url).pathname} ${shotFile} 32 123 320 1 --raw`).toString().trim().split(/\s+/);
const tally=new Map();
for(let c=0;c<W;c++){const v=row[c*2];tally.set(v,(tally.get(v)||0)+1);}
const wall=[...tally].sort((a,b)=>b[1]-a[1])[0][0];
const got=[];
for(let c=0;c<W;c++) if(row[c*2]!==wall) got.push(c);
// If seams ever cover most of the horizon the majority vote picks the seam colour instead and
// the result inverts, so say so rather than reporting a confident wrong answer.
if(got.length>W/2) console.log(`  WARNING: ${got.length}/${W} columns differ from the assumed wall colour ${wall} -- majority vote is unreliable here`);

// Tolerance is 4 columns. The engine has at most 47 distinct ray directions across 160
// columns, so a marched column already carries ~1.7 columns of angular slop before the
// projection adds any of its own -- demanding exact agreement would measure the FOV
// quantisation, not the seam maths.
const TOL=4;
const used=new Set();
let off=0,worst=0,matched=0;
const spurious=[];
for(const g of got){
  const near=want.map((w,i)=>[i,Math.abs(w.c-g)]).filter(([i,d])=>!used.has(i)&&d<=TOL)
                 .sort((a,b)=>a[1]-b[1]);
  if(near.length){used.add(near[0][0]);matched++;off+=near[0][1];if(near[0][1]>worst)worst=near[0][1];}
  else spurious.push(g);
}
const collided=want.filter((w,i)=>!used.has(i));
console.log(`${shotFile.split('/').pop()}  ${PXs} ${PYs} ${PAs}`);
console.log(`  boundaries ${want.length}  drawn ${got.length}  matched ${matched}` +
            `  avg |offset| ${matched?(off/matched).toFixed(2):'-'} col  worst ${worst}` +
            `  (${convexSkipped} of them silhouette corners, now drawn too)`);
if(spurious.length) console.log(`  SPURIOUS (drawn with no boundary near): ${spurious.join(' ')}`);
if(collided.length) console.log(`  not drawn, cell already used: ${collided.map(w=>w.c+(w.kind==='corner'?'C':w.kind==='silhouette'?'X':'s')).join(' ')}`);
if(!spurious.length) console.log(`  every drawn line corresponds to a real boundary`);

if (process.env.DUMP) {
  console.log(`  boundaries: ${want.map(e=>e.c+(e.kind==='corner'?'C':'s')).join(' ')}`);
  console.log(`  drawn:    ${got.join(' ')}`);
  console.log('\ncol  cell (x,y)  run');
  for (let c = +process.env.C0 || 0; c < (+process.env.C1 || W); c++) {
    const h = hit[c];
    console.log(`${String(c).padStart(3)}  ${h ? `${String(h.cell).padStart(3)} (${h.cell%16},${h.cell>>4})   ${h.run}` : '-'}`);
  }
}
