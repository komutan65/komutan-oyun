/* Büyük Harita — drawing the world: the far land as one light mesh, sharp ground near the player,
   lakes, trees and rocks drawn only where the player can see them, ruins, the zone wall, the airship. */
import * as THREE from 'three';
import {HALF,height,slope,groundCol,NODE,nodeAt,NC,places,smooth,fbm} from './dunya.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const S={};     // everything the game needs from the scene

export function makeScene(cv,small){
  const renderer=new THREE.WebGLRenderer({canvas:cv,antialias:!small,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,small?1.25:1.6));renderer.setSize(innerWidth,innerHeight,false);
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  const scene=new THREE.Scene(),SKY=new THREE.Color('#b9d4e6');scene.background=SKY;scene.fog=new THREE.Fog(SKY,small?260:320,small?1150:1500);
  const camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,.5,3200);
  scene.add(new THREE.HemisphereLight('#dbe9ff','#5a6b3a',1.05));
  const sun=new THREE.DirectionalLight('#fff0d6',2.4);sun.position.set(-120,180,90);sun.castShadow=true;const sz=small?1024:2048;sun.shadow.mapSize.set(sz,sz);
  const sc=sun.shadow.camera;sc.left=-60;sc.right=60;sc.top=60;sc.bottom=-60;sc.near=10;sc.far=520;sun.shadow.bias=-.0006;sun.shadow.normalBias=.4;scene.add(sun,sun.target);
  const fill=new THREE.DirectionalLight('#9fb8ff',.35);fill.position.set(120,60,-100);scene.add(fill);
  // sky dome: deep blue above, pale at the horizon
  {const g=new THREE.SphereGeometry(3000,24,12),m=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms:{},vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec3 vP;void main(){float h=normalize(vP).y;vec3 c=mix(vec3(.73,.83,.9),vec3(.33,.56,.82),smoothstep(.0,.45,h));c=mix(c,vec3(.78,.83,.8),smoothstep(.02,-.2,h));gl_FragColor=vec4(c,1.);\n#include <colorspace_fragment>\n}'});
   const sky=new THREE.Mesh(g,m);sky.renderOrder=-10;scene.add(sky);S.sky=sky}
  Object.assign(S,{renderer,scene,camera,sun,small,SKY});
  return S}

// a soft grain for the ground, tiled in world space; the vertex colours carry the real colour
function grainTex(){const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d'),id=g.createImageData(256,256);let s=7;const R=()=>(s=(s*16807)%2147483647)/2147483647;
  for(let i=0;i<256*256;i++){const v=200+R()*55;id.data[i*4]=v;id.data[i*4+1]=v;id.data[i*4+2]=v;id.data[i*4+3]=255}g.putImageData(id,0,0);
  for(let k=0;k<900;k++){g.fillStyle=`rgba(${R()<.5?255:60},${R()<.5?255:70},${40+R()*40},${.08+R()*.1})`;g.fillRect(R()*256,R()*256,1+R()*3,1+R()*3)}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t}
function groundGeo(x0,z0,size,n){const st=size/n,N=n+1,H=new Float32Array((N+2)*(N+2));
  for(let j=-1;j<=N;j++)for(let i=-1;i<=N;i++)H[(i+1)+(j+1)*(N+2)]=height(x0+i*st,z0+j*st);
  const P=new Float32Array(N*N*3),C=new Float32Array(N*N*3),UV=new Float32Array(N*N*2),idx=[];
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){const k=i+j*N,h=H[(i+1)+(j+1)*(N+2)],x=x0+i*st,z=z0+j*st,sl=Math.hypot(H[(i+2)+(j+1)*(N+2)]-H[i+(j+1)*(N+2)],H[(i+1)+(j+2)*(N+2)]-H[(i+1)+j*(N+2)])/(2*st);
    P[k*3]=x;P[k*3+1]=h;P[k*3+2]=z;const c=groundCol(x,z,h,sl);C[k*3]=c[0];C[k*3+1]=c[1];C[k*3+2]=c[2];UV[k*2]=x/7;UV[k*2+1]=z/7}
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){const a=i+j*N;idx.push(a,a+N,a+1,a+1,a+N,a+N+1)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(P,3));g.setAttribute('color',new THREE.BufferAttribute(C,3));g.setAttribute('uv',new THREE.BufferAttribute(UV,2));g.setIndex(idx);g.computeVertexNormals();g.computeBoundingSphere();return g}

const CHUNK=120,CN=HALF*2/CHUNK,NEAR=2;
export function makeGround(){const {scene,small}=S,tex=grainTex();
  const mat=new THREE.MeshLambertMaterial({vertexColors:true,map:tex});
  // the whole land at low detail, always there: far mountains on the horizon. Near the player it steps aside for the sharp chunks
  const far=new THREE.MeshLambertMaterial({vertexColors:true,map:tex});const U={c:{value:new THREE.Vector2()},r:{value:0}};
  far.onBeforeCompile=sh=>{sh.uniforms.uC=U.c;sh.uniforms.uR=U.r;sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vW;').replace('#include <begin_vertex>','#include <begin_vertex>\nvW=(modelMatrix*vec4(position,1.)).xz;');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vW;uniform vec2 uC;uniform float uR;').replace('void main() {','void main() {\nif(max(abs(vW.x-uC.x),abs(vW.y-uC.y))<uR)discard;')};
  const fm=new THREE.Mesh(groundGeo(-HALF-60,-HALF-60,HALF*2+120,small?150:190),far);fm.receiveShadow=false;scene.add(fm);
  S.ground={mat,U,chunks:new Map(),queue:[],cx:null,cz:null};
  // lakes
  const wg=new THREE.PlaneGeometry(HALF*2+600,HALF*2+600,1,1).rotateX(-Math.PI/2);
  const nc=document.createElement('canvas');nc.width=nc.height=128;{const g=nc.getContext('2d'),id=g.createImageData(128,128);for(let j=0;j<128;j++)for(let i=0;i<128;i++){const a=Math.sin(i/128*6.283*3+Math.sin(j/128*6.283*2)*1.3),b=Math.sin(j/128*6.283*4+Math.sin(i/128*6.283*3)*1.1),k=(j*128+i)*4;id.data[k]=128+a*38;id.data[k+1]=128+b*38;id.data[k+2]=255;id.data[k+3]=255}g.putImageData(id,0,0)}
  const nt=new THREE.CanvasTexture(nc);nt.wrapS=nt.wrapT=THREE.RepeatWrapping;nt.repeat.set(160,160);
  const wm=new THREE.MeshStandardMaterial({color:'#2f6f93',roughness:.2,metalness:.1,transparent:true,opacity:.86,normalMap:nt,normalScale:new THREE.Vector2(.35,.35)});S.waterN=nt;const w=new THREE.Mesh(wg,wm);w.position.y=0;w.renderOrder=1;scene.add(w);S.water=w}
// keep the 5x5 chunks round the player sharp; build at most one new chunk a frame so nothing stutters
export function updateGround(px,pz){const G=S.ground,cx=Math.floor((px+HALF)/CHUNK),cz=Math.floor((pz+HALF)/CHUNK);
  if(cx!==G.cx||cz!==G.cz){G.cx=cx;G.cz=cz;const want=new Set();
    for(let j=cz-NEAR;j<=cz+NEAR;j++)for(let i=cx-NEAR;i<=cx+NEAR;i++){if(i<0||j<0||i>=CN||j>=CN)continue;const k=i+j*CN;want.add(k);if(!G.chunks.has(k)&&!G.queue.includes(k))G.queue.push(k)}
    for(const[k,m]of G.chunks)if(!want.has(k)){S.scene.remove(m);m.geometry.dispose();G.chunks.delete(k)}
    G.queue=G.queue.filter(k=>want.has(k)).sort((a,b)=>Math.hypot(a%CN-cx,(a/CN|0)-cz)-Math.hypot(b%CN-cx,(b/CN|0)-cz))}
  let built=0;while(G.queue.length&&built<(G.chunks.size<9?9:1)){const k=G.queue.shift(),i=k%CN,j=k/CN|0;const m=new THREE.Mesh(groundGeo(-HALF+i*CHUNK,-HALF+j*CHUNK,CHUNK,S.small?32:40),G.mat);m.receiveShadow=true;S.scene.add(m);G.chunks.set(k,m);built++}
  // the far mesh hides exactly the square the sharp chunks cover (only when they are all there)
  let all=true;for(let j=cz-NEAR;j<=cz+NEAR&&all;j++)for(let i=cx-NEAR;i<=cx+NEAR;i++){if(i<0||j<0||i>=CN||j>=CN)continue;if(!G.chunks.has(i+j*CN)){all=false;break}}
  if(all){G.U.c.value.set(-HALF+(cx+.5)*CHUNK,-HALF+(cz+.5)*CHUNK);G.U.r.value=(NEAR+.5)*CHUNK-3}else G.U.r.value=0}

// ---------- trees, rocks, ore, bushes ----------
function col(g,c){const n=g.attributes.position.count,a=new Float32Array(n*3),C=new THREE.Color(c);for(let i=0;i<n;i++){a[i*3]=C.r;a[i*3+1]=C.g;a[i*3+2]=C.b}g.setAttribute('color',new THREE.BufferAttribute(a,3));return g}
export function merge(list){const gs=list.map(g=>g.index?g.toNonIndexed():g);let n=0;for(const g of gs)n+=g.attributes.position.count;const P=new Float32Array(n*3),C=new Float32Array(n*3);let o=0;
  for(const g of gs){P.set(g.attributes.position.array,o*3);if(g.attributes.color)C.set(g.attributes.color.array,o*3);else C.fill(1,o*3,(o+g.attributes.position.count)*3);o+=g.attributes.position.count}
  const m=new THREE.BufferGeometry();m.setAttribute('position',new THREE.BufferAttribute(P,3));m.setAttribute('color',new THREE.BufferAttribute(C,3));m.computeVertexNormals();m.computeBoundingSphere();return m}
function jitter(g,amt,seed){let s=seed;const R=()=>(s=(s*16807)%2147483647)/2147483647;const p=g.attributes.position,map=new Map();for(let i=0;i<p.count;i++){const k=p.getX(i).toFixed(3)+','+p.getY(i).toFixed(3)+','+p.getZ(i).toFixed(3);if(!map.has(k))map.set(k,[1+(R()-.5)*amt,1+(R()-.5)*amt*.7,1+(R()-.5)*amt]);const f=map.get(k);p.setXYZ(i,p.getX(i)*f[0],p.getY(i)*f[1],p.getZ(i)*f[2])}return g}
function rockGeo(seed,c1,c2,bits){const r=jitter(new THREE.DodecahedronGeometry(1.25,0),.55,seed);r.translate(0,.55,0);r.scale(1.25,.85,1.1);col(r,c1);
  const out=[r];let s=seed*7;const R=()=>(s=(s*16807)%2147483647)/2147483647;for(let k=0;k<(bits||0);k++){const o=new THREE.OctahedronGeometry(.28+R()*.18,0);const a=R()*6.28,h=.4+R()*.7;o.translate(Math.cos(a)*1.05,h,Math.sin(a)*.95);out.push(col(o,c2))}
  return merge(out)}
export function nodeGeos(){
  const pine=merge([col(new THREE.CylinderGeometry(.16,.26,1.8,6).translate(0,.9,0),'#5a3d26'),col(new THREE.ConeGeometry(1.5,2.4,7).translate(0,2.4,0),'#2f5a2c'),col(new THREE.ConeGeometry(1.15,2.1,7).translate(0,3.5,0),'#356432'),col(new THREE.ConeGeometry(.75,1.7,7).translate(0,4.5,0),'#3d6e37')]);
  const oak=merge([col(new THREE.CylinderGeometry(.24,.36,2.4,7).translate(0,1.2,0),'#5f4129'),col(jitter(new THREE.IcosahedronGeometry(1.7,1),.25,3).translate(0,3.4,0),'#4f8a35'),col(jitter(new THREE.IcosahedronGeometry(1.2,1),.3,5).translate(1.1,2.9,.5),'#5a9638'),col(jitter(new THREE.IcosahedronGeometry(1.25,1),.3,9).translate(-1,3,-.5),'#47802f')]);
  const rock=rockGeo(11,'#8d8b84','#8d8b84',0),iron=rockGeo(13,'#6d6a66','#9a5a32',7),gold=rockGeo(17,'#77736b','#f2c33a',6);
  const bush=merge([col(jitter(new THREE.IcosahedronGeometry(.85,1),.3,21).translate(0,.6,0).scale(1.2,.8,1.2),'#3f7a2e'),...[0,1,2,3,4,5,6].map(k=>col(new THREE.IcosahedronGeometry(.11,0).translate(Math.cos(k*.9)*.85,.55+(k%3)*.18,Math.sin(k*.9)*.85),'#c92846'))]);
  const stump=merge([col(new THREE.CylinderGeometry(.3,.38,.5,7).translate(0,.25,0),'#6b4a2e'),col(new THREE.CylinderGeometry(.29,.29,.02,7).translate(0,.51,0),'#c9a36b')]);
  const cone=merge([col(new THREE.ConeGeometry(1.4,4.6,5).translate(0,2.9,0),'#2d5229'),col(new THREE.CylinderGeometry(.2,.2,.8,4).translate(0,.4,0),'#4a3322')]);
  const blob=merge([col(new THREE.IcosahedronGeometry(1.9,0).translate(0,3.2,0),'#4a8133'),col(new THREE.CylinderGeometry(.25,.3,2.2,4).translate(0,1.1,0),'#4a3322')]);
  return[pine,oak,rock,iron,gold,bush,stump,cone,blob]}
const VIS_R=300,FAR_R=640,BK=40,BN=HALF*2/BK;
export function makeNodes(){const geos=nodeGeos(),mat=new THREE.MeshLambertMaterial({vertexColors:true}),caps=S.small?[1600,2600,700,400,80,400,500,3500,4500]:[2400,3800,900,500,100,500,700,5000,6500];
  const IM=geos.map((g,i)=>{const m=new THREE.InstancedMesh(g,mat,caps[i]);m.count=0;m.frustumCulled=false;m.castShadow=false;m.receiveShadow=i>=2&&i<6;S.scene.add(m);return m});
  // the few close to the player cast shadows; the hundreds further off do not, which saves drawing them all twice
  for(let i=0;i<6;i++){const m=new THREE.InstancedMesh(geos[i],mat,S.small?160:260);m.count=0;m.frustumCulled=false;m.castShadow=true;m.receiveShadow=i>=2;S.scene.add(m);IM.push(m)}
  // every node in the world, made once; bucketed for quick lookups near any point
  const list=[],B=Array.from({length:BN*BN},()=>[]);
  for(let i=0;i<NC;i++)for(let j=0;j<NC;j++){const n=nodeAt(i,j);if(!n)continue;n.i=list.length;list.push(n);B[clamp(Math.floor((n.x+HALF)/BK),0,BN-1)+clamp(Math.floor((n.z+HALF)/BK),0,BN-1)*BN].push(n)}
  S.nodes={list,B,IM,byId:new Map(list.map(n=>[n.id,n])),lx:1e9,lz:1e9,dirty:true}}
export function nodesNear(x,z,r,f){const N=S.nodes,b0=Math.floor((x-r+HALF)/BK),b1=Math.floor((x+r+HALF)/BK),c0=Math.floor((z-r+HALF)/BK),c1=Math.floor((z+r+HALF)/BK);
  for(let j=Math.max(0,c0);j<=Math.min(BN-1,c1);j++)for(let i=Math.max(0,b0);i<=Math.min(BN-1,b1);i++)for(const n of N.B[i+j*BN])f(n)}
const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),vp=new THREE.Vector3(),vs=new THREE.Vector3(),UP=new THREE.Vector3(0,1,0),tc=new THREE.Color();
export function updateNodes(px,pz){const N=S.nodes;if(!N.dirty&&Math.hypot(px-N.lx,pz-N.lz)<28)return;N.dirty=false;N.lx=px;N.lz=pz;
  const IM=N.IM,cnt=new Array(IM.length).fill(0);
  const put=(k,x,y,z,s,a,sh)=>{const m=IM[k];if(cnt[k]>=m.instanceMatrix.count)return;q.setFromAxisAngle(UP,a);m4.compose(vp.set(x,y,z),q,vs.set(s,s*(sh||1),s));m.setMatrixAt(cnt[k],m4);tc.setScalar(.86+((a*7.3)%1)*.28);m.setColorAt(cnt[k],tc);cnt[k]++};
  nodesNear(px,pz,FAR_R,n=>{const d=Math.hypot(n.x-px,n.z-pz);if(d>FAR_R)return;const tree=n.t<2;
    if(d>VIS_R){if(tree&&n.hp>0)put(n.t===0?7:8,n.x,n.y-.3,n.z,n.s*1.25,n.a);return}
    if(n.hp>0)put(d<75&&cnt[n.t+9]<IM[n.t+9].instanceMatrix.count?n.t+9:n.t,n.x,n.y-.15,n.z,n.t<2?n.s*1.3:n.t===5?n.s:n.s*(n.t===2?1:1.1),n.a,n.t<2?1+(n.s-.8)*.6:1);else if(tree)put(6,n.x,n.y-.05,n.z,n.s*1.2,n.a)});
  IM.forEach((m,k)=>{m.count=cnt[k];m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true})}

// ---------- the named places: broken walls, a fallen tower, chests ----------
// stone walls laid in courses of blocks, the top course broken off unevenly
const C3=new THREE.Color();
function block(parts,w,h,d,u,v,ang,x,y,z,c,R){const g=new THREE.BoxGeometry(w-.06,h-.05,d);g.translate(u,v+h/2,(R()-.5)*.08);g.rotateY(ang);g.translate(x,y,z);C3.set(c).multiplyScalar(.85+R()*.3);const n=g.attributes.position.count,a=new Float32Array(n*3);for(let i=0;i<n;i++){a[i*3]=C3.r;a[i*3+1]=C3.g;a[i*3+2]=C3.b}g.setAttribute('color',new THREE.BufferAttribute(a,3));parts.push(g)}
function masonry(parts,x,z,ang,len,h,R,C){const y=height(x,z)-.35,rows=Math.max(1,Math.round(h/.62)),ph=R()*6;
  for(let r=0;r<rows;r++){let u=-len/2+(r%2?.4:0);const v=r*.62;
    while(u<len/2-.2){const bl=Math.min(len/2-u,1.05+R()*.6);const top=h*(.45+.55*Math.abs(Math.sin((u/len)*3+ph)))+.3;if(v<top)block(parts,bl,.62,1.05,u+bl/2,v,ang,x,y,z,C[(r+(u*3|0))%4],R);u+=bl}}}
function tower(parts,x,z,th,R,C){const y=height(x,z)-.4,rows=Math.round(th/.62),n=14,rad=3.1,ph=R()*6;
  for(let r=0;r<rows;r++)for(let k=0;k<n;k++){const a=(k+(r%2)*.5)/n*6.283,top=th*(.55+.45*Math.abs(Math.sin(a*1.5+ph)));if(r*.62>top)continue;
    const g=new THREE.BoxGeometry(1.42,.57,.9);g.translate(0,r*.62+.28,rad);g.rotateY(a);g.translate(x,y,z);C3.set(C[(r+k)%4]).multiplyScalar(.85+R()*.3);const m=g.attributes.position.count,aa=new Float32Array(m*3);for(let i=0;i<m;i++){aa[i*3]=C3.r;aa[i*3+1]=C3.g;aa[i*3+2]=C3.b}g.setAttribute('color',new THREE.BufferAttribute(aa,3));parts.push(g)}
  const f=new THREE.CylinderGeometry(rad-.3,rad-.3,.3,14);f.translate(x,y+.15,z);parts.push(col(f,'#6d685f'))}
export function makePlaces(){const P=places(),stone=[],cols=[];let s=91;const R=()=>(s=(s*16807)%2147483647)/2147483647;const chests=[];
  const wallC=['#8e897e','#9a948a','#7f7a70','#a29c90'];
  for(const p of P){const parts=[];const y=height(p.x,p.z);
    const n=7+(R()*4|0),rad=13+R()*5;
    for(let k=0;k<n;k++){if(R()<.22)continue;const a=k/n*6.283+R()*.2,len=rad*6.283/n*.85,h=1.2+R()*3.2,x=p.x+Math.cos(a)*rad,z=p.z+Math.sin(a)*rad;
      masonry(parts,x,z,-a+Math.PI/2,len,h,R,wallC);cols.push({x,z,r:len*.5,wall:{a:-a+Math.PI/2,len,cx:x,cz:z}})
      for(let b=0;b<3;b++){if(R()<.5)continue;const bx=x+(R()-.5)*4+Math.cos(a)*2.2,bz=z+(R()-.5)*4+Math.sin(a)*2.2,bb=new THREE.BoxGeometry(.6+R(),.5+R()*.5,.6+R());bb.rotateY(R()*3);bb.translate(bx,height(bx,bz)+.2,bz);parts.push(col(bb,wallC[b]))}}
    // a stump of a round tower and its fallen top
    {const a=R()*6.28,tx=p.x+Math.cos(a)*(rad*.45),tz=p.z+Math.sin(a)*(rad*.45),th=5+R()*5;tower(parts,tx,tz,th,R,wallC);cols.push({x:tx,z:tz,r:3.6});
      const ft=new THREE.CylinderGeometry(2.6,2.9,4,10);ft.rotateZ(Math.PI/2);ft.rotateY(a+1);const fx=tx+Math.cos(a+1.2)*7,fz=tz+Math.sin(a+1.2)*7;ft.translate(fx,height(fx,fz)+1.6,fz);parts.push(col(ft,'#8f897d'));cols.push({x:fx,z:fz,r:2.8})}
    // a banner pole in the middle
    {const b=new THREE.CylinderGeometry(.09,.11,7,6);b.translate(p.x,y+3.5,p.z);parts.push(col(b,'#4b3624'));const f=new THREE.BoxGeometry(.06,1.4,2.2);f.translate(p.x,y+6,p.z+1.15);parts.push(col(f,'#a8323a'))}
    const m=new THREE.Mesh(merge(parts),new THREE.MeshLambertMaterial({vertexColors:true}));m.castShadow=m.receiveShadow=true;S.scene.add(m);
    for(let k=0;k<3;k++){const a=R()*6.28,r=R()*rad*.7,x=p.x+Math.cos(a)*r,z=p.z+Math.sin(a)*r;chests.push({id:p.k*10+k,x,z,y:height(x,z),a:R()*6.28,open:false,p:p.k})}}
  // chests: a body and a lid; an opened chest shows its lid thrown back
  const body=merge([col(new THREE.BoxGeometry(1.3,.75,.85).translate(0,.375,0),'#7a4f2a'),col(new THREE.BoxGeometry(1.36,.1,.9).translate(0,.2,0),'#c9a640'),col(new THREE.BoxGeometry(1.36,.1,.9).translate(0,.6,0),'#c9a640')]);
  const lid=merge([col(new THREE.CylinderGeometry(.43,.43,1.3,8,1,false,0,Math.PI).rotateZ(Math.PI/2).rotateX(Math.PI/2).translate(0,0,0),'#86592f'),col(new THREE.BoxGeometry(.14,.2,.2).translate(0,.1,.42),'#d9b24a')]);
  const mat=new THREE.MeshLambertMaterial({vertexColors:true});const CB=new THREE.InstancedMesh(body,mat,chests.length),CL=new THREE.InstancedMesh(lid,mat,chests.length);CB.castShadow=CL.castShadow=true;S.scene.add(CB,CL);
  S.places={list:P,cols,chests,CB,CL};drawChests()}
export function drawChests(){const {chests,CB,CL}=S.places;chests.forEach((c,i)=>{q.setFromAxisAngle(UP,c.a);m4.compose(vp.set(c.x,c.y,c.z),q,vs.set(.75,.75,.75));CB.setMatrixAt(i,m4);
  const lq=new THREE.Quaternion().setFromEuler(new THREE.Euler(c.open?-2.1:0,0,0));const lm=new THREE.Matrix4().compose(new THREE.Vector3(0,.75,-.42*(c.open?1:0)+0),lq,new THREE.Vector3(1,1,1));const w=new THREE.Matrix4().compose(vp.set(c.x,c.y,c.z),q,new THREE.Vector3(.75,.75,.75)).multiply(lm);CL.setMatrixAt(i,w)});CB.instanceMatrix.needsUpdate=CL.instanceMatrix.needsUpdate=true}

// ---------- the zone: a tall shimmering wall where the safe circle ends ----------
export function makeZone(){const g=new THREE.CylinderGeometry(1,1,1,128,1,true);g.translate(0,.5,0);
  const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,fog:false,uniforms:{t:{value:0}},
    vertexShader:'varying vec2 vU;varying float vY;void main(){vU=uv;vY=position.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform float t;varying vec2 vU;varying float vY;void main(){float s=.5+.5*sin(vU.x*900.+t*1.6+vY*14.);float a=(.18+.14*s)*(1.-smoothstep(.55,1.,vY))+.25*smoothstep(.06,0.,vY);gl_FragColor=vec4(.62,.22,.78,a);}'});
  const z=new THREE.Mesh(g,m);z.renderOrder=5;z.frustumCulled=false;S.scene.add(z);S.zone=z}

// ---------- the airship that carries everyone over the land ----------
export function makeShip(){const g=new THREE.Group();
  const env=new THREE.SphereGeometry(1,24,14);env.scale(7,7,26);const ec=new Float32Array(env.attributes.position.count*3);for(let i=0;i<env.attributes.position.count;i++){const z=env.attributes.position.getZ(i),st=Math.floor((Math.atan2(env.attributes.position.getY(i),env.attributes.position.getX(i))+3.2)/0.52)%2;const c=st?[.82,.2,.2]:[.95,.9,.8];ec.set(c,i*3)}env.setAttribute('color',new THREE.BufferAttribute(ec,3));
  const M=new THREE.MeshLambertMaterial({vertexColors:true});g.add(new THREE.Mesh(env,M));
  const gon=new THREE.Mesh(col(new THREE.BoxGeometry(4,2.4,11),'#6b4a2e'),M);gon.position.y=-8.4;g.add(gon);
  for(const s of[-1,1]){const f=new THREE.Mesh(col(new THREE.BoxGeometry(.4,7,6),'#a83232'),M);f.position.set(0,0,-22);f.rotation.z=s>0?0:Math.PI/2;g.add(f)}
  for(const s of[-1,1]){const r=new THREE.Mesh(col(new THREE.CylinderGeometry(.12,.12,7.4,4),'#4a3a2a'),M);r.position.set(s*1.9,-4.6,0);r.rotation.x=.2;g.add(r)}
  const props=[];for(const s of[-1,1]){const p=new THREE.Mesh(col(new THREE.BoxGeometry(.25,5,.4),'#3a2a1a'),M);p.position.set(s*3.4,-8,-5);g.add(p);props.push(p)}
  g.scale.setScalar(1.6);S.scene.add(g);S.ship={g,props}}

// ---------- parachutes, bolts, chips of wood and stone ----------
export function makeFx(){const M=new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide});
  const can=new THREE.SphereGeometry(1,12,6,0,Math.PI*2,0,Math.PI/2.2);can.scale(3.2,1.7,3.2);col(can,'#ffffff');
  const lines=new THREE.CylinderGeometry(.02,.02,3.2,3);
  const chute=[];for(let i=0;i<22;i++){const g=new THREE.Group();const c=new THREE.Mesh(can,new THREE.MeshLambertMaterial({color:'#fff',side:THREE.DoubleSide}));c.position.y=4.6;g.add(c);for(const[a,b]of[[1,1],[1,-1],[-1,1],[-1,-1]]){const l=new THREE.Mesh(lines,M);l.position.set(a*1.4,3,b*1.4);l.rotation.set(b*.42,0,-a*.42);g.add(l)}g.visible=false;S.scene.add(g);chute.push(g)}
  const bolt=new THREE.InstancedMesh(merge([col(new THREE.CylinderGeometry(.03,.03,1,4).rotateX(Math.PI/2),'#6b4a2e'),col(new THREE.ConeGeometry(.07,.2,4).rotateX(Math.PI/2).translate(0,0,.55),'#cfd3d6')]),new THREE.MeshLambertMaterial({vertexColors:true}),48);bolt.count=0;bolt.frustumCulled=false;S.scene.add(bolt);
  const chip=new THREE.InstancedMesh(new THREE.BoxGeometry(.16,.16,.16),new THREE.MeshLambertMaterial({color:'#fff'}),300);chip.count=0;chip.frustumCulled=false;chip.setColorAt(0,new THREE.Color('#fff'));S.scene.add(chip);
  const bag=new THREE.InstancedMesh(merge([col(new THREE.SphereGeometry(.55,8,6).scale(1,.8,1).translate(0,.45,0),'#8a6a3e'),col(new THREE.CylinderGeometry(.18,.3,.3,6).translate(0,.95,0),'#6b5130')]),new THREE.MeshLambertMaterial({vertexColors:true}),40);bag.count=0;bag.frustumCulled=false;bag.castShadow=true;S.scene.add(bag);
  const wall=new THREE.InstancedMesh(merge([...[-1.6,-.8,0,.8,1.6].map((x,k)=>col(new THREE.CylinderGeometry(.22,.26,2.4+(k%2)*.3,6).translate(x,1.2,0),'#7a5634')),...[-1.6,-.8,0,.8,1.6].map((x,k)=>col(new THREE.ConeGeometry(.22,.5,6).translate(x,2.65+(k%2)*.3,0),'#9a7650')),col(new THREE.BoxGeometry(4,.18,.12).translate(0,1.6,.24),'#5f432a')]),new THREE.MeshLambertMaterial({vertexColors:true}),60);wall.count=0;wall.frustumCulled=false;wall.castShadow=true;S.scene.add(wall);
  // a ring under the target the player is facing
  const ring=new THREE.Mesh(new THREE.RingGeometry(.9,1.1,32).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:'#ffe08a',transparent:true,opacity:.7,depthWrite:false}));ring.visible=false;S.scene.add(ring);
  S.fx={chute,bolt,chip,chips:[],bag,wall,ring}}
export function chips(x,y,z,c,n,sp=3){const L=S.fx.chips;for(let i=0;i<n;i++){if(L.length>=300)L.shift();L.push({x,y,z,vx:(Math.random()-.5)*sp,vy:2+Math.random()*sp,vz:(Math.random()-.5)*sp,t:0,c:new THREE.Color(c)})}}
export function drawChips(dt){const F=S.fx,L=F.chips;let k=0;for(let i=L.length-1;i>=0;i--){const p=L[i];p.t+=dt;if(p.t>1.1){L.splice(i,1);continue}p.vy-=14*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;const g=height(p.x,p.z);if(p.y<g){p.y=g;p.vy*=-.3;p.vx*=.6;p.vz*=.6}}
  for(const p of L){m4.compose(vp.set(p.x,p.y,p.z),q.setFromAxisAngle(UP,p.t*7),vs.setScalar(1-p.t*.6));F.chip.setMatrixAt(k,m4);F.chip.setColorAt(k,p.c);k++}F.chip.count=k;F.chip.instanceMatrix.needsUpdate=true;if(F.chip.instanceColor)F.chip.instanceColor.needsUpdate=true}

// the map image (minimap and big map), drawn once from the same land
export function mapImage(n){const c=document.createElement('canvas');c.width=c.height=n;const g=c.getContext('2d'),id=g.createImageData(n,n);
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){const x=-HALF+(i+.5)*HALF*2/n,z=-HALF+(j+.5)*HALF*2/n,h=height(x,z),sl=slope(x,z);let c3=groundCol(x,z,h,sl);if(h<0)c3=[.25,.5,.68];
    const sh=clamp(1+(height(x-4,z-4)-h)*.06,.6,1.3),k=(j*n+i)*4;id.data[k]=Math.min(255,c3[0]*255*sh);id.data[k+1]=Math.min(255,c3[1]*255*sh);id.data[k+2]=Math.min(255,c3[2]*255*sh);id.data[k+3]=255}
  g.putImageData(id,0,0);return c}

// ---------- grass tufts, flowers and pebbles round the player ----------
export function makeClutter(){const blades=[],cl=[];for(let b=0;b<5;b++){const a=b/5*Math.PI,h=.38+(b%3)*.12,w=.16,c=Math.cos(a)*w,sn=Math.sin(a)*w,l=Math.cos(a+1)*.08,lz=Math.sin(a+1)*.08;
    blades.push(-c,0,-sn, c,0,sn, l,h,lz, c,0,sn, -c,0,-sn, l,h,lz);for(let k=0;k<2;k++)cl.push(.5,.6,.32, .5,.6,.32, .88,.98,.6)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(blades,3));g.setAttribute('color',new THREE.Float32BufferAttribute(cl,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(new Array(blades.length/3).fill(0).flatMap(()=>[0,1,0]),3));
  const gm=new THREE.MeshLambertMaterial({vertexColors:true});
  const fl=merge([col(new THREE.CylinderGeometry(.015,.015,.35,3).translate(0,.17,0),'#4f7a2c'),col(new THREE.IcosahedronGeometry(.08,0).translate(0,.37,0),'#ffffff')]);
  const pb=jitter(new THREE.DodecahedronGeometry(.22,0),.5,77);col(pb,'#8a877f');
  const N=S.small?2600:4200,G=new THREE.InstancedMesh(g,gm,N),F=new THREE.InstancedMesh(fl,new THREE.MeshLambertMaterial({vertexColors:true}),N/5|0),PB=new THREE.InstancedMesh(pb,new THREE.MeshLambertMaterial({vertexColors:true}),N/8|0);
  for(const m of[G,F,PB]){m.count=0;m.frustumCulled=false;m.receiveShadow=true;S.scene.add(m)}PB.castShadow=true;S.clutter={G,F,PB,lx:1e9,lz:1e9}}
const FLC=['#f4e04d','#ffffff','#e05a8a','#9b7be0','#f08a3a'].map(c=>new THREE.Color(c));
export function updateClutter(px,pz){const C=S.clutter;if(!C||Math.hypot(px-C.lx,pz-C.lz)<10)return;C.lx=px;C.lz=pz;const r=S.small?40:55,st=2.1;let g=0,f=0,b=0;const GN=C.G.instanceMatrix.count,FN=C.F.instanceMatrix.count,BN2=C.PB.instanceMatrix.count;
  const i0=Math.floor((px-r)/st),i1=Math.floor((px+r)/st),j0=Math.floor((pz-r)/st),j1=Math.floor((pz+r)/st);
  for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){let h=Math.imul(i,73856093)^Math.imul(j,19349663);h=Math.imul(h^(h>>>13),1274126177);const u=((h>>>0)%1000)/1000,v=(((h>>>10)>>>0)%1000)/1000,w=(((h>>>20)>>>0)%1000)/1000;
    const x=i*st+u*st,z=j*st+v*st;if((x-px)**2+(z-pz)**2>r*r)continue;const y=height(x,z);if(y<1||y>95)continue;
    if(w<.7&&g<GN){q.setFromAxisAngle(UP,u*6.28);m4.compose(vp.set(x,y-.03,z),q,vs.setScalar(.8+v*.9));C.G.setMatrixAt(g,m4);const gc=groundCol(x,z,y,0);tc.setRGB(gc[0]*.95,gc[1]*1.12,gc[2]*.85);C.G.setColorAt(g++,tc)}
    else if(w<.76&&f<FN){q.setFromAxisAngle(UP,v*6.28);m4.compose(vp.set(x,y,z),q,vs.setScalar(.8+u*.6));C.F.setMatrixAt(f,m4);C.F.setColorAt(f++,FLC[(h>>>5)%5])}
    else if(w>.985&&b<BN2){q.setFromAxisAngle(UP,u*6.28);m4.compose(vp.set(x,y-.06,z),q,vs.setScalar(.6+v*1.4));C.PB.setMatrixAt(b++,m4)}}
  vs.set(1,1,1);C.G.count=g;C.F.count=f;C.PB.count=b;for(const m of[C.G,C.F,C.PB]){m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true}}
