/* Büyük Harita: up to twenty commanders, each with a castle, ten soldiers and five horses, on a wide land of 24 castles.
   At the start everyone grabs a castle (first come, first served) and sets up their army; then they fight.
   The empty castles can be taken. The ring closes in from all four edges of the map until one commander is left.
   Each screen runs its own army; the first player also runs the computer armies and the empty castles. */
import * as THREE from 'three';
import {HALF,smooth,rng,CASTLES} from './dunya.js';
import {FOC,castleFade,S,makeScene,makeGround,updateGround,makeNodes,updateNodes,nodesNear,makeClutter,updateClutter,makeCastles,castleLook,drawChests,makeZone,drawZone,makeFx,chips,drawChips,mapImage,groundAt,placeSun,CW} from './sahne.js';
import {CHR,loadChr,chrPush,chrFlush,chrTime} from './karakter.js';
import {loadHorses} from './at.js';
import {makeSites,makeSiteMeshes,drawSites,siteVia as viaSite,siteAt as siteAtP,CENTER_R,LVC} from './hazine.js';
const V=new URL(import.meta.url).searchParams.get('v')||'1';
const {SES}=await import('../ses.js?v='+V);
// no music on the big map: only the sounds of the field, louder the nearer they are
SES.ayar.muzik=false;SES.chord=SES.pluck=SES.drum=()=>{};{const oi=SES.init.bind(SES);SES.init=()=>{oi();try{if(SES.mus)SES.mus.gain.value=0}catch(e){}}}
const A=window.ARENA||{},EN=window.LANG==='en',TL=(t,e)=>EN?e:t;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t,$=id=>document.getElementById(id);
const angD=(a,b)=>{let d=b-a;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;return d};
const SMALL=Math.min(innerWidth,innerHeight)<700;

// ---------- rules ----------
const SETUP_T=15;          // seconds to grab a castle and set up the army
const UNIT={
  sovalye:{ad:TL('Şövalye','Knight'),hp:260,zr:.3,sp:5.8,dmg:24,cd:.8,rng:2.6},
  okcu:{ad:TL('Okçu','Archer'),hp:180,zr:.15,sp:6.2,dmg:9,cd:1,rng:2.2,ok:22,okR:36},
  kilic:{ad:TL('Kılıçlı','Swordsman'),hp:110,zr:.2,sp:5.2,dmg:14,cd:.9,rng:2.4},
  arbalet:{ad:TL('Arbaletçi','Crossbowman'),hp:80,zr:.08,sp:5.4,dmg:5,cd:1.4,rng:2.2,ok:13,okR:32}};
const HORSE_SP=1.35,HORSE_HP=40,START_GOLD=100,CASTLE_HP=2000,NEUTRAL_HP=2000,CAP_T=10,KILL_G=15,CMD_G=60;
const COST={silah:[150,300,500],zirh:[150,300,500],kule:[200,350,500],asker:50,at:80,onar:100,iyiles:40};
const PAL=['#c0392b','#e67e22','#f1c40f','#27ae60','#16a085','#2980b9','#8e44ad','#d35490','#ecf0f1','#2c3e50','#7f5539','#a0d468','#e74c3c','#1abc9c','#34495e','#f39c12','#9b59b6','#3498db','#2ecc71','#95a5a6'].map(c=>new THREE.Color(c));
const COATS=['#7a4524','#5a3018','#8f5a2e','#2b2420','#b9a48a','#6b4a33','#a06a3a','#ece6dc'].map(c=>new THREE.Color(c));
const NAMES=['Ayaz','Bora','Kaan','Selim','Oğuz','Doruk','Arda','Deniz','Yiğit','Batu','Efe','Mert','Eren','Kerem','Toprak','Çınar','Atlas','Tuna','Alp','Tarık','Poyraz','Sarp','Umut','Rüzgar'];
// the ring: it stands still for four minutes, then closes in from all four edges, step by step, the same for everyone
const ZS=[[240,60,760,2],[70,50,520,3],[60,45,330,5],[50,40,180,8],[40,35,80,12],[40,40,0,16]];
function zoneAt(t){let h=HALF-30,tt=t-SETUP_T,d=0;for(const[w,s,r,dmg]of ZS){if(tt<w)return{h,d,wait:w-tt,shr:false,next:r};tt-=w;if(tt<s)return{h:lerp(h,r,smooth(0,1,tt/s)),d:dmg,wait:s-tt,shr:true,next:r};tt-=s;h=r;d=dmg}return{h:0,d:16,wait:0,shr:false,next:0}}
const outside=(x,z,h)=>Math.max(Math.abs(x),Math.abs(z))>h;

// ---------- match setup ----------
const seed=(A.seed>>>0)||((Math.random()*4294967295)>>>0),R=rng(seed);let T0=A.t0||Date.now()+1500;
const gtime=()=>(Date.now()-T0)/1000;
const humans=(A.players||[{id:'ben',name:TL('Sen','You')}]).filter(p=>p&&!p.bot).slice(0,20);
const PL=[];
humans.forEach(h=>PL.push(mkPlayer(h.id,String(h.name||'Oyuncu').slice(0,12),false)));
for(let i=0;PL.length<20;i++)PL.push(mkPlayer('b'+i,NAMES[(seed+i*7)%NAMES.length],true));
PL.forEach((p,i)=>{p.ix=i;p.colI=i;p.col=PAL[i]});
function mkPlayer(id,name,bot){return{id,name,bot,cmd:bot?(R()<.6?'sovalye':'okcu'):'sovalye',army:Array.from({length:10},(_,k)=>({w:k<6?'kilic':'arbalet',h:k<4,g:k<4?1:k<7?2:3})),cmdHorse:true,hs:[],gold:START_GOLD,lv:{s:0,z:0,k:0},castles:[],home:null,units:[],out:false,kills:0,seen:Date.now(),mode:'takip',goal:null,respawn:0,local:false}}
const ME=PL.find(p=>p.id===A.id)||PL[0];ME.local=true;
// the player's army is split into three squads (I, II, III); each follows its own order. SEL: the squad the orders go to (0: all)
ME.G=[null,{mode:'takip',goal:null},{mode:'takip',goal:null},{mode:'takip',goal:null}];let SEL=0;
try{const s=JSON.parse(localStorage.getItem('mdn_ordu')||'null');if(s&&Array.isArray(s.army)&&s.army.length===10){ME.army=s.army.map((a,i)=>({w:a.w==='arbalet'?'arbalet':'kilic',h:!!a.h,g:a.g>=1&&a.g<=3?a.g|0:i<4?1:i<7?2:3}));ME.cmd=s.cmd==='okcu'?'okcu':'sovalye';ME.cmdHorse=!!s.ch}const c=+localStorage.getItem('mdn_col');if(localStorage.getItem('mdn_col')!=null&&c>=0&&c<PAL.length){ME.colI=c;ME.col=PAL[c]}}catch(e){}
// the castles: owner (player index) or null, health, and which screen runs them
const ARCH_HP=45;
const CS=CASTLES.map((c,k)=>({k,owner:null,hp:NEUTRAL_HP,mhp:NEUTRAL_HP,ruined:false,cd:0,gold:0,cap:null,ah:[ARCH_HP,ARCH_HP,ARCH_HP,ARCH_HP],art:0}));
let hostIx=0;const iAmHost=()=>PL[hostIx]===ME;
const castleLocal=c=>c.owner==null?iAmHost():PL[c.owner].local;

// ---------- page ----------
document.body.classList.add('mdn');for(const id of['lobby','hud','ov','eye','rot','ver','arenaEnd'])if($(id))$(id).hidden=true;
const css=document.createElement('style');css.textContent=`
body.mdn #ov,body.mdn #hud,body.mdn #eye,body.mdn #rot,body.mdn #ver{display:none!important}
#mdn{position:fixed;inset:0;pointer-events:none;font:600 14px Georgia,serif;color:#f6ecd4;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
html,body,canvas{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}canvas{touch-action:none}
#mdn button{pointer-events:auto;font:700 14px Georgia,serif;color:#f6ecd4;background:rgba(20,26,34,.82);border:1.5px solid #c9b07a;border-radius:10px;cursor:pointer;touch-action:none}
#mdn button:disabled{opacity:.4}#mdn button.on{background:radial-gradient(circle at 35% 30%,#ffe9a8,#c8902e 85%);color:#1a1206}
#mHp{position:absolute;${SMALL?'left:10px;top:calc(6px + env(safe-area-inset-top,0px));width:min(46vw,215px);':'left:10px;top:calc(8px + env(safe-area-inset-top,0px));width:250px;'}background:rgba(12,16,22,.62);border-radius:10px;padding:5px 9px}
#mHp b{display:block;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#mHpBar{height:9px;border-radius:5px;background:#3a1d1d;margin-top:4px;overflow:hidden}#mHpBar i{display:block;height:100%;background:linear-gradient(90deg,#d84b3a,#f2a04a);width:100%;transition:width .2s}
#mLv{font-size:${SMALL?11:12}px;opacity:.95;margin-top:3px;white-space:nowrap;overflow:hidden}
#mTop{position:absolute;left:50%;transform:translateX(-50%);top:calc(8px + env(safe-area-inset-top,0px));background:rgba(12,16,22,.6);border-radius:10px;padding:5px 11px;text-align:center;font-size:13px;white-space:nowrap}
#mTop small{display:block;font-size:11.5px;color:#d9b8ff}
#mMini{position:absolute;right:10px;top:calc(8px + env(safe-area-inset-top,0px));width:${SMALL?112:170}px;height:${SMALL?112:170}px;border-radius:12px;border:2px solid #c9b07a;pointer-events:auto;background:#223}
#mFeed{position:absolute;right:10px;top:calc(${SMALL?128:186}px + env(safe-area-inset-top,0px));text-align:right;font-size:12px;max-width:60vw}
#mFeed div{background:rgba(12,16,22,.6);border-radius:6px;padding:2px 7px;margin-bottom:3px;display:inline-block;clear:both;float:right}
#mAct{position:absolute;right:${SMALL?14:34}px;bottom:calc(${SMALL?18:40}px + env(safe-area-inset-bottom,0px));width:${SMALL?80:92}px;height:${SMALL?80:92}px;border-radius:50%!important;font-size:32px!important;background:radial-gradient(circle at 35% 30%,#ffe9a8,#c8902e 75%)!important;color:#1a1206!important;border:3px solid #fff1c4!important}
#mCmd{position:absolute;right:${SMALL?102:140}px;bottom:calc(${SMALL?12:36}px + env(safe-area-inset-bottom,0px));display:grid;grid-template-columns:repeat(3,${SMALL?50:58}px);gap:5px}
#mGrp{position:absolute;right:${SMALL?102:140}px;bottom:calc(${SMALL?110:144}px + env(safe-area-inset-bottom,0px));display:flex;gap:4px}#mGrp button{height:${SMALL?30:34}px;min-width:${SMALL?36:42}px;font-size:${SMALL?11.5:13}px!important;padding:1px 5px}#mGrp button small{font-size:10px;margin-left:3px;opacity:.8}
#mCmd button{height:${SMALL?42:46}px;font-size:${SMALL?10.5:12}px!important;padding:2px;line-height:1.1}#mCmd button b{display:block;font-size:16px}
#mSide{position:absolute;right:${SMALL?14:34}px;bottom:calc(${SMALL?108:146}px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:6px}
#mSide button{width:${SMALL?52:58}px;height:${SMALL?46:50}px;font-size:${SMALL?11:12}px!important;padding:1px;line-height:1.1}#mSide button b{display:block;font-size:18px}
#mGold{position:absolute;left:10px;top:calc(${SMALL?70:84}px + env(safe-area-inset-top,0px));background:rgba(12,16,22,.62);border-radius:10px;padding:4px 10px;font-size:15px}
#mJoyH{position:absolute;left:${SMALL?70:90}px;bottom:calc(${SMALL?60:80}px + env(safe-area-inset-bottom,0px));width:110px;height:110px;border-radius:50%;border:2px dashed rgba(255,255,255,.22);transform:translate(-50%,50%)}
#mJoy{position:absolute;width:120px;height:120px;border-radius:50%;border:2px solid rgba(255,255,255,.35);background:rgba(255,255,255,.08);display:none;transform:translate(-50%,-50%)}
#mJoy i{position:absolute;left:50%;top:50%;width:52px;height:52px;border-radius:50%;background:rgba(255,240,200,.55);transform:translate(-50%,-50%)}
#mTip{position:absolute;left:50%;transform:translateX(-50%);top:calc(${SMALL?60:66}px + env(safe-area-inset-top,0px));background:rgba(12,16,22,.8);border-radius:9px;padding:6px 12px;font-size:14px;max-width:86vw;text-align:center;transition:opacity .4s;opacity:0}
#mPanel{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:rgba(16,20,28,.95);border:2px solid #c9b07a;border-radius:14px;padding:12px;pointer-events:auto;width:min(94vw,440px);max-height:88vh;overflow:auto}
#mPanel h2{margin:0 0 8px;font-size:18px;color:#ffd98a;text-align:center}#mPanel p{margin:6px 0;font-size:13px;opacity:.92;text-align:center}
#mPanel .row{display:flex;gap:8px;align-items:center;margin:6px 0}#mPanel .row button{flex:1;padding:10px 8px;text-align:left}#mPanel .row button small{display:block;font-weight:400;font-size:12px;color:#ffd98a;margin-top:2px}
#mPanel .go,#mSetup .go{display:block;width:100%;margin-top:10px;padding:12px;font-size:17px;background:radial-gradient(circle at 35% 30%,#ffe9a8,#c8902e 75%);color:#1a1206}
.mArmy{display:grid;grid-template-columns:repeat(${SMALL?4:6},1fr);gap:6px;margin:6px 0}.mArmy button{padding:6px 2px!important;font-size:12px!important;line-height:1.2;width:100%}.mArmy button b{display:block;font-size:19px}
#mSetup{position:absolute;inset:0;background:rgba(6,10,14,.9);pointer-events:auto;display:flex;flex-direction:column;align-items:center;overflow:auto;padding:8px 8px calc(10px + env(safe-area-inset-bottom,0px))}
#mSetup h2{margin:6px 0 2px;color:#ffd98a;font-size:19px}#mSetup p{margin:3px 0;font-size:13px;text-align:center}#mSetup canvas{width:min(94vw,56vh);height:min(94vw,56vh);border-radius:12px;border:2px solid #c9b07a;touch-action:none;flex:none}
#mSetup .cls{display:flex;gap:8px;margin:6px 0;justify-content:center}#mSetup .cls button{padding:8px 14px}#mSetup .box{width:min(94vw,560px)}
#mMap{position:absolute;inset:0;background:rgba(6,10,14,.82);pointer-events:auto;display:flex;align-items:center;justify-content:center;flex-direction:column}
#mMap canvas{width:min(94vw,82vh);height:min(94vw,82vh);border-radius:12px;border:2px solid #c9b07a}#mMap p{margin:8px;font-size:13px;text-align:center}
#mMenu{position:absolute;left:${SMALL?96:10}px;top:calc(${SMALL?70:118}px + env(safe-area-inset-top,0px));padding:5px 10px;font-size:13px!important}
.mLab{position:absolute;transform:translate(-50%,-100%);font-size:12px;white-space:nowrap;text-shadow:0 1px 2px #000,0 0 3px #000;text-align:center;line-height:1.15}
.mLab i{display:block;margin:2px auto 0;width:46px;height:4px;background:#3a1d1d;border-radius:2px;overflow:hidden}.mLab i b{display:block;height:100%;background:#e05a3a}
.mLab.c{font-size:13px;font-weight:700}
.mNum{position:absolute;transform:translate(-50%,-50%);font:800 17px Georgia,serif;text-shadow:0 2px 3px #000,0 0 4px #000;pointer-events:none}
#mHurt{position:absolute;inset:0;box-shadow:inset 0 0 90px rgba(200,20,20,0);transition:box-shadow .25s}
#mOut{position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(120,40,160,0) 40%,rgba(120,40,160,.35));display:none}`;
document.head.append(css);
const UI=document.createElement('div');UI.id='mdn';UI.innerHTML=`<div id="mOut"></div><div id="mHurt"></div><div id="mLabs"></div>
<div id="mHp"><b id="mName"></b><div id="mHpBar"><i></i></div><div id="mLv"></div></div><div id="mGold"></div><div id="mTop"></div><canvas id="mMini" width="220" height="220"></canvas><div id="mFeed"></div>
<div id="mJoyH"></div><div id="mJoy"><i></i></div><button id="mAct">⚔️</button>
<div id="mGrp"><button data-g="0">${TL('Tümü','All')}<small></small></button><button data-g="1">I<small></small></button><button data-g="2">II<small></small></button><button data-g="3">III<small></small></button></div>
<div id="mCmd"><button data-m="takip"><b>👣</b>${TL('Takip','Follow')}</button><button data-m="hucum"><b>⚔️</b>${TL('Hücum','Charge')}</button><button data-m="pusu"><b>🌲</b>${TL('Pusu','Ambush')}</button><button data-m="bekle"><b>✋</b>${TL('Bekle','Hold')}</button><button data-m="kale"><b>🏰</b>${TL('Kaleye','Castle')}</button></div>
<div id="mSide"><button id="mRide"><b>🐎</b><span>${TL('Bin','Mount')}</span></button><button id="mShop"><b>🔨</b>${TL('Kale','Castle')}</button><button id="mArmyB"><b>🐎</b>${TL('Ordu','Army')}</button></div>
<button id="mMenu">☰</button><div id="mTip"></div>`;
document.body.append(UI);
let tipT=0;function tip(m,s=3){const e=$('mTip');e.textContent=m;e.style.opacity=1;tipT=s}
function feed(m){const f=$('mFeed'),d=document.createElement('div');d.textContent=m;f.prepend(d);while(f.children.length>5)f.lastChild.remove();setTimeout(()=>d.remove(),9000)}

// ---------- the world ----------
const cv=$('game');cv.style.display='block';
makeScene(cv,SMALL);const {renderer,scene,camera,sun}=S;
makeGround();makeNodes();makeCastles();makeZone();makeFx();makeClutter();
// the weapon caches: where they stand and what they hold comes from this match's seed, so it changes every match
const SITES=makeSites(seed),CHESTS=SITES.flatMap(o=>o.chests),WR=rng((seed^0x77aa)>>>0);makeSiteMeshes(SITES,V);
let HORSE=null;
const MAPN=SMALL?256:384,MAPI=mapImage(MAPN);
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()});
const loading=document.createElement('div');loading.style.cssText='position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#0d1a26;font:700 18px Georgia,serif;color:#ffd98a;z-index:9';loading.textContent=TL('Kaleler hazırlanıyor…','Getting the castles ready…');document.body.append(loading);
try{await Promise.all(['sovalye','okcu','binici'].map(k=>loadChr(scene,k,V)))}catch(e){console.warn(e)}
try{HORSE=await loadHorses(scene,110,V)}catch(e){console.warn(e)}
loading.remove();
for(const c of CS)castleLook(c.k,new THREE.Color('#d8d2c4'),false);

// ---------- units ----------
const uid=(pi,k)=>pi*12+k;
const unitStats=(p,u)=>UNIT[u.k===0?p.cmd:u.w];
// weapon level 1..10: the better of what the castle smithy gives the whole army and what this man found
const wLv=(p,u)=>Math.max(1+p.lv.s,u.wl||1),wMul=(p,u)=>1+.12*(wLv(p,u)-1);
function newUnit(p,k,w,h,x,z){const T=UNIT[k===0?p.cmd:w],mhp=T.hp+(h?HORSE_HP:0);return{p:p.ix,k,id:uid(p.ix,k),w,horse:h,x,z,y:groundAt(x,z),a:0,hp:mhp,mhp,wl:1,g:k===0?0:k<=4?1:k<=7?2:3,dead:false,act:null,cd:0,mv:0,flash:0,kx:0,kz:0,ph:R(),tgt:null,coat:COATS[(p.ix*11+k)%COATS.length]}}
function spawnArmy(p){const Cc=S.castles[p.home];if(!Cc)return;p.units=[];const y=Cc.yard;
  const c0=newUnit(p,0,null,false,y.x,y.z);c0.a=Cc.a;p.units.push(c0);
  p.army.forEach((a,i)=>{const ang=(i/10)*6.283,r=4+(i%3)*1.6;const u=newUnit(p,i+1,a.w,false,y.x+Math.cos(ang)*r,y.z+Math.sin(ang)*r);u.a=Cc.a;if(a.g)u.g=a.g;p.units.push(u)});
  // five horses in the stable; whoever was given one at the start sets out already mounted
  p.hs=Cc.stable.map((sl,i)=>mkHorse(p,i,sl.x,sl.z,sl.a));const riders=[p.cmdHorse?0:-1,...p.army.map((a,i)=>a.h?i+1:-1)].filter(k=>k>=0).slice(0,5);riders.forEach((k,j)=>mount(p,p.units.find(o=>o.k===k),p.hs[j]))}
// ---------- horses: they live in the castle stable; a soldier walks to one to mount, and a horse left behind walks home ----------
function mkHorse(p,i,x,z,a){return{i,x,z,a,y:groundAt(x,z),rider:null,want:null,mv:0,ph:Math.random(),coat:COATS[(p.ix*7+i)%COATS.length]}}
function mount(p,u,h){if(!u||!h)return;h.rider=u.k;h.want=null;u.horse=true;u.hi=h.i;u.wantH=null;u.mhp+=HORSE_HP;u.hp+=HORSE_HP;u.coat=h.coat;if(started)snd('kisne',u.x,u.z,40,.7)}
function dismount(p,u){const h=p.hs.find(o=>o.rider===u.k);u.horse=false;u.hi=null;u.mhp-=HORSE_HP;u.hp=Math.max(1,Math.min(u.hp,u.mhp));if(h){h.rider=null;h.x=u.x+Math.cos(u.a)*1.7;h.z=u.z-Math.sin(u.a)*1.7;h.a=u.a;h.rest=gtime()+3}}
function freeHorse(p,x,z,r){let best=null,bd=r;for(const h of p.hs){if(h.rider!=null||h.want!=null)continue;const d=Math.hypot(h.x-x,h.z-z);if(d<bd){bd=d;best=h}}return best}
function horseTick(p,dt){const C=p.home!=null&&!CS[p.home].ruined?S.castles[p.home]:null;
  for(const h of p.hs){if(h.rider!=null){const r=p.units.find(o=>o.k===h.rider);if(!r||r.dead||!r.horse){h.rider=null;h.rest=gtime()+2}else{h.x=r.x;h.z=r.z;h.a=r.a;h.y=r.y;h.mv=r.mv;continue}}
    h.mv=0;if(h.want!=null){const w=p.units.find(o=>o.k===h.want);if(!w||w.dead||w.wantH!==h.i)h.want=null;continue}if(!C||gtime()<(h.rest||0))continue;
    const sl=C.stable[h.i%5],g=viaGate(h,{x:sl.x,z:sl.z}),dx=g.x-h.x,dz=g.z-h.z,d=Math.hypot(dx,dz);if(d>.6){const st=Math.min(d,3.4*dt);const ox=h.x,oz=h.z;h.x+=dx/d*st;h.z+=dz/d*st;h.a+=angD(h.a,Math.atan2(dx,dz))*Math.min(1,dt*5);collide(h,.9);h.mv=Math.hypot(h.x-ox,h.z-oz)/dt}else h.a+=angD(h.a,sl.a)*Math.min(1,dt*2);h.y=groundAt(h.x,h.z)}}
const unitById=id=>{const p=PL[Math.floor(id/12)];return p&&p.units.find(u=>u.id===id)};

// ---------- collisions: trees, rocks, castle walls ----------
function segPush(u,x1,z1,x2,z2,r){const dx=x2-x1,dz=z2-z1,l2=dx*dx+dz*dz||1e-9,t=clamp(((u.x-x1)*dx+(u.z-z1)*dz)/l2,0,1),cx=x1+dx*t,cz=z1+dz*t,ex=u.x-cx,ez=u.z-cz,d=Math.hypot(ex,ez);if(d<r){if(d<1e-4){u.x+=r;return}u.x=cx+ex/d*r;u.z=cz+ez/d*r}}
function collide(u,R0){
  nodesNear(u.x,u.z,4,n=>{if(n.hp<=0||n.t===5)return;const r=(n.t<2?.55*n.s:1.4*n.s)+R0,dx=u.x-n.x,dz=u.z-n.z,d=Math.hypot(dx,dz);if(d<r&&d>1e-4){u.x=n.x+dx/d*r;u.z=n.z+dz/d*r}});
  for(const c of S.castles){if(Math.abs(c.x-u.x)>CW+8||Math.abs(c.z-u.z)>CW+8)continue;if(CS[c.k].ruined)continue;for(const s of c.segs)segPush(u,s[0],s[1],s[2],s[3],s[4]+R0)}
  for(const o of SITES){if(!o.segs.length||Math.abs(o.x-u.x)>13||Math.abs(o.z-u.z)>13)continue;for(const s of o.segs)segPush(u,s[0],s[1],s[2],s[3],s[4]+R0)}
  const b=HALF-40;u.x=clamp(u.x,-b,b);u.z=clamp(u.z,-b,b)}

// ---------- network ----------
const NET={ch:null,on:false};const solo=!A.sb||humans.length<2;
if(!solo){try{NET.ch=A.sb.channel('mdn-'+A.room,{config:{broadcast:{self:false}}});
  const on=(ev,f)=>NET.ch.on('broadcast',{event:ev},({payload})=>{try{f(payload||{})}catch(e){console.warn(e)}});
  on('s',onState);on('h',m=>{const u=unitById(m.u);if(u&&PL[u.p].local)hurt(u,+m.d||0,PL[m.by]||null,+m.kx||0,+m.kz||0)});on('ch',m=>{const c=CS[m.c];if(c&&castleLocal(c))hurtCastle(c,+m.d||0,PL[m.by]||null)});
  on('claim',m=>{if(iAmHost())claim(+m.c,+m.p,gtime()<SETUP_T+6)});on('own',m=>{if(Array.isArray(m.o)&&gtime()<SETUP_T+4)m.o.forEach((o,k)=>{if(o!==CS[k].owner)setOwner(k,o)})});
  on('k',m=>{const k=PL[m.by];if(k&&k.local){k.gold+=m.c?CMD_G:KILL_G;if(m.c)k.kills++;if(k===ME)tip(m.c?TL(`Komutan yenildi! +${CMD_G} altın`,`Commander down! +${CMD_G} gold`):`+${KILL_G} 🪙`,1.5)}});
  on('lt',m=>{const c=CS[m.c];if(c){c.gold=0;c.wpn=0;chestDirty=true}});on('wt',m=>{const o=SITES[m.i],c=o&&o.chests[m.j|0];if(c)c.taken=true});on('cg',m=>{if(Array.isArray(m.g)&&!iAmHost())m.g.forEach((g,k)=>{CS[k].gold=g});chestDirty=true});
  on('cap',m=>{const p=PL[m.o];if(p&&CS[m.c]&&CS[m.c].owner!==m.o)takeCastle(+m.c,p)});
  on('cr',m=>{ruin(+m.c,PL[m.by]||null)});on('ah',m=>{const c=CS[m.c];if(c&&castleLocal(c))hurtArcher(m.c,m.i|0,+m.d||0,PL[m.by]||null)});on('ad',m=>{const c=CS[m.c];if(c&&c.ah)c.ah[m.i|0]=0});on('ar',m=>{const c=CS[m.c];if(c&&c.ah)c.ah[m.i|0]=ARCH_HP});on('f',m=>{bolts.push({x:+m.x,y:+m.y,z:+m.z,dx:+m.dx,dz:+m.dz,dy:+m.dy,t:0,vis:true})});on('out',m=>{const p=PL[m.p];if(p&&!p.local)eliminate(p)});
  NET.ch.subscribe(s=>{if(s==='SUBSCRIBED')NET.on=true})}catch(e){console.warn(e)}}
const send=(ev,payload)=>{if(NET.on)try{NET.ch.send({type:'broadcast',event:ev,payload})}catch(e){}};
function packPlayer(p){const u=[];for(const o of p.units)u.push([o.k,+o.x.toFixed(1),+o.z.toFixed(1),+o.a.toFixed(2),Math.round(o.hp),o.mhp,(o.horse?1:0)|(o.w==='arbalet'?2:0)|(o.dead?4:0)|(o.act?8:0)|(o.mv>.6?16:0)|(o.hid?32:0),o.wl||1]);
  return{p:p.ix,c:p.cmd,g:Math.round(p.gold),lv:[p.lv.s,p.lv.z,p.lv.k],u,ci:p.colI,k:p.kills,h:p.home,hs:p.hs.map(o=>[o.i,+o.x.toFixed(1),+o.z.toFixed(1),+o.a.toFixed(2),o.rider??-1,o.mv>.5?1:0]),cs:p.castles.map(k=>[k,Math.round(CS[k].hp)])}}
function netTick(fast){if(!NET.on)return;const ps=[];for(const p of PL)if(p.local&&(!p.bot||fast))ps.push(packPlayer(p));if(iAmHost()&&fast)ps.push({p:-1,cs:CS.filter(c=>c.owner==null).map(c=>[c.k,Math.round(c.hp)])});if(ps.length)send('s',{ps})}
function onState(m){for(const s of m.ps||[]){if(s.p===-1){for(const[k,hp]of s.cs||[])if(CS[k]&&!castleLocal(CS[k]))CS[k].hp=hp;continue}
  const p=PL[s.p];if(!p||p.local)continue;p.seen=Date.now();p.cmd=s.c;p.gold=s.g;[p.lv.s,p.lv.z,p.lv.k]=s.lv||[0,0,0];p.kills=s.k|0;if(s.ci>=0&&s.ci<PAL.length&&p.colI!==s.ci){p.colI=s.ci;p.col=PAL[s.ci];for(const k of p.castles)castleLook(k,p.col,CS[k].ruined)}
  if(Array.isArray(s.hs)){const old=p.hs;p.hs=s.hs.map(r=>{const o=old.find(h=>h.i===r[0])||mkHorse(p,r[0],r[1],r[2],r[3]);o.tx=r[1];o.tz=r[2];o.ta=r[3];o.rider=r[4]<0?null:r[4];o.mv=r[5]?3:0;return o})}
  if(s.h!=null&&p.home==null)p.home=s.h;for(const[k,hp]of s.cs||[])if(CS[k]&&CS[k].owner===p.ix)CS[k].hp=hp;
  for(const r of s.u||[]){let u=p.units.find(o=>o.k===r[0]);if(!u){u=newUnit(p,r[0],r[6]&2?'arbalet':'kilic',!!(r[6]&1),r[1],r[2]);p.units.push(u)}
    u.tx=r[1];u.tz=r[2];u.ta=r[3];u.hp=r[4];u.mhp=r[5];u.horse=!!(r[6]&1);u.w=r[0]?(r[6]&2?'arbalet':'kilic'):null;if(r[6]&4&&!u.dead){u.dead=true;u.dieT=gtime()}else if(!(r[6]&4))u.dead=false;
    if(r[6]&8&&!u.act)u.act={t:0,dur:.6,remote:true,v:(u.sw=(u.sw|0)^1)};u.rmv=!!(r[6]&16);u.hid=!!(r[6]&32);u.wl=r[7]||1}}}

// ---------- castles: claiming, owning, taking, ruining ----------
function setOwner(k,o){const c=CS[k];const was=c.owner;if(was!==o)c.ah=[ARCH_HP,ARCH_HP,ARCH_HP,ARCH_HP];if(was!=null)PL[was].castles=PL[was].castles.filter(x=>x!==k);c.owner=o;if(o!=null){const p=PL[o];if(!p.castles.includes(k))p.castles.push(k)}
  castleLook(k,o==null?new THREE.Color('#d8d2c4'):PL[o].col,c.ruined)}
// first come, first served: the first to tap a castle gets it (the host settles who was first)
const isCenter=k=>Math.hypot(CASTLES[k].x,CASTLES[k].z)<CENTER_R;
function claim(k,pi,force){const c=CS[k],p=PL[pi];if(!c||!p||isCenter(k)||(!force&&gtime()>SETUP_T+2))return false;if(c.owner!=null&&c.owner!==pi)return false;if(p.home!=null&&p.home!==k)setOwner(p.home,null);p.home=k;setOwner(k,pi);c.hp=c.mhp=CASTLE_HP;if(!solo&&iAmHost())send('own',{o:CS.map(c=>c.owner)});return true}
function wantCastle(k){if(gtime()>=SETUP_T)return;const c=CS[k];if(isCenter(k)){tip(TL('Ortadaki kaleler başlangıçta seçilemez. Savaş başlayınca alınabilir, içlerinde güçlü silahlar var.','The castles in the middle can\'t be chosen at the start. Take them once the battle begins: strong weapons wait inside.'),3);return}if(c.owner!=null&&c.owner!==ME.ix){tip(TL('Bu kaleyi başkası aldı','Someone else has this castle'));return}if(iAmHost())claim(k,ME.ix);else{send('claim',{c:k,p:ME.ix});claim(k,ME.ix)}SES.para&&SES.para()}
// only the closing ring wears a castle down; a castle that falls to it is a ruin
function hurtCastle(c,d,by){if(c.ruined||c.hp<=0)return;c.hp-=d;if(c.hp<=0){c.hp=0;ruin(c.k,by);send('cr',{c:c.k,by:by?by.ix:null})}}
// a castle is taken by bringing your commander into its yard and holding it, with none of its owner's men left inside
const inYard=(k,x,z)=>{const l=localIn(S.castles[k],x,z);return Math.abs(l.x)<CW-1.5&&Math.abs(l.z)<CW-1.5};
function captureTick(p,dt){const u=p.units[0];if(!u||u.dead)return;let k=-1;for(const C of S.castles){if(Math.abs(C.x-u.x)>CW||Math.abs(C.z-u.z)>CW)continue;if(inYard(C.k,u.x,u.z)){k=C.k;break}}
  if(p.capK!=null&&p.capK!==k){const o=CS[p.capK];if(o&&o.cap&&o.cap.by===p.ix)o.cap=null;p.capK=null}
  if(k<0)return;const c=CS[k];if(c.ruined||c.owner===p.ix)return;
  const def=c.owner!=null&&PL[c.owner].units.some(o=>!o.dead&&inYard(k,o.x,o.z));
  if(def){if(c.cap&&c.cap.by===p.ix)c.cap.t=Math.max(0,c.cap.t-dt);return}
  if(!c.cap||c.cap.by!==p.ix)c.cap={by:p.ix,t:0};p.capK=k;c.cap.t+=dt;
  if(c.cap.t>=CAP_T){c.cap=null;p.capK=null;takeCastle(k,p);send('cap',{c:k,o:p.ix})}}
function takeCastle(k,p){const c=CS[k],was=c.owner;setOwner(k,p.ix);c.hp=Math.max(c.hp,c.mhp*.5);if(was!=null){const o=PL[was];if(o.home===k)o.home=o.castles[0]??null;if(o===ME)tip(TL('Kaleni kaybettin!','You lost a castle!'),4)}
  feed(TL(`${p.name} ${CASTLES[k].ad} kalesini aldı`,`${p.name} took ${CASTLES[k].en}`));if(p.home==null)p.home=k;if(p===ME){SES.para&&SES.para();tip(TL('Kale senin! Avludaki sandıkta altın varsa al.','The castle is yours! Take the gold from the chest in the yard.'),4)}}
// the treasure chest in each yard: the first commander to reach it takes the gold
let chestDirty=true;
function lootTick(p){const u=p.units[0];if(!u||u.dead)return;for(const C of S.castles){const c=CS[C.k];if((c.gold<=0&&!c.wpn)||c.ruined)continue;if(Math.abs(C.chest.x-u.x)>2.4||Math.abs(C.chest.z-u.z)>2.4)continue;
  const g=c.gold,wv=c.wpn||0;c.gold=0;c.wpn=0;p.gold+=g;chestDirty=true;send('lt',{c:C.k,by:p.ix});if(wv)giveWeapon(p,wv);chips(C.chest.x,groundAt(C.chest.x,C.chest.z)+1,C.chest.z,'#f2c33a',14,3);if(p===ME){tip(TL(`Sandıktan ${g} altın aldın!`,`You took ${g} gold from the chest!`),2.5);SES.para&&SES.para()}}}
// a weapon found: the commander takes it if it is better than his, and hands his old one to the man with the worst
function giveWeapon(p,lv){const c=p.units[0],men=p.units.filter(o=>o.k>0&&!o.dead).sort((a,b)=>(a.wl||1)-(b.wl||1));let got=null,down=null;
  if(c&&!c.dead&&lv>(c.wl||1)){const old=c.wl||1;c.wl=lv;got=TL('komutana','to the commander');if(men[0]&&old>(men[0].wl||1)){men[0].wl=old;down=old}}
  else if(men[0]&&lv>(men[0].wl||1)){men[0].wl=lv;got=TL('bir askerine','to one of your soldiers')}
  if(p===ME){SES.para&&SES.para();tip(got?TL(`⚔️ Seviye ${lv} silah ${got}!`,`⚔️ Level ${lv} weapon ${got}!`)+(down?TL(` Eski silahı (Sv ${down}) bir askere geçti.`,` His old one (Lv ${down}) went to a soldier.`):''):TL(`Seviye ${lv} silah buldun ama ordunda daha iyileri var.`,`You found a level ${lv} weapon, but your army has better.`),3);if(lv>=9)feed(TL(`${p.name} efsanevi bir silah buldu!`,`${p.name} found a legendary weapon!`))}
  else if(lv>=9)feed(TL(`${p.name} efsanevi bir silah buldu!`,`${p.name} found a legendary weapon!`))}
function siteTick(p){const u=p.units[0];if(!u||u.dead)return;for(const c of CHESTS){if(c.taken||Math.abs(c.x-u.x)>2.3||Math.abs(c.z-u.z)>2.3)continue;
  c.taken=true;send('wt',{i:c.i,j:c.j,by:p.ix});chips(c.x,groundAt(c.x,c.z)+1,c.z,LVC[c.lv-1],16,3);giveWeapon(p,c.lv)}}
const siteVia=(u,g)=>viaSite(SITES,u,g),siteAt=(x,z)=>siteAtP(SITES,x,z);
function ruin(k,by){const c=CS[k];if(c.ruined)return;c.ruined=true;c.hp=0;const o=c.owner;castleLook(k,o!=null?PL[o].col:new THREE.Color('#999'),true);if(o!=null){const p=PL[o];p.castles=p.castles.filter(x=>x!==k);if(p.home===k)p.home=p.castles[0]??null;feed(TL(`${CASTLES[k].ad} yıkıldı!`,`${CASTLES[k].en} has fallen!`));if(p===ME)tip(p.home!=null?TL('Bir kalen yıkıldı!','One of your castles has fallen!'):TL('Kalen yıkıldı! Komutanın ölürse bir daha dönemez.','Your castle has fallen! If your commander dies now, it is over.'),5)}
  if(by&&by.local&&by.ix!==o)by.gold+=200;const C=CASTLES[k];for(let i=0;i<40;i++)chips(C.x+(Math.random()-.5)*30,C.y+3+Math.random()*6,C.z+(Math.random()-.5)*30,'#9a958a',1,6)}

// ---------- fighting ----------
const bolts=[],nums=[];
function popNum(x,y,z,txt,c){if(nums.length>14)nums.shift().el.remove();const el=document.createElement('div');el.className='mNum';el.textContent=txt;el.style.color=c;$('mLabs').append(el);nums.push({x,y,z,t:0,el})}
function hurt(u,d,by,kx,kz){if(u.dead)return;const p=PL[u.p],T=unitStats(p,u);d*=1-(T.zr+.08*p.lv.z);u.hp-=d;u.flash=1;u.kx+=kx;u.kz+=kz;u.hurtT=gtime();
  if(u.k===0&&p===ME){$('mHurt').style.boxShadow='inset 0 0 90px rgba(200,20,20,.55)';setTimeout(()=>$('mHurt').style.boxShadow='inset 0 0 90px rgba(200,20,20,0)',220)}
  if(by&&p.bot)p.threat={x:u.x,z:u.z,t:gtime(),by:by.ix};
  if(u.hp<=0)die(u,by)}
function hitUnit(v,d,by,kx,kz){const p=PL[v.p];if(by===ME||p===ME){const T=unitStats(p,v);popNum(v.x,v.y+2.3,v.z,Math.round(d*(1-(T.zr+.08*p.lv.z))),by===ME?'#ffe08a':'#ff6a5a')}if(p.local)hurt(v,d,by,kx,kz);else send('h',{u:v.id,d:+d.toFixed(1),by:by?by.ix:-1,kx:+kx.toFixed(2),kz:+kz.toFixed(2)});v.flash=1}
function die(u,by){const p=PL[u.p];u.dead=true;u.hp=0;u.dieT=gtime();u.act=null;if(u.horse){const h=p.hs.find(o=>o.rider===u.k);u.horse=false;if(h){h.rider=null;h.rest=gtime()+4}}if(u.wantH!=null){const h=p.hs.find(o=>o.i===u.wantH);if(h)h.want=null;u.wantH=null}
  if(by&&by!==p){if(by.local){by.gold+=u.k===0?CMD_G:KILL_G;if(u.k===0)by.kills++;if(by===ME)tip(u.k===0?TL(`Komutan yenildi! +${CMD_G} altın`,`Commander down! +${CMD_G} gold`):`+${KILL_G} 🪙`,1.5)}else send('k',{v:p.ix,by:by.ix,c:u.k===0?1:0})}
  if(u.k===0){feed(by&&by!==p?`${by.name} ⚔️ ${p.name}`:`☠️ ${p.name}`);
    if(p.home!=null&&!CS[p.home].ruined){p.respawn=gtime()+15;if(p===ME)tip(TL('Komutanın düştü! 15 saniye sonra kalende dirilirsin.','Your commander fell! You rise again at your castle in 15 s.'),4)}
    else eliminate(p)}}
function eliminate(p){if(p.out)return;p.out=true;for(const u of p.units)if(!u.dead){u.dead=true;u.dieT=gtime()}feed(TL(`${p.name} oyundan düştü`,`${p.name} is out`));if(p.local)send('out',{p:p.ix});if(p===ME)setTimeout(()=>endScreen(false),1500)}
const alivePlayers=()=>PL.filter(p=>!p.out);
function enemyNear(pi,x,z,r){let best=null,bd=r;for(const p of PL){if(p.ix===pi||p.out)continue;for(const u of p.units){if(u.dead)continue;const d=Math.hypot(u.x-x,u.z-z);if(d<bd&&!(u.hid&&d>AMB_SEE)){bd=d;best=u}}}return best}
const AMB_SEE=11;
function castleNear(pi,x,z,r){let best=null,bd=r;for(const c of S.castles){const s=CS[c.k];if(s.ruined||s.owner===pi)continue;const d=Math.max(0,Math.max(Math.abs(c.x-x),Math.abs(c.z-z))-CW);if(d<bd){bd=d;best=s}}return best}
const castleGap=(k,x,z)=>{const C=CASTLES[k];return Math.max(0,Math.max(Math.abs(C.x-x),Math.abs(C.z-z))-CW-1)};
// a strike or a shot; castles are hit at their walls
// sounds come from where they happen: quieter with distance, and to the left or right of the screen
function snd(f,x,z,R0,v0){const dx=x-cam.x,dz=z-cam.z,d=Math.hypot(dx,dz);if(d>R0||!SES[f])return;const v=Math.pow(1-d/R0,1.6)*v0,pan=clamp((dx*Math.cos(cy)-dz*Math.sin(cy))/Math.max(d,10),-1,1)*.8;try{SES[f](v,pan)}catch(e){}}
function strike(p,u,tgt){if(!tgt||tgt.cs)return;if(tgt.arch){const c=CS[tgt.arch.c];if(c.ah[tgt.arch.i]<=0)return;const T=unitStats(p,u);if(T.okR)shoot(p,u,tgt,T.ok*wMul(p,u));return}const T=unitStats(p,u),d=Math.hypot(tgt.x-u.x,tgt.z-u.z),ranged=T.okR&&d>T.rng+1.2,k=wMul(p,u)*(u.horse?1.25:1)*(gtime()<(u.ambB||0)?1.6:1);
  if(ranged){shoot(p,u,tgt,T.ok*k);return}
  const dx=tgt.x-u.x,dz=tgt.z-u.z,l=Math.hypot(dx,dz)||1;hitUnit(tgt,T.dmg*k*(.9+Math.random()*.2),p,dx/l*(u.horse?3.5:2),dz/l*(u.horse?3.5:2));chips(tgt.x,tgt.y+1.3,tgt.z,'#ffe8b0',4,3);
  snd('kilic',tgt.x,tgt.z,55,.85)}
function shoot(p,u,t,dmg){const d=Math.hypot(t.x-u.x,t.z-u.z),lead=d/50,tx=t.x+(t.vx||0)*lead,tz=t.z+(t.vz||0)*lead,ang=Math.atan2(tx-u.x,tz-u.z)+(Math.random()-.5)*(u.k?.06:.02),y0=u.y+(u.horse?2.75:1.45);
  const b={x:u.x+Math.sin(ang)*.8,y:y0,z:u.z+Math.cos(ang)*.8,dx:Math.sin(ang),dz:Math.cos(ang),by:p,t:0,dmg,dy:((t.y??groundAt(t.x,t.z))+1.2-y0)/Math.max(d,1),castle:t.castle};bolts.push(b);
  if(u.p===ME.ix||Math.random()<.3)send('f',{x:+b.x.toFixed(1),y:+b.y.toFixed(1),z:+b.z.toFixed(1),dx:+b.dx.toFixed(3),dz:+b.dz.toFixed(3),dy:+b.dy.toFixed(3)});
  snd('okcu',u.x,u.z,60,.7)}
// the archers on the castle towers: how many there are, and the nearest living one an enemy of pi can shoot at
const archN=c=>{const ow=c.owner!=null?PL[c.owner]:null;return ow?Math.min(4,1+ow.lv.k):2};
function archNear(pi,x,z,r){let best=null,bd=r;for(const C of S.castles){const c=CS[C.k];if(c.ruined||c.owner===pi||Math.abs(C.x-x)>r+CW||Math.abs(C.z-z)>r+CW)continue;const n=archN(c);
    for(let i=0;i<n;i++){if(c.ah[i]<=0)continue;const tp=C.tops[i],d=Math.hypot(tp.x-x,tp.z-z);if(d<bd){bd=d;best={x:tp.x,y:tp.y,z:tp.z,arch:{c:c.k,i},dead:false}}}}return best}
function hurtArcher(k,i,d,by){const c=CS[k];if(c.ah[i]<=0)return;if(!castleLocal(c)){send('ah',{c:k,i,d:+d.toFixed(1),by:by?by.ix:-1});return}
  c.ah[i]-=d;if(c.ah[i]<=0){c.ah[i]=0;send('ad',{c:k,i});const tp=S.castles[k].tops[i];chips(tp.x,tp.y+1.2,tp.z,'#c8b8a0',10,4);if(by&&by.local){by.gold+=10;if(by===ME)tip(TL('Kule okçusu düştü!','A tower archer fell!'),1.6)}}}
// the castle towers shoot at enemies close by
function castleDefend(c,dt){if(c.ruined)return;c.cd-=dt;if(c.cd>0)return;const C=CASTLES[c.k],ow=c.owner!=null?PL[c.owner]:null;c.cd=ow?1.6/(1+.5*ow.lv.k):2.2;
  const e=enemyNear(c.owner??-1,C.x,C.z,CW+26);if(!e)return;const tops=S.castles[c.k].tops,n=archN(c);let ti=-1,bd=1e9;for(let i=0;i<n;i++){if(c.ah[i]<=0)continue;const d=Math.hypot(tops[i].x-e.x,tops[i].z-e.z);if(d<bd){bd=d;ti=i}}if(ti<0)return;
  const tp=tops[ti],sx=tp.x,sz=tp.z,sy=tp.y+1.4;c.shotT=gtime();c.shotI=ti;c.aim=Math.atan2(e.x-sx,e.z-sz);
  const d=Math.hypot(e.x-sx,e.z-sz)||1;bolts.push({x:sx,y:sy,z:sz,dx:(e.x-sx)/d,dz:(e.z-sz)/d,dy:(e.y+1.2-sy)/d,t:0,dmg:ow?9:7,by:ow||{ix:-1}});snd('okcu',sx,sz,60,.6)}

// ---------- the army's orders ----------
function slotPos(u,ax,az,face,ix){const k=ix??u.k-1,row=Math.floor(k/4),colm=k%4-1.5,s=Math.sin(face),c=Math.cos(face),bx=colm*2.6,bz=-(3+row*2.8);return{x:ax+bx*c+bz*s,z:az-bx*s+bz*c}}
function soldierThink(p,u){const T=unitStats(p,u),C0=p.units[0],gs=p.G?p.G[u.g]||p.G[1]:p,m=gs.mode;u.hid=false;
  // ambush: lie still and unseen; when an enemy walks close, the whole squad springs out together with a strong first blow
  if(m==='pusu'){const g=gs.goal||{x:u.x,z:u.z,a:u.a},e=enemyNear(p.ix,u.x,u.z,14);
    if(e){gs.mode='hucum';gs.goal={x:e.x,z:e.z,u:e.id};const until=gtime()+4;for(const o of p.units)if(o.g===u.g&&!o.dead){o.ambB=until;o.think=0}if(p===ME){tip(TL('Pusu! Askerlerin saldırıyor (ilk vuruşlar çok güçlü)','Ambush! Your soldiers strike (the first blows hit hard)'),2.5);syncCmd()}}
    else{const s=slotPos(u,g.x,g.z,g.a||0,grpIx(p,u));u.fight=false;u.tgt=null;u.go={x:s.x,z:s.z,stop:.6};u.hid=Math.hypot(s.x-u.x,s.z-u.z)<1.5;return}}
  if(u.wantH!=null&&!enemyNear(p.ix,u.x,u.z,8)){const h=p.hs.find(o=>o.i===u.wantH);if(h){u.fight=false;u.tgt=null;u.go={x:h.x,z:h.z,stop:.5};return}u.wantH=null}
  let ax,az,face,eng=16;
  if(m==='takip'&&C0&&!C0.dead){ax=C0.x;az=C0.z;face=C0.a}
  else if(m==='kale'||m==='takip'){if(p.home==null){ax=u.x;az=u.z;face=u.a}else{const y=S.castles[p.home].yard;ax=y.x;az=y.z;face=CASTLES[p.home].a;eng=CW+20}}
  else{const g=gs.goal||{x:u.x,z:u.z};ax=g.x;az=g.z;face=g.a||0;if(m==='hucum')eng=55}
  let tgt=null;
  if(m==='hucum'&&gs.goal&&gs.goal.u!=null){const t=unitById(gs.goal.u);if(t&&!t.dead){tgt=t;gs.goal.x=t.x;gs.goal.z=t.z}else gs.goal.u=null}
  if(!tgt&&m==='hucum'&&gs.goal&&gs.goal.c!=null){const c=CS[gs.goal.c];if(!c.ruined&&c.owner!==p.ix){const e=enemyNear(p.ix,u.x,u.z,14);if(e)tgt=e;else{const Y=S.castles[c.k].W(((u.k-1)%4-1.5)*3,4-Math.floor((u.k-1)/4)*3);u.fight=false;u.tgt=null;u.go={x:Y.x,z:Y.z,stop:.8};return}}else{gs.goal.c=null;if(c.owner===p.ix){gs.mode='kale'}}}
  if(!tgt){const e=enemyNear(p.ix,u.x,u.z,Math.max(eng,T.okR||0));if(e&&Math.hypot(e.x-ax,e.z-az)<eng+20)tgt=e}
  if(!tgt&&T.okR&&m!=='pusu'){const a=archNear(p.ix,u.x,u.z,T.okR+4);if(a&&Math.hypot(a.x-ax,a.z-az)<Math.max(eng,30)+20)tgt=a}
  u.tgt=tgt;
  if(tgt){const d=Math.hypot(tgt.x-u.x,tgt.z-u.z),want=T.okR?22:T.rng-.2+(u.horse?.7:0);
    if(d>want)u.go={x:tgt.x,z:tgt.z,stop:want};
    else{u.go=null;if(T.okR&&d<7)u.go={x:u.x+(u.x-tgt.x),z:u.z+(u.z-tgt.z),stop:0}}
    u.fight=d<=want+.4;return}
  u.fight=false;const s=slotPos(u,ax,az,face,p.G&&m!=='takip'?grpIx(p,u):undefined);u.go={x:s.x,z:s.z,stop:.6}}
// a man's place in his own squad's ranks
function grpIx(p,u){let i=0;for(const o of p.units){if(o===u)return i;if(o.k>0&&!o.dead&&o.g===u.g)i++}return i}
function stepUnit(p,u,dt,t){u.cd=Math.max(0,u.cd-dt);u.flash=Math.max(0,u.flash-dt*4);if(u.dead)return;
  const T=unitStats(p,u),sp=T.sp*(u.horse?HORSE_SP:1)*(u.act?.4:1);let ix=0,iz=0;
  if(u.k===0&&p===ME){worldInput();ix=input.x;iz=input.z}
  else{if(u.k===0&&p.bot)botCmdThink(p,u,t,dt);else if(u.k>0){u.think=(u.think||0)-dt;if(u.think<=0){u.think=.25+Math.random()*.15;soldierThink(p,u)}}
    const g=u.go?siteVia(u,viaGate(u,u.go)):null;if(g){const dx=g.x-u.x,dz=g.z-u.z,d=Math.hypot(dx,dz);if(d>(g.stop||.5)){ix=dx/d;iz=dz/d;if(d<3){ix*=Math.max(.3,d/3);iz*=Math.max(.3,d/3)}}}
    if(u.fight&&u.tgt&&!u.act&&u.cd<=0){const tg=u.tgt;u.a=Math.atan2(tg.x-u.x,tg.z-u.z)+(u.horse&&!T.okR?.55:0);u.act={t:0,dur:.6,hit:false,tgt:tg,v:(u.sw=(u.sw|0)^1)};u.cd=T.cd*(u.horse?.9:1)}}
  let il=Math.hypot(ix,iz);if(il>1){ix/=il;iz/=il;il=1}
  // walked into a tree or a wall and not getting anywhere: slip round it sideways for a moment
  if(u.side>0&&il>.05&&!(u.k===0&&p===ME)){u.side-=dt;const sd=u.sideD||1;const nx=ix*.35-iz*sd,nz=iz*.35+ix*sd,l=Math.hypot(nx,nz)||1;ix=nx/l*il;iz=nz/l*il}
  if(u.horse){const turn=il>.05?Math.abs(angD(u.a,Math.atan2(ix,iz))):0;u.gal=Math.max(0,Math.min(1,(u.gal||0)+(il>.75&&turn<.5&&!u.act?dt/2.2:-dt*1.6)))}else u.gal=0;
  const ox=u.x,oz=u.z,g0=groundAt(u.x,u.z);let s2=sp*(1+.75*(u.gal||0));if(g0<-.8)s2*=.5;
  if(il>.05){u.x+=ix*s2*dt;u.z+=iz*s2*dt;if(!u.act)u.a+=angD(u.a,Math.atan2(ix,iz))*Math.min(1,dt*(u.horse?6:10))}
  if(u.kx||u.kz){u.x+=u.kx*dt*4;u.z+=u.kz*dt*4;u.kx*=Math.max(0,1-dt*6);u.kz*=Math.max(0,1-dt*6);if(Math.abs(u.kx)<.05)u.kx=0;if(Math.abs(u.kz)<.05)u.kz=0}
  const g1=groundAt(u.x,u.z),run=Math.hypot(u.x-ox,u.z-oz);if(run>1e-3&&(g1-g0)/run>1.3){u.x=ox;u.z=oz}
  collide(u,u.horse?.9:.35);
  if(il>.3&&!u.act){const got=Math.hypot(u.x-ox,u.z-oz)/Math.max(1e-3,s2*dt*il);u.stk=got<.25?(u.stk||0)+dt:Math.max(0,(u.stk||0)-dt);if(u.stk>.5){u.stk=0;u.side=1.2+Math.random();u.sideD=(u.sideD||1)*(Math.random()<.7?-1:1)}}
  u.vx=(u.x-ox)/Math.max(dt,1e-3);u.vz=(u.z-oz)/Math.max(dt,1e-3);u.mv=Math.hypot(u.vx,u.vz);u.y=Math.max(groundAt(u.x,u.z),-1);
  if(u.wantH!=null){const h=p.hs.find(o=>o.i===u.wantH);if(h&&Math.hypot(h.x-u.x,h.z-u.z)<2)mount(p,u,h)}
  if(u.act){u.act.t+=dt;if(!u.act.hit&&u.act.t>=u.act.dur*.5){u.act.hit=true;const tg=u.act.tgt;if(tg&&(tg.cs?!CS[tg.k].ruined:!tg.dead)){const d=tg.cs?castleGap(tg.k,u.x,u.z):Math.hypot(tg.x-u.x,tg.z-u.z);if(d<=(T.okR||T.rng+.8+(u.horse?.8:0)))strike(p,u,tg)}}if(u.act.t>=u.act.dur)u.act=null}
  const z=zoneAt(t);if(outside(u.x,u.z,z.h)){u.zt=(u.zt||0)+dt;if(u.zt>=1){u.zt-=1;hurt(u,z.d,null,0,0)}}
  else if(t-(u.hurtT||-99)>8&&u.hp<u.mhp)u.hp=Math.min(u.mhp,u.hp+dt*.8)}
// walls have one way through: anyone going in or out of a castle walks through its gate
function localIn(C,x,z){const dx=x-C.x,dz=z-C.z,c=Math.cos(C.a),s=Math.sin(C.a);return{x:dx*c-dz*s,z:dx*s+dz*c}}
function segBox(a,b,h){let t0=0,t1=1;const dx=b.x-a.x,dz=b.z-a.z;for(const[p,d]of[[a.x,dx],[a.z,dz]]){if(Math.abs(d)<1e-9){if(p<-h||p>h)return false;continue}let ta=(-h-p)/d,tb=(h-p)/d;if(ta>tb)[ta,tb]=[tb,ta];t0=Math.max(t0,ta);t1=Math.min(t1,tb);if(t0>t1)return false}return true}
function viaGate(u,g){
  // first: if we stand inside a castle and the goal is outside it, out through its gate
  for(const C of S.castles){if(CS[C.k].ruined||Math.abs(u.x-C.x)>CW||Math.abs(u.z-C.z)>CW)continue;const a=localIn(C,u.x,u.z),b=localIn(C,g.x,g.z);
    if(Math.max(Math.abs(a.x),Math.abs(a.z))<CW-.5&&!(Math.max(Math.abs(b.x),Math.abs(b.z))<CW-.5)){const inner=C.W(0,CW-3.5),outer=C.W(0,CW+4.5);if(Math.abs(a.x)>2.2||a.z<CW-4.5)return{x:inner.x,z:inner.z,stop:.6};return{x:outer.x,z:outer.z,stop:.6}}}
  // next: a goal inside a castle is reached through its gate
  let T=g;for(const C of S.castles){if(CS[C.k].ruined||Math.abs(g.x-C.x)>CW||Math.abs(g.z-C.z)>CW)continue;const b=localIn(C,g.x,g.z);if(Math.max(Math.abs(b.x),Math.abs(b.z))>=CW-.5)continue;
    const a=localIn(C,u.x,u.z);if(Math.max(Math.abs(a.x),Math.abs(a.z))<CW-.5)break;if(Math.abs(a.x)<2.2&&a.z>CW-1&&a.z<CW+6){const inner=C.W(0,CW-3.5);return{x:inner.x,z:inner.z,stop:.6}}const o=C.W(0,CW+4.5);T={x:o.x,z:o.z,stop:.6};break}
  // last: the nearest castle standing in the way is walked round by its corners
  let best=null,bd=1e9;for(const C of S.castles){if(CS[C.k].ruined)continue;const d=Math.hypot(C.x-u.x,C.z-u.z);if(d>bd||d>Math.hypot(T.x-u.x,T.z-u.z)+CW*2)continue;const a=localIn(C,u.x,u.z),b=localIn(C,T.x,T.z);if(Math.max(Math.abs(a.x),Math.abs(a.z))<CW-.5||Math.max(Math.abs(b.x),Math.abs(b.z))<CW-.5)continue;if(segBox(a,b,CW+1.5)){bd=d;best={C,a,b}}}
  if(best){const {C,a,b}=best,E=CW+5;let cc=null,cd=1e9;for(const c of[[E,E],[-E,E],[E,-E],[-E,-E]]){const p={x:c[0],z:c[1]};if(segBox(a,p,CW+1.2))continue;const d=Math.hypot(p.x-a.x,p.z-a.z)+Math.hypot(b.x-p.x,b.z-p.z);if(d<cd){cd=d;cc=p}}
    if(!cc){let m=1e9;for(const c of[[E,E],[-E,E],[E,-E],[-E,-E]]){const d=Math.hypot(c[0]-a.x,c[1]-a.z);if(d<m){m=d;cc={x:c[0],z:c[1]}}}}const w=C.W(cc.x,cc.z);return{x:w.x,z:w.z,stop:1.2}}
  return T}
// soldiers keep a little apart from each other
function separate(){const L=[];for(const p of PL)for(const u of p.units)if(!u.dead)L.push(u);const G=new Map();for(const u of L){const k=(Math.floor(u.x/3)+500)*2000+Math.floor(u.z/3)+500;let a=G.get(k);if(!a)G.set(k,a=[]);a.push(u)}
  for(const u of L){if(!PL[u.p].local)continue;const cx=Math.floor(u.x/3),cz=Math.floor(u.z/3),ru=u.horse?1.2:.55;for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){const a=G.get((cx+i+500)*2000+cz+j+500);if(!a)continue;for(const o of a){if(o===u)continue;const m=ru+(o.horse?1.2:.55),dx=u.x-o.x,dz=u.z-o.z,d=Math.hypot(dx,dz);if(d<m&&d>1e-4){const k=(m-d)/d*.5;u.x+=dx*k;u.z+=dz*k}}}}}

// ---------- the player's own commander: one button strikes ----------
function action(){const p=ME,u=p.units[0];if(!started||!u||u.dead||u.act||u.cd>0)return;const T=unitStats(p,u);
  let tgt=enemyNear(p.ix,u.x,u.z,T.rng+1.4+(u.horse?.8:0));
  if(!tgt){let bd=T.okR||T.rng+2.4;for(const q of PL){if(q.ix===p.ix||q.out)continue;for(const o of q.units){if(o.dead)continue;const d=Math.hypot(o.x-u.x,o.z-u.z);if(d<bd&&Math.abs(angD(u.a,Math.atan2(o.x-u.x,o.z-u.z)))<(T.okR?.6:1.2)){bd=d;tgt=o}}}}
  if(!tgt&&T.okR)tgt=archNear(p.ix,u.x,u.z,T.okR+4);
  if(tgt)u.a=Math.atan2(tgt.x-u.x,tgt.z-u.z)+(u.horse&&!T.okR?.55:0);u.act={t:0,dur:.6,hit:false,tgt,v:(u.sw=(u.sw|0)^1)};u.cd=T.cd}

// ---------- the computer commanders ----------
function botPlan(p,t){if(p.out||!p.units.length)return;const u=p.units[0];
  const alive=p.units.filter(o=>o.k>0&&!o.dead).length;
  if(alive<10&&p.gold>=COST.asker)buy(p,'asker',R()<.6?'kilic':'arbalet');else if(p.lv.s<3&&p.gold>=COST.silah[p.lv.s])buy(p,'silah');else if(p.lv.z<3&&p.gold>=COST.zirh[p.lv.z])buy(p,'zirh');else if(p.hs.length<5&&p.gold>=COST.at)buy(p,"at");else if(p.lv.k<3&&p.gold>=COST.kule[p.lv.k])buy(p,'kule');
  if(freeHorse(p,0,0,1e9)){const f=p.units.find(o=>!o.dead&&!o.horse&&o.wantH==null&&o.k>0);if(f)setHorse(p,f.k,true)}
  const z=zoneAt(t),home=p.home!=null?CASTLES[p.home]:null;
  if(p.threat&&t-p.threat.t<8&&home&&Math.hypot(p.threat.x-home.x,p.threat.z-home.z)<70){p.mode='hucum';p.goal={x:p.threat.x,z:p.threat.z};return}
  if(t<SETUP_T+50+(p.ix%5)*12||alive<4){p.mode=home?'kale':'takip';p.goal=null;return}
  if(u.dead){p.mode='kale';return}
  const e=enemyNear(p.ix,u.x,u.z,45);if(e){p.mode='hucum';p.goal={x:e.x,z:e.z,u:e.id};return}
  if(p.goal&&p.goal.c!=null&&!CS[p.goal.c].ruined&&CS[p.goal.c].owner!==p.ix&&p.mode==='hucum')return;
  let best=null,bd=1e9;for(const c of CS){if(c.ruined||c.owner===p.ix)continue;const C=CASTLES[c.k];if(outside(C.x,C.z,z.h-30))continue;const d=Math.hypot(C.x-u.x,C.z-u.z)+(c.owner==null?0:260)+(c.owner!=null&&PL[c.owner].units.filter(o=>!o.dead).length>alive?300:0);if(d<bd){bd=d;best=c}}
  if(best&&bd<750){p.mode='hucum';const C=CASTLES[best.k];p.goal={x:C.x,z:C.z,c:best.k};return}
  p.mode='takip'}
function botCmdThink(p,u,t,dt){u.think=(u.think||0)-dt;if(u.think>0)return;u.think=.3;const T=unitStats(p,u),z=zoneAt(t);
  const e=enemyNear(p.ix,u.x,u.z,T.okR?24:9);
  if(e&&u.hp>u.mhp*.3){const d=Math.hypot(e.x-u.x,e.z-u.z),want=T.okR?16:T.rng-.2;u.go=d>want?{x:e.x,z:e.z,stop:want}:T.okR&&d<8?{x:u.x+(u.x-e.x),z:u.z+(u.z-e.z),stop:0}:null;u.tgt=e;u.fight=d<=want+.4;return}
  u.fight=false;u.tgt=null;
  if(u.wantH!=null){const h=p.hs.find(o=>o.i===u.wantH);if(h){u.go={x:h.x,z:h.z,stop:.5};return}u.wantH=null}
  {let best=null,bd=110;for(const c of CHESTS){if(c.taken)continue;const d=Math.hypot(c.x-u.x,c.z-u.z);if(d<bd&&!outside(c.x,c.z,z.h-10)){bd=d;best=c}}if(best){u.go={x:best.x,z:best.z,stop:.3};return}}
  {let ch=null,bd=70;for(const C of S.castles){const c=CS[C.k];if((c.gold<=0&&!c.wpn)||c.ruined||(c.owner!=null&&c.owner!==p.ix))continue;const d=Math.hypot(C.chest.x-u.x,C.chest.z-u.z);if(d<bd){bd=d;ch=C}}if(ch){u.go={x:ch.chest.x,z:ch.chest.z,stop:.5};return}}
  if(p.mode==='hucum'&&p.goal){const s=p.units.filter(o=>o.k>0&&!o.dead);let cx=0,cz=0;for(const o of s){cx+=o.x;cz+=o.z}if(s.length){cx/=s.length;cz/=s.length}else{cx=p.goal.x;cz=p.goal.z}
    const dx=p.goal.x-cx,dz=p.goal.z-cz,l=Math.hypot(dx,dz)||1;u.go={x:cx-dx/l*6,z:cz-dz/l*6,stop:1.5};
    if(p.goal.c!=null){const C=S.castles[p.goal.c];if(Math.hypot(C.x-u.x,C.z-u.z)<CW+30||Math.hypot(C.x-cx,C.z-cz)<CW+14){const y=C.W(0,0);u.go={x:y.x,z:y.z,stop:1.5}}}return}
  if(p.mode==='takip'){const s=p.units.filter(o=>o.k>0&&!o.dead);const tg=CS.filter(c=>!c.ruined&&c.owner!==p.ix).map(c=>CASTLES[c.k]).sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z))[0];if(tg){const dx=tg.x-u.x,dz=tg.z-u.z,l=Math.hypot(dx,dz)||1;u.go={x:u.x+dx/l*20,z:u.z+dz/l*20,stop:1}}return}
  const y=p.home!=null?S.castles[p.home].yard:{x:u.x,z:u.z};u.go={x:y.x+Math.sin(p.ix)*3,z:y.z+Math.cos(p.ix)*3,stop:2}}

// ---------- spending gold ----------
function buy(p,k,w){const home=p.home!=null&&!CS[p.home].ruined?S.castles[p.home]:null;
  if(k==='silah'||k==='zirh'||k==='kule'){const key=k==='silah'?'s':k==='zirh'?'z':'k',l=p.lv[key];if(l>=3||p.gold<COST[k][l])return false;p.gold-=COST[k][l];p.lv[key]++;return true}
  if(k==='asker'){if(p.gold<COST.asker||!home)return false;let i=0;for(let j=1;j<=10;j++){const u=p.units.find(o=>o.k===j);if(!u||u.dead){i=j;break}}if(!i)return false;
    p.gold-=COST.asker;const ww=w||p.army[i-1].w,y=home.yard;const nu=newUnit(p,i,ww,false,y.x+(Math.random()-.5)*4,y.z+(Math.random()-.5)*4);
    if(p.army[i-1].g)nu.g=p.army[i-1].g;const old=p.units.findIndex(o=>o.k===i);if(old>=0)p.units[old]=nu;else p.units.push(nu);p.army[i-1].w=ww;
    if(p.army[i-1].h)setHorse(p,i,true);return true}
  if(k==='at'){if(p.gold<COST.at||p.hs.length>=5||!home)return false;p.gold-=COST.at;let i=0;while(p.hs.some(h=>h.i===i))i++;const sl=home.stable[i%5];p.hs.push(mkHorse(p,i,sl.x,sl.z,sl.a));return true}
  if(k==='onar'){const c=CS[p.home];if(!c||c.ruined||p.gold<COST.onar||c.hp>=c.mhp)return false;p.gold-=COST.onar;c.hp=Math.min(c.mhp,c.hp+400);return true}
  if(k==='iyiles'){const u=p.units[0];if(!u||u.dead||p.gold<COST.iyiles||u.hp>=u.mhp)return false;p.gold-=COST.iyiles;u.hp=Math.min(u.mhp,u.hp+100);return true}
  return false}
// put soldiers on horses or take them off (up to as many horses as the player has)
function setHorse(p,i,on){const u=p.units.find(o=>o.k===i);if(i===0)p.cmdHorse=on;else p.army[i-1].h=on;if(!u||u.dead)return true;
  if(!on){if(u.horse)dismount(p,u);if(u.wantH!=null){const h=p.hs.find(o=>o.i===u.wantH);if(h)h.want=null;u.wantH=null}return true}
  if(u.horse||u.wantH!=null)return true;
  if(i===0&&p===ME){const h=freeHorse(p,u.x,u.z,4.5);if(h){mount(p,u,h);return true}p.cmdHorse=false;tip(TL('Binmek için boştaki bir atının yanına git (atlar kalende durur)','Walk up to one of your free horses to mount (they wait at your castle)'),3);return false}
  const h=freeHorse(p,u.x,u.z,1e9);if(!h){if(i===0)p.cmdHorse=false;else p.army[i-1].h=false;return false}h.want=i;u.wantH=h.i;return true}
function setWeapon(p,i,w){p.army[i-1].w=w;const u=p.units.find(o=>o.k===i);if(!u||u.dead||u.w===w)return;const f=u.hp/u.mhp;u.w=w;u.mhp=UNIT[w].hp+(u.horse?HORSE_HP:0);u.hp=u.mhp*f}

// ---------- the host ----------
function pickHost(){const now=Date.now();if(gtime()>25)for(const p of PL)if(!p.bot&&!p.local&&!p.out&&now-p.seen>30000){eliminate(p);feed(TL(`${p.name} oyundan ayrıldı`,`${p.name} left the match`))}
  let h=-1;for(let i=0;i<PL.length;i++){const p=PL[i];if(p.bot)continue;if(p===ME||now-p.seen<9000){h=i;break}}if(h<0)h=ME.ix;hostIx=h;
  const mine=iAmHost();for(const p of PL)if(p.bot&&p.local!==mine){p.local=mine;if(mine)for(const u of p.units)if(u.tx!=null){u.x=u.tx;u.z=u.tz;u.a=u.ta}}}
for(const p of PL)if(p.bot)p.local=iAmHost();

// ---------- input ----------
let cy=0,cp=.78,cd=SMALL?24:20,joy=null,look=null,pinch=null;const keys=new Set();
const input={x:0,z:0,jx:0,jy:0};const camYawFwd=()=>({x:-Math.sin(cy),z:-Math.cos(cy)});
function worldInput(){const f=camYawFwd(),r={x:-f.z,z:f.x};input.x=f.x*-input.jy+r.x*input.jx;input.z=f.z*-input.jy+r.z*input.jx}
function setInput(jx,jy){input.jx=jx;input.jy=jy}
const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
function groundPick(sx,sy){ndc.set(sx/innerWidth*2-1,-(sy/innerHeight)*2+1);ray.setFromCamera(ndc,camera);const o=ray.ray.origin,d=ray.ray.direction;let t=0;for(let i=0;i<260;i++){t+=i<60?.8:3;const x=o.x+d.x*t,y=o.y+d.y*t,z=o.z+d.z*t;if(y<=groundAt(x,z))return{x,z}}return null}
// a short tap on the land gives the soldiers an order: an enemy or a castle to attack, or a place to go and hold
function tapOrder(sx,sy){if(!started||ME.out)return;const g=groundPick(sx,sy);if(!g)return;let best=null,bd=4;for(const p of PL){if(p===ME||p.out)continue;for(const u of p.units){if(u.dead)continue;const d=Math.hypot(u.x-g.x,u.z-g.z);if(d<bd){bd=d;best=u}}}
  if(best){ME.mode='hucum';ME.goal={x:best.x,z:best.z,u:best.id};markAt(best.x,best.z,'#ff5a3a');tip(TL('Askerler hedefe saldırıyor','Soldiers attack the target'),1.6);order();return}
  for(const c of S.castles){if(Math.abs(g.x-c.x)<CW+3&&Math.abs(g.z-c.z)<CW+3){const s=CS[c.k];if(s.owner===ME.ix){ME.mode='kale';ME.goal=null;tip(TL('Askerler kaleyi koruyor','Soldiers guard the castle'),1.6)}else if(!s.ruined){ME.mode='hucum';ME.goal={x:c.x,z:c.z,c:c.k};tip(TL('Askerler kalenin avlusuna giriyor. Kaleyi almak için komutanınla avluya gir ve içeride düşman kalmayınca bayrak dolana kadar bekle.','Soldiers go into the castle yard. To take it, bring your commander into the yard and hold it until the flag fills, with no defenders left inside.'),4)}markAt(c.x,c.z,'#ff5a3a');order();return}}
  const amb=ME.G[SEL||1].mode==='pusu',c0=ME.units[0],fa=c0?Math.atan2(g.x-c0.x,g.z-c0.z):0;ME.mode=amb?'pusu':'git';ME.goal={x:g.x,z:g.z,a:fa};markAt(g.x,g.z,amb?'#7fd06a':'#ffffff');tip(amb?TL('Bölük oraya gidip pusu kuracak','The squad goes there and lies in ambush'):TL('Askerler oraya gidip bekleyecek','Soldiers go there and hold'),1.5);order()}
let markT=0;function markAt(x,z,c){const m=S.fx.mark;m.visible=true;m.position.set(x,groundAt(x,z)+.2,z);m.material.color.set(c);markT=1.5}
cv.addEventListener('pointerdown',e=>{SES.init&&SES.init();try{cv.setPointerCapture(e.pointerId)}catch(_){}
  if(e.pointerType!=='mouse'&&e.clientX<innerWidth*.45&&e.clientY>innerHeight*.38&&!joy){joy={id:e.pointerId,x:e.clientX,y:e.clientY};const J=$('mJoy');J.style.display='block';J.style.left=e.clientX+'px';J.style.top=e.clientY+'px';J.firstChild.style.transform='translate(-50%,-50%)';return}
  // a second finger on the right half while looking: pinch to zoom; anywhere else it is ignored (no stray zooming)
  if(look&&e.pointerType!=='mouse'){if(!pinch&&e.clientX>=innerWidth*.45)pinch={id:e.pointerId,d:Math.hypot(e.clientX-look.x,e.clientY-look.y),cd};return}
  look={id:e.pointerId,x:e.clientX,y:e.clientY,x0:e.clientX,y0:e.clientY,t:performance.now(),mouse:e.pointerType==='mouse',btn:e.button}});
cv.addEventListener('pointermove',e=>{
  // the stick's base follows a thumb that slides far past its rim, so it never sticks at the edge
  if(joy&&e.pointerId===joy.id){let dx=e.clientX-joy.x,dy=e.clientY-joy.y;const l=Math.hypot(dx,dy),m=48;if(l>m*1.5){const k=(l-m*1.5)/l;joy.x+=dx*k;joy.y+=dy*k;const J=$('mJoy');J.style.left=joy.x+'px';J.style.top=joy.y+'px';dx=e.clientX-joy.x;dy=e.clientY-joy.y}const l2=Math.hypot(dx,dy);if(l2>m){dx*=m/l2;dy*=m/l2}$('mJoy').firstChild.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;setInput(dx/m,dy/m);return}
  if(pinch&&e.pointerId===pinch.id&&look){const d=Math.hypot(e.clientX-look.x,e.clientY-look.y);cd=clamp(pinch.cd*pinch.d/Math.max(d,20),6,60);return}
  if(look&&e.pointerId===look.id){const dx=e.clientX-look.x,dy=e.clientY-look.y;look.x=e.clientX;look.y=e.clientY;if(pinch)return;cy-=dx*.006;cp=clamp(cp+dy*.004,.1,1.3)}});
const up=e=>{if(joy&&e.pointerId===joy.id){joy=null;$('mJoy').style.display='none';setInput(0,0);return}if(pinch&&e.pointerId===pinch.id){pinch=null;return}
  if(look&&e.pointerId===look.id){const tap=Math.hypot(e.clientX-look.x0,e.clientY-look.y0)<8&&performance.now()-look.t<350;if(tap){if(look.mouse&&look.btn===0)action();else tapOrder(e.clientX,e.clientY)}look=null;pinch=null}};
cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);cv.addEventListener('lostpointercapture',up);
// all fingers off the screen: nothing may stay held (a missed 'up' must never leave the stick stuck)
addEventListener('touchend',e=>{if(e.touches.length===0){if(joy){joy=null;$('mJoy').style.display='none';setInput(0,0)}look=null;pinch=null}},{passive:true});
// no page zoom, no text selection loupe, no long-press menu over the game
for(const ev of['touchstart','touchmove'])cv.addEventListener(ev,e=>{if(e.cancelable)e.preventDefault()},{passive:false});for(const ev of['gesturestart','gesturechange','dblclick'])addEventListener(ev,e=>e.preventDefault(),{passive:false});cv.addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('wheel',e=>{cd=clamp(cd*(1+Math.sign(e.deltaY)*.1),6,60);e.preventDefault()},{passive:false});
addEventListener('keydown',e=>{const k=e.key.toLowerCase();keys.add(k);SES.init&&SES.init();if(k===' ')action();if(k==='1')setMode('takip');if(k==='2')setMode('hucum');if(k==='3')setMode('bekle');if(k==='4')setMode('kale');if(k==='b')openShop();if(k==='o')openArmy();if(k==='f'){const u=ME.units[0];if(u&&!u.dead)setHorse(ME,0,!u.horse)}if(k==='m')openMap();if(k==='escape')closePanel()});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
function keyInput(){if(joy)return;if(!keys.size){if(input.jx||input.jy)setInput(0,0);return}let jx=0,jy=0;if(keys.has('a')||keys.has('arrowleft'))jx--;if(keys.has('d')||keys.has('arrowright'))jx++;if(keys.has('w')||keys.has('arrowup'))jy--;if(keys.has('s')||keys.has('arrowdown'))jy++;const l=Math.hypot(jx,jy)||1;setInput(jx/l,jy/l)}
const hold={on:false};$('mAct').addEventListener('pointerdown',e=>{SES.init&&SES.init();hold.on=true;action();e.preventDefault()});for(const ev of['pointerup','pointercancel','pointerleave'])$('mAct').addEventListener(ev,()=>hold.on=false);
function setMode(m){ME.mode=m;const c=ME.units[0];if(m==='bekle'||m==='pusu')ME.goal=c?{x:c.x,z:c.z,a:c.a}:null;if(m==='hucum')ME.goal=c?{x:c.x+Math.sin(c.a)*12,z:c.z+Math.cos(c.a)*12}:null;
  tip((SEL?['',TL('I. bölük: ','Squad I: '),TL('II. bölük: ','Squad II: '),TL('III. bölük: ','Squad III: ')][SEL]:'')+{takip:TL('Askerler seni takip ediyor','Soldiers follow you'),hucum:TL('Hücum! Askerler yakındaki düşmana saldırıyor. Bir düşmana ya da kaleye dokunarak hedef de gösterebilirsin.','Charge! Soldiers attack the enemies nearby. Tap an enemy or a castle to point them at it.'),bekle:TL('Askerler burada bekliyor','Soldiers hold here'),pusu:TL('Pusu kuruldu: askerler burada saklanıyor, düşman yaklaşınca birden saldırırlar. Ormanda daha iyi. Başka bir yere dokunursan bölük oraya gidip pusu kurar.','Ambush set: the soldiers hide here and strike when an enemy comes close. Best in a wood. Tap elsewhere to send the squad there to lie in wait.'),kale:TL('Askerler kaleye dönüyor','Soldiers go back to the castle')}[m],m==='pusu'?5:2.5);order()}
function issue(){for(const gi of SEL?[SEL]:[1,2,3])ME.G[gi]={mode:ME.mode,goal:ME.goal?{...ME.goal}:null}}
function order(){issue();syncCmd()}
function syncCmd(){const m=ME.G[SEL||1].mode;for(const b of $('mCmd').children)b.classList.toggle('on',b.dataset.m===m||(m==='git'&&b.dataset.m==='bekle'));
  const n=[0,0,0,0];for(const u of ME.units)if(u.k>0&&!u.dead){n[0]++;n[u.g]++}
  for(const b of $('mGrp').children){const i=+b.dataset.g;b.classList.toggle('on',i===SEL);b.lastChild.textContent=n[i]}}
for(const b of $('mCmd').children)b.onclick=()=>setMode(b.dataset.m);
for(const b of $('mGrp').children)b.onclick=()=>{SEL=+b.dataset.g;ME.mode=ME.G[SEL||1].mode;ME.goal=ME.G[SEL||1].goal;syncCmd();tip(SEL?TL(`Emirler ${['','I','II','III'][SEL]}. bölüğe gidecek`,`Orders go to squad ${['','I','II','III'][SEL]}`):TL('Emirler bütün orduya gidecek','Orders go to the whole army'),1.6)};
$('mRide').onclick=()=>{const u=ME.units[0];if(!u||u.dead)return;setHorse(ME,0,!u.horse)};$('mShop').onclick=()=>openShop();$('mArmyB').onclick=()=>openArmy();$('mMini').onclick=()=>openMap();$('mMenu').onclick=()=>openMenu();

// ---------- panels ----------
let panel=null;function closePanel(){if(panel){panel.remove();panel=null}}
function mkPanel(h){closePanel();panel=document.createElement('div');panel.id='mPanel';panel.innerHTML=h;UI.append(panel);return panel}
function openShop(){if(ME.out)return;const pn=mkPanel(`<h2>${TL('Kale','Castle')} · 🪙 <span id="mG"></span></h2><div id="mRec"></div><button class="go" id="mX">${TL('Kapat','Close')}</button>`);pn.querySelector('#mX').onclick=closePanel;
  let sig='';const draw=()=>{const box=pn.querySelector('#mRec');if(!box)return;pn.querySelector('#mG').textContent=Math.floor(ME.gold);const C=CS[ME.home];const have=ME.units.filter(o=>o.k>0&&!o.dead).length;
    const rows=[['silah',TL('Demirci: ordunun silahları','Smithy: the army\'s weapons'),ME.lv.s<3?COST.silah[ME.lv.s]:null,`${TL('Seviye','Level')} ${1+ME.lv.s} → ${Math.min(4,2+ME.lv.s)} · ${TL('daha iyileri kule, ev ve gizli yerlerde (en iyisi 10)','better ones lie in towers, cottages and hidden places (best is 10)')}`],
      ['zirh',TL('Zırhları güçlendir','Better armour'),ME.lv.z<3?COST.zirh[ME.lv.z]:null,`${ME.lv.z}/3 · ${TL('alınan hasar azalır','less damage taken')}`],
      ['kule',TL('Kule okçuları','Tower archers'),ME.lv.k<3?COST.kule[ME.lv.k]:null,`${ME.lv.k}/3 · ${TL('kale daha sık ve sağlam vurur','the castle shoots faster and holds better')}`],
      ['askerK',TL('Kılıçlı asker al','Hire a swordsman'),have<10?COST.asker:null,TL(`ordunda ${have}/10 asker`,`${have}/10 soldiers`)],['askerA',TL('Arbaletçi asker al','Hire a crossbowman'),have<10?COST.asker:null,TL('kalende çıkar','comes out at your castle')],
      ['at',TL('At al','Buy a horse'),ME.hs.length<5?COST.at:null,TL(`${ME.hs.length}/5 at · kalenin ahırına gelir`,`${ME.hs.length}/5 horses · it comes to your castle stable`)],
      ['onar',TL('Surları onar (+400)','Repair the walls (+400)'),C&&!C.ruined&&C.hp<C.mhp?COST.onar:null,C?`${Math.round(C.hp)}/${C.mhp}`:''],['iyiles',TL('Komutanı iyileştir (+100)','Heal the commander (+100)'),COST.iyiles,'']];
    const s2=JSON.stringify(rows)+Math.floor(ME.gold/10);if(s2===sig)return;sig=s2;box.textContent='';
    for(const[k,ad,c,sub]of rows){const row=document.createElement('div');row.className='row';const b=document.createElement('button');b.innerHTML=`${ad}${c!=null?` · 🪙${c}`:''}<small>${c==null&&(k==='silah'||k==='zirh'||k==='kule')?TL('en üst seviye','maxed'):sub}</small>`;b.disabled=c==null||ME.gold<c;
      b.onclick=()=>{const ok=k==='askerK'?buy(ME,'asker','kilic'):k==='askerA'?buy(ME,'asker','arbalet'):buy(ME,k);if(ok){SES.para&&SES.para();tip(ad+' ✓',1.4)}sig='';draw()};row.append(b);box.append(row)}};draw();panel.draw=draw}
// the army: which soldier carries a sword or a crossbow, who rides the horses
function armyGrid(box,p,live){box.textContent='';const NH=()=>live?p.hs.length:5,used=()=>live?p.units.filter(o=>(o.horse||o.wantH!=null)&&!o.dead).length:(p.cmdHorse?1:0)+p.army.filter(a=>a.h).length;
  const g=document.createElement('div');g.className='mArmy';
  for(let i=0;i<=10;i++){const u=p.units.find(o=>o.k===i),dead=live&&(!u||u.dead),w=i===0?p.cmd:p.army[i-1].w,h=live?!!(u&&(u.horse||u.wantH!=null)):i===0?p.cmdHorse:p.army[i-1].h,pend=live&&u&&u.wantH!=null;
    const b=document.createElement('button');b.innerHTML=`<b>${i===0?(p.cmd==='okcu'?'👑🏹':'👑🛡️'):w==='kilic'?'🗡️':'🏹'}</b>${i===0?TL('Komutan','Commander'):(w==='kilic'?TL('Kılıç','Sword'):TL('Arbalet','Crossbow'))}`;if(dead)b.style.opacity=.35;
    b.onclick=()=>{if(i===0)return;if(live)setWeapon(p,i,w==='kilic'?'arbalet':'kilic');else p.army[i-1].w=w==='kilic'?'arbalet':'kilic';armyGrid(box,p,live)};
    const hb=document.createElement('button');hb.textContent=pend?'🐎 …':h?'🐎 ✓':'🐎 —';hb.className=h?'on':'';hb.style.cssText='margin-top:3px;padding:3px!important;font-size:12px!important';if(dead)hb.disabled=true;
    hb.onclick=e=>{e.stopPropagation();if(!h&&used()>=NH()){tip(TL(`En çok ${NH()} at var`,`You have ${NH()} horses`));return}if(live)setHorse(p,i,!h);else if(i===0)p.cmdHorse=!h;else p.army[i-1].h=!h;armyGrid(box,p,live)};
    const d=document.createElement('div');d.append(b,hb);
    // the squad this man marches with: I, II or III
    if(i>0){const gi=live&&u?u.g:p.army[i-1].g||1,gb=document.createElement('button');gb.textContent=['','I','II','III'][gi];gb.style.cssText=`margin-top:3px;padding:3px!important;font-size:12px!important;width:100%;border-color:${['','#e0c060','#60b0e0','#e07070'][gi]}!important`;if(dead)gb.disabled=true;
      gb.onclick=e=>{e.stopPropagation();const n=gi%3+1;p.army[i-1].g=n;if(u)u.g=n;armyGrid(box,p,live);if(p===ME)syncCmd()};d.append(gb)}
    g.append(d)}
  box.append(g);const n=document.createElement('p');n.textContent=TL(`Atlar: ${used()}/${NH()} · Askere dokun: kılıç ↔ arbalet · 🐎: ata bindir / indir · I/II/III: bölüğü`,`Horses: ${used()}/${NH()} · Tap a soldier: sword ↔ crossbow · 🐎: mount / dismount · I/II/III: squad`);box.append(n)}
function openArmy(){if(ME.out)return;const pn=mkPanel(`<h2>${TL('Ordu','Army')}</h2><div id="mA"></div><button class="go" id="mX">${TL('Kapat','Close')}</button>`);pn.querySelector('#mX').onclick=()=>{saveArmy();closePanel()};armyGrid(pn.querySelector('#mA'),ME,true)}
function saveArmy(){try{localStorage.setItem('mdn_ordu',JSON.stringify({army:ME.army,cmd:ME.cmd,ch:ME.cmdHorse}));localStorage.setItem('mdn_col',ME.colI)}catch(e){}}
function openMenu(){const pn=mkPanel(`<h2>${TL('Büyük Harita','Big Map')}</h2>
  <p style="text-align:left;font-size:12.5px;line-height:1.45">${TL('Sol tarafa basılı tutup kaydır: komutanı yürüt. Sağ tarafta kaydır: bak, iki parmak: yakınlaş. Ekrana kısa dokun: askerlere emir ver (düşmana dokun: saldır, kaleye dokun: kuşat ya da koru, boş yere dokun: oraya git). Büyük düğme: komutan vurur. Ordu üç bölüktür (I, II, III): üstteki düğmelerle bölüğü seç, emir sadece ona gider; Ordu panelinden askerleri bölüklere dağıt. 🌲 Pusu: bölük saklanır, düşman yaklaşınca birden ve güçlü saldırır. Silahların seviyesi 1-10: haritadaki kulelerde, evlerde ve gizli yerlerde bulunur, ortaya yaklaştıkça daha iyileri çıkar. Kale almak: komutanınla kalenin avlusuna gir, içeride düşman kalmayınca 10 saniye bekle. Altın yalnızca düşman öldürmekten ve kale avlularındaki sandıklardan gelir. Atlar kalenin ahırında durur: binmek için yanına git (🐎 düğmesi). Mor duvar haritanın kenarlarından içeri kapanır. Bilgisayarda: WASD, fare, boşluk, 1-4 emirler, B kale, O ordu, M harita.','Hold and drag on the left: walk your commander. Drag on the right: look, two fingers: zoom. A short tap on the land orders your soldiers (tap an enemy: attack, a castle: besiege or guard, open ground: go there). Big button: your commander strikes. The army has three squads (I, II, III): pick a squad with the buttons above the orders and the order goes to it alone; share your men out in the Army panel. 🌲 Ambush: the squad hides and strikes hard when an enemy comes close. Weapons have levels 1-10: find them in towers, cottages and hidden places, better ones nearer the middle. To take a castle: bring your commander into its yard and hold it for 10 seconds with no defenders inside. Gold comes only from kills and from the chests in castle yards. Horses wait in the castle stable: walk up to one to mount (🐎 button). The purple wall closes in from the map edges. On a computer: WASD, mouse, space, 1-4 orders, B castle, O army, M map.')}</p>
  <button class="go" id="mHome">${TL('Ana menüye dön','Back to the main menu')}</button><button class="go" id="mX" style="background:rgba(20,26,34,.9);color:#f6ecd4">${TL('Devam et','Resume')}</button>`);
  pn.querySelector('#mX').onclick=closePanel;pn.querySelector('#mHome').onclick=()=>{try{localStorage.setItem('cephe_mod','big')}catch(e){}location.href=location.pathname}}
let mapOpen=null;function openMap(){if(mapOpen){mapOpen.remove();mapOpen=null;return}const m=document.createElement('div');m.id='mMap';m.innerHTML=`<canvas width="${MAPN*2}" height="${MAPN*2}"></canvas><p>${TL('Kapatmak için dokun','Tap to close')}</p>`;UI.append(m);mapOpen=m;m.onclick=()=>{m.remove();mapOpen=null};drawMap(m.querySelector('canvas'),true)}
function drawMap(c,big,pick){const g=c.getContext('2d'),W=c.width,t=gtime(),k=W/(HALF*2),X=x=>(x+HALF)*k,Z=z=>(z+HALF)*k;g.drawImage(MAPI,0,0,W,W);
  const z=zoneAt(t);if(z.h<HALF-25){g.fillStyle='rgba(120,40,160,.3)';g.fillRect(0,0,W,Z(-z.h));g.fillRect(0,Z(z.h),W,W-Z(z.h));g.fillRect(0,Z(-z.h),X(-z.h),z.h*2*k);g.fillRect(X(z.h),Z(-z.h),W-X(z.h),z.h*2*k);g.strokeStyle='#c46bff';g.lineWidth=Math.max(2,W/150);g.strokeRect(X(-z.h),Z(-z.h),z.h*2*k,z.h*2*k)}
  const s=W/(big||pick?32:26);g.font=`${Math.round(W/(pick?44:52))}px Georgia`;g.textAlign='center';
  for(const C of CASTLES){const st=CS[C.k],x=X(C.x),y=Z(C.z),lock=pick&&isCenter(C.k);g.fillStyle=st.ruined?'#555':lock?'#6a6258':st.owner==null?'#e8e2d4':'#'+PL[st.owner].col.getHexString();g.strokeStyle=st.owner===ME.ix?'#fff':'#000';g.lineWidth=st.owner===ME.ix?3:1.5;g.fillRect(x-s/2,y-s/2,s,s);g.strokeRect(x-s/2,y-s/2,s,s);
    if(big||pick){const nm=lock?'🔒 '+TL('Orta','Middle'):st.owner!=null?PL[st.owner].name:(EN?C.en:C.ad);g.fillStyle='rgba(10,8,6,.8)';g.fillText(nm,x+1,y+s+W/56+1);g.fillStyle=st.owner===ME.ix?'#ffe08a':'#fff3d6';g.fillText(nm,x,y+s+W/56)}}
  if(!pick)for(const p of PL){if(p.out)continue;for(const u of p.units){if(u.dead)continue;if(p!==ME&&(!(Math.hypot(u.x-cam.x,u.z-cam.z)<90)||u.hid))continue;g.fillStyle=p===ME?(u.k===0?'#fff':'#ffe08a'):'#ff4a3a';g.beginPath();g.arc(X(u.x),Z(u.z),u.k===0?W/90:W/160,0,7);g.fill()}}}
function drawMini(){const c=$('mMini'),g=c.getContext('2d'),W=c.width,t=gtime(),span=560,k=W/span,cx=cam.x,cz=cam.z;
  g.fillStyle='#1d3b52';g.fillRect(0,0,W,W);const sx=(cx-span/2+HALF)/(HALF*2)*MAPN,sz=(cz-span/2+HALF)/(HALF*2)*MAPN,sw=span/(HALF*2)*MAPN;g.drawImage(MAPI,sx,sz,sw,sw,0,0,W,W);
  const X=x=>(x-cx)*k+W/2,Z=z=>(z-cz)*k+W/2,z=zoneAt(t);if(z.h<HALF-25){g.strokeStyle='#c46bff';g.lineWidth=3;g.strokeRect(X(-z.h),Z(-z.h),z.h*2*k,z.h*2*k)}
  for(const C of CASTLES){const st=CS[C.k];g.fillStyle=st.ruined?'#555':st.owner==null?'#e8e2d4':'#'+PL[st.owner].col.getHexString();g.strokeStyle=st.owner===ME.ix?'#fff':'#000';g.lineWidth=2;g.fillRect(X(C.x)-7,Z(C.z)-7,14,14);g.strokeRect(X(C.x)-7,Z(C.z)-7,14,14)}
  for(const p of PL){if(p.out)continue;for(const u of p.units){if(u.dead||(p!==ME&&(Math.hypot(u.x-cx,u.z-cz)>90||u.hid)))continue;g.fillStyle=p===ME?(u.k===0?'#fff':'#ffe08a'):'#ff4a3a';g.beginPath();g.arc(X(u.x),Z(u.z),u.k===0?4:2.5,0,7);g.fill()}}
  g.save();g.translate(W/2,W/2);g.rotate(-cy);g.fillStyle='rgba(255,255,255,.13)';g.beginPath();g.moveTo(0,0);g.arc(0,0,W*.42,-Math.PI/2-.45,-Math.PI/2+.45);g.closePath();g.fill();g.restore()}

// ---------- the start: grab a castle, choose a commander, set up the army ----------
let setup=null;
function openSetup(){const s=document.createElement('div');s.id='mSetup';s.innerHTML=`<h2>${TL('Kaleni seç','Choose your castle')} · <span id="mST"></span></h2><p>${TL('Haritada bir kaleye dokun: ilk dokunan alır.','Tap a castle on the map: first come, first served.')}</p><canvas width="${MAPN*2}" height="${MAPN*2}"></canvas>
  <div class="box"><p>${TL('Komutanın:','Your commander:')}</p><div class="cls"><button data-c="sovalye">🛡️ ${TL('Şövalye','Knight')}</button><button data-c="okcu">🏹 ${TL('Okçu','Archer')}</button></div>
  <p>${TL('Pelerin rengin:','Cloak colour:')}</p><div id="mPal" style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center"></div><p>${TL('Ordun: 10 asker, 5 at','Your army: 10 soldiers, 5 horses')}</p><div id="mA"></div><button class="go" id="mReady">${TL('Hazırım','Ready')}</button></div>`;UI.append(s);setup=s;
  const c=s.querySelector('canvas');c.onclick=e=>{const r=c.getBoundingClientRect(),x=((e.clientX-r.left)/r.width-.5)*HALF*2,z=((e.clientY-r.top)/r.height-.5)*HALF*2;let best=null,bd=80;for(const C of CASTLES){const d=Math.hypot(C.x-x,C.z-z);if(d<bd){bd=d;best=C}}if(best)wantCastle(best.k)};
  const cls=s.querySelectorAll('.cls button');const mark=()=>cls.forEach(b=>b.classList.toggle('on',b.dataset.c===ME.cmd));cls.forEach(b=>b.onclick=()=>{ME.cmd=b.dataset.c;mark();armyGrid(s.querySelector('#mA'),ME,false)});mark();
  const pal=s.querySelector('#mPal');const pm=()=>{for(const o of pal.children)o.style.outline=+o.dataset.i===ME.colI?'3px solid #fff':'none'};PAL.slice(0,12).forEach((cc,i)=>{const b=document.createElement('button');b.dataset.i=i;b.style.cssText=`width:28px;height:28px;border-radius:50%;padding:0;background:#${cc.getHexString()}!important`;b.onclick=()=>{ME.colI=i;ME.col=PAL[i];if(ME.home!=null)castleLook(ME.home,ME.col,false);pm()};pal.append(b)});pm();
  armyGrid(s.querySelector('#mA'),ME,false);s.querySelector('#mReady').onclick=()=>{if(ME.home==null){tip(TL('Önce haritadan bir kale seç','Pick a castle on the map first'));return}s.querySelector('.box').style.opacity=.5;s.querySelector('#mReady').textContent=TL('Hazır! Başlaması bekleniyor…','Ready! Waiting for the start…')};
  s.draw=()=>{drawMap(c,false,true);s.querySelector('#mST').textContent=Math.max(0,Math.ceil(SETUP_T-gtime()))}}
openSetup();
let started=false;
function startBattle(){if(setup){setup.remove();setup=null}saveArmy();started=true;
  // anyone still without a castle gets a free one
  const free=()=>CS.filter(c=>c.owner==null&&!c.ruined&&!isCenter(c.k));
  if(ME.home==null&&!iAmHost()){const f=free();if(f.length){const c=f[Math.floor(Math.random()*f.length)];send('claim',{c:c.k,p:ME.ix});claim(c.k,ME.ix,true)}}
  if(iAmHost())for(const p of PL)if(p.home==null){const f=free();if(!f.length)break;claim(f[Math.floor(R()*f.length)].k,p.ix,true)}
  for(const p of PL)if(p.home!=null){if(p.local)spawnArmy(p)}
  // every castle's chest starts with gold: a little in the castles that have owners, more in the empty ones
  for(const c of CS){c.gold=isCenter(c.k)?420:c.owner==null?260:160;c.wpn=isCenter(c.k)?8+Math.floor(WR()*3):0}chestDirty=true
  if(ME.home!=null){const C=CASTLES[ME.home];cy=C.a;tip(TL(`${C.ad} senin! Avludaki sandıktan altınını al. Boş kaleleri al: komutanınla avluya gir ve bekle. Düşman öldürmek altın kazandırır.`,`${C.en} is yours! Take the gold from the chest in the yard. Take empty castles: walk your commander into the yard and hold it. Kills earn gold.`),7)}
  syncCmd()}

// ---------- the end ----------
let ended=false;function endScreen(win){if(ended)return;ended=true;const rank=win?1:alivePlayers().length+1;
  const pn=mkPanel(`<h2>${win?TL('🏆 ZAFER! Ayakta kalan son komutan sensin','🏆 VICTORY! You are the last commander standing'):TL(`#${rank} oldun`,`You placed #${rank}`)}</h2><p>${TL('Yendiğin komutan','Commanders beaten')}: ${ME.kills}</p>
  <button class="go" id="mAgain">${TL('Yeni maç (yapay zeka ile)','New match (with the computer)')}</button><button class="go" id="mHome2" style="background:rgba(20,26,34,.9);color:#f6ecd4">${TL('Ana menü','Main menu')}</button>${win?'':`<button class="go" id="mWatch" style="background:rgba(20,26,34,.9);color:#f6ecd4">${TL('İzlemeye devam et','Keep watching')}</button>`}`);
  pn.querySelector('#mAgain').onclick=()=>{try{sessionStorage.setItem('cephe_auto',JSON.stringify({id:A.id,m:{room:'mdnbot'+Math.random().toString(36).slice(2,9),big:true,seed:(Math.random()*4294967295)>>>0,t0:Date.now()+2500,players:[{id:A.id,name:ME.name}]}}))}catch(e){}location.reload()};
  pn.querySelector('#mHome2').onclick=()=>{try{localStorage.setItem('cephe_mod','big')}catch(e){}location.href=location.pathname};const w=pn.querySelector('#mWatch');if(w)w.onclick=closePanel}

// ---------- drawing ----------
const m4=new THREE.Matrix4(),m5=new THREE.Matrix4(),m6=new THREE.Matrix4(),q=new THREE.Quaternion(),q2=new THREE.Quaternion(),vp=new THREE.Vector3(),vs=new THREE.Vector3(1,1,1),UP=new THREE.Vector3(0,1,0),XA=new THREE.Vector3(1,0,0),Z1=new THREE.Vector3(0,0,1),BD=new THREE.Vector3(),tc=new THREE.Color(),camT=new THREE.Vector3();
const cam={x:0,z:0},GREY=new THREE.Color('#9a9a9a');
const labs=[];function label(i){if(!labs[i]){const d=document.createElement('div');d.className='mLab';d.innerHTML='<span></span><i><b></b></i>';$('mLabs').append(d);labs[i]=d}return labs[i]}
const SEAT0=[1.9,0,0];function hPush(clip,ph,mat,coat){return HORSE?HORSE.push(clip,ph,mat,coat):SEAT0}
function hFlush(){if(HORSE)HORSE.flush()}
// the gait follows the ground covered: a walk when slow, a canter and then (riding straight on) a faster gallop
const _hq=new THREE.Quaternion();
function slopeM(o,a,dt,mat){const fx=Math.sin(a)*1.55,fz=Math.cos(a)*1.55,hf=groundAt(o.x+fx,o.z+fz),hb=groundAt(o.x-fx,o.z-fz),sx=Math.cos(a)*.55,sz=-Math.sin(a)*.55,hl=groundAt(o.x-sx,o.z-sz),hr=groundAt(o.x+sx,o.z+sz);
  const pt=Math.atan2(hb-hf,3.1),rl=Math.atan2(hr-hl,1.1)*.5;o.pit=(o.pit??pt)+(pt-(o.pit??pt))*Math.min(1,dt*8);o.rol=(o.rol??rl)+(rl-(o.rol??rl))*Math.min(1,dt*8);
  const y=Math.max(groundAt(o.x,o.z),(hf+hb)/2)-.04;q.setFromAxisAngle(UP,a);_hq.setFromAxisAngle(XA,o.pit);q.multiply(_hq);_hq.setFromAxisAngle(Z1,o.rol);q.multiply(_hq);return mat.compose(vp.set(o.x,y,o.z),q,vs.set(1,1,1))}
function gait(o,dt){if(o.mv>4.6){o.gp=((o.gp||0)+dt*o.mv/9.5)%1;return'run'}if(o.mv>.6){o.gp=((o.gp||0)+dt*o.mv/3.4)%1;return'walk'}return'idle'}
const RY=-.56,RS=.8;     // the rider: where his waist sits on the saddle, and his size
function drawUnit(p,u,t,dt){const cls=u.k===0?p.cmd:(u.w==='arbalet'?'okcu':'sovalye'),sc=u.k===0?1.12:.94;
  q.setFromAxisAngle(UP,u.a);m4.compose(vp.set(u.x,u.y,u.z),q,vs.set(1,1,1));tc.copy(p.col);if(u.flash>0)tc.multiplyScalar(1+u.flash*1.6);if(u.hid&&p===ME)tc.multiplyScalar(.45);
  let clip='idle',ph=t*.9+u.ph;if(u.dead){clip='die';ph=Math.min(.999,(t-(u.dieT||t))/.9)}else if(u.act){clip='atk';ph=Math.min(.999,u.act.t/u.act.dur);
    // two ways to swing, in turn: the cut across, and a rising backhand with a twist of the body and a step in
    if(u.horse){}else if(u.act.v&&cls!=='okcu'){const k=Math.sin(ph*Math.PI);ph=.999-ph*.94;q2.setFromAxisAngle(UP,.5*k);m5.compose(vp.set(0,0,.35*k),q2,vs.set(1,1,1));m4.multiply(m5)}
    else if(cls!=='okcu'&&!u.horse){q2.setFromAxisAngle(UP,-.22*Math.sin(ph*Math.PI));m5.compose(vp.set(0,0,.15*Math.sin(ph*Math.PI)),q2,vs.set(1,1,1));m4.multiply(m5)}}else if(u.mv>.6){clip='run';u.rp=((u.rp||0)+dt*u.mv/5.2)%1;ph=u.rp}
  if(u.horse&&!u.dead){slopeM(u,u.a,dt,m4);const g=gait(u,dt),st=hPush(g,g==='idle'?t/6.25+u.ph:u.gp,m4,u.coat);
    m5.compose(vp.set(0,st[0]+RY,st[1]),q2.setFromAxisAngle(XA,st[2]),vs.set(RS*sc,RS*sc,RS*sc));m6.copy(m4).multiply(m5);chrPush('binici',u.act?'atk':'idle',u.act?(u.act.v?.999-ph*.94:ph):.15,m6,tc,wLv(p,u),p.lv.z);return}
  if(sc!==1){m5.makeScale(sc,sc,sc);m4.multiply(m5)}chrPush(cls,clip,ph,m4,tc,wLv(p,u),p.lv.z)}
let spectate=null;
function draw(dt,t){
  for(const p of PL){if(p.local)continue;for(const u of p.units){if(u.tx==null)continue;const k=Math.min(1,dt*7);u.x=lerp(u.x,u.tx,k);u.z=lerp(u.z,u.tz,k);u.y=Math.max(groundAt(u.x,u.z),-1);u.a+=angD(u.a,u.ta)*Math.min(1,dt*9);u.mv=u.rmv?5:0;u.flash=Math.max(0,u.flash-dt*4);if(u.act){u.act.t+=dt;if(u.act.t>=u.act.dur)u.act=null}}}
  // camera: behind the commander; while he is down, over his soldiers or the castle
  let F=ME.units[0];if(!F||F.dead){F=ME.units.find(u=>!u.dead)||null;if(!F){if(!spectate||spectate.dead){spectate=null;for(const p of PL){const u=p.units.find(o=>!o.dead);if(u){spectate=u;break}}}F=spectate}}
  if(!F||!started){const C=CASTLES[ME.home??(Math.floor(t/4)%24)];F={x:C.x,z:C.z,y:C.y}}
  cam.x=F.x;cam.z=F.z;camT.set(F.x,F.y+(F.horse?2.6:1.8),F.z);let d=started?cd:80;const yaw=started?cy:t*.06;
  // inside a castle the camera rises over the walls, so they never hide the army
  let cpE=cp;
  camera.position.set(F.x+Math.sin(yaw)*Math.cos(cpE)*d,F.y+1.8+Math.sin(cpE)*d,F.z+Math.cos(yaw)*Math.cos(cpE)*d);const gy=Math.max(groundAt(camera.position.x,camera.position.z),0)+1.4;if(camera.position.y<gy)camera.position.y=gy;camera.lookAt(camT);
  drawSites(F.x,F.z,t);
  {vp.set(F.x,F.y+1.3,F.z);const dz=vp.clone().applyMatrix4(camera.matrixWorldInverse).z;vp.project(camera);const pr=renderer.getPixelRatio();FOC.value.set((vp.x+1)/2*innerWidth*pr,(vp.y+1)/2*innerHeight*pr,-dz,Math.min(innerWidth,innerHeight)*pr*.2)}
  updateGround(F.x,F.z);updateNodes(F.x,F.z,t);updateClutter(F.x,F.z,t);if(S.waterN){S.waterN.offset.x=t*.004;S.waterN.offset.y=t*.003;S.waterU.t.value=t}
  placeSun(F.x+Math.sin(started?cy:0)*-25,groundAt(F.x,F.z),F.z+Math.cos(started?cy:0)*-25);chrTime(t);if(chestDirty){chestDirty=false;drawChests(CS.map(c=>c.gold))}
  const z=zoneAt(t);drawZone(z.h,t);{const u=ME.units[0];$('mOut').style.display=started&&u&&!u.dead&&outside(u.x,u.z,z.h)?'block':'none'}
  let li=0;
  for(const p of PL)for(const h of p.hs){if(!p.local&&h.tx!=null){const k=Math.min(1,dt*7);h.x=lerp(h.x,h.tx,k);h.z=lerp(h.z,h.tz,k);h.a+=angD(h.a,h.ta)*Math.min(1,dt*8)}if(h.rider!=null)continue;if(Math.hypot(h.x-F.x,h.z-F.z)>300)continue;
    slopeM(h,h.a,dt,m4);let g=gait(h,dt);if(g==='idle'&&((t*.03+h.ph)%1)<.6)g='graze';hPush(g,g==='idle'?t/6.25+h.ph:g==='graze'?t/3.2+h.ph:h.gp,m4,h.coat)}
  // the archers on the castle towers: one per tower the castle has paid for, drawing when it shoots
  for(const C of S.castles){const st=CS[C.k];if(st.ruined||Math.hypot(C.x-F.x,C.z-F.z)>260)continue;const ow=st.owner!=null?PL[st.owner]:null,n=ow?Math.min(4,1+ow.lv.k):2;
    for(let i=0;i<n;i++){if(st.ah[i]<=0)continue;const tp=C.tops[i],shot=st.shotI===i&&t-(st.shotT||-9)<.8;q.setFromAxisAngle(UP,shot?st.aim:C.a+[3.93,2.36,5.5,.79][i]);m4.compose(vp.set(tp.x,tp.y,tp.z),q,vs.set(1.3,1.3,1.3));vs.set(1,1,1);tc.copy(ow?ow.col:GREY);chrPush('okcu',shot?'atk':'idle',shot?(t-st.shotT)/.8:t*.8+i*.3,m4,tc,ow?1+ow.lv.s:1,0)}}
  if(Math.random()<dt*3){for(const p of PL)for(const u of p.units)if(u.horse&&!u.dead&&u.mv>3&&Math.hypot(u.x-cam.x,u.z-cam.z)<45){snd('atli',u.x,u.z,45,.6);break}}
  const meC=ME.units[0];
  for(const p of PL)for(const u of p.units){const dd=Math.hypot(u.x-F.x,u.z-F.z);if(dd>300)continue;if(u.dead&&t-(u.dieT||t)>12)continue;if(u.hid&&!u.dead&&p!==ME&&(!meC||meC.dead||Math.hypot(u.x-meC.x,u.z-meC.z)>AMB_SEE*2))continue;drawUnit(p,u,t,dt);
    if(!u.dead&&dd<90&&li<24&&(u.k===0||u.hp<u.mhp)){vp.set(u.x,u.y+(u.horse?2.9:2.3)*(u.k===0?1.1:1),u.z).project(camera);if(vp.z<1&&Math.abs(vp.x)<1.1&&Math.abs(vp.y)<1.1){const L=label(li++);L.className='mLab';L.style.display='block';L.style.left=((vp.x+1)/2*innerWidth)+'px';L.style.top=((1-vp.y)/2*innerHeight)+'px';
      const txt=u.k===0?`👑 ${p.name}`:'';const s=L.firstChild;if(s.textContent!==txt)s.textContent=txt;s.style.color='#'+p.col.getHexString();L.lastChild.style.width=u.k===0?'46px':'24px';L.lastChild.firstChild.style.width=clamp(u.hp/u.mhp*100,0,100)+'%';L.lastChild.firstChild.style.background=p===ME?'#5ad06a':'#e05a3a'}}}
  // castle names and health
  for(const C of S.castles){const st=CS[C.k];const dd=Math.hypot(C.x-F.x,C.z-F.z);if(dd>230||li>=32)continue;vp.set(C.x,C.y+(st.ruined?6:27),C.z).project(camera);if(vp.z<1&&Math.abs(vp.x)<1.1&&Math.abs(vp.y)<1.1){const L=label(li++);L.className='mLab c';L.style.display='block';L.style.left=((vp.x+1)/2*innerWidth)+'px';L.style.top=((1-vp.y)/2*innerHeight)+'px';
    const txt=(EN?C.en:C.ad)+(st.ruined?TL(' (yıkık)',' (ruined)'):st.owner!=null?' · '+PL[st.owner].name:TL(' · boş',' · empty'));const s=L.firstChild;if(s.textContent!==txt)s.textContent=txt;s.style.color=st.owner!=null?'#'+PL[st.owner].col.getHexString():'#f2ead8';L.lastChild.style.width='70px';L.lastChild.firstChild.style.width=clamp(st.hp/st.mhp*100,0,100)+'%';L.lastChild.firstChild.style.background=st.owner===ME.ix?'#5ad06a':'#e0a03a'}}
  for(const o of CHESTS){if(o.taken||li>=36)continue;const dd=Math.hypot(o.x-F.x,o.z-F.z);if(dd>30)continue;vp.set(o.x,groundAt(o.x,o.z)+1.7,o.z).project(camera);if(vp.z<1&&Math.abs(vp.x)<1.1&&Math.abs(vp.y)<1.1){const L=label(li++);L.className='mLab c';L.style.display='block';L.style.left=((vp.x+1)/2*innerWidth)+'px';L.style.top=((1-vp.y)/2*innerHeight)+'px';
    const txt=(o.lv>=10?'✨ ':'⚔️ ')+TL('Seviye ','Level ')+o.lv;const s=L.firstChild;if(s.textContent!==txt)s.textContent=txt;s.style.color=LVC[o.lv-1];L.lastChild.style.width='0px'}}
  for(let i=li;i<labs.length;i++)if(labs[i])labs[i].style.display='none';
  chrFlush();hFlush();
  for(let i=nums.length-1;i>=0;i--){const n=nums[i];n.t+=dt;if(n.t>1){n.el.remove();nums.splice(i,1);continue}vp.set(n.x,n.y+n.t*1.6,n.z).project(camera);n.el.style.left=((vp.x+1)/2*innerWidth)+'px';n.el.style.top=((1-vp.y)/2*innerHeight)+'px';n.el.style.opacity=1-n.t*n.t;n.el.style.display=vp.z<1?'block':'none'}
  {const B=S.fx.bolt;let k=0;for(const b of bolts){if(k>=160)break;q.setFromUnitVectors(Z1,BD.set(b.dx,b.dy||0,b.dz).normalize());m4.compose(vp.set(b.x,b.y,b.z),q,vs.set(1,1,1));B.setMatrixAt(k++,m4)}B.count=k;B.instanceMatrix.needsUpdate=true}
  if(markT>0){markT-=dt;S.fx.mark.visible=markT>0;S.fx.mark.material.opacity=Math.min(.8,markT);S.fx.mark.scale.setScalar(1+(1.5-markT)*.4)}
  drawChips(dt);renderer.render(scene,camera)}

// ---------- HUD ----------
function hud(t){
  const z=zoneAt(t),alive=alivePlayers().length;let zt='';if(t<SETUP_T)zt=TL(`Başlıyor: ${Math.ceil(SETUP_T-t)}`,`Starting in ${Math.ceil(SETUP_T-t)}`);else if(z.h>0){const s=Math.ceil(z.wait);zt=z.shr?TL(`Alan daralıyor! ${s} sn`,`The ring is closing! ${s} s`):TL(`Alan ${Math.floor(s/60)}:${String(s%60).padStart(2,'0')} sonra daralır`,`Ring closes in ${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`)}
  const u=ME.units[0];if(started&&u&&u.dead&&ME.respawn>t)zt=TL(`Komutan ${Math.ceil(ME.respawn-t)} sn sonra kalede dirilir`,`Commander returns in ${Math.ceil(ME.respawn-t)} s`);
  const top=SMALL?`👑 ${alive} · ⚔️ ${ME.kills}<small>${zt}</small>`:`${TL('Komutan','Commanders')}: ${alive} · ${TL('Yendiğin','Beaten')}: ${ME.kills}<small>${zt}</small>`;if($('mTop').innerHTML!==top)$('mTop').innerHTML=top;
  $('mName').textContent=`${ME.cmd==='okcu'?'🏹':'🛡️'} ${ME.name}${ME.home!=null?' · '+(EN?CASTLES[ME.home].en:CASTLES[ME.home].ad):''}`;
  $('mHpBar').firstChild.style.width=u?clamp(u.hp/u.mhp*100,0,100)+'%':'0%';
  const sol=ME.units.filter(o=>o.k>0&&!o.dead).length,ch=ME.home!=null?CS[ME.home]:null;$('mLv').textContent=`⚔️Sv${u?wLv(ME,u):1} 🛡️${ME.lv.z} · 👥${sol}/10 · 🐎${ME.hs.length}${ch?' · 🏰'+Math.round(ch.hp/ch.mhp*100)+'%':''}`;
  $('mGold').textContent=`🪙 ${Math.floor(ME.gold)}`;
  for(const id of['mAct','mCmd','mGrp','mSide','mHp','mGold'])$(id).style.display=started&&!ME.out?'':'none';$('mJoyH').style.display=started&&!ME.out&&!joy&&matchMedia('(pointer:coarse)').matches?'':'none';
  {const c0=ME.units[0],rb=$('mRide'),can=c0&&!c0.dead&&(c0.horse||freeHorse(ME,c0.x,c0.z,4.5));rb.style.display=can?'':'none';if(can){const tx=c0.horse?TL('İn','Dismount'):TL('Bin','Mount');if(rb.lastChild.textContent!==tx)rb.lastChild.textContent=tx}}
  if(ME.capK!=null&&CS[ME.capK].cap){const c=CS[ME.capK];$('mTop').querySelector('small').textContent=TL(`🚩 Kale alınıyor: %${Math.round(c.cap.t/CAP_T*100)} — avluda kal`,`🚩 Taking the castle: ${Math.round(c.cap.t/CAP_T*100)}% — hold the yard`)}
  if(panel&&panel.draw)panel.draw();if(setup&&setup.draw)setup.draw();
  drawMini();if(mapOpen)drawMap(mapOpen.querySelector('canvas'),true);
  if(tipT>0){tipT-=.25;if(tipT<=0)$('mTip').style.opacity=0}
  if(started&&!ended&&!ME.out&&alive===1)endScreen(true);
  else if(started&&ME.out&&alive===1&&!hud.won){hud.won=1;const w=alivePlayers()[0];if(w)feed(TL(`🏆 ${w.name} kazandı!`,`🏆 ${w.name} won!`))}}

// ---------- the loops ----------
let lastSim=performance.now(),netAcc=0,netN=0,hostAcc=0,hudAcc=0,planAcc=0;
function tick(h,t){keyInput();
  if(!started){if(t>=SETUP_T)startBattle();else{if(iAmHost())for(const p of PL)if(p.bot&&p.home==null&&t>1+(p.ix*.53)%(SETUP_T-3)){const free=CS.filter(c=>c.owner==null&&!isCenter(c.k));if(free.length)claim(free[Math.floor(R()*free.length)].k,p.ix)}return}}
  for(const p of PL){if(!p.local||p.out)continue;
    const c0=p.units[0];if(c0&&c0.dead&&p.respawn&&t>=p.respawn&&p.home!=null&&!CS[p.home].ruined){p.respawn=0;const y=S.castles[p.home].yard;c0.dead=false;c0.horse=false;c0.hp=c0.mhp=UNIT[p.cmd].hp;c0.x=y.x;c0.z=y.z;c0.y=groundAt(y.x,y.z);c0.act=null;if(p===ME)tip(TL('Komutanın kalede dirildi','Your commander is back at the castle'),2)}
    else if(c0&&c0.dead&&(p.home==null||CS[p.home].ruined)){if(p.castles.length){p.home=p.castles[0]}else eliminate(p)}
    for(const u of p.units)stepUnit(p,u,h,t);horseTick(p,h);captureTick(p,h);lootTick(p);siteTick(p)}
  // castles: the towers shoot, the ring wears down castles left outside it
  const z=zoneAt(t);for(const c of CS){if(!castleLocal(c)||c.ruined)continue;castleDefend(c,h);if(c.owner!=null){c.art+=h;if(c.art>40){c.art=0;const i=c.ah.findIndex((v,j)=>v<=0&&j<archN(c));if(i>=0){c.ah[i]=ARCH_HP;send('ar',{c:c.k,i})}}}const C=CASTLES[c.k];if(outside(C.x,C.z,z.h)&&c.owner!=null)hurtCastle(c,h*z.d*4,null)}
  separate();
  for(let i=bolts.length-1;i>=0;i--){const b=bolts[i];b.t+=h;const s=50*h;b.x+=b.dx*s;b.z+=b.dz*s;b.y+=(b.dy||0)*s;let hit=b.t>1.3||b.y<groundAt(b.x,b.z)-.2;
    if(!hit&&!b.vis&&b.by&&b.y>4)for(const C of S.castles){if(Math.abs(b.x-C.x)>CW+5||Math.abs(b.z-C.z)>CW+5)continue;const c=CS[C.k];if(c.ruined||c.owner===b.by.ix)continue;const n=archN(c);
      for(let a=0;a<n;a++){if(c.ah[a]<=0)continue;const tp=C.tops[a];if(Math.hypot(tp.x-b.x,tp.z-b.z)<1.2&&b.y>tp.y-.3&&b.y<tp.y+2.6){hurtArcher(C.k,a,b.dmg,b.by.ix>=0?b.by:null);chips(b.x,b.y,b.z,'#ffe8b0',3);hit=true;break}}if(hit)break}
    if(!hit&&!b.vis&&b.by){if(b.castle!=null){const C=CASTLES[b.castle];if(Math.abs(b.x-C.x)<CW+1&&Math.abs(b.z-C.z)<CW+1){hit=true;const c=CS[b.castle];if(castleLocal(c))hurtCastle(c,b.dmg,b.by.ix>=0?b.by:null);else send('ch',{c:c.k,d:+b.dmg.toFixed(1),by:b.by.ix})}}
      else for(const p of PL){if(p.ix===b.by.ix||p.out)continue;for(const u of p.units){if(u.dead)continue;const r=u.horse?1.3:.8;if(Math.abs(u.x-b.x)<r&&Math.abs(u.z-b.z)<r&&b.y>u.y&&b.y<u.y+(u.horse?3.4:2.2)){const by=b.by.ix>=0?b.by:null;if(by)hitUnit(u,b.dmg,by,b.dx*1.5,b.dz*1.5);else if(p.local)hurt(u,b.dmg,null,0,0);else send('h',{u:u.id,d:b.dmg,by:-1});chips(b.x,b.y,b.z,'#ffe8b0',3);hit=true;break}}if(hit)break}}
    if(!hit&&b.t>.05)nodesNear(b.x,b.z,2,n=>{if(!hit&&n.t<5&&Math.hypot(n.x-b.x,n.z-b.z)<(n.t<2?.5:1.2)*n.s&&b.y<n.y+(n.t<2?5:1.6))hit=true});
    if(hit)bolts.splice(i,1)}}
function sim(){const now=performance.now(),dt=Math.min(.25,(now-lastSim)/1000);lastSim=now;const t=gtime();
  for(let r=dt;r>1e-4;r-=.05)tick(Math.min(r,.05),t);
  if(hold.on)action();
  planAcc+=dt;if(planAcc>=1&&started){planAcc=0;for(const p of PL)if(p.bot&&p.local)botPlan(p,t)}
  netAcc+=dt;if(netAcc>=.125){netAcc=0;netN++;netTick(netN%2===0)}
  hostAcc+=dt;if(hostAcc>=1){hostAcc=0;if(!solo)pickHost();if(!solo&&iAmHost()&&t<SETUP_T+3)send('own',{o:CS.map(c=>c.owner)})}
  hudAcc+=dt;if(hudAcc>=.25){hudAcc=0;hud(t)}}
setInterval(sim,40);
let lastF=performance.now(),fps=60,slowT=0,fastT=0,dpr=renderer.getPixelRatio();const DPR0=dpr;
function frame(){requestAnimationFrame(frame);const now=performance.now(),dt=Math.min(.1,(now-lastF)/1000);lastF=now;fps=lerp(fps,1/Math.max(dt,.001),.05);slowT=fps<(SMALL?45:30)?slowT+dt:0;fastT=fps>55?fastT+dt:0;if(slowT>3&&dpr>1){dpr=Math.max(1,dpr-.25);renderer.setPixelRatio(dpr);renderer.setSize(innerWidth,innerHeight,false);slowT=0}else if(fastT>8&&dpr<DPR0){dpr=Math.min(DPR0,dpr+.25);renderer.setPixelRatio(dpr);renderer.setSize(innerWidth,innerHeight,false);fastT=0}
  try{draw(dt,gtime())}catch(e){console.error(e)}}
requestAnimationFrame(frame);
window.__M={groundAt,siteVia,CHESTS,SITES,giveWeapon,siteAt,viaGate,localIn,fast:sec=>{for(let i=0;i<sec*20;i++){T0-=50;const t=gtime();tick(.05,t);if(i%20===0&&started)for(const p of PL)if(p.bot&&p.local)botPlan(p,t);if(i%5===0)hud(t)}},cam:(a,b,c)=>{cy=a;cp=b;cd=c},skip:s=>{T0-=s*1000},PL,ME,CS,S,zoneAt,gtime,action,input,setMode,buy,tapOrder,wantCastle,setHorse};
window.READY=true;
