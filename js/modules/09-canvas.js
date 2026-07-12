function buildDColors(id){var w=$(id||'dColors');if(!w)return;w.innerHTML='';DCOLORS.forEach(function(c){var d=document.createElement('div');d.className='dsw'+(c===drawColor?' active':'');d.style.background=c;
  d.onclick=function(){drawColor=c;if(drawTool==='erase')setTool('pen');refreshSw('dsw',c);};w.appendChild(d);});}
function buildDSizes(id){var w=$(id||'dSizes');if(!w)return;w.innerHTML='';DSIZES.forEach(function(s){var d=document.createElement('div');d.className='dsz'+(s.px===drawSize?' active':'');d.setAttribute('data-px',s.px);
  d.innerHTML='<i style="width:'+s.d+'px;height:'+s.d+'px"></i>';d.onclick=function(){drawSize=s.px;refreshSw('dsz',s.px);};w.appendChild(d);});}
function refreshSw(cls,val){var all=document.querySelectorAll('.'+cls);for(var i=0;i<all.length;i++){var el=all[i];var on=(cls==='dsw')?(el.style.background&&sameColor(el.style.background,val)):(+el.getAttribute('data-px')===val);el.classList.toggle('active',on);}}
function sameColor(a,b){var t=document.createElement('div');t.style.background=b;return a===t.style.background||a.replace(/\s/g,'')===t.style.background.replace(/\s/g,'');}
function setTool(t){drawTool=t;var all=document.querySelectorAll('[data-tool]');for(var i=0;i<all.length;i++)all[i].classList.toggle('active',all[i].getAttribute('data-tool')===t);
  var to=$('dTextOpts');if(to)to.style.display=(t==='text')?'':'none';
  if(board)board.style.cursor=(t==='text')?'text':'crosshair';if(cAnno.canvas)cAnno.canvas.style.cursor=(t==='text')?'text':'crosshair';}
function sizeCanvasDoodle(){var area=$('drawArea');var dpr=window.devicePixelRatio||1;var w=area.clientWidth,h=area.clientHeight;
  board.style.position='absolute';board.style.left='0';board.style.top='0';board.style.width=w+'px';board.style.height=h+'px';
  board.width=Math.round(w*dpr);board.height=Math.round(h*dpr);
  dctx=board.getContext('2d');dctx.setTransform(1,0,0,1,0,0);dScale=board.width/w;
  dctx.fillStyle='#ffffff';dctx.fillRect(0,0,board.width,board.height);}
function sizeCanvasAnno(img){var area=$('drawArea');var aw=area.clientWidth,ah=area.clientHeight,pad=18;
  var ratio=Math.min((aw-pad*2)/img.naturalWidth,(ah-pad*2)/img.naturalHeight);
  var dispW=Math.max(40,Math.round(img.naturalWidth*ratio)),dispH=Math.max(40,Math.round(img.naturalHeight*ratio));
  var cap=1600,psc=Math.min(1,cap/img.naturalWidth),pw=Math.round(img.naturalWidth*psc),ph=Math.round(img.naturalHeight*psc);
  board.width=pw;board.height=ph;board.style.position='absolute';board.style.width=dispW+'px';board.style.height=dispH+'px';
  board.style.left=Math.round((aw-dispW)/2)+'px';board.style.top=Math.round((ah-dispH)/2)+'px';
  dctx=board.getContext('2d');dctx.setTransform(1,0,0,1,0,0);dScale=board.width/dispW;dctx.drawImage(img,0,0,pw,ph);}
var _wbCollab=false;
function wbSend(x0,y0,x1,y1,color,size,erase){if(!board)return;var W=board.width,H=board.height;var msg={t:'wbstroke',x0:x0/W,y0:y0/H,x1:x1/W,y1:y1/H,color:color,sr:(size*dScale)/W,erase:!!erase};if(isHost){hostBroadcast(msg);}else if(hostConn&&hostConn.open){tSend(hostConn,msg);}}
function wbApply(o){if(!dctx||!board)return;var W=board.width,H=board.height,c=dctx;c.save();c.lineCap='round';c.lineJoin='round';var lw=Math.max(1,(o.sr||0.004)*W*(o.erase?3:1));c.lineWidth=lw;if(o.erase){c.globalCompositeOperation='destination-out';c.strokeStyle='rgba(0,0,0,1)';}else{c.globalCompositeOperation='source-over';c.strokeStyle=o.color||'#111';}c.beginPath();c.moveTo(o.x0*W,o.y0*H);c.lineTo(o.x1*W,o.y1*H);c.stroke();c.restore();}
function wbClearLocal(){if(!dctx||!board)return;dctx.save();dctx.globalCompositeOperation='source-over';dctx.fillStyle='#ffffff';dctx.fillRect(0,0,board.width,board.height);dctx.restore();}
function startCollab(){if(!isHost)return;_wbCollab=true;openDraw();hostBroadcast({t:'wbopen'});updateCollabBtn();notice('已開啟協作白板，全班可一起畫');}
function stopCollab(){_wbCollab=false;if(isHost)hostBroadcast({t:'wbclose'});updateCollabBtn();toast('已結束協作白板');}
function toggleCollab(){if(!isHost)return;if(_wbCollab)stopCollab();else startCollab();}
function updateCollabBtn(){var b=$('collabBtn');if(b)b.innerHTML=_wbCollab?'🖌️ 結束共畫':'🖌️ 協作白板';}
function openDraw(){if(!iCanDraw())return;annoId=null;_annoImg=null;$('drawModal').classList.add('show');
  if(!dInited){board=$('board');buildDColors();buildDSizes();bindBoard();dInited=true;}
  var e=$('toolErase');if(e)e.style.display='';var pb=$('dpostBtn');if(pb)pb.textContent='張貼到牆上';
  setTimeout(function(){sizeCanvasDoodle();setTool('pen');},30);}
function openAnno(id){var p=findPost(id);if(!p||p.type!=='image'||!p.dataUrl)return;if(!(isHost||p.uid===myId))return;
  if(!dInited){board=$('board');buildDColors();buildDSizes();bindBoard();dInited=true;}
  annoId=id;var img=new Image();_annoImg=img;
  img.onload=function(){$('drawModal').classList.add('show');var e=$('toolErase');if(e)e.style.display='none';var pb=$('dpostBtn');if(pb)pb.textContent='完成標註';
    if(drawTool==='erase')setTool('pen');setTimeout(function(){sizeCanvasAnno(img);setTool('pen');},30);};
  img.onerror=function(){toast('圖片載入失敗');annoId=null;};img.src=p.dataUrl;}
function closeDraw(){commitText();$('drawModal').classList.remove('show');annoId=null;_annoImg=null;
  var e=$('toolErase');if(e)e.style.display='';var pb=$('dpostBtn');if(pb)pb.textContent='張貼到牆上';}
function clearCanvas(){if(!dctx)return;
  if(annoId&&_annoImg){if(!confirm('清除你加的標註，還原原圖？'))return;dctx.clearRect(0,0,board.width,board.height);dctx.drawImage(_annoImg,0,0,board.width,board.height);return;}
  if(!confirm('清除整個畫布？'))return;dctx.fillStyle='#ffffff';dctx.fillRect(0,0,board.width,board.height);if(_wbCollab&&!annoId){if(isHost)hostBroadcast({t:'wbclear'});else if(hostConn&&hostConn.open)tSend(hostConn,{t:'wbclear'});}}
function dpos(e){var r=board.getBoundingClientRect();return {x:(e.clientX-r.left)*(board.width/r.width),y:(e.clientY-r.top)*(board.height/r.height)};}
function applyStroke(){dctx.lineCap='round';dctx.lineJoin='round';dctx.lineWidth=((drawTool==='erase')?drawSize*3:drawSize)*dScale;dctx.strokeStyle=(drawTool==='erase')?'#ffffff':drawColor;}
function bindBoard(){
  board.addEventListener('pointerdown',function(e){if(drawTool==='text'){placeText(e);return;}e.preventDefault();drawing=true;board.setPointerCapture&&board.setPointerCapture(e.pointerId);
    var p=dpos(e);lastX=p.x;lastY=p.y;applyStroke();dctx.beginPath();dctx.moveTo(p.x,p.y);dctx.lineTo(p.x+0.1,p.y+0.1);dctx.stroke();if(_wbCollab&&!annoId)wbSend(p.x,p.y,p.x+0.1,p.y+0.1,drawColor,drawSize,drawTool==='erase');});
  board.addEventListener('pointermove',function(e){if(!drawing)return;e.preventDefault();var p=dpos(e);applyStroke();dctx.beginPath();dctx.moveTo(lastX,lastY);dctx.lineTo(p.x,p.y);dctx.stroke();if(_wbCollab&&!annoId)wbSend(lastX,lastY,p.x,p.y,drawColor,drawSize,drawTool==='erase');lastX=p.x;lastY=p.y;});
  board.addEventListener('pointerup',function(){drawing=false;});
  board.addEventListener('pointercancel',function(){drawing=false;});
  var inp=$('drawTextIn');
  inp.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();commitText();}else if(e.key==='Escape'){inp.style.display='none';}});
  inp.addEventListener('blur',function(){commitText();});
  var imgIn=$('drawImgIn');if(imgIn)imgIn.addEventListener('change',function(e){var f=e.target.files[0];if(f)insertDrawImage(f);e.target.value='';});}
function textDisp(){return drawFontSize;}
function updateTextPreview(){var inp=$('drawTextIn');if(inp&&inp.style.display!=='none'){inp.style.fontSize=drawFontSize+'px';inp.style.fontFamily=drawFont;}}
function placeText(e){var inp=$('drawTextIn');var p=dpos(e);var ar=$('drawArea').getBoundingClientRect();
  inp._x=p.x;inp._y=p.y;var dx=e.clientX-ar.left,dy=e.clientY-ar.top;
  inp.style.left=dx+'px';inp.style.top=(dy-textDisp()*0.7)+'px';inp.style.color=drawColor;inp.style.fontSize=textDisp()+'px';inp.style.fontFamily=drawFont;inp.value='';inp.style.display='block';setTimeout(function(){inp.focus();},10);}
function commitText(){var inp=$('drawTextIn');if(!inp||inp.style.display==='none')return;var t=inp.value;var x=inp._x,y=inp._y;inp.style.display='none';
  if(!t||!dctx)return;dctx.fillStyle=drawColor;dctx.font='700 '+(drawFontSize*dScale)+'px '+drawFont;dctx.textBaseline='middle';dctx.fillText(t,x,y);}
function insertDrawImage(file){if(!file)return;var rd=new FileReader();rd.onload=function(ev){var img=new Image();
  img.onload=function(){if(!dctx){toast('請先開啟畫布');return;}var bw=board.width,bh=board.height,pad=bw*0.04;
    var r=Math.min((bw-pad*2)/img.naturalWidth,(bh-pad*2)/img.naturalHeight);r=Math.min(r,4);
    var w=img.naturalWidth*r,h=img.naturalHeight*r,x=(bw-w)/2,y=(bh-h)/2;dctx.drawImage(img,x,y,w,h);toast('已插入圖片，可在上面塗鴉、加文字');};
  img.onerror=function(){toast('圖片載入失敗');};img.src=ev.target.result;};rd.readAsDataURL(file);}
function exportBoard(){var maxW=1600;var sc=Math.min(1,maxW/board.width);var w=Math.round(board.width*sc),h=Math.round(board.height*sc);
  var tmp=document.createElement('canvas');tmp.width=w;tmp.height=h;var tc=tmp.getContext('2d');if(!annoId){tc.fillStyle='#fff';tc.fillRect(0,0,w,h);}tc.drawImage(board,0,0,w,h);
  try{return tmp.toDataURL('image/webp',0.9);}catch(_){return tmp.toDataURL('image/jpeg',0.9);}}
function refreshCard(id){var p=findPost(id);if(!p)return;var old=$('feed').querySelector('.card[data-id="'+cssEsc(id)+'"]');if(old&&old.parentNode){var nw=buildCard(p);old.parentNode.replaceChild(nw,old);}}
function updatePostImageLocal(id,url){var p=findPost(id);if(!p)return;p.dataUrl=url;refreshCard(id);saveSession();}

/* ---- 就地標註：直接在牆上那張卡片上塗鴉（疊加層，所有類型卡片皆可） ---- */
function setAnnoLocal(id,anno){var p=findPost(id);if(!p)return;if(anno)p.anno=anno;else delete p.anno;refreshCard(id);saveSession();}
function caPos(e){var r=cAnno.canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*(cAnno.canvas.width/r.width),y:(e.clientY-r.top)*(cAnno.canvas.height/r.height)};}
function caStroke(){var c=cAnno.ctx;c.lineCap='round';c.lineJoin='round';c.lineWidth=((drawTool==='erase')?drawSize*3:drawSize)*cAnno.scale;
  if(drawTool==='erase'){c.globalCompositeOperation='destination-out';c.strokeStyle='rgba(0,0,0,1)';}else{c.globalCompositeOperation='source-over';c.strokeStyle=drawColor;}}
function emitStroke(x0,y0,x1,y1){if(!cAnno.canvas)return;var W=cAnno.canvas.width,H=cAnno.canvas.height;
  var msg={t:'annostroke',id:cAnno.id,x0:x0/W,y0:y0/H,x1:x1/W,y1:y1/H,sr:(((drawTool==='erase')?drawSize*3:drawSize)*cAnno.scale)/W,color:drawColor,erase:drawTool==='erase'};
  if(isHost)hostBroadcast(msg);else if(hostConn&&hostConn.open)tSend(hostConn,msg);}
function bindCardAnno(cv){
  cv.addEventListener('pointerdown',function(e){if(drawTool==='text'){caPlaceText(e);return;}e.preventDefault();cAnno.drawing=true;try{cv.setPointerCapture(e.pointerId);}catch(_){}
    var p=caPos(e);cAnno.lx=p.x;cAnno.ly=p.y;caStroke();var c=cAnno.ctx;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.x+0.1,p.y+0.1);c.stroke();emitStroke(p.x,p.y,p.x+0.1,p.y+0.1);});
  cv.addEventListener('pointermove',function(e){if(!cAnno.drawing)return;e.preventDefault();var p=caPos(e);caStroke();var c=cAnno.ctx;c.beginPath();c.moveTo(cAnno.lx,cAnno.ly);c.lineTo(p.x,p.y);c.stroke();emitStroke(cAnno.lx,cAnno.ly,p.x,p.y);cAnno.lx=p.x;cAnno.ly=p.y;});
  cv.addEventListener('pointerup',function(){cAnno.drawing=false;});
  cv.addEventListener('pointercancel',function(){cAnno.drawing=false;});}
/* ---- 即時筆跡：接收端把老師正在畫的線即時畫在對應卡片上（相對座標自動縮放） ---- */
var liveOverlays={};
function ensureLive(id){var ex=liveOverlays[id];if(ex&&ex.canvas.parentNode)return ex;if(ex)delete liveOverlays[id];
  var card=$('feed').querySelector('.card[data-id="'+cssEsc(id)+'"]');if(!card)return null;
  var dpr=window.devicePixelRatio||1;var w=card.clientWidth,h=card.clientHeight;
  var cv=document.createElement('canvas');cv.className='livelayer';cv.width=Math.max(1,Math.round(w*dpr));cv.height=Math.max(1,Math.round(h*dpr));
  card.appendChild(cv);var o={canvas:cv,ctx:cv.getContext('2d')};liveOverlays[id]=o;return o;}
function applyLiveStroke(o){if(cAnno.id===o.id)return;var L=ensureLive(o.id);if(!L)return;var c=L.ctx,W=L.canvas.width,H=L.canvas.height;
  c.lineCap='round';c.lineJoin='round';c.lineWidth=Math.max(1,o.sr*W);
  if(o.erase){c.globalCompositeOperation='destination-out';c.strokeStyle='rgba(0,0,0,1)';}else{c.globalCompositeOperation='source-over';c.strokeStyle=o.color||'#111';}
  c.beginPath();c.moveTo(o.x0*W,o.y0*H);c.lineTo(o.x1*W,o.y1*H);c.stroke();}
function clearLive(id){var o=liveOverlays[id];if(o){if(o.canvas.parentNode)o.canvas.parentNode.removeChild(o.canvas);delete liveOverlays[id];}}
function caPlaceText(e){var inp=$('annoTextIn');var p=caPos(e);inp._cx=p.x;inp._cy=p.y;
  inp.style.left=e.clientX+'px';inp.style.top=(e.clientY-16)+'px';inp.style.color=drawColor;inp.style.fontSize=Math.max(16,drawSize*4)+'px';inp.value='';inp.style.display='block';setTimeout(function(){inp.focus();},10);}
function caCommitText(){var inp=$('annoTextIn');if(inp.style.display==='none'||!cAnno.ctx)return;var t=inp.value;inp.style.display='none';if(!t)return;
  var c=cAnno.ctx;c.globalCompositeOperation='source-over';c.fillStyle=drawColor;c.font='700 '+(Math.max(16,drawSize*4)*cAnno.scale)+'px "Noto Sans TC",sans-serif';c.textBaseline='middle';c.fillText(t,inp._cx,inp._cy);}
function annotateCard(id){var p=findPost(id);if(!p)return;if(!iCanDraw())return;
  if(cAnno.id)closeCardAnno();
  var card=$('feed').querySelector('.card[data-id="'+cssEsc(id)+'"]');if(!card)return;
  cAnno.id=id;cAnno.card=card;card.classList.add('annotating');
  var dpr=window.devicePixelRatio||1;var w=card.clientWidth,h=card.clientHeight;
  var cv=document.createElement('canvas');cv.className='annoedit';cv.width=Math.max(1,Math.round(w*dpr));cv.height=Math.max(1,Math.round(h*dpr));
  card.appendChild(cv);cAnno.canvas=cv;cAnno.ctx=cv.getContext('2d');cAnno.scale=dpr;
  if(p.anno){var im=new Image();im.onload=function(){if(cAnno.ctx===cv.getContext('2d'))cAnno.ctx.drawImage(im,0,0,cv.width,cv.height);};im.src=p.anno;}
  bindCardAnno(cv);buildDColors('aColors');buildDSizes('aSizes');setTool('pen');
  $('annoBar').classList.add('show');card.scrollIntoView({block:'center',behavior:'smooth'});toast('在卡片上塗鴉，完成後按「完成」');}
function clearCardAnno(){if(!cAnno.ctx)return;if(!confirm('清除這張卡片的標註？'))return;cAnno.ctx.clearRect(0,0,cAnno.canvas.width,cAnno.canvas.height);
  var msg={t:'annoclear',id:cAnno.id};if(isHost)hostBroadcast(msg);else if(hostConn&&hostConn.open)tSend(hostConn,msg);}
function doneCardAnno(){if(!cAnno.id||!cAnno.canvas){closeCardAnno();return;}caCommitText();
  var id=cAnno.id;var url;try{url=cAnno.canvas.toDataURL('image/webp',0.92);}catch(_){url=cAnno.canvas.toDataURL('image/png');}
  closeCardAnno();setAnnoLocal(id,url);
  if(isHost){hostBroadcast({t:'annoset',id:id,anno:url});}else if(hostConn&&hostConn.open){tSend(hostConn,{t:'annoupdate',id:id,anno:url});}
  toast('標註已套用並同步');}
function closeCardAnno(){var inp=$('annoTextIn');if(inp)inp.style.display='none';
  if(cAnno.canvas&&cAnno.canvas.parentNode)cAnno.canvas.parentNode.removeChild(cAnno.canvas);
  if(cAnno.card)cAnno.card.classList.remove('annotating');
  $('annoBar').classList.remove('show');cAnno={id:null,card:null,canvas:null,ctx:null,scale:1,drawing:false,lx:0,ly:0};}
function postDraw(){if(!dctx){closeDraw();return;}commitText();var url=exportBoard();
  if(annoId){var tid=annoId;updatePostImageLocal(tid,url);
    if(isHost){hostBroadcast({t:'updated',id:tid,dataUrl:url});}
    else if(hostConn&&hostConn.open){tSend(hostConn,{t:'update',id:tid,dataUrl:url});}
    closeDraw();toast('標註已更新並同步');return;}
  var post={id:uid(),uid:myId,name:myName,ts:nowHM(),type:'image',dataUrl:url,subject:'🎨 塗鴉'};
  if(kanbanOn&&columns.length)post.col=(columns.indexOf(_lastCol)>=0?_lastCol:columns[0]);
  feed.push(post);addPostEl(post);
  if(isHost){hostBroadcast({t:'post',post:sanitizePost(post)});}else if(hostConn&&hostConn.open){tSend(hostConn,{t:'post',post:post});}
  saveSession();closeDraw();toast('已張貼塗鴉到牆上');}
function exportPDF(){if(!feed.length){toast('版面還沒有內容');return;}
  var d=new Date();var ds=d.getFullYear()+'/'+('0'+(d.getMonth()+1)).slice(-2)+'/'+('0'+d.getDate()).slice(-2)+' '+nowHM();
  $('printHead').innerHTML='<div class="pt">'+esc(roomName)+'</div><div class="pd">貼課通課堂牆 · 匯出於 '+ds+' · '+feed.length+' 則</div>';
  toast('開啟列印 → 可選「儲存為 PDF」');setTimeout(function(){window.print();},250);}
function updateSendBtn(){$('sendBtn').disabled=!(($('msg').value||'').trim()||($('subjIn').value||'').trim()||attach);}

/* ===================== 課堂工具：隨機抽人 / 計時器 / 全室唯讀 ===================== */
