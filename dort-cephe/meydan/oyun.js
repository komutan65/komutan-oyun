/* Büyük Harita: up to twenty fighters drop from an airship onto a wide land, each a single knight of one of four kinds.
   They cut trees, break rock and ore, open the chests in the ruins, better their weapon and armour, and fight;
   a closing ring drives them together until one is left. Each screen runs its own fighter (the first player also runs the computer ones). */
import * as THREE from 'three';
import {HALF,height,slope,NODE,smooth,rng,edgeK} from './dunya.js';
import {S,makeScene,makeGround,updateGround,makeNodes,updateNodes,makeClutter,updateClutter,nodesNear,makePlaces,drawChests,makeZone,makeShip,makeFx,chips,drawChips,mapImage} from './sahne.js';
import {SINIF,loadChr,chrPush,chrFlush} from './karakter.js';
const V=new URL(import.meta.url).searchParams.get('v')||'1';
const {SES}=await import('../ses.js?v='+V);
const A=window.ARENA||{},EN=window.LANG==='en',TL=(t,e)=>EN?e:t;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t,$=id=>document.getElementById(id);
const angD=(a,b)=>{let d=b-a;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;return d};
const SMALL=Math.min(innerWidth,innerHeight)<700;

// ---------- the four kinds of fighter ----------
const CLS={
  sovalye:{ad:TL('Şövalye','Knight'),ik:'🛡️',hp:170,zr:.25,sp:5.6,dmg:20,cd:.8,rng:2.6,odun:.6,maden:.4,d:TL('Kılıç ve kalkan. En sağlam ve dövüşte en güçlüsü, ama taşı ve madeni çok yavaş kırar.','Sword and shield. Toughest and strongest in a fight, but very slow at breaking rock and ore.')},
  okcu:{ad:TL('Okçu','Archer'),ik:'🏹',hp:105,zr:.05,sp:6.4,dmg:7,cd:1,rng:2.2,ok:17,okR:38,odun:.55,maden:.35,d:TL('Uzaktan yay ile vurur, hızlıdır. Ok bitince odundan yenisini yapar. Yakın dövüşte zayıf.','Shoots from afar and runs fast. Makes new arrows from wood. Weak up close.')},
  madenci:{ad:TL('Madenci','Miner'),ik:'⛏️',hp:125,zr:.1,sp:5.8,dmg:13,cd:.7,rng:2.4,odun:.8,maden:2.2,d:TL('Kazmayla taşı ve madeni çok hızlı kırar, her damardan fazladan çıkarır. Silahını ve zırhını erkenden güçlendirir.','Breaks rock and ore very fast with a pickaxe, and gets extra from every vein. Upgrades early.')},
  oduncu:{ad:TL('Oduncu','Woodcutter'),ik:'🪓',hp:145,zr:.15,sp:6,dmg:17,cd:.9,rng:2.8,odun:2.2,maden:.6,d:TL('Büyük baltayla ağaçları hemen keser, odundan barikat kurar. Dövüşte de sağlamdır.','Fells trees at once with a great axe and builds barricades from wood. Good in a fight too.')}};
const ITEM={odun:'🪵',tas:'🪨',demir:'⛓️',altin:'🪙',meyve:'🍓',ok:'➶',iksir:'🧪'};
const ITEM_AD={odun:TL('odun','wood'),tas:TL('taş','stone'),demir:TL('demir','iron'),altin:TL('altın','gold'),meyve:TL('meyve','berries'),ok:TL('ok','arrows'),iksir:TL('iksir','potion')};
const RECIPE=[
  {k:'silah',ad:TL('Silahı güçlendir','Better weapon'),cost:l=>[{demir:3,odun:2},{demir:5,odun:2},{demir:6,altin:2}][l]},
  {k:'zirh',ad:TL('Zırhı güçlendir','Better armour'),cost:l=>[{demir:3,tas:4},{demir:5,tas:4},{demir:6,altin:2}][l]},
  {k:'ok',ad:TL('10 ok yap','Make 10 arrows'),cost:()=>({odun:2}),only:'okcu'},
  {k:'iksir',ad:TL('İksir yap (+55 can)','Brew a potion (+55 hp)'),cost:()=>({meyve:3})},
  {k:'barikat',ad:TL('Barikat kur','Build a barricade'),cost:()=>({odun:6,tas:2})}];
const NAMES=['Ayaz','Bora','Kaan','Selim','Oğuz','Doruk','Arda','Deniz','Yiğit','Batu','Efe','Mert','Eren','Kerem','Toprak','Çınar','Atlas','Tuna','Alp','Tarık','Poyraz','Rüzgar','Sarp','Umut'];
const COLS=[...Array(20)].map((_,i)=>new THREE.Color().setHSL(((i*137.508)%360)/360,.72,.5));
const PAL=['#c0392b','#e67e22','#f1c40f','#27ae60','#16a085','#2980b9','#8e44ad','#d35490','#ecf0f1','#2c3e50','#7f5539','#a0d468'].map(c=>new THREE.Color(c));

// ---------- match setup ----------
const seed=(A.seed>>>0)||((Math.random()*4294967295)>>>0),R=rng(seed);let T0=A.t0||Date.now()+1500;
const gtime=()=>(Date.now()-T0)/1000;     // seconds since the match began (the same on every screen)
const PICK_T=9,SHIP_T=48;                  // class pick, then the airship crossing
const ship=(()=>{const a=R()*6.283,o=(R()-.5)*500,dx=Math.cos(a),dz=Math.sin(a),px=-dz*o,pz=dx*o,L0=HALF-180;return{a:{x:px-dx*L0,z:pz-dz*L0},b:{x:px+dx*L0,z:pz+dz*L0},dx,dz,y:190}})();
const shipAt=t=>{const k=clamp((t-PICK_T)/SHIP_T,0,1);return{x:lerp(ship.a.x,ship.b.x,k),z:lerp(ship.a.z,ship.b.z,k),k}};
// the safe circle: it waits, then closes on a new centre inside itself, again and again
const ZP=[[95,50,780,1],[70,40,500,2],[60,35,310,3],[50,30,170,5],[40,25,85,8],[30,25,30,12],[25,30,0,16]];
const zones=(()=>{const Z=[{x:0,z:0,r:HALF*1.5,t:PICK_T+SHIP_T+10}];let t=Z[0].t;const zr=rng(seed^0x5bd1);
  for(const[w,s,r,d]of ZP){const p=Z[Z.length-1];let x=p.x,z=p.z;for(let k=0;k<60;k++){const a=zr()*6.283,m=Math.max(0,Math.min(p.r,HALF-100)-r)*Math.sqrt(zr()),cx=clamp(p.x+Math.cos(a)*m,-HALF+r+120,HALF-r-120),cz=clamp(p.z+Math.sin(a)*m,-HALF+r+120,HALF-r-120);if(height(cx,cz)>2&&edgeK(cx,cz)<.3){x=cx;z=cz;break}}
    Z[Z.length-1].w=w;Z.push({x,z,r,t:t+w+s,s,d});t+=w+s}return Z})();
function zoneNow(t){let i=0;while(i<zones.length-1&&t>=zones[i+1].t)i++;const a=zones[i],b=zones[i+1];if(!b)return{x:a.x,z:a.z,r:a.r,n:a,d:16,i,wait:0,shrink:false};
  const st=b.t-b.s;if(t<st)return{x:a.x,z:a.z,r:a.r,n:b,d:ZP[Math.max(0,i-1)]?ZP[Math.max(0,i-1)][3]:1,i,wait:st-t,shrink:false};const k=smooth(0,1,(t-st)/b.s);return{x:lerp(a.x,b.x,k),z:lerp(a.z,b.z,k),r:lerp(a.r,b.r,k),n:b,d:ZP[i][3],i,wait:b.t-t,shrink:true}}

// ---------- the fighters ----------
const humans=(A.players||[{id:'ben',name:TL('Sen','You')}]).filter(p=>p&&!p.bot).slice(0,20);
const P=[];
humans.forEach((h,i)=>P.push(mkP(h.id,String(h.name||'Oyuncu').slice(0,12),false)));
for(let i=0;P.length<20;i++){const n=NAMES[(seed+i*7)%NAMES.length]+(i>=NAMES.length?i:'');P.push(mkP('b'+i,n,true))}
P.forEach((p,i)=>{p.ix=i;p.col=COLS[i]});
function mkP(id,name,bot){const cls=bot?SINIF[Math.floor(R()*4)]:null;return{id,name,bot,cls,x:0,z:0,y:200,a:0,vx:0,vz:0,vy:0,hp:100,mhp:100,st:'ship',act:null,cd:0,inv:{odun:0,tas:0,demir:0,altin:0,meyve:0,ok:0,iksir:0},lv:{s:0,z:0},kills:0,local:false,seen:Date.now(),ph:0,mv:0,flash:0,hurtT:-99,tx:0,tz:0,ty:200,ta:0,jumpAt:null,goal:null}}
const ME=P.find(p=>p.id===A.id)||P[0];ME.local=true;
let hostIx=0;     // the lowest-numbered player still here runs the computer fighters
const iAmHost=()=>P[hostIx]===ME;
function setCls(p,c){p.cls=c;const C=CLS[c];p.mhp=C.hp;p.hp=C.hp;if(c==='okcu')p.inv.ok=Math.max(p.inv.ok,20)}
P.forEach(p=>{if(p.bot)setCls(p,p.cls)});

// ---------- page ----------
document.body.classList.add('mdn');for(const id of['lobby','hud','ov','eye','rot','ver','arenaEnd'])if($(id))$(id).hidden=true;
const css=document.createElement('style');css.textContent=`
body.mdn #ov,body.mdn #hud,body.mdn #eye,body.mdn #rot,body.mdn #ver{display:none!important}
#mdn{position:fixed;inset:0;pointer-events:none;font:600 14px Georgia,serif;color:#f6ecd4;user-select:none;-webkit-user-select:none}
#mdn button{pointer-events:auto;font:700 14px Georgia,serif;color:#f6ecd4;background:rgba(20,26,34,.82);border:1.5px solid #c9b07a;border-radius:10px;cursor:pointer;touch-action:none}
#mdn button:disabled{opacity:.4}
#mHp{position:absolute;${SMALL?'left:10px;bottom:calc(48px + env(safe-area-inset-bottom,0px));width:min(44vw,180px);padding:4px 8px!important;':'left:10px;top:calc(8px + env(safe-area-inset-top,0px));width:min(46vw,230px);'}background:rgba(12,16,22,.6);border-radius:10px;padding:6px 9px}
#mHp b{display:block;font-size:13px}#mHpBar{height:9px;border-radius:5px;background:#3a1d1d;margin-top:4px;overflow:hidden}#mHpBar i{display:block;height:100%;background:linear-gradient(90deg,#d84b3a,#f2a04a);width:100%;transition:width .2s}
#mLv{font-size:12px;opacity:.9;margin-top:3px}
#mTop{position:absolute;left:50%;transform:translateX(-50%);top:calc(8px + env(safe-area-inset-top,0px));background:rgba(12,16,22,.6);border-radius:10px;padding:5px 11px;text-align:center;font-size:13px;white-space:nowrap}
#mTop small{display:block;font-size:11.5px;color:#d9b8ff}
#mMini{position:absolute;right:10px;top:calc(8px + env(safe-area-inset-top,0px));width:${SMALL?112:170}px;height:${SMALL?112:170}px;border-radius:12px;border:2px solid #c9b07a;pointer-events:auto;background:#223}
#mFeed{position:absolute;right:10px;top:calc(${SMALL?128:186}px + env(safe-area-inset-top,0px));text-align:right;font-size:12px;max-width:60vw}
#mFeed div{background:rgba(12,16,22,.6);border-radius:6px;padding:2px 7px;margin-bottom:3px;display:inline-block;clear:both;float:right}
#mInv{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(10px + env(safe-area-inset-bottom,0px));display:flex;gap:5px;background:rgba(12,16,22,.55);border-radius:10px;padding:4px 8px;font-size:13px;white-space:nowrap}
#mInv span{min-width:30px;text-align:center}#mInv span.z{opacity:.35}
#mAct{position:absolute;right:${SMALL?18:34}px;bottom:calc(${SMALL?52:62}px + env(safe-area-inset-bottom,0px));width:${SMALL?88:96}px;height:${SMALL?88:96}px;border-radius:50%!important;font-size:34px!important;background:radial-gradient(circle at 35% 30%,#ffe9a8,#c8902e 75%)!important;color:#1a1206!important;border:3px solid #fff1c4!important}
#mEat,#mCraft,#mPot{position:absolute;width:56px;height:56px;border-radius:50%!important;font-size:22px!important;padding:0}
#mEat{right:${SMALL?118:142}px;bottom:calc(${SMALL?52:62}px + env(safe-area-inset-bottom,0px))}#mPot{right:${SMALL?112:136}px;bottom:calc(${SMALL?116:132}px + env(safe-area-inset-bottom,0px))}#mCraft{right:${SMALL?50:68}px;bottom:calc(${SMALL?150:168}px + env(safe-area-inset-bottom,0px))}
#mEat small,#mPot small{position:absolute;right:-2px;bottom:-2px;font-size:11px;background:#1a1206;border-radius:8px;padding:0 4px;color:#ffe08a}
#mJump{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(90px + env(safe-area-inset-bottom,0px));padding:14px 34px;font-size:22px!important;background:radial-gradient(circle at 35% 30%,#ffe9a8,#c8902e 75%)!important;color:#1a1206!important}
#mJoy{position:absolute;width:120px;height:120px;border-radius:50%;border:2px solid rgba(255,255,255,.35);background:rgba(255,255,255,.08);display:none;transform:translate(-50%,-50%)}
#mJoy i{position:absolute;left:50%;top:50%;width:52px;height:52px;border-radius:50%;background:rgba(255,240,200,.55);transform:translate(-50%,-50%)}
#mTip{position:absolute;left:50%;transform:translateX(-50%);top:calc(${SMALL?96:70}px + env(safe-area-inset-top,0px));background:rgba(12,16,22,.78);border-radius:9px;padding:6px 12px;font-size:14px;max-width:86vw;text-align:center;transition:opacity .4s;opacity:0}
#mPanel{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:rgba(16,20,28,.95);border:2px solid #c9b07a;border-radius:14px;padding:12px;pointer-events:auto;width:min(92vw,420px);max-height:84vh;overflow:auto}
#mPanel h2{margin:0 0 8px;font-size:18px;color:#ffd98a;text-align:center}#mPanel p{margin:6px 0;font-size:13px;opacity:.9;text-align:center}
#mPanel .row{display:flex;gap:8px;align-items:center;margin:6px 0}#mPanel .row button{flex:1;padding:10px 8px;text-align:left}#mPanel .row button small{display:block;font-weight:400;font-size:12px;color:#ffd98a;margin-top:2px}
#mPanel .cls{display:grid;grid-template-columns:1fr 1fr;gap:8px}#mPanel .cls button{padding:10px 8px;text-align:left;line-height:1.25}#mPanel .cls button b{font-size:16px;display:block}#mPanel .cls button small{display:block;font-weight:400;font-size:11.5px;opacity:.9;margin-top:3px}
#mPanel .cls button.on{background:radial-gradient(circle at 35% 30%,#ffe9a8,#c8902e 85%);color:#1a1206}
#mPanel .go{display:block;width:100%;margin-top:10px;padding:12px;font-size:17px;background:radial-gradient(circle at 35% 30%,#ffe9a8,#c8902e 75%);color:#1a1206}
#mMap{position:absolute;inset:0;background:rgba(6,10,14,.82);pointer-events:auto;display:flex;align-items:center;justify-content:center;flex-direction:column}
#mMap canvas{width:min(94vw,82vh);height:min(94vw,82vh);border-radius:12px;border:2px solid #c9b07a}
#mMap p{margin:8px;font-size:13px;text-align:center}
#mMenu{position:absolute;left:10px;top:calc(${SMALL?8:84}px + env(safe-area-inset-top,0px));padding:5px 10px;font-size:13px!important}
.mLab{position:absolute;transform:translate(-50%,-100%);font-size:12px;white-space:nowrap;text-shadow:0 1px 2px #000,0 0 3px #000;text-align:center;line-height:1.15}
.mNum{position:absolute;transform:translate(-50%,-50%);font:800 18px Georgia,serif;text-shadow:0 2px 3px #000,0 0 4px #000;pointer-events:none}
.mLab i{display:block;margin:2px auto 0;width:42px;height:4px;background:#3a1d1d;border-radius:2px;overflow:hidden}.mLab i b{display:block;height:100%;background:#e05a3a}
#mHurt{position:absolute;inset:0;box-shadow:inset 0 0 90px rgba(200,20,20,.0);transition:box-shadow .25s}
#mOut{position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(120,40,160,0) 40%,rgba(120,40,160,.35));display:none}`;
document.head.append(css);
const UI=document.createElement('div');UI.id='mdn';UI.innerHTML=`<div id="mOut"></div><div id="mHurt"></div><div id="mLabs"></div>
<div id="mHp"><b id="mName"></b><div id="mHpBar"><i></i></div><div id="mLv"></div></div><div id="mTop"></div><canvas id="mMini" width="220" height="220"></canvas><div id="mFeed"></div>
<div id="mInv"></div><div id="mJoy"><i></i></div><button id="mAct">⚔️</button><button id="mEat">🍓<small>0</small></button><button id="mPot">🧪<small>0</small></button><button id="mCraft">🔨</button><button id="mJump" hidden>${TL('ATLA','JUMP')}</button>
<button id="mMenu">☰</button><div id="mTip"></div>`;
document.body.append(UI);
let tipT=0;function tip(m,s=3){const e=$('mTip');e.textContent=m;e.style.opacity=1;tipT=s}
function feed(m){const f=$('mFeed'),d=document.createElement('div');d.textContent=m;f.prepend(d);while(f.children.length>5)f.lastChild.remove();setTimeout(()=>d.remove(),9000)}

// ---------- the world ----------
const cv=$('game');cv.style.display='block';
makeScene(cv,SMALL);const {renderer,scene,camera,sun}=S;
makeGround();makeNodes();makePlaces();makeZone();makeShip();makeFx();makeClutter();
const MAPN=SMALL?256:384,MAPI=mapImage(MAPN);
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()});
const loading=document.createElement('div');loading.style.cssText='position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#0d1a26;font:700 18px Georgia,serif;color:#ffd98a;z-index:9';loading.textContent=TL('Şövalyeler hazırlanıyor…','Getting the knights ready…');document.body.append(loading);
try{await Promise.all(SINIF.map(k=>loadChr(scene,k,V)))}catch(e){console.warn(e)}
loading.remove();

// ---------- collisions ----------
const COLS_=S.places.cols,walls=[];     // ruin walls and towers, and barricades players build
function segPush(p,x1,z1,x2,z2,r){const dx=x2-x1,dz=z2-z1,l2=dx*dx+dz*dz||1,t=clamp(((p.x-x1)*dx+(p.z-z1)*dz)/l2,0,1),cx=x1+dx*t,cz=z1+dz*t,ex=p.x-cx,ez=p.z-cz,d=Math.hypot(ex,ez);if(d<r&&d>1e-4){p.x=cx+ex/d*r;p.z=cz+ez/d*r;return true}return false}
function collide(p){
  nodesNear(p.x,p.z,4,n=>{if(n.hp<=0)return;const r=NODE[n.t].r*(n.t<2?n.s:n.s*.95)*(n.t<2?.6:1)+.45,dx=p.x-n.x,dz=p.z-n.z,d=Math.hypot(dx,dz);if(d<r&&d>1e-4){p.x=n.x+dx/d*r;p.z=n.z+dz/d*r}});
  for(const c of COLS_){if(Math.abs(c.x-p.x)>14||Math.abs(c.z-p.z)>14)continue;if(c.wall){const w=c.wall,hx=Math.cos(w.a)*w.len/2,hz=-Math.sin(w.a)*w.len/2;segPush(p,w.cx-hx,w.cz-hz,w.cx+hx,w.cz+hz,1)}else{const dx=p.x-c.x,dz=p.z-c.z,d=Math.hypot(dx,dz);if(d<c.r+.4&&d>1e-4){p.x=c.x+dx/d*(c.r+.4);p.z=c.z+dz/d*(c.r+.4)}}}
  for(const w of walls){if(w.hp<=0||Math.abs(w.x-p.x)>5||Math.abs(w.z-p.z)>5)continue;const hx=Math.cos(w.a)*2.1,hz=-Math.sin(w.a)*2.1;segPush(p,w.x-hx,w.z-hz,w.x+hx,w.z+hz,.7)}
  const b=HALF-40;p.x=clamp(p.x,-b,b);p.z=clamp(p.z,-b,b)}
const groundY=(x,z)=>Math.max(height(x,z),-.95);

// ---------- network ----------
const NET={ch:null,on:false,last:0};
const solo=!A.sb||humans.length<2;
if(!solo){try{NET.ch=A.sb.channel('mdn-'+A.room,{config:{broadcast:{self:false}}});
  NET.ch.on('broadcast',{event:'s'},({payload})=>onState(payload)).on('broadcast',{event:'h'},({payload})=>onHit(payload)).on('broadcast',{event:'n'},({payload})=>onNode(payload))
    .on('broadcast',{event:'c'},({payload})=>onChest(payload)).on('broadcast',{event:'b'},({payload})=>onBag(payload)).on('broadcast',{event:'bt'},({payload})=>onBagTaken(payload))
    .on('broadcast',{event:'k'},({payload})=>onKill(payload)).on('broadcast',{event:'f'},({payload})=>onBolt(payload)).on('broadcast',{event:'w'},({payload})=>onWall(payload))
    .subscribe(s=>{if(s==='SUBSCRIBED')NET.on=true})}catch(e){console.warn(e)}}
const send=(ev,payload)=>{if(NET.on)try{NET.ch.send({type:'broadcast',event:ev,payload})}catch(e){}};
const byId=id=>P.find(p=>p.id===id);
const ST=['ship','fall','para','yer','olu'];
function packState(){const e=[];for(const p of P)if(p.local)e.push([p.id,+p.x.toFixed(1),+p.z.toFixed(1),+p.y.toFixed(1),+p.a.toFixed(2),ST.indexOf(p.st),Math.round(p.hp),p.mhp,p.cls||'',p.lv.s,p.lv.z,p.act?(p.act.k==='atk'?1:2):0,p.kills,p.mv>.5?1:0,p.colI??-1]);return{e,h:hostIx}}
function onState(m){if(!m||!Array.isArray(m.e))return;for(const r of m.e){const p=byId(r[0]);if(!p||p.local)continue;p.seen=Date.now();if(!p.bot)p.alive=true;
  [ ,p.tx,p.tz,p.ty,p.ta]=r;const st=ST[r[5]]||'yer';if(st==='olu'&&p.st!=='olu'){p.dieT=gtime()}p.st=st;p.hp=r[6];p.mhp=r[7];if(r[8]&&p.cls!==r[8])p.cls=r[8];p.lv.s=r[9];p.lv.z=r[10];
  if(r[11]&&!p.act){p.act={k:r[11]===1?'atk':'work',t:0,dur:.6,remote:true}}p.kills=r[12];p.rmv=r[13];if(r[14]>=0&&r[14]<PAL.length&&p.colI!==r[14]){p.colI=r[14];p.col=PAL[r[14]]}
  if(p.fx==null){p.x=p.tx;p.z=p.tz;p.y=p.ty;p.a=p.ta;p.fx=1}}}
function netTick(){if(!NET.on)return;send('s',packState())}
// a hit is settled where the struck fighter is run
function onHit(m){const v=byId(m.to);if(!v||!v.local)return;hurt(v,+m.d||0,byId(m.by),+m.kx||0,+m.kz||0)}
const nums=[];function popNum(x,y,z,txt,c){if(nums.length>12)nums.shift().el.remove();const el=document.createElement('div');el.className='mNum';el.textContent=txt;el.style.color=c;$('mLabs').append(el);nums.push({x,y,z,t:0,el})}
function hitFighter(v,d,by,kx,kz){if(by===ME||v===ME)popNum(v.x,v.y+2.2,v.z,Math.round(d*(1-((CLS[v.cls]||CLS.sovalye).zr+.12*v.lv.z))),by===ME?'#ffe08a':'#ff6a5a');if(v.local)hurt(v,d,by,kx,kz);else send('h',{to:v.id,d:+d.toFixed(1),by:by.id,kx:+kx.toFixed(2),kz:+kz.toFixed(2)});v.flash=1}
function onNode(m){const n=S.nodes.byId.get(m.id);if(n&&n.hp>0){n.hp=0;S.nodes.dirty=true}}
function onChest(m){const c=S.places.chests.find(o=>o.id===m.id);if(c&&!c.open){c.open=true;drawChests()}}
const bags=[];function onBag(m){if(!bags.some(b=>b.id===m.id))bags.push({id:m.id,x:+m.x,z:+m.z,inv:m.inv||{}})}
function onBagTaken(m){const i=bags.findIndex(b=>b.id===m.id);if(i>=0)bags.splice(i,1)}
function onKill(m){const v=byId(m.v),k=byId(m.by);if(v&&!v.local){v.st='olu';v.hp=0;v.dieT=gtime()}if(v)feed(k?`${k.name} ⚔️ ${v.name}`:`☠️ ${v.name}`)}
function onWall(m){if(!walls.some(w=>w.id===m.id))walls.push({id:m.id,x:+m.x,z:+m.z,a:+m.a,hp:150})}

// ---------- fighting, gathering, crafting ----------
const bolts=[];
function hurt(v,d,by,kx,kz){if(v.st==='olu'||v.hp<=0)return;const C=CLS[v.cls]||CLS.sovalye;d*=1-(C.zr+.12*v.lv.z);v.hp-=d;v.flash=1;v.hurtT=gtime();v.kx=(v.kx||0)+kx;v.kz=(v.kz||0)+kz;
  if(v===ME){$('mHurt').style.boxShadow='inset 0 0 90px rgba(200,20,20,.55)';setTimeout(()=>$('mHurt').style.boxShadow='inset 0 0 90px rgba(200,20,20,0)',220);SES.kilic(.8)}
  if(v.bot&&by&&by!==v)v.foe=by;
  if(v.hp<=0)die(v,by)}
function die(v,by){v.hp=0;v.st='olu';v.dieT=gtime();v.act=null;
  const inv={};for(const k in v.inv)if(v.inv[k]>0)inv[k]=v.inv[k];if(Object.keys(inv).length){const b={id:v.id+'_'+Math.round(gtime()),x:v.x,z:v.z,inv};bags.push(b);send('b',b)}
  for(const k in v.inv)v.inv[k]=0;
  if(by&&by!==v){by.kills++;}send('k',{v:v.id,by:by?by.id:null});feed(by&&by!==v?`${by.name} ⚔️ ${v.name}`:`☠️ ${v.name}`);
  if(v===ME)setTimeout(()=>endScreen(false,by),1400)}
const facing=(p,o,cone)=>{const a=Math.atan2(o.x-p.x,o.z-p.z);return Math.abs(angD(p.a,a))<cone};
function foeNear(p,r,cone){let best=null,bd=r;for(const o of P){if(o===p||o.st!=='yer'||o.hp<=0)continue;const d=Math.hypot(o.x-p.x,o.z-p.z);if(d<bd&&(!cone||facing(p,o,cone))){bd=d;best=o}}return best}
function workTarget(p){let best=null,bd=1e9;const fx=p.x+Math.sin(p.a)*.7,fz=p.z+Math.cos(p.a)*.7;
  nodesNear(p.x,p.z,5,n=>{if(n.hp<=0)return;const r=NODE[n.t].r*n.s*(n.t<2?.6:1),d=Math.hypot(n.x-fx,n.z-fz)-r;if(d<2.3&&d<bd){bd=d;best={n}}});
  for(const c of S.places.chests){if(c.open)continue;const d=Math.hypot(c.x-fx,c.z-fz);if(d<2.2&&d<bd){bd=d;best={c}}}
  for(const w of walls){if(w.hp<=0)continue;const d=Math.hypot(w.x-fx,w.z-fz);if(d<2.6&&d<bd){bd=d;best={w}}}
  return best}
// one press of the big button: strike the enemy in front, or else work whatever is in front (tree, rock, ore, chest, barricade)
function action(p){if(p.st!=='yer'||p.act||p.cd>0)return;const C=CLS[p.cls];
  const f=foeNear(p,C.rng+1.2)||foeNear(p,p.cls==='okcu'?C.okR:C.rng+2.4,p.cls==='okcu'?.6:1.3);
  if(f&&(p.cls!=='okcu'||p.inv.ok>0||Math.hypot(f.x-p.x,f.z-p.z)<C.rng+1)){p.a=Math.atan2(f.x-p.x,f.z-p.z);p.act={k:'atk',t:0,dur:p.cls==='okcu'?.55:.6,hit:false,tgt:f};p.cd=C.cd;return}
  const w=workTarget(p);if(w){const o=w.n||w.c||w.w;p.a=Math.atan2(o.x-p.x,o.z-p.z);p.act={k:'work',t:0,dur:.62,hit:false,w};p.cd=.66;return}
  p.act={k:'atk',t:0,dur:.55,hit:false,tgt:null};p.cd=C.cd*.8}
function give(p,k,n){p.inv[k]=(p.inv[k]||0)+n;if(p===ME){tip(`+${n} ${ITEM[k]} ${ITEM_AD[k]}`,1.6);SES.para&&SES.para()}}
function actHit(p){const a=p.act,C=CLS[p.cls];
  if(a.k==='atk'){
    if(p.cls==='okcu'&&a.tgt&&Math.hypot(a.tgt.x-p.x,a.tgt.z-p.z)>C.rng+1){if(p.inv.ok<=0){if(p===ME)tip(TL('Okun bitti! Zanaat → 10 ok yap (2 odun)','Out of arrows! Craft → make 10 arrows (2 wood)'));return}
      p.inv.ok--;const t=a.tgt,d=Math.hypot(t.x-p.x,t.z-p.z),lead=d/48,tx=t.x+(t.vx||0)*lead,tz=t.z+(t.vz||0)*lead,sp=p.bot?(1-Math.min(.9,(p.acc||.6)))*2.5:0;const ang=Math.atan2(tx-p.x,tz-p.z)+(Math.random()-.5)*sp*.08;
      const b={x:p.x+Math.sin(ang)*.8,y:p.y+1.45,z:p.z+Math.cos(ang)*.8,dx:Math.sin(ang),dz:Math.cos(ang),by:p,t:0,dmg:C.ok*(1+.25*p.lv.s),dy:((t.y||0)-p.y)/Math.max(d,1)};bolts.push(b);send('f',{x:+b.x.toFixed(1),y:+b.y.toFixed(1),z:+b.z.toFixed(1),dx:+b.dx.toFixed(3),dz:+b.dz.toFixed(3),dy:+b.dy.toFixed(3)});
      if(Math.hypot(p.x-ME.x,p.z-ME.z)<60)SES.okcu(clamp(1-Math.hypot(p.x-ME.x,p.z-ME.z)/60,.1,1));return}
    const o=foeNear(p,C.rng+.6,1.1);if(o){const k=1+.25*p.lv.s,dmg=C.dmg*k*(.9+Math.random()*.2),dx=o.x-p.x,dz=o.z-p.z,l=Math.hypot(dx,dz)||1;hitFighter(o,dmg,p,dx/l*(p.cls==='sovalye'?3:2),dz/l*(p.cls==='sovalye'?3:2));
      chips(o.x,o.y+1.3,o.z,'#ffe8b0',5,3);if(Math.hypot(p.x-ME.x,p.z-ME.z)<50)SES.kilic(clamp(1-Math.hypot(p.x-ME.x,p.z-ME.z)/50,.15,1))}
    else{const w=workTarget(p);if(w&&w.w)hitWall(p,w.w)}return}
  const w=a.w;if(!w)return;
  if(w.c){if(w.c.open)return;w.c.open=true;drawChests();send('c',{id:w.c.id});const lr=rng(seed^(w.c.id*2654435761));const L=[['demir',2+(lr()*3|0)],['altin',1+(lr()*2|0)],['meyve',3],['ok',12],['iksir',1],['tas',4],['odun',5]];
    for(let k=0;k<2;k++){const[it,n]=L[Math.floor(lr()*L.length)];give(p,it,n)}chips(w.c.x,w.c.y+.8,w.c.z,'#f2c33a',10,3);return}
  if(w.w){hitWall(p,w.w);return}
  const n=w.n;if(n.hp<=0)return;const tree=n.t<2||n.t===5,pow=tree?C.odun:C.maden;n.hp-=pow;
  chips(n.x,n.y+(tree?1.2:.8),n.z,n.t<2?'#c9a36b':n.t===5?'#4f8a35':n.t===3?'#9a5a32':n.t===4?'#f2c33a':'#9a978f',4,2.6);
  const near=Math.hypot(p.x-ME.x,p.z-ME.z)<45,vol=clamp(1-Math.hypot(p.x-ME.x,p.z-ME.z)/45,.1,1);if(near){if(tree)SES.iscik(vol);else SES.demir(vol*.8)}
  if(n.hp<=0){n.hp=0;S.nodes.dirty=true;send('n',{id:n.id});let c=NODE[n.t].n;if(p.cls==='madenci'&&n.t>=2&&n.t<=4)c+=n.t===4?1:2;if(p.cls==='oduncu'&&n.t<2)c+=2;give(p,NODE[n.t].give,c);if(n.t===2&&Math.random()<.25)give(p,'demir',1)}}
function hitWall(p,w){w.hp-=CLS[p.cls].dmg*1.2;chips(w.x,1.5+height(w.x,w.z),w.z,'#9a7650',5);if(w.hp<=0){w.hp=0;send('w',{id:w.id,x:w.x,z:w.z,a:w.a,dead:1})}}
function craft(p,k){const r=RECIPE.find(o=>o.k===k);if(!r)return false;const l=k==='silah'?p.lv.s:k==='zirh'?p.lv.z:0;if((k==='silah'||k==='zirh')&&l>=3)return false;if(r.only&&p.cls!==r.only)return false;
  const c=r.cost(l);for(const i in c)if((p.inv[i]||0)<c[i])return false;for(const i in c)p.inv[i]-=c[i];
  if(k==='silah')p.lv.s++;else if(k==='zirh')p.lv.z++;else if(k==='ok')p.inv.ok+=10;else if(k==='iksir')p.inv.iksir++;
  else if(k==='barikat'){const w={id:p.id+'w'+Math.round(gtime()*10),x:p.x+Math.sin(p.a)*2.6,z:p.z+Math.cos(p.a)*2.6,a:p.a,hp:150};walls.push(w);send('w',w)}
  if(p===ME){SES.para&&SES.para();tip(r.ad+' ✓',1.8)}return true}
const canCraft=(p,k)=>{const r=RECIPE.find(o=>o.k===k),l=k==='silah'?p.lv.s:k==='zirh'?p.lv.z:0;if((k==='silah'||k==='zirh')&&l>=3)return false;if(r.only&&p.cls!==r.only)return false;const c=r.cost(l);for(const i in c)if((p.inv[i]||0)<c[i])return false;return true};
function eat(p,k){if(p.st!=='yer'||p.hp>=p.mhp||(p.inv[k]||0)<=0||(p.eatT||0)>gtime())return false;p.inv[k]--;p.hp=Math.min(p.mhp,p.hp+(k==='iksir'?55:18));p.eatT=gtime()+.8;if(p===ME)tip(k==='iksir'?TL('İksir içtin (+55)','Potion (+55)'):TL('Meyve yedin (+18)','Berries (+18)'),1.4);return true}

// ---------- the computer fighters ----------
function botThink(p,t){if(p.st!=='yer')return;const C=CLS[p.cls],z=zoneNow(t);p.acc=p.acc||.45+R()*.4;
  if(p.hp<p.mhp*.45){if(!eat(p,'iksir'))eat(p,'meyve')}
  for(const k of['silah','zirh','iksir','ok'])if(k!=='ok'||p.inv.ok<8)if(canCraft(p,k)){craft(p,k);break}
  const dz=Math.hypot(p.x-z.n.x,p.z-z.n.z),outside=Math.hypot(p.x-z.x,p.z-z.z)>z.r-8,late=z.wait<35||z.shrink;
  let f=p.foe&&p.foe.st==='yer'&&p.foe.hp>0&&Math.hypot(p.foe.x-p.x,p.foe.z-p.z)<45?p.foe:null;
  if(!f){const early=t<zones[0].t+45,o=foeNear(p,early?7:p.cls==='okcu'?32:24);/* for the first minute they mostly gather, and fight only who comes right up to them */if(o&&(p.hp>p.mhp*.45||o.hp<p.hp)&&(p.brave??(p.brave=R()))>.25)f=o}
  if(f&&p.hp<p.mhp*.25&&f.hp>p.hp){p.goal={x:p.x+(p.x-f.x)*3,z:p.z+(p.z-f.z)*3,run:1};p.foe=null;return}
  if(f&&!(outside&&!late&&false)){p.foe=f;const d=Math.hypot(f.x-p.x,f.z-p.z);if(p.cls==='okcu'&&p.inv.ok>0){p.goal=d<12?{x:p.x+(p.x-f.x),z:p.z+(p.z-f.z)}:d>26?{x:f.x,z:f.z}:null;if(d<34)p.want='atk'}else{p.goal={x:f.x,z:f.z};if(d<C.rng+.4)p.want='atk'}return}
  p.foe=null;
  if(outside||(late&&dz>z.n.r*.75)){const a=Math.atan2(p.z-z.n.z,p.x-z.n.x),r=z.n.r*.5*R();p.goal={x:z.n.x+Math.cos(a)*r,z:z.n.z+Math.sin(a)*r};return}
  // bags and chests close by
  for(const b of bags)if(Math.hypot(b.x-p.x,b.z-p.z)<50){p.goal={x:b.x,z:b.z};return}
  for(const c of S.places.chests)if(!c.open&&Math.hypot(c.x-p.x,c.z-p.z)<60){p.goal={x:c.x,z:c.z,chest:c};if(Math.hypot(c.x-p.x,c.z-p.z)<2.6)p.want='work';return}
  // gather: what is needed most
  const need=p.lv.s<3||p.lv.z<3?(p.inv.demir<6?[3,4,2]:[2,0,1]):p.inv.meyve<3?[5]:p.cls==='okcu'&&p.inv.ok<10?[0,1]:[3,0,1];if(p.inv.meyve<2&&p.hp<p.mhp*.7)need.unshift(5);
  if(p.cls==='madenci'||p.inv.tas<4)need.push(2);if(p.cls==='oduncu'||p.inv.odun<2)need.push(0,1);
  const full=k=>k<2?p.inv.odun>=(p.cls==='oduncu'||p.cls==='okcu'?14:8):k===2?p.inv.tas>=8:k===5?p.inv.meyve>=5:false;for(let i=need.length-1;i>=0;i--)if(full(need[i]))need.splice(i,1);if(!need.length)need.push(3,4);
  // strong enough, or the ring is closing: go looking for a fight
  const lvSum=p.lv.s+p.lv.z;if((lvSum>=3||t>zones[1].t-20)&&(p.brave??.5)>.3){let o=null,bd=lvSum>=3?240:140;for(const e of P){if(e===p||e.st!=='yer')continue;const d=Math.hypot(e.x-p.x,e.z-p.z);if(d<bd){bd=d;o=e}}if(o){p.goal={x:o.x,z:o.z};return}}
  let n=p.node&&p.node.hp>0?p.node:null;if(!n){let bd=1e9;nodesNear(p.x,p.z,need[0]>=3&&need[0]<=4?150:70,o=>{if(o.hp<=0||!need.includes(o.t))return;const d=Math.hypot(o.x-p.x,o.z-p.z)+need.indexOf(o.t)*12;if(d<bd&&Math.hypot(o.x-z.x,o.z-z.z)<z.r-6){bd=d;n=o}});p.node=n}
  if(n){const r=NODE[n.t].r*n.s*(n.t<2?.6:1);const d=Math.hypot(n.x-p.x,n.z-p.z);p.goal={x:n.x,z:n.z,stop:r+1.1};if(d<r+1.6)p.want='work';return}
  if(!p.goal||Math.hypot(p.goal.x-p.x,p.goal.z-p.z)<4){const a=R()*6.283,r=Math.sqrt(R())*Math.min(z.r*.8,300);p.goal={x:clamp(z.x+Math.cos(a)*r,-HALF+80,HALF-80),z:clamp(z.z+Math.sin(a)*r,-HALF+80,HALF-80)}}}

// ---------- one step of a fighter run on this screen ----------
const input={x:0,z:0,jx:0,jy:0};
function worldInput(){const f=camYawFwd(),r={x:-f.z,z:f.x};input.x=f.x*-input.jy+r.x*input.jx;input.z=f.z*-input.jy+r.z*input.jx}
function step(p,dt,t){
  p.cd=Math.max(0,p.cd-dt);p.flash=Math.max(0,p.flash-dt*4);
  if(p.st==='olu')return;
  if(p.st==='ship'){const s=shipAt(t);p.x=s.x;p.z=s.z;p.y=ship.y-12;
    if(p.bot){if(!p.drop){const PL=S.places.list,c=R()<.55?PL[Math.floor(R()*PL.length)]:null;p.drop=c?{x:c.x+(R()-.5)*120,z:c.z+(R()-.5)*120}:{x:(R()-.5)*1500,z:(R()-.5)*1500}}
      const d=Math.hypot(p.drop.x-s.x,p.drop.z-s.z),dn=Math.hypot(p.drop.x-(s.x+ship.dx*20),p.drop.z-(s.z+ship.dz*20));if((d<dn&&d<380)||s.k>=1)jump(p)}
    else if(s.k>=1||(p.jumpAt&&Math.hypot(p.jumpAt.x-s.x,p.jumpAt.z-s.z)<Math.hypot(p.jumpAt.x-(s.x+ship.dx*20),p.jumpAt.z-(s.z+ship.dz*20))&&Math.hypot(p.jumpAt.x-s.x,p.jumpAt.z-s.z)<420))jump(p);return}
  let ix=0,iz=0;
  if(p===ME){worldInput();ix=input.x;iz=input.z}
  else if(p.bot){const g=p.st==='yer'?p.goal:p.drop;if(g){const dx=g.x-p.x,dz=g.z-p.z,d=Math.hypot(dx,dz);if(d>(g.stop||1.2)){ix=dx/d;iz=dz/d}}}
  const il=Math.hypot(ix,iz);if(il>1){ix/=il;iz/=il}
  if(p.st==='fall'||p.st==='para'){const g=groundY(p.x,p.z),sp=p.st==='fall'?24:12;p.x+=ix*sp*dt;p.z+=iz*sp*dt;if(il>.1)p.a=lerp(p.a,p.a+angD(p.a,Math.atan2(ix,iz)),Math.min(1,dt*4));
    if(p.st==='fall'){p.vy=Math.max(-42,p.vy-20*dt);if(p.y-g<80||(p===ME&&p.open))p.st='para'}else p.vy=lerp(p.vy,-6.5,Math.min(1,dt*2.5));
    p.y+=p.vy*dt;const b=HALF-40;p.x=clamp(p.x,-b,b);p.z=clamp(p.z,-b,b);if(p.y<=g){p.y=g;p.st='yer';p.vy=0;if(p===ME)tip(TL('Yere indin! Büyük düğme önündekini işler: ağaç kes, taş kır, sandık aç. 🔨 ile silahını ve zırhını güçlendir. Mor alanın dışında kalma!','You landed! The big button works what is in front: cut trees, break rock, open chests. Use 🔨 to better your weapon and armour. Stay inside the ring!'),9)}return}
  // on the ground
  if(p.bot){p.think=(p.think||0)-dt;if(p.think<=0){p.think=.25+R()*.15;p.want=null;botThink(p,t)}if(p.want){if(p.want==='atk'||p.want==='work'){action(p)}}}
  const C=CLS[p.cls];let sp=C.sp*(p.act?.35:1);const g0=height(p.x,p.z);if(g0<-.8)sp*=.55;
  const ox=p.x,oz=p.z;
  if(il>.05){p.x+=ix*sp*dt;p.z+=iz*sp*dt;if(!p.act||p.act.k==='work')p.a+=angD(p.a,Math.atan2(ix,iz))*Math.min(1,dt*12)}
  if(p.kx||p.kz){p.x+=p.kx*dt*4;p.z+=p.kz*dt*4;p.kx*=Math.max(0,1-dt*6);p.kz*=Math.max(0,1-dt*6);if(Math.abs(p.kx)<.05)p.kx=0;if(Math.abs(p.kz)<.05)p.kz=0}
  // too steep to climb: the move is taken back
  const g1=height(p.x,p.z),run=Math.hypot(p.x-ox,p.z-oz);if(run>1e-3&&(g1-g0)/run>1.35){p.x=ox;p.z=oz}
  collide(p);p.vx=(p.x-ox)/Math.max(dt,1e-3);p.vz=(p.z-oz)/Math.max(dt,1e-3);p.mv=Math.hypot(p.vx,p.vz);p.y=groundY(p.x,p.z);
  if(p.act){p.act.t+=dt;if(!p.act.hit&&p.act.t>=p.act.dur*.5){p.act.hit=true;actHit(p)}if(p.act.t>=p.act.dur)p.act=null}
  // bags are picked up by walking over them
  for(let i=bags.length-1;i>=0;i--){const b=bags[i];if(Math.hypot(b.x-p.x,b.z-p.z)<1.8){for(const k in b.inv)give(p,k,b.inv[k]|0);bags.splice(i,1);send('bt',{id:b.id})}}
  // the closing ring hurts anyone outside it
  const z=zoneNow(t);if(t>zones[0].t&&Math.hypot(p.x-z.x,p.z-z.z)>z.r){p.zt=(p.zt||0)+dt;if(p.zt>=1){p.zt-=1;hurt(p,z.d,null,0,0)}}
  else if(t-p.hurtT>9&&p.hp<p.mhp)p.hp=Math.min(p.mhp,p.hp+dt*.6)}
function jump(p){if(p.st!=='ship')return;p.st='fall';p.vy=-4;const s=shipAt(gtime());p.x=s.x+(R()-.5)*8;p.z=s.z+(R()-.5)*8;p.y=ship.y-14;if(p===ME){$('mJump').hidden=true;tip(TL('Düştün! Joystick ile yön ver, paraşüt kendiliğinden açılır.','Falling! Steer with the stick; the parachute opens by itself.'),4)}}

// ---------- the host: who runs the computer fighters ----------
function pickHost(){const now=Date.now();if(gtime()>25)for(const p of P)if(!p.bot&&p!==ME&&p.st!=='olu'&&now-p.seen>30000){p.st='olu';p.hp=0;p.dieT=gtime();feed(TL(`${p.name} oyundan ayrıldı`,`${p.name} left the match`))}
  let h=-1;for(let i=0;i<P.length;i++){const p=P[i];if(p.bot)continue;if(p===ME||now-p.seen<9000){h=i;break}}if(h<0)h=ME.ix;
  if(h!==hostIx){hostIx=h}const mine=iAmHost();for(const p of P)if(p.bot&&p.local!==mine){p.local=mine;if(mine){p.x=p.tx||p.x;p.z=p.tz||p.z;p.y=p.ty||p.y}}}
for(const p of P)if(p.bot)p.local=iAmHost();

// ---------- input ----------
let cy=0,cp=.5,cd=11,joy=null,look=null,pinch=null,lastUI=0;const keys=new Set();
const camYawFwd=()=>({x:-Math.sin(cy),z:-Math.cos(cy)});
function setInput(jx,jy){input.jx=jx;input.jy=jy}
cv.addEventListener('pointerdown',e=>{SES.init&&SES.init();cv.setPointerCapture(e.pointerId);
  if(e.pointerType!=='mouse'&&e.clientX<innerWidth*.45&&!joy){joy={id:e.pointerId,x:e.clientX,y:e.clientY};const J=$('mJoy');J.style.display='block';J.style.left=e.clientX+'px';J.style.top=e.clientY+'px';J.firstChild.style.transform='translate(-50%,-50%)';return}
  if(look&&e.pointerType!=='mouse'){pinch={id:e.pointerId,d:Math.hypot(e.clientX-look.x,e.clientY-look.y),cd};return}
  look={id:e.pointerId,x:e.clientX,y:e.clientY,x0:e.clientX,y0:e.clientY,t:performance.now(),mouse:e.pointerType==='mouse'}});
cv.addEventListener('pointermove',e=>{
  if(joy&&e.pointerId===joy.id){let dx=e.clientX-joy.x,dy=e.clientY-joy.y;const l=Math.hypot(dx,dy),m=48;if(l>m){dx*=m/l;dy*=m/l}$('mJoy').firstChild.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;setInput(dx/m,dy/m);return}
  if(pinch&&e.pointerId===pinch.id&&look){const d=Math.hypot(e.clientX-look.x,e.clientY-look.y);cd=clamp(pinch.cd*pinch.d/Math.max(d,20),5,30);return}
  if(look&&e.pointerId===look.id){const dx=e.clientX-look.x,dy=e.clientY-look.y;look.x=e.clientX;look.y=e.clientY;if(pinch)return;cy-=dx*.006;cp=clamp(cp+dy*.004,.08,1.25)}});
const up=e=>{if(joy&&e.pointerId===joy.id){joy=null;$('mJoy').style.display='none';setInput(0,0);return}if(pinch&&e.pointerId===pinch.id){pinch=null;return}
  if(look&&e.pointerId===look.id){if(look.mouse&&Math.hypot(e.clientX-look.x0,e.clientY-look.y0)<6&&performance.now()-look.t<350)action(ME);look=null;pinch=null}};
cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
cv.addEventListener('wheel',e=>{cd=clamp(cd*(1+Math.sign(e.deltaY)*.1),5,30);e.preventDefault()},{passive:false});
addEventListener('keydown',e=>{const k=e.key.toLowerCase();keys.add(k);SES.init&&SES.init();if(k===' ')action(ME);if(k==='e')eat(ME,'meyve');if(k==='f')eat(ME,'iksir');if(k==='c')openCraft();if(k==='m')openMap();if(k==='j'&&ME.st==='ship')jump(ME);if(k==='escape')closePanel()});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
function keyInput(){if(joy)return;if(!keys.size){if(input.jx||input.jy)setInput(0,0);return}let jx=0,jy=0;if(keys.has('a')||keys.has('arrowleft'))jx--;if(keys.has('d')||keys.has('arrowright'))jx++;if(keys.has('w')||keys.has('arrowup'))jy--;if(keys.has('s')||keys.has('arrowdown'))jy++;const l=Math.hypot(jx,jy)||1;setInput(jx/l,jy/l)}
const hold={on:false};$('mAct').addEventListener('pointerdown',e=>{SES.init&&SES.init();hold.on=true;action(ME);e.preventDefault()});for(const ev of['pointerup','pointercancel','pointerleave'])$('mAct').addEventListener(ev,()=>hold.on=false);
$('mEat').onclick=()=>{SES.init&&SES.init();eat(ME,'meyve')||ME.st!=='yer'||tip(ME.inv.meyve?TL('Canın dolu','Your health is full'):TL('Meyven yok. Çalılardan topla.','No berries. Pick them from bushes.'))};
$('mPot').onclick=()=>{eat(ME,'iksir')||tip(ME.inv.iksir?TL('Canın dolu','Your health is full'):TL('İksirin yok. Zanaat → İksir (3 meyve)','No potion. Craft → Potion (3 berries)'))};
$('mCraft').onclick=()=>openCraft();$('mJump').onclick=()=>{SES.init&&SES.init();jump(ME)};$('mMini').onclick=()=>openMap();$('mMenu').onclick=()=>openMenu();

// ---------- panels ----------
let panel=null;function closePanel(){if(panel){panel.remove();panel=null}}
function mkPanel(h){closePanel();panel=document.createElement('div');panel.id='mPanel';panel.innerHTML=h;UI.append(panel);return panel}
function openCraft(){if(ME.st==='olu')return;const pn=mkPanel(`<h2>${TL('Zanaat','Craft')}</h2><div id="mRec"></div><button class="go" id="mX">${TL('Kapat','Close')}</button>`);pn.querySelector('#mX').onclick=closePanel;
  const draw=()=>{const box=pn.querySelector('#mRec');if(!box)return;box.textContent='';for(const r of RECIPE){if(r.only&&ME.cls!==r.only)continue;const l=r.k==='silah'?ME.lv.s:r.k==='zirh'?ME.lv.z:0,max=(r.k==='silah'||r.k==='zirh')&&l>=3;
    const c=max?null:r.cost(l),row=document.createElement('div');row.className='row';const b=document.createElement('button');
    b.innerHTML=`${r.ad}${r.k==='silah'||r.k==='zirh'?` (${l}/3)`:''}<small>${max?TL('en üst seviye','maxed'):Object.entries(c).map(([i,n])=>`${ITEM[i]} ${ME.inv[i]||0}/${n}`).join('  ')}</small>`;b.disabled=max||!canCraft(ME,r.k);b.onclick=()=>{craft(ME,r.k);draw()};row.append(b);box.append(row)}};draw();panel.draw=draw}
function openMenu(){const pn=mkPanel(`<h2>${TL('Büyük Harita','Big Map')}</h2><p>${TL('Sesler','Sound')}: <button id="mSnd" style="padding:6px 10px">${SES.ayar&&SES.ayar.okcu!==false?TL('Açık','On'):TL('Kapalı','Off')}</button></p>
  <p style="text-align:left;font-size:12.5px;line-height:1.45">${TL('Sol tarafa basılı tutup kaydır: yürü. Sağ tarafta kaydır: bak. İki parmak: yakınlaş. Büyük düğme: önündeki düşmana vurur; düşman yoksa ağacı, taşı, madeni ya da sandığı işler. Bilgisayarda: WASD, fare, boşluk, E meyve, F iksir, C zanaat, M harita.','Hold and drag on the left: walk. Drag on the right: look. Two fingers: zoom. Big button: strike the enemy in front, or work the tree, rock, ore or chest in front. On a computer: WASD, mouse, space, E berries, F potion, C craft, M map.')}</p>
  <button class="go" id="mHome">${TL('Ana menüye dön','Back to the main menu')}</button><button class="go" id="mX" style="background:rgba(20,26,34,.9);color:#f6ecd4">${TL('Devam et','Resume')}</button>`);
  pn.querySelector('#mX').onclick=closePanel;pn.querySelector('#mHome').onclick=()=>{try{localStorage.setItem('cephe_mod','big')}catch(e){}location.href=location.pathname};
  pn.querySelector('#mSnd').onclick=e=>{const on=!(SES.ayar&&SES.ayar.okcu!==false);for(const k of['okcu','atli','bomba','su','muzik'])SES.set&&SES.set(k,on);e.target.textContent=on?TL('Açık','On'):TL('Kapalı','Off')}}
let mapOpen=null;function openMap(){if(mapOpen){mapOpen.remove();mapOpen=null;return}const m=document.createElement('div');m.id='mMap';m.innerHTML=`<canvas width="${MAPN*2}" height="${MAPN*2}"></canvas><p>${ME.st==='ship'?TL('Haritaya dokun: gemi oraya en yakın geçince kendiliğinden atlarsın.','Tap the map: you jump by yourself when the airship passes closest to it.'):TL('Kapatmak için dokun','Tap to close')}</p>`;UI.append(m);mapOpen=m;
  const c=m.querySelector('canvas');c.onclick=e=>{if(ME.st==='ship'){const r=c.getBoundingClientRect(),x=((e.clientX-r.left)/r.width-.5)*HALF*2,z=((e.clientY-r.top)/r.height-.5)*HALF*2;ME.jumpAt={x,z};tip(TL('Atlama yeri seçildi','Drop spot marked'),2);drawMap(c,true)}else{m.remove();mapOpen=null}};m.onclick=e=>{if(e.target===m){m.remove();mapOpen=null}};drawMap(c,true)}
function drawMap(c,big){const g=c.getContext('2d'),W=c.width,t=gtime(),k=W/(HALF*2),X=x=>(x+HALF)*k,Z=z=>(z+HALF)*k;g.drawImage(MAPI,0,0,W,W);
  const z=zoneNow(t);g.lineWidth=Math.max(1.5,W/200);if(t>PICK_T){g.strokeStyle='rgba(255,255,255,.95)';g.beginPath();g.arc(X(z.n.x),Z(z.n.z),z.n.r*k,0,7);g.stroke();g.strokeStyle='#c46bff';g.beginPath();g.arc(X(z.x),Z(z.z),Math.min(z.r,HALF*2)*k,0,7);g.stroke()}
  if(ME.st==='ship'||t<PICK_T+SHIP_T){g.strokeStyle='rgba(255,220,120,.8)';g.setLineDash([6,5]);g.beginPath();g.moveTo(X(ship.a.x),Z(ship.a.z));g.lineTo(X(ship.b.x),Z(ship.b.z));g.stroke();g.setLineDash([]);const s=shipAt(t);g.fillStyle='#ffd98a';g.beginPath();g.arc(X(s.x),Z(s.z),W/90,0,7);g.fill()}
  if(big){g.font=`${Math.round(W/46)}px Georgia`;g.textAlign='center';for(const p of S.places.list){g.fillStyle='rgba(20,15,10,.75)';g.fillText(EN?p.en:p.ad,X(p.x)+1,Z(p.z)+W/60+1);g.fillStyle='#fff3d6';g.fillText(EN?p.en:p.ad,X(p.x),Z(p.z)+W/60);g.fillStyle='#ffd98a';g.fillRect(X(p.x)-2,Z(p.z)-2,4,4)}}
  if(ME.jumpAt&&ME.st==='ship'){g.strokeStyle='#ff5a3a';g.lineWidth=3;g.beginPath();g.arc(X(ME.jumpAt.x),Z(ME.jumpAt.z),W/50,0,7);g.stroke()}
  for(const p of P){if(p===ME||p.st==='olu'||p.st==='ship')continue;if(Math.hypot(p.x-ME.x,p.z-ME.z)>70)continue;g.fillStyle='#ff4a3a';g.beginPath();g.arc(X(p.x),Z(p.z),W/110,0,7);g.fill()}
  if(ME.st!=='ship'){g.save();g.translate(X(ME.x),Z(ME.z));g.rotate(-ME.a+Math.PI);g.fillStyle='#fff';g.strokeStyle='#000';g.lineWidth=1.5;g.beginPath();g.moveTo(0,-W/45);g.lineTo(W/70,W/70);g.lineTo(-W/70,W/70);g.closePath();g.fill();g.stroke();g.restore()}}
function drawMini(){const c=$('mMini'),g=c.getContext('2d'),W=c.width,t=gtime();const span=ME.st==='ship'?HALF*2:520,k=W/span,cx=ME.st==='ship'?0:ME.x,cz=ME.st==='ship'?0:ME.z;
  g.fillStyle='#1d3b52';g.fillRect(0,0,W,W);const sx=(cx-span/2+HALF)/(HALF*2)*MAPN,sz=(cz-span/2+HALF)/(HALF*2)*MAPN,sw=span/(HALF*2)*MAPN;g.drawImage(MAPI,sx,sz,sw,sw,0,0,W,W);
  const X=x=>(x-cx)*k+W/2,Z=z=>(z-cz)*k+W/2,z=zoneNow(t);g.lineWidth=2;if(t>PICK_T){g.strokeStyle='rgba(255,255,255,.9)';g.beginPath();g.arc(X(z.n.x),Z(z.n.z),z.n.r*k,0,7);g.stroke();g.strokeStyle='#c46bff';g.beginPath();g.arc(X(z.x),Z(z.z),Math.min(z.r,HALF*3)*k,0,7);g.stroke()}
  if(ME.st==='ship'){const s=shipAt(t);g.strokeStyle='rgba(255,220,120,.8)';g.setLineDash([4,4]);g.beginPath();g.moveTo(X(ship.a.x),Z(ship.a.z));g.lineTo(X(ship.b.x),Z(ship.b.z));g.stroke();g.setLineDash([]);g.fillStyle='#ffd98a';g.beginPath();g.arc(X(s.x),Z(s.z),4,0,7);g.fill();if(ME.jumpAt){g.strokeStyle='#ff5a3a';g.beginPath();g.arc(X(ME.jumpAt.x),Z(ME.jumpAt.z),5,0,7);g.stroke()}return}
  for(const p of P){if(p===ME||p.st==='olu'||p.st==='ship')continue;if(Math.hypot(p.x-ME.x,p.z-ME.z)>70)continue;g.fillStyle='#ff4a3a';g.beginPath();g.arc(X(p.x),Z(p.z),3.5,0,7);g.fill()}
  g.save();g.translate(W/2,W/2);g.rotate(-ME.a+Math.PI);g.fillStyle='#fff';g.strokeStyle='#000';g.beginPath();g.moveTo(0,-8);g.lineTo(6,6);g.lineTo(-6,6);g.closePath();g.fill();g.stroke();g.restore();
  // the camera's view, a faint wedge
  g.save();g.translate(W/2,W/2);g.rotate(-cy+Math.PI);g.fillStyle='rgba(255,255,255,.12)';g.beginPath();g.moveTo(0,0);g.arc(0,0,W*.42,-Math.PI/2-.45,-Math.PI/2+.45);g.closePath();g.fill();g.restore()}
// the start: choose a kind of fighter while the airship gets ready
function openPick(){let sel=ME.cls||SINIF[Math.floor(Math.random()*4)];const pn=mkPanel(`<h2>${TL('Savaşçını seç','Choose your fighter')}</h2><div class="cls"></div><p id="mPT"></p><button class="go" id="mGo">${TL('Hazırım','Ready')}</button>`);
  const box=pn.querySelector('.cls');for(const k of SINIF){const C=CLS[k],b=document.createElement('button');b.innerHTML=`<b>${C.ik} ${C.ad}</b><small>${C.d}</small><small>❤️ ${C.hp} · 🏃 ${C.sp}</small>`;b.dataset.k=k;b.onclick=()=>{sel=k;for(const o of box.children)o.classList.toggle('on',o.dataset.k===k)};box.append(b)}
  {const row=document.createElement('div');row.style.cssText='display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:10px 0 2px';let ci=-1;try{ci=+(localStorage.getItem('mdn_col')??-1)}catch(e){}
    const mark=()=>{for(const o of row.children)o.style.outline=+o.dataset.i===ci?'3px solid #fff':'none'};PAL.forEach((c,i)=>{const b=document.createElement('button');b.dataset.i=i;b.style.cssText=`width:30px;height:30px;border-radius:50%;padding:0;background:#${c.getHexString()}!important`;b.onclick=()=>{ci=i;mark()};row.append(b)});
    const lab=document.createElement('p');lab.textContent=TL('Pelerin rengin:','Your cloak colour:');box.after(lab,row);mark();pn.colPick=()=>ci}
  for(const o of box.children)o.classList.toggle('on',o.dataset.k===sel);const done=()=>{setCls(ME,sel);const ci=pn.colPick();if(ci>=0){ME.colI=ci;ME.col=PAL[ci];try{localStorage.setItem('mdn_col',ci)}catch(e){}}try{localStorage.setItem('mdn_cls',sel)}catch(e){}closePanel();pickOpen=false};
  try{const c=localStorage.getItem('mdn_cls');if(c&&CLS[c]){sel=c;for(const o of box.children)o.classList.toggle('on',o.dataset.k===sel)}}catch(e){}
  pn.querySelector('#mGo').onclick=done;pickOpen=done}
let pickOpen=null;openPick();

// ---------- the end ----------
let ended=false;function endScreen(win,by){if(ended)return;ended=true;const alive=P.filter(p=>p.st!=='olu').length,rank=win?1:alive+1;
  const pn=mkPanel(`<h2>${win?TL('🏆 ZAFER! Ayakta kalan son sensin','🏆 VICTORY! You are the last one standing'):TL(`#${rank} oldun`,`You placed #${rank}`)}</h2><p>${win?'':by?TL(`Seni ${by.name} yendi.`,`${by.name} beat you.`):TL('Sis seni yuttu.','The mist took you.')}</p><p>${TL('Öldürme','Kills')}: ${ME.kills}</p>
  <button class="go" id="mAgain">${TL('Yeni maç (yapay zeka ile)','New match (with the computer)')}</button><button class="go" id="mHome2" style="background:rgba(20,26,34,.9);color:#f6ecd4">${TL('Ana menü','Main menu')}</button>${win?'':`<button class="go" id="mWatch" style="background:rgba(20,26,34,.9);color:#f6ecd4">${TL('İzlemeye devam et','Keep watching')}</button>`}`);
  pn.querySelector('#mAgain').onclick=()=>{try{sessionStorage.setItem('cephe_auto',JSON.stringify({id:A.id,m:{room:'mdnbot'+Math.random().toString(36).slice(2,9),big:true,seed:(Math.random()*4294967295)>>>0,t0:Date.now()+2500,players:[{id:A.id,name:ME.name}]}}))}catch(e){}location.reload()};
  pn.querySelector('#mHome2').onclick=()=>{try{localStorage.setItem('cephe_mod','big')}catch(e){}location.href=location.pathname};const w=pn.querySelector('#mWatch');if(w)w.onclick=closePanel}

// ---------- drawing ----------
const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),vp=new THREE.Vector3(),vs=new THREE.Vector3(1,1,1),UP=new THREE.Vector3(0,1,0),tc=new THREE.Color(),camT=new THREE.Vector3();
const labs=[];function label(i){if(!labs[i]){const d=document.createElement('div');d.className='mLab';d.innerHTML='<span></span><i><b></b></i>';$('mLabs').append(d);labs[i]=d}return labs[i]}
let spect=null;
function draw(dt,t){
  // remote fighters glide to where they were last seen
  for(const p of P){if(p.local)continue;const k=Math.min(1,dt*8);p.x=lerp(p.x,p.tx,k);p.z=lerp(p.z,p.tz,k);p.y=lerp(p.y,p.ty,k);p.a+=angD(p.a,p.ta)*Math.min(1,dt*10);p.mv=p.rmv?6:0;p.flash=Math.max(0,p.flash-dt*4);if(p.act){p.act.t+=dt;if(p.act.t>=p.act.dur)p.act=null}}
  // camera
  let F=ME;if(ME.st==='olu'){if(!spect||spect.st==='olu')spect=P.find(p=>p.st==='yer')||ME;F=spect}
  if(F.st==='ship'){const s=shipAt(t);camT.set(s.x,ship.y-6,s.z);const d=70;camera.position.set(s.x+Math.sin(cy)*Math.cos(cp)*d,ship.y+8+Math.sin(cp)*d*.6,s.z+Math.cos(cy)*Math.cos(cp)*d)}
  else{camT.set(F.x,F.y+1.7,F.z);const d=F.st==='yer'||F.st==='olu'?cd:Math.max(cd,16);camera.position.set(F.x+Math.sin(cy)*Math.cos(cp)*d,F.y+1.7+Math.sin(cp)*d,F.z+Math.cos(cy)*Math.cos(cp)*d);const gy=Math.max(height(camera.position.x,camera.position.z),0)+1.2;if(camera.position.y<gy)camera.position.y=gy}
  camera.lookAt(camT);
  const cx=F.st==='ship'?shipAt(t).x:F.x,cz=F.st==='ship'?shipAt(t).z:F.z;
  updateGround(cx,cz);updateNodes(cx,cz);if(F.st==='yer'||F.st==='olu'||F.st==='para')updateClutter(cx,cz);if(S.waterN){S.waterN.offset.x=t*.004;S.waterN.offset.y=t*.003}
  // the sun's shadow box follows the player, stepped to whole texels so edges do not crawl
  {const st=120/(S.small?1024:2048),sx=Math.round(cx/st)*st,sz=Math.round(cz/st)*st;sun.position.set(sx-120,height(sx,sz)+180,sz+90);sun.target.position.set(sx,height(sx,sz),sz);sun.target.updateMatrixWorld()}
  // the zone wall
  {const z=zoneNow(t);S.zone.visible=t>zones[0].t-30&&z.r<HALF*1.45;S.zone.position.set(z.x,-20,z.z);S.zone.scale.set(z.r,420,z.r);S.zone.material.uniforms.t.value=t;
    const out=ME.st==='yer'&&Math.hypot(ME.x-z.x,ME.z-z.z)>z.r;$('mOut').style.display=out?'block':'none'}
  // airship
  {const s=shipAt(t),g=S.ship.g;g.visible=t<PICK_T+SHIP_T+6;g.position.set(s.x,ship.y,s.z);g.rotation.y=Math.atan2(ship.dx,ship.dz);S.ship.props.forEach(p=>p.rotation.z+=dt*18)}
  // fighters
  let li=0;const chute=S.fx.chute;let ci=0;
  for(const p of P){if(!p.cls||p.st==='ship')continue;const d=Math.hypot(p.x-cx,p.z-cz);if(d>260)continue;
    let clip='idle',ph=t*.9+p.ix*.37;
    if(p.st==='olu'){clip='die';ph=Math.min(.999,(t-(p.dieT||t))/.9)}
    else if(p.st==='fall'||p.st==='para'){clip='fall';ph=t*.7}
    else if(p.act){clip=p.act.k==='atk'?'atk':'work';ph=Math.min(.999,p.act.t/p.act.dur)}
    else if(p.mv>.6){clip='run';p.ph=(p.ph+dt*p.mv/5.2)%1;ph=p.ph}
    if(p.st==='olu'&&t-(p.dieT||t)>14)continue;
    q.setFromAxisAngle(UP,p.a);m4.compose(vp.set(p.x,p.y,p.z),q,vs);tc.copy(p.col);if(p.flash>0)tc.multiplyScalar(1+p.flash*1.6);chrPush(p.cls,clip,ph,m4,tc);
    if(p.st==='para'&&ci<chute.length){const c=chute[ci++];c.visible=true;c.position.set(p.x,p.y+.4,p.z);c.rotation.y=p.a;c.children[0].material.color.copy(p.col)}
    // a name and health bar over each fighter close by
    if(p!==ME&&p.st!=='olu'&&d<70&&li<12){vp.set(p.x,p.y+2.5,p.z).project(camera);if(vp.z<1&&Math.abs(vp.x)<1.1&&Math.abs(vp.y)<1.1){const L=label(li++);L.style.display='block';L.style.left=((vp.x+1)/2*innerWidth)+'px';L.style.top=((1-vp.y)/2*innerHeight)+'px';
      const txt=`${CLS[p.cls].ik} ${p.name}${p.lv.s||p.lv.z?` ⚔${p.lv.s}🛡${p.lv.z}`:''}`;const s=L.firstChild;if(s.textContent!==txt)s.textContent=txt;s.style.color='#'+p.col.getHexString();L.lastChild.firstChild.style.width=clamp(p.hp/p.mhp*100,0,100)+'%'}}}
  for(let i=li;i<labs.length;i++)if(labs[i])labs[i].style.display='none';for(let i=ci;i<chute.length;i++)chute[i].visible=false;
  chrFlush();
  for(let i=nums.length-1;i>=0;i--){const n=nums[i];n.t+=dt;if(n.t>1){n.el.remove();nums.splice(i,1);continue}vp.set(n.x,n.y+n.t*1.6,n.z).project(camera);n.el.style.left=((vp.x+1)/2*innerWidth)+'px';n.el.style.top=((1-vp.y)/2*innerHeight)+'px';n.el.style.opacity=1-n.t*n.t;n.el.style.display=vp.z<1?'block':'none'}
  // bolts in flight
  {const B=S.fx.bolt;let k=0;for(const b of bolts){if(k>=48)break;q.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(b.dx,b.dy||0,b.dz).normalize());m4.compose(vp.set(b.x,b.y,b.z),q,vs);B.setMatrixAt(k++,m4)}B.count=k;B.instanceMatrix.needsUpdate=true}
  // bags, barricades
  {const B=S.fx.bag;let k=0;for(const b of bags){if(Math.hypot(b.x-cx,b.z-cz)>200||k>=40)continue;q.setFromAxisAngle(UP,t);m4.compose(vp.set(b.x,height(b.x,b.z)+Math.sin(t*2)*.1,b.z),q,vs);B.setMatrixAt(k++,m4)}B.count=k;B.instanceMatrix.needsUpdate=true}
  {const W=S.fx.wall;let k=0;for(const w of walls){if(w.hp<=0||k>=60)continue;q.setFromAxisAngle(UP,w.a+Math.PI/2);m4.compose(vp.set(w.x,height(w.x,w.z)-.2,w.z),q,vs);W.setMatrixAt(k++,m4)}W.count=k;W.instanceMatrix.needsUpdate=true}
  // the ring under what the big button would work on
  {const r=S.fx.ring;r.visible=false;if(ME.st==='yer'&&!ME.act){const w=workTarget(ME),f=foeNear(ME,CLS[ME.cls].rng+1.2)||foeNear(ME,ME.cls==='okcu'?CLS.okcu.okR:CLS[ME.cls].rng+2.4,ME.cls==='okcu'?.6:1.3);const o=f||(w&&(w.n||w.c||w.w));if(o){r.visible=true;r.position.set(o.x,height(o.x,o.z)+.15,o.z);r.material.color.set(f?'#ff5a3a':'#ffe08a');const s=f?1:w.n?NODE[w.n.t].r*w.n.s*(w.n.t<2?.7:1.1):1.2;r.scale.setScalar(s)}
    $('mAct').textContent=f?(ME.cls==='okcu'?'🏹':'⚔️'):w?(w.c?'🗝️':w.w?'⚔️':w.n.t<2?'🪓':w.n.t===5?'🍓':'⛏️'):'⚔️'}}
  drawChips(dt);renderer.render(scene,camera)}

// ---------- HUD ----------
function hud(t){
  const alive=P.filter(p=>p.st!=='olu').length;
  const z=zoneNow(t);let zt='';if(t<PICK_T)zt=TL(`Gemi kalkıyor: ${Math.ceil(PICK_T-t)}`,`Airship leaves in ${Math.ceil(PICK_T-t)}`);else if(t<PICK_T+SHIP_T&&ME.st==='ship')zt=TL(`Atlamak için: ${Math.ceil(PICK_T+SHIP_T-t)} sn`,`Jump within ${Math.ceil(PICK_T+SHIP_T-t)} s`);else if(z.n&&z.r>0){const s=Math.ceil(z.wait);zt=z.shrink?TL(`Alan daralıyor! ${s} sn`,`The ring is closing! ${s} s`):TL(`Alan ${Math.floor(s/60)}:${String(s%60).padStart(2,'0')} sonra daralır`,`Ring closes in ${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`)}
  const top=`${TL('Kalan','Alive')}: ${alive} · ${TL('Öldürme','Kills')}: ${ME.kills}<small>${zt}</small>`;if($('mTop').innerHTML!==top)$('mTop').innerHTML=top;
  const C=CLS[ME.cls];$('mName').textContent=C?(SMALL?`${C.ik} ${C.ad}`:`${C.ik} ${ME.name} · ${C.ad}`):ME.name;$('mHpBar').firstChild.style.width=clamp(ME.hp/ME.mhp*100,0,100)+'%';$('mLv').textContent=SMALL?`⚔️ ${ME.lv.s}/3 · 🛡️ ${ME.lv.z}/3 · ❤️ ${Math.max(0,Math.ceil(ME.hp))}`:`⚔️ ${TL('Silah','Weapon')} ${ME.lv.s}/3 · 🛡️ ${TL('Zırh','Armour')} ${ME.lv.z}/3 · ❤️ ${Math.max(0,Math.ceil(ME.hp))}`;
  let inv='';for(const k of['odun','tas','demir','altin','meyve','ok']){if(k==='ok'&&ME.cls!=='okcu')continue;inv+=`<span class="${ME.inv[k]?'':'z'}">${ITEM[k]} ${ME.inv[k]||0}</span>`}if($('mInv').innerHTML!==inv)$('mInv').innerHTML=inv;
  $('mEat').lastChild.textContent=ME.inv.meyve;$('mPot').lastChild.textContent=ME.inv.iksir;$('mPot').style.display=ME.inv.iksir?'':'none';
  const g=ME.st==='yer';for(const id of['mAct','mEat','mCraft'])$(id).style.display=g?'':'none';$('mInv').style.display=ME.st==='ship'?'none':'flex';
  $('mJump').hidden=!(ME.st==='ship'&&t>=PICK_T);
  if(panel&&panel.draw)panel.draw();
  drawMini();if(mapOpen)drawMap(mapOpen.querySelector('canvas'),true);
  if(tipT>0){tipT-=.25;if(tipT<=0)$('mTip').style.opacity=0}
  if(!ended&&ME.st!=='olu'&&ME.st!=='ship'&&alive===1&&t>PICK_T+SHIP_T)endScreen(true,null)
  else if(ended&&ME.st==='olu'&&alive===1&&!hud.won){hud.won=1;const w=P.find(p=>p.st!=='olu');if(w)feed(TL(`🏆 ${w.name} kazandı!`,`🏆 ${w.name} won!`))}}

// ---------- the loops ----------
let lastSim=performance.now(),netAcc=0,hostAcc=0,hudAcc=0;
function sim(){const now=performance.now(),dt=Math.min(.25,(now-lastSim)/1000);lastSim=now;const t=gtime();
  if(pickOpen&&t>=PICK_T)pickOpen();
  if(ME.st==='ship'&&!ME.cls)setCls(ME,SINIF[0]);
  for(let r=dt;r>1e-4;r-=.05)tick(Math.min(r,.05),t);
  if(hold.on&&ME.st==='yer')action(ME);
  netAcc+=dt;if(netAcc>=.125){netAcc=0;netTick()}
  hostAcc+=dt;if(hostAcc>=1){hostAcc=0;if(!solo)pickHost()}
  hudAcc+=dt;if(hudAcc>=.25){hudAcc=0;hud(t)}}
function tick(h,t){{keyInput();for(const p of P)if(p.local)step(p,h,t);
    for(let i=bolts.length-1;i>=0;i--){const b=bolts[i];b.t+=h;const s=48*h;b.x+=b.dx*s;b.z+=b.dz*s;b.y+=(b.dy||0)*s-h*h*4;let hit=b.t>1.2||b.y<height(b.x,b.z);
      if(!hit&&b.by){for(const o of P){if(o===b.by||o.st!=='yer')continue;if(Math.abs(o.x-b.x)<.9&&Math.abs(o.z-b.z)<.9&&b.y>o.y&&b.y<o.y+2.2){hitFighter(o,b.dmg,b.by,b.dx*2,b.dz*2);chips(b.x,b.y,b.z,'#ffe8b0',4);hit=true;break}}
        if(!hit)nodesNear(b.x,b.z,2,n=>{if(!hit&&n.hp>0&&n.t<5&&Math.hypot(n.x-b.x,n.z-b.z)<NODE[n.t].r*n.s*(n.t<2?.35:1)&&b.y<n.y+(n.t<2?4:1.8))hit=true});
        if(!hit)for(const w of walls)if(w.hp>0&&Math.hypot(w.x-b.x,w.z-b.z)<2.2&&b.y<height(w.x,w.z)+2.6){hit=true;break}}
      if(hit)bolts.splice(i,1)}}}
setInterval(sim,40);
let lastF=performance.now();
let fps=60,slowT=0,dpr=renderer.getPixelRatio();
function frame(){requestAnimationFrame(frame);const now=performance.now(),dt=Math.min(.1,(now-lastF)/1000);lastF=now;fps=lerp(fps,1/Math.max(dt,.001),.05);slowT=fps<28?slowT+dt:0;if(slowT>4&&dpr>.8){dpr=Math.max(.8,dpr-.2);renderer.setPixelRatio(dpr);renderer.setSize(innerWidth,innerHeight,false);slowT=0;if(dpr<=1&&sun.castShadow&&fps<22){sun.castShadow=false}}try{draw(dt,gtime())}catch(e){console.error(e)}}
requestAnimationFrame(frame);
window.__M={fast:sec=>{for(let i=0;i<sec*20;i++){T0-=50;tick(.05,gtime());if(i%5===0)hud(gtime())}},cam:(a,b,c)=>{cy=a;cp=b;cd=c},skip:s=>{T0-=s*1000},place:(x,z)=>{ME.st='yer';ME.x=x;ME.z=z;ME.y=height(x,z)},P,ME,S,zoneNow,gtime,action,craft,jump,shipAt,bolts,bags,walls,input,setCls};
window.READY=true;
