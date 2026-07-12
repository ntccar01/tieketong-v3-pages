/* ===================== PeerJS (cross-network, 同系列) ===================== */
var peerLoaded=false,peerLoading=false;
var PEER_CDNS=['https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js','https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js','https://cdnjs.cloudflare.com/ajax/libs/peerjs/1.5.4/peerjs.min.js'];
var ICE=[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'},{urls:'stun:stun.relay.metered.ca:80'},
  {urls:'turn:openrelay.metered.ca:80',username:'openrelayproject',credential:'openrelayproject'},
  {urls:'turn:openrelay.metered.ca:443',username:'openrelayproject',credential:'openrelayproject'},
  {urls:'turn:openrelay.metered.ca:443?transport=tcp',username:'openrelayproject',credential:'openrelayproject'}];
var DEFAULT_ICE=ICE.concat([{urls:'stun:stun2.l.google.com:19302'},{urls:'stun:stun.cloudflare.com:3478'}]);
function netCfg(){try{return JSON.parse(localStorage.getItem('shr_net')||'{}')||{};}catch(e){return {};}}
function buildPOPTS(forceRelay){var cfg=netCfg();var ice=DEFAULT_ICE.slice();
  if(cfg.turnUrl){var t={urls:cfg.turnUrl};if(cfg.turnUser)t.username=cfg.turnUser;if(cfg.turnCred)t.credential=cfg.turnCred;ice.unshift(t);}
  var conf={iceServers:ice,sdpSemantics:'unified-plan'};
  if(forceRelay||cfg.forceRelay)conf.iceTransportPolicy='relay';
  var o={debug:0,config:conf};
  if(cfg.psHost){o.host=cfg.psHost;o.path=cfg.psPath||'/';var pp=parseInt(cfg.psPort,10);if(pp)o.port=pp;o.secure=(typeof cfg.psSecure==='undefined')?true:!!cfg.psSecure;if(cfg.psKey)o.key=cfg.psKey;}
  return o;}
var POPTS=buildPOPTS();var _forceRelay=false;
function loadPeerJS(cb){if(peerLoaded){cb();return;}if(peerLoading)return;peerLoading=true;var i=0;
  (function nx(){if(i>=PEER_CDNS.length){peerLoading=false;showStatus('連線模組載入失敗，請檢查網路',true);return;}
    var s=document.createElement('script');s.src=PEER_CDNS[i];s.onload=function(){peerLoaded=true;peerLoading=false;cb();};s.onerror=function(){i++;nx();};document.head.appendChild(s);})();}
function genCode(){var ch='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';var r='';for(var i=0;i<6;i++)r+=ch[Math.random()*ch.length|0];return r;}
function mkPeer(id,cb,onErr){POPTS=buildPOPTS(_forceRelay);try{peer=id?new Peer('shr-'+id,POPTS):new Peer(undefined,POPTS);}catch(e){showStatus('連線初始化失敗',true);return;}
  peer.on('open',function(pid){cb(pid);});
  peer.on('disconnected',function(){try{peer.reconnect();}catch(e){}});
  peer.on('error',function(e){console.error(e);if(e.type==='unavailable-id'){peer.destroy();mkPeer(genCode(),cb,onErr);return;}if(onErr&&onErr(e))return;showStatus(e.type==='peer-unavailable'?'找不到該房間':'連線錯誤：'+e.type,true);});try{peer.on('call',function(call){onIncomingShare(call);});}catch(e){}}

/* ---- chunked transport (handles large PDF / images) ---- */
var CHUNK=58000, _asm={};
function tSend(conn,obj){if(!conn||!conn.open)return;var str=JSON.stringify(obj);
  if(str.length<=CHUNK){conn.send(JSON.stringify({k:'m',d:str}));return;}
  var mid=uid(),n=Math.ceil(str.length/CHUNK);
  for(var i=0;i<n;i++)conn.send(JSON.stringify({k:'c',id:mid,i:i,n:n,d:str.slice(i*CHUNK,(i+1)*CHUNK)}));}
function tRecv(raw,cb){var p;try{p=JSON.parse(raw);}catch(e){return;}
  if(p.k==='m'){var o;try{o=JSON.parse(p.d);}catch(e){return;}cb(o);return;}
  if(p.k==='c'){var a=_asm[p.id]||(_asm[p.id]={n:p.n,parts:[],got:0});if(a.parts[p.i]===undefined){a.parts[p.i]=p.d;a.got++;}
    if(a.got===a.n){var full=a.parts.join('');delete _asm[p.id];var o;try{o=JSON.parse(full);}catch(e){return;}cb(o);}}}

/* ===================== host / guest ===================== */
function wireHost(){peer.on('connection',function(c){
  c.on('open',function(){conns[c.peer]=c;});
  c.on('data',function(raw){tRecv(raw,function(o){hostHandle(o,c);});});
  c.on('close',function(){onPeerGone(c.peer);});
  c.on('error',function(){});
});}
function createRoom(){if(!guardFeature('createRoom'))return;myName=($('nameIn').value||'').trim();if(!myName){showStatus('請先輸入暱稱',true);$('nameIn').focus();return;}
  roomPass=($('passIn')?$('passIn').value:'').trim();maxMembers=Math.max(0,parseInt(($('maxIn')?$('maxIn').value:'0'),10)||0);pending={};
  isHost=true;_forceRelay=false;applyName($('roomNameIn').value);showStatus('正在載入連線模組…');
  loadPeerJS(function(){showStatus('正在建立房間…');
    mkPeer(genCode(),function(pid){roomCodeStr=pid.replace('shr-','');
      members={};members[myId]={name:myName,viewOnly:false};feed=[];roomStartTs=Date.now();
      enterRoom();applyTheme(selBg);wireHost();saveSession();
    });
  });}
function joinRoom(){myName=($('nameIn').value||'').trim();if(!myName){showStatus('請先輸入暱稱',true);$('nameIn').focus();return;}
  var code=($('codeIn').value||'').trim().toUpperCase();if(!code){showStatus('請輸入房間代碼',true);return;}
  myJoinPass=($('joinPassIn')?$('joinPassIn').value:'').trim();isHost=false;_forceRelay=false;showStatus('正在載入連線模組…');
  loadPeerJS(function(){showStatus('跨網域連線中…');
    mkPeer(undefined,function(){_jTries=0;_jDone=false;jAttempt(code);},
      function(e){if(e.type==='peer-unavailable'){jRetry(code,'找不到房主');return true;}return false;});
  });}
var _jTries=0,_jMax=7,_jDone=false,_jTimer=null;
function jAttempt(code){if(_jDone)return;_jTries++;var pid='shr-'+code;
  try{hostConn=peer.connect(pid,{reliable:true});}catch(e){jRetry(code,'連線失敗');return;}
  if(_jTimer)clearTimeout(_jTimer);
  _jTimer=setTimeout(function(){if(!_jDone&&(!hostConn||!hostConn.open)){var st='';try{st=hostConn&&hostConn.peerConnection?hostConn.peerConnection.iceConnectionState:'';}catch(e){}try{hostConn&&hostConn.close();}catch(e){}jRetry(code,(st==='failed'||st==='disconnected')?'網路擋住直連':'連線逾時');}},14000);
  hostConn.on('open',function(){_jDone=true;if(_jTimer)clearTimeout(_jTimer);roomCodeStr=code;
    showStatus('驗證中…');tSend(hostConn,{t:'hello',id:myId,name:myName,pass:myJoinPass});
    updateConnPill('on');unlockComposer();
    if(myHandUp)setTimeout(function(){if(hostConn&&hostConn.open)tSend(hostConn,{t:'handup',uid:myId,name:myName});},800);});
  hostConn.on('data',function(raw){tRecv(raw,guestHandle);});
  hostConn.on('close',function(){if(_jDone&&!_leaving&&!isHost){updateConnPill('off');notice('與老師連線中斷，重新連線中…');reconnectHost();}});
  hostConn.on('error',function(){});}
var _leaving=false;
function reconnectHost(){if(isHost||_leaving)return;if(!roomCodeStr)return;_jDone=false;_jTries=0;updateConnPill('reco');jAttempt(roomCodeStr);}
setInterval(function(){if(isHost||_leaving)return;if(!roomCodeStr)return;if(_jDone===false)return;if(hostConn&&hostConn.open)return;reconnectHost();},15000);
function connPillClick(){if(isHost)return;if(hostConn&&hostConn.open){toast('連線正常 🟢');return;}reconnectHost();}
function updateConnPill(state){var el=$('connPill');if(!el)return;if(isHost){el.style.display='none';return;}
  el.style.display='';el.classList.remove('on','reco','off');
  if(state==='on'){el.classList.add('on');el.textContent='🟢 已連線';}
  else if(state==='reco'){el.classList.add('reco');el.textContent='🟡 重新連線中…';}
  else{el.classList.add('off');el.textContent='🔴 已斷線・點此重連';}}
function unlockComposer(){var m=$('msg'),s=$('sendBtn');if(m)m.disabled=false;if(s)s.disabled=false;}
function jRetry(code,why){if(_jDone)return;if(_jTimer)clearTimeout(_jTimer);
  if(_jTries<_jMax){
    if($('room').classList.contains('show'))updateConnPill('reco');else showStatus(why+'，重試中…('+_jTries+'/'+_jMax+')');
    if(!_forceRelay&&_jTries>=Math.ceil(_jMax/2)){escalateRelay(code);return;}
    var delay=Math.min(1400*_jTries,5000);
    setTimeout(function(){if(!_jDone)jAttempt(code);},delay);
  }else{
    if($('room').classList.contains('show')){updateConnPill('off');notice('暫時連不上老師，點右上狀態燈可重試');}
    else showStatus('連不上房間：請確認代碼正確、房主仍開著、雙方有網路。學校／公司網路常擋 P2P，請在下方「連線設定」勾選『強制走中繼』或填入 TURN 後再試。',true);
  }}
function escalateRelay(code){if(_forceRelay)return;_forceRelay=true;try{peer&&peer.destroy();}catch(e){}
  if($('room').classList.contains('show'))updateConnPill('reco');else showStatus('改用中繼通道重試（適用學校／公司網路）…');
  mkPeer(undefined,function(){jAttempt(code);},function(e){if(e.type==='peer-unavailable'){jRetry(code,'找不到房主');return true;}return false;});}

function _nv(id){var e=$(id);return e?(e.value||'').trim():'';}
function _nc(id){var e=$(id);return e?!!e.checked:false;}
function _sv(id,v){var e=$(id);if(e)e.value=(v==null?'':v);}
function _sc(id,v){var e=$(id);if(e)e.checked=!!v;}
function fillNet(){var c=netCfg();_sv('netTurnUrl',c.turnUrl);_sv('netTurnUser',c.turnUser);_sv('netTurnCred',c.turnCred);_sc('netForceRelay',c.forceRelay);_sv('netPsHost',c.psHost);_sv('netPsPort',c.psPort);_sv('netPsPath',c.psPath);_sv('netPsKey',c.psKey);_sc('netPsSecure',(typeof c.psSecure==='undefined')?true:c.psSecure);}
function saveNet(){var c={turnUrl:_nv('netTurnUrl'),turnUser:_nv('netTurnUser'),turnCred:_nv('netTurnCred'),forceRelay:_nc('netForceRelay'),psHost:_nv('netPsHost'),psPort:_nv('netPsPort'),psPath:_nv('netPsPath'),psKey:_nv('netPsKey'),psSecure:_nc('netPsSecure')};localStorage.setItem('shr_net',JSON.stringify(c));POPTS=buildPOPTS();toast('已儲存連線設定，下次連線生效');}
function resetNet(){localStorage.removeItem('shr_net');POPTS=buildPOPTS();fillNet();toast('已還原預設連線設定');}

/* ---- host: route + broadcast ---- */
function hostBroadcast(obj,exceptId){for(var id in conns){if(id===exceptId)continue;tSend(conns[id],obj);}}
function sanitizePost(p){if(allowOpen||!p||p.type!=='file')return p;var c={};for(var k in p){if(k==='dataUrl'||k==='thumb')continue;c[k]=p[k];}c.locked=true;return c;}
function sanitizeFeed(f){if(allowOpen)return f;var a=[];for(var i=0;i<f.length;i++)a.push(sanitizePost(f[i]));return a;}
function canDrawUid(uid){return uid&&members[uid]&&members[uid].canDraw;}
function sendInit(c){tSend(c,{t:'init',members:members,feed:sanitizeFeed(feed),roomName:roomName,bg:selBg,allowOpen:allowOpen,kanbanOn:kanbanOn,columns:columns,maxPosts:maxPosts,announce:roomAnnounce,frozen:frozen,poll:activePoll?pollPublic(activePoll):null,questions:questions,cloud:activeCloud?cloudPublic(activeCloud):null,buzz:{open:!!_buzzOpen,list:buzzList||[]},exit:exitActive||null,roomStart:roomStartTs});}
function admitMember(c,name,uid){members[uid]={name:name,viewOnly:false,canDraw:false};sendInit(c);
  hostBroadcast({t:'notice',text:name+' 加入了'},c.peer);notice(name+' 加入了');hostBroadcast({t:'members',members:members});updateMemUI();saveSession();if(_shareOn)setTimeout(function(){shareCallGuest(c.peer);},700);if(pulseAgg.total)tSend(c,{t:'pulseagg',g:pulseAgg.g,y:pulseAgg.y,r:pulseAgg.r,total:pulseAgg.total});}
function admitPending(uid){var pe=pending[uid];if(!pe)return;delete pending[uid];admitMember(pe.conn,pe.name,uid);updatePendingUI();openMembers();}
function rejectPending(uid){var pe=pending[uid];if(!pe)return;delete pending[uid];try{tSend(pe.conn,{t:'denied',reason:'房主未准許加入'});}catch(e){}setTimeout(function(){try{pe.conn.close();}catch(e){}},300);updatePendingUI();openMembers();}
function pendingCount(){var n=0;for(var k in pending)n++;return n;}
function updatePendingUI(){var el=$('memCount');/* count badge unchanged */ if(isHost&&pendingCount()>0)notice('🔔 有 '+pendingCount()+' 人排隊等待加入');}
function hostHandle(o,c){
  if(o.t==='typing'){hostSetTyping(o.uid,o.name,o.on);return;}
  if(o.t==='buzz'){hostBuzzIn(o.uid,o.name);return;}
  if(o.t==='exitans'){hostExitAns(o.uid,o.name,o.text);return;}
  if(o.t==='pulse'){var pu=o.uid||c._uid;if(pu){if(o.v)pulse[pu]=o.v;else delete pulse[pu];pulseRecalc();}return;}
  if(o.t==='hello'){
    if(roomPass&&(o.pass||'')!==roomPass){tSend(c,{t:'denied',reason:'房間密碼錯誤'});setTimeout(function(){try{c.close();}catch(e){}},300);return;}
    var cur=0;for(var mk in members)cur++;
    if(maxMembers>0&&cur>=maxMembers){c._uid=o.id;pending[o.id]={conn:c,name:o.name};tSend(c,{t:'queued'});updatePendingUI();openMembers();return;}
    c._uid=o.id;admitMember(c,o.name,o.id);return;}
  if(o.t==='post'){if(members[c._uid]&&members[c._uid].viewOnly)return;if(findPost(o.post.id))return;
    if(maxPosts>0){var cnt=0;for(var fi=0;fi<feed.length;fi++)if(feed[fi].uid===c._uid)cnt++;if(cnt>=maxPosts){tSend(c,{t:'notice',text:'已達每人貼文上限（'+maxPosts+' 則）'});return;}}
    feed.push(o.post);addPostEl(o.post);hostBroadcast({t:'post',post:sanitizePost(o.post)},c.peer);saveSession();return;}
  if(o.t==='editpost'){var epp=findPost(o.id);if(epp&&epp.uid===c._uid){epp.subject=o.subject||'';epp.text=o.text||'';epp.cardColor=o.cardColor||'';if(typeof o.col!=='undefined')epp.col=o.col;renderFeed();hostBroadcast({t:'postedit',id:o.id,subject:epp.subject,text:epp.text,cardColor:epp.cardColor,col:epp.col});saveSession();}return;}
  if(o.t==='delete'){var p=findPost(o.id);if(p&&p.uid===c._uid){applyRemove(o.id);hostBroadcast({t:'removed',id:o.id});saveSession();}return;}
  if(o.t==='reorder'){applyOrder(o.order);reorderDOM(o.order);hostBroadcast({t:'order',order:o.order},c.peer);saveSession();return;}
  if(o.t==='update'){var up=findPost(o.id);if(up&&up.uid===c._uid){updatePostImageLocal(o.id,o.dataUrl);hostBroadcast({t:'updated',id:o.id,dataUrl:o.dataUrl},c.peer);saveSession();}return;}
  if(o.t==='annoupdate'){if(!canDrawUid(c._uid))return;var ap=findPost(o.id);if(ap){setAnnoLocal(o.id,o.anno);hostBroadcast({t:'annoset',id:o.id,anno:o.anno},c.peer);saveSession();}return;}
  if(o.t==='annostroke'){if(!canDrawUid(c._uid))return;applyLiveStroke(o);hostBroadcast(o,c.peer);return;}
  if(o.t==='annoclear'){if(!canDrawUid(c._uid))return;clearLive(o.id);hostBroadcast(o,c.peer);return;}
  if(o.t==='wbstroke'){if(!_wbCollab)return;wbApply(o);hostBroadcast(o,c.peer);return;}
  if(o.t==='wbclear'){if(!_wbCollab)return;wbClearLocal();hostBroadcast(o,c.peer);return;}
  if(o.t==='react'){var rp=findPost(o.id);if(rp){applyReact(rp,o.emoji,o.uid);refreshCard(o.id);hostBroadcast({t:'reactset',id:o.id,reactions:rp.reactions});saveSession();}return;}
  if(o.t==='comment'){var cp=findPost(o.id);if(cp&&o.comment&&(o.comment.text||'').trim()){if(!cp.comments)cp.comments=[];cp.comments.push(o.comment);refreshCard(o.id);hostBroadcast({t:'commentset',id:o.id,comments:cp.comments});saveSession();}return;}
  if(o.t==='setcol'){var sp=findPost(o.id);if(sp&&(sp.uid===c._uid||isHost)){sp.col=o.col;renderFeed();hostBroadcast({t:'colset',id:o.id,col:o.col});saveSession();}return;}
  if(o.t==='checkin'){if(members[o.uid]){members[o.uid].checkedIn=true;if($('rosterModal').classList.contains('show'))openRoster();notice('✅ '+(members[o.uid].name||'學員')+' 已簽到');}return;}
  if(o.t==='pollvote'){var pvu=o.uid||c._uid;if(activePoll&&activePoll.open&&o.id===activePoll.id&&Array.isArray(o.choices)&&pvu){activePoll.votes[pvu]=o.choices;tallyPoll(activePoll);if($('pollModal').classList.contains('show'))showPoll(activePoll);hostBroadcast({t:'pollresult',id:activePoll.id,counts:activePoll.counts,total:activePoll.total});saveSession();}return;}
  if(o.t==='pollanswer'){var pau=o.uid||c._uid;if(activePoll&&activePoll.open&&o.id===activePoll.id&&(o.text||'').trim()&&pau){setAnswer(activePoll,pau,o.name||(members[pau]&&members[pau].name)||'學員',o.text.trim());if($('pollModal').classList.contains('show'))showPoll(activePoll);hostBroadcast({t:'pollanswers',id:activePoll.id,answers:activePoll.answers});saveSession();}return;}
  if(o.t==='handup'){var huid=o.uid||c._uid;if(!huid)return;var hnm=o.name||(members[huid]&&members[huid].name)||'學員';handsRaised[huid]={name:hnm,ts:Date.now()};updateHandBtn();if($('handsModal').classList.contains('show'))openHands();hostNotify('✋ '+hnm+' 舉手了（點此查看）',openHands);return;}
  if(o.t==='handdown'){var duid=o.uid||c._uid;if(duid)delete handsRaised[duid];updateHandBtn();if($('handsModal').classList.contains('show'))openHands();return;}
  if(o.t==='question'){if((o.text||'').trim()){questions.push({id:uid(),text:o.text.trim(),votes:[],answered:false});qSyncAndRender();hostNotify('❓ 收到一則匿名提問（點此查看）',openQA);}return;}
  if(o.t==='qvote'){var qvu=o.uid||c._uid;var qq=findQ(o.qid);if(qq&&qvu){var k=qq.votes.indexOf(qvu);if(k>=0)qq.votes.splice(k,1);else qq.votes.push(qvu);qSyncAndRender();}return;}
  if(o.t==='cloudword'){if(activeCloud&&activeCloud.open&&o.id===activeCloud.id&&(o.word||'').trim()){addCloudWord(activeCloud,o.word.trim());if($('cloudModal').classList.contains('show'))showCloud(activeCloud);hostBroadcast({t:'cloudupdate',id:activeCloud.id,words:activeCloud.words});saveSession();}return;}
}
function onPeerGone(peerKey){var c=conns[peerKey];var gid=c&&c._uid;delete conns[peerKey];if(shareCalls[peerKey]){try{shareCalls[peerKey].close();}catch(e){}delete shareCalls[peerKey];}if(gid&&pulse[gid]){delete pulse[gid];pulseRecalc();}
  if(gid&&members[gid]){var nm=members[gid].name;delete members[gid];if(handsRaised[gid]){delete handsRaised[gid];updateHandBtn();if($('handsModal').classList.contains('show'))openHands();}
    hostBroadcast({t:'notice',text:nm+' 離開了'});notice(nm+' 離開了');
    hostBroadcast({t:'members',members:members});updateMemUI();}}

/* ---- guest: receive ---- */
function guestHandle(o){
  if(o.t==='typingagg'){showTypingList(o.list);return;}
  if(o.t==='rollstart'){playRoll(o.items,o.winner,o.mode,o.dur);return;}
  if(o.t==='wbopen'){_wbCollab=true;openDraw();notice('老師開啟協作白板，一起畫吧');return;}
  if(o.t==='wbstroke'){wbApply(o);return;}
  if(o.t==='wbclear'){wbClearLocal();return;}
  if(o.t==='wbclose'){_wbCollab=false;closeDraw();toast('協作白板已結束');return;}
  if(o.t==='rolloff'){$('rollStage').style.display='none';return;}
  if(o.t==='buzzstart'||o.t==='buzzreset'){showBuzzGuest();return;}
  if(o.t==='buzzstop'){hideBuzzGuest();return;}
  if(o.t==='buzzrank'){guestBuzzRank(o.list);return;}
  if(o.t==='exitstart'){showExitGuest(o.q);return;}
  if(o.t==='exitstop'){if(!isHost){toast('退場券已結束');$('exitModal').classList.remove('show');}return;}
  if(o.t==='spotlight'){showSpotlight(o.post);return;}
  if(o.t==='spotlightoff'){hideSpotlight();return;}
  if(o.t==='pulseagg'){pulseAgg={g:o.g||0,y:o.y||0,r:o.r||0,total:o.total||0};if($('pulseModal').classList.contains('show'))renderPulse();return;}
  if(o.t==='pulseclear'){myPulse='';pulseAgg={g:0,y:0,r:0,total:0};if($('pulseModal').classList.contains('show'))renderPulse();return;}
  if(o.t==='sharestart'){toast('📡 老師開始分享'+(o.kind==='cam'?'鏡頭':'螢幕')+'…');return;}
  if(o.t==='sharestop'){hideShareViewer();toast('老師結束了分享');return;}
  if(o.t==='denied'){_jDone=true;_leaving=true;try{hostConn&&hostConn.close();}catch(e){}$('room').classList.remove('show');$('lobby').style.display='';showStatus((o.reason||'無法加入房間')+'，請確認後再試',true);return;}
  if(o.t==='queued'){showStatus('房間已滿，排隊中… 等待房主准許加入',false);return;}
  if(o.t==='init'){members=o.members||{};feed=o.feed||[];if(o.roomName)applyName(o.roomName);if(typeof o.allowOpen!=='undefined')allowOpen=o.allowOpen;kanbanOn=!!o.kanbanOn;columns=o.columns||[];maxPosts=o.maxPosts||0;roomAnnounce=o.announce||'';frozen=!!o.frozen;roomStartTs=o.roomStart||roomStartTs||Date.now();enterRoom();applyTheme(o.bg||'');applySelfPerms();showAnnounce(roomAnnounce);applyFreeze(frozen);if(o.poll){activePoll=o.poll;myChoices=[];myPollSubmitted=false;showPoll(activePoll);}questions=o.questions||[];if(o.cloud){activeCloud=o.cloud;showCloud(activeCloud);}if(o.buzz&&o.buzz.open){showBuzzGuest();guestBuzzRank(o.buzz.list||[]);}if(o.exit&&o.exit.open!==false){showExitGuest(o.exit.q||'退場券');}updateHandBtn();showStatus('');saveSession();return;}
  if(o.t==='post'){if(findPost(o.post.id))return;feed.push(o.post);addPostEl(o.post);saveSession();return;}
  if(o.t==='members'){members=o.members||{};updateMemUI();applySelfPerms();return;}
  if(o.t==='removed'){applyRemove(o.id);return;}
  if(o.t==='order'){applyOrder(o.order);reorderDOM(o.order);saveSession();return;}
  if(o.t==='updated'){updatePostImageLocal(o.id,o.dataUrl);return;}
  if(o.t==='annoset'){clearLive(o.id);setAnnoLocal(o.id,o.anno);return;}
  if(o.t==='annostroke'){applyLiveStroke(o);return;}
  if(o.t==='annoclear'){clearLive(o.id);return;}
  if(o.t==='resync'){feed=o.feed||feed;if(o.members)members=o.members;if(typeof o.allowOpen!=='undefined')allowOpen=o.allowOpen;renderFeed();updateMemUI();applySelfPerms();saveSession();notice('房主更新了權限設定');return;}
  if(o.t==='reactset'){var rp=findPost(o.id);if(rp){rp.reactions=o.reactions;refreshCard(o.id);saveSession();}return;}
  if(o.t==='commentset'){var cp=findPost(o.id);if(cp){cp.comments=o.comments||[];refreshCard(o.id);saveSession();}return;}
  if(o.t==='colset'){var sp=findPost(o.id);if(sp){sp.col=o.col;renderFeed();saveSession();}return;}
  if(o.t==='postedit'){var epp=findPost(o.id);if(epp){epp.subject=o.subject||'';epp.text=o.text||'';epp.cardColor=o.cardColor||'';if(typeof o.col!=='undefined')epp.col=o.col;renderFeed();saveSession();}return;}
  if(o.t==='pinset'){var pp=findPost(o.id);if(pp){pp.pinned=o.on;renderFeed();saveSession();}return;}
  if(o.t==='maxposts'){maxPosts=o.n||0;saveSession();return;}
  if(o.t==='rollcall'){$('checkinBar').style.display='';return;}
  if(o.t==='autogroup'){applyGroups(o.groups||{});saveSession();return;}
  if(o.t==='announce'){roomAnnounce=o.text||'';showAnnounce(roomAnnounce);saveSession();return;}
  if(o.t==='freeze'){frozen=!!o.on;applyFreeze(frozen);return;}
  if(o.t==='pollstart'){activePoll=o.poll;activePoll.open=true;myChoices=[];myAnswer='';myPollSubmitted=false;showPoll(activePoll);return;}
  if(o.t==='pollresult'){if(activePoll&&activePoll.id===o.id){activePoll.counts=o.counts;activePoll.total=o.total;if($('pollModal').classList.contains('show'))showPoll(activePoll);}return;}
  if(o.t==='pollanswers'){if(activePoll&&activePoll.id===o.id){activePoll.answers=o.answers||[];if($('pollModal').classList.contains('show'))showPoll(activePoll);}return;}
  if(o.t==='pollend'){if(activePoll&&activePoll.id===o.id){activePoll.open=false;showPoll(activePoll);}return;}
  if(o.t==='pollclose'){hidePoll();activePoll=null;return;}
  if(o.t==='handack'){if(o.uid===myId){myHandUp=false;updateHandBtn();toast('🙋 老師請你發言');}return;}
  if(o.t==='handclear'){myHandUp=false;updateHandBtn();return;}
  if(o.t==='questions'){questions=o.list||[];if($('qaModal').classList.contains('show'))renderQA();return;}
  if(o.t==='cloudstart'){activeCloud=o.cloud;activeCloud.open=true;showCloud(activeCloud);return;}
  if(o.t==='cloudupdate'){if(activeCloud&&activeCloud.id===o.id){activeCloud.words=o.words||{};if($('cloudModal').classList.contains('show'))showCloud(activeCloud);}return;}
  if(o.t==='cloudend'){if(activeCloud&&activeCloud.id===o.id){activeCloud.open=false;showCloud(activeCloud);}return;}
  if(o.t==='cloudclose'){hideCloud();activeCloud=null;return;}
  if(o.t==='kanban'){applyKanban(o.on,o.columns);saveSession();return;}
  if(o.t==='slide'){if($('slideShow').classList.contains('show')){slideIdx=o.idx||0;renderSlide(false);}return;}
  if(o.t==='laser'){if($('slideShow').classList.contains('show')){if(o.on)showLaser(o.x,o.y);else hideLaser();}return;}
  if(o.t==='slstroke'){if($('slideShow').classList.contains('show'))drawSlSeg(o.x0,o.y0,o.x1,o.y1);return;}
  if(o.t==='slclear'){if($('slideShow').classList.contains('show')){var cv=$('ssAnno');cv.getContext('2d').clearRect(0,0,cv.width,cv.height);}return;}
  if(o.t==='timer'){if(o.endTs&&o.endTs>Date.now())startTimerDisplay(o.endTs,false,o.label||'');else hideTimer();return;}
  if(o.t==='picked'){notice('🎲 抽到：'+o.name);return;}
  if(o.t==='notice'){notice(o.text);return;}
  if(o.t==='kicked'){_jDone=true;_leaving=true;notice('你已被房主移出房間');lockComposer();var f=$('fab');if(f)f.style.display='none';clearSession();setTimeout(function(){alert('你已被房主移出房間');cleanup();},200);return;}
}





