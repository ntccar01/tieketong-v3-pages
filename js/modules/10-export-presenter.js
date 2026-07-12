function randomPick(){var pool=[];for(var id in members){if(id===myId&&isHost)continue;pool.push(members[id].name);}
  if(!pool.length){toast('目前沒有可抽的學員');return;}
  $('pickModal').classList.add('show');var nameEl=$('pickName');var n=0;
  var iv=setInterval(function(){nameEl.textContent=pool[Math.floor(Math.random()*pool.length)];if(++n>12){clearInterval(iv);
    var pick=pool[Math.floor(Math.random()*pool.length)];nameEl.textContent=pick;
    if(isHost)hostBroadcast({t:'picked',name:pick});notice('🎲 抽到：'+pick);}},70);}
var _timerLabel='';
function openTimer(label){_timerLabel=label||'';var pr=$('tmPresets');pr.innerHTML='';[1,3,5,10,15].forEach(function(m){var b=document.createElement('button');b.className='tm-pre';b.textContent=m+' 分';b.onclick=function(){startTimer(m*60);};pr.appendChild(b);});
  $('tmTitle').textContent=label?'休息倒數計時器':'倒數計時器';$('timerModal').classList.add('show');}
function startTimer(sec){sec=Math.max(1,Math.min(10800,sec|0));_autoLockOnEnd=!!($('tmAutoLock')&&$('tmAutoLock').checked);var end=Date.now()+sec*1000;$('timerModal').classList.remove('show');
  startTimerDisplay(end,true,_timerLabel);if(isHost&&roomCodeStr)hostBroadcast({t:'timer',endTs:end,label:_timerLabel});}
function startTimerDisplay(end,canStop,label){timerEnd=end;if(timerIv)clearInterval(timerIv);
  $('timerLabel').textContent=label||'';$('timerLabel').style.display=label?'':'none';
  $('timerBadge').classList.remove('done');$('timerBadge').classList.add('show');$('tbStop').style.display=canStop?'':'none';
  function tick(){var ms=timerEnd-Date.now();if(ms<=0){$('timerTime').textContent='00:00';$('timerBadge').classList.add('done');clearInterval(timerIv);timerIv=null;try{beep();}catch(e){}if(isHost&&_autoLockOnEnd&&!frozen){_autoLockOnEnd=false;try{toggleFreeze();}catch(e){}toast('⏰ 時間到，已自動鎖定發文');}setTimeout(function(){$('timerBadge').classList.remove('show','done');},5000);return;}
    var s=Math.ceil(ms/1000);$('timerTime').textContent=('0'+Math.floor(s/60)).slice(-2)+':'+('0'+(s%60)).slice(-2);}
  tick();timerIv=setInterval(tick,250);}
function hideTimer(){timerEnd=0;if(timerIv){clearInterval(timerIv);timerIv=null;}$('timerBadge').classList.remove('show','done');}
function stopTimer(){hideTimer();if(isHost&&roomCodeStr)hostBroadcast({t:'timer',endTs:0});}
function beep(){try{var a=new (window.AudioContext||window.webkitAudioContext)();var o=a.createOscillator();var g=a.createGain();o.connect(g);g.connect(a.destination);o.frequency.value=880;o.start();g.gain.setValueAtTime(.2,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+.6);o.stop(a.currentTime+.6);}catch(e){}}
function toggleLockAll(){if(!guardFeature('lockAll'))return;var stu=memberArray().filter(function(m){return m.id!==myId;});var allRO=stu.length>0&&stu.every(function(m){return m.viewOnly;});setAllViewOnly(!allRO);}

/* ===================== QR 房號 ===================== */
var _qrLib=false;
function loadQR(cb){if(_qrLib){cb(true);return;}var s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
  s.onload=function(){_qrLib=true;cb(true);};s.onerror=function(){cb(false);};document.head.appendChild(s);}
function joinURL(){var base=location.href.split('#')[0].split('?')[0];return base+'?room='+encodeURIComponent(roomCodeStr);}
function showQR(){$('qrCodeTxt').textContent='代碼：'+roomCodeStr;$('qrModal').classList.add('show');var box=$('qrBox');box.innerHTML='<div style="color:#8a7d5e;font-size:13px;padding:20px">產生中…</div>';
  loadQR(function(ok){box.innerHTML='';if(!ok||typeof QRCode==='undefined'){box.innerHTML='<div style="color:#8a7d5e;font-size:13px;padding:14px">需要連網才能產生 QR，請改用代碼 '+esc(roomCodeStr)+'</div>';return;}
    try{new QRCode(box,{text:joinURL(),width:220,height:220,colorDark:'#111',colorLight:'#fff'});}catch(e){box.innerHTML='<div style="color:#8a7d5e">產生失敗，請用代碼</div>';}});}

/* ===================== 匯出 / 匯入 教室檔案 ===================== */
function openExport(){if(!guardFeature('export'))return;$('exportModal').classList.add('show');}
function dl(name,blob){var u=URL.createObjectURL(blob);var a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u);},2000);}
function safeName(s){return String(s||'教室').replace(/[\\/:*?"<>|]/g,'_').slice(0,40);}
function exportRoomFile(){var data=(typeof snapNow==='function')?snapNow():{app:'shr',v:2,ts:Date.now(),roomName:roomName,bg:selBg,allowOpen:allowOpen,members:members,feed:feed};
  data.app='shr';data.v=2;var json=JSON.stringify(data,null,2),blob=new Blob([json],{type:'application/json'}),mb=blob.size/1048576;
  dl('教室_'+safeName(roomName)+'_'+new Date().toISOString().slice(0,10)+'.json',blob);toast(mb>20?'已匯出完整教室檔案，但檔案較大（'+mb.toFixed(1)+'MB）':'已匯出完整教室檔案');}
function exportCSV(){if(!feed.length){toast('沒有內容');return;}
  function q(s){s=String(s==null?'':s);return '"'+s.replace(/"/g,'""')+'"';}
  var rows=[['作者','時間','主題','類型','內容']];
  feed.forEach(function(p){var type=p.type||'text';var content=p.text||(p.fname||'');rows.push([q(p.name),q(p.ts),q(p.subject||''),q(type),q(content)]);});
  var csv='\ufeff'+rows.map(function(r){return r.join(',');}).join('\r\n');
  dl('教室文字_'+safeName(roomName)+'.csv',new Blob([csv],{type:'text/csv'}));toast('已匯出 CSV');}
/* ---- 逐張圖片 / PPTX 匯出（每則一頁） ---- */
var _scripts={};
function loadScript(src,cb){if(_scripts[src]){cb(true);return;}var s=document.createElement('script');s.src=src;s.onload=function(){_scripts[src]=1;cb(true);};s.onerror=function(){cb(false);};document.head.appendChild(s);}
function loadScriptChain(urls,test,cb){var i=0;(function tryNext(){if(test()){cb(true);return;}if(i>=urls.length){cb(false);return;}loadScript(urls[i++],function(ok){if(ok&&test())cb(true);else tryNext();});})();}
function dataURLtoBlob(u){var a=u.split(',');var mime=(a[0].match(/:(.*?);/)||[])[1]||'image/png';var bin=atob(a[1]);var n=bin.length;var arr=new Uint8Array(n);while(n--)arr[n]=bin.charCodeAt(n);return new Blob([arr],{type:mime});}
function wrapText(ctx,text,maxW){var lines=[],cur='';for(var i=0;i<text.length;i++){var ch=text[i];if(ch==='\n'){lines.push(cur);cur='';continue;}var t=cur+ch;if(ctx.measureText(t).width>maxW&&cur){lines.push(cur);cur=ch;}else cur=t;}if(cur)lines.push(cur);return lines;}
function renderPostSlide(p,cb){var c=document.createElement('canvas');c.width=1280;c.height=720;var x=c.getContext('2d');
  x.fillStyle='#ffffff';x.fillRect(0,0,1280,720);x.fillStyle=p.cardColor||'#c79a44';x.fillRect(0,0,1280,12);
  x.textBaseline='top';x.fillStyle='#666';x.font='600 26px "Noto Sans TC",sans-serif';x.fillText((p.name||'?')+'    '+(p.ts||''),60,42);
  var y=96;
  if(p.subject){x.fillStyle='#141414';x.font='800 46px "Noto Sans TC",sans-serif';var sl=wrapText(x,p.subject,1160);for(var i=0;i<sl.length&&i<2;i++){x.fillText(sl[i],60,y);y+=56;}y+=10;}
  function drawText(maxLines){if(p.text){x.fillStyle='#222';x.font='30px "Noto Sans TC",sans-serif';var tl=wrapText(x,p.text,1160);for(var i=0;i<tl.length&&i<maxLines;i++){x.fillText(tl[i],60,y);y+=44;}y+=6;}}
  function finish(){try{cb(c.toDataURL('image/png'));}catch(e){cb(null);}}
  if(p.type==='image'&&p.dataUrl){drawText(4);var img=new Image();img.onload=function(){var aH=720-y-44,aW=1160;var r=Math.min(aW/img.naturalWidth,aH/img.naturalHeight);r=Math.min(r,3);
      var w=img.naturalWidth*r,h=img.naturalHeight*r,ix=(1280-w)/2,iy=y;x.drawImage(img,ix,iy,w,h);
      if(p.anno){var an=new Image();an.onload=function(){x.drawImage(an,ix,iy,w,h);finish();};an.onerror=finish;an.src=p.anno;}else finish();};
    img.onerror=finish;img.src=p.dataUrl;}
  else if(p.type==='video'||p.type==='audio'||p.type==='file'){drawText(8);x.fillStyle='#888';x.font='30px "Noto Sans TC",sans-serif';var ic=p.type==='video'?'🎬':p.type==='audio'?'🎵':'📄';x.fillText(ic+' '+(p.fname||p.type),60,y+12);finish();}
  else{drawText(13);finish();}}
function exportImages(){if(!feed.length){toast('沒有內容');return;}toast('產生圖片中…');
  loadScriptChain(['https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js','https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js'],function(){return typeof JSZip!=='undefined';},function(ok){
    if(!ok||typeof JSZip==='undefined'){toast('無法載入打包元件，改為逐張下載');seqDownloadImages();return;}
    var zip=new JSZip(),i=0;(function next(){if(i>=feed.length){zip.generateAsync({type:'blob'}).then(function(blob){dl('教室圖片_'+safeName(roomName)+'.zip',blob);toast('已匯出 '+feed.length+' 張圖片（.zip）');});return;}
      renderPostSlide(feed[i],function(url){if(url)zip.file(('0'+(i+1)).slice(-2)+'.png',url.split(',')[1],{base64:true});i++;next();});})();});}
function seqDownloadImages(){var i=0;(function nx(){if(i>=feed.length){toast('完成');return;}renderPostSlide(feed[i],function(url){if(url)dl(('0'+(i+1)).slice(-2)+'_'+safeName(roomName)+'.png',dataURLtoBlob(url));i++;setTimeout(nx,500);});})();}
function exportPPTX(){if(!feed.length){toast('沒有內容');return;}toast('產生 PPTX 中…（首次需下載元件，請稍候）');
  loadScriptChain(['https://cdn.jsdelivr.net/gh/gitbrent/pptxgenjs@3.12.0/dist/pptxgen.bundle.js','https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js'],function(){return typeof PptxGenJS!=='undefined';},function(ok){
    if(!ok||typeof PptxGenJS==='undefined'){toast('無法載入 PPTX 元件，請確認網路後再試');return;}
    try{var pptx=new PptxGenJS();pptx.defineLayout({name:'WS',width:13.33,height:7.5});pptx.layout='WS';var i=0;
    (function next(){if(i>=feed.length){pptx.writeFile({fileName:'教室簡報_'+safeName(roomName)+'.pptx'}).then(function(){toast('已匯出 PPTX（'+feed.length+' 頁）');}).catch(function(){toast('PPTX 產生失敗');});return;}
      renderPostSlide(feed[i],function(url){var sl=pptx.addSlide();if(url)sl.addImage({data:url,x:0,y:0,w:13.33,h:7.5});i++;next();});})();
    }catch(e){toast('PPTX 產生失敗：'+e.message);}});}
function importRoomFile(file){if(!guardFeature('importRoomFile'))return;if(file&&file.size>30*1048576)toast('檔案較大，載入可能需要一點時間');var rd=new FileReader();rd.onload=function(ev){var data;try{data=JSON.parse(ev.target.result);}catch(e){toast('檔案格式錯誤：請選擇貼課通匯出的 JSON');return;}
  if(!data){toast('檔案內容是空的');return;}
  if(data.app&&data.app!=='shr'){toast('這不是貼課通教室備份檔');return;}
  if(data.v&&data.v>2){toast('這個備份版本較新，請用新版貼課通匯入');return;}
  if(!Array.isArray(data.feed)){toast('備份缺少貼文資料，無法導入');return;}
  var nm=($('nameIn').value||'').trim();if(!nm){showStatus('請先輸入暱稱再導入',true);$('nameIn').focus();return;}
  myName=nm;showStatus('正在載入連線模組…');
  loadPeerJS(function(){showStatus('正在建立房間…');mkPeer(genCode(),function(pid){roomCodeStr=pid.replace('shr-','');
    data.code=roomCodeStr;data.isHost=true;data.myId=myId;data.myName=myName;data.members={};data.members[myId]={name:myName,viewOnly:false,canDraw:false};
    if(typeof applySnapshotState==='function')applySnapshotState(data);else{isHost=true;roomName=data.roomName||'貼課通';selBg=data.bg||'';allowOpen=(typeof data.allowOpen!=='undefined')?data.allowOpen:true;feed=data.feed||[];}
    applyName(roomName);enterRoom();applyTheme(selBg);showAnnounce(roomAnnounce);applyFreeze(frozen);wireHost();saveSession();toast('已從檔案導入教室（'+feed.length+' 則）');});});};
  rd.readAsDataURL?rd.readAsText(file):rd.readAsText(file);}
$('importFile').addEventListener('change',function(e){var f=e.target.files[0];if(f)importRoomFile(f);e.target.value='';});

/* ===================== 簡報模式（一則一頁播放） ===================== */
var slideIdx=0,autoIv=null,laserOn=false,slAnnoOn=false,_slBound=false;
function openSlides(){if(!feed.length){toast('版面還沒有內容');return;}slideIdx=0;$('slideShow').classList.add('show');
  ['ssLaserBtn','ssAnnoBtn','ssClearBtn'].forEach(function(id){var e=$(id);if(e)e.style.display=isHost?'':'none';});
  renderSlide(true);document.addEventListener('keydown',ssKey);bindSlidePresenter();}
function closeSlides(){stopAutoPlay();laserOn=false;slAnnoOn=false;var lb=$('ssLaserBtn');if(lb)lb.classList.remove('on');var ab=$('ssAnnoBtn');if(ab)ab.classList.remove('on');
  $('slideShow').classList.remove('show');document.removeEventListener('keydown',ssKey);var st=$('ssHolder');if(st)st.innerHTML='';hideLaser();$('ssAnno').style.pointerEvents='none';}
function ssKey(e){if(e.key==='ArrowRight'||e.key==='PageDown'||e.key===' '){e.preventDefault();slideNext();}else if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();slidePrev();}else if(e.key==='Escape'){closeSlides();}}
function slideNext(){if(slideIdx<feed.length-1){slideIdx++;renderSlide(true);}else if(autoIv){slideIdx=0;renderSlide(true);}}
function slidePrev(){if(slideIdx>0){slideIdx--;renderSlide(true);}}
function toggleAutoPlay(){if(autoIv){stopAutoPlay();}else{autoIv=setInterval(slideNext,5000);$('ssAuto').textContent='⏸ 暫停（5秒/頁）';$('ssAuto').classList.add('on');}}
function stopAutoPlay(){if(autoIv){clearInterval(autoIv);autoIv=null;}var a=$('ssAuto');if(a){a.textContent='▶ 自動播放';a.classList.remove('on');}}
function renderSlide(broadcast){if(!feed.length){closeSlides();return;}if(slideIdx>=feed.length)slideIdx=feed.length-1;if(slideIdx<0)slideIdx=0;
  var p=feed[slideIdx];var holder=$('ssHolder');holder.innerHTML='';holder.appendChild(buildSlideCard(p));
  $('ssCount').textContent=(slideIdx+1)+' / '+feed.length;
  var dots=$('ssDots');dots.innerHTML='';for(var i=0;i<feed.length;i++){(function(i){var d=document.createElement('span');d.className='ss-dot'+(i===slideIdx?' on':'');d.title=(i+1)+'';d.onclick=function(){slideIdx=i;renderSlide(true);};dots.appendChild(d);})(i);}
  var don=dots.querySelector('.ss-dot.on');if(don&&don.scrollIntoView)don.scrollIntoView({inline:'center',block:'nearest'});
  document.querySelectorAll('.ss-nav.prev').forEach(function(b){b.disabled=slideIdx===0;});
  document.querySelectorAll('.ss-nav.next').forEach(function(b){b.disabled=slideIdx===feed.length-1;});
  setTimeout(sizeSlAnno,60);hideLaser();
  if(broadcast&&isHost){hostBroadcast({t:'slide',idx:slideIdx});hostBroadcast({t:'slclear'});}}
/* ---- 簡報雷射筆 + 即時標註（房主主控 → 全班同步） ---- */
function sizeSlAnno(){var st=$('ssStage'),cv=$('ssAnno');if(!st||!cv)return;var r=st.getBoundingClientRect();cv.width=Math.round(r.width);cv.height=Math.round(r.height);cv.style.width=r.width+'px';cv.style.height=r.height+'px';}
function bindSlidePresenter(){if(_slBound)return;_slBound=true;var st=$('ssStage'),cv=$('ssAnno');
  st.addEventListener('pointermove',function(e){if(!laserOn||!isHost)return;var r=st.getBoundingClientRect();var x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;showLaser(x,y);hostBroadcast({t:'laser',x:x,y:y,on:true});});
  st.addEventListener('pointerleave',function(){if(laserOn&&isHost){hideLaser();hostBroadcast({t:'laser',on:false});}});
  var drawing=false,lx=0,ly=0;
  cv.addEventListener('pointerdown',function(e){if(!slAnnoOn||!isHost)return;drawing=true;var n=slPos(e);lx=n.x;ly=n.y;});
  cv.addEventListener('pointermove',function(e){if(!drawing||!slAnnoOn||!isHost)return;var n=slPos(e);drawSlSeg(lx,ly,n.x,n.y);hostBroadcast({t:'slstroke',x0:lx,y0:ly,x1:n.x,y1:n.y});lx=n.x;ly=n.y;});
  cv.addEventListener('pointerup',function(){drawing=false;});cv.addEventListener('pointerleave',function(){drawing=false;});
  window.addEventListener('resize',function(){if($('slideShow').classList.contains('show'))sizeSlAnno();});}
function slPos(e){var cv=$('ssAnno'),r=cv.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};}
function drawSlSeg(x0,y0,x1,y1){var cv=$('ssAnno'),x=cv.getContext('2d');x.strokeStyle='#ff3b3b';x.lineWidth=4;x.lineCap='round';x.lineJoin='round';x.beginPath();x.moveTo(x0*cv.width,y0*cv.height);x.lineTo(x1*cv.width,y1*cv.height);x.stroke();}
function showLaser(x,y){var st=$('ssStage'),d=$('ssLaser');d.style.left=(x*st.clientWidth)+'px';d.style.top=(y*st.clientHeight)+'px';d.style.display='block';}
function hideLaser(){var d=$('ssLaser');if(d)d.style.display='none';}
function toggleLaser(){if(!isHost)return;laserOn=!laserOn;$('ssLaserBtn').classList.toggle('on',laserOn);if(!laserOn){hideLaser();hostBroadcast({t:'laser',on:false});}else{toast('移動滑鼠／手指即為雷射點');}}
function toggleSlAnno(){if(!isHost)return;slAnnoOn=!slAnnoOn;$('ssAnnoBtn').classList.toggle('on',slAnnoOn);$('ssAnno').style.pointerEvents=slAnnoOn?'auto':'none';if(slAnnoOn)toast('在投影片上直接畫，全班同步');}
function clearSlAnno(){var cv=$('ssAnno');cv.getContext('2d').clearRect(0,0,cv.width,cv.height);if(isHost)hostBroadcast({t:'slclear'});}
function buildSlideCard(p){
  var card=document.createElement('div');card.className='slide-card'+(p.cardColor?' lightcard':'');if(p.cardColor)card.style.background=p.cardColor;
  var h=document.createElement('div');h.className='card-h';
  var av=document.createElement('div');av.className='av';av.style.background=avColor(p.name||'?');av.textContent=initial(p.name);
  var who=document.createElement('div');who.className='who';who.innerHTML='<b>'+esc(p.name||'?')+'</b><time>'+esc(p.ts||'')+'</time>';
  h.appendChild(av);h.appendChild(who);card.appendChild(h);
  if(p.subject){var ti=document.createElement('div');ti.className='card-title';ti.textContent=filterProfanity(p.subject);card.appendChild(ti);}
  if(p.text){var tx=document.createElement('div');tx.className='txt';tx.innerHTML=mentionify(linkify(filterProfanity(p.text)));card.appendChild(tx);}
  if(p.type==='image'&&p.dataUrl){var iw=document.createElement('div');iw.className='imgwrap';var im=document.createElement('img');im.className='shot';im.src=p.dataUrl;im.onclick=function(){openLightbox(p.dataUrl);};iw.appendChild(im);card.appendChild(iw);}
  if(p.type==='video'&&p.dataUrl){var vd=document.createElement('video');vd.className='shot vid';vd.src=p.dataUrl;vd.controls=true;vd.playsInline=true;vd.preload='metadata';card.appendChild(vd);
    if(p.fname){var vn=document.createElement('div');vn.className='medianame';vn.textContent='🎬 '+p.fname;card.appendChild(vn);}}
  if(p.type==='audio'&&p.dataUrl){if(p.fname){var an=document.createElement('div');an.className='medianame';an.textContent='🎵 '+p.fname;card.appendChild(an);}
    var au=document.createElement('audio');au.className='aud';au.src=p.dataUrl;au.controls=true;au.preload='metadata';card.appendChild(au);}
  if(p.type==='file'&&p.dataUrl){if(p.thumb){var th=document.createElement('img');th.className='filethumb';th.src=p.thumb;th.title='開啟檔案';th.onclick=function(){openFile(p);};card.appendChild(th);}card.appendChild(fileCard(p));}
  if(p.type==='file'&&!p.dataUrl){card.appendChild(lockedFileCard(p));}
  if(p.anno){var al=document.createElement('img');al.className='annolayer';al.src=p.anno;card.appendChild(al);}
  return card;}
$('subjIn').addEventListener('input',updateSendBtn);
$('subjIn').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();$('msg').focus();}});
function autoGrow(){var t=$('msg');t.style.height='auto';t.style.height=Math.min(t.scrollHeight,120)+'px';}
$('msg').addEventListener('input',function(){autoGrow();updateSendBtn();});
$('msg').addEventListener('keydown',function(e){if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)){e.preventDefault();sendPost();}});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&$('postModal').classList.contains('show'))closePost();});
$('codeIn').addEventListener('keydown',function(e){if(e.key==='Enter')joinRoom();});
updateSendBtn();
buildBgPick();
try{fillNet();}catch(e){}
(function(){var a=$('annoTextIn');if(a){a.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();caCommitText();}else if(e.key==='Escape'){a.style.display='none';}});a.addEventListener('blur',function(){caCommitText();});}})();
checkRestore();
(function(){try{var m=(location.search||'').match(/[?&]room=([^&]+)/);if(m){var c=decodeURIComponent(m[1]).toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);var ci=$('codeIn');if(ci&&c){ci.value=c;showStatus('已帶入房號 '+c+'，輸入暱稱後按加入');}}}catch(e){}})();
window.onerror=function(m){showStatus('發生錯誤：'+m,true);};

/* ===== 理解度紅綠燈 + 螢幕／鏡頭分享 ===== */



