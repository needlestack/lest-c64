// The 3-class bulge test is blind to a CENTRED step: [a,a,b,b] has interior sum a+b,
// identical to a straight line, so it scores 0 and renders as a ramp -- the jagged
// vertical wall edge. Fix: classify by the SIGN PAIR of the two interior deviations
// from the line, which separates all three step positions from the ramp.
//   s1 = 3*w1 - (2a + b)      s2 = 3*w2 - (a + 2b)      (x3 to stay integer)
//   (0,0) ramp | same sign -> step at an end | opposite signs -> step centred
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
  if(mx<0||my<0||mx>15||my>15)return 1e9;
  if(map[my*16+mx])return side===0?sdx-ddx:sdy-ddy;}
 return 1e9;}
const halfH=d=>Math.min(CY,Math.round(88/Math.max(d,0.02)));
const C8=x=>Math.max(0,Math.min(8,x));
function pat(a,b,cls,MINJ){
  if(cls===1||Math.abs(a-b)<MINJ) return [0,1,2,3].map(k=>C8(Math.round(a+(b-a)*k/3)));
  if(cls===3) return [C8(a),C8(a),C8(b),C8(b)];                       // centred step
  const late = (cls===0) === (a<b);                                    // step at col 3?
  return late ? [C8(a),C8(a),C8(a),C8(b)] : [C8(a),C8(b),C8(b),C8(b)];
}
const open=[];for(let y=1;y<15;y++)for(let x=1;x<15;x++)if(!map[y*16+x])open.push([x,y]);
for(const [LO,HI,MINJ,T] of [[-2,10,3,2],[-2,10,4,2],[-1,9,3,2],[-1,9,4,2],[-2,10,3,3],[-1,9,3,3]]){
  const cl=x=>Math.max(LO,Math.min(HI,x));
  const chars=new Set();
  for(let a=LO;a<=HI;a++) for(let b=LO;b<=HI;b++) for(let c=0;c<4;c++) chars.add(pat(a,b,c,MINJ).join(','));
  const err=new Array(10).fill(0); let cells=0;
  for(const[ox,oy]of open) for(const fx of[0.2,0.5,0.8]) for(const fy of[0.2,0.5,0.8])
   for(let ang=0;ang<256;ang+=4){
    const px=ox+fx,py=oy+fy,base=ang/256*2*Math.PI;
    const h=new Array(W);
    for(let c=0;c<W;c++) h[c]=halfH(cast(px,py,base+rayAng[c])*cosC[c]);
    for(let R=0;R<13;R++){ const K=8*R-92;
     for(let C=0;C<40;C++){
      const hs=[0,1,2,3].map(k=>h[C*4+k]);
      const t=hs.map(x=>C8(x+K));
      if(t.every(x=>x===0)||t.every(x=>x===8))continue;
      cells++;
      const a=cl(hs[0]+K), b=cl(hs[3]+K), w1=cl(hs[1]+K), w2=cl(hs[2]+K);
      const s1=3*w1-(2*a+b), s2=3*w2-(a+2*b);
      const z1=Math.abs(s1)<=T, z2=Math.abs(s2)<=T;
      let cls;
      if(z1&&z2) cls=1;
      else if(!z1&&!z2&&((s1<0)!==(s2<0))) cls=3;
      else cls=((s1||s2)<0)?0:2;
      const p=pat(a,b,cls,MINJ);
      err[Math.min(9,Math.max(...t.map((x,i)=>Math.abs(x-p[i]))))]++;
     }}
   }
  const pc=n=>(n/cells*100).toFixed(3);
  const within=k=>pc(err.slice(0,k+1).reduce((x,y)=>x+y,0));
  const fits=chars.size<=238;
  console.log(`clamp ${String(LO).padStart(2)}..${HI} minjump=${MINJ} T=${T}: chars ${String(chars.size).padStart(3)}+18 ${fits?'FITS':'OVER'} | 0px ${pc(err[0])}%  <=1px ${within(1)}%  <=2px ${within(2)}%  >=3px ${pc(err.slice(3).reduce((x,y)=>x+y,0))}%`);
}
