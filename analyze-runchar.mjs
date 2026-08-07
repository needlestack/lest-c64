// Along one visible wall face (constant slope under rectilinear projection), how many
// DISTINCT edge-chars are needed? If 1, the renderer can plop a constant across the run.
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

let runs=0,runCells=0,const1=0,cellsInConst=0;
const distHist=new Map(); const runLenHist=new Map();
for(const[ox,oy]of open) for(const fx of[0.2,0.5,0.8]) for(const fy of[0.2,0.5,0.8])
 for(let a=0;a<256;a+=2){
  const px=ox+fx,py=oy+fy,base=a/256*2*Math.PI;
  const top=new Array(W),fid=new Array(W);
  for(let c=0;c<W;c++){const[d,f]=cast(px,py,base+rayAng[c]);top[c]=CY-halfH(d*cosC[c]);fid[c]=f;}
  // walk maximal same-face runs, aligned to whole cells (4 cols)
  let c=0;
  while(c<W){ let e=c; while(e+1<W&&fid[e+1]===fid[c])e++;
    const c0=Math.ceil(c/4)*4, c1=Math.floor((e+1)/4)*4-1;   // whole cells fully inside the run
    if(c1>c0){ runs++;
      const chars=new Set(); let n=0;
      for(let C=c0;C+3<=c1;C+=4){
        const ys=[0,1,2,3].map(k=>top[C+k]);
        const R=Math.floor(Math.min(...ys)/8);
        if(R!==Math.floor(Math.max(...ys)/8)) { /* straddles two cell rows */ }
        const y0=R*8, h=ys.map(t=>Math.max(0,Math.min(8,y0+8-t)));
        if(h.every(v=>v===0)||h.every(v=>v===8)) continue;
        chars.add(h.join(',')); n++;
      }
      if(n){ runCells+=n; distHist.set(chars.size,(distHist.get(chars.size)||0)+1);
        runLenHist.set(Math.min(n,12),(runLenHist.get(Math.min(n,12))||0)+1);
        if(chars.size===1){const1++; cellsInConst+=n;} }
    }
    c=e+1; }
 }
const pc=(n,d)=>(n/d*100).toFixed(2);
console.log(`face runs with >=1 edge cell: ${runs}   edge cells in runs: ${runCells}`);
console.log(`runs needing exactly ONE char: ${const1} = ${pc(const1,runs)}%`);
console.log(`edge cells inside those constant runs: ${pc(cellsInConst,runCells)}%\n`);
console.log('distinct edge-chars per run:');
[...distHist.entries()].sort((a,b)=>a[0]-b[0]).slice(0,8)
  .forEach(([k,v])=>console.log(`  ${k}: ${pc(v,runs)}%`));
console.log('\nedge cells per run:');
[...runLenHist.entries()].sort((a,b)=>a[0]-b[0])
  .forEach(([k,v])=>console.log(`  ${k===12?'12+':k}: ${pc(v,runs)}%`));
