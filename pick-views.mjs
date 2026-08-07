// Choose a standard benchmark/regression set: viewpoints with genuine variety, rather
// than the near-empty frames a naive angle sweep from one spot produces.
// Scored on wall/ceiling balance and the number of distinct wall faces on screen.
const M=["1111111111111111","1000000100000001","1000000100000001","1000000100011101",
 "1011100000010001","1010000110010111","1010111100010001","1010100000000101",
 "1010101111100101","1000101000000101","1110101011110001","1000001010000001",
 "1011111010111111","1000000000100001","1000110000000001","1111111111111111"];
const map=[];for(let y=0;y<16;y++)for(let x=0;x<16;x++)map.push(+M[y][x]);
const W=160,CY=100,FOV=47,CTR=(W-1)/2,TANHALF=Math.tan(FOV/2/256*2*Math.PI);
const camXs=[...Array(W)].map((_,c)=>(c-CTR)/CTR*TANHALF);
const rayAng=camXs.map(cx=>Math.atan(cx)),cosC=camXs.map(cx=>1/Math.sqrt(1+cx*cx));
function cast(px,py,ang){const dx=Math.cos(ang),dy=Math.sin(ang);
 let mx=Math.floor(px),my=Math.floor(py);
 const ddx=Math.abs(1/(dx||1e-9)),ddy=Math.abs(1/(dy||1e-9));let sx,sy,sdx,sdy;
 if(dx<0){sx=-1;sdx=(px-mx)*ddx}else{sx=1;sdx=(mx+1-px)*ddx}
 if(dy<0){sy=-1;sdy=(py-my)*ddy}else{sy=1;sdy=(my+1-py)*ddy}
 let side=0;
 for(let i=0;i<64;i++){if(sdx<sdy){sdx+=ddx;mx+=sx;side=0}else{sdy+=ddy;my+=sy;side=1}
  if(mx<0||my<0||mx>15||my>15)return[1e9,-1];
  if(map[my*16+mx]){const d=side===0?sdx-ddx:sdy-ddy;
   return[d,side===0?(mx*16+my)*4+(sx>0?0:1):(mx*16+my)*4+2+(sy>0?0:1)];}}
 return[1e9,-1];}
const open=[];for(let y=1;y<15;y++)for(let x=1;x<15;x++)if(!map[y*16+x])open.push([x,y]);
const cands=[];
for(const [ox,oy] of open) for(const fx of [0.3,0.5,0.7]) for(const fy of [0.3,0.5,0.7])
 for(let a=0;a<256;a+=8){
  const px=ox+fx, py=oy+fy, base=a/256*2*Math.PI;
  const faces=new Set(); let wall=0, near=0;
  for(let c=0;c<W;c++){ const [d,f]=cast(px,py,base+rayAng[c]);
    const h=Math.min(CY,Math.round(88/Math.max(d*cosC[c],0.02)));
    faces.add(f); wall+=2*h; if(h>=CY) near++; }
  const frac=wall/(W*200);
  // want a balanced picture, several faces, and not a wall pressed against the lens
  if(frac<0.25||frac>0.75||near>W*0.35) continue;
  cands.push({px:(px*256)|0, py:(py*256)|0, a, faces:faces.size, frac});
}
cands.sort((p,q)=>q.faces-p.faces);
const picked=[];
for(const c of cands){ if(picked.length>=8) break;
  if(picked.some(p=>Math.abs(p.a-c.a)<24 || (Math.abs(p.px-c.px)<400&&Math.abs(p.py-c.py)<400))) continue;
  picked.push(c); }
console.log('# standard benchmark views: PX PY PA  (faces on screen, wall fraction)');
for(const p of picked)
  console.log(`${p.px.toString(16).padStart(4,'0')} ${p.py.toString(16).padStart(4,'0')} ${p.a.toString(16).padStart(2,'0')}   # ${p.faces} faces, ${(p.frac*100).toFixed(0)}% wall`);
