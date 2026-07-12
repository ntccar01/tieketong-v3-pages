function idbOpen(cb){if(_db){cb(_db);return;}try{var rq=indexedDB.open(DB_NAME,1);
  rq.onupgradeneeded=function(){try{rq.result.createObjectStore(STORE);}catch(e){}};
  rq.onsuccess=function(){_db=rq.result;cb(_db);};rq.onerror=function(){cb(null);};}catch(e){cb(null);}}
function idbSet(k,v){idbOpen(function(db){if(!db)return;try{db.transaction(STORE,'readwrite').objectStore(STORE).put(v,k);}catch(e){}});}
function idbGet(k,cb){idbOpen(function(db){if(!db){cb(null);return;}try{var rq=db.transaction(STORE,'readonly').objectStore(STORE).get(k);rq.onsuccess=function(){cb(rq.result||null);};rq.onerror=function(){cb(null);};}catch(e){cb(null);}});}
function idbDel(k){idbOpen(function(db){if(!db)return;try{db.transaction(STORE,'readwrite').objectStore(STORE).delete(k);}catch(e){}});}
var _saveT=null;
function roomKey(code){return 'room:'+code;}
function loadIndex(cb){idbGet('roomIndex',function(a){cb(Array.isArray(a)?a:[]);});}
function saveSession(){if(!roomCodeStr)return;clearTimeout(_saveT);_saveT=setTimeout(function(){
  var snap=(typeof snapNow==='function')?snapNow():{app:'shr',v:2,ts:Date.now(),code:roomCodeStr,isHost:isHost,myId:myId,myName:myName,roomName:roomName,bg:selBg,allowOpen:allowOpen,roomPass:roomPass,maxMembers:maxMembers,maxPosts:maxPosts,announce:roomAnnounce,frozen:frozen,kanbanOn:kanbanOn,columns:columns,members:members,feed:feed,roomStartTs:roomStartTs};
  idbSet(roomKey(roomCodeStr),snap);
  idbSet('session',{code:roomCodeStr,ts:Date.now()});
  loadIndex(function(idx){idx=idx.filter(function(e){return e.code!==snap.code;});
    idx.unshift({code:snap.code,roomName:snap.roomName,isHost:snap.isHost,ts:snap.ts,count:(snap.feed||[]).length,bg:snap.bg});
    var dropped=idx.slice(20);idx=idx.slice(0,20);
    idbSet('roomIndex',idx);dropped.forEach(function(e){idbDel(roomKey(e.code));});});
  },400);}
function clearSession(){idbDel('session');}
var _saved=null;
function isRoomSnapshot(s){return !!(s&&Array.isArray(s.feed));}
function applySnapshotState(s){
  myId=s.myId||myId;myName=s.myName||myName;roomName=s.roomName||'貼課通';selBg=s.bg||'';isHost=!!s.isHost;members=s.members||{};feed=s.feed||[];roomCodeStr=s.code||roomCodeStr;roomStartTs=s.roomStartTs||s.roomStart||Date.now();
  if(typeof s.allowOpen!=='undefined')allowOpen=s.allowOpen;else allowOpen=true;
  roomPass=s.roomPass||'';maxMembers=s.maxMembers||0;maxPosts=s.maxPosts||0;pending={};kanbanOn=!!s.kanbanOn;columns=s.columns||[];roomAnnounce=s.announce||'';frozen=!!s.frozen;
  if(typeof activePoll!=='undefined'){activePoll=s.poll||null;if(typeof myChoices!=='undefined')myChoices=[];if(typeof myAnswer!=='undefined')myAnswer='';}
  if(typeof questions!=='undefined')questions=Array.isArray(s.questions)?s.questions:[];
  if(typeof activeCloud!=='undefined')activeCloud=s.cloud||null;
  if(typeof pulse!=='undefined')pulse=s.pulse||{};
  if(typeof pulseAgg!=='undefined')pulseAgg=s.pulseAgg||{g:0,y:0,r:0,total:0};
  if(typeof _buzzOpen!=='undefined'){_buzzOpen=!!(s.buzz&&s.buzz.open);buzzList=(s.buzz&&Array.isArray(s.buzz.list))?s.buzz.list:[];}
  if(typeof exitActive!=='undefined')exitActive=s.exit||null;
}
function checkRestore(){idbGet('session',function(ptr){if(!ptr||!ptr.code)return;idbGet(roomKey(ptr.code),function(s){
  if(!s||!s.feed||!s.feed.length||(Date.now()-s.ts)>24*3600*1000)return;
  _saved=s;var info=$('rInfo');if(info)info.textContent='「'+(s.roomName||'貼課通')+'」· '+s.feed.length+' 則 · 你是'+(s.isHost?'房主':'參與者');
  var r=$('restore');if(r)r.style.display='block';});});}
function discardRestore(){clearSession();_saved=null;var r=$('restore');if(r)r.style.display='none';toast('已清除暫存資料');}
function restoreFrom(s,quiet){
  if(!isRoomSnapshot(s)){toast('資料格式不完整，無法復原');return;}
  applySnapshotState(s);
  applyName(roomName);$('lobby').style.display='none';$('room').classList.add('show');_leaving=false;
  $('roomCode').innerHTML=esc(roomCodeStr)+' <small>點擊複製</small>';applyTheme(selBg);renderFeed();updateMemUI();setHostUI();showAnnounce(roomAnnounce);applyFreeze(frozen);startRoomClock();
  if(typeof updateQABadge==='function')updateQABadge();if(typeof updatePulseBtn==='function')updatePulseBtn();var bz=$('buzzModal'),ex=$('exitModal');if(typeof renderBuzz==='function'&&bz&&bz.classList.contains('show'))renderBuzz();if(typeof renderExitHost==='function'&&ex&&ex.classList.contains('show'))renderExitHost();
  if(!isHost)updateConnPill('reco');
  showStatus('');toast((quiet?'資料已導入':'資料已復原')+'，重新連線中…');
  loadPeerJS(function(){
    if(isHost){conns={};rehost(s.code);}
    else{applySelfPerms();mkPeer(undefined,function(){_jTries=0;_jDone=false;jAttempt(s.code);},
      function(e){if(e.type==='peer-unavailable'){jRetry(s.code,'房主目前不在線');return true;}return false;});}
  });}
function doRestore(){if(_saved)restoreFrom(_saved,false);}
/* ---- 最近 20 次教室：查詢與導入 ---- */
function openHistory(){if(!guardFeature('openHistory'))return;loadIndex(function(idx){var l=$('histList');l.innerHTML='';
  if(!idx.length){l.innerHTML='<div class="hist-empty">目前沒有任何教室紀錄</div>';$('histSheet').classList.add('show');return;}
  idx.forEach(function(e){var d=document.createElement('div');d.className='hist-card';
    if(e.bg){d.style.background=e.bg;d.classList.add('hc-light');}
    var when=new Date(e.ts);var ds=(when.getMonth()+1)+'/'+when.getDate()+' '+('0'+when.getHours()).slice(-2)+':'+('0'+when.getMinutes()).slice(-2);
    var nm=document.createElement('div');nm.className='hc-name';nm.textContent=e.roomName||'貼課通';
    var sub=document.createElement('div');sub.className='hc-sub';sub.textContent=(e.count||0)+' 則 · '+ds+' · 你是'+(e.isHost?'房主':'參與者');
    var code=document.createElement('div');code.className='hc-code';code.textContent='代碼 '+(e.code||'');
    var btns=document.createElement('div');btns.className='hc-btns';
    var imp=document.createElement('button');imp.className='hc-imp';imp.textContent='導入';imp.onclick=function(){importRoom(e.code);};
    var del=document.createElement('button');del.className='hc-del';del.textContent='✕';del.title='刪除這筆';del.onclick=function(){delHistory(e.code);};
    btns.appendChild(imp);btns.appendChild(del);d.appendChild(nm);d.appendChild(sub);d.appendChild(code);d.appendChild(btns);l.appendChild(d);});
  $('histSheet').classList.add('show');});}
function closeHistory(){$('histSheet').classList.remove('show');}
function importRoom(code){if(!guardFeature('importRoom'))return;idbGet(roomKey(code),function(s){if(!s){toast('找不到該教室資料');return;}closeHistory();restoreFrom(s,true);});}
function delHistory(code){if(!confirm('刪除這筆教室紀錄？'))return;loadIndex(function(idx){idx=idx.filter(function(e){return e.code!==code;});idbSet('roomIndex',idx);idbDel(roomKey(code));openHistory();});}
function clearHistory(){if(!confirm('清除全部教室紀錄（最多 20 筆）？'))return;loadIndex(function(idx){idx.forEach(function(e){idbDel(roomKey(e.code));});idbSet('roomIndex',[]);idbDel('session');openHistory();toast('已清除全部紀錄');});}
function rehost(code){var tries=0;(function attempt(){tries++;POPTS=buildPOPTS();
  try{peer=new Peer('shr-'+code,POPTS);}catch(e){fallbackHost();return;}
  peer.on('open',function(){roomCodeStr=code;$('roomCode').innerHTML=esc(code)+' <small>點擊複製</small>';wireHost();notice('房間已重新上線（代碼不變）');saveSession();});
  peer.on('disconnected',function(){try{peer.reconnect();}catch(e){}});
  peer.on('error',function(e){if(e.type==='unavailable-id'){if(tries<12){try{peer.destroy();}catch(_){}if(tries===2)notice('正在搶回原房號，請稍候…（成功的話代碼不變）');setTimeout(attempt,2500);}else fallbackHost();return;}});
})();}
function fallbackHost(){mkPeer(genCode(),function(pid){roomCodeStr=pid.replace('shr-','');$('roomCode').innerHTML=esc(roomCodeStr)+' <small>點擊複製</small>';wireHost();
  notice('已復原；代碼更新為 '+roomCodeStr+'，請通知成員重新加入');saveSession();});}

/* ===================== 塗鴉畫布 ===================== */
var board=null,dctx=null,drawTool='pen',drawColor='#111111',drawSize=7,drawing=false,lastX=0,lastY=0,dInited=false,annoId=null,_annoImg=null,dScale=1;
var drawFont='"Noto Sans TC","Microsoft JhengHei",sans-serif',drawFontSize=28;
var cAnno={id:null,card:null,canvas:null,ctx:null,scale:1,drawing:false,lx:0,ly:0};
var DCOLORS=['#111111','#e8453c','#f0902a','#f3c218','#3aa55c','#2f7fe0','#8a4fd0','#7a5230'];
var DSIZES=[{px:3,d:6},{px:7,d:11},{px:14,d:18}];





