/* Büyük Harita — the horses: the Quaternius "Farm Animals" horse (CC0), baked frame by frame (model/at.bin),
   one instanced mesh per frame, each frame blended smoothly into the next on the graphics card.
   The coat takes each horse's own colour; mane, hooves, saddle and blanket keep theirs.
   seat[clip][frame] = [height, forward offset, pitch] of the saddle, so the rider rides with the horse's motion. */
import * as THREE from 'three';
const RIM='{float rim=pow(1.-clamp(dot(normal,normalize(vViewPosition)),0.,1.),2.6);outgoingLight+=rim*.3*vec3(1.,.93,.8)*(.5+.5*diffuseColor.rgb);}\n';
const LOOP={idle:1,walk:1,run:1,graze:1};
export async function loadHorses(scene,CAP,V){
  const r=await fetch('model/at.bin?v='+V);if(!r.ok)throw new Error('at.bin');const buf=await r.arrayBuffer(),dv=new DataView(buf),jl=dv.getUint32(0,true),pad=a=>a+((4-a%4)%4);
  const h=JSON.parse(new TextDecoder().decode(new Uint8Array(buf,4,jl)));let o=4+pad(jl);const nv=h.nv;
  const C8=new Uint8Array(buf,o,nv*3);o+=pad(nv*3);const K8=new Uint8Array(buf,o,nv);o+=pad(nv);
  const colA=new THREE.BufferAttribute(Float32Array.from(C8,x=>Math.pow(x/255,2.2)),3),keepA=new THREE.BufferAttribute(Float32Array.from(K8),1);
  const mat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.62,metalness:0,flatShading:false});
  mat.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute float aKeep;attribute vec3 p2;attribute vec3 n2;attribute float aBl;varying float vKeep;')
    .replace('#include <beginnormal_vertex>','vec3 objectNormal=normalize(mix(normal,n2,aBl));\n#ifdef USE_TANGENT\nvec3 objectTangent=vec3(tangent.xyz);\n#endif')
    .replace('#include <begin_vertex>','vec3 transformed=mix(position,p2,aBl);')
    // the coat: vertex colour times the horse's own colour; the rest keeps its own colour
    .replace('#include <color_vertex>','#include <color_vertex>\nvKeep=aKeep;\n#ifdef USE_INSTANCING_COLOR\nvColor.rgb=mix(color.rgb*instanceColor.rgb,color.rgb,aKeep);\n#endif');
    sh.fragmentShader=sh.fragmentShader.replace('#include <opaque_fragment>',RIM+'#include <opaque_fragment>')};
  const dm=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});dm.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 p2;attribute float aBl;').replace('#include <begin_vertex>','vec3 transformed=mix(position,p2,aBl);')};
  const clips={};
  for(const k of h.order){const n=h.clips[k].n,ms=[];
    for(let f=0;f<n;f++){const a=new Int16Array(buf,o,nv*3);o+=pad(nv*6);const P=new Float32Array(nv*3);for(let i=0;i<P.length;i++)P[i]=a[i]*h.q;
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(P,3));g.setAttribute('color',colA);g.setAttribute('aKeep',keepA);g.computeVertexNormals();g.computeBoundingSphere();
      g.setAttribute('aBl',new THREE.InstancedBufferAttribute(new Float32Array(CAP),1));
      const m=new THREE.InstancedMesh(g,mat,CAP);m.customDepthMaterial=dm;m.castShadow=true;m.frustumCulled=false;m.count=0;m.visible=false;m.setColorAt(0,new THREE.Color('#fff'));m.userData.n=0;scene.add(m);ms.push(m)}
    ms.forEach((m,i)=>{const nx=ms[LOOP[k]?(i+1)%n:Math.min(n-1,i+1)].geometry;m.geometry.setAttribute('p2',nx.attributes.position);m.geometry.setAttribute('n2',nx.attributes.normal)});
    clips[k]=ms}
  // ph: 0..1 through the clip. Returns the saddle [height, forward, pitch] at that moment, for the rider
  const S3=[0,0,0];
  function push(clip,ph,m4,coat){const cl=clips[clip]||clips.idle,sd=h.seat[clips[clip]?clip:'idle'],n=cl.length,x=(LOOP[clip]?((ph%1)+1)%1:Math.min(.999,Math.max(0,ph)))*n,f=Math.min(n-1,Math.floor(x)),b=x-f,f2=LOOP[clip]?(f+1)%n:Math.min(n-1,f+1);
    for(let k=0;k<3;k++)S3[k]=sd[f][k]+(sd[f2][k]-sd[f][k])*b;
    const m=cl[f],i=m.userData.n;if(i>=CAP)return S3;m.userData.n++;m.setMatrixAt(i,m4);m.setColorAt(i,coat);m.geometry.attributes.aBl.array[i]=b;return S3}
  function flush(){for(const k in clips)for(const m of clips[k]){const n=m.userData.n,was=m.count;m.count=n;m.visible=n>0;if(n||was){m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;m.geometry.attributes.aBl.needsUpdate=true}m.userData.n=0}}
  return{push,flush,seat:h.seat}}
