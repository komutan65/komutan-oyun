/* Büyük Harita — weapon caches. Over the land stand roofless little fort ruins, tumbled-down cottages,
   old collapsed buildings and stashes hidden in the woods. Each holds one to three chests, tucked into far corners
   behind barrels and crates, each with one weapon of a level from 1 to 10. Better weapons lie nearer the middle
   (the ring closes there) and in hidden places. Where they stand and what they hold comes from the match seed,
   so it changes every match and nobody can learn a route by heart. */
import * as THREE from 'three';
import {HALF,height,slope,lakeK,edgeK,wetK,rng,CASTLES} from './dunya.js?v=20261124a';
import {S,groundAt,merge,col,tbox,tcyl,brickTex} from './sahne.js?v=20261124a';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const CENTER_R=360;          // castles this near the middle can't be chosen at the start
export const LVC=['#a7a7a7','#c4ccd6','#e8eef6','#8fb4ff','#5d8dff','#ffe08a','#ffc23a','#ffa81e','#ff4a3a','#c38cff'];   // level colours 1..10
// sizes (half extents) of each walled kind, in the site's own frame (z+ is the front)
const DIM={kale:{hw:8,hd:8},ev:{hw:4.6,hd:3.6},harabe:{hw:0,hd:0},gizli:{hw:0,hd:0}};
export function makeSites(seed){const R=rng((seed^0x5eed1234)>>>0),out=[];let guard=0;
  while(out.length<50&&guard++<30000){const x=(R()-.5)*(HALF*2-320),z=(R()-.5)*(HALF*2-320),h=height(x,z);
    if(h<3||h>80||slope(x,z)>.32||lakeK(x,z)>0||edgeK(x,z)>.02)continue;
    if(CASTLES.some(c=>Math.hypot(c.x-x,c.z-z)<75))continue;if(out.some(o=>Math.hypot(o.x-x,o.z-z)<105))continue;
    const d=Math.hypot(x,z),forest=wetK(x,z)>.12,r=R();
    const kind=forest&&r<.45?'gizli':r<.66?'kale':r<.86?'ev':'harabe';
    const base=d<CENTER_R?7:d<650?4:d<900?2:1,hid=kind==='gizli'||kind==='harabe';
    out.push({i:out.length,x,z,y:groundAt(x,z),a:R()*6.283,kind,base:base+(hid?1:0),chests:[],segs:[],gates:[]})}
  for(const o of out){const c=Math.cos(o.a),s=Math.sin(o.a);o.W=(lx,lz)=>({x:o.x+lx*c+lz*s,z:o.z-lx*s+lz*c});o.L=(x,z)=>{const dx=x-o.x,dz=z-o.z;return{x:dx*c-dz*s,z:dx*s+dz*c}};
    const seg=(x1,z1,x2,z2,r)=>{const p=o.W(x1,z1),q=o.W(x2,z2);o.segs.push([p.x,p.z,q.x,q.z,r])};
    // where the chests can lie: far corners and nooks, away from the openings
    let spots;
    if(o.kind==='kale'){const L=8;
      // walls with a wide gate at the front and a breach in one side; four tower stumps at the corners
      o.br=R()<.5?-1:1;seg(-L,-L,L,-L,.5);seg(-L,L,-4.2,L,.5);seg(4.2,L,L,L,.5);seg(o.br*L,-L,o.br*L,-2.2,.5);seg(o.br*L,3.8,o.br*L,L,.5);seg(-o.br*L,-L,-o.br*L,L,.5);
      for(const[x,z]of[[-L,-L],[L,-L],[-L,L],[L,L]])seg(x,z,x,z,2.1);
      o.gates.push({out:[0,L+3.5],in:[0,L-3]},{out:[o.br*(L+3.5),.8],in:[o.br*(L-3),.8]});
      spots=[[-L+2.4,-L+2.4,.8],[L-2.4,-L+2.4,-.8],[-o.br*(L-2.4),L-2.8,2.4],[0,-L+1.7,0]]}
    else if(o.kind==='ev'){const hw=4.6,hd=3.6;
      seg(-hw,-hd,hw,-hd,.35);seg(-hw,-hd,-hw,hd,.35);seg(hw,-hd,hw,-.6,.35);seg(-hw,hd,-2,hd,.35);seg(2,hd,hw,hd,.35);
      o.gates.push({out:[0,hd+3],in:[0,hd-1.8]},{out:[hw+3,1.6],in:[hw-1.8,1.6]});
      spots=[[-hw+1.3,-hd+1.2,.4],[hw-1.3,-hd+1.2,-.4],[-hw+1.3,hd-1.4,2.8]]}
    else if(o.kind==='harabe'){const p=o.W(.4,-.4);o.segs.push([p.x,p.z,p.x,p.z,4.2]);     // the heap of the old building is solid
      spots=[[-4.9,-4.9,.6],[5.2,-4.4,-.7],[-5.4,3.4,1.6]]}
    else spots=[[0,0,0]];
    // one to three chests (a stash in the woods has one); each its own level near the place's own
    const n=o.kind==='gizli'?1:o.kind==='kale'?2+(R()<.5?1:0):1+(R()<.55?1:0);spots=spots.slice();
    for(let j=0;j<n&&spots.length;j++){const k=Math.floor(R()*spots.length),[lx,lz,la]=spots.splice(k,1)[0],w=o.W(lx,lz);
      o.chests.push({i:o.i,j,x:w.x,z:w.z,a:o.a+la,lv:clamp(o.base+Math.floor(R()*3)-(j?1:0),1,9),taken:false,props:Math.floor(R()*3)})}}
  // one or two legendary weapons (level 10), always somewhere hidden or deep, near the middle
  const inner=out.filter(o=>Math.hypot(o.x,o.z)<620).sort((a,b)=>((b.kind==='gizli'||b.kind==='harabe')-(a.kind==='gizli'||a.kind==='harabe'))||R()-.5);
  for(const o of inner.slice(0,1+(R()<.5?1:0)))o.chests[o.chests.length-1].lv=10;
  return out}
// inside a walled site's footprint?
export function inSite(o,x,z,m=0){const D=DIM[o.kind];if(!D.hw)return false;const l=o.L(x,z);return Math.abs(l.x)<D.hw-m&&Math.abs(l.z)<D.hd-m}
export function siteAt(sites,x,z){for(const o of sites){if(Math.abs(o.x-x)>9||Math.abs(o.z-z)>9)continue;if(inSite(o,x,z))return o}return null}
// the way in and out of a walled place: through its nearest opening, never through a wall
// does the straight line a→b (local coordinates) cross the box of half sizes hw, hd?
function segHits(a,b,hw,hd){let t0=0,t1=1;const d=[b.x-a.x,b.z-a.z],p=[a.x,a.z],h=[hw,hd];for(let k=0;k<2;k++){if(Math.abs(d[k])<1e-6){if(Math.abs(p[k])>h[k])return false;continue}let ta=(-h[k]-p[k])/d[k],tb=(h[k]-p[k])/d[k];if(ta>tb)[ta,tb]=[tb,ta];t0=Math.max(t0,ta);t1=Math.min(t1,tb);if(t0>t1)return false}return true}
// round the outside of a walled place by its nearest clear corner
function around(o,u,to){const D=DIM[o.kind],m=o.kind==='kale'?2.6:1.2,a=o.L(u.x,u.z),b=o.L(to.x,to.z);if(!segHits(a,b,D.hw+m,D.hd+m))return null;
  let best=null,bd=1e9;const e=m+2.4;for(const[cx,cz]of[[-1,-1],[1,-1],[1,1],[-1,1]]){const c={x:cx*(D.hw+e),z:cz*(D.hd+e)};if(Math.hypot(c.x-a.x,c.z-a.z)<2.2||segHits(a,c,D.hw+m,D.hd+m))continue;const d=Math.hypot(c.x-a.x,c.z-a.z)+Math.hypot(b.x-c.x,b.z-c.z)+(segHits(c,b,D.hw+m,D.hd+m)?40:0);if(d<bd){bd=d;best=c}}
  if(!best)return null;const w=o.W(best.x,best.z);return{x:w.x,z:w.z,stop:1.2}}
export function siteVia(sites,u,g){for(const o of sites){if(!o.gates.length)continue;if(Math.hypot(o.x-u.x,o.z-u.z)>Math.hypot(o.x-g.x,o.z-g.z)+30&&Math.hypot(o.x-u.x,o.z-u.z)>18)continue;if(Math.hypot(o.x-u.x,o.z-u.z)>40)continue;
    const iu=inSite(o,u.x,u.z,.2),ig=inSite(o,g.x,g.z,.2);if(iu===ig){if(!iu){const r=around(o,u,g);if(r)return r}continue}
    let best=null,bd=1e9;for(const G of o.gates){const a=o.W(...G.out),b=o.W(...G.in),d=iu?Math.hypot(b.x-u.x,b.z-u.z)+Math.hypot(a.x-g.x,a.z-g.z):Math.hypot(a.x-u.x,a.z-u.z)+Math.hypot(b.x-g.x,b.z-g.z);if(d<bd){bd=d;best={a,b,G}}}
    const first=iu?best.b:best.a,second=iu?best.a:best.b;
    // already in the opening's corridor (between its outer and inner points, near its middle line): carry on through
    {const l=o.L(u.x,u.z),A=best.G[iu?'in':'out'],B=best.G[iu?'out':'in'],dx=B[0]-A[0],dz=B[1]-A[1],L2=dx*dx+dz*dz,t=((l.x-A[0])*dx+(l.z-A[1])*dz)/L2,side=Math.abs((l.x-A[0])*dz-(l.z-A[1])*dx)/Math.sqrt(L2);
      if(t>-.12&&t<1.2&&side<1.6)return{x:second.x,z:second.z,stop:.4}}
    if(!iu){const r=around(o,u,first);if(r)return r}
    return{x:first.x,z:first.z,stop:.6}}
  return g}
// ---------- drawing ----------
const box=(w,h,d,x,y,z,c)=>col(new THREE.BoxGeometry(w,h,d).translate(x,y,z),c);
// a wall that has crumbled: several stretches of different heights, the top broken
function ruinWall(L,x1,z1,x2,z2,h0,h1,R,T=1){const len=Math.hypot(x2-x1,z2-z1),a=Math.atan2(x2-x1,z2-z1),n=Math.max(1,Math.round(len/2.2));
  for(let k=0;k<n;k++){const u=-len/2+(k+.5)*len/n,h=h0+(h1-h0)*R(),g=tbox(T,h,len/n+.02,R()<.5?'#ffffff':'#e4ddcf');g.rotateY(a);g.translate((x1+x2)/2+Math.sin(a)*u,h/2,(z1+z2)/2+Math.cos(a)*u);L.push(g)}}
function fortGeo(br,R){const L=[],W=8;
  ruinWall(L,-W,-W,W,-W,2.2,4.4,R);ruinWall(L,-W,W,-4.2,W,1.8,3.8,R);ruinWall(L,4.2,W,W,W,1.8,3.8,R);ruinWall(L,br*W,-W,br*W,-2.2,2,4,R);ruinWall(L,br*W,3.8,br*W,W,1.4,3.4,R);ruinWall(L,-br*W,-W,-br*W,W,2.4,4.6,R);
  for(const[x,z]of[[-W,-W],[W,-W],[-W,W],[W,W]]){const h=3.5+R()*2.6;const t=tcyl(2,2.3,h,10,'#f0ece4');t.translate(x,h/2,z);L.push(t)}
  for(const sd of[-1,1]){const p=tbox(1.3,4.4,1.3,'#ffffff');p.translate(sd*4.85,2.2,W);L.push(p)}
  // fallen stones lie against the walls, inside and out, but never in the gate or the breach; moss on the broken tops; a cracked lintel over the gate
  const free=(x,z)=>!(Math.abs(x)<5.4&&z>W-3)&&!(Math.sign(x)===br&&Math.abs(x)>W-3&&z>-3.2&&z<4.8);
  for(let k=0;k<26;k++){const sd=k%4,u=(R()-.5)*13,io=k%8<4?1:-1,dd=W-(io>0?1:-1)*(1.1+R()*.5);const x=sd===0?-dd:sd===1?dd:u,z=sd===2?-dd:sd===3?dd:u;if(!free(x,z))continue;const r=.3+R()*.55,g=new THREE.DodecahedronGeometry(r,0);g.scale(1,.6,1);g.translate(x,r*.3,z);L.push(col(g,R()<.5?'#9a948a':'#857f75'))}
  for(let k=0;k<14;k++){const sd=k%4,u=(R()-.5)*14,x=sd===0?-W:sd===1?W:u,z=sd===2?-W:sd===3?W:u;if(!free(x,z))continue;const m=new THREE.BoxGeometry(1.1+R()*1.4,.16,1.15);m.rotateY(sd<2?0:Math.PI/2);m.translate(x,1.7+R()*1.3,z);L.push(col(m,'#5f7a3c'))}
  {const a=tbox(4.2,.8,1.1,'#e4ddcf');a.rotateZ(-.08);a.translate(-2.6,4.75,W);L.push(a);const b=tbox(1.6,.7,1,'#d8d0c0');b.rotateZ(-.4);b.translate(6.4,.45,W+1.7);L.push(b)}
  return merge(L,true)}
function houseGeo(R){const L=[],hw=4.6,hd=3.6;
  ruinWall(L,-hw,-hd,hw,-hd,1.6,3.2,R,.45);ruinWall(L,-hw,-hd,-hw,hd,1.2,3,R,.45);ruinWall(L,hw,-hd,hw,-.6,1.2,2.6,R,.45);ruinWall(L,-hw,hd,-2,hd,.8,2.4,R,.45);ruinWall(L,2,hd,hw,hd,.8,2.2,R,.45);
  for(let k=0;k<3;k++){const b=box(.28,.28,4+R()*2,(R()-.5)*5,.2+R()*.3,(R()-.5)*3,'#6b4a2e');b.rotateY((R()-.5)*1.5);L.push(b)}
  for(let k=0;k<7;k++){const g=new THREE.DodecahedronGeometry(.25+R()*.4,0);g.translate((R()-.5)*9,.15,(R()-.5)*7);L.push(col(g,'#a39c90'))}
  return merge(L,true)}
function stashGeo(){const L=[];for(let k=0;k<6;k++){const a=k/6*6.283+.4,g=new THREE.DodecahedronGeometry(.55+(k%2)*.35,0);g.translate(Math.cos(a)*1.5,.35,Math.sin(a)*1.3);L.push(col(g,'#7d786e'))}
  L.push(box(.12,1.6,.12,-.9,.8,-.9,'#5a3f22'),box(.12,1.6,.12,.9,.8,-.9,'#5a3f22'),col(new THREE.CylinderGeometry(1.4,1.4,.08,8,1,false,0,Math.PI).rotateZ(Math.PI/2).rotateY(Math.PI/2).translate(0,1.6,-.9),'#4f6e30'));
  for(let k=0;k<5;k++){const b=new THREE.IcosahedronGeometry(.5+(k%2)*.25,0);b.translate(Math.cos(k*1.3)*1.7,.45,Math.sin(k*1.3)*1.5);L.push(col(b,'#3d6a2a'))}return merge(L,true)}
// chests by tier: plain wood and iron (1-3), banded and studded (4-6), gilded with corner caps (7-8), royal with a crest and gems (9-10).
// The metal parts take the level's colour (aMetal 1); the wood stays wood
function chestParts(tier){const B=[],Lid=[];
  const M=(g,c,m)=>{g=g.index?g.toNonIndexed():g;col(g,c);g.setAttribute('aMetal',new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(m),1));return g};
  const wood=['#6e4424','#5a3418','#4a2414','#5c1616'][tier],w=1.1+tier*.06,h=.6+tier*.04,d=.72+tier*.04,r=d/2;
  B.push(M(new THREE.BoxGeometry(w,h,d).translate(0,h/2,0),wood,0));
  for(const y of tier?[.18*h,.82*h,.5*h]:[.2*h,.8*h])B.push(M(new THREE.BoxGeometry(w+.05,.08,d+.05).translate(0,y,0),'#ffffff',1));
  if(tier>=1)for(const x of[-w/2,w/2])for(const z of[-d/2,d/2])B.push(M(new THREE.BoxGeometry(.12,h+.04,.12).translate(x,h/2,z),'#ffffff',1));
  if(tier>=2)for(const x of[-w/2,w/2])for(const z of[-d/2,d/2])B.push(M(new THREE.SphereGeometry(.09,6,4).translate(x,.04,z),'#ffffff',1));
  Lid.push(M(new THREE.CylinderGeometry(r,r,w,10,1,false,0,Math.PI).rotateZ(Math.PI/2).rotateX(Math.PI/2),wood,0));
  for(const x of tier?[-w*.38,0,w*.38]:[-w*.35,w*.35])Lid.push(M(new THREE.CylinderGeometry(r+.03,r+.03,.08,10,1,true,0,Math.PI).rotateZ(Math.PI/2).rotateX(Math.PI/2).translate(x,0,0),'#ffffff',1));
  Lid.push(M(new THREE.BoxGeometry(.16,.2,.08).translate(0,-.05,r+.02),'#ffffff',1));
  if(tier>=3){Lid.push(M(new THREE.OctahedronGeometry(.13,0).translate(0,r+.08,0),'#ffffff',1));for(const x of[-.3,.3])Lid.push(M(new THREE.OctahedronGeometry(.07,0).translate(x,r*.8,r*.5),'#ff3050',0))}
  const mg=l=>{const g=merge(l);const n=l.reduce((a,b)=>a+b.attributes.position.count,0),m=new Float32Array(n);let o=0;for(const x of l){m.set(x.attributes.aMetal.array,o);o+=x.attributes.position.count}g.setAttribute('aMetal',new THREE.BufferAttribute(m,1));return g};
  return{body:mg(B),lid:mg(Lid),h,d}}
const tierOf=lv=>lv<=3?0:lv<=6?1:lv<=8?2:3;
// the props (from KayKit, CC0): the old collapsed building, barrels, crates — painted from the shared atlas
async function loadProps(V){const r=await fetch('model/esya.bin?v='+V);if(!r.ok)throw new Error('esya');const buf=await r.arrayBuffer(),jl=new DataView(buf).getUint32(0,true),h=JSON.parse(new TextDecoder().decode(new Uint8Array(buf,4,jl)));
  let n=0;for(const k in h.items)n+=h.items[k].n;const o=4+jl+((4-jl%4)%4),P=new Float32Array(buf,o,n*3),N=new Float32Array(buf,o+n*12,n*3),UV=new Float32Array(buf,o+n*24,n*2),out={};
  for(const k in h.items){const it=h.items[k],g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(P.slice(it.o*3,(it.o+it.n)*3),3));g.setAttribute('normal',new THREE.BufferAttribute(N.slice(it.o*3,(it.o+it.n)*3),3));g.setAttribute('uv',new THREE.BufferAttribute(UV.slice(it.o*2,(it.o+it.n)*2),2));g.computeBoundingSphere();out[k]=g}
  const t=new THREE.TextureLoader().load('model/hexagons_medieval.png?v='+V);t.colorSpace=THREE.SRGBColorSpace;t.flipY=false;t.anisotropy=4;return{geo:out,mat:new THREE.MeshLambertMaterial({map:t})}}
export async function makeSiteMeshes(sites,V){const N=sites.length,R=rng(91);
  const stone=new THREE.MeshLambertMaterial({map:brickTex(),vertexColors:true}),plain=new THREE.MeshLambertMaterial({vertexColors:true});
  const mk=(g,mat,cap,shadow=true)=>{const m=new THREE.InstancedMesh(g,mat,Math.max(1,cap));m.count=0;m.frustumCulled=false;m.castShadow=shadow;m.receiveShadow=true;S.scene.add(m);return m};
  // two looks of each walled ruin, so they don't all match
  const kinds={kale:[mk(fortGeo(-1,R),stone,N),mk(fortGeo(1,R),stone,N)],ev:[mk(houseGeo(R),stone,N),mk(houseGeo(R),stone,N)],gizli:[mk(stashGeo(),plain,N)]};
  const cm=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.45,metalness:.35});
  cm.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute float aMetal;varying float vMet;').replace('#include <color_vertex>','#include <color_vertex>\nvMet=aMetal;\n#ifdef USE_INSTANCING_COLOR\nvColor.rgb=mix(color.rgb,color.rgb*instanceColor.rgb,aMetal);\n#endif');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying float vMet;').replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vMet*diffuseColor.rgb*smoothstep(.7,1.,max(diffuseColor.r,max(diffuseColor.g,diffuseColor.b)))*.3;')};
  const tiers=[0,1,2,3].map(t=>{const p=chestParts(t);return{body:mk(p.body,cm,N*3),lid:mk(p.lid,cm,N*3),h:p.h,d:p.d}});
  const glow=new THREE.InstancedMesh(new THREE.SphereGeometry(1,12,8),new THREE.MeshBasicMaterial({transparent:true,opacity:.22,depthWrite:false,blending:THREE.AdditiveBlending}),N*3);glow.count=0;glow.frustumCulled=false;S.scene.add(glow);
  S.sites={list:sites,kinds,tiers,glow};
  let props=null;try{props=await loadProps(V)}catch(e){console.warn(e)}
  if(props){kinds.harabe=[mk(props.geo.harabe,props.mat,N)];kinds.fici=[mk(props.geo.fici,props.mat,N*4)];kinds.sandik=[mk(props.geo.sandik,props.mat,N*4)]}
  else kinds.harabe=[mk(houseGeo(R),stone,N)]}
const m4=new THREE.Matrix4(),m5=new THREE.Matrix4(),m6=new THREE.Matrix4(),q=new THREE.Quaternion(),q2=new THREE.Quaternion(),vp=new THREE.Vector3(),vs=new THREE.Vector3(),UP=new THREE.Vector3(0,1,0),tc=new THREE.Color();
const LVCOL=LVC.map(c=>new THREE.Color(c)),ONE=new THREE.Vector3(1,1,1),SEVEN=new THREE.Vector3(7,7,7);
export function drawSites(cx,cz,t){const T=S.sites;if(!T)return;const cnt=new Map();const put=(m,mat,c)=>{if(!m)return;const i=cnt.get(m)||0;if(i>=m.instanceMatrix.count)return;m.setMatrixAt(i,mat);if(c)m.setColorAt(i,c);cnt.set(m,i+1)};
  let g=0;for(const o of T.list){const d=Math.hypot(o.x-cx,o.z-cz);if(d>900)continue;const K=T.kinds[o.kind];if(!K)continue;q.setFromAxisAngle(UP,o.a);
    m4.compose(vp.set(o.x,o.y-.12,o.z),q,o.kind==='harabe'&&T.kinds.fici?SEVEN:ONE);put(K[o.i%K.length],m4);if(d>220)continue;
    for(const c of o.chests){const y=groundAt(c.x,c.z),P=T.tiers[tierOf(c.lv)];q.setFromAxisAngle(UP,c.a);m4.compose(vp.set(c.x,y,c.z),q,ONE);tc.copy(LVCOL[c.lv-1]);put(P.body,m4,tc);
      // the lid: shut, or thrown open once the weapon is taken
      m5.makeTranslation(0,P.h,-P.d/2).multiply(m6.makeRotationX(c.taken?-1.9:0));m5.multiply(m6.makeTranslation(0,0,P.d/2));put(P.lid,m6.multiplyMatrices(m4,m5),tc);
      // barrels and crates half hide it
      if(T.kinds.fici&&o.kind!=='gizli')for(let k=0;k<=c.props;k++){const side=k%2?1:-1,f=k<2?T.kinds.fici[0]:T.kinds.sandik[0];m5.compose(vp.set(side*(1.4+k*.2),0,.9+k*.45),q2.setFromAxisAngle(UP,k*1.7+c.j),SEVEN);put(f,m6.multiplyMatrices(m4,m5))}
      if(!c.taken&&c.lv>=7&&d<70&&g<T.glow.instanceMatrix.count){const s=.8+.2*Math.sin(t*3+c.i+c.j)+(c.lv-6)*.12;m5.compose(vp.set(c.x,y+.6,c.z),q2.identity(),vs.set(s,s*.7,s));T.glow.setMatrixAt(g,m5);T.glow.setColorAt(g++,tc.copy(LVCOL[c.lv-1]).multiplyScalar(.7))}}}
  for(const K of Object.values(T.kinds))for(const m of K){m.count=cnt.get(m)||0;m.instanceMatrix.needsUpdate=true}
  for(const P of T.tiers)for(const m of[P.body,P.lid]){m.count=cnt.get(m)||0;m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true}
  T.glow.count=g;T.glow.instanceMatrix.needsUpdate=true;if(T.glow.instanceColor)T.glow.instanceColor.needsUpdate=true}
