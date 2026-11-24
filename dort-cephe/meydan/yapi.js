/* Büyük Harita — landmarks that make the land feel lived in: wooden watchtowers on the rises, windmills turning on the
   hills, camps of tents round a smoking fire, and old rings of standing stones. Where they stand comes from the match seed.
   Every one of them is solid (you walk round, never through) and nothing grows inside them. */
import * as THREE from 'three';
import {HALF,height,slope,lakeK,edgeK,rng,CASTLES} from './dunya.js?v=20261124a';
import {S,groundAt,merge,col,tbox,tcyl,seeThrough} from './sahne.js?v=20261124a';

const box=(w,h,d,x,y,z,c,ry=0)=>{const g=new THREE.BoxGeometry(w,h,d);if(ry)g.rotateY(ry);g.translate(x,y,z);return col(g,c)};
const cyl=(r1,r2,h,n,x,y,z,c)=>col(new THREE.CylinderGeometry(r1,r2,h,n).translate(x,y,z),c);
const WOOD='#6b4a2e',DARK='#4a321e',STONE='#9a948a',CLOTH=['#c9b48a','#a8553a','#6f7f4a','#b9a27a'];

export function makeLandmarks(seed,avoid){
  const R=rng((seed^0x1a2b3c)>>>0),out=[];let guard=0;
  const want={kule:9,degirmen:6,kamp:9,tas:5};
  for(const kind of Object.keys(want))for(let n=0;n<want[kind]&&guard<40000;){guard++;
    const x=(R()-.5)*(HALF*2-340),z=(R()-.5)*(HALF*2-340),h=height(x,z);
    if(h<3||h>85||slope(x,z)>(kind==='kamp'?.18:.26)||lakeK(x,z)>0||edgeK(x,z)>.02)continue;
    if(CASTLES.some(c=>Math.hypot(c.x-x,c.z-z)<60))continue;if(avoid.some(o=>Math.hypot(o.x-x,o.z-z)<45))continue;if(out.some(o=>Math.hypot(o.x-x,o.z-z)<90))continue;
    // windmills want a rise, watchtowers a view: prefer higher ground for them
    if((kind==='degirmen'||kind==='kule')&&h<12&&R()<.7)continue;
    out.push({x,z,kind,a:R()*6.283,segs:[],r:kind==='kamp'?11:kind==='tas'?9:kind==='degirmen'?5:4});n++}
  const parts={wood:[],stone:[],cloth:[]},spin=[];
  for(const o of out){const c=Math.cos(o.a),s=Math.sin(o.a),W=(lx,lz)=>({x:o.x+lx*c+lz*s,z:o.z-lx*s+lz*c});
    // set everything a little into the slope, at the lowest ground under its footprint
    let y=1e9;for(let k=0;k<8;k++){const a=k/8*6.283;y=Math.min(y,groundAt(o.x+Math.cos(a)*o.r*.6,o.z+Math.sin(a)*o.r*.6))}y=Math.min(y,groundAt(o.x,o.z))-.1;o.y=y;
    const put=(arr,g)=>{g.rotateY(o.a);g.translate(o.x,y,o.z);arr.push(g)};const solid=(lx,lz,r)=>{const p=W(lx,lz);o.segs.push([p.x,p.z,p.x,p.z,r])};
    if(o.kind==='kule'){     // a timber watchtower: four legs braced crosswise, a fenced platform, a pointed roof
      for(const[sx,sz]of[[-1,-1],[1,-1],[1,1],[-1,1]]){put(parts.wood,box(.35,9,.35,sx*1.7,4.5,sz*1.7,WOOD));solid(sx*1.7,sz*1.7,.45)}
      for(const h of[2.5,5.5])for(const[a,b,ry]of[[0,-1.7,0],[0,1.7,0],[-1.7,0,Math.PI/2],[1.7,0,Math.PI/2]]){const g=box(.14,.14,4.6,a,h,b,DARK,ry);g.rotateX(0);put(parts.wood,g)}
      put(parts.wood,box(4.4,.25,4.4,0,9,0,WOOD));for(const[a,b,ry]of[[0,-2.1,0],[0,2.1,0],[-2.1,0,Math.PI/2],[2.1,0,Math.PI/2]])put(parts.wood,box(4.2,.9,.12,a,9.6,b,DARK,ry));
      for(const[sx,sz]of[[-1,-1],[1,-1],[1,1],[-1,1]])put(parts.wood,box(.18,2.6,.18,sx*1.9,10.4,sz*1.9,WOOD));
      {const r=new THREE.ConeGeometry(3.4,2.4,4);r.rotateY(Math.PI/4);r.translate(0,12.9,0);put(parts.cloth,col(r,'#7a5634'))}
      {const l=box(.6,7.5,.1,0,4.6,2.2,DARK);l.rotateX(-.22);put(parts.wood,l)}}
    else if(o.kind==='degirmen'){     // a stone windmill: a round tower narrowing upwards, a cap, four sails that turn
      put(parts.stone,tcyl(2.6,3.4,9,14,'#e6e0d4'));parts.stone[parts.stone.length-1].translate(0,4.5,0);
      {const g=new THREE.ConeGeometry(3,2.6,14);g.translate(0,10.3,0);put(parts.cloth,col(g,'#8a5a36'))}
      put(parts.wood,box(1.2,2,.2,0,1,3.15,DARK));put(parts.wood,box(.8,.9,.15,0,5.5,3,'#2a2420'));solid(0,0,3.5);
      spin.push({o,y:y+8.6});}
    else if(o.kind==='kamp'){     // a camp: tents round a fire of logs ringed with stones, a rack, a few crates
      const n=3+(o.x*7|0)%2;for(let k=0;k<n;k++){const a=k/n*6.283+.4,d=6,tx=Math.cos(a)*d,tz=Math.sin(a)*d,cl=CLOTH[k%CLOTH.length];
        const t=new THREE.ConeGeometry(2.3,3.2,6);t.translate(0,1.6,0);t.rotateY(a);t.translate(tx,0,tz);put(parts.cloth,col(t,cl));
        const pole=box(.1,3.8,.1,tx,1.9,tz,WOOD);put(parts.wood,pole);solid(tx,tz,2.3)}
      for(let k=0;k<8;k++){const a=k/8*6.283,g=new THREE.DodecahedronGeometry(.28,0);g.translate(Math.cos(a)*1,.15,Math.sin(a)*1);put(parts.stone,col(g,STONE))}
      for(let k=0;k<3;k++){const g=new THREE.CylinderGeometry(.13,.13,1.5,6);g.rotateZ(Math.PI/2);g.rotateY(k*2.1);g.translate(0,.2,0);put(parts.wood,col(g,DARK))}solid(0,0,1.2);
      put(parts.wood,box(.9,.7,.9,2.6,.35,-2.4,'#8a6a40'));put(parts.wood,box(.7,.6,.7,3.3,.3,-1.6,'#7a5a34'));solid(2.9,-2,1);
      o.fire=W(0,0)}
    else{     // a ring of standing stones, two of them capped by a lintel
      const n=7;for(let k=0;k<n;k++){const a=k/n*6.283,d=6.5,h=3+((k*37+(o.x|0))%5)*.35,g=new THREE.BoxGeometry(1.1,h,.7);g.rotateY(-a+Math.PI/2);g.rotateZ(((k*13)%7-3)*.02);g.translate(Math.cos(a)*d,h/2-.3,Math.sin(a)*d);put(parts.stone,col(g,k%2?'#8f8a80':'#a39d92'));solid(Math.cos(a)*d,Math.sin(a)*d,.8)}
      {const a0=0,a1=6.283/7,g=new THREE.BoxGeometry(1,.6,3.4);const mx=(Math.cos(a0)+Math.cos(a1))/2*6.5,mz=(Math.sin(a0)+Math.sin(a1))/2*6.5;g.rotateY(-(a0+a1)/2);g.translate(mx,3.4,mz);put(parts.stone,col(g,'#8f8a80'))}
      {const g=new THREE.BoxGeometry(2.4,.5,1.4);g.translate(0,.25,0);put(parts.stone,col(g,'#8a847a'));solid(0,0,1.3)}}}
  const mat=seeThrough(new THREE.MeshLambertMaterial({vertexColors:true}),'lmk');
  for(const k in parts){if(!parts[k].length)continue;const m=new THREE.Mesh(merge(parts[k]),mat);m.castShadow=m.receiveShadow=true;S.scene.add(m)}
  // the sails: one instanced cross per mill, turned every frame
  const sail=merge([...[0,1,2,3].map(i=>{const g=new THREE.BoxGeometry(.5,5.4,.08);g.translate(0,2.9,0);const f=new THREE.BoxGeometry(1.4,4,.04);f.translate(.9,3.3,0);const m=merge([col(g,DARK),col(f,'#e8dcc4')]);m.rotateZ(i*Math.PI/2);return m}),col(new THREE.CylinderGeometry(.35,.35,.8,8).rotateX(Math.PI/2),DARK)]);
  const SM=new THREE.InstancedMesh(sail,mat,Math.max(1,spin.length));SM.castShadow=true;SM.count=spin.length;S.scene.add(SM);
  const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),q2=new THREE.Quaternion(),v=new THREE.Vector3(),one=new THREE.Vector3(1,1,1),UP=new THREE.Vector3(0,1,0),Z=new THREE.Vector3(0,0,1);
  return{list:out,fires:out.filter(o=>o.fire).map(o=>o.fire),tick(t){spin.forEach((s,i)=>{const o=s.o;q.setFromAxisAngle(UP,o.a);q2.setFromAxisAngle(Z,t*.9+i);q.multiply(q2);v.set(o.x+Math.sin(o.a)*3.4,s.y,o.z+Math.cos(o.a)*3.4);m4.compose(v,q,one);SM.setMatrixAt(i,m4)});SM.instanceMatrix.needsUpdate=true}}}
