/* Büyük Harita — the fighters: baked KayKit characters (CC0), every animation frame one instanced mesh,
   blended smoothly into the next frame on the graphics card. The cloak takes the player's colour; weapons and
   armour shine brighter, then gold, as they are upgraded. Same file format as the main game's model/*.bin. */
import * as THREE from 'three';
const TEX={sovalye:'knight',okcu:'rogue',binici:'knight',atliokcu:'rogue'};
export const CHR={};const CAP=64;
const LOOP={idle:1,run:1,fall:1,walk:1};
const RIM='{float rim=pow(1.-clamp(dot(normal,normalize(vViewPosition)),0.,1.),2.6);outgoingLight+=rim*.3*vec3(1.,.93,.8)*(.5+.5*diffuseColor.rgb);}\n';
const MIXV=sh=>sh.vertexShader.replace('#include <beginnormal_vertex>','vec3 objectNormal=normalize(mix(normal,n2,aBl));\n#ifdef USE_TANGENT\nvec3 objectTangent=vec3(tangent.xyz);\n#endif').replace('#include <begin_vertex>','vec3 transformed=mix(position,p2,aBl);');
export const RIDER_CUT={value:.62},ARCHER_CUT={value:.8};
function chrMat(tex,V,cut){const m=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.68,metalness:.05});
  const t=new THREE.TextureLoader().load('model/'+tex+'_texture.png?v='+V);t.colorSpace=THREE.SRGBColorSpace;t.flipY=false;t.magFilter=THREE.LinearFilter;t.anisotropy=4;t.minFilter=THREE.LinearMipmapLinearFilter;m.map=t;
  m.onBeforeCompile=sh=>{sh.uniforms.uT={value:0};m.userData.T=sh.uniforms.uT;if(cut)sh.uniforms.uCut=cut===2?ARCHER_CUT:RIDER_CUT;
    sh.vertexShader=MIXV(sh).replace('#include <common>','#include <common>\nattribute float aTeam;attribute vec3 p2;attribute vec3 n2;attribute float aBl;attribute vec2 aLv;varying float vTeam;varying vec3 vTint;varying vec2 vLv;varying vec3 vObj;')
      .replace('vec3 transformed=mix(position,p2,aBl);','vec3 transformed=mix(position,p2,aBl);vTeam=aTeam;vLv=aLv;vObj=transformed;\n#ifdef USE_INSTANCING_COLOR\nvTint=instanceColor.rgb;\n#else\nvTint=vec3(1.);\n#endif\n');
    sh.fragmentShader=sh.fragmentShader.replace('void main() {','void main() {\nif(vLv.x<.5&&vTeam>1.5)discard;'+(cut?'\nif(vObj.y<uCut)discard;':'')).replace('#include <common>','#include <common>\nuniform float uT;'+(cut?'uniform float uCut;':'')+'varying float vTeam;varying vec3 vTint;varying vec2 vLv;varying vec3 vObj;vec3 lvGlow=vec3(0.);vec2 wRM=vec2(-1.);float wpnK=0.;')
      .replace('#include <color_fragment>',`{vec3 tc=min(vTint,vec3(1.));float fl=max(0.,max(vTint.r,max(vTint.g,vTint.b))-1.);vec3 c=diffuseColor.rgb;float lum=dot(c,vec3(.3,.59,.11));
        float team=step(.5,vTeam)*step(vTeam,1.5),wpn=step(1.5,vTeam),sat=max(c.r,max(c.g,c.b))-min(c.r,min(c.g,c.b));
        c=mix(c,mix(vec3(lum),c,.25)*tc*1.9,team);
        // upgrades: steel turns bright, then gilded, then glowing gold with a slow shimmer
        float metal=(1.-team)*(1.-wpn)*step(sat,.12)*step(.22,lum),sh=.5+.5*sin(uT*2.+vObj.y*6.+vObj.x*4.);
        vec3 gold=vec3(1.,.78,.3)*(.55+lum*.9),steel=vec3(.86,.9,.97)*(.45+lum*.8);
        float a=vLv.y,w=vLv.x;
        vec3 ac=a<.5?c:a<1.5?mix(c,steel,.6):a<2.5?mix(steel,gold,step(.5,fract(vObj.y*3.))*.8):gold;c=mix(c,ac,metal);
        // weapon level 1..10, from a rusty blade to a legend: 1 rust-spotted iron, 2 dull iron, 3 forged steel, 4 polished steel,
        // 5 damascus (wavy folded steel), 6 blued steel, 7 steel inlaid with gold, 8 gold, 9 ruby and gold that pulses, 10 violet with running runes
        vec3 blue=vec3(.42,.6,1.)*(.45+lum*.8),ruby=vec3(.95,.12,.16)*(.6+lum*.7),star=vec3(.72,.5,1.)*(.75+lum*.7);
        float nz=fract(sin(dot(floor(vObj*14.),vec3(12.9898,78.233,37.719)))*43758.5453);
        float dam=.5+.5*sin(vObj.y*46.+sin(vObj.x*31.+vObj.z*27.)*2.6);
        float rune=step(.82,fract(vObj.y*9.-uT*.9))*step(.35,fract(vObj.x*7.+vObj.z*5.));
        vec3 iron=vec3(.5,.5,.52)*(.5+lum*.6),rust=vec3(.45,.24,.12)*(.6+lum*.5);
        vec3 wc=w<1.5?mix(iron,rust,step(.55,nz)*.85):w<2.5?iron:w<3.5?steel*.9:w<4.5?steel*1.08:w<5.5?mix(steel*.55,steel*1.1,dam):w<6.5?mix(blue,steel*1.1,step(.8,dam)):w<7.5?mix(steel,gold,step(.62,dam)):w<8.5?gold*1.12:w<9.5?mix(gold,ruby,.5+.25*dam):mix(star,vec3(1.,.95,1.),rune);
        c=mix(c,wc,wpn);wpnK=wpn;
        vec3 wg=w<5.5?vec3(0.):w<6.5?vec3(.25,.45,1.)*.12:w<7.5?vec3(1.,.7,.25)*.1:w<8.5?vec3(1.,.72,.28)*.28:w<9.5?vec3(1.,.15,.1)*(.35+.3*sin(uT*4.)):vec3(.7,.45,1.)*(.9+.6*rune);
        wRM=vec2(w<1.5?.95:w<2.5?.8:w<3.5?.55:w<4.5?.28:w<5.5?.35:w<6.5?.3:w<7.5?.3:w<8.5?.22:.2,w<2.5?.15:.4);
        lvGlow=wpn*wg*(.6+.8*sh)+metal*step(2.5,a)*vec3(1.,.75,.3)*.12*sh;
        diffuseColor.rgb=mix(c,vec3(1.,.95,.9),clamp(fl,0.,.8));}`)
      .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nif(wRM.x>=0.)roughnessFactor=mix(roughnessFactor,wRM.x,wpnK);').replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\nif(wRM.x>=0.)metalnessFactor=mix(metalnessFactor,wRM.y,wpnK);').replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=lvGlow;').replace('#include <opaque_fragment>',RIM+'#include <opaque_fragment>')};
  m.customProgramCacheKey=()=>'chr'+(cut||'');return m}
const DEPTH=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});DEPTH.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 p2;attribute float aBl;').replace('#include <begin_vertex>','vec3 transformed=mix(position,p2,aBl);')};
const MATS=[];export function chrTime(t){for(const m of MATS)if(m.userData.T)m.userData.T.value=t}
// the weapons (sword, shield, crossbow) are separate pieces of the model painted from one corner of the texture:
// find those pieces and mark them (2) so their look can follow the weapon level
function markWeapons(I,UV,T,nv,P){const par=new Int32Array(nv);for(let i=0;i<nv;i++)par[i]=i;const fd=a=>{while(par[a]!==a){par[a]=par[par[a]];a=par[a]}return a},un=(a,b)=>{a=fd(a);b=fd(b);if(a!==b)par[a]=b};
  for(let i=0;i<I.length;i+=3){un(I[i],I[i+1]);un(I[i],I[i+2])}const seen=new Map();for(let i=0;i<nv;i++){const k=P[i*3]+','+P[i*3+1]+','+P[i*3+2];const j=seen.get(k);if(j!=null)un(i,j);else seen.set(k,i)}
  const box=new Map();for(let i=0;i<nv;i++){const r=fd(i);let b=box.get(r);if(!b)box.set(r,b=[1,1,0,0,0]);b[0]=Math.min(b[0],UV[i*2]);b[1]=Math.min(b[1],UV[i*2+1]);b[2]=Math.max(b[2],UV[i*2]);b[3]=Math.max(b[3],UV[i*2+1]);b[4]++}
  for(let i=0;i<nv;i++){const b=box.get(fd(i));if(T[i]<.5&&b[4]<320&&b[0]>.385&&b[2]<.735&&b[1]>.245&&b[3]<.495)T[i]=2}}
export async function loadChr(scene,key,V){
  const r=await fetch('model/'+(key==='binici'?'binici_m':key==='atliokcu'?'m_okcu':'m_'+key)+'.bin?v='+V);if(!r.ok)throw new Error('model '+key);const buf=await r.arrayBuffer(),dv=new DataView(buf),jl=dv.getUint32(0,true),pad=a=>a+((4-a%4)%4);
  const h=JSON.parse(new TextDecoder().decode(new Uint8Array(buf,4,jl)));let o=4+pad(jl);const nv=h.nv;
  const IA=h.big?new Uint32Array(buf,o,h.ni):new Uint16Array(buf,o,h.ni);o+=pad(IA.byteLength);const UV=new Float32Array(buf,o,nv*2);o+=UV.byteLength;const TM=new Uint8Array(buf,o,nv);o+=pad(nv);if(h.hasCol)o+=pad(nv*3);
  const TMw=Float32Array.from(TM);markWeapons(IA,UV,TMw,nv,new Int16Array(buf,o,nv*3));
  const iA=new THREE.BufferAttribute(new (h.big?Uint32Array:Uint16Array)(IA),1),uvA=new THREE.BufferAttribute(new Float32Array(UV),2),tA=new THREE.BufferAttribute(TMw,1);
  const mat=chrMat(TEX[key],V,key==='binici'?1:key==='atliokcu'?2:0),clips={};MATS.push(mat);
  for(const k of h.order){const c=h.clips[k],ms=[];for(let f=0;f<c.n;f++){const a=new Int16Array(buf,o,nv*3);o+=pad(nv*6);const P3=new Float32Array(nv*3);for(let i=0;i<P3.length;i++)P3[i]=a[i]*h.q;
      const g=new THREE.BufferGeometry();g.setIndex(iA);g.setAttribute('position',new THREE.BufferAttribute(P3,3));g.setAttribute('uv',uvA);g.setAttribute('aTeam',tA);g.computeVertexNormals();g.computeBoundingSphere();
      g.setAttribute('aBl',new THREE.InstancedBufferAttribute(new Float32Array(CAP),1));g.setAttribute('aLv',new THREE.InstancedBufferAttribute(new Float32Array(CAP*2),2));
      const m=new THREE.InstancedMesh(g,mat,CAP);m.customDepthMaterial=DEPTH;m.castShadow=true;m.frustumCulled=false;m.count=0;m.visible=false;m.setColorAt(0,new THREE.Color('#fff'));m.userData.n=0;scene.add(m);ms.push(m)}
    // each frame knows the next one, to blend into it (a one-shot clip holds its last pose)
    ms.forEach((m,i)=>{const nx=ms[LOOP[k]?(i+1)%ms.length:Math.min(ms.length-1,i+1)].geometry;m.geometry.setAttribute('p2',nx.attributes.position);m.geometry.setAttribute('n2',nx.attributes.normal)});
    clips[k]=ms}
  CHR[key]={clips}}
// ph: 0..1 through the clip; lw: weapon level (1..10), la: armour level (0..3)
export function chrPush(key,clip,ph,m4,col,lw=1,la=0){const C=CHR[key];if(!C)return false;const cl=C.clips[clip]||C.clips.idle;const n=cl.length,x=(LOOP[clip]?((ph%1)+1)%1:Math.min(.999,Math.max(0,ph)))*n,f=Math.min(n-1,Math.floor(x)),m=cl[f];const i=m.userData.n;if(i>=CAP)return true;m.userData.n++;
  m.setMatrixAt(i,m4);m.setColorAt(i,col);const g=m.geometry;g.attributes.aBl.array[i]=x-f;g.attributes.aLv.array[i*2]=lw;g.attributes.aLv.array[i*2+1]=la;return true}
export function chrFlush(){for(const k in CHR)for(const cl of Object.values(CHR[k].clips))for(const m of cl){const n=m.userData.n,was=m.count;m.count=n;m.visible=n>0;if(n||was){m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;m.geometry.attributes.aBl.needsUpdate=true;m.geometry.attributes.aLv.needsUpdate=true}m.userData.n=0}}
