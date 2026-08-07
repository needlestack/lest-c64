// Which 4x8 line-cut chars does the engine ACTUALLY use?
// Mirrors build-iray.mjs projection (rectilinear: atan-spaced rays + cos-corrected dist)
// at 160x200 logical resolution, sweeps viewpoints, and records the cells that occur.
const M = [
 "1111111111111111","1000000100000001","1000000100000001","1000000100011101",
 "1011100000010001","1010000110010111","1010111100010001","1010100000000101",
 "1000101111110101","1011101000000101","1000001011111101","1111100010000001",
 "1000000010111101","1000111110100001","1000100000101111","1111111111111111"];
const map=[]; for(let y=0;y<16;y++) for(let x=0;x<16;x++) map.push(+M[y][x]);
const W=160, H=200, CY=100;                   // new logical framebuffer
const FOV=47, CTR=(W-1)/2, TANHALF=Math.tan(FOV/2/256*2*Math.PI);
const camXs=[...Array(W)].map((_,c)=>(c-CTR)/CTR*TANHALF);
const rayAng=camXs.map(cx=>Math.atan(cx));     // radians, relative to view dir
const cosC =camXs.map(cx=>1/Math.sqrt(1+cx*cx));

// DDA -> (perp distance in cells, face id). face id = which wall plane was hit.
function cast(px,py,ang,cx){
  const dx=Math.cos(ang), dy=Math.sin(ang);
  let mx=Math.floor(px), my=Math.floor(py);
  const ddx=Math.abs(1/(dx||1e-9)), ddy=Math.abs(1/(dy||1e-9));
  let sx,sy,sdx,sdy;
  if(dx<0){sx=-1;sdx=(px-mx)*ddx}else{sx=1;sdx=(mx+1-px)*ddx}
  if(dy<0){sy=-1;sdy=(py-my)*ddy}else{sy=1;sdy=(my+1-py)*ddy}
  let side=0;
  for(let i=0;i<64;i++){
    if(sdx<sdy){sdx+=ddx;mx+=sx;side=0}else{sdy+=ddy;my+=sy;side=1}
    if(mx<0||my<0||mx>15||my>15) return [1e9,-1];
    if(map[my*16+mx]) {
      const d=(side===0?sdx-ddx:sdy-ddy);
      // face id: the specific wall plane (cell + which side), so corners are detectable
      const fid = side===0 ? (mx*16+my)*4+(sx>0?0:1) : (mx*16+my)*4+2+(sy>0?0:1);
      return [d*cosC[0]/cosC[0]*1, fid];
    }
  }
  return [1e9,-1];
}
// half-height in new units: 44/d at 100-row half => 88/d, capped at CY
const halfH=d=>Math.min(CY, Math.round(88/Math.max(d,0.02)));

const patterns=new Map();      // key -> count   (top-half "fill below" cells only)
const slopeHist=new Map();
let cells=0, cornerCells=0, cornerErrPx=0, cornerErrMax=0;
const open=[]; for(let y=1;y<15;y++) for(let x=1;x<15;x++) if(!map[y*16+x]) open.push([x,y]);

let views=0;
for(const [ox,oy] of open){
 for(const fx of [0.5]) for(const fy of [0.5]){
  for(let a=0;a<256;a+=4){
   views++;
   const px=ox+fx, py=oy+fy, base=a/256*2*Math.PI;
   const top=new Array(W), fid=new Array(W);
   for(let c=0;c<W;c++){ const [d,f]=cast(px,py,base+rayAng[c],camXs[c]);
     const dd=d*cosC[c]; top[c]=CY-halfH(dd); fid[c]=f; }
   for(let c=0;c+1<W;c++){ const s=Math.abs(top[c+1]-top[c]);
     if(fid[c]===fid[c+1]) slopeHist.set(Math.min(s,40),(slopeHist.get(Math.min(s,40))||0)+1); }
   // char cells in the TOP half only (rows 0..11); bottom is the mirror
   for(let R=0;R<12;R++) for(let C=0;C<W/4;C++){
     const y0=R*8, ys=[0,1,2,3].map(k=>top[C*4+k]);
     const h=ys.map(t=>Math.max(0,Math.min(8,y0+8-t)));   // filled px from cell bottom
     if(h.every(v=>v===0)||h.every(v=>v===8)) continue;   // blank / solid: fast path, no char needed
     cells++;
     const ids=[0,1,2,3].map(k=>fid[C*4+k]);
     if(new Set(ids).size>1){
       cornerCells++;
       // best single line through the 4 heights (least squares), error in pixels
       const xs=[0.5,1.5,2.5,3.5], n=4;
       const mx=xs.reduce((a,b)=>a+b)/n, my=h.reduce((a,b)=>a+b)/n;
       const num=xs.reduce((s,x,i)=>s+(x-mx)*(h[i]-my),0), den=xs.reduce((s,x)=>s+(x-mx)**2,0);
       const m=num/den, c0=my-m*mx;
       const e=Math.max(...h.map((v,i)=>Math.abs(v-Math.max(0,Math.min(8,Math.round(m*xs[i]+c0))))));
       cornerErrPx+=e; cornerErrMax=Math.max(cornerErrMax,e);
     }
     const key=h.join(',');
     patterns.set(key,(patterns.get(key)||0)+1);
   }
  }
 }
}
console.log(`views sampled: ${views}   edge cells: ${cells}`);
console.log(`DISTINCT 4x8 top-half patterns actually used: ${patterns.size}`);
const sorted=[...patterns.entries()].sort((a,b)=>b[1]-a[1]);
let cum=0; const tot=cells;
for(const n of [64,128,192,254,256]){ cum=sorted.slice(0,n).reduce((s,e)=>s+e[1],0);
  console.log(`  top ${String(n).padStart(3)} patterns cover ${(cum/tot*100).toFixed(3)}% of edge cells`); }
console.log(`\ncells straddling a face boundary (corner): ${cornerCells} = ${(cornerCells/cells*100).toFixed(2)}% of edge cells`);
console.log(`  mean max-error fitting ONE line: ${(cornerErrPx/Math.max(1,cornerCells)).toFixed(2)} px, worst ${cornerErrMax} px`);
const sl=[...slopeHist.entries()].sort((a,b)=>a[0]-b[0]);
const stot=sl.reduce((s,e)=>s+e[1],0); let acc=0;
console.log(`\nper-column |slope| within a face (logical rows per logical column):`);
for(const [s,n] of sl){ acc+=n; if([0,1,2,3,4,6,8,12,20,40].includes(s))
  console.log(`  <=${String(s).padStart(2)}: ${(acc/stot*100).toFixed(2)}%`); }
