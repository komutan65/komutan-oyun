/* Büyük Harita — the horses: the same hand-built horse as the main game (one mesh per animation frame, instanced). */
import * as THREE from 'three';
const RIM='{float rim=pow(1.-clamp(dot(normal,normalize(vViewPosition)),0.,1.),2.6);outgoingLight+=rim*.34*vec3(1.,.93,.8)*(.5+.5*diffuseColor.rgb);}\n';
export function makeHorses(scene,CHR_CAP){
function horseGeo(ph,run){
  let keep=0;const parts=[],col=new THREE.Color(),V=(x,y,z)=>new THREE.Vector3(x,y,z);
  const put=(g,c,kp)=>{if(!g.attributes.normal)g.computeVertexNormals();g=g.index?g.toNonIndexed():g;col.set(c);kp=kp??keep;const n=g.attributes.position.count,C=new Float32Array(n*4);for(let i=0;i<n;i++){C[i*4]=col.r;C[i*4+1]=col.g;C[i*4+2]=col.b;C[i*4+3]=kp}g.setAttribute('color',new THREE.BufferAttribute(C,4));g.deleteAttribute('uv');parts.push(g)};
  const limb=(a,b,r0,r1,c,sg=8)=>{const d=b.clone().sub(a),L=d.length(),g=new THREE.CylinderGeometry(r1,r0,L,sg,1);g.translate(0,L/2,0);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0,1,0),d.normalize()));g.translate(a.x,a.y,a.z);put(g,c);const j=new THREE.SphereGeometry(r1*1.02,sg,5);j.translate(b.x,b.y,b.z);put(j,c)};
  const blob=(x,y,z,sx,sy,sz,c,rx=0)=>{const g=new THREE.SphereGeometry(1,16,12);g.scale(sx,sy,sz);if(rx)g.rotateX(rx);g.translate(x,y,z);put(g,c)};
  const COAT='#ffffff',DK='#2a1c12',HOOF='#1b1714',LIGHT='#f2ece2',PT='#5a4a40';     // PT: the darker 'points' of the lower legs     // the coat colour comes from each horse's own tint
  const T=ph*Math.PI*2,bob=run?Math.sin(T*2)*.06:0,pit=run?Math.sin(T*2+.6)*.035:0;
  const Y=y=>y+bob;
  // a smooth tube along a path, with an elliptical section at every point (side half-width rx, other half-depth ry): one continuous skin, no lumps
  const tube=(pts,rad,c,seg=14,side=V(1,0,0))=>{const n=pts.length,P=[],I=[];for(let i=0;i<n;i++){const t=pts[Math.min(n-1,i+1)].clone().sub(pts[Math.max(0,i-1)]).normalize(),sd=side.clone().sub(t.clone().multiplyScalar(side.dot(t))).normalize(),nm=V(0,0,0).crossVectors(sd,t).normalize();
      for(let k=0;k<=seg;k++){const a=k/seg*Math.PI*2,[rx,ry,ry2]=rad[i],q=pts[i].clone().addScaledVector(sd,Math.cos(a)*rx).addScaledVector(nm,Math.sin(a)*(Math.sin(a)>0?ry:(ry2??ry)));P.push(q.x,q.y,q.z)}}
    for(let i=0;i<n-1;i++)for(let k=0;k<seg;k++){const a=i*(seg+1)+k,b=a+seg+1;I.push(a,b,a+1,a+1,b,b+1)}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setIndex(I);g.computeVertexNormals();put(g,c);
    if(c===COAT){const q=parts[parts.length-1],N=q.attributes.normal,C=q.attributes.color;for(let k=0;k<C.count;k++){const ny=N.getY(k),sh=.8+.2*Math.min(1,Math.max(0,.5-ny*.6))+.05*Math.sin(q.attributes.position.getX(k)*9+q.attributes.position.getZ(k)*7);C.setXYZ(k,C.getX(k)*sh,C.getY(k)*sh,C.getZ(k)*sh)}}};     // a coat darker along the back, paler under the belly, faintly dappled
  // body: one loft from the dock of the tail to the breast. Sections: z, centre height, half width, half height above, half height below
  {const S=[[-1.7,2.03,.05,.05,.05],[-1.62,2.06,.26,.24,.3],[-1.47,2.08,.42,.37,.46],[-1.2,2.09,.51,.43,.56],[-.88,2.04,.5,.4,.5],[-.45,1.98,.48,.37,.56],[0,1.97,.5,.39,.63],[.45,2.02,.53,.43,.69],[.85,2.1,.5,.48,.67],[1.1,2.13,.44,.48,.6],[1.3,2.06,.36,.41,.5],[1.45,1.97,.2,.22,.3],[1.52,1.95,.04,.04,.04]];
    const pts=S.map(([z,y])=>{const k=Math.cos(z*1.2)*pit*0;return V(0,Y(y+z*pit*-1),z)}),br=run?1:1+Math.sin(T)*.03,rad=S.map(([,,rx,ru,rd])=>[rx*br,ru,rd*br]);     // at rest the barrel swells and settles with each breath
    // a loft along z: section 'up' is +y, so the path frame is built with side = x
    tube(pts,rad,COAT,30);
    // shoulder and haunch muscle under the coat, so the body isn't a plain barrel
    for(const sd of[-1,1]){const sh=new THREE.SphereGeometry(1,14,10);sh.scale(.16,.46,.3);sh.rotateX(-.35);sh.translate(sd*.36,Y(2.0),.95);put(sh,COAT);const hq=new THREE.SphereGeometry(1,14,10);hq.scale(.2,.44,.42);hq.rotateX(.25);hq.translate(sd*.33,Y(1.98),-1.15);put(hq,COAT)}}
  // the neck sweeps up from the withers and arches forward; the head hangs from the poll, deep at the cheek, long to a soft muzzle
  const nk=run?.09*Math.sin(T*2+1.2):-.24*Math.max(0,Math.sin(T))**2+.05*Math.sin(T*3)+.02,poll=V(0,Y(2.88+nk),1.98+nk*.4);
  {const N=[[V(0,Y(2.05),.95),.4,.62],[V(0,Y(2.34),1.33),.31,.48],[V(0,Y(2.58+nk*.5),1.66+nk*.2),.22,.34],[V(0,Y(2.8+nk),1.88+nk*.35),.17,.25],[poll,.15,.2]];tube(N.map(a=>a[0]),N.map(a=>[a[1],a[2]*.8,a[2]*1.1]),COAT,16)}
  {const hd=V(0,-.62,.62).normalize(),H=[[0,.15,.2],[.12,.17,.25],[.3,.15,.24],[.5,.12,.18],[.68,.1,.14],[.82,.1,.13],[.9,.07,.08],[.94,.02,.02]].map(([t,rx,ry])=>[poll.clone().add(V(0,.04,.02)).addScaledVector(hd,t),rx,ry]);
    tube(H.map(a=>a[0]),H.map(a=>[a[1],a[2]*.85,a[2]*1.05]),COAT,14);
    const jaw=new THREE.SphereGeometry(1,14,10);jaw.scale(.15,.16,.19);jaw.translate(0,poll.y-.2,poll.z+.02);put(jaw,COAT);
    const mz=poll.clone().addScaledVector(hd,.86),mzG=new THREE.SphereGeometry(1,12,8);mzG.scale(.11,.1,.12);mzG.translate(mz.x,mz.y-.01,mz.z+.02);put(mzG,'#c9bdb0');
    for(const sd of[-1,1]){const ns=new THREE.SphereGeometry(.03,6,4);ns.translate(sd*.06,mz.y+.02,mz.z+.1);put(ns,DK);const ey=new THREE.SphereGeometry(.04,8,6);ey.translate(sd*.15,poll.y-.08,poll.z+.18);put(ey,'#0d0b0a');
      const ear=new THREE.ConeGeometry(.05,.22,6);ear.rotateX(-.2);ear.rotateZ(-sd*.18);ear.translate(sd*.08,poll.y+.2,poll.z-.02);put(ear,COAT)}
    // mane: a crest of hair along the top of the neck, falling to one side, and a forelock
    const M=[];for(let k=0;k<=6;k++){const t=k/6,p=V(0,Y(2.32+t*.52+nk*t),1.12+t*.8+nk*.3*t);M.push([p.clone().add(V(.04,.06,-.05)),.05,.09])}tube(M.map(a=>a[0]),M.map(a=>[a[1],a[2]]),DK,6);
    const fl=new THREE.BoxGeometry(.12,.22,.05);fl.rotateX(.5);fl.translate(0,poll.y+.02,poll.z+.18);put(fl,DK)}
  // tail: a full switch of hair from the dock, swinging as the horse moves
  {const sw=run?Math.sin(T*2)*.18:Math.sin(T*2)*.28,lift=run?.35:0,TT=[[0,1.98,-1.6,.1],[sw*.2,1.92+lift*.2,-1.78-lift*.15,.13],[sw*.5,1.6+lift*.4,-1.92-lift*.3,.16],[sw*.8,1.2+lift*.55,-1.98-lift*.45,.15],[sw,.8+lift*.7,-1.95-lift*.55,.08],[sw*1.1,.6+lift*.75,-1.9-lift*.6,.02]];
    tube(TT.map(([x,y,z])=>V(x,Y(y),z)),TT.map(a=>[a[3],a[3]*.8]),DK,8)}
  // legs: shoulder and forearm, knee, slim cannon, fetlock, sloping pastern and hoof; behind: thigh, gaskin, the hock's backward angle
  const legs=[[.3,1,.42],[-.3,1,.52],[.3,-1,0],[-.3,-1,.1]];     // a transverse gallop: hind left, hind right, fore left, fore right, then a moment of suspension
  for(const[x,f,o]of legs){const front=f>0,T2=(ph+o)*Math.PI*2;
    const sw=run?(front?.6:.5)*Math.sin(T2):0,fold=run?Math.max(0,Math.sin(T2+(front?1.5:-1.3))):0;
    const ang=(p,a,l)=>p.clone().add(V(0,-Math.cos(a)*l,Math.sin(a)*l));
    if(front){const top=V(x,Y(1.95),1.0),el=ang(top,-.3+sw*.6,.52),kn=ang(el,sw-fold*.15,.62),fe=ang(kn,sw-fold*1.6,.5),hf=ang(fe,sw-fold*1.9+.55,.2);
      tube([top,el,el.clone().lerp(kn,.45),kn,kn.clone().lerp(fe,.3)],[[.2,.3],[.17,.19],[.13,.15],[.1,.1],[.085,.09]],COAT,10,V(0,0,1));tube([kn.clone().lerp(fe,.25),fe,hf],[[.085,.09],[.075,.08],[.085,.085]],PT,10,V(0,0,1));
      const k=new THREE.SphereGeometry(.1,8,6);k.translate(kn.x,kn.y,kn.z);put(k,COAT);const fk=new THREE.SphereGeometry(.09,8,6);fk.translate(fe.x,fe.y,fe.z-.02);put(fk,PT);
      const h=new THREE.CylinderGeometry(.085,.12,.16,10);h.translate(hf.x,hf.y-.06,hf.z+.02);put(h,HOOF);const so=new THREE.CylinderGeometry(.09,.092,.08,10);so.translate(hf.x,hf.y+.04,hf.z+.01);put(so,LIGHT)}
    else{const top=V(x,Y(1.98),-1.12),st=ang(top,.55+sw*.7,.58),hk=ang(st,-.5+sw*.9-fold*.4,.66),fe=ang(hk,.08+sw*.6+fold*1.2,.58),hf=ang(fe,.5+sw*.4+fold*1.4,.2);
      tube([top.clone().add(V(0,.05,.1)),top.clone().lerp(st,.5),st,hk,hk.clone().lerp(fe,.3)],[[.26,.42],[.24,.34],[.17,.22],[.09,.12],[.08,.09]],COAT,10,V(0,0,1));tube([hk.clone().lerp(fe,.25),fe,hf],[[.08,.09],[.075,.08],[.085,.085]],PT,10,V(0,0,1));
      const hb=new THREE.SphereGeometry(.1,8,6);hb.translate(hk.x,hk.y,hk.z-.02);put(hb,COAT);const fk=new THREE.SphereGeometry(.09,8,6);fk.translate(fe.x,fe.y,fe.z-.02);put(fk,PT);
      const h=new THREE.CylinderGeometry(.085,.12,.16,10);h.translate(hf.x,hf.y-.06,hf.z+.02);put(h,HOOF);const so=new THREE.CylinderGeometry(.09,.092,.08,10);so.translate(hf.x,hf.y+.04,hf.z+.01);put(so,LIGHT)}}
  // bridle: headstall, noseband and reins to the rider's hands
  {const hd=V(0,-.62,.62).normalize(),nb=poll.clone().addScaledVector(hd,.62),R1=new THREE.TorusGeometry(.13,.018,4,14);R1.scale(1,1,1.1);R1.rotateX(Math.PI/2-.8);R1.translate(nb.x,nb.y,nb.z);put(R1,'#3a2416',1);
    const hs=new THREE.TorusGeometry(.17,.018,4,14);hs.rotateY(Math.PI/2);hs.translate(poll.x,poll.y-.02,poll.z+.03);put(hs,'#3a2416',1);
    limb(nb.clone().add(V(.12,0,0)),V(.22,Y(2.55),.75),.015,.015,'#3a2416',4);limb(nb.clone().add(V(-.12,0,0)),V(-.22,Y(2.55),.75),.015,.015,'#3a2416',4)}
  // the rider's legs hang down both flanks into the stirrups (painted in their own colours, not the coat's)
  keep=1;for(const sd of[-1,1]){const hp=V(sd*.36,Y(2.34),.22),kn=V(sd*.62,Y(1.98),.5),an=V(sd*.6,Y(1.46),.36);
    limb(hp,kn,.17,.15,'#6d727a',8);limb(kn,an,.14,.12,'#5b6068',8);blob(kn.x,kn.y,kn.z+.04,.15,.15,.15,'#8a8f97');
    const bt=new THREE.BoxGeometry(.2,.2,.38);bt.translate(an.x,an.y-.06,an.z+.08);put(bt,'#3b2f28',1);
    const st=new THREE.TorusGeometry(.12,.025,4,8);st.translate(an.x,an.y-.16,an.z+.06);put(st,'#9a9aa2',1)}keep=0;
  // war harness after the old barding: a steel chanfron down the face, a peytral plate round the breast, a  all edged in brass
  {keep=1;const ST='#b9c0c8',BR='#c9a443',hd=V(0,-.62,.62).normalize(),up=V(0,.62,.62).normalize();
    {const c=new THREE.BoxGeometry(.27,.04,.66);c.rotateX(Math.PI/4);const p0=poll.clone().addScaledVector(hd,.42).addScaledVector(up,.15);c.translate(p0.x,p0.y,p0.z);put(c,ST);
     for(const sd of[-1,1]){const ch=new THREE.BoxGeometry(.03,.2,.36);ch.rotateX(Math.PI/4);const q=poll.clone().addScaledVector(hd,.3).add(V(sd*.16,-.02,0));ch.translate(q.x,q.y,q.z);put(ch,ST)}
     const sp=new THREE.ConeGeometry(.045,.16,6);sp.rotateX(-Math.PI/4);const q=poll.clone().addScaledVector(hd,.28).addScaledVector(up,.2);sp.translate(q.x,q.y,q.z);put(sp,BR)}
    {const pe=new THREE.CylinderGeometry(.52,.56,.42,24,1,true,-1.15,2.3);pe.scale(1,1,.95);pe.translate(0,Y(1.86),.92);put(pe,ST);for(const y of[2.07,1.65]){const r=new THREE.CylinderGeometry(.535,.545,.05,24,1,true,-1.17,2.34);r.scale(1,1,.95);r.translate(0,Y(y),.92);put(r,BR)}
     const boss=new THREE.SphereGeometry(.08,10,8);boss.translate(0,Y(1.86),1.42);put(boss,BR)}
    keep=0}
  // a long mane falling to one side of the neck, in locks
  for(let k=0;k<9;k++){const t=k/8,p0=V(.05,Y(2.36+t*.5+nk*t),1.1+t*.82+nk*.3*t),sw=run?Math.sin(T*2+k*.7)*.05:0;tube([p0,p0.clone().add(V(.14,-.2,.02+sw)),p0.clone().add(V(.2,-.42+t*.1,.05+sw*1.6))],[[.045,.08],[.04,.065],[.012,.02]],DK,5)}
  // saddle and blanket under the rider
  {keep=1;const bl=new THREE.CylinderGeometry(.57,.57,1.05,20,1,true,-1.15,2.3);bl.rotateX(Math.PI/2);bl.rotateZ(Math.PI/2);bl.scale(1,1.1,1);bl.translate(0,Y(1.93),.18);put(bl,'#7a2a20');
    const tr=new THREE.CylinderGeometry(.575,.575,.06,20,1,true,-1.15,2.3);tr.rotateX(Math.PI/2);tr.rotateZ(Math.PI/2);tr.scale(1,1.1,1);for(const z of[-.33,.69]){const t2=tr.clone();t2.translate(0,Y(1.93),z);put(t2,'#c9a443')}
    const se=new THREE.SphereGeometry(1,16,8,0,6.283,0,1.4);se.scale(.36,.12,.5);se.translate(0,Y(2.35),.15);put(se,'#4a2814');
    const pm=new THREE.SphereGeometry(.12,10,6);pm.scale(1.2,1,.8);pm.translate(0,Y(2.43),.6);put(pm,'#4a2814');const ca=new THREE.CylinderGeometry(.24,.24,.1,12,1,false,0,Math.PI);ca.rotateZ(Math.PI/2);ca.rotateY(Math.PI/2);ca.translate(0,Y(2.37),-.3);put(ca,'#4a2814');keep=0}
  // merge
  let n=0;for(const g of parts)n+=g.attributes.position.count;const P3=new Float32Array(n*3),N3=new Float32Array(n*3),C3=new Float32Array(n*3),K1=new Float32Array(n);let o=0;
  for(const g of parts){P3.set(g.attributes.position.array,o*3);N3.set(g.attributes.normal.array,o*3);const ca=g.attributes.color.array;for(let i=0;i<g.attributes.position.count;i++){C3[(o+i)*3]=ca[i*4];C3[(o+i)*3+1]=ca[i*4+1];C3[(o+i)*3+2]=ca[i*4+2];K1[o+i]=ca[i*4+3]}o+=g.attributes.position.count;g.dispose()}
  let mn=1e9;for(let i=1;i<P3.length;i+=3)mn=Math.min(mn,P3[i]);if(!run)for(let i=1;i<P3.length;i+=3)P3[i]-=mn;     // standing: hooves on the ground
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(P3,3));g.setAttribute('normal',new THREE.BufferAttribute(N3,3));g.setAttribute('color',new THREE.BufferAttribute(C3,3));g.setAttribute('aKeep',new THREE.BufferAttribute(K1,1));g.computeBoundingSphere();return g}
function horseClips(){const mat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.6,metalness:0,side:THREE.DoubleSide});
  // every frame is blended smoothly into the next on the graphics card: no stepping from pose to pose
  const vx=sh=>sh.vertexShader.replace('#include <common>','#include <common>\nattribute float aKeep;attribute vec3 p2;attribute vec3 n2;attribute float aBl;').replace('#include <beginnormal_vertex>','vec3 objectNormal=normalize(mix(normal,n2,aBl));\n#ifdef USE_TANGENT\nvec3 objectTangent=vec3(tangent.xyz);\n#endif').replace('#include <begin_vertex>','vec3 transformed=mix(position,p2,aBl);');
  mat.onBeforeCompile=sh=>{sh.vertexShader=vx(sh).replace('#include <color_vertex>','#include <color_vertex>\nvColor.rgb=mix(vColor.rgb,color.rgb,aKeep);');sh.fragmentShader=sh.fragmentShader.replace('#include <opaque_fragment>',RIM+'#include <opaque_fragment>')};
  const dm=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});dm.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 p2;attribute float aBl;').replace('#include <begin_vertex>','vec3 transformed=mix(position,p2,aBl);')};
  const mk=g=>{const m=new THREE.InstancedMesh(g,mat,CHR_CAP);m.customDepthMaterial=dm;g.setAttribute('aBl',new THREE.InstancedBufferAttribute(new Float32Array(CHR_CAP),1));m.castShadow=true;m.frustumCulled=false;m.count=0;m.visible=false;m.setColorAt(0,new THREE.Color('#fff'));m.userData.n=0;scene.add(m);return m};
  const link=ms=>ms.forEach((m,i)=>{const nx=ms[(i+1)%ms.length].geometry;m.geometry.setAttribute('p2',nx.attributes.position);m.geometry.setAttribute('n2',nx.attributes.normal)});
  const walk=[];for(let f=0;f<14;f++)walk.push(mk(horseGeo(f/14,true)));const idle=[];for(let f=0;f<8;f++)idle.push(mk(horseGeo(f/8,false)));link(walk);link(idle);return{walk,idle}}
return horseClips()}
