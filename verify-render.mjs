// Render the expected 160x200 frame from the JS reference model and compare it with an
// actual VICE screenshot. The model is the same one used for all the charset analysis.
import { execSync } from 'child_process';
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
const [PX,PY,PA]=process.argv.slice(3,6).map(v=>parseInt(v,16));
const px=(PX>>8)+(PX&255)/256, py=(PY>>8)+(PY&255)/256, base=PA/256*2*Math.PI;
const h=[...Array(W)].map((_,c)=>Math.min(CY,Math.round(88/Math.max(cast(px,py,base+rayAng[c])*cosC[c],0.02))));
// screenshot: display area starts at x=32,y=23; logical col c -> x=32+2c, row r -> y=23+r
const shot=execSync(`node /Users/jfield/c64fps/shot.mjs ${process.argv[2]} 32 23 320 200`).toString().trim().split('\n');
let diff=0, tot=0, worstCol=-1, worstD=0;
for(let c=0;c<W;c++){
  const top=CY-h[c];
  let d=0;
  for(let r=0;r<200;r++){
    if(r<24 && c>=144) continue;              // skip the X/Y/A readout (char rows 0-2, cols 36-39)
    if(r<8 && c<8) continue;                  // skip the fps counter
    const wall = r>=top && r<200-top;
    const got  = shot[r]?.[c*2]==='.';        // '.' = dark = wall
    tot++; if(wall!==got){diff++; d++;}
  }
  if(d>worstD){worstD=d;worstCol=c;}
}
console.log(`${process.argv[2].split('/').pop()}: ${diff}/${tot} pixels differ from the model (${(diff/tot*100).toFixed(2)}%), worst column ${worstCol} off by ${worstD} rows`);
if (process.env.DUMP) {
  console.log('col  modelTop  actualTop');
  for (let c = +process.env.C0 || 0; c < (+process.env.C1 || W); c++) {
    let t = -1; for (let r = 0; r < 100; r++) if (shot[r]?.[c*2] === '.') { t = r; break; }
    console.log(`${String(c).padStart(3)}  ${String(CY-h[c]).padStart(8)}  ${String(t).padStart(9)}`);
  }
}
