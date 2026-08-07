#!/usr/bin/env node
// What does interpSpan actually see? Replays the adaptive subdivision from iray.asm in JS
// over a set of viewpoints and reports the span/slope distribution, plus a cycle model of
// the current inner loop plus candidate rewrites. Optimising the interpolator blind is how
// you end up unrolling the branch that was never the cost -- measure the shape first.
const M=["1111111111111111","1000000100000001","1000000100000001","1000000100011101",
 "1011100000010001","1010000110010111","1010111100010001","1010100000000101",
 "1010101111100101","1000101000000101","1110101011110001","1000001010000001",
 "1011111010111111","1000000000100001","1000110000000001","1111111111111111"];
const map=[];for(let y=0;y<16;y++)for(let x=0;x<16;x++)map.push(+M[y][x]);
const mapW=(x,y)=>(x<0||y<0||x>15||y>15)?1:map[y*16+x];

// connected-wall-run ids, identical construction to build-iray.mjs
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

// One frame of the subdivision. Returns the spans that interpSpan was actually handed.
function frame(px,py,base){
  const colH=new Array(W).fill(-1), fid=new Array(W).fill(-1);
  const march=c=>{const[d,f]=cast(px,py,base+rayAng[c]);
    colH[c]=Math.min(254,Math.round(88/Math.max(d*cosC[c],0.02)));fid[c]=f;};
  march(0);march(W-1);
  const stack=[[0,W-1]], spans=[]; let bnd=0;
  let marched=2;
  while(stack.length){
    const [L,R]=stack.pop();
    const satL=colH[L]>=254?1:0, satR=colH[R]>=254?1:0;
    if(fid[L]===fid[R] && satL===satR){ spans.push([L,R,colH[L],colH[R]]); continue; }
    if(fid[L]!==fid[R] && R-L===1) bnd++;
    if(R-L<2) continue;
    const mid=(L+R)>>1; march(mid); marched++;
    stack.push([L,mid]);stack.push([mid,R]);
  }
  return {spans,marched,bnd};
}

// ---- cycle models of one interior column, 6502 ----
// CURRENT: err in zp, col in zp, hcur in zp; per-step syNeg test.
//   inc col 5, lda col 3, cmp spanR 3, bcs 2 | clc 2 lda 3 adc 3 sta 3
//   | isW8: lda 3 cmp 3 bcc 3 | isWr8: ldx 3 lda 3 sta 4 lda 3 sta 4 jmp 3   = 53
//   per step: sec 2 sbc 3 sta 3 lda syNeg 3 beq 3 inc/dec 5 jmp 3 + retest 9 = 31
const CUR = (steps) => 53 + 31*steps;
// PROPOSED: X=col, Y=hcur, A=err across the whole loop; asc/desc as separate loops so the
//   syNeg test leaves the inner loop; cmp already sets carry for sbc.
//   inx 2, cpx spanR 3, bcs 2 | clc 2 lda errv 3 adc dyv 3 | cmp dxv 3 bcc 3
//   | sta errv 3 tya 2 sta colH,x 4 lda tmp2 3 sta faceIdT,x 4 jmp 3         = 40
//   per step: sbc dxv 3 iny 2 bra-back 3 + retest cmp 3 bcc 3                = 14
const NEW = (steps) => 40 + 14*steps;
// PROPOSED+B: as above but the per-column faceIdT store (lda tmp2 3, sta faceIdT,x 4) is
//   gone. faceIdT's ONLY consumer is the per-cell boundary scan in prepCells, and every
//   face transition is already isolated by the subdivision to an adjacent pair of columns
//   -- so record those ~13 boundary columns directly and stop maintaining 160 bytes of
//   per-column face id to rediscover them.
const NEWB = (steps) => 33 + 14*steps;

const views=[['014c','014c','30'],['0cb3','0a80','b0'],['0180','0d4c','00'],['0c80','0eb3','80'],
 ['0180','09b3','c8'],['034c','0d80','f8'],['0180','034c','48'],['0880','0280','18'],
 ['0124','065e','be'],['0bc6','09b3','7a']];

let nFrames=0,nSpans=0,nInterior=0,nSteps=0,curCyc=0,newCyc=0,newBCyc=0,nMarch=0,nBnd=0;
const slopeHist=new Map(), widthHist=new Map();
for(const [hx,hy,ha] of views) for(const off of [0,64,128,192]){
  const px=(parseInt(hx,16)>>8)+(parseInt(hx,16)&255)/256;
  const py=(parseInt(hy,16)>>8)+(parseInt(hy,16)&255)/256;
  const base=((parseInt(ha,16)+off)%256)/256*2*Math.PI;
  const {spans,marched,bnd}=frame(px,py,base);
  nFrames++; nMarch+=marched; nBnd+=bnd;
  for(const [L,R,hL,hR] of spans){
    const dx=R-L, dy=Math.abs(hR-hL);
    if(dx<2) continue;                       // no interior columns
    nSpans++;
    const wb=dx<=2?'2':dx<=4?'3-4':dx<=8?'5-8':dx<=16?'9-16':dx<=32?'17-32':'33+';
    widthHist.set(wb,(widthHist.get(wb)||0)+1);
    // walk the exact Bresenham to count steps per interior column
    let err=dx>>1;
    for(let c=L+1;c<R;c++){
      err+=dy; let s=0; while(err>=dx){err-=dx;s++;}
      nInterior++; nSteps+=s; curCyc+=CUR(s); newCyc+=NEW(s); newBCyc+=NEWB(s);
      const sb=s===0?'0':s===1?'1':s<=3?'2-3':s<=7?'4-7':'8+';
      slopeHist.set(sb,(slopeHist.get(sb)||0)+1);
    }
  }
}
const per=v=>(v/nFrames).toFixed(1);
console.log(`${nFrames} frames (10 views x 4 angles)\n`);
console.log(`rays marched      ${per(nMarch)} / frame  (of 160 columns)`);
console.log(`face boundaries   ${per(nBnd)} / frame  (what faceIdT's 160 bytes exist to encode)`);
console.log(`spans interpolated${per(nSpans).padStart(7)} / frame`);
console.log(`interior columns  ${per(nInterior)} / frame  (${(nInterior/nFrames/W*100).toFixed(0)}% of the screen)`);
console.log(`bresenham steps   ${per(nSteps)} / frame  (${(nSteps/nInterior).toFixed(2)} per column)\n`);
const show=(name,m,tot)=>{console.log(name);
  for(const k of [...m.keys()].sort()) console.log(`  ${k.padEnd(6)} ${String(m.get(k)).padStart(6)}  ${(m.get(k)/tot*100).toFixed(1)}%`);
  console.log('');};
show('steps per interior column:',slopeHist,nInterior);
show('span width:',widthHist,nSpans);
const f=60/17.6, FRAME=1022727/17.6;        // measured: 17.6 fps all-angle average
console.log(`cycles/frame in the interior loop:`);
console.log(`  current   ${(curCyc/nFrames).toFixed(0)}  = ${(curCyc/nFrames/FRAME*100).toFixed(1)}% of a ${FRAME.toFixed(0)}-cycle frame`);
console.log(`  proposed  ${(newCyc/nFrames).toFixed(0)}  = ${(newCyc/nFrames/FRAME*100).toFixed(1)}%`);
console.log(`  +drop faceIdT ${(newBCyc/nFrames).toFixed(0)}  = ${(newBCyc/nFrames/FRAME*100).toFixed(1)}%`);
console.log(`\nsaving vs current:`);
console.log(`  registers only     ${((1-newCyc/curCyc)*100).toFixed(1)}% of the loop, ${((curCyc-newCyc)/nFrames/FRAME*100).toFixed(1)}% of the frame`);
console.log(`  + drop faceIdT     ${((1-newBCyc/curCyc)*100).toFixed(1)}% of the loop, ${((curCyc-newBCyc)/nFrames/FRAME*100).toFixed(1)}% of the frame`);
// prepCells' boundary scan disappears with faceIdT: ~48 cycles x 40 cells, replaced by
// clearing cstepT (40 bytes) plus a handful of recorded boundary columns.
const PREP_OLD=48*40, PREP_NEW=240+20*(nBnd/nFrames);
console.log(`  + prepCells scan   ${(PREP_OLD-PREP_NEW).toFixed(0)} cycles/frame more, ${((PREP_OLD-PREP_NEW)/FRAME*100).toFixed(1)}% of the frame`);
console.log(`  TOTAL              ${(((curCyc-newBCyc)/nFrames+PREP_OLD-PREP_NEW)/FRAME*100).toFixed(1)}% of the frame`);
