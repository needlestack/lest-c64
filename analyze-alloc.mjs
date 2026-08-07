// One sweep, cached as (pattern, faceStepPos) frequencies; then search charset
// allocations against it. Budget is 238 cell codes (256 - 18 readout glyphs).
import {writeFileSync,existsSync,readFileSync} from 'fs';
const M=["1111111111111111","1000000100000001","1000000100000001","1000000100011101",
 "1011100000010001","1010000110010111","1010111100010001","1010100000000101",
 "1010101111100101","1000101000000101","1110101011110001","1000001010000001",
 "1011111010111111","1000000000100001","1000110000000001","1111111111111111"];
const map=[];for(let y=0;y<16;y++)for(let x=0;x<16;x++)map.push(+M[y][x]);
const CACHE='/private/tmp/claude-501/-Users-jfield-c64fps/09636743-6f82-4db3-a7f4-fd7ead1e7881/scratchpad/sweep.json';
let data;
if(existsSync(CACHE)) data=JSON.parse(readFileSync(CACHE,'utf8'));
else{
 const W=160,CY=100,FOV=47,CTR=(W-1)/2,TANHALF=Math.tan(FOV/2/256*2*Math.PI);
 const camXs=[...Array(W)].map((_,c)=>(c-CTR)/CTR*TANHALF);
 const rayAng=camXs.map(cx=>Math.atan(cx)),cosC=camXs.map(cx=>1/Math.sqrt(1+cx*cx));
 const cast=(px,py,ang)=>{const dx=Math.cos(ang),dy=Math.sin(ang);
  let mx=Math.floor(px),my=Math.floor(py);
  const ddx=Math.abs(1/(dx||1e-9)),ddy=Math.abs(1/(dy||1e-9));let sx,sy,sdx,sdy;
  if(dx<0){sx=-1;sdx=(px-mx)*ddx}else{sx=1;sdx=(mx+1-px)*ddx}
  if(dy<0){sy=-1;sdy=(py-my)*ddy}else{sy=1;sdy=(my+1-py)*ddy}
  let side=0;
  for(let i=0;i<64;i++){if(sdx<sdy){sdx+=ddx;mx+=sx;side=0}else{sdy+=ddy;my+=sy;side=1}
   if(mx<0||my<0||mx>15||my>15)return[1e9,-1];
   if(map[my*16+mx]){const d=side===0?sdx-ddx:sdy-ddy;
    return[d,side===0?(mx*16+my)*4+(sx>0?0:1):(mx*16+my)*4+2+(sy>0?0:1)];}}
  return[1e9,-1];};
 const halfH=d=>Math.min(CY,Math.round(88/Math.max(d,0.02)));
 const C8=x=>Math.max(0,Math.min(8,x));
 const open=[];for(let y=1;y<15;y++)for(let x=1;x<15;x++)if(!map[y*16+x])open.push([x,y]);
 const f=new Map();
 for(const[ox,oy]of open) for(const fx of[0.2,0.5,0.8]) for(const fy of[0.2,0.5,0.8])
  for(let ang=0;ang<256;ang+=2){
   const px=ox+fx,py=oy+fy,base=ang/256*2*Math.PI;
   const h=new Array(W),fid=new Array(W);
   for(let c=0;c<W;c++){const[d,ff]=cast(px,py,base+rayAng[c]);h[c]=halfH(d*cosC[c]);fid[c]=ff;}
   for(let R=0;R<13;R++){const K=8*R-92;
    for(let C=0;C<40;C++){
     const raw=[0,1,2,3].map(k=>h[C*4+k]+K), t=raw.map(C8), ids=[0,1,2,3].map(k=>fid[C*4+k]);
     if(t.every(x=>x===0)||t.every(x=>x===8))continue;
     let k=0;for(let i=1;i<4;i++) if(ids[i]!==ids[i-1]){k=i;break;}
     const key=t.join(',')+'|'+k+'|'+raw.map(v=>Math.max(-9,Math.min(17,v))).join(',');
     f.set(key,(f.get(key)||0)+1);
    }}}
 data=[...f.entries()]; writeFileSync(CACHE,JSON.stringify(data));
}
const rows=data.map(([key,n])=>{const [ts,ks,rs]=key.split('|');
  return {t:ts.split(',').map(Number), k:+ks, raw:rs.split(',').map(Number), n};});
const total=rows.reduce((a,r)=>a+r.n,0);
const C8=x=>Math.max(0,Math.min(8,x));
function evaluate(CLO,CHI,Q){
  const cl=x=>Math.max(CLO,Math.min(CHI,x));
  const qz=v=>Q.reduce((b,q)=>Math.abs(q-v)<Math.abs(b-v)?q:b,Q[0]);
  const set=new Set();
  for(let a=CLO;a<=CHI;a++)for(let b=CLO;b<=CHI;b++)
    set.add([0,1,2,3].map(i=>C8(Math.round(a+(b-a)*i/3))).join(','));   // ramps
  for(const A of Q)for(const B of Q)for(let k=1;k<4;k++)
    set.add([0,1,2,3].map(i=>i<k?A:B).join(','));                        // steps
  const err=new Array(10).fill(0);
  for(const r of rows){
    let p;
    if(r.k===0){const a=cl(r.raw[0]),b=cl(r.raw[3]);p=[0,1,2,3].map(i=>C8(Math.round(a+(b-a)*i/3)));}
    else{const A=qz(Math.round(r.t.slice(0,r.k).reduce((x,y)=>x+y,0)/r.k)),
               B=qz(Math.round(r.t.slice(r.k).reduce((x,y)=>x+y,0)/(4-r.k)));
         p=[0,1,2,3].map(i=>i<r.k?A:B);}
    err[Math.min(9,Math.max(...r.t.map((x,i)=>Math.abs(x-p[i]))))]+=r.n;
  }
  return {chars:set.size, err};
}
const pc=n=>(n/total*100).toFixed(3);
const QS={ 'full 0..8':[0,1,2,3,4,5,6,7,8], '7 lvl':[0,1,2,4,6,7,8], '6 lvl':[0,1,3,5,7,8], '5 lvl':[0,2,4,6,8] };
for(const [CLO,CHI] of [[-1,9],[-2,10]]) for(const [qn,Q] of Object.entries(QS)){
  const {chars,err}=evaluate(CLO,CHI,Q);
  const within=k=>pc(err.slice(0,k+1).reduce((a,b)=>a+b,0));
  console.log(`clamp ${String(CLO).padStart(2)}..${CHI} steps=${qn.padEnd(9)}: ${String(chars).padStart(3)}+18 ${chars<=238?'FITS':'OVER'} | 0px ${pc(err[0])}%  <=1px ${within(1)}%  <=2px ${within(2)}%  >=3px ${pc(err.slice(3).reduce((a,b)=>a+b,0))}%`);
}
