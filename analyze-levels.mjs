// How much of the charset's error comes from the endpoint clamp range?
// Ramp cells are indexed by two endpoint LEVELS clamped to CLO..CHI. A line steeper than
// (CHI-CLO)/3 rows per column cannot be represented: both ends clamp and the interior is
// interpolated between the WRONG values. Question: would a wider, non-uniform level set
// (fine inside the cell, coarse outside) trade shallow-line accuracy for steep-line
// accuracy at the same charset cost?
import { readFileSync } from 'fs';
const CACHE='/private/tmp/claude-501/-Users-jfield-c64fps/09636743-6f82-4db3-a7f4-fd7ead1e7881/scratchpad/sweep.json';
const rows=JSON.parse(readFileSync(CACHE,'utf8')).map(([key,n])=>{const [ts,ks,rs]=key.split('|');
  return {t:ts.split(',').map(Number), k:+ks, raw:rs.split(',').map(Number), n};});
const total=rows.reduce((a,r)=>a+r.n,0);
const C8=x=>Math.max(0,Math.min(8,x));
const snap=(v,L)=>L.reduce((b,l)=>Math.abs(l-v)<Math.abs(b-v)?l:b,L[0]);
function evaluate(name,L){
  const set=new Set();
  for(const a of L) for(const b of L) set.add([0,1,2,3].map(k=>C8(Math.round(a+(b-a)*k/3))).join(','));
  const err=new Array(10).fill(0); let clamped=0;
  for(const r of rows){
    if(r.k!==0) continue;                       // ramp cells only (steps are indexed separately)
    const a=snap(r.raw[0],L), b=snap(r.raw[3],L);
    if(r.raw[0]<Math.min(...L)||r.raw[0]>Math.max(...L)||r.raw[3]<Math.min(...L)||r.raw[3]>Math.max(...L)) clamped+=r.n;
    const p=[0,1,2,3].map(k=>C8(Math.round(a+(b-a)*k/3)));
    err[Math.min(9,Math.max(...r.t.map((x,i)=>Math.abs(x-p[i]))))]+=r.n;
  }
  const tot=rows.filter(r=>r.k===0).reduce((a,r)=>a+r.n,0);
  const pc=n=>(n/tot*100).toFixed(2);
  const within=k=>pc(err.slice(0,k+1).reduce((a,b)=>a+b,0));
  console.log(`${name.padEnd(34)} levels=${String(L.length).padStart(2)} ramp chars=${String(set.size).padStart(3)} | 0px ${pc(err[0])}%  <=1px ${within(1)}%  <=2px ${within(2)}%  >=3px ${pc(err.slice(3).reduce((a,b)=>a+b,0))}%  slope<=${((Math.max(...L)-Math.min(...L))/3).toFixed(1)}/col`);
}
const uni=(lo,hi)=>[...Array(hi-lo+1)].map((_,i)=>lo+i);
evaluate('CURRENT uniform -2..10', uni(-2,10));
evaluate('uniform -4..12', uni(-4,12));
evaluate('uniform -6..14', uni(-6,14));
evaluate('non-uniform -6..14 (13 lvl)', [-6,-3,-1,0,1,2,3,4,5,6,7,9,11,14].slice(0,13));
evaluate('non-uniform -9..17 (13 lvl)', [-9,-4,-1,0,1,2,3,4,5,6,7,9,12]);
evaluate('non-uniform -9..17 (15 lvl)', [-9,-5,-2,-1,0,1,2,3,4,5,6,7,8,10,13]);
evaluate('non-uniform wide (17 lvl)',   [-9,-6,-4,-2,-1,0,1,2,3,4,5,6,7,8,10,12,15]);
