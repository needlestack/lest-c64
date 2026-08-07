// analyze-recti.mjs — does a RECTILINEAR projection make wall height linear across columns?
const M = [
 "1111111111111111","1000000100000001","1000000100000001","1000000100011101",
 "1011100000010001","1010000110010111","1010111100010001","1010100000000101",
 "1010101111100101","1000101000000101","1110101011110001","1000001010000001",
 "1011111010111111","1000000000100001","1000110000000001","1111111111111111",
].map(r => r.split('').map(Number));
const wall = (x,y)=>(x<0||y<0||x>15||y>15)?1:M[y][x];
const NCOL=80, PI2=Math.PI*2, CTR=(NCOL-1)/2;
const halfAng = 23.5/256*PI2, tanHalf = Math.tan(halfAng);     // same FOV as current build
// rectilinear column offsets (atan) + cos-correction
const atanOff=[], cosCorr=[];
for(let c=0;c<NCOL;c++){ const camX=(c-CTR)/CTR*tanHalf; atanOff.push(Math.atan(camX)/PI2*256); cosCorr.push(1/Math.sqrt(1+camX*camX)); }

function cast(px,py,pa,c){
  const ang=(pa+atanOff[c])/256*PI2, dx=Math.cos(ang), dy=Math.sin(ang);
  let mapX=Math.floor(px),mapY=Math.floor(py);
  const ddx=Math.abs(dx)<1e-9?1e9:Math.abs(1/dx), ddy=Math.abs(dy)<1e-9?1e9:Math.abs(1/dy);
  let sX,sY,sdx,sdy;
  if(dx<0){sX=-1;sdx=(px-mapX)*ddx;}else{sX=1;sdx=(mapX+1-px)*ddx;}
  if(dy<0){sY=-1;sdy=(py-mapY)*ddy;}else{sY=1;sdy=(mapY+1-py)*ddy;}
  let side=0,perp=64;
  for(let i=0;i<64;i++){ if(sdx<sdy){sdx+=ddx;mapX+=sX;side=0;}else{sdy+=ddy;mapY+=sY;side=1;}
    if(wall(mapX,mapY)){perp=side===0?(mapX-px+(1-sX)/2)/dx:(mapY-py+(1-sY)/2)/dy;break;} }
  perp*=cosCorr[c];                                              // <-- rectilinear correction
  let h=44/Math.max(0.03,perp);  // UNCAPPED
  const faceId=side===0?(mapX*4+(sX>0?0:1)):(256+mapY*4+(sY>0?2:3));
  return {faceId,h};
}
const NDIR=32,SUBS=[0.2,0.5,0.8];
let hErrSum=0,hN=0,hMax=0,runsHi=0,runsTot=0;
for(let cy=0;cy<16;cy++)for(let cx=0;cx<16;cx++){ if(wall(cx,cy))continue;
  for(const sx of SUBS)for(const sy of SUBS){ const px=cx+sx,py=cy+sy;
    for(let d=0;d<NDIR;d++){ const pa=Math.round(d*256/NDIR);
      const R=[];for(let c=0;c<NCOL;c++)R.push(cast(px,py,pa,c));
      let a=0; while(a<NCOL){ let b=a; while(b+1<NCOL&&R[b+1].faceId===R[a].faceId)b++;
        if(b-a>=2){ runsTot++; let he=0;
          const cap=v=>Math.max(0,Math.min(50,Math.round(v)));
          for(let x=a;x<=b;x++){const t=(x-a)/(b-a);const interp=cap(R[a].h+(R[b].h-R[a].h)*t);const truth=cap(R[x].h);const e=Math.abs(interp-truth);hErrSum+=e;hN++;hMax=Math.max(hMax,e);he=Math.max(he,e);}
          if(he>3)runsHi++; } a=b+1; } } } }
console.log(`RECTILINEAR height (linear interp over whole run): avg err ${(hErrSum/hN).toFixed(2)} rows, max ${hMax.toFixed(1)}`);
console.log(`runs with height error >3 rows: ${(100*runsHi/runsTot).toFixed(1)}% of ${runsTot}   (was 21.7% angular)`);
