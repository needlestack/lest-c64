// Strategy: charset = the exact single-face (line-consistent) patterns. Corner cells,
// which no single line can express, snap to the nearest available char. Single-face
// cells stay pixel-exact; only the 16% corner cells take any error.
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
const open=[];for(let y=1;y<15;y++)for(let x=1;x<15;x++)if(!map[y*16+x])open.push([x,y]);

function sweep(cb){ for(const[ox,oy]of open) for(const fx of[0.2,0.5,0.8]) for(const fy of[0.2,0.5,0.8])
 for(let a=0;a<256;a++){ const px=ox+fx,py=oy+fy,base=a/256*2*Math.PI;
  const top=new Array(W),fid=new Array(W);
  for(let c=0;c<W;c++){const[d,f]=cast(px,py,base+rayAng[c]);top[c]=CY-halfH(d*cosC[c]);fid[c]=f;}
  for(let R=0;R<12;R++)for(let C=0;C<40;C++){
   const y0=R*8,h=[0,1,2,3].map(k=>Math.max(0,Math.min(8,y0+8-top[C*4+k])));
   if(h.every(v=>v===0)||h.every(v=>v===8))continue;
   cb(h,new Set([0,1,2,3].map(k=>fid[C*4+k])).size>1); } } }

// pass 1: collect the exact single-face patterns + usage counts
const single=new Map(), cornerList=new Map();
sweep((h,isCorner)=>{ const k=h.join(',');
  if(isCorner) cornerList.set(k,(cornerList.get(k)||0)+1);
  else single.set(k,(single.get(k)||0)+1); });
const set=[...single.keys()].map(k=>k.split(',').map(Number));
console.log(`charset = exact single-face patterns: ${set.length}  (+2 for solid/blank = ${set.length+2} of 256)`);

// pass 2: snap each corner pattern to nearest available char (sum of per-column px error)
const errHist=new Array(9).fill(0); let ctot=0;
for(const[k,n]of cornerList){ const h=k.split(',').map(Number); let best=99,bestMax=99;
  for(const s of set){ let sum=0,mx=0; for(let i=0;i<4;i++){const d=Math.abs(s[i]-h[i]);sum+=d;if(d>mx)mx=d;}
    if(sum<best||(sum===best&&mx<bestMax)){best=sum;bestMax=mx;} }
  errHist[bestMax]+=n; ctot+=n; }
const tot=[...single.values()].reduce((a,b)=>a+b,0)+ctot;
console.log(`\nsingle-face cells: ${(100*(tot-ctot)/tot).toFixed(2)}% of edge cells, PIXEL-EXACT`);
console.log(`corner cells:      ${(100*ctot/tot).toFixed(2)}%, snapped. worst-column error:`);
for(let e=0;e<9;e++) if(errHist[e]) console.log(`   ${e}px: ${(100*errHist[e]/tot).toFixed(3)}% of all edge cells`);
