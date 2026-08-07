// Fresh sweep recording TRUE cell endpoint levels (no pre-clipping), and including
// wall-hugging positions, so the steep tail is actually visible.
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
const C8=x=>Math.max(0,Math.min(8,x));
const open=[];for(let y=1;y<15;y++)for(let x=1;x<15;x++)if(!map[y*16+x])open.push([x,y]);
const cells=[];                       // {raw:[4], t:[4]} for single-face edge cells
const spanH=new Map();
for(const[ox,oy]of open) for(const fx of[0.06,0.3,0.5,0.7]) for(const fy of[0.06,0.3,0.5,0.7])
 for(let ang=0;ang<256;ang+=8){
  const px=ox+fx,py=oy+fy,base=ang/256*2*Math.PI;
  const h=new Array(W),fid=new Array(W);
  for(let c=0;c<W;c++){const[d,f]=cast(px,py,base+rayAng[c]);
    h[c]=Math.min(100,Math.round(88/Math.max(d*cosC[c],0.02)));fid[c]=f;}
  for(let R=0;R<13;R++){const K=8*R-92;
   for(let C=0;C<40;C++){
    const raw=[0,1,2,3].map(k=>h[C*4+k]+K), t=raw.map(C8);
    if(t.every(x=>x===0)||t.every(x=>x===8))continue;
    const ids=[0,1,2,3].map(k=>fid[C*4+k]);
    if(new Set(ids).size>1) continue;         // step cells are handled separately
    cells.push(raw);
    const sp=Math.abs(raw[3]-raw[0]);
    spanH.set(Math.min(sp,40),(spanH.get(Math.min(sp,40))||0)+1);
   }}}
const n=cells.length;
console.log(`single-face edge cells sampled: ${n}`);
let acc=0; const rows=[...spanH.entries()].sort((a,b)=>a[0]-b[0]);
console.log('end-to-end height span across a cell (representable up to 12 today):');
for(const [k,v] of rows){acc+=v; if([2,4,6,8,12,16,24,40].includes(k))
  console.log(`  <=${String(k).padStart(2)}: ${(acc/n*100).toFixed(2)}%`);}
const snap=(v,L)=>L.reduce((b,l)=>Math.abs(l-v)<Math.abs(b-v)?l:b,L[0]);
function ev(name,L){
  const set=new Set();
  for(const a of L) for(const b of L) set.add([0,1,2,3].map(k=>C8(Math.round(a+(b-a)*k/3))).join(','));
  const err=new Array(10).fill(0);
  for(const raw of cells){ const a=snap(raw[0],L), b=snap(raw[3],L);
    const p=[0,1,2,3].map(k=>C8(Math.round(a+(b-a)*k/3)));
    err[Math.min(9,Math.max(...raw.map((x,i)=>Math.abs(C8(x)-p[i]))))]++; }
  const pc=v=>(v/n*100).toFixed(2), w=k=>pc(err.slice(0,k+1).reduce((a,b)=>a+b,0));
  console.log(`${name.padEnd(30)} ${String(L.length).padStart(2)} lvl, ${String(set.size).padStart(3)} chars | 0px ${pc(err[0])}%  <=1px ${w(1)}%  <=2px ${w(2)}%  >=3px ${pc(err.slice(3).reduce((a,b)=>a+b,0))}%`);
}
const uni=(lo,hi)=>[...Array(hi-lo+1)].map((_,i)=>lo+i);
ev('CURRENT uniform -2..10', uni(-2,10));
ev('non-uniform 13 lvl to +-20', [-20,-8,-3,-1,0,2,4,6,8,9,11,16,28]);
ev('non-uniform 15 lvl to +-24', [-24,-12,-6,-3,-1,0,2,4,6,8,9,11,14,20,32]);
ev('uniform -6..14 (21 lvl)', uni(-6,14));

// The charset ALREADY contains 3 step positions x 6 quantised levels, used today only
// when faceIdT changes. A steep single-face cell is better approximated by a step than by
// a ramp -- and routing it there costs no new charset entries, just a selection rule.
const STEPQ=[0,1,3,5,7,8];
const qs=v=>STEPQ.reduce((b,q)=>Math.abs(q-v)<Math.abs(b-v)?q:b,STEPQ[0]);
const uniL=[...Array(13)].map((_,i)=>i-2);
for(const TH of [6,8,10,12,99]){
  const err=new Array(10).fill(0); let steps=0;
  for(const raw of cells){
    const t=raw.map(C8);
    const span=Math.abs(raw[3]-raw[0]);
    let best;
    if(span>TH){ steps++;
      let bc=99;
      for(let k=1;k<4;k++){ const A=qs(Math.round(t.slice(0,k).reduce((a,b)=>a+b,0)/k)),
                                  B=qs(Math.round(t.slice(k).reduce((a,b)=>a+b,0)/(4-k)));
        const p=[0,1,2,3].map(i=>i<k?A:B);
        const e=Math.max(...t.map((x,i)=>Math.abs(x-p[i])));
        if(e<bc){bc=e;best=p;} }
    } else {
      const a=snap(raw[0],uniL), b=snap(raw[3],uniL);
      best=[0,1,2,3].map(k=>C8(Math.round(a+(b-a)*k/3)));
    }
    err[Math.min(9,Math.max(...t.map((x,i)=>Math.abs(x-best[i]))))]++;
  }
  const pc=v=>(v/n*100).toFixed(2), w=k=>pc(err.slice(0,k+1).reduce((a,b)=>a+b,0));
  console.log(`steep->step when span>${String(TH).padStart(2)} (${(steps/n*100).toFixed(2)}% of cells): 0px ${pc(err[0])}%  <=1px ${w(1)}%  <=2px ${w(2)}%  >=3px ${pc(err.slice(3).reduce((a,b)=>a+b,0))}%`);
}
