/* Büyük Harita — field cannons: the gun on its carriage, the balls in flight, and what they leave behind:
   scorched craters and fires that burn for a while. Drawing only; the rules live in oyun.js. */
import * as THREE from 'three';
import {S,groundAt,merge,col} from './sahne.js';
const CAP=48;
let T=null;
const m4=new THREE.Matrix4(),m5=new THREE.Matrix4(),q=new THREE.Quaternion(),q2=new THREE.Quaternion(),vp=new THREE.Vector3(),vs=new THREE.Vector3(),UP=new THREE.Vector3(0,1,0),XA=new THREE.Vector3(1,0,0),ZA=new THREE.Vector3(0,0,1),tc=new THREE.Color();
function scorchTex(){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');const gr=g.createRadialGradient(64,64,4,64,64,62);
  gr.addColorStop(0,'rgba(18,14,10,.95)');gr.addColorStop(.35,'rgba(34,26,18,.9)');gr.addColorStop(.62,'rgba(70,52,34,.6)');gr.addColorStop(.85,'rgba(90,70,45,.25)');gr.addColorStop(1,'rgba(90,70,45,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);
  for(let i=0;i<90;i++){const a=Math.random()*6.283,r=20+Math.random()*40;g.fillStyle=`rgba(${40+Math.random()*40|0},${30+Math.random()*30|0},20,${.3+Math.random()*.4})`;g.beginPath();g.arc(64+Math.cos(a)*r,64+Math.sin(a)*r,1+Math.random()*3.5,0,6.283);g.fill()}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
export function makeCannons(){
  const W='#6b4a2e',D='#3e2a1a',IRON='#3b3d40',BR='#a8783a';
  // carriage: two cheeks, an axle, the trail behind; the barrel on top
  const body=merge([col(new THREE.BoxGeometry(.16,.55,2.1).translate(-.42,.55,-.15),W),col(new THREE.BoxGeometry(.16,.55,2.1).translate(.42,.55,-.15),W),col(new THREE.BoxGeometry(1,.2,.5).translate(0,.45,.2),D),
    col(new THREE.BoxGeometry(.5,.16,2.1).rotateX(-.22).translate(0,.3,-1.6),W),col(new THREE.CylinderGeometry(.09,.09,1.5,8).rotateZ(Math.PI/2).translate(0,.58,.15),IRON),
    col(new THREE.CylinderGeometry(.2,.27,2.3,14).rotateX(Math.PI/2).rotateX(-.08).translate(0,.92,.45),BR),col(new THREE.CylinderGeometry(.3,.3,.18,14).rotateX(Math.PI/2).translate(0,.95,-.62),BR),
    col(new THREE.CylinderGeometry(.25,.25,.16,14).rotateX(Math.PI/2).translate(0,.85,1.55),BR),col(new THREE.SphereGeometry(.18,8,6).translate(0,.95,-.78),BR),col(new THREE.CylinderGeometry(.07,.07,.9,6).rotateZ(Math.PI/2).translate(0,.95,.2),IRON)]);
  const wheel=merge([col(new THREE.TorusGeometry(.6,.06,6,18).rotateY(Math.PI/2),IRON),col(new THREE.CylinderGeometry(.14,.14,.2,8).rotateZ(Math.PI/2),D),
    ...[0,1,2,3,4,5].map(k=>col(new THREE.BoxGeometry(.05,1.14,.06).rotateX(k*Math.PI/6),W))]);
  const shaft=col(new THREE.BoxGeometry(.12,.12,1).translate(0,0,.5),W);
  const mat=new THREE.MeshLambertMaterial({vertexColors:true}),mk=(g,n,m=mat,sh=true)=>{const x=new THREE.InstancedMesh(g,m,n);x.count=0;x.frustumCulled=false;x.castShadow=sh;x.receiveShadow=true;S.scene.add(x);return x};
  const ball=mk(new THREE.SphereGeometry(.22,8,6),40,new THREE.MeshStandardMaterial({color:'#222',roughness:.4,metalness:.6}));
  const crater=mk(new THREE.CircleGeometry(1,20).rotateX(-Math.PI/2),90,new THREE.MeshLambertMaterial({map:scorchTex(),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),false);crater.receiveShadow=true;crater.renderOrder=2;
  const flame=mk(new THREE.IcosahedronGeometry(1,1),320,new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.85,depthWrite:false,blending:THREE.AdditiveBlending}),false);flame.setColorAt(0,tc.set('#fff'));
  const smoke=mk(new THREE.IcosahedronGeometry(1,2),260,new THREE.MeshLambertMaterial({color:'#ffffff',transparent:true,opacity:.26,depthWrite:false}),false);smoke.setColorAt(0,tc.set('#fff'));
  T={body:mk(body,CAP),wheel:mk(wheel,CAP*2),shaft:mk(shaft,CAP),ball,crater,flame,smoke,shells:[],craters:[],fires:[],parts:[]}}
// a ball in flight from (x0,y0,z0) to (x1,z1), arriving after dur seconds; on landing hit(x,z) is called
export function shellAdd(x0,y0,z0,x1,z1,dur,hit){if(!T)return;T.shells.push({x0,y0,z0,x1,z1,y1:groundAt(x1,z1),t:0,dur,hit});puff(x0,y0,z0,10,2.2,'#e8e2d6',.9);burst(x0,y0,z0,6,.9)}
export function craterAdd(x,z,r){if(!T)return;if(T.craters.length>=90)T.craters.shift();const d=1.2,nx=groundAt(x-d,z)-groundAt(x+d,z),nz=groundAt(x,z-d)-groundAt(x,z+d);T.craters.push({x,z,y:groundAt(x,z),r,a:Math.random()*6.283,nx:nx/(2*d),nz:nz/(2*d)})}
// a fire burning on the ground for 'life' seconds
export function fireAdd(x,z,life,r=1.6){if(!T)return;if(T.fires.length>=24)T.fires.shift();T.fires.push({x,z,y:groundAt(x,z),t:0,life,r})}
export const fires=()=>T?T.fires:[];
function puff(x,y,z,n,sp,c,size){for(let i=0;i<n;i++){if(T.parts.length>=560)T.parts.shift();T.parts.push({k:1,x,y,z,vx:(Math.random()-.5)*sp,vy:.6+Math.random()*sp*.5,vz:(Math.random()-.5)*sp,t:0,life:1.6+Math.random()*1.4,s:size*(.6+Math.random()*.6),c})}}
function burst(x,y,z,n,size){for(let i=0;i<n;i++){if(T.parts.length>=560)T.parts.shift();T.parts.push({k:0,x,y,z,vx:(Math.random()-.5)*6,vy:1+Math.random()*4,vz:(Math.random()-.5)*6,t:0,life:.35+Math.random()*.3,s:size*(.5+Math.random()*.7),c:Math.random()<.5?'#ffd27a':'#ff7a2a'})}}
export function explodeFx(x,z){if(!T)return;const y=groundAt(x,z);burst(x,y+.6,z,16,1.4);puff(x,y+.5,z,16,4,'#5a5148',1.3);puff(x,y+.3,z,10,6,'#8a6a48',.7)}
export function cannonsTick(dt,t){if(!T)return;
  for(let i=T.shells.length-1;i>=0;i--){const s=T.shells[i];s.t+=dt;if(s.t>=s.dur){T.shells.splice(i,1);explodeFx(s.x1,s.z1);if(s.hit)s.hit(s.x1,s.z1)}}
  for(let i=T.fires.length-1;i>=0;i--){const f=T.fires[i];f.t+=dt;if(f.t>f.life){T.fires.splice(i,1);continue}const k=1-f.t/f.life;
    if(Math.random()<dt*14*k){if(T.parts.length>=560)T.parts.shift();T.parts.push({k:0,x:f.x+(Math.random()-.5)*f.r,y:f.y+.1,z:f.z+(Math.random()-.5)*f.r,vx:(Math.random()-.5)*.6,vy:1.6+Math.random()*1.6,vz:(Math.random()-.5)*.6,t:0,life:.6+Math.random()*.5,s:.35+Math.random()*.45*k,c:Math.random()<.4?'#ffd27a':Math.random()<.5?'#ff8a2a':'#ff5a1a'})}
    if(Math.random()<dt*4*k)puff(f.x,f.y+1.2,f.z,1,.8,'#3a3430',.85)}
  for(let i=T.parts.length-1;i>=0;i--){const p=T.parts[i];p.t+=dt;if(p.t>p.life){T.parts.splice(i,1);continue}p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;if(p.k){p.vx*=1-dt*.8;p.vz*=1-dt*.8;p.vy=Math.max(.3,p.vy-dt*.5)}else{p.vy+=dt*1.5}}}
// list: cannons to draw [{x,z,a,wh (wheel turn),hx,hz (where the shaft meets the horse, or null)}]
export function cannonsDraw(list,t){if(!T)return;let b=0,w=0,sh=0;
  for(const c of list){if(b>=CAP)break;const y=groundAt(c.x,c.z),fx=Math.sin(c.a)*1.2,fz=Math.cos(c.a)*1.2,pit=Math.atan2(groundAt(c.x-fx,c.z-fz)-groundAt(c.x+fx,c.z+fz),2.4);
    q.setFromAxisAngle(UP,c.a);q2.setFromAxisAngle(XA,pit);q.multiply(q2);m4.compose(vp.set(c.x,y,c.z),q,vs.set(1,1,1));T.body.setMatrixAt(b++,m4);
    for(const sd of[-1,1]){m5.compose(vp.set(sd*.68,.6,.15),q2.setFromAxisAngle(XA,c.wh||0),vs.set(1,1,1));T.wheel.setMatrixAt(w++,m5.premultiply(m4))}
    if(c.hx!=null){const dx=c.hx-c.x,dz=c.hz-c.z,L=Math.hypot(dx,dz);if(L>.5){q.setFromAxisAngle(UP,Math.atan2(dx,dz));const sx=c.x-Math.sin(c.a)*2.5,sz=c.z-Math.cos(c.a)*2.5,L2=Math.hypot(c.hx-sx,c.hz-sz);q.setFromAxisAngle(UP,Math.atan2(c.hx-sx,c.hz-sz));m5.compose(vp.set(sx,y+.4,sz),q,vs.set(1,1,Math.max(.2,L2-1.2)));T.shaft.setMatrixAt(sh++,m5)}}}
  T.body.count=b;T.wheel.count=w;T.shaft.count=sh;for(const m of[T.body,T.wheel,T.shaft])m.instanceMatrix.needsUpdate=true;
  let n=0;for(const s of T.shells){const k=s.t/s.dur,x=s.x0+(s.x1-s.x0)*k,z=s.z0+(s.z1-s.z0)*k,y=s.y0+(s.y1-s.y0)*k+Math.sin(k*Math.PI)*(4+s.dur*9);m4.makeTranslation(x,y,z);T.ball.setMatrixAt(n++,m4)}T.ball.count=n;T.ball.instanceMatrix.needsUpdate=true;
  n=0;for(const c of T.craters){q.setFromUnitVectors(UP,vp.set(c.nx,1,c.nz).normalize());q2.setFromAxisAngle(UP,c.a);q.multiply(q2);m4.compose(vp.set(c.x,c.y+.06,c.z),q,vs.set(c.r,1,c.r));T.crater.setMatrixAt(n++,m4)}T.crater.count=n;T.crater.instanceMatrix.needsUpdate=true;
  let f=0,s2=0;for(const p of T.parts){const k=p.t/p.life;if(p.k===0){if(f>=320)continue;const sc=p.s*(1-k*.7);m4.compose(vp.set(p.x,p.y,p.z),q.identity(),vs.set(sc,sc*1.3,sc));T.flame.setMatrixAt(f,m4);T.flame.setColorAt(f++,tc.set(p.c).multiplyScalar(1-k*.6))}
    else{if(s2>=260)continue;const sc=p.s*(.6+k*1.4);m4.compose(vp.set(p.x,p.y,p.z),q.identity(),vs.set(sc,sc,sc));T.smoke.setMatrixAt(s2,m4);T.smoke.setColorAt(s2++,tc.set(p.c).multiplyScalar(1-k*.35))}}
  T.flame.count=f;T.smoke.count=s2;for(const m of[T.flame,T.smoke]){m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true}}
export const _T=()=>T;
