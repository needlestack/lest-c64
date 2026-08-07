// FINAL charset model. Index = (wL, wR, bulge) where bulge is 3-valued:
//   0 interior sits BELOW the endpoint line -> step late  [a, m, m, b]   m=min(a,b)
//   1 interior on the line                  -> linear ramp
//   2 interior sits ABOVE the line          -> step early [a, M, M, b]   M=max(a,b)
// Analytic, so it needs no captured data and holds for any map.
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
const C8=x=>Math.max(0,Math.min(8,x));
function modelPat(a,b,bi){
  if(bi===1) return [0,1,2,3].map(k=>C8(Math.round(a+(b-a)*k/3)));
  const v = bi===0 ? Math.min(a,b) : Math.max(a,b);
  return [C8(a), C8(v), C8(v), C8(b)];
}
const open=[];for(let y=1;y<15;y++)for(let x=1;x<15;x++)if(!map[y*16+x])open.push([x,y]);
for(const [LO,HI,TH] of [[-1,9,1.5],[-2,10,1.5],[-2,10,1.0],[-4,12,1.5]]){
  const N=HI-LO+1, cl=x=>Math.max(LO,Math.min(HI,x));
  const chars=new Set();
  for(let a=LO;a<=HI;a++) for(let b=LO;b<=HI;b++) for(let bi=0;bi<3;bi++) chars.add(modelPat(a,b,bi).join(','));
  const err=new Array(10).fill(0); let cells=0;
  for(const[ox,oy]of open) for(const fx of[0.2,0.5,0.8]) for(const fy of[0.2,0.5,0.8])
   for(let ang=0;ang<256;ang+=4){
    const px=ox+fx,py=oy+fy,base=ang/256*2*Math.PI;
    const h=new Array(W);
    for(let c=0;c<W;c++){const[d]=cast(px,py,base+rayAng[c]);h[c]=halfH(d*cosC[c]);}
    for(let R=0;R<13;R++){ const K=8*R-92;
     for(let C=0;C<40;C++){
      const hs=[0,1,2,3].map(k=>h[C*4+k]);
      const t=hs.map(x=>C8(x+K));
      if(t.every(x=>x===0)||t.every(x=>x===8))continue;
      cells++;
      const a=cl(hs[0]+K), b=cl(hs[3]+K);
      const lin=(a+(b-a)/3)+(a+2*(b-a)/3);
      const bl=(cl(hs[1]+K)+cl(hs[2]+K))-lin;
      const bi = bl<-TH?0 : bl>TH?2 : 1;
      const p=modelPat(a,b,bi);
      err[Math.min(9,Math.max(...t.map((x,i)=>Math.abs(x-p[i]))))]++;
     }}
   }
  const pc=n=>(n/cells*100).toFixed(3);
  const within=k=>pc(err.slice(0,k+1).reduce((a,b)=>a+b,0));
  console.log(`clamp ${String(LO).padStart(2)}..${HI} th=${TH}: chars ${String(chars.size).padStart(3)}/256 ${chars.size<=254?'OK ':'OVER'} | 0px ${pc(err[0])}%  <=1px ${within(1)}%  <=2px ${within(2)}%  >=4px ${pc(err.slice(4).reduce((a,b)=>a+b,0))}%`);
}
