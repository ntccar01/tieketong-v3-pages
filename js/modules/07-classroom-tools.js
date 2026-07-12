/* ===================== UI plumbing ===================== */
/* ===================== 🎰 抽座號／隨機點名 ===================== */
var _rollMode='seat',_rollMax=30,_rollNoRepeat=true,_rollUsedSeat={},_rollUsedName={},_rollSpinning=false;
function openRoll(){if(!guardFeature('roll'))return;renderRollHost();$('rollModal').classList.add('show');}
function setRollMode(m){_rollMode=m;renderRollHost();}
function resetRollUsed(){if(_rollMode==='seat')_rollUsedSeat={};else _rollUsedName={};renderRollHost();}
function renderRollHost(){var b=$('rollBody');if(!b)return;var usedMap=_rollMode==='seat'?_rollUsedSeat:_rollUsedName;var used=Object.keys(usedMap);
  var h='<div class="roll-modes"><button class="rollmode'+(_rollMode==='seat'?' on':'')+'" onclick="setRollMode(\'seat\')">🔢 抽座號</button><button class="rollmode'+(_rollMode==='name'?' on':'')+'" onclick="setRollMode(\'name\')">🙋 隨機點名</button></div>';
  if(_rollMode==='seat')h+='<div class="tm-custom" style="margin-top:12px">座號 1 ～ <input id="rollMax" type="number" min="1" max="200" value="'+_rollMax+'" class="fld" style="width:90px"></div>';
  else h+='<div class="ms-hint" style="margin-top:12px">從目前在線的學生中隨機點名（不含老師）。</div>';
  h+='<label class="tm-autolock"><input type="checkbox" id="rollNoRepeat" '+(_rollNoRepeat?'checked':'')+'> 不重複（抽過的這輪不再抽）</label>';
  h+='<button class="btn btn-gold" style="margin-top:12px" onclick="startRoll()">🎰 開始抽</button>';
  if(used.length)h+='<div class="ms-hint" style="margin-top:12px">本輪已抽（'+used.length+'）：'+used.map(function(x){return esc(x)+(_rollMode==='seat'?' 號':'');}).join('、')+'</div><button class="btn btn-ghost" onclick="resetRollUsed()">重置已抽</button>';
  b.innerHTML=h;}
function startRoll(){if(_rollSpinning)return;_rollNoRepeat=!!($('rollNoRepeat')&&$('rollNoRepeat').checked);
  var items=[],usedMap;
  if(_rollMode==='seat'){_rollMax=Math.max(1,Math.min(200,parseInt(($('rollMax')&&$('rollMax').value)||'30',10)||30));for(var i=1;i<=_rollMax;i++)items.push(String(i));usedMap=_rollUsedSeat;}
  else{for(var k in members){if(k!==myId&&members[k]&&members[k].name)items.push(members[k].name);}usedMap=_rollUsedName;if(!items.length){toast('目前沒有其他學生可點名');return;}}
  var pool=_rollNoRepeat?items.filter(function(x){return !usedMap[x];}):items.slice();
  if(!pool.length){if(_rollMode==='seat'){_rollUsedSeat={};usedMap=_rollUsedSeat;}else{_rollUsedName={};usedMap=_rollUsedName;}pool=items.slice();toast('都抽完了，已重置本輪');}
  var winner=pool[Math.floor(Math.random()*pool.length)];if(_rollNoRepeat)usedMap[winner]=1;
  var dur=2800;$('rollModal').classList.remove('show');
  hostBroadcast({t:'rollstart',items:items,winner:winner,mode:_rollMode,dur:dur});
  playRoll(items,winner,_rollMode,dur);renderRollHost();}
function playRoll(items,winner,mode,dur){if(!items||!items.length)return;_rollSpinning=true;
  var stage=$('rollStage');$('rsLabel').textContent=(mode==='name'?'🙋 隨機點名':'🔢 抽座號');
  $('rsResult').textContent='';$('rsClose').style.display='none';
  var win=document.querySelector('.rs-window');if(win)win.classList.remove('locked');
  var numEl=$('rsNum');numEl.classList.toggle('small',mode==='name');
  stage.style.display='flex';
  var i=Math.floor(Math.random()*items.length),t0=Date.now();
  function step(){numEl.textContent=items[i];numEl.classList.remove('flip');void numEl.offsetWidth;numEl.classList.add('flip');
    i=(i+1)%items.length;var elapsed=Date.now()-t0;
    if(elapsed>=dur){numEl.textContent=winner;var w=document.querySelector('.rs-window');if(w)w.classList.add('locked');
      $('rsResult').textContent='🎉 抽中：'+winner+(mode==='seat'?' 號':'');$('rsClose').style.display='inline-block';_rollSpinning=false;try{if(typeof beep==='function')beep();}catch(e){}return;}
    var p=elapsed/dur,delay=40+p*p*360;setTimeout(step,delay);}
  step();}
function rollOff(){$('rollStage').style.display='none';_rollSpinning=false;if(isHost)hostBroadcast({t:'rolloff'});}
/* ===================== 📋 教材庫（預備貼文） ===================== */
var materials=[],_matEdit=null,_matColor='';
function loadMaterials(){try{var r=localStorage.getItem('shr_mat_lib');materials=r?JSON.parse(r):[];}catch(e){materials=[];}if(!Array.isArray(materials))materials=[];}
function saveMaterials(){try{localStorage.setItem('shr_mat_lib',JSON.stringify(materials));}catch(e){}}
function matFind(id){for(var i=0;i<materials.length;i++)if(materials[i].id===id)return materials[i];return null;}
function materialPayload(){return {app:'shr-materials',v:1,ts:Date.now(),materials:cloneSnapValue(materials||[])};}
function downloadBlobFile(name,blob){if(typeof dl==='function'){dl(name,blob);return;}var u=URL.createObjectURL(blob);var a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u);},2000);}
function exportMaterials(){if(!materials.length){toast('教材庫目前沒有內容');return;}var data=materialPayload();downloadBlobFile('貼課通教材庫_'+new Date().toISOString().slice(0,10)+'.json',new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));toast('已匯出教材庫（'+materials.length+' 則）');}
function ensureMatImportInput(){var inp=$('matImportFile');if(inp)return inp;inp=document.createElement('input');inp.type='file';inp.id='matImportFile';inp.accept='application/json,.json';inp.style.display='none';inp.onchange=function(){var f=inp.files&&inp.files[0];if(f)importMaterialsFile(f);inp.value='';};document.body.appendChild(inp);return inp;}
function importMaterialsFile(file){var rd=new FileReader();rd.onload=function(ev){var data;try{data=JSON.parse(ev.target.result);}catch(e){toast('教材庫檔案格式錯誤');return;}
  var list=(data&&data.app==='shr-materials'&&Array.isArray(data.materials))?data.materials:(Array.isArray(data)?data:null);
  if(!list){toast('這不是有效的教材庫檔案');return;}
  var added=0,skipped=0;list.forEach(function(m){var subj=(m&&m.subject||'').trim(),text=(m&&m.text||'').trim(),color=m&&m.color||'';if(!subj&&!text){skipped++;return;}
    var dup=materials.some(function(x){return (x.subject||'')===subj&&(x.text||'')===text&&(x.color||'')===color;});
    if(dup){skipped++;return;}materials.push({id:uid(),subject:subj,text:text,color:color});added++;});
  saveMaterials();renderMaterials();toast('已匯入教材 '+added+' 則'+(skipped?('，略過 '+skipped+' 則'):''));};rd.readAsText(file);}
function openMaterials(){if(!guardFeature('materials'))return;renderMaterials();$('materialModal').classList.add('show');}
function renderMaterials(){var b=$('matBody');if(!b)return;var inRoom=isHost&&roomCodeStr;
  var h='<div class="ms-hint" style="margin-bottom:8px">'+(inRoom?'課前準備好的貼文，按「▶ 推出」即可發布到牆面（可重複推出）。':'課前可先準備貼文／題目，也可匯出教材庫帶到另一台電腦；建立教室後（房主）即可一鍵推出。')+'</div>';
  h+='<div class="mat-add"><input id="matSubj" maxlength="40" placeholder="主題（選填）"><textarea id="matText" rows="3" placeholder="內容／題目…"></textarea>';
  h+='<div class="mat-colors" id="matColors"></div>';
  h+='<button class="btn btn-gold" onclick="saveMaterial()">'+(_matEdit?'更新教材':'＋ 加入教材庫')+'</button>'+(_matEdit?'<button class="btn btn-ghost" style="margin-top:6px" onclick="cancelMatEdit()">取消編輯</button>':'')+'</div>';
  h+='<div class="mat-actions" style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0"><button class="btn btn-ghost" onclick="exportMaterials()">⤓ 匯出教材庫</button><button class="btn btn-ghost" onclick="ensureMatImportInput().click()">📥 匯入教材庫</button></div>';
  h+='<div class="mat-list">';
  if(!materials.length)h+='<div class="mat-empty">教材庫是空的，先在上方新增。</div>';
  else materials.forEach(function(m){var snip=esc((m.subject?('【'+m.subject+'】'):'')+(m.text||'')).slice(0,80);
    h+='<div class="mat-item"'+(m.color?(' style="border-left:4px solid '+m.color+'"'):'')+'><div class="mi-txt">'+snip+'</div><div class="mi-btns">'+
      '<button class="mi-push" onclick="pushMaterial(\''+m.id+'\')"'+(inRoom?'':' disabled')+'>▶ 推出</button>'+
      '<button class="mi-edit" onclick="editMaterial(\''+m.id+'\')">✎</button>'+
      '<button class="mi-del" onclick="deleteMaterial(\''+m.id+'\')">✕</button></div></div>';});
  h+='</div>';b.innerHTML=h;
  var cw=$('matColors');if(cw){cw.innerHTML='';CARD_COLORS.forEach(function(cc){var d=document.createElement('div');d.className='cc-sw'+(cc.c===_matColor?' active':'');d.style.background=cc.c||'linear-gradient(135deg,#fdfbf5,#e7dcc2)';d.title=cc.n;
    d.onclick=function(){_matColor=cc.c;var all=cw.querySelectorAll('.cc-sw');for(var j=0;j<all.length;j++)all[j].classList.remove('active');d.classList.add('active');};cw.appendChild(d);});}
  if(_matEdit){var m=matFind(_matEdit);if(m){$('matSubj').value=m.subject||'';$('matText').value=m.text||'';}}}
function saveMaterial(){var subj=($('matSubj').value||'').trim();var text=($('matText').value||'').trim();
  if(!subj&&!text){toast('請輸入主題或內容');return;}
  if(_matEdit){var m=matFind(_matEdit);if(m){m.subject=subj;m.text=text;m.color=_matColor;}_matEdit=null;}
  else{materials.push({id:uid(),subject:subj,text:text,color:_matColor});}
  _matColor='';saveMaterials();renderMaterials();toast('已儲存到教材庫');}
function cancelMatEdit(){_matEdit=null;_matColor='';renderMaterials();}
function editMaterial(id){_matEdit=id;var m=matFind(id);_matColor=m?(m.color||''):'';renderMaterials();}
function deleteMaterial(id){if(!confirm('刪除這則教材？'))return;var a=[];for(var i=0;i<materials.length;i++)if(materials[i].id!==id)a.push(materials[i]);materials=a;if(_matEdit===id)_matEdit=null;saveMaterials();renderMaterials();}
function pushMaterial(id){if(!(isHost&&roomCodeStr)){toast('進入教室後（房主）才能推出');return;}var m=matFind(id);if(!m)return;
  var post={id:uid(),uid:myId,name:myName,ts:nowHM(),type:'text',text:m.text||''};
  if(m.subject)post.subject=m.subject;if(m.color)post.cardColor=m.color;
  feed.push(post);addPostEl(post);hostBroadcast({t:'post',post:sanitizePost(post)});saveSession();toast('已推出到牆面');}
/* ===================== 📁 專案庫（具名多專案，存／開整面牆） ===================== */
function loadProjIndex(cb){idbGet('projIndex',function(v){cb(Array.isArray(v)?v:[]);});}
function saveProjIndex(idx){idbSet('projIndex',idx);}
function cloneSnapValue(v){try{return JSON.parse(JSON.stringify(v));}catch(e){return v;}}
function snapNow(){var snap={app:'shr',v:2,ts:Date.now(),code:roomCodeStr,isHost:isHost,myId:myId,myName:myName,roomName:roomName,bg:selBg,allowOpen:allowOpen,roomPass:roomPass,maxMembers:maxMembers,maxPosts:maxPosts,announce:roomAnnounce,frozen:frozen,kanbanOn:kanbanOn,columns:cloneSnapValue(columns||[]),members:cloneSnapValue(members||{}),feed:cloneSnapValue(feed||[]),roomStartTs:roomStartTs};
  if(typeof activePoll!=='undefined'&&activePoll)snap.poll=cloneSnapValue(activePoll);
  if(typeof questions!=='undefined')snap.questions=cloneSnapValue(questions||[]);
  if(typeof activeCloud!=='undefined'&&activeCloud)snap.cloud=cloneSnapValue(activeCloud);
  if(typeof pulse!=='undefined')snap.pulse=cloneSnapValue(pulse||{});
  if(typeof pulseAgg!=='undefined')snap.pulseAgg=cloneSnapValue(pulseAgg||{g:0,y:0,r:0,total:0});
  if(typeof _buzzOpen!=='undefined')snap.buzz={open:!!_buzzOpen,list:cloneSnapValue(buzzList||[])};
  if(typeof exitActive!=='undefined'&&exitActive)snap.exit=cloneSnapValue(exitActive);
  return snap;}
function openProjects(){if(!guardFeature('projects'))return;renderProjects();$('projModal').classList.add('show');}
function renderProjects(){var b=$('projBody');if(!b)return;var h='';
  h+='<div class="ms-hint" style="margin-bottom:8px">把整面牆（貼文＋設定）存成具名專案，之後可隨時開啟（會以原房號重新主持）。可匯出 .json 在不同電腦間搬移。</div>';
  if(roomCodeStr&&isHost)h+='<button class="btn btn-gold" onclick="saveProject()">💾 儲存目前牆面為專案</button>';
  else h+='<div class="ms-hint">（進入教室後，房主可在這裡儲存目前牆面）</div>';
  h+='<div class="proj-list" id="projList"><div class="mat-empty">載入中…</div></div>';
  h+='<button class="btn btn-ghost" onclick="$(\'projImport\').click()">📥 從檔案匯入專案（.json）</button>';
  b.innerHTML=h;
  loadProjIndex(function(idx){var l=$('projList');if(!l)return;if(!idx.length){l.innerHTML='<div class="mat-empty">還沒有任何專案，先在教室裡「儲存目前牆面」。</div>';return;}
    l.innerHTML='';idx.forEach(function(e){var when=new Date(e.ts);var ds=(when.getMonth()+1)+'/'+when.getDate()+' '+('0'+when.getHours()).slice(-2)+':'+('0'+when.getMinutes()).slice(-2);
      var d=document.createElement('div');d.className='proj-item';
      var info=document.createElement('div');info.className='pi-info';info.innerHTML='<div class="pi-name">'+esc(e.name)+'</div><div class="pi-sub">'+(e.count||0)+' 則 · '+ds+(e.code?(' · 房號 '+esc(e.code)):'')+'</div>';
      var btns=document.createElement('div');btns.className='pi-btns';
      var op=document.createElement('button');op.className='mi-push';op.textContent='▶ 開啟';op.onclick=function(){openProject(e.id);};
      var rn=document.createElement('button');rn.className='mi-edit';rn.textContent='改名';rn.onclick=function(){renameProject(e.id);};
      var ex=document.createElement('button');ex.className='mi-edit';ex.textContent='匯出';ex.onclick=function(){exportProject(e.id);};
      var dl=document.createElement('button');dl.className='mi-del';dl.textContent='✕';dl.onclick=function(){deleteProject(e.id);};
      btns.appendChild(op);btns.appendChild(rn);btns.appendChild(ex);btns.appendChild(dl);d.appendChild(info);d.appendChild(btns);l.appendChild(d);});});}
function saveProject(){if(!roomCodeStr||!isHost){toast('進入教室後（房主）才能儲存');return;}
  var name=prompt('專案名稱：',roomName||('課堂 '+new Date().toLocaleDateString()));if(name===null)return;name=(name||'').trim()||('課堂 '+new Date().toLocaleString());
  var id=uid();var snap=snapNow();snap.projName=name;idbSet('proj:'+id,snap);
  loadProjIndex(function(idx){idx.unshift({id:id,name:name,ts:snap.ts,count:(snap.feed||[]).length,code:snap.code,roomName:roomName});saveProjIndex(idx);renderProjects();toast('已儲存專案：'+name);});}
function openProject(id){idbGet('proj:'+id,function(s){if(!s){toast('找不到專案資料');return;}$('projModal').classList.remove('show');try{cleanup();}catch(e){}restoreFrom(s,true);});}
function renameProject(id){var nm=prompt('新名稱：');if(nm===null)return;nm=(nm||'').trim();if(!nm)return;
  loadProjIndex(function(idx){for(var i=0;i<idx.length;i++)if(idx[i].id===id)idx[i].name=nm;saveProjIndex(idx);idbGet('proj:'+id,function(s){if(s){s.projName=nm;idbSet('proj:'+id,s);}renderProjects();});});}
function deleteProject(id){if(!confirm('刪除這個專案？'))return;idbDel('proj:'+id);loadProjIndex(function(idx){idx=idx.filter(function(e){return e.id!==id;});saveProjIndex(idx);renderProjects();});}
function exportProject(id){idbGet('proj:'+id,function(s){if(!s)return;try{var blob=new Blob([JSON.stringify(s)],{type:'application/json'});var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='貼課通專案_'+(s.projName||s.roomName||'課堂')+'.json';a.click();setTimeout(function(){URL.revokeObjectURL(a.href);},1000);}catch(e){toast('匯出失敗');}});}
function importProjectFile(file){var rd=new FileReader();rd.onload=function(ev){var s;try{s=JSON.parse(ev.target.result);}catch(e){toast('檔案格式錯誤');return;}
  if(!s||!s.feed){toast('不是有效的專案檔');return;}var id=uid();var name=s.projName||s.roomName||'匯入專案';s.projName=name;idbSet('proj:'+id,s);
  loadProjIndex(function(idx){idx.unshift({id:id,name:name,ts:Date.now(),count:(s.feed||[]).length,code:s.code,roomName:s.roomName});saveProjIndex(idx);renderProjects();toast('已匯入專案：'+name);});};rd.readAsText(file);}
/* ===================== ⏺️ 錄製操作示範（含鏡頭／語音旁白） ===================== */
var _recRecorder=null,_recChunks=[],_recStream=null,_recTimer=null,_recMax=null,_recStart=0,_recording=false;
var _recScreen=null,_recUser=null,_recCanvasStream=null,_recAudioCtx=null,_recRAF=null;
function startRecord(){if(!guardFeature('record'))return;if(_recording){toast('正在錄製中…');return;}$('recModal').classList.add('show');}
function beginRecord(){var useMic=$('recMic')&&$('recMic').checked,useCam=$('recCam')&&$('recCam').checked;$('recModal').classList.remove('show');
  if(!navigator.mediaDevices||!navigator.mediaDevices.getDisplayMedia||typeof MediaRecorder==='undefined'){toast('此環境不支援錄製（需 https／localhost）');return;}
  navigator.mediaDevices.getDisplayMedia({video:{frameRate:{ideal:10},width:{ideal:1280},height:{ideal:720}},audio:true}).then(function(screen){_recScreen=screen;
    var need=useMic||useCam;
    var up=need?navigator.mediaDevices.getUserMedia({audio:!!useMic,video:useCam?{width:{ideal:320},height:{ideal:240}}:false}).catch(function(){toast('無法存取麥克風／鏡頭，改為僅錄螢幕');return null;}):Promise.resolve(null);
    up.then(function(user){assembleRecord(screen,user,useMic,useCam);});
  }).catch(function(e){cleanupRecStreams();toast('未開始錄製：'+((e&&e.name)||'已取消'));});}
function assembleRecord(screen,user,useMic,useCam){_recUser=user;var audioTracks=[];
  try{var AC=window.AudioContext||window.webkitAudioContext;var ac=new AC();_recAudioCtx=ac;var dest=ac.createMediaStreamDestination();var any=false;
    if(screen.getAudioTracks().length){ac.createMediaStreamSource(screen).connect(dest);any=true;}
    if(useMic&&user&&user.getAudioTracks().length){ac.createMediaStreamSource(new MediaStream(user.getAudioTracks())).connect(dest);any=true;}
    if(any)audioTracks=dest.stream.getAudioTracks();}catch(e){audioTracks=screen.getAudioTracks();}
  var videoTrack;
  if(useCam&&user&&user.getVideoTracks().length){
    var sv=document.createElement('video');sv.muted=true;sv.playsInline=true;sv.srcObject=screen;sv.play();
    var cv=document.createElement('video');cv.muted=true;cv.playsInline=true;cv.srcObject=new MediaStream(user.getVideoTracks());cv.play();
    var canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;var ctx=canvas.getContext('2d');
    var draw=function(){try{ctx.fillStyle='#0b0d13';ctx.fillRect(0,0,1280,720);
        if(sv.videoWidth){var sr=Math.min(1280/sv.videoWidth,720/sv.videoHeight),sw=sv.videoWidth*sr,sh=sv.videoHeight*sr;ctx.drawImage(sv,(1280-sw)/2,(720-sh)/2,sw,sh);}
        if(cv.videoWidth){var cw=300,ch=cw*(cv.videoHeight/cv.videoWidth||0.75),x=1280-cw-24,y=720-ch-24;ctx.save();ctx.fillStyle='#000';ctx.fillRect(x-3,y-3,cw+6,ch+6);ctx.drawImage(cv,x,y,cw,ch);ctx.strokeStyle='#d4af37';ctx.lineWidth=4;ctx.strokeRect(x,y,cw,ch);ctx.restore();}
      }catch(e){}_recRAF=requestAnimationFrame(draw);};draw();
    _recCanvasStream=canvas.captureStream(10);videoTrack=_recCanvasStream.getVideoTracks()[0];
  }else{videoTrack=screen.getVideoTracks()[0];}
  var fin=new MediaStream();fin.addTrack(videoTrack);audioTracks.forEach(function(t){fin.addTrack(t);});_recStream=fin;_recChunks=[];
  var mime=(MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus'))?'video/webm;codecs=vp8,opus':((MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported('video/webm'))?'video/webm':'');
  try{_recRecorder=mime?new MediaRecorder(fin,{mimeType:mime,videoBitsPerSecond:useCam?1100000:900000}):new MediaRecorder(fin);}catch(e){_recRecorder=new MediaRecorder(fin);}
  _recRecorder.ondataavailable=function(e){if(e.data&&e.data.size)_recChunks.push(e.data);};
  _recRecorder.onstop=function(){finishRecord();};
  var svt=screen.getVideoTracks()[0];if(svt)svt.onended=function(){stopRecord();};
  _recRecorder.start();_recStart=Date.now();_recording=true;
  $('recBar').style.display='flex';updateRecBar();_recTimer=setInterval(updateRecBar,250);
  _recMax=setTimeout(function(){toast('已達錄製上限（90 秒）');stopRecord();},90000);
  toast('開始錄製（'+(useCam?'螢幕＋鏡頭＋語音':(useMic?'螢幕＋語音':'螢幕'))+'），完成後按「停止並發布」');}
function updateRecBar(){var s=Math.floor((Date.now()-_recStart)/1000);var el=$('recTime');if(el)el.textContent=('0'+Math.floor(s/60)).slice(-2)+':'+('0'+(s%60)).slice(-2);}
function cleanupRecStreams(){if(_recRAF){cancelAnimationFrame(_recRAF);_recRAF=null;}
  [_recScreen,_recUser,_recCanvasStream,_recStream].forEach(function(st){if(st){st.getTracks().forEach(function(t){try{t.stop();}catch(e){}});}});
  if(_recAudioCtx){try{_recAudioCtx.close();}catch(e){}_recAudioCtx=null;}_recScreen=_recUser=_recCanvasStream=null;}
function stopRecord(){if(!_recording)return;_recording=false;clearTimeout(_recMax);clearInterval(_recTimer);var rb=$('recBar');if(rb)rb.style.display='none';
  try{if(_recRecorder&&_recRecorder.state!=='inactive')_recRecorder.stop();}catch(e){}setTimeout(cleanupRecStreams,200);}
function finishRecord(){var blob=new Blob(_recChunks,{type:'video/webm'});_recChunks=[];
  if(!blob.size){toast('錄製內容為空');return;}var mb=blob.size/1048576;if(mb>20){toast('錄製檔太大（'+mb.toFixed(1)+'MB），請錄短一點');return;}
  toast('處理錄製中…');var fr=new FileReader();fr.onload=function(){publishScreencast(fr.result,blob.size);};fr.onerror=function(){toast('錄製處理失敗');};fr.readAsDataURL(blob);}
function publishScreencast(dataUrl,size){var post={id:uid(),uid:myId,name:myName,ts:nowHM(),type:'video',dataUrl:dataUrl,fname:'老師操作示範.webm',fsize:size,mime:'video/webm',subject:'📹 老師操作示範',pinned:true};
  feed.push(post);addPostEl(post);hostBroadcast({t:'post',post:sanitizePost(post)});saveSession();toast('操作示範已發布給全班，可重複播放');}
/* ===================== 🔔 搶答鈴 ===================== */
var _buzzOpen=false,buzzList=[],_myBuzzed=false;
function openBuzz(){if(!isHost)return;renderBuzz();$('buzzModal').classList.add('show');}
function renderBuzz(){var b=$('buzzBody');if(!b)return;
  if(!_buzzOpen){b.innerHTML='<div class="ms-hint" style="margin-bottom:12px">按下開始後，學生畫面會出現大大的「搶答」按鈕，依按下順序排名。</div><button class="btn btn-gold" onclick="startBuzz()">🔔 開始搶答</button>';return;}
  var h='<div class="ms-hint" style="margin-bottom:6px">搶答進行中…（共 '+buzzList.length+' 人）</div><div class="buzz-rank">';
  if(!buzzList.length)h+='<div class="buzz-empty">尚無人搶答</div>';
  else buzzList.forEach(function(x,i){var medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1+'');h+='<div class="buzz-item'+(i<3?' top':'')+'"><div class="bi-rank">'+medal+'</div><div class="bi-name">'+esc(x.name)+'</div></div>';});
  h+='</div><div style="display:flex;gap:8px;margin-top:14px"><button class="btn btn-gold" style="flex:1" onclick="resetBuzz()">🔄 重新開始</button><button class="btn btn-ghost" style="flex:1;margin-top:0" onclick="stopBuzz()">■ 結束</button></div>';
  b.innerHTML=h;}
function startBuzz(){_buzzOpen=true;buzzList=[];hostBroadcast({t:'buzzstart'});renderBuzz();saveSession();}
function resetBuzz(){buzzList=[];hostBroadcast({t:'buzzreset'});renderBuzz();saveSession();}
function stopBuzz(){_buzzOpen=false;hostBroadcast({t:'buzzstop'});renderBuzz();saveSession();}
function hostBuzzIn(uid,name){if(!_buzzOpen)return;for(var i=0;i<buzzList.length;i++)if(buzzList[i].uid===uid)return;buzzList.push({uid:uid,name:name});hostBroadcast({t:'buzzrank',list:buzzList});renderBuzz();saveSession();}
function guestBuzz(){if(_myBuzzed)return;_myBuzzed=true;var bt=$('bgBtn');if(bt)bt.disabled=true;if(hostConn&&hostConn.open)tSend(hostConn,{t:'buzz',uid:myId,name:myName});$('bgResult').textContent='已搶答，等待結果…';}
function showBuzzGuest(){if(isHost)return;_myBuzzed=false;var bt=$('bgBtn');if(bt)bt.disabled=false;$('bgResult').textContent='';$('bgRank').textContent='';$('buzzGuest').style.display='flex';}
function hideBuzzGuest(){$('buzzGuest').style.display='none';}
function guestBuzzRank(list){buzzList=list||[];var idx=-1;for(var i=0;i<buzzList.length;i++)if(buzzList[i].uid===myId){idx=i;break;}
  if(idx>=0){$('bgResult').textContent='你是第 '+(idx+1)+' 位！'+(idx===0?' 🥇':idx===1?' 🥈':idx===2?' 🥉':'');var bt=$('bgBtn');if(bt)bt.disabled=true;_myBuzzed=true;}
  var top=buzzList.slice(0,5).map(function(x,i){return (i+1)+'. '+x.name;}).join('　');$('bgRank').textContent=top?('目前順序：'+top):'';}
/* ===================== 🎟️ 退場券 ===================== */
var exitActive=null,_exitQ='';
function openExit(){if(!isHost)return;renderExitHost();$('exitModal').classList.add('show');}
function exitAnswers(){return (exitActive&&Array.isArray(exitActive.answers))?exitActive.answers:[];}
function exitResultText(){if(!exitActive)return '';var lines=['退場券','題目：'+(exitActive.q||''),'狀態：'+(exitActive.open?'收集中':'已結束'),'份數：'+exitAnswers().length,''];
  exitAnswers().forEach(function(a,i){lines.push((i+1)+'. '+(a.name||'學生'));lines.push(filterProfanity(a.text||''));lines.push('');});return lines.join('\n').trim();}
function renderExitHost(){var b=$('exitBody');if(!b)return;
  if(!exitActive){b.innerHTML='<div class="ms-hint" style="margin-bottom:10px">下課前收集每位學生的回饋／心得。輸入題目後開始：</div>'
    +'<div class="poll-ansinput"><input id="exitQIn" maxlength="120" placeholder="例如：今天學到什麼？還有什麼疑問？"></div>'
    +'<button class="btn btn-gold" onclick="startExit()">開始收集</button>';return;}
  var answers=exitAnswers(),open=exitActive.open!==false;
  var h='<div class="exit-panel"><div class="exit-meta"><span class="exit-status '+(open?'on':'off')+'">'+(open?'收集中':'已結束')+'</span><span>已收到 <b>'+answers.length+'</b> 份</span></div>'
    +'<div class="exit-question">'+esc(exitActive.q||'退場券')+'</div></div><div class="exit-list">';
  if(!answers.length)h+='<div class="exit-empty">還沒有人填寫</div>';
  else answers.forEach(function(a,i){h+='<div class="exit-item"><div class="ei-name">'+(i+1)+'. '+esc(a.name||'學生')+'</div><div class="ei-text">'+esc(filterProfanity(a.text||''))+'</div></div>';});
  h+='</div><div class="exit-actions">';
  h+=open?'<button class="btn btn-ghost" data-exit-action="stop" onclick="stopExit()">■ 結束收集</button>':'<button class="btn btn-gold" data-exit-action="restart" onclick="restartExit()">重新開始</button>';
  h+='<button class="btn btn-ghost" data-exit-action="copy" onclick="copyExitResults()" '+(!answers.length?'disabled':'')+'>複製結果</button>';
  h+='<button class="btn btn-ghost" data-exit-action="download" onclick="downloadExitResults()" '+(!answers.length?'disabled':'')+'>下載結果</button>';
  h+='<button class="btn btn-ghost danger" data-exit-action="clear" onclick="clearExitResults()" '+(!answers.length?'disabled':'')+'>清除本次結果</button>';
  h+='</div>';
  b.innerHTML=h;}
function startExit(){var q=($('exitQIn')&&$('exitQIn').value||'').trim()||'今天學到什麼？還有什麼疑問？';exitActive={q:q,open:true,answers:[]};hostBroadcast({t:'exitstart',q:q});renderExitHost();saveSession();}
function stopExit(){hostBroadcast({t:'exitstop'});if(exitActive)exitActive.open=false;renderExitHost();saveSession();}
function restartExit(){if(!exitActive)return;exitActive={q:exitActive.q||'退場券',open:true,answers:[]};hostBroadcast({t:'exitstart',q:exitActive.q});renderExitHost();saveSession();toast('退場券已重新開始');}
function clearExitResults(){if(!exitActive||!exitAnswers().length)return;if(!confirm('清除本次退場券結果？'))return;exitActive.answers=[];exitActive.open=false;hostBroadcast({t:'exitstop'});renderExitHost();saveSession();toast('已清除本次結果');}
function copyExitResults(){var txt=exitResultText();if(!txt){toast('目前沒有結果可複製');return;}if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(function(){toast('已複製退場券結果');}).catch(function(){copyExitResultsFallback(txt);});return;}copyExitResultsFallback(txt);}
function copyExitResultsFallback(txt){var ta=document.createElement('textarea');ta.value=txt;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.focus();ta.select();try{document.execCommand('copy');toast('已複製退場券結果');}catch(e){toast('複製失敗，請改用下載結果');}ta.remove();}
function downloadExitResults(){var txt=exitResultText();if(!txt){toast('目前沒有結果可下載');return;}var name='退場券_'+(typeof safeName==='function'?safeName(roomName):'課堂')+'_'+new Date().toISOString().slice(0,10)+'.txt';downloadBlobFile(name,new Blob(['\ufeff'+txt],{type:'text/plain;charset=utf-8'}));toast('已下載退場券結果');}
function hostExitAns(uid,name,text){if(!exitActive||exitActive.open===false)return;for(var i=0;i<exitActive.answers.length;i++){if(exitActive.answers[i].uid===uid){exitActive.answers[i]={uid:uid,name:name,text:text};renderExitHost();saveSession();return;}}exitActive.answers.push({uid:uid,name:name,text:text});renderExitHost();saveSession();}
function showExitGuest(q){_exitQ=q;var b=$('exitBody');if(!b)return;
  b.innerHTML='<div class="ms-hint" style="margin-bottom:10px">'+esc(q)+'</div><textarea id="exitAnsIn" rows="4" style="width:100%" placeholder="寫下你的回饋…"></textarea><button class="btn btn-gold" style="margin-top:10px" onclick="submitExit()">送出退場券</button>';
  $('exitModal').classList.add('show');}
function submitExit(){var t=($('exitAnsIn')&&$('exitAnsIn').value||'').trim();if(!t){toast('請先寫一點內容');return;}
  if(hostConn&&hostConn.open)tSend(hostConn,{t:'exitans',uid:myId,name:myName,text:t});
  $('exitBody').innerHTML='<div class="exit-empty">✅ 已送出，謝謝你的回饋！</div>';setTimeout(function(){$('exitModal').classList.remove('show');},1200);}
/* ===================== 🚫 不雅字詞過濾 ===================== */
var PROFANITY=['幹你娘','幹妳娘','操你媽','他媽的','去你媽','靠北','靠盃','婊子','賤人','智障','白癡','白痴','低能','去死','王八蛋','機掰','雞掰','幹','fuck','shit','bitch','asshole','dick'];
function filterProfanity(t){if(!t)return t;var out=t;PROFANITY.forEach(function(w){if(/^[\x00-\x7f]+$/.test(w)){out=out.replace(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi'),'＊'.repeat(w.length));}else{out=out.split(w).join('＊'.repeat(w.length));}});return out;}
var _autoLockOnEnd=false;
/* ===================== 進階互動：提及/引用、輸入中、聚光燈、主題、匯出 ===================== */
function toggleTheme(){var d=document.body.classList.toggle('theme-dark');try{localStorage.setItem('shr_theme',d?'dark':'light');}catch(e){}updateThemeBtn();}
function updateThemeBtn(){var b=$('themeBtn');if(b)b.innerHTML=document.body.classList.contains('theme-dark')?'☀️ 主題':'🌙 主題';}
var _typingSet={},_myTyping=false,_typingStopT=null,_typingHideT=null;
function inRoomNow(){return $('room')&&$('room').classList.contains('show');}
function flagTyping(){if(!inRoomNow())return;if(!_myTyping){_myTyping=true;pushTyping(true);}clearTimeout(_typingStopT);_typingStopT=setTimeout(stopTyping,3000);}
function stopTyping(){clearTimeout(_typingStopT);if(_myTyping){_myTyping=false;pushTyping(false);}}
function pushTyping(on){if(isHost){hostSetTyping(myId,myName,on);}else if(hostConn&&hostConn.open){tSend(hostConn,{t:'typing',uid:myId,name:myName,on:on});}}
function hostSetTyping(uid,name,on){if(on)_typingSet[uid]=name;else delete _typingSet[uid];var list=[];for(var k in _typingSet)list.push({uid:k,name:_typingSet[k]});hostBroadcast({t:'typingagg',list:list});showTypingList(list);}
function showTypingList(list){var bar=$('typingBar');if(!bar)return;var others=(list||[]).filter(function(x){return x.uid!==myId;});
  if(!others.length){bar.style.display='none';return;}
  var names=others.map(function(x){return x.name;});var show=names.slice(0,3).join('、')+(names.length>3?(' 等 '+names.length+' 人'):'');
  bar.textContent='✏️ '+show+' 正在輸入…';bar.style.display='block';clearTimeout(_typingHideT);_typingHideT=setTimeout(function(){bar.style.display='none';},6000);}
function openMention(btn){var pop=$('mentionPop');var names=[];for(var k in members){if(members[k]&&members[k].name)names.push(members[k].name);}
  names=names.filter(function(n){return n!==myName;});
  if(!names.length){toast('目前沒有其他成員可提及');return;}
  pop.innerHTML='';names.forEach(function(n){var b=document.createElement('button');b.textContent='@'+n;b.onclick=function(){insertMention(n);pop.style.display='none';};pop.appendChild(b);});
  pop.style.display='block';if(btn){var r=btn.getBoundingClientRect();pop.style.top=Math.max(8,r.top-pop.offsetHeight-8)+'px';pop.style.left=Math.min(Math.max(8,r.left),window.innerWidth-pop.offsetWidth-8)+'px';}}
function insertMention(n){var el=$('msg');if(!el)return;var ins='@'+n+' ';var sx=el.selectionStart,ex=el.selectionEnd;if(typeof sx==='number'){el.value=el.value.slice(0,sx)+ins+el.value.slice(ex);var pos=sx+ins.length;try{el.focus();el.setSelectionRange(pos,pos);}catch(_){}}else{el.value+=ins;el.focus();}el.dispatchEvent(new Event('input',{bubbles:true}));}
function mentionify(html){return html.replace(/(^|[^\w@])@([^\s<#@&]{1,20})/g,function(m,pre,name){return pre+'<span class="mention">@'+name+'</span>';});}
var _quoteRef=null;
function quotePost(id){var p=findPost(id);if(!p)return;var snip=(p.subject||p.text||(p.type&&p.type!=='text'?'（'+p.type+' 貼文）':'')||'').replace(/\s+/g,' ').trim().slice(0,60);openPost();_quoteRef={name:p.name||'?',snippet:snip};renderQuoteChip();}
function renderQuoteChip(){var c=$('quoteChip');if(!c)return;if(_quoteRef){c.style.display='flex';c.innerHTML='<span>❝ 引用 <b>@'+esc(_quoteRef.name)+'</b>：'+esc(_quoteRef.snippet)+'</span><button onclick="clearQuote()">✕</button>';}else{c.style.display='none';c.innerHTML='';}}
function clearQuote(){_quoteRef=null;renderQuoteChip();}
function spotlightContentHTML(o){var h='';if(o.name)h+='<div class="sl-who">'+esc(o.name)+(o.ts?(' · '+esc(o.ts)):'')+'</div>';
  if(o.quote)h+='<div class="sl-quote">❝ @'+esc(o.quote.name||'')+'：'+esc(o.quote.snippet||'')+'</div>';
  if(o.subject)h+='<div class="sl-title">'+esc(filterProfanity(o.subject))+'</div>';
  if(o.text)h+='<div class="sl-text">'+mentionify(linkify(filterProfanity(o.text)))+'</div>';
  if(o.type==='image'&&o.dataUrl)h+='<img class="sl-img" src="'+o.dataUrl+'">';
  return h||'<div class="sl-text">（此貼文無文字內容）</div>';}
function spotlightPost(p){var o={name:p.name,ts:p.ts,subject:p.subject,text:p.text,type:p.type,dataUrl:(p.type==='image'?p.dataUrl:''),quote:p.quote};showSpotlight(o);if(isHost)hostBroadcast({t:'spotlight',post:o});}
function spotlightQA(q){var o={name:'匿名提問',subject:'❓ 提問',text:q.text};showSpotlight(o);if(isHost)hostBroadcast({t:'spotlight',post:o});}
function showSpotlight(o){$('slBody').innerHTML=spotlightContentHTML(o);$('slClose').style.display=isHost?'inline-block':'none';$('spotlight').style.display='flex';}
function hideSpotlight(){$('spotlight').style.display='none';}
function spotlightOff(){hideSpotlight();if(isHost)hostBroadcast({t:'spotlightoff'});}
var _h2cLib=false;
function loadH2C(cb){if(_h2cLib){cb(true);return;}var s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';s.onload=function(){_h2cLib=true;cb(true);};s.onerror=function(){cb(false);};document.head.appendChild(s);}
function exportWallImage(){var feed=$('feed');if(!feed||!feed.children.length){toast('牆面目前沒有內容');return;}toast('產生長圖中…');
  loadH2C(function(ok){if(!ok||typeof html2canvas==='undefined'){toast('需要連網才能匯出長圖');return;}
    var dark=document.body.classList.contains('theme-dark');
    html2canvas(feed,{backgroundColor:dark?'#14161d':'#f1e9d6',scale:2,useCORS:true,windowWidth:feed.scrollWidth}).then(function(canvas){
      try{var a=document.createElement('a');a.href=canvas.toDataURL('image/png');a.download='貼課通牆面_'+(roomName||'課堂')+'.png';a.click();toast('長圖已匯出');}catch(e){toast('匯出失敗：'+e.message);}
    }).catch(function(e){toast('匯出失敗：'+((e&&e.message)||''));});});}
document.addEventListener('click',function(ev){var mp=$('mentionPop');if(!mp||mp.style.display==='none')return;if(mp.contains(ev.target))return;if(ev.target.closest&&ev.target.closest('[onclick*="openMention"]'))return;mp.style.display='none';},true);
/* ===================== 😊 Emoji 選擇器 ===================== */
var _emojiTarget=null,_emojiPanel=null;
var EMOJI_SET=[
 ['表情',['😀','😃','😄','😁','😆','😅','😂','🤣','😊','🙂','😉','😍','🥰','😘','😎','🤩','🥳','🤔','🤨','😐','😏','😣','😮','😴','😌','😜','🤤','😒','😔','😟','😢','😭','😨','😱','😳','🤯','😬','🥴','🤢','🤧','😷','🤒','😇','🥺']],
 ['手勢',['👍','👎','👌','✌️','🤞','🙏','👏','🙌','👐','🤝','💪','👋','✋','🖐️','🖖','👆','👇','👉','👈','☝️','✊','👊','🤛','🤜']],
 ['愛心符號',['❤️','🧡','💛','💚','💙','💜','🤎','🖤','🤍','💔','💕','💞','💗','💖','💝','⭐','🌟','✨','⚡','🔥','💯','✅','❌','❓','❗','‼️','💡','🎉','🎊','🏆','🥇','🥈','🥉','🎯']],
 ['動物自然',['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🦄','🐢','🐝','🦋','🌱','🌿','☘️','🍀','🌳','🌸','🌻','🌈','☀️','🌙','❄️']],
 ['食物',['🍎','🍊','🍋','🍇','🍓','🍉','🍌','🍕','🍔','🍟','🍿','🍩','🍪','🎂','🍰','🧁','🍫','🍬','🍭','🍦','☕','🥤','🍵']],
 ['學習物品',['📚','📖','📝','✏️','🖊️','🖍️','📐','📏','📌','📎','🔖','📊','📈','📉','📁','📅','⏰','⏱️','🔔','💻','📱','🎓','🔬','🔭','🧪','🧮','🎨','🎵','🎤','🏫','✂️','🔍']]
];
function ensureEmojiPanel(){if(_emojiPanel)return _emojiPanel;
  var p=document.createElement('div');p.className='emoji-panel';p.id='emojiPanel';var html='';
  EMOJI_SET.forEach(function(c){html+='<div class="emoji-cat">'+c[0]+'</div><div class="emoji-grid">';
    c[1].forEach(function(e){html+='<button type="button" onclick="insertEmoji(\''+e+'\')">'+e+'</button>';});
    html+='</div>';});
  p.innerHTML=html;document.body.appendChild(p);_emojiPanel=p;return p;}
function toggleEmoji(targetId,btn){var p=ensureEmojiPanel();
  if(p.classList.contains('show')&&_emojiTarget===targetId){p.classList.remove('show');return;}
  _emojiTarget=targetId;p.classList.add('show');
  var r=btn.getBoundingClientRect();var ph=p.offsetHeight,pw=p.offsetWidth;
  var top=r.top-ph-8;if(top<8)top=Math.min(r.bottom+8,window.innerHeight-ph-8);
  var left=Math.min(Math.max(8,r.left),window.innerWidth-pw-8);
  p.style.top=Math.max(8,top)+'px';p.style.left=left+'px';}
function insertEmoji(emo){var el=$(_emojiTarget);if(!el)return;
  var sx=el.selectionStart,ex=el.selectionEnd;
  if(typeof sx==='number'){el.value=el.value.slice(0,sx)+emo+el.value.slice(ex);var pos=sx+emo.length;try{el.focus();el.setSelectionRange(pos,pos);}catch(_){}}
  else{el.value+=emo;el.focus();}
  try{el.dispatchEvent(new Event('input',{bubbles:true}));}catch(_){}}
document.addEventListener('click',function(ev){var p=_emojiPanel;if(!p||!p.classList.contains('show'))return;
  if(p.contains(ev.target))return;if(ev.target.closest&&ev.target.closest('.emoji-btn'))return;p.classList.remove('show');},true);
var roomStartTs=0,_clockTimer=null;
function fmtDur(ms){var s=Math.max(0,Math.floor(ms/1000));var h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;var mm=(h>0?('0'+m).slice(-2):''+m);return (h>0?h+':':'')+mm+':'+('0'+x).slice(-2);}
function updateRoomClock(){var el=$('roomClock');if(!el)return;if(!roomStartTs){el.textContent='⏱ 00:00';return;}el.textContent='⏱ 已進行 '+fmtDur(Date.now()-roomStartTs);}
function startRoomClock(){if(!roomStartTs)roomStartTs=Date.now();if(_clockTimer)clearInterval(_clockTimer);updateRoomClock();_clockTimer=setInterval(updateRoomClock,1000);}
function stopRoomClock(){if(_clockTimer){clearInterval(_clockTimer);_clockTimer=null;}}
function enterRoom(){showStatus('');$('lobby').style.display='none';$('room').classList.add('show');
  $('roomCode').innerHTML=esc(roomCodeStr)+' <small>點擊複製</small>';renderFeed();updateMemUI();setHostUI();
  if(isHost)updateConnPill('hide');else updateConnPill((hostConn&&hostConn.open)?'on':'reco');startRoomClock();}
function setHostUI(){setDrawUI();['timerBtn','exportBtn','kanbanBtn','teachBtn','shareBtn','buzzBtn','exitBtn','recBtn','matBtn','rollBtn','collabBtn','projBtn'].forEach(function(id){var t=$(id);if(t)t.style.display=isHost?'inline-block':'none';});var menus=document.querySelectorAll('.host-menu');for(var i=0;i<menus.length;i++){menus[i].style.display=isHost?'inline-block':'none';if(!isHost)menus[i].removeAttribute('open');}updateHandBtn();updateQABadge();}
function leaveRoom(){if(!confirm('確定離開房間？'))return;_leaving=true;cleanup();location.reload();}
function goHome(){if(!confirm('回到貼課通首頁？\n目前牆面已自動保存，可從首頁的「最近的教室」或「專案庫」重新開啟。'))return;_leaving=true;try{if(typeof saveSession==='function')saveSession();}catch(e){}try{cleanup();}catch(e){}location.reload();}
function cleanup(){try{for(var id in conns)conns[id].close();}catch(e){}try{hostConn&&hostConn.close();}catch(e){}try{peer&&peer.destroy();}catch(e){}}
function copyCode(){if(navigator.clipboard)navigator.clipboard.writeText(roomCodeStr).then(function(){toast('已複製代碼 '+roomCodeStr);});}
function memberArray(){var a=[];for(var id in members)a.push({id:id,name:members[id].name,viewOnly:!!members[id].viewOnly,canDraw:!!members[id].canDraw});return a;}
function updateMemUI(){$('memCount').textContent=memberArray().length+(isHost&&pendingCount()>0?(' +'+pendingCount()):'');}
function connByUid(uid){for(var k in conns){if(conns[k]._uid===uid)return conns[k];}return null;}
function openMembers(){var l=$('memList');l.innerHTML='';
  if(isHost){
    if(pendingCount()>0){var pq=document.createElement('div');pq.className='mem-setting pend-box';
      var h='<div class="ms-title">🔔 排隊等待加入（'+pendingCount()+' 人）</div>';
      for(var uid in pending){(function(uid){h+='<div class="pend-row" data-u="'+uid+'"><span class="pend-name">'+esc(pending[uid].name)+'</span><button class="qbtn ok" onclick="admitPending(\''+uid+'\')">准許</button><button class="qbtn no" onclick="rejectPending(\''+uid+'\')">拒絕</button></div>';})(uid);}
      pq.innerHTML=h;l.appendChild(pq);}
    var st=document.createElement('div');st.className='mem-setting';
    st.innerHTML='<div class="ms-row"><span>學員可開啟／下載 檔案·PDF</span><button class="toggle'+(allowOpen?' on':'')+'" id="aoToggle" onclick="toggleAllowOpen()">'+(allowOpen?'開':'關')+'</button></div><div class="ms-hint">關閉後，檔案不會傳到學員端，避免個資被取走（只看得到檔名）。</div>'+
      '<div class="ms-row" style="margin-top:12px"><span>每人貼文上限（0＝不限）</span><input id="maxPostsIn" type="number" min="0" max="99" value="'+maxPosts+'" class="ms-num" onchange="setMaxPosts(this.value)"></div><div class="ms-hint">避免洗版；學員超過上限將無法再貼（房主不受限）。</div>';
    l.appendChild(st);
    var nStu=memberArray().filter(function(m){return m.id!==myId;}).length;
    var q=document.createElement('div');q.className='mem-setting';
    q.innerHTML='<div class="ms-title">快速權限・一鍵套用所有學員（'+nStu+' 人）</div>'+
      '<div class="ms-qrow"><span class="ms-lab">塗鴉</span><button class="qbtn ok" onclick="setAllDraw(true)">全部允許</button><button class="qbtn no" onclick="setAllDraw(false)">全部禁止</button></div>'+
      '<div class="ms-qrow"><span class="ms-lab">貼文</span><button class="qbtn ok" onclick="setAllViewOnly(false)">全部可貼</button><button class="qbtn no" onclick="setAllViewOnly(true)">全部唯讀</button></div>';
    l.appendChild(q);
    var allRO=nStu>0&&memberArray().filter(function(m){return m.id!==myId;}).every(function(m){return m.viewOnly;});
    var tl=document.createElement('div');tl.className='mem-setting';
    tl.innerHTML='<div class="ms-title">課堂工具</div><div class="ms-tools">'+
      '<button class="tbtn" onclick="randomPick()">🎲 隨機抽人</button>'+
      '<button class="tbtn" onclick="openTimer(\'\')">⏱️ 計時器</button>'+
      '<button class="tbtn'+(allRO?' active':'')+'" onclick="toggleLockAll()">🔒 '+(allRO?'解除全室唯讀':'全室唯讀')+'</button></div>';
    l.appendChild(tl);}
  memberArray().forEach(function(m){
  var d=document.createElement('div');d.className='mem-item';
  var av=document.createElement('div');av.className='av';av.style.background=avColor(m.name);av.textContent=initial(m.name);av.style.width='34px';av.style.height='34px';av.style.fontSize='14px';
  var nm=document.createElement('div');nm.className='nm';nm.textContent=m.name;
  d.appendChild(av);d.appendChild(nm);
  if(m.id===myId){var b=document.createElement('span');b.className='badge';b.textContent=isHost?'房主':'你';d.appendChild(b);}
  if(m.viewOnly){var v=document.createElement('span');v.className='badge vo';v.textContent='唯讀';d.appendChild(v);}
  if(m.canDraw&&m.id!==myId){var cd=document.createElement('span');cd.className='badge dr';cd.textContent='可塗鴉';d.appendChild(cd);}
  if(isHost&&m.id!==myId){
    var dr=document.createElement('button');dr.className='mbtn';dr.textContent=m.canDraw?'禁止塗鴉':'允許塗鴉';
    dr.onclick=function(){toggleCanDraw(m.id);};d.appendChild(dr);
    var t=document.createElement('button');t.className='mbtn';t.textContent=m.viewOnly?'設為可貼':'設為唯讀';
    t.onclick=function(){toggleViewOnly(m.id);};d.appendChild(t);
    var k=document.createElement('button');k.className='mbtn kick';k.textContent='退出';
    k.onclick=function(){kickMember(m.id);};d.appendChild(k);
  }
  l.appendChild(d);});
  $('memSheet').classList.add('show');}
function closeMembers(){$('memSheet').classList.remove('show');}
function toggleAllowOpen(){if(!isHost)return;allowOpen=!allowOpen;
  hostBroadcast({t:'resync',feed:sanitizeFeed(feed),members:members,allowOpen:allowOpen});
  updateMemUI();openMembers();saveSession();notice(allowOpen?'已開放學員開啟檔案':'已禁止學員開啟檔案（個資保護）');}
function setAllDraw(v){if(!isHost)return;var n=0;for(var id in members){if(id===myId)continue;members[id].canDraw=v;n++;}
  hostBroadcast({t:'members',members:members});updateMemUI();openMembers();saveSession();notice((v?'已開放全部學員塗鴉':'已禁止全部學員塗鴉')+'（'+n+' 人）');}
function setAllViewOnly(v){if(!isHost)return;var n=0;for(var id in members){if(id===myId)continue;members[id].viewOnly=v;n++;}
  hostBroadcast({t:'members',members:members});updateMemUI();openMembers();saveSession();notice((v?'已將全部學員設為唯讀':'已開放全部學員貼文')+'（'+n+' 人）');}
function toggleCanDraw(id){if(!isHost||!members[id])return;members[id].canDraw=!members[id].canDraw;
  hostBroadcast({t:'members',members:members});updateMemUI();openMembers();saveSession();
  notice(members[id].name+(members[id].canDraw?' 已可塗鴉標註':' 已禁止塗鴉'));}
function toggleViewOnly(id){if(!isHost||!members[id])return;members[id].viewOnly=!members[id].viewOnly;
  hostBroadcast({t:'members',members:members});updateMemUI();openMembers();saveSession();
  notice(members[id].name+(members[id].viewOnly?' 已設為唯讀':' 已可貼文'));}
function kickMember(id){if(!isHost||!members[id])return;if(!confirm('將「'+members[id].name+'」移出房間？'))return;
  var c=connByUid(id);if(c){try{tSend(c,{t:'kicked'});}catch(e){}setTimeout(function(){try{c.close();}catch(e){}},300);}
  var nm=members[id].name;delete members[id];
  hostBroadcast({t:'notice',text:nm+' 已被移出'});hostBroadcast({t:'members',members:members});updateMemUI();openMembers();saveSession();notice(nm+' 已被移出');}
function iCanDraw(){return isHost||(members[myId]&&members[myId].canDraw)||_wbCollab;}
function applySelfPerms(){ // guest: react to my own permissions
  var vo=members[myId]&&members[myId].viewOnly;myViewOnly=!!vo;
  var fab=$('fab');if(fab)fab.style.display=(vo&&!isHost)?'none':'';
  var ro=$('roTag');if(ro)ro.style.display=(vo&&!isHost)?'inline-block':'none';
  if(vo)closePost();
  setDrawUI();
  // re-render so card ✏️ buttons reflect draw permission
  renderFeed();}
function setDrawUI(){var d=$('drawBtn');if(d)d.style.display=iCanDraw()?'inline-block':'none';}
function lockComposer(){$('msg').disabled=true;$('sendBtn').disabled=true;}

/* ===================== 暫存（IndexedDB，可存大檔，休眠/重整不遺失） ===================== */
var DB_NAME='shr_db',STORE='kv',_db=null;







