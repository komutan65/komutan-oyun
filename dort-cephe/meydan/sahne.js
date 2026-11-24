/* Büyük Harita — drawing the world: the far land as one light mesh, sharp ground near the player,
   lakes, forests drawn across the whole map (detailed near, simple far), castles, the closing ring. */
import * as THREE from 'three';
import {HALF,height,groundCol,NODE,nodeAt,NC,CASTLES} from './dunya.js?v=20261124a';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const S={};

// the shadow box follows the player, stepped in whole shadow-map texels as seen from the sun, so shadow edges never crawl or flicker
const SUN_D=new THREE.Vector3(-120,180,90).normalize(),SU=new THREE.Vector3().crossVectors(SUN_D,new THREE.Vector3(0,1,0)).normalize(),SV=new THREE.Vector3().crossVectors(SU,SUN_D).normalize(),SP=new THREE.Vector3();
export function placeSun(x,y,z){const sun=S.sun,tex=210/sun.shadow.mapSize.x;SP.set(x,y,z);let a=SP.dot(SU),b=SP.dot(SV);const c=Math.round(SP.dot(SUN_D)/4)*4;a=Math.round(a/tex)*tex;b=Math.round(b/tex)*tex;
  SP.copy(SU).multiplyScalar(a).addScaledVector(SV,b).addScaledVector(SUN_D,c);sun.target.position.copy(SP);sun.position.copy(SP).addScaledVector(SUN_D,330);sun.target.updateMatrixWorld()}
export function makeScene(cv,small){
  const renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,small?1.85:2));renderer.setSize(innerWidth,innerHeight,false);
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
  const scene=new THREE.Scene(),SKY=new THREE.Color('#c3d8e6');scene.background=SKY;scene.fog=new THREE.Fog(SKY,small?620:820,small?2300:2900);
  const camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,.5,3400);
  scene.add(new THREE.HemisphereLight('#dfeaff','#4f5f35',1.0));
  const sun=new THREE.DirectionalLight('#fff0d6',2.5);sun.position.set(-120,180,90);sun.castShadow=true;const sz=2048;sun.shadow.mapSize.set(sz,sz);
  const sc=sun.shadow.camera;sc.left=-105;sc.right=105;sc.top=105;sc.bottom=-105;sc.near=10;sc.far=700;sun.shadow.bias=-.0004;sun.shadow.normalBias=.32;scene.add(sun,sun.target);
  const fill=new THREE.DirectionalLight('#a9c0ff',.38);fill.position.set(120,60,-100);scene.add(fill);
  // sky dome with a soft sun and a few painted clouds
  {const g=new THREE.SphereGeometry(3200,32,16),m=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms:{sd:{value:new THREE.Vector3(-120,180,90).normalize()},uT:{value:0}},
    vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform vec3 sd;uniform float uT;varying vec3 vP;
      float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y);}
      float fb(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n2(p);p=p*2.07+vec2(5.3,1.7);a*=.5;}return v;}
      void main(){vec3 d=normalize(vP);float h=d.y;vec3 c=mix(vec3(.78,.86,.92),vec3(.26,.5,.84),smoothstep(.0,.55,h));c=mix(c,vec3(.765,.847,.902),smoothstep(.06,-.04,h));
        float s=max(dot(d,sd),0.);c+=vec3(1.,.88,.66)*(pow(s,800.)*3.+pow(s,40.)*.25+pow(s,6.)*.07);
        if(h>.0){vec2 uv=d.xz/(h+.1)*1.6+vec2(uT*.004,uT*.0016);float cl=fb(uv),cov=smoothstep(.5,.78,cl)*smoothstep(.0,.16,h);
          float lit=clamp(fb(uv+sd.xz*.08)-cl+.5,0.,1.);vec3 cc=mix(vec3(.62,.66,.74),vec3(1.,.98,.95),lit);cc+=vec3(1.,.85,.6)*pow(s,8.)*.35;
          c=mix(c,cc,cov*.88);}
        gl_FragColor=vec4(c,1.);\n#include <colorspace_fragment>\n}`});
   const sky=new THREE.Mesh(g,m);sky.renderOrder=-10;scene.add(sky);S.sky=sky;S.skyT=m.uniforms.uT}
  Object.assign(S,{renderer,scene,camera,sun,small,SKY});
  return S}

// ---------- the ground ----------
// the near ground is a mesh on a 3 m grid; every height the game uses (feet, trees, grass) is read off that same mesh,
// so nobody ever floats over a dip or sinks into a bump
const ST=3,GW=Math.round(HALF*2/ST)+1,GH=new Float32Array(GW*GW).fill(NaN);
function gh(i,j){i=clamp(i,0,GW-1);j=clamp(j,0,GW-1);const k=i+j*GW;let v=GH[k];if(v!==v){v=height(-HALF+i*ST,-HALF+j*ST);GH[k]=v}return v}
export function groundAt(x,z){const fx=(x+HALF)/ST,fz=(z+HALF)/ST,i=Math.floor(fx),j=Math.floor(fz),u=fx-i,v=fz-j;
  if(u+v<=1){const h0=gh(i,j);return h0+(gh(i+1,j)-h0)*u+(gh(i,j+1)-h0)*v}const h1=gh(i+1,j+1);return h1+(gh(i,j+1)-h1)*(1-u)+(gh(i+1,j)-h1)*(1-v)}
function detailTex(){const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d'),id=g.createImageData(256,256);let s=7;const R=()=>(s=(s*16807)%2147483647)/2147483647;
  // soft mottling plus blades of light and dark: reads as grass close up, as texture further off
  for(let j=0;j<256;j++)for(let i=0;i<256;i++){const k=(j*256+i)*4,v=212+R()*38+Math.sin(i*.09+Math.sin(j*.05)*2)*6;id.data[k]=v;id.data[k+1]=v;id.data[k+2]=v;id.data[k+3]=255}g.putImageData(id,0,0);
  for(let k=0;k<2600;k++){const x=R()*256,y=R()*256,l=2+R()*5,a=-1.57+(R()-.5)*.9,b=R()<.5;g.strokeStyle=b?`rgba(255,255,230,${.1+R()*.12})`:`rgba(40,50,20,${.08+R()*.1})`;g.lineWidth=.8+R();g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);g.stroke()}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t}
const CMASKD=new Uint8Array(400),CMASK=new THREE.DataTexture(CMASKD,20,20,THREE.RedFormat);CMASK.magFilter=CMASK.minFilter=THREE.NearestFilter;CMASK.needsUpdate=true;
function groundMat(tex,far){const m=new THREE.MeshLambertMaterial({vertexColors:true,map:tex});const U=far?{c:{value:new THREE.Vector2()},r:{value:0},mask:{value:CMASK}}:null;
  m.onBeforeCompile=sh=>{
    // the grain at two scales, so no tiling shows; far from the eye it fades to the plain colour
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vW;varying float vD;varying float vY;varying float vNy;').replace('#include <begin_vertex>','#include <begin_vertex>\nvW=(modelMatrix*vec4(position,1.)).xz;vY=position.y;vNy=normal.y;vD=-(modelViewMatrix*vec4(position,1.)).z;');
    let f=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vW;varying float vD;varying float vY;varying float vNy;'+(far?'uniform vec2 uC;uniform float uR;uniform sampler2D uMask;':''))
      .replace('#include <map_fragment>','{vec4 a=texture2D(map,vW/6.);vec4 b=texture2D(map,vW/41.+.37);vec4 m2=texture2D(map,vW/230.+.71);vec3 t=a.rgb*b.rgb*1.18;diffuseColor.rgb*=mix(t,vec3(.93),smoothstep(140.,620.,vD));diffuseColor.rgb*=.82+.36*m2.r;\n float rk=1.-smoothstep(.62,.86,vNy);if(rk>0.){float st=smoothstep(.2,.8,.5+.5*sin(vY*.8+b.g*7.+m2.r*5.));vec3 rc=mix(vec3(.5,.48,.44),vec3(.6,.58,.54),st)*(.8+.4*a.r);diffuseColor.rgb=mix(diffuseColor.rgb,rc,rk*.55);}}');
    if(far){sh.uniforms.uC=U.c;sh.uniforms.uR=U.r;sh.uniforms.uMask=U.mask;f=f.replace('void main() {','void main() {\nif(texture2D(uMask,(vW+HALF_)/(2.*HALF_)).r>.5)discard;').replace('#include <common>','#include <common>\nconst float HALF_='+HALF.toFixed(1)+';')}
    sh.fragmentShader=f};
  return{m,U}}
function groundGeo(x0,z0,size,n,useGrid){const st=size/n,N=n+1,H=new Float32Array((N+2)*(N+2));
  for(let j=-1;j<=N;j++)for(let i=-1;i<=N;i++){const x=x0+i*st,z=z0+j*st;H[(i+1)+(j+1)*(N+2)]=useGrid?gh(Math.round((x+HALF)/ST),Math.round((z+HALF)/ST)):height(x,z)}
  const P=new Float32Array(N*N*3),C=new Float32Array(N*N*3),UV=new Float32Array(N*N*2),idx=[];
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){const k=i+j*N,h=H[(i+1)+(j+1)*(N+2)],x=x0+i*st,z=z0+j*st,sl=Math.hypot(H[(i+2)+(j+1)*(N+2)]-H[i+(j+1)*(N+2)],H[(i+1)+(j+2)*(N+2)]-H[(i+1)+j*(N+2)])/(2*st);
    P[k*3]=x;P[k*3+1]=h;P[k*3+2]=z;const c=groundCol(x,z,h,sl);C[k*3]=c[0];C[k*3+1]=c[1];C[k*3+2]=c[2];UV[k*2]=x;UV[k*2+1]=z}
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){const a=i+j*N;idx.push(a,a+N,a+1,a+1,a+N,a+N+1)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(P,3));g.setAttribute('color',new THREE.BufferAttribute(C,3));g.setAttribute('uv',new THREE.BufferAttribute(UV,2));g.setIndex(idx);g.computeVertexNormals();g.computeBoundingSphere();return g}
const CHUNK=120,CN=HALF*2/CHUNK,NEAR=2;
export function makeGround(){const {scene,small}=S,tex=detailTex();
  const near=groundMat(tex,false),far=groundMat(tex,true);
  const fm=new THREE.Mesh(groundGeo(-HALF-60,-HALF-60,HALF*2+120,small?220:270),far.m);
  // the far land sits a little lower and is pushed back in depth, so where near ground is drawn it always wins:
  // no flickering stripes where the two meet (they showed up in shadows as 'shadows coming and going')
  fm.position.y=-.7;far.m.polygonOffset=true;far.m.polygonOffsetFactor=4;far.m.polygonOffsetUnits=8;scene.add(fm);
  S.ground={mat:near.m,U:far.U,chunks:new Map(),queue:[],cx:null,cz:null};
  const nc=document.createElement('canvas');nc.width=nc.height=128;{const g=nc.getContext('2d'),id=g.createImageData(128,128);for(let j=0;j<128;j++)for(let i=0;i<128;i++){const a=Math.sin(i/128*6.283*3+Math.sin(j/128*6.283*2)*1.3),b=Math.sin(j/128*6.283*4+Math.sin(i/128*6.283*3)*1.1),k=(j*128+i)*4;id.data[k]=128+a*38;id.data[k+1]=128+b*38;id.data[k+2]=255;id.data[k+3]=255}g.putImageData(id,0,0)}
  const nt=new THREE.CanvasTexture(nc);nt.wrapS=nt.wrapT=THREE.RepeatWrapping;nt.repeat.set(160,160);
  // the lake bed's depth, read once from the land shape, lets the water shade itself: clear turquoise over the shallows, deep blue further out, foam at the edge
  const DN=512,dd=new Uint8Array(DN*DN);for(let j=0;j<DN;j++)for(let i=0;i<DN;i++){const h=height(-HALF+(i+.5)/DN*HALF*2,-HALF+(j+.5)/DN*HALF*2);dd[i+j*DN]=Math.max(0,Math.min(255,Math.round((-h+1.5)*28)))}
  const dt=new THREE.DataTexture(dd,DN,DN,THREE.RedFormat);dt.magFilter=dt.minFilter=THREE.LinearFilter;dt.needsUpdate=true;
  const WU={dep:{value:dt},t:{value:0},half:{value:HALF}};S.waterU=WU;
  const wm=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.07,metalness:.1,transparent:true,opacity:.9,normalMap:nt,normalScale:new THREE.Vector2(.5,.5)});S.waterN=nt;
  wm.onBeforeCompile=sh=>{Object.assign(sh.uniforms,{uDep:WU.dep,uT:WU.t,uHalf:WU.half});
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWp;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvWp=(modelMatrix*vec4(transformed,1.)).xyz;');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vWp;uniform sampler2D uDep;uniform float uT,uHalf;')
      .replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\n{vec3 n2=texture2D(normalMap,vWp.xz/23.+vec2(-uT*.011,uT*.007)).xyz*2.-1.;vec3 n3=texture2D(normalMap,vWp.xz/7.3+vec2(uT*.019,uT*.013)).xyz*2.-1.;vec3 n4=texture2D(normalMap,vWp.xz/61.+vec2(uT*.004,-uT*.006)).xyz*2.-1.;normal=normalize(normal+vec3(n2.x,0.,n2.y)*.2+vec3(n3.x,0.,n3.y)*.1+vec3(n4.x,0.,n4.y)*.22);}')
      // colour by depth: sand-green shallows where the bed shows through, rippling light on the bed, turquoise, blue, then near-black deep water;
      // lines of surf roll in towards every shore and break into foam at the edge
      .replace('#include <color_fragment>','#include <color_fragment>\n{vec2 uv=(vWp.xz+uHalf)/(2.*uHalf);float d=texture2D(uDep,uv).r*255./28.-1.5;d=clamp(d,0.,30.);\n vec3 shal=vec3(.36,.70,.62),mid=vec3(.07,.42,.55),deep=vec3(.03,.18,.36),abyss=vec3(.012,.07,.17);vec3 c=mix(shal,mid,smoothstep(.0,2.2,d));c=mix(c,deep,smoothstep(2.2,9.,d));c=mix(c,abyss,smoothstep(9.,24.,d));\n vec2 q=vWp.xz*.42;float ca=1.-abs(sin(q.x+sin(q.y*1.3+uT*.9)*1.4+uT*.45)*sin(q.y*1.15+sin(q.x*1.7-uT*.7)*1.2-uT*.38));ca=pow(ca,7.);c+=vec3(.75,1.,.9)*ca*.22*(1.-smoothstep(.2,3.5,d));\n float nz=sin(vWp.x*.21+sin(vWp.z*.17)*2.)*.5+sin(vWp.z*.29-vWp.x*.07)*.5;float band=smoothstep(.82,1.,sin(d*3.4-uT*1.7+nz*1.6))*(1.-smoothstep(.25,1.8,d));\n float fo=(1.-smoothstep(.04,.42,d))*(.65+.35*sin(vWp.x*.9+vWp.z*.7+uT*2.))+band*.75;fo=clamp(fo,0.,1.);\n diffuseColor.rgb=mix(c,vec3(.95,.98,1.),fo*.8);diffuseColor.a=mix(.5,.95,smoothstep(.0,3.5,d))+fo*.3;}')
      // the sky mirrored at a glancing look across the water
      .replace('#include <opaque_fragment>','{float fr=pow(1.-clamp(dot(normalize(vViewPosition),normal),0.,1.),3.);outgoingLight=mix(outgoingLight,mix(vec3(.62,.76,.9),vec3(.86,.9,.95),fr),fr*.6);diffuseColor.a=max(diffuseColor.a,fr*.9);}\n#include <opaque_fragment>')};
  const w=new THREE.Mesh(new THREE.PlaneGeometry(HALF*2+800,HALF*2+800).rotateX(-Math.PI/2),wm);w.position.y=0;w.renderOrder=1;scene.add(w);S.water=w}
export function updateGround(px,pz){const G=S.ground,cx=Math.floor((px+HALF)/CHUNK),cz=Math.floor((pz+HALF)/CHUNK);
  if(cx!==G.cx||cz!==G.cz){G.cx=cx;G.cz=cz;const want=new Set();
    for(let j=cz-NEAR;j<=cz+NEAR;j++)for(let i=cx-NEAR;i<=cx+NEAR;i++){if(i<0||j<0||i>=CN||j>=CN)continue;const k=i+j*CN;want.add(k);if(!G.chunks.has(k)&&!G.queue.includes(k))G.queue.push(k)}
    for(const[k,m]of G.chunks)if(!want.has(k)){S.scene.remove(m);m.geometry.dispose();G.chunks.delete(k);CMASKD[k]=0;CMASK.needsUpdate=true}
    G.queue=G.queue.filter(k=>want.has(k)).sort((a,b)=>Math.hypot(a%CN-cx,(a/CN|0)-cz)-Math.hypot(b%CN-cx,(b/CN|0)-cz))}
  let built=0;while(G.queue.length&&built<(G.chunks.size<9?9:1)){const k=G.queue.shift(),i=k%CN,j=k/CN|0;const m=new THREE.Mesh(groundGeo(-HALF+i*CHUNK,-HALF+j*CHUNK,CHUNK,CHUNK/ST,true),G.mat);m.receiveShadow=true;S.scene.add(m);G.chunks.set(k,m);CMASKD[k]=255;CMASK.needsUpdate=true;built++}
  let all=true;for(let j=cz-NEAR;j<=cz+NEAR&&all;j++)for(let i=cx-NEAR;i<=cx+NEAR;i++){if(i<0||j<0||i>=CN||j>=CN)continue;if(!G.chunks.has(i+j*CN)){all=false;break}}
  if(all){G.U.c.value.set(-HALF+(cx+.5)*CHUNK,-HALF+(cz+.5)*CHUNK);G.U.r.value=(NEAR+.5)*CHUNK-3}else G.U.r.value=0}

// ---------- trees, rocks, bushes ----------
export function col(g,c){const n=g.attributes.position.count,a=new Float32Array(n*3),C=new THREE.Color(c);for(let i=0;i<n;i++){a[i*3]=C.r;a[i*3+1]=C.g;a[i*3+2]=C.b}g.setAttribute('color',new THREE.BufferAttribute(a,3));return g}
// colour each vertex by its height between two colours (darker at the bottom, sunlit at the top)
function grad(g,c0,c1,y0,y1){const p=g.attributes.position,n=p.count,a=new Float32Array(n*3),A=new THREE.Color(c0),B=new THREE.Color(c1),T=new THREE.Color();for(let i=0;i<n;i++){T.copy(A).lerp(B,clamp((p.getY(i)-y0)/(y1-y0),0,1));a[i*3]=T.r;a[i*3+1]=T.g;a[i*3+2]=T.b}g.setAttribute('color',new THREE.BufferAttribute(a,3));return g}
export function merge(list,keepUV){const gs=list.map(g=>g.index?g.toNonIndexed():g);let n=0;for(const g of gs)n+=g.attributes.position.count;const P=new Float32Array(n*3),C=new Float32Array(n*3),UV=keepUV?new Float32Array(n*2):null;let o=0;
  for(const g of gs){const c=g.attributes.position.count;P.set(g.attributes.position.array,o*3);if(g.attributes.color)C.set(g.attributes.color.array,o*3);else C.fill(1,o*3,(o+c)*3);if(UV&&g.attributes.uv)UV.set(g.attributes.uv.array,o*2);o+=c}
  const m=new THREE.BufferGeometry();m.setAttribute('position',new THREE.BufferAttribute(P,3));m.setAttribute('color',new THREE.BufferAttribute(C,3));if(UV)m.setAttribute('uv',new THREE.BufferAttribute(UV,2));m.computeVertexNormals();m.computeBoundingSphere();return m}
function jitter(g,amt,seed){let s=seed;const R=()=>(s=(s*16807)%2147483647)/2147483647;const p=g.attributes.position,map=new Map();for(let i=0;i<p.count;i++){const k=p.getX(i).toFixed(3)+','+p.getY(i).toFixed(3)+','+p.getZ(i).toFixed(3);if(!map.has(k))map.set(k,[1+(R()-.5)*amt,1+(R()-.5)*amt*.7,1+(R()-.5)*amt]);const f=map.get(k);p.setXYZ(i,p.getX(i)*f[0],p.getY(i)*f[1],p.getZ(i)*f[2])}return g}
function rockGeo(seed,c1,c2,bits){const r=jitter(new THREE.IcosahedronGeometry(1.2,1),.38,seed);r.translate(0,.5,0);r.scale(1.3,.78,1.12);grad(r,'#5f5c57',c1,0,1.6);
  {const p=r.attributes.position,C=r.attributes.color;let s2=seed*13;const R2=()=>(s2=(s2*16807)%2147483647)/2147483647;for(let i=0;i<p.count;i++){const k=.82+R2()*.3;C.setXYZ(i,C.getX(i)*k,C.getY(i)*k,C.getZ(i)*k)}}
  const out=[r];let s=seed*7;const R=()=>(s=(s*16807)%2147483647)/2147483647;for(let k=0;k<(bits||0);k++){const o=new THREE.TetrahedronGeometry(.3+R()*.16,0);const a=R()*6.28,h=.4+R()*.7;o.translate(Math.cos(a)*1.05,h,Math.sin(a)*.95);out.push(col(o,c2))}
  const ms=jitter(new THREE.SphereGeometry(.95,8,3,0,6.283,0,1.05),.3,seed+3);ms.scale(1.2,.42,1.05);ms.translate(0,1.0,0);out.push(grad(ms,'#4f6a2c','#7a9a45',.9,1.4));
  const sm=jitter(new THREE.DodecahedronGeometry(.45,0),.4,seed+9);sm.translate(1.25,.2,.4);out.push(grad(sm,'#5f5c57',c1,0,.6));return merge(out)}
export function nodeGeos(){
  const pineL=[grad(new THREE.CylinderGeometry(.12,.3,3,7).translate(0,1.5,0),'#3a2618','#5a3d26',0,3)];for(let k=0;k<5;k++){const r=1.85-k*.32,h=1.6-k*.1,c=new THREE.ConeGeometry(r,h,10,2,true);jitter(c,.2,11+k);
    {const p=c.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i);if(y<-h/2+.01){const a=Math.atan2(p.getZ(i),p.getX(i));p.setY(i,y-.18-.12*Math.sin(a*5+k))}}}     // tips of each tier droop, unevenly
    c.translate(0,1.7+k*.98,0);pineL.push(grad(c,k%2?'#1b3a20':'#21432a',k%2?'#47773a':'#558a45',1.7+k*.98-h/2,1.7+k*.98+h/2))}
  {const tp=new THREE.ConeGeometry(.35,1,6);tp.translate(0,6.6,0);pineL.push(grad(tp,'#2b5230','#5d9150',6.1,7.1))}
  const pine=merge(pineL);
  const oakL=[grad(new THREE.CylinderGeometry(.22,.42,2.8,7,1,true).translate(0,1.4,0),'#3a2617','#6b4a2e',0,2.8)];
  for(const[a,l]of[[.5,1.5],[2.6,1.3],[4.4,1.4]]){const br=new THREE.CylinderGeometry(.07,.14,l,5);br.translate(0,l/2,0);br.rotateZ(.9);br.rotateY(a);br.translate(0,2.5,0);oakL.push(col(br,'#4a3220'))}
  const B=[[0,3.9,0,1.75],[1.25,3.4,.5,1.3],[-1.15,3.5,-.5,1.35],[.3,3.2,-1.15,1.2],[-.3,4.75,.4,1.15],[.65,4.35,.8,1.05],[-.85,4.1,.95,1],[1.1,4.6,-.6,.9],[-1.3,3,.7,.85],[.2,5.3,-.3,.8]];
  const TONES=[['#2f5a23','#79ad49'],['#2a5020','#6d9e3f'],['#38632a','#8ab855'],['#2c5422','#7fae4c']];
  B.forEach(([x,y,z,r],k)=>{const b=jitter(new THREE.IcosahedronGeometry(r,0),.3,3+k*5);b.translate(x,y,z);const T=TONES[k%4];oakL.push(grad(b,T[0],T[1],y-r,y+r))});
  const oak=merge(oakL);
  const rock=rockGeo(11,'#a3a097','#a3a097',0),iron=rockGeo(13,'#8a8580','#9a5a32',7),gold=rockGeo(17,'#908a80','#f2c33a',6);
  const bushL=[];[[0,.6,0,.85],[.55,.45,.25,.6],[-.5,.5,-.2,.65]].forEach(([x,y,z,r],k)=>{const b=jitter(new THREE.IcosahedronGeometry(r,0),.3,21+k);b.translate(x,y,z);bushL.push(grad(b,'#28501f','#5c9a3a',y-r,y+r))});
  for(let k=0;k<9;k++)bushL.push(col(new THREE.TetrahedronGeometry(.11,0).translate(Math.cos(k*.7)*.85,.45+(k%3)*.2,Math.sin(k*.7)*.85),'#c92846'));
  const bush=merge(bushL);
  const stump=merge([col(new THREE.CylinderGeometry(.3,.38,.5,7).translate(0,.25,0),'#6b4a2e'),col(new THREE.CylinderGeometry(.29,.29,.02,7).translate(0,.51,0),'#c9a36b')]);
  // far trees: few triangles, the same silhouette and colour as the near ones
  const cone=merge([grad(new THREE.ConeGeometry(1.8,3.4,7,1,true).translate(0,3.0,0),'#1f3f22','#3f7036',1.3,4.7),grad(new THREE.ConeGeometry(1.25,3,7,1,true).translate(0,4.9,0),'#28492a','#4c7f3c',3.4,6.4),col(new THREE.CylinderGeometry(.2,.25,1.4,4,1,true).translate(0,.7,0),'#4a3322')]);
  const blob=merge([grad(jitter(new THREE.IcosahedronGeometry(2.3,0),.25,41).scale(1.1,.95,1.1).translate(0,3.8,0),'#2c5522','#6a9e42',1.6,6),col(new THREE.CylinderGeometry(.25,.32,2.2,3,1,true).translate(0,1.1,0),'#4a3322')]);
  return[pine,oak,rock,iron,gold,bush,stump,cone,blob]}
// leaves sway in the wind (more at the top); the far copies too, so nothing jumps when they swap
// the commander's place on screen (pixels), his depth and a radius: trees in front of him there dissolve
export const FOC={value:new THREE.Vector4(-1e4,-1e4,0,1)};
const DISS='{if(vCamD<NEARCUT)discard;if(vCamD<uFoc.z-2.){float r=length(gl_FragCoord.xy-uFoc.xy)/uFoc.w;if(r<.82)discard;if(r<1.){vec2 q=mod(floor(gl_FragCoord.xy),4.);float b=mod(q.x*8.+q.y*4.+q.x*q.y*2.+q.y,16.)/16.;if((r-.82)/.18<b)discard;}}}';
export function seeThrough(m,key){const prev=m.onBeforeCompile;m.onBeforeCompile=(sh,r)=>{if(prev)prev(sh,r);sh.uniforms.uFoc=FOC;
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying float vCamD;uniform vec4 uFoc;').replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\n'+DISS.replace('NEARCUT','2.5'));
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying float vCamD;').replace('#include <project_vertex>','#include <project_vertex>\nvCamD=-mvPosition.z;')};m.customProgramCacheKey=()=>'see-'+key;return m}
// and a tree right in front of the camera dissolves, so it never hides the commander
function swayMat(){const m=new THREE.MeshLambertMaterial({vertexColors:true});const T={value:0};m.onBeforeCompile=sh=>{sh.uniforms.uT=T;
    sh.uniforms.uFoc=FOC;sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying float vCamD;uniform vec4 uFoc;').replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\n'+DISS.replace('NEARCUT','6.'));
    sh.vertexShader=sh.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvCamD=-mvPosition.z;').replace('#include <common>','#include <common>\nuniform float uT;varying float vCamD;').replace('#include <begin_vertex>','#include <begin_vertex>\n#ifdef USE_INSTANCING\n{vec4 wp=instanceMatrix*vec4(0.,0.,0.,1.);float k=max(0.,position.y-1.5)*.035;transformed.x+=sin(uT*1.3+wp.x*.05+wp.z*.07)*k;transformed.z+=cos(uT*1.1+wp.x*.06)*k*.7;}\n#endif\n')};m.userData.T=T;return m}
const NEAR_T=230,ROCK_R=420,FAR_T=S_FAR();function S_FAR(){return S.small?950:1150}
export function makeNodes(){const geos=nodeGeos(),mat=swayMat(),rmat=new THREE.MeshLambertMaterial({vertexColors:true}),small=S.small;
  const list=[],BK=40,BN=HALF*2/BK,B=Array.from({length:BN*BN},()=>[]);
  for(let i=0;i<NC;i++)for(let j=0;j<NC;j++){const n=nodeAt(i,j);if(!n)continue;n.y=groundAt(n.x,n.z);
    // stones and bushes settle into a slope: set at the lowest ground under their edge, so the downhill side never floats
    if(n.t>=2){const r=(n.t===5?.9:1.5)*n.s*1.1;n.y=Math.min(n.y,groundAt(n.x+r,n.z),groundAt(n.x-r,n.z),groundAt(n.x,n.z+r),groundAt(n.x,n.z-r))+.05}n.i=list.length;list.push(n);B[clamp(Math.floor((n.x+HALF)/BK),0,BN-1)+clamp(Math.floor((n.z+HALF)/BK),0,BN-1)*BN].push(n)}
  const cnt=[0,0,0,0,0,0];for(const n of list)cnt[n.t]++;
  // 0 pine near, 1 oak near, 2 rock, 3 iron, 4 gold, 5 bush (all of them, always), 6 stump, 7 pine far, 8 oak far; 9.. near copies that cast shadows
  const caps=[small?900:1400,small?1700:2600,cnt[2],cnt[3],cnt[4],cnt[5],600,cnt[0],cnt[1]];
  const IM=geos.map((g,i)=>{const m=new THREE.InstancedMesh(g,i<2||i>=7?mat:rmat,Math.max(1,caps[i]));m.count=0;m.frustumCulled=false;m.castShadow=false;m.receiveShadow=i>=2&&i<6;S.scene.add(m);return m});
  for(let i=0;i<6;i++){const m=new THREE.InstancedMesh(geos[i],i<2?mat:rmat,small?180:300);m.count=0;m.frustumCulled=false;m.castShadow=true;m.receiveShadow=i>=2;S.scene.add(m);IM.push(m)}
  S.nodes={list,B,BK,BN,IM,mat,byId:new Map(list.map(n=>[n.id,n])),lx:1e9,lz:1e9,dirty:true}}
// take trees, rocks and bushes away where they would block a way in (ruins, their openings): f(n) says which go
export function clearNodes(f){const N=S.nodes;N.list=N.list.filter(n=>!f(n));N.list.forEach((n,i)=>n.i=i);for(let k=0;k<N.B.length;k++)N.B[k]=N.B[k].filter(n=>!f(n));N.byId=new Map(N.list.map(n=>[n.id,n]));N.dirty=true}
export function nodesNear(x,z,r,f){const N=S.nodes,BK=N.BK,BN=N.BN,b0=Math.floor((x-r+HALF)/BK),b1=Math.floor((x+r+HALF)/BK),c0=Math.floor((z-r+HALF)/BK),c1=Math.floor((z+r+HALF)/BK);
  for(let j=Math.max(0,c0);j<=Math.min(BN-1,c1);j++)for(let i=Math.max(0,b0);i<=Math.min(BN-1,b1);i++)for(const n of N.B[i+j*BN])f(n)}
const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),vp=new THREE.Vector3(),vs=new THREE.Vector3(),UP=new THREE.Vector3(0,1,0),tc=new THREE.Color();
export function updateNodes(px,pz,t){const N=S.nodes;N.mat.userData.T.value=t;if(!N.dirty&&Math.hypot(px-N.lx,pz-N.lz)<10)return;N.dirty=false;N.lx=px;N.lz=pz;
  const IM=N.IM,cnt=new Array(IM.length).fill(0);
  const put=(k,x,y,z,s,a,sh)=>{const m=IM[k];if(cnt[k]>=m.instanceMatrix.count)return false;q.setFromAxisAngle(UP,a);m4.compose(vp.set(x,y,z),q,vs.set(s,s*(sh||1),s));m.setMatrixAt(cnt[k],m4);tc.setScalar(.84+((a*7.3)%1)*.32);m.setColorAt(cnt[k],tc);cnt[k]++;return true};
  // every tree on the map is drawn: the near ones in detail, the rest as light far copies
  for(const n of N.list){const d=Math.hypot(n.x-px,n.z-pz),tree=n.t<2;
    if(tree){if(n.hp<=0){if(d<NEAR_T)put(6,n.x,n.y-.05,n.z,n.s*1.2,n.a);continue}
      const sc=n.s*1.3,sh=1+(n.s-.8)*.6;if(d<NEAR_T){if(d<75&&put(n.t+9,n.x,n.y-.15,n.z,sc,n.a,sh))continue;if(put(n.t,n.x,n.y-.15,n.z,sc,n.a,sh))continue}if(d<FAR_T)put(n.t===0?7:8,n.x,n.y-.3,n.z,sc*.95,n.a,sh);continue}
    const RR=n.t===5?260:ROCK_R;if(n.hp<=0||d>RR)continue;const sc=(n.t===5?n.s:n.s*(n.t===2?1:1.1))*Math.min(1,(RR-d)/50);     /* they shrink away at the edge instead of popping */if(d<75&&put(n.t+9,n.x,n.y-.15,n.z,sc,n.a))continue;put(n.t,n.x,n.y-.15,n.z,sc,n.a)}
  IM.forEach((m,k)=>{m.count=cnt[k];m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true})}

// ---------- grass tufts, flowers and pebbles round the player (they grow in at the edge, never pop) ----------
export function makeClutter(){const blades=[],cl=[];for(let b=0;b<6;b++){const a=b/6*Math.PI*1.3+b*.4,h=.32+((b*37)%5)*.09,w=.075,c=Math.cos(a)*w,sn=Math.sin(a)*w,bx=Math.cos(a+1.57)*(.05+b%3*.04),bz=Math.sin(a+1.57)*(.05+b%3*.04);
    const ox=Math.cos(b*2.3)*.12,oz=Math.sin(b*2.3)*.12,mx=ox+bx*.4,mz=oz+bz*.4,tx=ox+bx,tz=oz+bz;
    // two quads bending outwards, then the tip
    const P=[[ox-c,0,oz-sn],[ox+c,0,oz+sn],[mx+c*.7,h*.55,mz+sn*.7],[mx-c*.7,h*.55,mz-sn*.7]];
    const quad=(A,B,C,D,ca,cb)=>{blades.push(...A,...B,...C,...A,...C,...D,...B,...A,...C,...C,...A,...D);for(const x of[ca,ca,cb,ca,cb,cb,ca,ca,cb,cb,ca,cb])cl.push(...x)};
    const lo=[.34,.42,.2],md=[.62,.74,.38],hi=[.95,1,.62];quad(P[0],P[1],P[2],P[3],lo,md);
    blades.push(...P[3],...P[2],tx,h,tz, ...P[2],...P[3],tx,h,tz);for(let k=0;k<2;k++)cl.push(...md,...md,...hi)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(blades,3));g.setAttribute('color',new THREE.Float32BufferAttribute(cl,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(new Array(blades.length/3).fill(0).flatMap(()=>[0,1,0]),3));
  const U={c:{value:new THREE.Vector3()},r:{value:50},t:{value:0}};
  const fade=m=>{m.onBeforeCompile=sh=>{sh.uniforms.uC=U.c;sh.uniforms.uR=U.r;sh.uniforms.uT=U.t;sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nuniform vec3 uC;uniform float uR,uT;').replace('#include <begin_vertex>','#include <begin_vertex>\n{vec4 wp=instanceMatrix*vec4(0.,0.,0.,1.);float d=distance(wp.xz,uC.xz);float k=smoothstep(uR,uR-14.,d);transformed*=k;transformed.x+=sin(uT*1.8+wp.x*.3+wp.z*.2)*.06*position.y;}')};return m};
  const gm=fade(new THREE.MeshLambertMaterial({vertexColors:true}));
  const fl=merge([col(new THREE.CylinderGeometry(.015,.015,.35,3).translate(0,.17,0),'#4f7a2c'),col(new THREE.IcosahedronGeometry(.08,0).translate(0,.37,0),'#ffffff')]);
  const pb=jitter(new THREE.DodecahedronGeometry(.22,0),.5,77);col(pb,'#8a877f');
  const N=S.small?3800:6400,G=new THREE.InstancedMesh(g,gm,N),F=new THREE.InstancedMesh(fl,fade(new THREE.MeshLambertMaterial({vertexColors:true})),N/5|0),PB=new THREE.InstancedMesh(pb,fade(new THREE.MeshLambertMaterial({vertexColors:true})),N/8|0);
  for(const m of[G,F,PB]){m.count=0;m.frustumCulled=false;m.receiveShadow=true;S.scene.add(m)}S.clutter={G,F,PB,U,lx:1e9,lz:1e9}}
const FLC=['#f4e04d','#ffffff','#e05a8a','#9b7be0','#f08a3a'].map(c=>new THREE.Color(c));
export function updateClutter(px,pz,t){const C=S.clutter;if(!C)return;const r=S.small?44:58;C.U.c.value.set(px,0,pz);C.U.t.value=t;C.U.r.value=r-4;if(Math.hypot(px-C.lx,pz-C.lz)<6)return;C.lx=px;C.lz=pz;const st=S.small?1.85:1.6;let g=0,f=0,b=0;const GN=C.G.instanceMatrix.count,FN=C.F.instanceMatrix.count,BN2=C.PB.instanceMatrix.count;
  const i0=Math.floor((px-r)/st),i1=Math.floor((px+r)/st),j0=Math.floor((pz-r)/st),j1=Math.floor((pz+r)/st);
  for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){let h=Math.imul(i,73856093)^Math.imul(j,19349663);h=Math.imul(h^(h>>>13),1274126177);const u=((h>>>0)%1000)/1000,v=(((h>>>10)>>>0)%1000)/1000,w=(((h>>>20)>>>0)%1000)/1000;
    const x=i*st+u*st,z=j*st+v*st;if((x-px)**2+(z-pz)**2>r*r)continue;const y=groundAt(x,z);if(y<1||y>95||onCastle(x,z))continue;
    if(w<.74&&g<GN){q.setFromAxisAngle(UP,u*6.28);m4.compose(vp.set(x,y-.03,z),q,vs.set(.9+v*.6,.75+v*1.1+(w<.1?.7:0),.9+v*.6));C.G.setMatrixAt(g,m4);const gc=groundCol(x,z,y,0);tc.setRGB(gc[0]*1.05,gc[1]*1.15,gc[2]*.9);C.G.setColorAt(g++,tc)}
    else if(w<.77&&f<FN){q.setFromAxisAngle(UP,v*6.28);m4.compose(vp.set(x,y,z),q,vs.setScalar(.8+u*.6));C.F.setMatrixAt(f,m4);C.F.setColorAt(f++,FLC[(h>>>5)%5])}
    else if(w>.985&&b<BN2){q.setFromAxisAngle(UP,u*6.28);m4.compose(vp.set(x,y-.06,z),q,vs.setScalar(.6+v*1.4));C.PB.setMatrixAt(b++,m4)}}
  vs.set(1,1,1);C.G.count=g;C.F.count=f;C.PB.count=b;for(const m of[C.G,C.F,C.PB]){m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true}}
const onCastle=(x,z)=>{for(const c of CASTLES)if(Math.abs(x-c.x)<CW+3&&Math.abs(z-c.z)<CW+3)return true;return false};

// ---------- castles ----------
export const CW=16;     // half the width of a castle's walls
const CSY=.8;          // castles are drawn a fifth lower than they were modelled
export function brickTex(){const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');g.fillStyle='#6d675d';g.fillRect(0,0,256,256);let s=5;const R=()=>(s=(s*16807)%2147483647)/2147483647;
  for(let r=0;r<8;r++)for(let k=0;k<6;k++){const x=k*52+(r%2)*26-26,y=r*32;const v=150+R()*55,t=R()*14-7;g.fillStyle=`rgb(${v+t},${v-2},${v-10-t})`;g.fillRect(x+2,y+2,48,28);
    g.fillStyle='rgba(255,255,255,.08)';g.fillRect(x+2,y+2,48,4);g.fillStyle='rgba(0,0,0,.12)';g.fillRect(x+2,y+26,48,4);for(let d=0;d<6;d++){g.fillStyle=`rgba(0,0,0,${R()*.1})`;g.fillRect(x+2+R()*44,y+2+R()*24,2+R()*5,2+R()*4)}}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t}
// a box whose bricks stay brick-sized whatever the box's size
export function tbox(w,h,d,c){const g=new THREE.BoxGeometry(w,h,d),uv=g.attributes.uv,dims=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];for(let f=0;f<6;f++)for(let k=0;k<4;k++){const i=f*4+k;uv.setXY(i,uv.getX(i)*dims[f][0]/2.6,uv.getY(i)*dims[f][1]/2.6)}return col(g,c||'#ffffff')}
export function tcyl(r1,r2,h,n,c,open){const g=new THREE.CylinderGeometry(r1,r2,h,n,1,!!open),uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*6.283*r1/2.6,uv.getY(i)*h/2.6);return col(g,c||'#ffffff')}
// three kinds of castle: round towers and a square keep; square towers and a round keep in warm sandstone; tall dark walls with eight-sided towers
export function makeCastles(){const tex=brickTex(),stoneM=seeThrough(new THREE.MeshLambertMaterial({map:tex,vertexColors:true}),'stone'),list=[];
  for(const C of CASTLES){const v=C.k%3,lower=[],upper=[],roof=[],segs=[],L=CW,H=v===2?8.5:7,T=1.8,c=Math.cos(C.a),s=Math.sin(C.a);
    const ST=['#ffffff','#f2dfbd','#b9bcc8'][v],CAP=['#e8e4dc','#fff0d0','#d0d2dc'][v];
    const W=(x,z)=>({x:C.x+x*c+z*s,z:C.z-x*s+z*c});const add=(arr,g,x,y,z,ry)=>{if(ry)g.rotateY(ry);g.translate(x,y,z);arr.push(g)};
    const wall=(x1,z1,x2,z2)=>{const len=Math.hypot(x2-x1,z2-z1),a=Math.atan2(x2-x1,z2-z1),mx=(x1+x2)/2,mz=(z1+z2)/2;
      add(lower,tbox(T,H*.4,len,ST),mx,H*.2,mz,a);add(upper,tbox(T,H*.6,len,ST),mx,H*.7,mz,a);
      const n=Math.floor(len/1.6);for(let k=0;k<n;k++){const u=-len/2+(k+.5)*len/n,ox=Math.sin(a)*u,oz=Math.cos(a)*u,nx=Math.cos(a),nz=-Math.sin(a),out=(mx*nx+mz*nz)>0?1:-1;if(k%2===0)add(upper,tbox(.5,1,len/n*.9,CAP),mx+ox+nx*out*.6,H+.5,mz+oz+nz*out*.6,a)}
      // a stone string course and a sloped plinth at the foot: walls that look built, not boxes
      add(lower,tbox(T+.5,.9,len,CAP),mx,.3,mz,a);add(upper,tbox(T+.25,.25,len,CAP),mx,H*.55,mz,a);
      const p=W(x1,z1),q2=W(x2,z2);segs.push([p.x,p.z,q2.x,q2.z,1.3])};
    wall(-L,-L,L,-L);wall(L,-L,L,L);wall(-L,-L,-L,L);wall(-L,L,-3.2,L);wall(3.2,L,L,L);
    const tops=[];const TH=v===0?12:v===1?12.6:13.5;
    for(const[x,z]of[[-L,-L],[L,-L],[-L,L],[L,L]]){
      if(v===0){add(lower,tcyl(3,3.4,4,14,ST),x,2,z);add(upper,tcyl(3,3,7,14,ST),x,7.5,z);add(upper,tcyl(3.4,3,1,14,CAP),x,11.5,z);for(let k=0;k<10;k+=2){const a=k/10*6.283;add(upper,tbox(.7,.9,.5,CAP),x+Math.cos(a)*3.1,12.4,z+Math.sin(a)*3.1,-a)}
        {const fl=new THREE.CylinderGeometry(2.9,2.9,.3,14);fl.translate(x,11.9,z);upper.push(col(fl,CAP))}}
      else if(v===1){add(lower,tbox(6.2,4,6.2,ST),x,2,z);add(upper,tbox(6,8,6,ST),x,8,z);add(upper,tbox(6.6,.6,6.6,CAP),x,12.2,z);for(const[ox,oz]of[[-2.6,-2.6],[0,-2.6],[2.6,-2.6],[-2.6,0],[2.6,0],[-2.6,2.6],[0,2.6],[2.6,2.6]])add(upper,tbox(.8,1,.8,CAP),x+ox,13,z+oz,0)}
      else{add(lower,tcyl(3.4,3.8,4.5,8,ST),x,2.25,z);add(upper,tcyl(3.4,3.4,8.2,8,ST),x,8.6,z);add(upper,tcyl(3.8,3.4,1,8,CAP),x,13.1,z);for(let k=0;k<8;k+=2){const a=k/8*6.283+.39;add(upper,tbox(.9,1,.5,CAP),x+Math.cos(a)*3.5,14,z+Math.sin(a)*3.5,-a)}
        {const fl=new THREE.CylinderGeometry(3.3,3.3,.3,8);fl.rotateY(.39);fl.translate(x,13.5,z);upper.push(col(fl,CAP))}}
      tops.push({x,y:TH,z});const p=W(x,z);segs.push([p.x,p.z,p.x,p.z,3.6])}
    for(const sd of[-1,1]){add(lower,tbox(3.4,4,3.4,ST),sd*4.9,2,L,0);add(upper,tbox(3.4,H-.5,3.4,ST),sd*4.9,4+(H-.5)/2,L,0);for(const[ox,oz]of[[-1.2,-1.2],[1.2,-1.2],[-1.2,1.2],[1.2,1.2]])add(upper,tbox(.7,.9,.7,CAP),sd*4.9+ox,H+4.2,L+oz,0)}
    add(upper,tbox(6.4,2.4,2.2,ST),0,H+.2,L,0);for(let k=-2;k<=2;k++){const g=new THREE.BoxGeometry(.12,1.4,.12);g.translate(k*1.1,H-1.5,L+.6);upper.push(col(g,'#2a2420'))}{const g=new THREE.BoxGeometry(5.2,.14,.12);g.translate(0,H-2,L+.6);upper.push(col(g,'#2a2420'))}
    // the keep
    if(v===1){add(lower,tcyl(5.2,5.6,5,16,ST),0,2.5,-3);add(upper,tcyl(5.2,5.2,11,16,ST),0,10.5,-3);add(upper,tcyl(5.7,5.2,.8,16,CAP),0,16.4,-3);const r=new THREE.ConeGeometry(6,7,16);r.translate(0,20.3,-3);roof.push(col(r,'#ffffff'));
      for(const h of[7,11])for(const a of[0,1.57,3.14,4.71]){const g=new THREE.BoxGeometry(.8,1.5,.3);g.translate(Math.sin(a)*5.15,h,-3+Math.cos(a)*5.15);g.rotateY(0);upper.push(col(g,'#1d1712'))}}
    else{const kh=v===2?11:9;add(lower,tbox(10,5,10,ST),0,2.5,-3,0);add(upper,tbox(10,kh,10,ST),0,5+kh/2,-3,0);add(upper,tbox(10.8,.8,10.8,CAP),0,5+kh+.4,-3,0);
      for(let k=0;k<6;k++)for(const sd of[-1,1]){add(upper,tbox(.8,1,.6,CAP),-4.5+k*1.8,5+kh+1.3,-3+sd*5.1,0);add(upper,tbox(.6,1,.8,CAP),sd*5.1,5+kh+1.3,-7.5+k*1.8,0)}
      if(v===0){const r=new THREE.ConeGeometry(6.6,5.5,4);r.rotateY(Math.PI/4);r.translate(0,17.6,-3);roof.push(col(r,'#ffffff'))}
      else for(const sd of[-1,1]){add(upper,tcyl(1.6,1.6,5,10,ST),sd*4.2,5+kh+2.5,-6.2);const r=new THREE.ConeGeometry(2,3.4,10);r.translate(sd*4.2,5+kh+6.7,-6.2);roof.push(col(r,'#ffffff'))}
      for(const sd of[-1,1])for(const h of[6,10]){const g=new THREE.BoxGeometry(.9,1.6,.2);g.translate(sd*2.4,h,2.05);upper.push(col(g,'#1d1712'))}}
    {const k1=W(-5.4,-3),k2=W(5.4,-3);segs.push([k1.x,k1.z,k2.x,k2.z,5.4])}
    {const fh=v===1?23.5:v===2?22:20.5;const pole=new THREE.CylinderGeometry(.1,.12,6,6);pole.translate(0,fh,-3);upper.push(col(pole,'#4b3624'));const flag=new THREE.BoxGeometry(.05,1.8,3);flag.translate(0,fh+2,-1.5);roof.push(col(flag,'#ffffff'))}
    // a well and a hay stack in the yard, a stable roof along the right wall for the horses
    {const wl=tcyl(1.1,1.2,1,12,ST);wl.translate(-9,.5,-10);lower.push(wl);const wr=new THREE.TorusGeometry(1.15,.12,6,14).rotateX(Math.PI/2);wr.translate(-9,1.02,-10);lower.push(col(wr,CAP));
      for(const sx of[-1,1]){const po=new THREE.BoxGeometry(.18,2.2,.18);po.translate(-9+sx*1.1,1.6,-10);lower.push(col(po,'#5a3f22'))}{const bm=new THREE.BoxGeometry(2.5,.16,.16);bm.translate(-9,2.6,-10);lower.push(col(bm,'#5a3f22'));const rf2=new THREE.ConeGeometry(1.7,.9,4);rf2.rotateY(Math.PI/4);rf2.translate(-9,3.1,-10);roof.push(col(rf2,'#8a5a36'))}
      const hb=new THREE.CylinderGeometry(1.2,1.4,1.6,10);hb.translate(-11.5,.8,1.5);lower.push(col(hb,'#c9a84a'));const ht=new THREE.ConeGeometry(1.25,.7,10);ht.translate(-11.5,1.95,1.5);lower.push(col(ht,'#d8b85a'));
      segs.push(...[[-9,-10,1.55],[-11.5,1.5,1.7]].map(([x,z,r])=>{const w=W(x,z);return[w.x,w.z,w.x,w.z,r]}))}
    {const rf=new THREE.BoxGeometry(4,.2,16);rf.rotateZ(.25);rf.translate(L-2.6,4.2,-2);upper.push(col(rf,'#7a5634'));for(const z of[-9.5,-2,5.5]){const pst=new THREE.CylinderGeometry(.12,.12,3.6,5);pst.translate(L-4.4,1.8,z);lower.push(col(pst,'#5a3f22'))}}
    // when a castle falls its stones pile up along the inside of the walls (never across the gate); every heap is solid
    const rub=[],rsegs=[];let rs=C.k*31+7;const R=()=>(rs=(rs*16807)%2147483647)/2147483647;for(let k=0;k<30;k++){const sd=k%4,u=(R()*2-1)*(L-4),dpt=L-2.2-R()*1.6;let x,z;if(sd===0){x=u;z=-dpt}else if(sd===1){x=dpt;z=u}else if(sd===2){x=-dpt;z=u}else{x=u;z=dpt;if(Math.abs(x)<6)continue}
      const sz=.7+R()*1.2,g=new THREE.DodecahedronGeometry(sz,0);g.scale(1,.7,1);g.translate(x,sz*.35,z);rub.push(col(g,R()<.5?'#8a847a':'#9b9488'));const w=W(x,z);rsegs.push([w.x,w.z,w.x,w.z,sz*.85])}
    const mk=(arr,mat)=>{const g=merge(arr,true);const m=new THREE.Mesh(g,mat);m.position.set(C.x,C.y-.3,C.z);m.rotation.y=C.a;m.scale.y=CSY;m.castShadow=m.receiveShadow=true;S.scene.add(m);return m};
    const lo=mk(lower,stoneM),up=mk(upper,stoneM),rm=new THREE.MeshLambertMaterial({vertexColors:true,color:'#9a9a9a'}),ro=mk(roof,seeThrough(rm,'roof')),ru=mk(rub,new THREE.MeshLambertMaterial({vertexColors:true}));ru.visible=false;
    // the treasure chest stands against the left wall, facing into the yard; ten places for horses: five under the stable roof, five more in front
    const gate=W(0,L+5),yard=W(0,6),ch=W(-L+2.1,9),stable=[0,1,2,3,4,5,6,7,8,9].map(i=>{const w=W(i<5?L-4.2:L-7.4,-9+(i%5)*3.6);return{x:w.x,z:w.z,a:C.a-Math.PI/2}});segs.push([ch.x,ch.z,ch.x,ch.z,1])
    up.userData.m0=stoneM;lo.userData.m0=stoneM;
    list.push({...C,lo,up,ro,ru,rm,segs,gate,yard,W,v,tops:tops.map(t=>{const w=W(t.x,t.z);return{x:w.x,y:C.y-.3+t.y*CSY,z:w.z}}),chest:{x:ch.x,z:ch.z,a:C.a+Math.PI/2},stable,rsegs})}
  // the treasure chests, one in each castle yard, and the gold heaped in them
  // a strongbox: oak planks bound in dark iron, gilt corners, a lock plate and a ring handle on each side
  const IRON='#34343a',GILT='#d9b24a',BX=(w,h,d,x,y,z,c)=>col(new THREE.BoxGeometry(w,h,d).translate(x,y,z),c);
  const body=merge([BX(1.3,.75,.85,0,.375,0,'#7a4f2a'),...[.19,.39,.58].map(y=>BX(1.31,.025,.86,0,y,0,'#4e3119')),...[-.45,.45].map(x=>BX(.1,.77,.89,x,.385,0,IRON)),BX(1.34,.08,.89,0,.04,0,IRON),
    ...[[-1,-1],[1,-1],[-1,1],[1,1]].map(([sx,sz])=>BX(.14,.2,.14,sx*.6,.1,sz*.38,GILT)),BX(.3,.3,.04,0,.52,.44,GILT),BX(.08,.12,.05,0,.47,.47,'#1a1a1a'),
    ...[-1,1].map(sx=>col(new THREE.TorusGeometry(.11,.025,5,10).rotateY(Math.PI/2).translate(sx*.68,.45,0),IRON))]);
  const lid=merge([col(new THREE.CylinderGeometry(.43,.43,1.3,8,1,false,0,Math.PI).rotateZ(Math.PI/2).rotateX(Math.PI/2),'#86592f'),...[-.45,.45].map(x=>col(new THREE.CylinderGeometry(.455,.455,.1,8,1,false,0,Math.PI).rotateZ(Math.PI/2).rotateX(Math.PI/2).translate(x,0,0),IRON)),col(new THREE.BoxGeometry(.14,.2,.2).translate(0,.1,.42),GILT)]);
  const gold=merge([...[0,1,2,3,4,5,6].map(k=>col(new THREE.CylinderGeometry(.14,.14,.05,10).translate(Math.cos(k*2.4)*.3,.78+(k%3)*.05,Math.sin(k*2.4)*.18),'#f2c33a')),col(new THREE.SphereGeometry(.45,10,6,0,6.283,0,1.2).scale(1.2,.45,.75).translate(0,.72,0),'#e6b42e')]);
  const cm=new THREE.MeshLambertMaterial({vertexColors:true}),gm=new THREE.MeshStandardMaterial({vertexColors:true,metalness:.6,roughness:.3,emissive:'#5a3a00',emissiveIntensity:.35});
  const CB=new THREE.InstancedMesh(body,cm,list.length),CL=new THREE.InstancedMesh(lid,cm,list.length),CG=new THREE.InstancedMesh(gold,gm,list.length);for(const m of[CB,CL,CG]){m.castShadow=true;m.frustumCulled=false;S.scene.add(m)}
  S.chestM={CB,CL,CG};S.castles=list;return list}
export function drawChests(gold){const {CB,CL,CG}=S.chestM;let g=0;S.castles.forEach((c,i)=>{const y=groundAt(c.chest.x,c.chest.z);q.setFromAxisAngle(UP,c.chest.a);m4.compose(vp.set(c.chest.x,y,c.chest.z),q,vs.set(1,1,1));CB.setMatrixAt(i,m4);
  const open=gold[i]>0;const lm=new THREE.Matrix4().makeTranslation(0,.75,-.43).multiply(new THREE.Matrix4().makeRotationX(open?-1.9:0)).multiply(new THREE.Matrix4().makeTranslation(0,0,.43));     /* the lid swings back on its hinge */CL.setMatrixAt(i,m4.clone().multiply(lm));if(open)CG.setMatrixAt(g++,m4)});
  CG.count=g;for(const m of[CB,CL,CG])m.instanceMatrix.needsUpdate=true}
// f: 1 solid .. ~.15 nearly clear (the walls and roofs between the camera and the commander)
export function castleFade(k,f){return;const c=S.castles[k];if(!c.upT){c.upT=c.up.material.clone();c.upT.transparent=true;c.upT.depthWrite=false;c.roT=c.rm.clone();c.roT.transparent=true;c.roT.depthWrite=false;c.loT=c.upT}
  const see=f<.97;c.up.material=see?c.upT:c.up.userData.m0;c.ro.material=see?c.roT:c.rm;c.upT.opacity=f;c.roT.opacity=f;c.roT.color.copy(c.rm.color);c.up.castShadow=true}
export function castleLook(k,colr,ruined){const c=S.castles[k];c.rm.color.copy(colr);c.up.visible=!ruined;c.ro.visible=!ruined;c.ru.visible=!!ruined;c.lo.scale.y=(ruined?.55:1)*CSY}

// ---------- the closing ring: a tall shimmering wall, a square with rounded corners, that closes in on a different place every match ----------
// one strip of points round the four corner arcs; the shader puts each point where the square of this moment has it
export function makeZone(){const P=[],A=[],I=[],N=12;let k=0;
  for(const[sx,sz,a0]of[[1,1,0],[-1,1,Math.PI/2],[-1,-1,Math.PI],[1,-1,Math.PI*1.5]])for(let i=0;i<=N;i++){const a=a0+i/N*Math.PI/2;for(const y of[0,1]){P.push(0,y,0);A.push(sx,sz,a)}k++}
  for(let i=0;i<k;i++){const a=i*2,b=((i+1)%k)*2;I.push(a,b,a+1,b,b+1,a+1)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('aC',new THREE.Float32BufferAttribute(A,3));g.setIndex(I);
  const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,fog:false,uniforms:{t:{value:0},uZ:{value:new THREE.Vector4(0,0,1000,60)}},
    vertexShader:'attribute vec3 aC;uniform vec4 uZ;varying vec2 vU;void main(){float r=uZ.w,h=uZ.z;vec2 p=uZ.xy+vec2(aC.x,aC.y)*(h-r)+r*vec2(cos(aC.z),sin(aC.z));vec4 w=vec4(p.x,-30.+position.y*170.,p.y,1.);vU=vec2((p.x+p.y)*.05,position.y);gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader:'uniform float t;varying vec2 vU;void main(){float s=.5+.5*sin(vU.x*3.+t*1.6+vU.y*14.);float a=(.2+.14*s)*(1.-smoothstep(.5,1.,vU.y))+.25*smoothstep(.05,0.,vU.y);gl_FragColor=vec4(.62,.22,.78,a);}'});
  const w=new THREE.Mesh(g,m);w.renderOrder=5;w.frustumCulled=false;S.scene.add(w);S.zone={w,m}}
export function drawZone(z,t){const {w,m}=S.zone;m.uniforms.t.value=t;w.visible=z.h<HALF-20;m.uniforms.uZ.value.set(z.cx,z.cz,Math.max(z.h,.5),z.r)}

// ---------- bolts, chips, a ring under the target ----------
export function makeFx(){
  const bolt=new THREE.InstancedMesh(merge([col(new THREE.CylinderGeometry(.03,.03,1,4).rotateX(Math.PI/2),'#6b4a2e'),col(new THREE.ConeGeometry(.07,.2,4).rotateX(Math.PI/2).translate(0,0,.55),'#cfd3d6')]),new THREE.MeshLambertMaterial({vertexColors:true}),280);bolt.count=0;bolt.frustumCulled=false;S.scene.add(bolt);
  const chip=new THREE.InstancedMesh(new THREE.BoxGeometry(.13,.13,.13),new THREE.MeshLambertMaterial({color:'#fff'}),400);chip.count=0;chip.frustumCulled=false;chip.setColorAt(0,new THREE.Color('#fff'));S.scene.add(chip);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.9,1.1,32).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:'#ffe08a',transparent:true,opacity:.7,depthWrite:false}));ring.visible=false;S.scene.add(ring);
  const mark=new THREE.Mesh(new THREE.RingGeometry(1.4,2,40).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.8,depthWrite:false}));mark.visible=false;S.scene.add(mark);
  S.fx={bolt,chip,chips:[],ring,mark}}
export function chips(x,y,z,c,n,sp=3){const L=S.fx.chips;for(let i=0;i<n;i++){if(L.length>=400)L.shift();L.push({x,y,z,vx:(Math.random()-.5)*sp,vy:2+Math.random()*sp,vz:(Math.random()-.5)*sp,t:0,c:new THREE.Color(c)})}}
export function drawChips(dt){const F=S.fx,L=F.chips;let k=0;for(let i=L.length-1;i>=0;i--){const p=L[i];p.t+=dt;if(p.t>1.1){L.splice(i,1);continue}p.vy-=14*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;const g=groundAt(p.x,p.z);if(p.y<g){p.y=g;p.vy*=-.3;p.vx*=.6;p.vz*=.6}}
  for(const p of L){m4.compose(vp.set(p.x,p.y,p.z),q.setFromAxisAngle(UP,p.t*7),vs.setScalar(1-p.t*.6));F.chip.setMatrixAt(k,m4);F.chip.setColorAt(k,p.c);k++}vs.set(1,1,1);F.chip.count=k;F.chip.instanceMatrix.needsUpdate=true;if(F.chip.instanceColor)F.chip.instanceColor.needsUpdate=true}

export function mapImage(n){const c=document.createElement('canvas');c.width=c.height=n;const g=c.getContext('2d'),id=g.createImageData(n,n);
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){const x=-HALF+(i+.5)*HALF*2/n,z=-HALF+(j+.5)*HALF*2/n,h=height(x,z),sl=Math.hypot(height(x+2,z)-height(x-2,z),height(x,z+2)-height(x,z-2))/4;let c3=groundCol(x,z,h,sl);if(h<0)c3=[.25,.5,.68];
    const sh=clamp(1+(height(x-4,z-4)-h)*.06,.6,1.3),k=(j*n+i)*4;id.data[k]=Math.min(255,c3[0]*255*sh);id.data[k+1]=Math.min(255,c3[1]*255*sh);id.data[k+2]=Math.min(255,c3[2]*255*sh);id.data[k+3]=255}
  g.putImageData(id,0,0);return c}
