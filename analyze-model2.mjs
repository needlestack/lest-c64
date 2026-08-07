// Endpoint-indexed model: error vs true per-column heights, per clamp range.
const M=["1111111111111111","1000000100000001","1000000100000001","1000000100011101",
 "1011100000010001","1010000110010111","1010111100010001","1010100000000101",
 "1000101111110101","1011101000000101","1000001011111101","1111100010000001",
 "1000000010111101","1000111110100001","1000100000101111","1111111111111111"];
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
const halfH=d=>Math.min(CY,Math.round(88/Math.max(d,0.02)));
const mp=(a,b)=>[0,1,2,3].map(k=>Math.max(0,Math.min(8,Math.round(a+(b-a)*k/3))));
const open=[];for(let y=1;y<15;y++)for(let x=1;x<15;x++)if(!map[y*16+x])open.push([x,y]);
const RANGES=[[-1,9],[-2,10],[-4,12],[-6,14]];
const stats=RANGES.map(()=>({err:new Array(10).fill(0)})); let cells=0;
for(const[ox,oy]of open) for(const fx of[0.2,0.5,0.8]) for(const fy of[0.2,0.5,0.8])
 for(let a=0;a<256;a+=2){
  const px=ox+fx,py=oy+fy,base=a/256*2*Math.PI;
  const h=new Array(W);
  for(let c=0;c<W;c++){const[d]=cast(px,py,base+rayAng[c]);h[c]=halfH(d*cosC[c]);}
  for(let R=0;R<13;R++){ const K=8*R-92;
   for(let C=0;C<40;C++){
    const hs=[0,1,2,3].map(k=>h[C*4+k]);
    const t=hs.map(x=>Math.max(0,Math.min(8,x+K)));
    if(t.every(x=>x===0)||t.every(x=>x===8))continue;
    cells++;
    RANGES.forEach(([LO,HI],ri)=>{
      const cl=x=>Math.max(LO,Math.min(HI,x));
      const p=mp(cl(hs[0]+K),cl(hs[3]+K));
      stats[ri].err[Math.min(9,Math.max(...t.map((x,i)=>Math.abs(x-p[i]))))]++;
    });
   }}
 }
const pc=n=>(n/cells*100).toFixed(3);
console.log(`edge cells: ${cells}\n`);
RANGES.forEach(([LO,HI],ri)=>{
  const e=stats[ri].err;
  const within=(k)=>pc(e.slice(0,k+1).reduce((a,b)=>a+b,0));
  console.log(`clamp ${String(LO).padStart(2)}..${HI}:  0px ${pc(e[0])}%  <=1px ${within(1)}%  <=2px ${within(2)}%  <=3px ${within(3)}%  worst>=4px ${pc(e.slice(4).reduce((a,b)=>a+b,0))}%`);
});
