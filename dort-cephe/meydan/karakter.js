/* Büyük Harita — the knights: baked KayKit characters (CC0), every animation frame one instanced mesh,
   so twenty fighters cost only a handful of draw calls. Same format as the main game's model/*.bin. */
import * as THREE from 'three';
export const SINIF=['sovalye','okcu','madenci','oduncu'];
const TEX={sovalye:'knight',okcu:'rogue',madenci:'barbarian',oduncu:'barbarian'};
export const CHR={};const CAP=24;
const RIM='{float rim=pow(1.-clamp(dot(normal,normalize(vViewPosition)),0.,1.),2.6);outgoingLight+=rim*.34*vec3(1.,.93,.8)*(.5+.5*diffuseColor.rgb);}\n';
function chrMat(tex,V){const m=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.72,metalness:.05});
  const t=new THREE.TextureLoader().load('model/'+tex+'_texture.png?v='+V);t.colorSpace=THREE.SRGBColorSpace;t.flipY=false;t.magFilter=THREE.NearestFilter;t.minFilter=THREE.LinearMipmapLinearFilter;m.map=t;
  m.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute float aTeam;varying float vTeam;varying vec3 vTint;').replace('#include <begin_vertex>','#include <begin_vertex>\nvTeam=aTeam;\n#ifdef USE_INSTANCING_COLOR\nvTint=instanceColor.rgb;\n#else\nvTint=vec3(1.);\n#endif\n');
    // the cloak (or hat) takes the player's own colour; a hit flashes the whole figure white for a moment (tint above 1)
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying float vTeam;varying vec3 vTint;').replace('#include <color_fragment>','{vec3 tc=min(vTint,vec3(1.));float fl=max(0.,max(vTint.r,max(vTint.g,vTint.b))-1.);diffuseColor.rgb=mix(diffuseColor.rgb,mix(vec3(dot(diffuseColor.rgb,vec3(.3,.59,.11))),diffuseColor.rgb,.25)*tc*1.9,vTeam);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.,.95,.9),clamp(fl,0.,.8));}').replace('#include <opaque_fragment>',RIM+'#include <opaque_fragment>')};
  return m}
export async function loadChr(scene,key,V){
  const r=await fetch('model/m_'+key+'.bin?v='+V);if(!r.ok)throw new Error('model '+key);const buf=await r.arrayBuffer(),dv=new DataView(buf),jl=dv.getUint32(0,true),pad=a=>a+((4-a%4)%4);
  const h=JSON.parse(new TextDecoder().decode(new Uint8Array(buf,4,jl)));let o=4+pad(jl);const nv=h.nv;
  const IA=h.big?new Uint32Array(buf,o,h.ni):new Uint16Array(buf,o,h.ni);o+=pad(IA.byteLength);const UV=new Float32Array(buf,o,nv*2);o+=UV.byteLength;const TM=new Uint8Array(buf,o,nv);o+=pad(nv);if(h.hasCol)o+=pad(nv*3);
  const iA=new THREE.BufferAttribute(new (h.big?Uint32Array:Uint16Array)(IA),1),uvA=new THREE.BufferAttribute(new Float32Array(UV),2),tA=new THREE.BufferAttribute(Float32Array.from(TM),1);
  const mat=chrMat(TEX[key],V),clips={};
  for(const k of h.order){const c=h.clips[k],ms=[];for(let f=0;f<c.n;f++){const a=new Int16Array(buf,o,nv*3);o+=pad(nv*6);const P3=new Float32Array(nv*3);for(let i=0;i<P3.length;i++)P3[i]=a[i]*h.q;
      const g=new THREE.BufferGeometry();g.setIndex(iA);g.setAttribute('position',new THREE.BufferAttribute(P3,3));g.setAttribute('uv',uvA);g.setAttribute('aTeam',tA);g.computeVertexNormals();g.computeBoundingSphere();
      const m=new THREE.InstancedMesh(g,mat,CAP);m.castShadow=true;m.frustumCulled=false;m.count=0;m.visible=false;m.setColorAt(0,new THREE.Color('#fff'));m.userData.n=0;scene.add(m);ms.push(m)}
    clips[k]=ms}
  CHR[key]={clips}}
// ph: 0..1 through the clip (looping clips wrap, one-shot clips are clamped by the caller)
export function chrPush(key,clip,ph,m4,col){const C=CHR[key];if(!C)return false;const cl=C.clips[clip]||C.clips.idle;const f=Math.min(cl.length-1,Math.floor(((ph%1)+1)%1*cl.length)),m=cl[f];const i=m.userData.n;if(i>=CAP)return true;m.userData.n++;m.setMatrixAt(i,m4);m.setColorAt(i,col);return true}
export function chrFlush(){for(const k in CHR)for(const cl of Object.values(CHR[k].clips))for(const m of cl){const n=m.userData.n,was=m.count;m.count=n;m.visible=n>0;if(n||was){m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true}m.userData.n=0}}
