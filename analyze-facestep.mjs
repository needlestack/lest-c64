// Walls are vertical prisms, so a face boundary is EXACTLY a vertical line on screen.
// So don't infer the step from heights -- read it from faceIdT, which the renderer already
// has. Class = 0 (single face -> pure ramp) or the column 1..3 where the face changes.
// Exact, and constant down a whole cell-column, so prepCells computes it once per frame.
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
const halfH=d=>Math.min(CY,Math.round(88/Math.max(d,0.02)));
const C8=x=>Math.max(0,Math.min(8,x));
const open=[];for(let y=1;y<15;y++)for(let x=1;x<15;x++)if(!map[y*16+x])open.push([x,y]);

const freq=new Map(), byFam=new Map(), satHist=new Map(); let cells=0, ramp=0, steps=[0,0,0,0];
const clsHist=new Map();
for(const[ox,oy]of open) for(const fx of[0.2,0.5,0.8]) for(const fy of[0.2,0.5,0.8])
 for(let ang=0;ang<256;ang+=2){
  const px=ox+fx,py=oy+fy,base=ang/256*2*Math.PI;
  const h=new Array(W),fid=new Array(W);
  for(let c=0;c<W;c++){const[d,f]=cast(px,py,base+rayAng[c]);h[c]=halfH(d*cosC[c]);fid[c]=f;}
  for(let R=0;R<13;R++){ const K=8*R-92;
   for(let C=0;C<40;C++){
    const hs=[0,1,2,3].map(k=>h[C*4+k]), ids=[0,1,2,3].map(k=>fid[C*4+k]);
    const t=hs.map(x=>C8(x+K));
    if(t.every(x=>x===0)||t.every(x=>x===8))continue;
    cells++;
    // exact class: first column where the face changes (0 = none)
    let k=0; for(let i=1;i<4;i++) if(ids[i]!==ids[i-1]){k=i;break;}
    if(k===0) ramp++; else steps[k]++;
    clsHist.set(k,(clsHist.get(k)||0)+1);
    // ideal pattern under that class
    let p;
    if(k===0) p=t.slice();                       // single face: true ramp
    else { const A=Math.round(t.slice(0,k).reduce((a,b)=>a+b,0)/k),
                 B=Math.round(t.slice(k).reduce((a,b)=>a+b,0)/(4-k));
           p=[0,1,2,3].map(i=>i<k?A:B); }
    freq.set(p.join(','),(freq.get(p.join(','))||0)+1);
    const fam = k===0?'ramp':('step'+k);
    if(!byFam.has(fam)) byFam.set(fam,new Map());
    const m=byFam.get(fam); m.set(p.join(','),(m.get(p.join(','))||0)+1);
    if(k>0){ const A=p[0],B=p[3];
      satHist.set((A===0||A===8?1:0)+(B===0||B===8?1:0), (satHist.get((A===0||A===8?1:0)+(B===0||B===8?1:0))||0)+1); }
   }}
 }
const pc=n=>(n/cells*100).toFixed(2);
console.log(`edge cells ${cells}`);
console.log(`  single-face (ramp): ${pc(ramp)}%   step@1 ${pc(steps[1])}%  step@2 ${pc(steps[2])}%  step@3 ${pc(steps[3])}%`);
console.log(`\ndistinct ideal patterns: ${freq.size}`);
const sorted=[...freq.entries()].sort((a,b)=>b[1]-a[1]);
for(const [f,m] of byFam){ const tot=[...m.values()].reduce((a,b)=>a+b,0);
  const sr=[...m.values()].sort((a,b)=>b-a);
  console.log(`  ${f.padEnd(6)}: ${String(m.size).padStart(3)} distinct, ${(tot/cells*100).toFixed(2)}% of cells; top 32 of them cover ${(sr.slice(0,32).reduce((a,b)=>a+b,0)/tot*100).toFixed(1)}% of the family`); }
const st=[...satHist.entries()].sort(); const stot=st.reduce((a,b)=>a+b[1],0);
console.log('\nstep cells by how many sides are saturated (0 or 8):');
for(const [k,v] of st) console.log(`  ${k} side(s): ${(v/stot*100).toFixed(1)}%`);
console.log();
for(const n of [128,192,224,238,256]){
  const cov=sorted.slice(0,n).reduce((s,e)=>s+e[1],0);
  console.log(`  top ${String(n).padStart(3)}: covers ${(cov/cells*100).toFixed(3)}% of edge cells exactly`);
}
