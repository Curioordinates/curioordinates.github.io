(() => {
const INK='#3b2a1a',RED='#9a3a22',PAPER='#ecdcb1',PAPER_RGB='236,220,177';
const $=id=>document.getElementById(id);
const dpr=Math.min(window.devicePixelRatio||1,2);
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function makeNoise(seed){const r=mulberry32(seed),p=[...Array(256).keys()];
  for(let i=255;i>0;i--){const j=Math.floor(r()*(i+1));[p[i],p[j]]=[p[j],p[i]];}
  const perm=new Uint16Array(512);for(let i=0;i<512;i++)perm[i]=p[i&255];
  const val=new Float32Array(256);for(let i=0;i<256;i++)val[i]=r()*2-1;const fade=t=>t*t*(3-2*t);
  function n2(x,y){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,X=xi&255,Y=yi&255;
    const a=val[perm[perm[X]+Y]],b=val[perm[perm[X+1]+Y]],c=val[perm[perm[X]+Y+1]],d=val[perm[perm[X+1]+Y+1]];
    const u=fade(xf),v=fade(yf);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
  function fbm(x,y,o=5){let s=0,a=.5,f=1;for(let i=0;i<o;i++){s+=a*n2(x*f,y*f);f*=2.02;a*=.5;}return s;}
  return {n2,fbm};}
function tree(c,x,y,s,conifer,fill,rv){
  c.lineWidth=.7;c.strokeStyle=INK;c.fillStyle=fill;
  c.beginPath();c.moveTo(x+1,y+.4);c.lineTo(x+s*1.1,y+.4);c.stroke();
  if(conifer){c.beginPath();c.moveTo(x,y);c.lineTo(x,y-s*.5);c.stroke();
    c.beginPath();c.moveTo(x,y-s*2.4);c.lineTo(x-s*.42,y-s*1.4);c.lineTo(x-s*.18,y-s*1.45);c.lineTo(x-s*.62,y-s*.5);
    c.lineTo(x+s*.62,y-s*.5);c.lineTo(x+s*.18,y-s*1.45);c.lineTo(x+s*.42,y-s*1.4);c.closePath();c.fill();c.stroke();
    c.lineWidth=.45;c.beginPath();c.moveTo(x+s*.08,y-s*2);c.lineTo(x+s*.4,y-s*.6);c.moveTo(x+s*.05,y-s*1.5);c.lineTo(x+s*.22,y-s*.6);c.stroke();return;}
  c.beginPath();c.moveTo(x,y);c.lineTo(x,y-s*.9);c.stroke();
  const cx=x,cy=y-s*1.4,r=s*.78;c.beginPath();
  for(let k=0;k<=14;k++){const a=k/14*Math.PI*2,rr=r*(1+.11*Math.sin(a*5+rv*6));k?c.lineTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr):c.moveTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr);}
  c.closePath();c.fill();c.stroke();
  c.lineWidth=.45;c.beginPath();for(let m=0;m<3;m++){c.moveTo(cx+r*(.2+m*.24),cy-r*(.45-m*.12));c.lineTo(cx+r*(.05+m*.24),cy+r*(.6-m*.08));}c.stroke();}
// each tree style is drawn once into a small sprite, then stamped with drawImage
function tuft(c,x,y){c.moveTo(x-4,y);c.lineTo(x+4,y);c.moveTo(x-1.8,y);c.lineTo(x-3,y-3);c.moveTo(x,y);c.lineTo(x,y-4);c.moveTo(x+1.8,y);c.lineTo(x+3,y-3);}
function building(c,x,y,w,h,fill,spire){
  c.fillStyle=fill;c.strokeStyle=INK;c.lineWidth=.7;c.beginPath();c.rect(x-w/2,y-h,w,h);c.fill();c.stroke();
  c.beginPath();c.moveTo(x-w/2-.6,y-h);c.lineTo(x,y-h-(spire?w*2.2:w*.8));c.lineTo(x+w/2+.6,y-h);c.closePath();c.fill();c.stroke();
  if(spire){const t=y-h-w*2.2;c.beginPath();c.moveTo(x,t);c.lineTo(x,t-3);c.moveTo(x-1.3,t-2);c.lineTo(x+1.3,t-2);c.stroke();}
  c.beginPath();c.moveTo(x,y);c.lineTo(x,y-h*.45);c.stroke();}
const GLYPH=[{w:30,h:30},{w:20,h:24},{w:10,h:20},{w:6,h:6}];
function town(c,r,x,y,tint){const f=tint?'rgba(196,110,82,.9)':'#efe2bd';
  if(r===0){[[-10,5,8],[-5,4,11],[0,5,13,1],[5.2,4,10],[10.4,5,7]].forEach(([dx,w,h,sp])=>building(c,x+dx,y,w,h,f,sp));c.lineWidth=1;c.beginPath();c.moveTo(x-14,y);c.lineTo(x+14,y);c.stroke();}
  else if(r===1){[[-4.5,5,6],[0,4,9,1],[4.5,5,5]].forEach(([dx,w,h,sp])=>building(c,x+dx,y,w,h,f,sp));c.lineWidth=.9;c.beginPath();c.moveTo(x-8,y);c.lineTo(x+8,y);c.stroke();}
  else if(r===2){building(c,x,y,3.4,5.5,f,1);}
  if(r===3){c.beginPath();c.arc(x,y,2,0,Math.PI*2);c.fillStyle=f;c.fill();c.lineWidth=.7;c.strokeStyle=INK;c.stroke();return;}
  c.beginPath();c.arc(x,y+3,r===2?1.4:2.1,0,Math.PI*2);c.fillStyle=INK;c.fill();}



/* ---------- tiles ---------- */
const TILES={"type": "vector", "url": "https://tiles.openfreemap.org/planet"};
const fc=features=>({type:'FeatureCollection',features});

/* ---------- trees: one grid of roots pinned to the screen ----------
   The woods and marsh polygons in view are rasterised into a bit mask in Web Mercator space (see buildMask).
   Every frame, each screen root is mapped to that mask; a root over a wood gets a tree, over marsh a tuft.
   The trees are drawn into a 2D canvas and handed to MapLibre as a custom layer, so roads and labels stay on top. */
const TILE=512,SP=7.6,ROW=.8;
// trees and waves are drawn at a fixed screen size, so they only make sense once the view is down to region scale
const TREE_MIN=6,WAVE_MIN=5;
const merc=(lon,lat,z)=>{const s=TILE*Math.pow(2,z),sn=Math.sin(lat*Math.PI/180);return [(lon+180)/360*s,(.5-Math.log((1+sn)/(1-sn))/(4*Math.PI))*s];};
function h2(i,j,s){let h=Math.imul(i,374761393)^Math.imul(j,668265263)^Math.imul(s+7,2246822519);h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return (h>>>0)/4294967296;}
const conNoise=makeNoise(5);
let mask=null,paths=null,maskBusy=false,maskDirty=true;
// a wood is conifer or broadleaf as a whole, judged by a slow noise field at its middle
function isConifer(rings){let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const [lo,la] of rings[0]){const [x,y]=merc(lo,la,14);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
  return conNoise.fbm((x0+x1)/2/900+40,(y0+y1)/2/900,3)>.12;}
/* The woods and marsh come from whichever tiles are loaded. They are rasterised into a mask one zoom level
   coarser than the view (about two screen pixels a cell), covering a square twice the screen's diagonal,
   and rebuilt when the view leaves that square, the zoom drifts a level, or new tiles arrive. */
function buildMask(map){
  const z=map.getZoom(),mz=Math.max(0,Math.floor(z)-1),ctr=map.getCenter(),[cx,cy]=merc(ctr.lng,ctr.lat,mz),cv=map.getCanvas();
  const side=Math.ceil(Math.hypot(cv.clientWidth,cv.clientHeight)*2*Math.pow(2,mz-z))+4,X0=Math.floor(cx-side/2),Y0=Math.floor(cy-side/2),w=side,h=side;
  const feats=map.querySourceFeatures('ofm',{sourceLayer:'landcover',filter:['in',['get','class'],['literal',['wood','wetland']]]});
  const P={marsh:new Path2D(),broad:new Path2D(),con:new Path2D(),woods:new Path2D()};
  const add=(p,rings)=>{for(const r of rings){r.forEach(([lo,la],i)=>{const [x,y]=merc(lo,la,mz);i?p.lineTo(x-X0,y-Y0):p.moveTo(x-X0,y-Y0);});p.closePath();}};
  for(const f of feats){const g=f.geometry,polys=g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[];
    for(const rings of polys){if(f.properties.class==='wetland'){add(P.marsh,rings);continue;}add(P.woods,rings);add(isConifer(rings)?P.con:P.broad,rings);}}
  const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d',{willReadFrequently:true}),bits=new Uint8Array(w*h);
  for(const [p,bit] of [[P.marsh,2],[P.broad,1],[P.con,5]]){x.clearRect(0,0,w,h);x.fillStyle='#000';x.fill(p,'nonzero');
    const d=x.getImageData(0,0,w,h).data;for(let i=0;i<w*h;i++)if(d[i*4+3]>127)bits[i]|=bit;}
  mask={bits,w,h,X0,Y0,zm:mz,ctr:[cx,cy],side};paths=P;maskDirty=false;treeKey=patKey='';}
// is the current view still inside the mask, at a zoom it was built for?
function maskCovers(v){if(!mask)return false;const mz=Math.max(0,Math.floor(v.z)-1);if(Math.abs(mz-mask.zm)>1)return false;
  const s=Math.pow(2,mask.zm-v.z),[cx,cy]=merc(v.ctr.lng,v.ctr.lat,mask.zm),r=Math.hypot(v.W,v.H)/2*s;
  return cx-r>=mask.X0&&cy-r>=mask.Y0&&cx+r<=mask.X0+mask.w&&cy+r<=mask.Y0+mask.h;}
function scheduleMask(map,delay=120){if(maskBusy)return;maskBusy=true;setTimeout(()=>{maskBusy=false;buildMask(map);map.triggerRepaint();},delay);}

/* The root grid repeats every PI columns and PJ rows (304 px square), so the very same trees can also be
   pre-drawn as a repeating tile: while zooming or rotating the woods are simply filled with that tile. */
const PI=40,PJ=50,PT_CSS=SP*PI;
const md=(v,n)=>((v%n)+n)%n;
const root=(i,j)=>{const hi=md(i,PI),hj=md(j,PJ),a=h2(hi,hj,7);return {a,x:(i+(j&1)*.5+(a-.5)*.6)*SP,y:(j+(h2(hj,hi,8)-.5)*.5)*SP*ROW};};
let treeSpr=null;
function makeTreeSprites(tint){const green=['rgba(150,164,92,1)','rgba(136,154,84,1)','rgba(166,172,100,1)'],out=[[],[]];
  for(const con of [0,1])for(let i=0;i<6;i++){const rv=(i+.5)/6,s=3.9*(.9+rv*.3),cv=document.createElement('canvas');cv.width=Math.ceil(12*dpr);cv.height=Math.ceil(15*dpr);
    const x=cv.getContext('2d');x.scale(dpr,dpr);x.lineJoin='round';x.lineCap='round';tree(x,5,13,s,!!con,tint?green[i%3]:'#eee0b8',rv);out[con].push(cv);}
  const tf=document.createElement('canvas');tf.width=Math.ceil(10*dpr);tf.height=Math.ceil(6*dpr);{const x=tf.getContext('2d');x.scale(dpr,dpr);x.strokeStyle='rgba(59,42,26,.75)';x.lineWidth=.55;x.beginPath();tuft(x,5,5);x.stroke();}
  treeSpr={trees:out,tuft:tf};
  const n=Math.round(PT_CSS*dpr),tile=draw=>{const cv=document.createElement('canvas');cv.width=cv.height=n;const x=cv.getContext('2d');x.scale(n/PT_CSS,n/PT_CSS);
    for(let j=-2;j<PJ+2;j++)for(let i=-2;i<PI+2;i++)draw(x,i,j,root(i,j));return cv;};
  treeSpr.tiles={n,broad:tile((x,i,j,r)=>x.drawImage(out[0][Math.floor(r.a*6)],r.x-5,r.y-13,12,15)),con:tile((x,i,j,r)=>x.drawImage(out[1][Math.floor(r.a*6)],r.x-5,r.y-13,12,15)),
    tuft:tile((x,i,j,r)=>{if(md(i+j,2)===0)x.drawImage(tf,r.x-5,r.y-5,10,6);})};}

const treeCanvas=document.createElement('canvas'),treeCtx=treeCanvas.getContext('2d'),patCanvas=document.createElement('canvas'),patCtx=patCanvas.getContext('2d');patCanvas.width=patCanvas.height=1;
let treeKey='',patKey='',treeCount=0,treesOn=true;
const G={ox:0,oy:0,ax:0,ay:0,z:null,br:null},TREE_WAIT=1000,TREE_WIPE=700;let lastZR=-1e9;
/* ---------- waves ----------
   Each wave takes a stretch of coast around a random visible point, pushes it out to sea as it grows, and fades away. */
const NW=5;
// the coast is the outline of the ocean polygons in the loaded tiles; edges along tile borders are straight
// north-south or east-west lines, so they are dropped and the rings split there into stretches of real shore
function coastLines(map){const out=[];
  for(const f of map.querySourceFeatures('ofm',{sourceLayer:'water',filter:['==',['get','class'],'ocean']})){const g=f.geometry,polys=g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[];
    for(const rings of polys)for(const r of rings){let cur=[r[0]];
      for(let i=1;i<r.length;i++){const a=r[i-1],b=r[i];if(Math.abs(a[0]-b[0])<1e-9||Math.abs(a[1]-b[1])<1e-9){if(cur.length>2)out.push(cur);cur=[b];}else cur.push(b);}
      if(cur.length>2)out.push(cur);}}
  return out;}
function startWaves(map){
  const waves=[...Array(NW)].map((_,i)=>({t0:performance.now()+i*1100,life:0,live:false}));
  let on=true,lines=[],stale=true;map.on('moveend',()=>stale=true);map.on('sourcedata',e=>{if(e.sourceId==='ofm'&&e.tile)stale=true;});
  function spawn(w,now){
    if(map.getZoom()<WAVE_MIN){w.t0=now+800;return;}
    if(stale){lines=coastLines(map);stale=false;}
    const cv=map.getCanvas(),W=cv.clientWidth,H=cv.clientHeight,b=map.getBounds(),cand=[];
    lines.forEach((l,li)=>l.forEach((p,pi)=>{if(b.contains(p)){const s=map.project(p);if(s.x>20&&s.y>20&&s.x<W-20&&s.y<H-20)cand.push([li,pi]);}}));
    if(!cand.length){w.t0=now+800;return;}
    const [li,pi]=cand[Math.floor(Math.random()*cand.length)],l=lines[li],half=25+Math.random()*30,pts=[l[pi]];
    let d=0,prev=map.project(l[pi]);for(let k=pi-1;k>=0&&d<half;k--){const s=map.project(l[k]);d+=Math.hypot(s.x-prev.x,s.y-prev.y);prev=s;pts.unshift(l[k]);}
    d=0;prev=map.project(l[pi]);for(let k=pi+1;k<l.length&&d<half;k++){const s=map.project(l[k]);d+=Math.hypot(s.x-prev.x,s.y-prev.y);prev=s;pts.push(l[k]);}
    if(pts.length<2){w.t0=now+300;return;}
    map.getSource(w.id).setData(fc([{type:'Feature',properties:{},geometry:{type:'LineString',coordinates:pts}}]));
    w.t0=now;w.life=4200+Math.random()*2200;w.live=true;}
  waves.forEach((w,i)=>w.id='wave'+i);
  function frame(now){
    if(on)waves.forEach((w,i)=>{
      if(!w.live){if(now>=w.t0)spawn(w,now);return;}
      const p=(now-w.t0)/w.life;
      if(p>=1){w.live=false;w.t0=now+Math.random()*1500;map.setPaintProperty('wave'+i,'line-opacity',0);map.setPaintProperty('waveS'+i,'line-opacity',0);return;}
      // rolls in from 36 px out to 3 px off the shore, then slips back a tenth of the way while it fades
      const IN=.82,FAR=36,NEAR=3,s=p<IN?1-Math.pow(1-p/IN,2):1-.1*Math.sin((p-IN)/(1-IN)*Math.PI/2);
      const off=FAR-(FAR-NEAR)*s,op=Math.min(1,p/.25)*(p<IN?1:1-(p-IN)/(1-IN));
      map.setPaintProperty('wave'+i,'line-offset',off);map.setPaintProperty('wave'+i,'line-opacity',op);
      map.setPaintProperty('waveS'+i,'line-offset',off+1.4);map.setPaintProperty('waveS'+i,'line-opacity',op);});
    requestAnimationFrame(frame);}
  requestAnimationFrame(frame);
  return v=>{on=v;};}

function view(map){const cv=map.getCanvas(),z=map.getZoom(),ctr=map.getCenter(),br=map.getBearing()*Math.PI/180;
  return {W:cv.clientWidth,H:cv.clientHeight,bw:cv.width,bh:cv.height,z,ctr,br,cb:Math.cos(br),sb:Math.sin(br),c:merc(ctr.lng,ctr.lat,z),
    key:`${cv.width}x${cv.height}:${z.toFixed(5)}:${ctr.lng.toFixed(7)}:${ctr.lat.toFixed(7)}:${br.toFixed(5)}:${treesOn}`};}

// the grid (and paper) ride with the map while panning; when zoom or bearing change they stay put on screen and re-anchor to the ground beneath
function updateGrid(v){const {W,H,z,br,cb,sb}=v,[cx,cy]=v.c;
  if(G.z===z&&G.br===br){const ex=G.ax-cx,ey=G.ay-cy;G.ox=W/2+ex*cb+ey*sb;G.oy=H/2-ex*sb+ey*cb;}
  else{if(G.z!==null)lastZR=performance.now();const dx=G.ox-W/2,dy=G.oy-H/2;G.ax=cx+dx*cb-dy*sb;G.ay=cy+dx*sb+dy*cb;G.z=z;G.br=br;}
  const pt=$('paper-tex');if(pt)pt.style.backgroundPosition=`${G.ox.toFixed(2)}px ${G.oy.toFixed(2)}px`;}

// one tree (or tuft) per root that lands in a wood (or marsh)
function drawRoots(v){const {W,H,bw,bh,cb,sb}=v,[cx,cy]=v.c;
  if(v.key===treeKey)return false;treeKey=v.key;
  if(treeCanvas.width!==bw||treeCanvas.height!==bh){treeCanvas.width=bw;treeCanvas.height=bh;}
  const c=treeCtx;c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,bw,bh);treeCount=0;if(!treesOn||!mask)return true;
  c.setTransform(bw/W,0,0,bh/H,0,0);
  const f=Math.pow(2,mask.zm-v.z),{bits,w,h,X0,Y0}=mask,sy=SP*ROW;
  const tufts=[],trees=[],i0=Math.floor(-G.ox/SP)-1,j0=Math.floor(-G.oy/sy)-1;
  for(let j=j0;(j-j0-1)*sy<H+16;j++)for(let i=i0;(i-i0-1)*SP<W+8;i++){
    const r=root(i,j),x=G.ox+r.x,y=G.oy+r.y;
    // screen offset from centre, turned by the map's bearing, gives the offset on the ground
    const dx=x-W/2,dy=y-H/2,gx=cx+dx*cb-dy*sb,gy=cy+dx*sb+dy*cb;
    const mx=Math.floor(gx*f-X0),my=Math.floor(gy*f-Y0);if(mx<0||my<0||mx>=w||my>=h)continue;const b=bits[my*w+mx];if(!b)continue;
    if(b&1)trees.push([x,y,r.a,b&4]);else if(md(i+j,2)===0)tufts.push([x,y]);}
  for(const [x,y] of tufts)c.drawImage(treeSpr.tuft,x-5,y-5,10,6);
  for(const [x,y,a,con] of trees)c.drawImage(treeSpr.trees[con?1:0][Math.floor(a*6)],x-5,y-13,12,15);
  treeCount=trees.length;return true;}

// the same trees as a repeating tile, clipped to the wood and marsh outlines: cheap enough for every frame of a zoom or turn
function drawPattern(v){const {W,H,bw,bh,z,br}=v,[cx,cy]=v.c;
  if(v.key===patKey)return false;patKey=v.key;
  if(patCanvas.width!==bw||patCanvas.height!==bh){patCanvas.width=bw;patCanvas.height=bh;}
  const c=patCtx;c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,bw,bh);if(!treesOn||!paths)return true;
  const S=new DOMMatrix([bw/W,0,0,bh/H,0,0]),P=S.translate(W/2,H/2).rotate(-br*180/Math.PI).translate(-cx,-cy).scale(Math.pow(2,z-mask.zm)).translate(mask.X0,mask.Y0);
  const T=treeSpr.tiles,pm=new DOMMatrix().translate(G.ox,G.oy).scale(PT_CSS/T.n);
  // filled (and thinly stroked, so neighbouring woods leave no hairline gap) with the tile, whose transform undoes the map transform
  const k=Math.pow(2,z-mask.zm),pmU=P.inverse().multiply(S).multiply(pm);
  const fillWith=(path,tile)=>{c.save();c.setTransform(P);const p=c.createPattern(tile,'repeat');p.setTransform(pmU);c.fillStyle=c.strokeStyle=p;c.lineWidth=1.2/k;c.lineJoin='round';c.fill(path,'nonzero');c.stroke(path);c.restore();};
  fillWith(paths.marsh,T.tuft);
  c.save();c.setTransform(P);c.globalCompositeOperation='destination-out';c.fillStyle=c.strokeStyle='#000';c.lineWidth=1.2/k;c.fill(paths.woods,'nonzero');c.stroke(paths.woods);c.restore();
  fillWith(paths.broad,T.broad);fillWith(paths.con,T.con);return true;}

/* While zooming or rotating the tile pattern is shown; a moment after it stops, the root trees wipe in over it as a growing circle. */
function treeLayer(){let prog,buf,texR,texP,aPos,loc;return {id:'trees',type:'custom',renderingMode:'2d',
  onAdd(map,gl){const sh=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);return s;};
    prog=gl.createProgram();gl.attachShader(prog,sh(gl.VERTEX_SHADER,'attribute vec2 p;varying vec2 uv;void main(){uv=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}'));
    gl.attachShader(prog,sh(gl.FRAGMENT_SHADER,'precision mediump float;varying vec2 uv;uniform sampler2D tr,tp;uniform vec2 c;uniform float r,e,o;void main(){float k=1.-smoothstep(r-e,r,distance(gl_FragCoord.xy,c));gl_FragColor=mix(texture2D(tp,uv),texture2D(tr,uv),k)*o;}'));gl.linkProgram(prog);
    loc=n=>gl.getUniformLocation(prog,n);
    aPos=gl.getAttribLocation(prog,'p');buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    const mk=()=>{const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);[gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER].forEach(p=>gl.texParameteri(gl.TEXTURE_2D,p,gl.NEAREST));
      [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T].forEach(p=>gl.texParameteri(gl.TEXTURE_2D,p,gl.CLAMP_TO_EDGE));return t;};texR=mk();texP=mk();},
  render(gl){const map=this.map,v=view(map);updateGrid(v);const op=Math.max(0,Math.min(1,(v.z-TREE_MIN)*2));if(!op){treeCount=0;return;}
    if(!maskCovers(v)||maskDirty)scheduleMask(map,maskCovers(v)?150:0);
    const since=performance.now()-lastZR-TREE_WAIT,q=Math.max(0,Math.min(1,since/TREE_WIPE)),full=Math.hypot(v.bw,v.bh)/2,e=40*dpr;
    const up=(tex,cv)=>{gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,cv);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);};
    gl.useProgram(prog);gl.activeTexture(gl.TEXTURE1);
    if(since<0||q<1){if(drawPattern(v)||!this.upP){up(texP,patCanvas);this.upP=true;}map.triggerRepaint();}
    gl.activeTexture(gl.TEXTURE0);
    let rad;if(since<0){rad=-e;if(!this.upR){up(texR,treeCanvas);this.upR=true;}}
    else{if(drawRoots(v)||!this.upR){up(texR,treeCanvas);this.upR=true;}rad=q>=1?full*4:(1-(1-q)**3)*(full+e);}
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texR);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,texP);
    gl.uniform1i(loc('tr'),0);gl.uniform1i(loc('tp'),1);gl.uniform2f(loc('c'),v.bw/2,v.bh/2);gl.uniform1f(loc('r'),rad);gl.uniform1f(loc('e'),e);gl.uniform1f(loc('o'),op);
    gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.enableVertexAttribArray(aPos);gl.vertexAttribPointer(aPos,2,gl.FLOAT,false,0,0);
    gl.disable(gl.DEPTH_TEST);gl.disable(gl.STENCIL_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);gl.activeTexture(gl.TEXTURE0);}};}

/* ---------- glyph images ---------- */
function addGlyphImages(map,tint){
  const green=['rgba(150,164,92,1)','rgba(136,154,84,1)','rgba(166,172,100,1)'];
  const put=(id,w,h,draw)=>{const c=document.createElement('canvas');c.width=Math.ceil(w*dpr);c.height=Math.ceil(h*dpr);const x=c.getContext('2d');x.scale(dpr,dpr);x.lineJoin='round';x.lineCap='round';draw(x);
    const im=x.getImageData(0,0,c.width,c.height);if(map.hasImage(id))map.updateImage(id,im);else map.addImage(id,im,{pixelRatio:dpr});};
  for(let i=0;i<6;i++){const rv=(i+.5)/6,s=3.9*(.9+rv*.3);
    put('dec'+i,12,15,x=>tree(x,5,13,s,false,tint?green[i%3]:'#eee0b8',rv));put('con'+i,12,15,x=>tree(x,5,13,s,true,tint?green[i%3]:'#eee0b8',rv));}
  put('tuft',10,6,x=>{x.strokeStyle='rgba(59,42,26,.75)';x.lineWidth=.55;x.beginPath();tuft(x,5,5);x.stroke();});
  for(let r=0;r<4;r++)put('town'+r,32,34,x=>town(x,r,16,26,tint));
}

/* ---------- style ----------
   Layers read the OpenMapTiles schema that OpenFreeMap serves: water, waterway, landcover, transportation,
   boundary, place and water_name. Road classes fold into the six ranks the Norfolk map used. */
function style(){
  const ink=a=>`rgba(59,42,26,${a})`,S='ofm';
  // five waves, each a short stretch of the coast in view (sea on the right) rolled in by an animated offset,
  // with a faint ink shadow just seaward of each white crest so the white still reads on pale paper
  const ripple=[...Array(NW).keys()].map(i=>({id:'waveS'+i,type:'line',source:'wave'+i,layout:{'line-join':'round','line-cap':'round'},
    paint:{'line-width':1,'line-opacity':0,'line-offset':0,'line-blur':.6,'line-gradient':['interpolate',['linear'],['line-progress'],0,ink(0),.3,ink(.55),.7,ink(.55),1,ink(0)]},metadata:{group:'ripple'}}))
   .concat([...Array(NW).keys()].map(i=>({id:'wave'+i,type:'line',source:'wave'+i,layout:{'line-join':'round','line-cap':'round'},
    paint:{'line-width':1.6,'line-opacity':0,'line-offset':0,'line-gradient':['interpolate',['linear'],['line-progress'],0,'rgba(255,253,244,0)',.3,'rgba(255,253,244,1)',.7,'rgba(255,253,244,1)',1,'rgba(255,253,244,0)']},metadata:{group:'ripple'}})));
  // details ghost in over half a zoom step after the zoom they appear at (and ghost out the same way)
  const fadeIn=(mz,to=1)=>['interpolate',['linear'],['zoom'],mz,0,mz+.5,to];
  const zw=(a,b)=>['interpolate',['linear'],['zoom'],11,a,14,b];
  const cls=(...c)=>['all',['in',['get','class'],['literal',c]],['!=',['get','brunnel'],'tunnel']];
  const rank=[cls('motorway','trunk'),cls('primary'),cls('secondary'),cls('tertiary'),cls('minor'),cls('track')];
  // main roads widen a little as you zoom in, so the network still reads at county and country scale
  const roadSpec=[[5,[3.4,1.6]],[7,[3,1.3]],[9,[2.5,1]],[10,[2,.75]]];
  const wz=(mz,w)=>['interpolate',['linear'],['zoom'],mz,w*.55,Math.max(10,mz+1),w,14,w*1.5];
  const roads=[{id:'road5',type:'line',source:S,'source-layer':'transportation',filter:rank[5],minzoom:11.5,layout:{'line-join':'round'},paint:{'line-color':'rgba(70,45,25,.7)','line-width':zw(.6,1),'line-dasharray':[4,3],'line-opacity':fadeIn(11.5)}},
    {id:'road-case4',type:'line',source:S,'source-layer':'transportation',filter:rank[4],minzoom:10.8,layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'rgba(70,45,25,.8)','line-width':zw(1.2,2.4),'line-opacity':fadeIn(10.8)}},
    {id:'road4',type:'line',source:S,'source-layer':'transportation',filter:rank[4],minzoom:10.8,layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':`rgb(${PAPER_RGB})`,'line-width':zw(.3,1),'line-opacity':fadeIn(10.8)}}];
  for(let k=3;k>=0;k--){const [mz,[wo,wi]]=roadSpec[k];
    roads.push({id:'road-case'+k,type:'line',source:S,'source-layer':'transportation',filter:rank[k],minzoom:mz,layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'rgba(70,45,25,.9)','line-width':wz(mz,wo),'line-opacity':fadeIn(mz)}});
    roads.push({id:'road'+k,type:'line',source:S,'source-layer':'transportation',filter:rank[k],minzoom:mz,layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':k<2?'rgb(214,160,120)':`rgb(${PAPER_RGB})`,'line-width':wz(mz,wi),'line-opacity':fadeIn(mz)},metadata:{tintRoad:k<2}});}
  const halo={'text-halo-color':`rgba(${PAPER_RGB},.92)`,'text-halo-width':1.6,'text-halo-blur':.4,'text-color':INK};
  const name=['coalesce',['get','name:latin'],['get','name']];
  // towns: city, town, village, hamlet become the four engraved town marks
  const pr=['match',['get','class'],'city',0,'town',1,'village',2,3];
  const place=(id,classes,mz,extra={},only=true)=>({id,type:'symbol',source:S,'source-layer':'place',minzoom:mz,filter:['all',['in',['get','class'],['literal',classes]],only],
    layout:{'icon-image':['concat','town',['to-string',pr]],'icon-anchor':'bottom','icon-offset':[0,8],
      'text-field':name,'text-font':['match',pr,0,['literal',['FellSC']],1,['literal',['FellRoman']],['literal',['FellItalic']]],'text-size':['match',pr,0,18,1,15,2,12.5,11],
      'text-transform':['match',pr,0,'uppercase','none'],'text-letter-spacing':['match',pr,0,.1,0],
      'text-variable-anchor':['left','right','top','bottom'],'text-radial-offset':['match',pr,0,1.1,1,1,.9],'text-justify':'auto','symbol-sort-key':['coalesce',['get','rank'],99],'text-padding':3,'icon-padding':1,...extra},
    paint:{...halo,'text-opacity':fadeIn(mz),'icon-opacity':fadeIn(mz)}});
  const major=['any',['==',['get','capital'],2],['<=',['coalesce',['get','rank'],99],2]];
  const ocean=['==',['get','class'],'ocean'];
  return {version:8,glyphs:'fell://{fontstack}/{range}',
    sources:{ofm:TILES,...Object.fromEntries([...Array(NW).keys()].map(i=>['wave'+i,{type:'geojson',data:fc([]),lineMetrics:true,buffer:512,tolerance:.2}]))},
    layers:[
      {id:'land',type:'background',paint:{'background-color':'#eee0b8'}},
      {id:'sea',type:'fill',source:S,'source-layer':'water',filter:ocean,paint:{'fill-color':PAPER}},
      ...ripple,
      // hand tinting: a soft yellow wash along the shore, and pink along borders
      {id:'tint-coast',type:'line',source:S,'source-layer':'water',filter:ocean,paint:{'line-color':'rgba(208,168,78,.4)','line-width':['interpolate',['linear'],['zoom'],2,3,7,16],'line-offset':['interpolate',['linear'],['zoom'],2,-1.5,7,-8],'line-blur':['interpolate',['linear'],['zoom'],2,1.5,7,8]},metadata:{group:'tint'}},
      {id:'tint-border',type:'line',source:S,'source-layer':'boundary',filter:['all',['<=',['get','admin_level'],6],['!=',['get','maritime'],1]],
        paint:{'line-color':['match',['get','admin_level'],2,'rgba(200,118,92,.34)','rgba(208,168,78,.3)'],'line-width':['match',['get','admin_level'],2,16,10],'line-blur':7,'line-opacity':['interpolate',['linear'],['zoom'],4.5,['match',['get','admin_level'],2,1,0],5,['match',['get','admin_level'],[2,3,4],1,0],7.5,['match',['get','admin_level'],[2,3,4],1,0],8,1]},metadata:{group:'tint'}},
      {id:'woods',type:'fill',source:S,'source-layer':'landcover',filter:['==',['get','class'],'wood'],paint:{'fill-color':'rgba(118,140,64,.16)'},metadata:{group:'tint'}},
      {id:'marsh',type:'fill',source:S,'source-layer':'landcover',filter:['==',['get','class'],'wetland'],paint:{'fill-color':'rgba(150,160,110,.14)'},metadata:{group:'tint'}},
      {id:'water',type:'fill',source:S,'source-layer':'water',filter:['!',ocean],paint:{'fill-color':'rgba(146,168,160,.55)','fill-outline-color':INK}},
      {id:'rivers',type:'line',source:S,'source-layer':'waterway',filter:['in',['get','class'],['literal',['river','canal']]],minzoom:4,layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':ink(.85),'line-width':['interpolate',['linear'],['zoom'],4,.3,9,.7,13,2],'line-opacity':fadeIn(4)}},
      {id:'streams',type:'line',source:S,'source-layer':'waterway',filter:['==',['get','class'],'stream'],minzoom:12,layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':ink(.6),'line-width':.6,'line-opacity':fadeIn(12)}},
      // the shoreline is the ocean's outline, with a softer shadow line just out to sea
      {id:'coast-shadow',type:'line',source:S,'source-layer':'water',filter:ocean,layout:{'line-join':'round'},paint:{'line-color':ink(.75),'line-width':['interpolate',['linear'],['zoom'],6,1,11,2.3],'line-offset':['interpolate',['linear'],['zoom'],6,.8,11,1.6]}},
      {id:'coast',type:'line',source:S,'source-layer':'water',filter:ocean,layout:{'line-join':'round'},paint:{'line-color':INK,'line-width':['interpolate',['linear'],['zoom'],6,.7,11,1.1]}},
      {id:'border',type:'line',source:S,'source-layer':'boundary',filter:['all',['<=',['get','admin_level'],6],['!=',['get','maritime'],1]],
        paint:{'line-color':INK,'line-width':['match',['get','admin_level'],2,1.4,1],'line-dasharray':[6,3,1,3],'line-opacity':['interpolate',['linear'],['zoom'],4.5,['match',['get','admin_level'],2,1,0],5,['match',['get','admin_level'],[2,3,4],1,0],7.5,['match',['get','admin_level'],[2,3,4],1,0],8,1]}},
      ...roads,
      {id:'bay-names',type:'symbol',source:S,'source-layer':'water_name',filter:['==',['get','class'],'bay'],minzoom:7,
        layout:{'text-field':name,'text-font':['literal',['FellItalic']],'text-size':14,'text-transform':'uppercase','text-letter-spacing':.25,'text-max-width':8},
        paint:{'text-color':'rgba(59,42,26,.8)','text-opacity':fadeIn(7)}},
      {id:'sea-names',type:'symbol',source:S,'source-layer':'water_name',filter:['==',['get','class'],'sea'],minzoom:3,
        layout:{'text-field':name,'text-font':['literal',['FellItalic']],'text-size':18,'text-transform':'uppercase','text-letter-spacing':.25,'text-max-width':8},
        paint:{'text-color':'rgba(59,42,26,.8)','text-opacity':fadeIn(3)}},
      {id:'ocean-names',type:'symbol',source:S,'source-layer':'water_name',filter:['==',['get','class'],'ocean'],
        layout:{'text-field':name,'text-font':['literal',['FellItalic']],'text-size':['interpolate',['linear'],['zoom'],1,15,4,22],'text-transform':'uppercase','text-letter-spacing':.25,'text-max-width':8},
        paint:{'text-color':'rgba(59,42,26,.8)'}},
      {id:'countries',type:'symbol',source:S,'source-layer':'place',filter:['==',['get','class'],'country'],maxzoom:7,
        layout:{'text-field':name,'text-font':['literal',['FellSC']],'text-size':['interpolate',['linear'],['zoom'],1,11,6,30],'text-transform':'uppercase','text-letter-spacing':.4,'text-max-width':9},
        paint:{'text-color':'rgba(154,58,34,.55)','text-opacity':['interpolate',['linear'],['zoom'],6,1,7,0]}},
      place('places-hamlet',['hamlet'],11.5),
      place('places-village',['village'],10.1),
      place('places-town',['town'],8),
      place('places-city',['city'],5,{},['!',major]),
      place('places',['city'],2.5,{},major),
      {id:'river-labels',type:'symbol',source:S,'source-layer':'waterway',minzoom:8,filter:['==',['get','class'],'river'],
        layout:{'symbol-placement':'line','text-field':name,'text-font':['literal',['FellItalic']],'text-size':12,'text-letter-spacing':.12,'symbol-spacing':400,'text-max-angle':30},
        paint:{...halo,'text-color':'rgba(40,60,70,.95)','text-opacity':fadeIn(8)}}
    ]};
}

/* ---------- paper overlay ---------- */
// the mottling is one seamless tile that pans with the map; only the darkened edges stay fixed to the frame
const PT=2048;
/* The tile takes a moment to compute, so it is built off the main thread in a worker (OffscreenCanvas) while the map
   loads, and faded in when ready. makePaperTile only uses its own helpers so its source can be shipped to the worker. */
async function makePaperTile(PT){const N=makeNoise(911),r=mulberry32(77);
  const mk=(w,h)=>typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(w,h):Object.assign(document.createElement('canvas'),{width:w,height:h});
  // noise blended across the tile edges so the tile repeats without a seam
  const blot=(n,sc,amt,col)=>{const c=mk(n,n),x=c.getContext('2d'),im=x.createImageData(n,n);
    for(let j=0;j<n;j++)for(let i=0;i<n;i++){const u=i/n,v=j/n,f=(a,b)=>N.fbm(a/sc,b/sc,5);
      const w=f(i,j)*(1-u)*(1-v)+f(i-n,j)*u*(1-v)+f(i,j-n)*(1-u)*v+f(i-n,j-n)*u*v,norm=Math.sqrt(((1-u)**2+u*u)*((1-v)**2+v*v));
      const q=Math.max(0,Math.min(1,.5+w/norm*1.4)),k=(j*n+i)*4;
      im.data[k]=255-(255-col[0])*q*amt;im.data[k+1]=255-(255-col[1])*q*amt;im.data[k+2]=255-(255-col[2])*q*amt;im.data[k+3]=255;}x.putImageData(im,0,0);return c;};
  const grain=mk(220,220);{const x=grain.getContext('2d'),im=x.createImageData(220,220);
    for(let i=0;i<im.data.length;i+=4){const v=235+r()*20-(r()<.012?60:0);im.data[i]=v;im.data[i+1]=v-4;im.data[i+2]=v-12;im.data[i+3]=255;}x.putImageData(im,0,0);}
  const c=mk(PT,PT),x=c.getContext('2d');x.imageSmoothingQuality='high';
  x.drawImage(blot(256,24,.55,[176,132,74]),0,0,PT,PT);x.globalAlpha=.8;x.drawImage(blot(512,17,.28,[160,120,70]),0,0,PT,PT);x.globalAlpha=1;
  x.globalAlpha=.5;x.fillStyle=x.createPattern(grain,'repeat');x.fillRect(0,0,PT,PT);x.globalAlpha=1;
  return c.convertToBlob?c.convertToBlob({type:'image/jpeg',quality:.9}):new Promise(res=>c.toBlob(res,'image/jpeg',.9));}
function paperInWorker(){
  const src=`${mulberry32}\n${makeNoise}\n${makePaperTile}\nonmessage=async e=>postMessage(await makePaperTile(e.data));`;
  return new Promise((res,rej)=>{const url=URL.createObjectURL(new Blob([src],{type:'text/javascript'})),w=new Worker(url);
    const done=()=>{w.terminate();URL.revokeObjectURL(url);};
    w.onmessage=e=>{done();res(e.data);};w.onerror=e=>{done();rej(e);};w.postMessage(PT);});}
// without worker canvases, build it on the main thread once the map is up, so it never holds up the first view
const paperOnMain=()=>new Promise(res=>map.loaded()?res():map.once('load',res)).then(()=>new Promise(res=>setTimeout(res,50))).then(()=>makePaperTile(PT));
function loadPaper(){const pt=$('paper-tex');
  (typeof OffscreenCanvas!=='undefined'?paperInWorker().catch(paperOnMain):paperOnMain())
    .then(blob=>{const url=URL.createObjectURL(blob),img=new Image();img.src=url;return img.decode().then(()=>url);})
    .then(url=>{pt.style.setProperty('--paper-img',`url(${url})`);pt.style.setProperty('--paper-size',`${PT}px ${PT}px`);pt.classList.add('ready');})
    .catch(e=>console.error('paper texture',e));}
// the darkened edges are cheap, so they are drawn straight away and on every resize
function paintPaper(){
  const cv=$('paper'),r=cv.getBoundingClientRect(),W=r.width,H=r.height;cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);
  const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,W,H);
  const v=c.createRadialGradient(W/2,H/2,Math.min(W,H)*.3,W/2,H/2,Math.hypot(W,H)*.55);v.addColorStop(0,'rgba(140,90,30,0)');v.addColorStop(1,'rgba(110,62,18,.5)');c.fillStyle=v;c.fillRect(0,0,W,H);}

/* ---------- boot ---------- */
// glyph sheets ship as base64 inside the page and are served to MapLibre through a custom protocol
maplibregl.addProtocol('fell',async params=>{const k=params.url.replace('fell://','').replace(/%20/g,' '),b64=GLYPHS[k];
  if(!b64)return {data:new ArrayBuffer(0)};const bin=atob(b64),u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);return {data:u8.buffer};});
const map=new maplibregl.Map({container:'map',style:style(),...PINS.initialView(),minZoom:0,maxZoom:15,
  fadeDuration:300,attributionControl:{compact:true,customAttribution:'<a href="https://maplibre.org" target="_blank">MapLibre</a>'},pitchWithRotate:false,touchPitch:false,maxPitch:0});
map.addControl(new maplibregl.NavigationControl({showCompass:true,visualizePitch:false}),'bottom-right');
map.on('style.load',()=>{addGlyphImages(map,true);makeTreeSprites(true);const L=treeLayer();L.map=map;map.addLayer(L,'road5');});
map.on('load',()=>{$('loading').hidden=true;startWaves(map);});
loadPaper();
// new woods arrive with new tiles: mark the mask stale so the next frame rebuilds it
map.on('sourcedata',e=>{if(e.sourceId==='ofm'&&e.tile){maskDirty=true;map.triggerRepaint();}});
map.on('error',e=>{if(!map.loaded())$('loading').textContent='The map tiles could not be loaded. Check your connection and reload the page.';console.error(e.error||e);});
map.on('styleimagemissing',()=>{});
// places, their icons, grouping and info windows (pins.js)
PINS.attach(map);
new ResizeObserver(()=>paintPaper()).observe(document.querySelector('.plate'));
})();
