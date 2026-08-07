// Test the user's idea: merge by CONNECTED-WALL-RUN id instead of by plane.
// A wall face run = maximal contiguous wall cells along a plane whose facing side is open.
const M=["1111111111111111","1000000100000001","1000000100000001","1000000100011101","1011100000010001","1010000110010111","1010111100010001","1010100000000101","1010101111100101","1000101000000101","1110101011110001","1000001010000001","1011111010111111","1000000000100001","1000110000000001","1111111111111111"].map(r=>r.split("").map(Number));
const wall=(x,y)=>(x<0||y<0||x>15||y>15)?1:M[y][x];
// assign run ids for the 4 face directions
const westRun={},eastRun={},northRun={},southRun={}; let nextId=1;
const key=(x,y)=>y*16+x;
// vertical planes (W/E faces): group contiguous y
for(let x=0;x<16;x++){
  let wPrev=false,ePrev=false,wId=0,eId=0;
  for(let y=0;y<16;y++){
    const wFace=wall(x,y)&&!wall(x-1,y);       // west face exposed
    const eFace=wall(x,y)&&!wall(x+1,y);       // east face exposed
    if(wFace){ if(!wPrev)wId=nextId++; westRun[key(x,y)]=wId; } wPrev=wFace;
    if(eFace){ if(!ePrev)eId=nextId++; eastRun[key(x,y)]=eId; } ePrev=eFace;
  }
}
// horizontal planes (N/S faces): group contiguous x
for(let y=0;y<16;y++){
  let nPrev=false,sPrev=false,nId=0,sId=0;
  for(let x=0;x<16;x++){
    const nFace=wall(x,y)&&!wall(x,y-1);
    const sFace=wall(x,y)&&!wall(x,y+1);
    if(nFace){ if(!nPrev)nId=nextId++; northRun[key(x,y)]=nId; } nPrev=nFace;
    if(sFace){ if(!sPrev)sId=nextId++; southRun[key(x,y)]=sId; } sPrev=sFace;
  }
}
console.log(`total connected-wall-run ids: ${nextId-1}  (fits a byte: ${nextId-1<=255})`);
const NCOL=80,PI2=Math.PI*2,CTR=(NCOL-1)/2,tanHalf=Math.tan(23.5/256*PI2);
const ao=[];for(let c=0;c<NCOL;c++){const cx=(c-CTR)/CTR*tanHalf;ao.push(Math.atan(cx)/PI2*256);}
function castRun(px,py,pa,c){const a=(pa+ao[c])/256*PI2,dx=Math.cos(a),dy=Math.sin(a);let mx=Math.floor(px),my=Math.floor(py);const ddx=Math.abs(1/dx),ddy=Math.abs(1/dy);let sX,sY,sdx,sdy;if(dx<0){sX=-1;sdx=(px-mx)*ddx;}else{sX=1;sdx=(mx+1-px)*ddx;}if(dy<0){sY=-1;sdy=(py-my)*ddy;}else{sY=1;sdy=(my+1-py)*ddy;}let side=0;for(let i=0;i<64;i++){if(sdx<sdy){sdx+=ddx;mx+=sX;side=0;}else{sdy+=ddy;my+=sY;side=1;}if(wall(mx,my))break;}
  const k=key(mx,my);
  if(side===0)return sX>0?westRun[k]:eastRun[k]; else return sY>0?northRun[k]:southRun[k];}
function subdivide(F){const asg=new Array(NCOL).fill(-1);const st=[[0,NCOL-1]];while(st.length){const[L,R]=st.pop();if(F[L]===F[R]){for(let x=L;x<=R;x++)asg[x]=F[L];}else if(R-L>=2){const m=(L+R)>>1;st.push([L,m]);st.push([m,R]);}else{asg[L]=F[L];asg[R]=F[R];}}return asg;}
let views=0,glitched=0;const ex=[];
for(let cy=0;cy<16;cy++)for(let cx=0;cx<16;cx++){if(wall(cx,cy))continue;
  for(const sx of [0.1,0.3,0.5,0.7,0.9])for(const sy of [0.1,0.3,0.5,0.7,0.9])for(let d=0;d<128;d++){const pa=d*2;const F=[];for(let c=0;c<NCOL;c++)F.push(castRun(cx+sx,cy+sy,pa,c));
    const asg=subdivide(F);let bad=0;for(let c=0;c<NCOL;c++)if(asg[c]!==F[c])bad++;
    views++;if(bad>0){glitched++;if(ex.length<8)ex.push(`cell(${cx},${cy}) pa=${pa}: ${bad} cols`);}}}
console.log(`WITH RUN IDs: views ${views}, still-glitched: ${glitched} (${(100*glitched/views).toFixed(2)}%)  [was 2.6% with plane ids]`);
console.log('residual (true occlusion of a continuous run):'); ex.forEach(e=>console.log('  '+e));
