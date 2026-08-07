// merge-est.mjs — for specific views, how many marches does the merge save (cells->faces)?
// and does the resulting fps clear 10 on the worst case? Uses rectilinear cast.
const M = [
 "1111111111111111","1000000100000001","1000000100000001","1000000100011101",
 "1011100000010001","1010000110010111","1010111100010001","1010100000000101",
 "1010101111100101","1000101000000101","1110101011110001","1000001010000001",
 "1011111010111111","1000000000100001","1000110000000001","1111111111111111",
].map(r=>r.split('').map(Number));
const wall=(x,y)=>(x<0||y<0||x>15||y>15)?1:M[y][x];
const NCOL=80,PI2=Math.PI*2,CTR=(NCOL-1)/2,tanHalf=Math.tan(23.5/256*PI2);
const atanOff=[],cc=[]; for(let c=0;c<NCOL;c++){const camX=(c-CTR)/CTR*tanHalf;atanOff.push(Math.atan(camX)/PI2*256);cc.push(1/Math.sqrt(1+camX*camX));}
function cast(px,py,pa,c){
  const ang=(pa+atanOff[c])/256*PI2,dx=Math.cos(ang),dy=Math.sin(ang);
  let mx=Math.floor(px),my=Math.floor(py);
  const ddx=Math.abs(dx)<1e-9?1e9:Math.abs(1/dx),ddy=Math.abs(dy)<1e-9?1e9:Math.abs(1/dy);
  let sX,sY,sdx,sdy;
  if(dx<0){sX=-1;sdx=(px-mx)*ddx;}else{sX=1;sdx=(mx+1-px)*ddx;}
  if(dy<0){sY=-1;sdy=(py-my)*ddy;}else{sY=1;sdy=(my+1-py)*ddy;}
  let side=0,perp=64,steps=0;
  for(let i=0;i<64;i++){steps++;if(sdx<sdy){sdx+=ddx;mx+=sX;side=0;}else{sdy+=ddy;my+=sY;side=1;}
    if(wall(mx,my)){perp=side===0?(mx-px+(1-sX)/2)/dx:(my-py+(1-sY)/2)/dy;break;}}
  const faceId=side===0?(mx*4+(sX>0?0:1)):(256+my*4+(sY>0?2:3));
  return {faceId,cellId:my*16+mx,steps};
}
function stats(px,py,pa){
  const R=[];let totSteps=0;for(let c=0;c<NCOL;c++){R.push(cast(px,py,pa,c));totSteps+=R[c].steps;}
  let cells=1,faces=1;for(let x=1;x<NCOL;x++){if(R[x].cellId!==R[x-1].cellId)cells++;if(R[x].faceId!==R[x-1].faceId)faces++;}
  return {cells,faces};
}
// worst-case-ish views: the deterministic start, plus a sweep of directions from a few open cells
const views=[[1.5,1.5,0],[1.5,1.5,32],[5.5,7.5,0],[5.5,7.5,64],[2.5,13.5,0],[11.5,11.5,192]];
console.log('view                cells faces  merge-marches-vs-cell');
let sc=0,sf=0,n=0;
for(const[px,py,pa]of views){const s=stats(px,py,pa);sc+=s.cells;sf+=s.faces;n++;
  console.log(`(${px},${py}) pa=${pa}`.padEnd(20)+`  ${s.cells}    ${s.faces}    ${(s.faces/s.cells).toFixed(2)}x`);}
// full-map average
let ac=0,af=0,m=0;for(let cy=0;cy<16;cy++)for(let cx=0;cx<16;cx++){if(wall(cx,cy))continue;for(let d=0;d<32;d++){const s=stats(cx+0.5,cy+0.5,d*8);ac+=s.cells;af+=s.faces;m++;}}
console.log(`\nfull-map avg: cells ${(ac/m).toFixed(2)}  faces ${(af/m).toFixed(2)}  ratio ${(af/ac).toFixed(2)}`);
// fps model: start view measured 8fps=128k cyc, marching~60k of it. If marches scale ~with boundaries:
// merged marches = 2*faces (corners) + interior seams are DIVIDES not marches (~1/3 cost)
for(const[px,py,pa,label]of [[1.5,1.5,0,'start(worst)']]){
  const s=stats(px,py,pa);
  const cellMarchFrac=60/128; // marching share at 8fps
  // model current marching cost ~ proportional to cells; merged ~ proportional to faces + 0.35*(cells-faces) for seam divides
  const cur=s.cells, mer=s.faces+0.35*(s.cells-s.faces);
  const newMarchCyc=60000*(mer/cur);
  const newFrame=128000-60000+newMarchCyc;
  console.log(`\n${label}: cells ${s.cells} faces ${s.faces}`);
  console.log(`  est frame ${Math.round(newFrame/1000)}k cyc -> ~${(1000000/newFrame).toFixed(1)} fps  (from 8)`);
}
