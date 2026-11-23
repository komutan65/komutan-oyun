/* Büyük Harita — the world: one fixed map, about ten times the four-player map.
   Mostly land: meadows, forests, dry steppe, ranges of hills with ore in them, a few lakes,
   and a ring of mountains all round the edge. Everything here is pure maths, so every screen builds the same world. */
export const HALF=1200,WL=0,CELL=10,NC=HALF*2/CELL;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t;
export const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
function hash(i,j,s){let h=Math.imul(i,374761393)+Math.imul(j,668265263)+Math.imul(s,982451653)|0;h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return(h>>>0)/4294967296}
export function vnoise(x,z,s){const i=Math.floor(x),j=Math.floor(z),fx=x-i,fz=z-j,u=fx*fx*(3-2*fx),v=fz*fz*(3-2*fz);
  const a=hash(i,j,s),b=hash(i+1,j,s),c=hash(i,j+1,s),d=hash(i+1,j+1,s);return(a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v)*2-1}
export function fbm(x,z,s,o=4){let t=0,a=1,n=0;for(let k=0;k<o;k++){t+=vnoise(x,z,s+k*31)*a;n+=a;a*=.5;x=x*2.03+17.1;z=z*2.03-9.7}return t/n}
// soft ridges: rounded crests and broad valleys (no knife edges, no pits between them)
function soft(x,z,s,o=4){let t=0,a=1,n=0;for(let k=0;k<o;k++){const v=vnoise(x,z,s+k*31),r=1-Math.sqrt(v*v+.02);t+=r*r*a;n+=a;a*=.48;x=x*2.03+5.3;z=z*2.03+11.9}return t/n/(1-Math.sqrt(.02))**2}
function ridged(x,z,s,o=4){let t=0,a=1,n=0;for(let k=0;k<o;k++){const r=1-Math.abs(vnoise(x,z,s+k*31));t+=r*r*a;n+=a;a*=.5;x=x*2.07+5.3;z=z*2.07+11.9}return t/n}
export const rng=seed=>{let a=seed>>>0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}};
const BOX=(x,z)=>{const a=Math.abs(x),b=Math.abs(z),m=Math.max(a,b,1),p=a/m,q=b/m;return m*Math.pow(p**8+q**8,1/8)};

// how mountainous the edge is here (0 inland, 1 on the wall of peaks)
export const edgeK=(x,z)=>smooth(HALF-360,HALF-60,BOX(x,z)+fbm(x/190,z/190,7,3)*70);
// inland ranges: where hills rise and the good ore lies
export const rangeK=(x,z)=>smooth(.06,.38,fbm(x/640,z/640,3,3));
export const lakeK=(x,z)=>smooth(-.4,-.58,fbm(x/360+40,z/360-20,6,3));
export const wetK=(x,z)=>fbm(x/620,z/620,8,3);          // moist: forests; dry: steppe
export const richK=(x,z)=>fbm(x/300,z/300,9,2);         // rich ground: more iron, now and then gold

function rawHeight(x,z){
  const e=edgeK(x,z),r=rangeK(x,z);
  let h=6+fbm(x/420,z/420,1,4)*15+fbm(x/95,z/95,2,3)*3.2;
  // inland ranges: the crests are sharpened only a little, valleys between them stay open and smooth
  const rg=soft(x/240+fbm(x/500,z/500,21,2)*.35,z/240,4,4);h+=r*Math.pow(rg,2.1)*112;
  h+=e*(55+soft(x/165,z/165,5,4)*150);
  const lk=lakeK(x,z)*(1-e)*(1-r*.8);if(lk>0)h=lerp(h,-7,lk);
  return h}
export{rawHeight}
// ---------- castles: 24 of them spread over the land, each on ground levelled for it ----------
const CN_=['Akkale','Karakale','Demirkale','Taşkale','Kartalkale','Kurtkale','Altınkale','Gümüşkale','Yeşilkale','Kızılkale','Ulukale','Sarıkale','Mavikale','Dağkale','Gölkale','Ormankale','Rüzgarkale','Şahinkale','Aslankale','Ayıkale','Boğakale','Geyikkale','Turnakale','Kuzgunkale'];
const CNE=['White Keep','Black Keep','Iron Keep','Stone Keep','Eagle Keep','Wolf Keep','Gold Keep','Silver Keep','Green Keep','Red Keep','High Keep','Yellow Keep','Blue Keep','Hill Keep','Lake Keep','Wood Keep','Wind Keep','Falcon Keep','Lion Keep','Bear Keep','Bull Keep','Stag Keep','Crane Keep','Raven Keep'];
export const CASTLES=(()=>{const R=rng(9001),out=[];let guard=0,md=330;
  while(out.length<24&&guard++<40000){if(guard%4000===0)md-=25;const x=(R()-.5)*(HALF*2-700),z=(R()-.5)*(HALF*2-700);
    let lo=1e9,hi=-1e9,ok=true;for(let a=0;a<6.28&&ok;a+=.5)for(const r of[0,14,26]){const h=rawHeight(x+Math.cos(a)*r,z+Math.sin(a)*r);if(h<3){ok=false;break}lo=Math.min(lo,h);hi=Math.max(hi,h)}
    if(!ok||hi-lo>9||lakeK(x,z)>0||edgeK(x,z)>.05)continue;if(out.some(c=>Math.hypot(c.x-x,c.z-z)<md))continue;
    out.push({x,z,y:(lo+hi)/2+.4,ad:CN_[out.length],en:CNE[out.length],k:out.length,a:Math.round(R()*4)*Math.PI/2})}
  return out})();
// ground under and round each castle is levelled (the castle stands on a pad, the land eases into it)
export function height(x,z){let h=rawHeight(x,z);
  for(const c of CASTLES){const dx=x-c.x,dz=z-c.z;if(dx*dx+dz*dz>48*48)continue;const d=Math.max(Math.abs(dx),Math.abs(dz)),w=smooth(46,24,d);if(w>0)h=lerp(h,c.y,w)}
  return h}
export function slope(x,z){const d=1.5;return Math.hypot(height(x+d,z)-height(x-d,z),height(x,z+d)-height(x,z-d))/(2*d)}

// ground colour (linear-ish rgb 0..1) for the terrain mesh
export function groundCol(x,z,h,sl){
  const w=wetK(x,z),n=fbm(x/23,z/23,12,2)*.5+.5,n2=fbm(x/7,z/7,13,1)*.5+.5;
  let r,g,b;
  // grass: lush where wet, khaki where dry
  const dry=smooth(-.05,-.42,w),lush=smooth(.05,.4,w);
  r=lerp(.27,.55,dry)-lush*.06;g=lerp(.52,.5,dry)-lush*.06;b=lerp(.17,.24,dry)-lush*.03;
  r*=.88+n*.2;g*=.88+n*.2;b*=.9+n*.15;
  // under forests the ground is darker and greener: from afar a wood reads as a wood
  const fo=smooth(-.08,.32,w)*(1-smooth(95,130,h));r*=1-fo*.3;g*=1-fo*.18;b*=1-fo*.25;
  // flowers of light in the meadow, darker patches under forest
  const fl=lush*.12*(n2>.82?1:0);r+=fl*.6;g+=fl*.5;
  // sand at lake shores
  const sand=smooth(2.6,.6,h);r=lerp(r,.76,sand);g=lerp(g,.68,sand);b=lerp(b,.48,sand);
  if(h<0){const d=smooth(0,-6,h);r=lerp(.6,.32,d);g=lerp(.55,.36,d);b=lerp(.42,.3,d)}
  // rock on steep or high ground
  const rock=Math.max(smooth(.75,1.25,sl),smooth(70,115,h)*.85);const rc=.42+n*.12;r=lerp(r,rc,rock);g=lerp(g,rc*.97,rock);b=lerp(b,rc*.92,rock);
  // a little snow only on the very tops of the edge peaks
  const sn=smooth(150,185,h+n*12)*(1-smooth(1.1,1.6,sl));r=lerp(r,.93,sn);g=lerp(g,.95,sn);b=lerp(b,.98,sn);
  return[r,g,b]}

// ---------- resources ----------
// node types: 0 tree (pine), 1 tree (broad), 2 stone, 3 iron, 4 gold, 5 berry bush
export const NODE=[
  {ad:'Çam',en:'Pine',hp:5,give:'odun',n:4,r:1.1},
  {ad:'Meşe',en:'Oak',hp:6,give:'odun',n:5,r:1.4},
  {ad:'Kaya',en:'Rock',hp:6,give:'tas',n:4,r:1.6},
  {ad:'Demir damarı',en:'Iron vein',hp:8,give:'demir',n:3,r:1.6},
  {ad:'Altın damarı',en:'Gold vein',hp:10,give:'altin',n:2,r:1.6},
  {ad:'Çalı',en:'Berry bush',hp:2,give:'meyve',n:2,r:.9}];
export function nodeAt(ci,cj){
  const x0=-HALF+ci*CELL,z0=-HALF+cj*CELL,r1=hash(ci,cj,101),r2=hash(ci,cj,202),r3=hash(ci,cj,303);
  const x=x0+2+r2*(CELL-4),z=z0+2+r3*(CELL-4);
  if(BOX(x,z)>HALF-25)return null;for(const c of CASTLES)if(Math.abs(x-c.x)<36&&Math.abs(z-c.z)<36)return null;
  const h=height(x,z);if(h<1.2)return null;const sl=slope(x,z);if(sl>1.05)return null;
  const w=wetK(x,z),e=edgeK(x,z),rk=rangeK(x,z),forest=smooth(-.08,.32,w)*(1-smooth(95,130,h));
  const rocky=clamp(smooth(22,70,h)*.7+rk*.5+smooth(-.1,-.45,w)*.35+e*.4,0,1);
  const pt=.04+.72*forest,pr=.012+.09*rocky,pb=.012+.03*smooth(-.2,.3,w);
  let t=-1,q=r1;
  if(q<pt){t=hash(ci,cj,404)<smooth(25,65,h)*.7+(1-smooth(-.2,.35,w))*.25?0:1;if(t===1&&(sl>.42||h>62))t=sl>.7?-1:0;if(t===0&&sl>.68)t=-1;if(t<0&&sl<1&&hash(ci,cj,909)<.35)t=2}
  else if((q-=pt)<pr){const rich=richK(x,z),rr=hash(ci,cj,505);t=2;
    if(rr<.12+rocky*.25+Math.max(0,rich)*.45)t=3;
    if(rich>.22&&rk>.2&&hash(ci,cj,606)<.3)t=4}
  else if((q-=pr)<pb&&h<80)t=5;
  if(t<0)return null;
  return{id:ci*NC+cj,t,x,z,y:h,hp:NODE[t].hp,s:.8+hash(ci,cj,707)*.55,a:hash(ci,cj,808)*6.283}}

// ---------- places: named ruins with chests, and the gold valley ----------
const PN=['Eski Kale','Taşocağı','Altın Vadi','Kurt Ormanı','Sisli Göl','Yıkık Köy','Kartal Tepesi','Değirmen','Demirci Harabesi','Kara Çam','Gümüş Dere','Ulu Meşe','Kırık Köprü','Bakır Dağı','Kuzgun Yuvası','Çoban Ovası'];
const PNE=['Old Keep','Quarry','Gold Valley','Wolf Wood','Misty Lake','Ruined Village','Eagle Hill','The Mill','Smith\'s Ruin','Black Pines','Silver Brook','Great Oak','Broken Bridge','Copper Hill','Raven\'s Nest','Shepherd Plain'];
export function places(){const R=rng(7331),out=[];let guard=0;
  while(out.length<PN.length&&guard++<5000){const x=(R()-.5)*(HALF*2-520),z=(R()-.5)*(HALF*2-520),h=height(x,z);
    if(h<3||h>75||slope(x,z)>.5)continue;if(out.some(p=>Math.hypot(p.x-x,p.z-z)<330))continue;out.push({x,z,y:h,ad:PN[out.length],en:PNE[out.length],k:out.length})}
  return out}
