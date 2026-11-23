/* Büyük Harita — weapon caches: small watchtowers, cottages and hidden stashes scattered over the land.
   Each holds one weapon of a level from 1 to 10. Better weapons lie nearer the middle (the ring closes there)
   and in hidden places. Where they stand and what they hold changes every match (it comes from the match seed),
   so nobody can learn a route by heart. */
import * as THREE from 'three';
import {HALF,height,slope,lakeK,edgeK,wetK,rng,CASTLES} from './dunya.js';
import {S,groundAt,merge} from './sahne.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const CENTER_R=360;          // castles this near the middle can't be chosen at the start
export const LVC=['#9a9a9a','#b8c2cc','#dfe6ee','#8fb4ff','#5d8dff','#ffd36a','#ffbf3a','#ffae2a','#ff5a4a','#c99cff'];   // level colours 1..10
export function makeSites(seed){const R=rng((seed^0x5eed1234)>>>0),out=[];let guard=0;
  while(out.length<36&&guard++<20000){const x=(R()-.5)*(HALF*2-320),z=(R()-.5)*(HALF*2-320),h=height(x,z);
    if(h<3||h>85||slope(x,z)>.42||lakeK(x,z)>0||edgeK(x,z)>.02)continue;
    if(CASTLES.some(c=>Math.hypot(c.x-x,c.z-z)<70))continue;if(out.some(o=>Math.hypot(o.x-x,o.z-z)<120))continue;
    const d=Math.hypot(x,z),forest=wetK(x,z)>.12,hid=forest&&R()<.55;
    // the level: low at the edges, high in the middle; hidden stashes a step or two better
    let lv=d<CENTER_R?7+Math.floor(R()*3):d<650?4+Math.floor(R()*3):d<900?2+Math.floor(R()*3):1+Math.floor(R()*3);if(hid)lv+=1+Math.floor(R()*2);
    out.push({i:out.length,x,z,y:h,a:Math.floor(R()*4)*Math.PI/2+(R()-.5)*.6,kind:hid?'gizli':R()<.5?'kule':'ev',lv:clamp(lv,1,9),taken:false})}
  // one or two legendary weapons (level 10), always in a hidden or far-in place near the middle
  const inner=out.filter(o=>Math.hypot(o.x,o.z)<620).sort((a,b)=>(b.kind==='gizli')-(a.kind==='gizli')||R()-.5);
  for(const o of inner.slice(0,1+(R()<.5?1:0)))o.lv=10;
  for(const o of out){o.y=groundAt(o.x,o.z);const c=Math.cos(o.a),s=Math.sin(o.a);o.W=(lx,lz)=>({x:o.x+lx*c+lz*s,z:o.z-lx*s+lz*c});o.segs=[];o.chest=o.W(0,o.kind==='kule'?-.3:-.8);
    const seg=(x1,z1,x2,z2,r)=>{const p=o.W(x1,z1),q=o.W(x2,z2);o.segs.push([p.x,p.z,q.x,q.z,r])};
    if(o.kind==='ev'){const w=3.6,d=3.1;seg(-w,-d,w,-d,.35);seg(-w,-d,-w,d,.35);seg(w,-d,w,d,.35);seg(-w,d,-1,d,.35);seg(1,d,w,d,.35)}
    else if(o.kind==='kule'){const w=2.8;seg(-w,-w,w,-w,.4);seg(-w,-w,-w,w,.4);seg(w,-w,w,w,.4);seg(-w,w,-.9,w,.4);seg(.9,w,w,w,.4)}}
  return out}
// ---------- drawing ----------
function col(g,c){const n=g.attributes.position.count,a=new Float32Array(n*3),C=new THREE.Color(c);for(let i=0;i<n;i++){a[i*3]=C.r;a[i*3+1]=C.g;a[i*3+2]=C.b}g.setAttribute('color',new THREE.BufferAttribute(a,3));return g}
const box=(w,h,d,x,y,z,c)=>col(new THREE.BoxGeometry(w,h,d).translate(x,y,z),c);
function houseGeo(){const W='#d9cbb0',T='#6b4a2e',w=3.6,d=3.1,H=3.2,L=[];
  L.push(box(w*2,H,.4,0,H/2,-d,W),box(.4,H,d*2,-w,H/2,0,W),box(.4,H,d*2,w,H/2,0,W),box(w-1,H,.4,-(w+1)/2,H/2,d,W),box(w-1,H,.4,(w+1)/2,H/2,d,W),box(2,H-2.3,.4,0,2.3+(H-2.3)/2,d,W));
  for(const[x,z]of[[-w,-d],[w,-d],[-w,d],[w,d]])L.push(box(.5,H+.1,.5,x,H/2,z,T));L.push(box(w*2+.4,.3,.5,0,H,-d,T),box(w*2+.4,.3,.5,0,H,d,T));
  L.push(box(.9,.9,.1,-2.2,1.7,d+.22,'#3a2a1c'),box(.9,.9,.1,2.2,1.7,d+.22,'#3a2a1c'),col(new THREE.CylinderGeometry(.5,.5,3,6).rotateZ(Math.PI/2).translate(-2.6,.5,-2.2),'#8a6a44'));
  return merge(L)}
function houseRoof(){const w=3.6,d=3.1,H=3.2,L=[];for(const sd of[-1,1]){const g=new THREE.BoxGeometry(w*2+1,.25,d*1.25);g.rotateX(sd*.62);g.translate(0,H+1.25,sd*d*.52);L.push(col(g,'#9a4a2e'))}
  const gb=new THREE.BufferGeometry();const P=[];for(const z of[-d,d])P.push(-w,H,z, w,H,z, 0,H+2.1,z);gb.setAttribute('position',new THREE.Float32BufferAttribute(P,3));L.push(col(gb,'#d9cbb0'));return merge(L)}
function towerGeo(){const W='#a8a296',C='#c9c2b4',w=2.8,H=8,L=[];
  L.push(box(w*2,H,.6,0,H/2,-w,W),box(.6,H,w*2,-w,H/2,0,W),box(.6,H,w*2,w,H/2,0,W),box(w-.9,H,.6,-(w+.9)/2,H/2,w,W),box(w-.9,H,.6,(w+.9)/2,H/2,w,W),box(1.8,H-2.4,.6,0,2.4+(H-2.4)/2,w,W));
  for(let k=-2;k<=2;k++)for(const sd of[-1,1]){L.push(box(.7,.8,.6,k*1.25,H+.4,sd*w,C),box(.6,.8,.7,sd*w,H+.4,k*1.25,C))}
  L.push(box(w*2+.8,.4,w*2+.8,0,H-.1,0,C));for(const y of[3,6])L.push(box(.35,1,.1,-1.6,y,w+.32,'#2a2018'),box(.35,1,.1,1.6,y,-w-.32,'#2a2018'));
  return merge(L)}
function towerRoof(){const r=new THREE.ConeGeometry(3.9,3.4,4);r.rotateY(Math.PI/4);r.translate(0,8+1.9,0);return merge([col(r,'#7a3a2a'),col(new THREE.CylinderGeometry(.06,.06,1.6,4).translate(0,12,0),'#4b3624')])}
function stashGeo(){const L=[];for(let k=0;k<5;k++){const a=k/5*6.283,g=new THREE.DodecahedronGeometry(.6+(k%2)*.3,0);g.translate(Math.cos(a)*1.4,.35,Math.sin(a)*1.2);L.push(col(g,'#7d786e'))}
  L.push(box(.12,1.6,.12,-.9,.8,.9,'#5a3f22'),box(.12,1.6,.12,.9,.8,.9,'#5a3f22'),col(new THREE.CylinderGeometry(1.3,1.3,.08,8,1,false,0,Math.PI).rotateZ(Math.PI/2).rotateY(Math.PI/2).translate(0,1.6,.9),'#5d7a35'));return merge(L)}
function chestGeo(){return merge([box(1.1,.62,.72,0,.31,0,'#6e4424'),box(1.16,.09,.76,0,.18,0,'#ffffff'),box(1.16,.09,.76,0,.52,0,'#ffffff'),col(new THREE.CylinderGeometry(.36,.36,1.1,8,1,false,0,Math.PI).rotateZ(Math.PI/2).rotateX(Math.PI/2).translate(0,.62,0),'#7a4f2a'),box(.14,.18,.1,0,.62,.38,'#ffffff')])}
export function makeSiteMeshes(sites){const stone=new THREE.MeshLambertMaterial({vertexColors:true}),N=sites.length;
  const mk=(g,cap,shadow)=>{const m=new THREE.InstancedMesh(g,stone,Math.max(1,cap));m.count=0;m.frustumCulled=false;m.castShadow=shadow;m.receiveShadow=true;S.scene.add(m);return m};
  const kinds={ev:[mk(houseGeo(),N,true),mk(houseRoof(),N,true)],kule:[mk(towerGeo(),N,true),mk(towerRoof(),N,true)],gizli:[mk(stashGeo(),N,true),null]};
  // the chest: its bands, lock and glow take the weapon's level colour
  const cm=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.5,metalness:.3});  const ch=new THREE.InstancedMesh(chestGeo(),cm,N);ch.count=0;ch.frustumCulled=false;ch.castShadow=true;S.scene.add(ch);
  const glow=new THREE.InstancedMesh(new THREE.SphereGeometry(1,12,8),new THREE.MeshBasicMaterial({transparent:true,opacity:.28,depthWrite:false,blending:THREE.AdditiveBlending}),N);glow.count=0;glow.frustumCulled=false;S.scene.add(glow);
  S.sites={list:sites,kinds,ch,glow}}
const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),vp=new THREE.Vector3(),vs=new THREE.Vector3(),UP=new THREE.Vector3(0,1,0),tc=new THREE.Color();
const LVCOL=LVC.map(c=>new THREE.Color(c));
// 'inside': the site the commander stands in, whose roof is lifted off so the camera can see in
export function drawSites(cx,cz,t,inside){const T=S.sites;if(!T)return;const cnt={};for(const k in T.kinds)cnt[k]=[0,0];let c=0,g=0;
  for(const o of T.list){const d=Math.hypot(o.x-cx,o.z-cz);if(d>900)continue;const K=T.kinds[o.kind];q.setFromAxisAngle(UP,o.a);m4.compose(vp.set(o.x,o.y-.1,o.z),q,vs.set(1,1,1));
    K[0].setMatrixAt(cnt[o.kind][0]++,m4);if(K[1]&&o!==inside)K[1].setMatrixAt(cnt[o.kind][1]++,m4);
    if(o.taken||d>260)continue;const cp=o.chest,y=groundAt(cp.x,cp.z);m4.compose(vp.set(cp.x,y,cp.z),q,vs.set(1,1,1));T.ch.setMatrixAt(c,m4);T.ch.setColorAt(c++,LVCOL[o.lv-1]);
    if(o.lv>=5&&d<120){const s=.9+.25*Math.sin(t*3+o.i)+o.lv*.08;m4.compose(vp.set(cp.x,y+.6,cp.z),q.identity(),vs.set(s,s*.8,s));T.glow.setMatrixAt(g,m4);T.glow.setColorAt(g++,tc.copy(LVCOL[o.lv-1]).multiplyScalar(.8))}}
  for(const k in T.kinds){const[a,b]=T.kinds[k];a.count=cnt[k][0];a.instanceMatrix.needsUpdate=true;if(b){b.count=cnt[k][1];b.instanceMatrix.needsUpdate=true}}
  T.ch.count=c;T.ch.instanceMatrix.needsUpdate=true;if(T.ch.instanceColor)T.ch.instanceColor.needsUpdate=true;T.glow.count=g;T.glow.instanceMatrix.needsUpdate=true;if(T.glow.instanceColor)T.glow.instanceColor.needsUpdate=true}
