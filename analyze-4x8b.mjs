// Decompose the 4x8 char requirement: single-face cells (line-consistent) vs corner
// cells (two faces in one cell), and what happens if corners are SNAPPED to one line.
const M=["1111111111111111","1000000100000001","1000000100000001","1000000100011101",
 "1011100000010001","1010000110010111","1010111100010001","1010100000000101",
 "1000101111110101","1011101000000101","1000001011111101","1111100010000001",
 "1000000010111101","1000111110100001","1000100000101111","1111111111111111"];
const map=[];for(let y=0;y<16;y++)for(let x=0;x<16;x++)map.push(+M[y][x]);
const W=160,CY=100,FOV=47,CTR=(W-1)/2,TANHALF=Math.tan(FOV/2/256*2*Math.PI);
const camXs=[...Array(W)].map((_,c)=>(c-CTR)/CTR*TANHALF);
const rayAng=camXs.map(cx=>Math.atan(cx)), cosC=camXs.map(cx=>1/Math.sqrt(1+cx*cx));
function cast(px,py,ang){const dx=Math.cos(ang),dy=Math.sin(ang);
 let mx=Math.floor(px),my=Math.floor(py);
 const ddx=Math.abs(1/(dx||1e-9)),ddy=Math.abs(1/(dy||1e-9));let sx,sy,sdx,sdy;
 if(dx<0){sx=-1;sdx=(px-mx)*ddx}else{sx=1;sdx=(mx+1-px)*ddx}
 if(dy<0){sy=-1;sdy=(py-my)*ddy}else{sy=1;sdy=(my+1-py)*ddy}
 let side=0;
 for(let i=0;i<64;i++){ if(sdx<sdy){sdx+=ddx;mx+=sx;side=0}else{sdy+=ddy;my+=sy;side=1}
  if(mx<0||my<0||mx>15||my>15)return[1e9,-1];
  if(map[my*16+mx]){const d=side===0?sdx-ddx:sdy-ddy;
   return[d, side===0?(mx*16+my)*4+(sx>0?0:1):(mx*16+my)*4+2+(sy>0?0:1)];}}
 return[1e9,-1];}
const halfH=d=>Math.min(CY,Math.round(88/Math.max(d,0.02)));
const xs=[0.5,1.5,2.5,3.5];
function fitLine(h){ const mx=2, my=(h[0]+h[1]+h[2]+h[3])/4;
  let num=0,den=0; for(let i=0;i<4;i++){num+=(xs[i]-mx)*(h[i]-my);den+=(xs[i]-mx)**2;}
  const m=num/den,c0=my-m*mx;
  return h.map((_,i)=>Math.max(0,Math.min(8,Math.round(m*xs[i]+c0)))); }

const exact=new Map(), single=new Map(), snapped=new Map();
let cells=0,corner=0,snapErr=[0,0,0,0,0,0,0,0,0];
const open=[];for(let y=1;y<15;y++)for(let x=1;x<15;x++)if(!map[y*16+x])open.push([x,y]);
for(const[ox,oy]of open) for(const fx of[0.2,0.5,0.8]) for(const fy of[0.2,0.5,0.8])
 for(let a=0;a<256;a++){
  const px=ox+fx,py=oy+fy,base=a/256*2*Math.PI;
  const top=new Array(W),fid=new Array(W);
  for(let c=0;c<W;c++){const[d,f]=cast(px,py,base+rayAng[c]);top[c]=CY-halfH(d*cosC[c]);fid[c]=f;}
  for(let R=0;R<12;R++) for(let C=0;C<40;C++){
   const y0=R*8,h=[0,1,2,3].map(k=>Math.max(0,Math.min(8,y0+8-top[C*4+k])));
   if(h.every(v=>v===0)||h.every(v=>v===8))continue;
   cells++;
   const k=h.join(','); exact.set(k,(exact.get(k)||0)+1);
   const ids=[0,1,2,3].map(k2=>fid[C*4+k2]);
   const isCorner=new Set(ids).size>1;
   if(isCorner)corner++; else single.set(k,(single.get(k)||0)+1);
   const f=fitLine(h), fk=f.join(',');
   snapped.set(fk,(snapped.get(fk)||0)+1);
   snapErr[Math.max(...h.map((v,i)=>Math.abs(v-f[i])))]++;
  }
 }
const pct=(n,d)=>(n/d*100).toFixed(2);
console.log(`edge cells: ${cells}   corner cells: ${corner} (${pct(corner,cells)}%)\n`);
console.log(`A) exact patterns, no approximation        : ${exact.size} distinct`);
console.log(`B) single-face cells only (line-consistent): ${single.size} distinct  <-- must all exist`);
console.log(`C) ALL cells snapped to best-fit line      : ${snapped.size} distinct  <-- charset size if corners glitch`);
const cov=(m,n)=>{const s=[...m.values()].sort((a,b)=>b-a);return pct(s.slice(0,n).reduce((a,b)=>a+b,0),cells);};
console.log(`\ncoverage if we keep only the top-N of (C): 192 -> ${cov(snapped,192)}%  254 -> ${cov(snapped,254)}%`);
console.log(`\nerror introduced by snapping corners to one line (max px off, per cell):`);
for(let e=0;e<9;e++) if(snapErr[e]) console.log(`  ${e}px: ${pct(snapErr[e],cells)}%`);
