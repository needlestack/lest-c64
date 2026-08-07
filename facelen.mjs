const M=["1111111111111111","1000000100000001","1000000100000001","1000000100011101","1011100000010001","1010000110010111","1010111100010001","1010100000000101","1010101111100101","1000101000000101","1110101011110001","1000001010000001","1011111010111111","1000000000100001","1000110000000001","1111111111111111"].map(r=>r.split("").map(Number));
const wall=(x,y)=>(x<0||y<0||x>15||y>15)?1:M[y][x];
const NCOL=80,PI2=Math.PI*2,CTR=(NCOL-1)/2,tanHalf=Math.tan(23.5/256*PI2);
const ao=[];for(let c=0;c<NCOL;c++){const cx=(c-CTR)/CTR*tanHalf;ao.push(Math.atan(cx)/PI2*256);}
function cast(px,py,pa,c){const a=(pa+ao[c])/256*PI2,dx=Math.cos(a),dy=Math.sin(a);let mx=Math.floor(px),my=Math.floor(py);const ddx=Math.abs(1/dx),ddy=Math.abs(1/dy);let sX,sY,sdx,sdy;if(dx<0){sX=-1;sdx=(px-mx)*ddx;}else{sX=1;sdx=(mx+1-px)*ddx;}if(dy<0){sY=-1;sdy=(py-my)*ddy;}else{sY=1;sdy=(my+1-py)*ddy;}let side=0;for(let i=0;i<64;i++){if(sdx<sdy){sdx+=ddx;mx+=sX;side=0;}else{sdy+=ddy;my+=sY;side=1;}if(wall(mx,my))break;}return{f:side===0?(mx*2+(sX>0?0:1)):(64+my*2+(sY>0?0:1)),cell:my*16+mx};}
let hist={},tot=0,ge5=0,cellsSaved=0,cellsTotal=0;
for(let cy=0;cy<16;cy++)for(let cx=0;cx<16;cx++){
  if(wall(cx,cy))continue;
  for(let d=0;d<32;d++){
    const R=[];for(let c=0;c<NCOL;c++)R.push(cast(cx+0.5,cy+0.5,d*8,c));
    let a=0;
    while(a<NCOL){
      let b=a;while(b+1<NCOL&&R[b+1].f===R[a].f)b++;
      let cells=1;for(let x=a+1;x<=b;x++)if(R[x].cell!==R[x-1].cell)cells++;
      hist[cells]=(hist[cells]||0)+1;tot++;
      if(cells>=5){ge5++;cellsSaved+=cells-2;}
      cellsTotal+=cells;
      a=b+1;
    }
  }
}
console.log("face-length histogram (cells:count):",JSON.stringify(hist));
console.log(`faces total ${tot}, faces>=5 cells: ${ge5} (${(100*ge5/tot).toFixed(1)}%)`);
console.log(`interior cell-marches the merge could skip (faces>=5 only): ${cellsSaved} of ${cellsTotal} (${(100*cellsSaved/cellsTotal).toFixed(1)}%)`);
