// Replay ONE ray exactly as castRay does -- same byte angle, same integer deltaDist
// tables, same 8.8 fixed point -- and compare with the float reference.
const M=["1111111111111111","1000000100000001","1000000100000001","1000000100011101",
 "1011100000010001","1010000110010111","1010111100010001","1010100000000101",
 "1010101111100101","1000101000000101","1110101011110001","1000001010000001",
 "1011111010111111","1000000000100001","1000110000000001","1111111111111111"];
const map=[];for(let y=0;y<16;y++)for(let x=0;x<16;x++)map.push(+M[y][x]);
const SCALE=256, NLOG=160, FOV=47, CTR=(NLOG-1)/2, TANHALF=Math.tan(FOV/2/256*2*Math.PI);
const ddxT=[],ddyT=[],posXT=[],posYT=[];
for(let a=0;a<256;a++){const cx=Math.cos(a/256*2*Math.PI), sy=Math.sin(a/256*2*Math.PI);
  ddxT.push(Math.min(65535,Math.round(SCALE/Math.max(1e-3,Math.abs(cx)))));
  ddyT.push(Math.min(65535,Math.round(SCALE/Math.max(1e-3,Math.abs(sy)))));
  posXT.push(cx>=0?1:0); posYT.push(sy>=0?1:0);}
const rayOff=[],cosCorr=[];
for(let c=0;c<NLOG;c++){const camX=(c-CTR)/CTR*TANHALF;
  rayOff.push(Math.round(Math.atan(camX)/(2*Math.PI)*256)&255);
  cosCorr.push(Math.min(255,Math.round(256/Math.sqrt(1+camX*camX))));}
const [PX,PY,PA]=process.argv.slice(2,5).map(v=>parseInt(v,16));
const cols=process.argv.slice(5).map(Number);
for(const col of cols){
  const rang=(PA+rayOff[col])&255;
  const ddx=ddxT[rang], ddy=ddyT[rang];
  const frx=PX&255, fry=PY&255;
  let sdx,sdy,stpX,stpY;
  const mx0=PX>>8, my0=PY>>8;
  // sideMul: frac*delta >> 8
  const mulX=(frx*ddx)>>8, mulY=(fry*ddy)>>8;
  if(posXT[rang]){stpX=1; sdx=ddx-mulX;} else {stpX=-1; sdx=mulX;}
  if(posYT[rang]){stpY=1; sdy=ddy-mulY;} else {stpY=-1; sdy=mulY;}
  let mx=mx0,my=my0,side=0,steps=0;
  for(let i=0;i<24;i++){ steps++;
    if(sdx<sdy){sdx+=ddx;mx+=stpX;side=0} else {sdy+=ddy;my+=stpY;side=1}
    if(map[my*16+mx])break; }
  const rem = side===0 ? sdx-ddx : sdy-ddy;
  const j = (rem>>3);
  const hEng = Math.max(0,Math.min(254, Math.round(2816/Math.max(1,j*cosCorr[col]/256))));
  // float reference
  const th=PA/256*2*Math.PI + Math.atan((col-CTR)/CTR*TANHALF);
  const dx=Math.cos(th),dy=Math.sin(th);
  let fx=PX/256,fy=PY/256,fmx=Math.floor(fx),fmy=Math.floor(fy);
  const fddx=Math.abs(1/dx),fddy=Math.abs(1/dy);let fsx,fsy,fsdx,fsdy;
  if(dx<0){fsx=-1;fsdx=(fx-fmx)*fddx}else{fsx=1;fsdx=(fmx+1-fx)*fddx}
  if(dy<0){fsy=-1;fsdy=(fy-fmy)*fddy}else{fsy=1;fsdy=(fmy+1-fy)*fddy}
  let fside=0;
  for(let i=0;i<64;i++){ if(fsdx<fsdy){fsdx+=fddx;fmx+=fsx;fside=0}else{fsdy+=fddy;fmy+=fsy;fside=1}
    if(map[fmy*16+fmx])break; }
  const fd=(fside===0?fsdx-fddx:fsdy-fddy)*Math.cos(Math.atan((col-CTR)/CTR*TANHALF));
  console.log(`col ${String(col).padStart(3)} rang=$${rang.toString(16)} ddx=${String(ddx).padStart(5)} ddy=${String(ddy).padStart(5)} | engine: hit (${mx},${my}) side=${side} steps=${steps} rem=${rem} h=${hEng} | float: hit (${fmx},${fmy}) d=${fd.toFixed(3)} h=${Math.round(88/fd)}`);
}
