#!/usr/bin/env node
// Does a PREDICTED pivot beat bisection in the adaptive subdivision?
//
// The subdivision bisects: it marches column 0 and 159, and wherever the two ends of a span
// disagree on wall face it marches the midpoint and recurses. ~7.3 marches per boundary, and
// marchCol is ~38% of the frame.
//
// The idea under test: last frame's boundaries are a good guess at this frame's, so instead of
// starting from one span (0,159) start from a set of BRACKETS around the predicted boundaries.
// A bracket that contains its boundary converges in log2(2w) marches instead of log2(160); the
// large spans between brackets merge on their first pop and cost nothing.
//
// This was rejected once before (recorded only as "predicted/temporal-hint pivot (-13%)", no
// method, no date, sign undefined). Two things changed since: movement was time-locked and
// halved, and FINEANG made every column a distinct ray direction -- before it there were only
// 48, so a boundary could only sit on a run edge and a hint was either exact or several columns
// out with nothing in between. Now boundaries move smoothly and a hint degrades gracefully.
//
// Measured here, in JS, over CONSECUTIVE frames of real motion -- the hint is worthless without
// frame-to-frame continuity, so isolated viewpoints (what analyze-interp.mjs uses) cannot test
// it. Reports marches/frame AND boundary accuracy against ground truth, because a hint that is
// systematically wrong does not just cost probes: it merges across a boundary and loses it.
const M=["1111111111111111","1000000100000001","1000000100000001","1000000100011101",
 "1011100000010001","1010000110010111","1010111100010001","1010100000000101",
 "1010101111100101","1000101000000101","1110101011110001","1000001010000001",
 "1011111010111111","1000000000100001","1000110000000001","1111111111111111"];
const map=[];for(let y=0;y<16;y++)for(let x=0;x<16;x++)map.push(+M[y][x]);
const mapW=(x,y)=>(x<0||y<0||x>15||y>15)?1:map[y*16+x];
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
const rayAng=camXs.map(cx=>Math.atan(cx)),cosC=camXs.map(cx=>1/Math.sqrt(1+cx*cx));
// inverse of the above: a camera-space bearing back to a (fractional) column
const colOf=b=>CTR+Math.tan(b)/TANHALF*CTR;

function cast(px,py,ang){const dx=Math.cos(ang),dy=Math.sin(ang);
 let mx=Math.floor(px),my=Math.floor(py);
 const ddx=Math.abs(1/(dx||1e-9)),ddy=Math.abs(1/(dy||1e-9));let sx,sy,sdx,sdy;
 if(dx<0){sx=-1;sdx=(px-mx)*ddx}else{sx=1;sdx=(mx+1-px)*ddx}
 if(dy<0){sy=-1;sdy=(py-my)*ddy}else{sy=1;sdy=(my+1-py)*ddy}
 let side=0;
 for(let i=0;i<64;i++){if(sdx<sdy){sdx+=ddx;mx+=sx;side=0}else{sdy+=ddy;my+=sy;side=1}
  if(mx<0||my<0||mx>15||my>15)return[1e9,0];
  if(map[my*16+mx]){const d=side===0?sdx-ddx:sdy-ddy;
   const f=side===0?(sx>0?0:1):(sy>0?2:3);
   return[d,RUN[f][my*16+mx]];}}
 return[1e9,0];}

// One frame. `cuts` is the initial set of columns to march and split at; the classic
// subdivision passes just [0, W-1]. Everything after the seeding is IDENTICAL to iray.asm's
// subLp, so the two variants differ only in where they start.
function frame(px,py,base,cuts){
  const colH=new Array(W).fill(-1), fid=new Array(W).fill(-1);
  let marched=0;
  const march=c=>{ if(colH[c]>=0) return; marched++;
    const[d,f]=cast(px,py,base+rayAng[c]);
    colH[c]=Math.min(254,Math.round(88/Math.max(d*cosC[c],0.02)));fid[c]=f;
    dist[c]=d; };
  const dist=new Array(W).fill(0);
  const cs=[...new Set(cuts.map(c=>Math.max(0,Math.min(W-1,Math.round(c)))))].sort((a,b)=>a-b);
  if(cs[0]!==0) cs.unshift(0);
  if(cs[cs.length-1]!==W-1) cs.push(W-1);
  for(const c of cs) march(c);
  const stack=[]; for(let i=cs.length-2;i>=0;i--) stack.push([cs[i],cs[i+1]]);
  const bnds=[];
  while(stack.length){
    const [L,R]=stack.pop();
    const satL=colH[L]>=254?1:0, satR=colH[R]>=254?1:0;
    if(fid[L]===fid[R] && satL===satR) continue;
    if(fid[L]!==fid[R] && R-L===1) bnds.push(L);
    if(R-L<2) continue;
    const mid=(L+R)>>1; march(mid);
    stack.push([L,mid]);stack.push([mid,R]);
  }
  return {marched,bnds,fid,colH,dist};
}

// Ground truth: march every column and read the boundaries straight off.
function truth(px,py,base){
  const fid=new Array(W); const dist=new Array(W);
  for(let c=0;c<W;c++){const[d,f]=cast(px,py,base+rayAng[c]);fid[c]=f;dist[c]=d;}
  const b=[]; for(let c=0;c<W-1;c++) if(fid[c]!==fid[c+1]) b.push(c);
  return {bnds:b,fid,dist};
}

// ---- prediction models ----
// Given last frame's boundary columns and the camera delta, where are they now?
//   none  : assume they have not moved
//   rot   : exact rotation only -- reproject the bearing through atan/tan. On the 6502 this is
//           one table lookup per boundary, no divide.
//   full  : rotation AND translation, by reprojecting the world point the boundary came from.
//           Needs the boundary's distance, which castRay already parks in remLoT/remHiT.
function predict(model,prev,p0,b0,p1,b1){
  if(model==='none') return prev.map(e=>e.c);
  if(model==='rot'){ const d=b1-b0;
    return prev.map(e=>colOf(Math.max(-1.2,Math.min(1.2,rayAng[e.c]-d)))); }
  if(model==='lin'){                         // rotation + LINEARISED translation
    // The exact reprojection ('full' below) needs an atan2 per boundary. But the camera moves
    // ~0.04 cells a frame, so the translation term is a small perturbation and its derivative
    // is enough: d(bearing)/d(camera) = (sin a, -cos a)/d, and d is already in hand -- castRay
    // parks every marched column's hit distance in remLoT/remHiT. One divide per boundary,
    // against a divide AND an atan2.
    const dp=b1-b0, mx=p1[0]-p0[0], my=p1[1]-p0[1];
    return prev.map(e=>{ const a=b0+rayAng[e.c];
      const da=(mx*Math.sin(a)-my*Math.cos(a))/Math.max(e.d,0.05);
      return colOf(Math.max(-1.2,Math.min(1.2,rayAng[e.c]-dp+da))); }); }
  return prev.map(e=>{                       // 'full'
    const a=b0+rayAng[e.c], X=p0[0]+e.d*Math.cos(a), Y=p0[1]+e.d*Math.sin(a);
    let br=Math.atan2(Y-p1[1],X-p1[0])-b1;
    while(br>Math.PI)br-=2*Math.PI; while(br<-Math.PI)br+=2*Math.PI;
    return colOf(Math.max(-1.2,Math.min(1.2,br))); });
}

// ---- the same prediction, in the arithmetic the 6502 actually has ----
// Everything above is float. At w=0 there is no slack to absorb rounding, so a scheme that
// only works in doubles is not a scheme. This is the shippable form:
//   angles are QUARTER-UNITS (1024 to a turn) -- the resolution FINEANG already works in,
//     and rayOffQS is an existing table holding exactly rayOffQ[c] as a signed byte;
//   the predicted column comes back through ONE new 256-entry table, qToCol, the inverse of
//     rayOffQS -- no divide, no atan;
//   the distance is 8.8, which is how castRay parks it in remLoT/remHiT;
//   the translation term is one divide, the only one in the whole prediction.
const Q=1024;
const rayOffQ=rayAng.map(a=>Math.round(a/(2*Math.PI)*Q));
const qToCol=[...Array(256)].map((_,i)=>{ const q=i-128;
  const c=colOf(Math.max(-1.2,Math.min(1.2,q/Q*2*Math.PI)));
  return Math.max(0,Math.min(W-1,Math.round(c))); });
function predictQ(prev,p0,b0,p1,b1){
  const dq=Math.round((b1-b0)/(2*Math.PI)*Q);        // rotation, quarter-units
  const mx=Math.round((p1[0]-p0[0])*256), my=Math.round((p1[1]-p0[1])*256);   // 8.8 cells
  return prev.map(e=>{
    const a=b0+rayAng[e.c];
    const sa=Math.round(Math.sin(a)*127), ca=Math.round(Math.cos(a)*127);     // 256-entry tables
    // 1/d as a BYTE, captured when the boundary was found rather than divided for here.
    // subFace already has the hit distance in hand (castRay parks it in remLoT/remHiT), and
    // the seam path already carries a reciprocal table -- so this costs one lookup at record
    // time and turns the per-frame prediction into a multiply. 128/d clamps at d = 0.5 cells,
    // which is inside the collision box, so the clamp is unreachable in play.
    const rd=Math.max(1,Math.min(255,Math.round(128/Math.max(e.d,0.5))));
    // Write the scales out rather than guessing the constant -- getting this wrong twice cost
    // two runs, both times by dropping the 2^8 on the displacement:
    //   mx = mx_cells * 256      sa = sin * 127      rd = 128 / d_cells
    //   dA = (mx_cells*sin - my_cells*cos)/d_cells = (mx*sa - my*ca)*rd / (256*127*128)
    const SCALE=256*127*128;
    const num=(mx*sa-my*ca)*rd;
    const daq=Math.round(num/SCALE/(2*Math.PI)*Q);
    let q=rayOffQ[e.c]-dq+daq;
    return qToCol[Math.max(0,Math.min(255,q+128))];
  });
}

// ---- motion, at the real rates ----
// 21.5 fps => 2.79 ticks a frame. Turning is 3/4 of an angle unit a tick, walking 4/256 cell.
const TICKS=60/21.5, DA=0.75*TICKS/256*2*Math.PI, DV=4/256*TICKS;
const MOTIONS={
  'stand'      :[0,0],
  'walk'       :[DV,0],
  'turn'       :[0,DA],
  'walk+turn'  :[DV,DA],
  'strafe'     :[DV,0,true],
};
const STARTS=[[1.5,1.5,0x30],[12.7,10.5,0xb0],[1.5,13.3,0x00],[12.5,14.7,0x80],
              [1.5,9.7,0xc8],[3.3,13.5,0xf8],[1.5,3.3,0x48],[8.5,2.5,0x18]];
const FRAMES=24;

const MODELS=['none','rot','lin','linq','full'];
const WIDTHS=[0,1];
const results=new Map();                       // key -> {marched, missed, found, frames}
const bump=(k,m,missed,found)=>{const r=results.get(k)||{marched:0,missed:0,found:0,frames:0};
  r.marched+=m; r.missed+=missed; r.found+=found; r.frames++; results.set(k,r);};

for(const [mname,[dv,da,strafe]] of Object.entries(MOTIONS)){
 for(const [sx,sy,sa] of STARTS){
  let px=sx,py=sy,base=sa/256*2*Math.PI;
  // per (model,width) rolling memory of last frame's boundaries and viewpoint
  const mem=new Map();
  for(let f=0;f<FRAMES;f++){
    const T=truth(px,py,base);
    const base0=base, p0=[px,py];
    // the shipped algorithm
    const cur=frame(px,py,base,[0,W-1]);
    bump(`${mname}|BISECT`,cur.marched,
      T.bnds.filter(b=>!cur.bnds.includes(b)).length, T.bnds.length);
    for(const model of MODELS) for(const w of WIDTHS){
      const key=`${model}/w${w}`;
      const st=mem.get(key);
      const cuts=[0,W-1];
      if(st){ const pr = model==='linq' ? predictQ(st.prev,st.p0,st.b0,p0,base0)
                                        : predict(model,st.prev,st.p0,st.b0,p0,base0);
        for(const p of pr){
          cuts.push(Math.floor(p)-w, Math.ceil(p)+w+1); } }
      const r=frame(px,py,base,cuts);
      bump(`${mname}|${key}`,r.marched,
        T.bnds.filter(b=>!r.bnds.includes(b)).length, T.bnds.length);
      mem.set(key,{prev:r.bnds.map(c=>({c,d:r.dist[c]})),p0,b0:base0});
    }
    // advance the camera; collision is not modelled, the paths are chosen to stay open
    const dir=base+(strafe?Math.PI/2:0);
    const nx=px+Math.cos(dir)*dv, ny=py+Math.sin(dir)*dv;
    if(!map[Math.floor(ny)*16+Math.floor(nx)]){px=nx;py=ny;}
    base+=da;
  }
 }
}

const rows=[...MODELS.flatMap(m=>WIDTHS.map(w=>`${m}/w${w}`))];
console.log(`marches per frame, and boundaries MISSED per 100 (${FRAMES} frames x ${STARTS.length} starts)\n`);
const hdr=['scheme'.padEnd(11),...Object.keys(MOTIONS).map(m=>m.padStart(12))].join('');
console.log(hdr); console.log('-'.repeat(hdr.length));
const line=(label,get)=>console.log(label.padEnd(11)+
  Object.keys(MOTIONS).map(m=>get(m).padStart(12)).join(''));
const cell=k=>m=>{const r=results.get(`${m}|${k}`); if(!r) return '-';
  return `${(r.marched/r.frames).toFixed(1)} ${(100*r.missed/Math.max(1,r.found)).toFixed(1)}%`;};
line('BISECT',cell('BISECT'));
console.log('');
for(const k of rows) line(k,cell(k));
console.log('\nfirst number = marchCol calls per frame (BISECT is what ships today)');
console.log('second       = share of TRUE face boundaries the scheme never located');
console.log('\nA scheme is only interesting if it marches less AND misses no more than BISECT.');

// ---- does the miss detector actually detect anything? ----
// 0.0% everywhere is the answer we WANT and therefore the one to distrust. Run a deliberately
// crippled scheme -- seed from a hint that is always 40 columns wrong -- and confirm the column
// goes non-zero. If a broken predictor also reads 0.0%, the metric is measuring nothing.
{
  let marched=0,missed=0,found=0,frames=0;
  for(const [sx,sy,sa] of STARTS){
    let px=sx,py=sy,base=sa/256*2*Math.PI; let prev=null;
    for(let f=0;f<FRAMES;f++){
      const T=truth(px,py,base);
      const cuts=[0,W-1];
      if(prev) for(const c of prev) cuts.push(c+40-1,c+40+2);
      const r=frame(px,py,base,cuts);
      marched+=r.marched; found+=T.bnds.length;
      missed+=T.bnds.filter(b=>!r.bnds.includes(b)).length; frames++;
      prev=r.bnds;
      const nx=px+Math.cos(base)*DV, ny=py+Math.sin(base)*DV;
      if(!map[Math.floor(ny)*16+Math.floor(nx)]){px=nx;py=ny;}
      base+=DA;
    }
  }
  console.log(`\nSANITY 1 (hint deliberately 40 columns wrong, walk+turn):`);
  console.log(`  ${(marched/frames).toFixed(1)} marches, ${(100*missed/found).toFixed(1)}% missed`);
  console.log(`  A wrong hint costs PROBES, not boundaries -- extra cut points can only split a`);
  console.log(`  span further, and every sub-span still gets the same face-id test. So 0% here`);
  console.log(`  is the correct answer, and it does NOT validate the detector. See SANITY 2.`);
}
// SANITY 2: cripple the RECURSION (stop splitting below 8 columns) so boundaries genuinely
// cannot be resolved. If the miss column stays at 0.0% here, the metric is broken.
{
  let missed=0,found=0;
  for(const [sx,sy,sa] of STARTS){
    let px=sx,py=sy,base=sa/256*2*Math.PI;
    for(let f=0;f<FRAMES;f++){
      const T=truth(px,py,base);
      const colH=new Array(W).fill(-1),fid=new Array(W).fill(-1);
      const mk=c=>{if(colH[c]>=0)return;const[d,q]=cast(px,py,base+rayAng[c]);
        colH[c]=Math.min(254,Math.round(88/Math.max(d*cosC[c],0.02)));fid[c]=q;};
      mk(0);mk(W-1);const stk=[[0,W-1]],bn=[];
      while(stk.length){const[L,R]=stk.pop();
        if(fid[L]===fid[R])continue;
        if(R-L===1){bn.push(L);continue;}
        if(R-L<8)continue;                      // <-- the crippling
        const m=(L+R)>>1;mk(m);stk.push([L,m]);stk.push([m,R]);}
      found+=T.bnds.length; missed+=T.bnds.filter(b=>!bn.includes(b)).length;
      const nx=px+Math.cos(base)*DV,ny=py+Math.sin(base)*DV;
      if(!map[Math.floor(ny)*16+Math.floor(nx)]){px=nx;py=ny;}
      base+=DA;
    }
  }
  console.log(`\nSANITY 2 (recursion stopped at 8 columns -- boundaries CANNOT be resolved):`);
  console.log(`  ${(100*missed/found).toFixed(1)}% missed  -- non-zero, so the detector works.`);
}
// Raw boundary volume, so the percentages above have a denominator you can see.
{
  let tb=0,bb=0,fr=0;
  for(const [sx,sy,sa] of STARTS){
    let px=sx,py=sy,base=sa/256*2*Math.PI;
    for(let f=0;f<FRAMES;f++){
      const T=truth(px,py,base); const c=frame(px,py,base,[0,W-1]);
      tb+=T.bnds.length; bb+=c.bnds.length; fr++;
      const nx=px+Math.cos(base)*DV, ny=py+Math.sin(base)*DV;
      if(!map[Math.floor(ny)*16+Math.floor(nx)]){px=nx;py=ny;}
      base+=DA;
    }
  }
  console.log(`\nboundary volume (walk+turn): ${(tb/fr).toFixed(2)} true, ${(bb/fr).toFixed(2)} found by BISECT, per frame`);
}
