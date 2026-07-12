function memPosts(uid){var n=0;for(var i=0;i<feed.length;i++)if(feed[i].uid===uid)n++;return n;}
function memReactsGiven(uid){var n=0;feed.forEach(function(p){if(p.reactions)for(var em in p.reactions){if((p.reactions[em]||[]).indexOf(uid)>=0)n++;}});return n;}
function memReceived(uid){var sc=0,cm=0;feed.forEach(function(p){if(p.uid===uid){sc+=postScore(p);cm+=(p.comments&&p.comments.length)||0;}});return {score:sc,comments:cm};}
/* --- 點名 / 出席 --- */
function openRoster(){var l=$('rosterList');l.innerHTML='';
  memberArray().forEach(function(m){var rec=memReceived(m.id);var d=document.createElement('div');d.className='roster-row';
    var grp=members[m.id]&&members[m.id].group?'<span class="r-grp">'+esc(members[m.id].group)+'</span>':'';
    var ck=members[m.id]&&members[m.id].checkedIn?'<span class="r-ck on">✅ 已簽到</span>':'<span class="r-ck">在線</span>';
    d.innerHTML='<div class="r-av" style="background:'+avColor(m.name)+'">'+initial(m.name)+'</div>'+
      '<div class="r-main"><div class="r-nm">'+esc(m.name)+(m.id===myId?' <small>（我）</small>':'')+grp+'</div>'+
      '<div class="r-stat">'+ck+' · 貼文 '+memPosts(m.id)+' · 得分 '+rec.score+' · 互動 '+memReactsGiven(m.id)+'</div></div>';
    l.appendChild(d);});
  var on=memberArray().length,ck=memberArray().filter(function(m){return members[m.id]&&members[m.id].checkedIn;}).length;
  $('rosterSum').textContent='在線 '+on+' 人・已簽到 '+ck+' 人';
  $('rosterModal').classList.add('show');}
function startRollcall(){if(!isHost)return;for(var id in members)if(id!==myId)members[id].checkedIn=false;hostBroadcast({t:'rollcall'});notice('📋 已發起簽到，請學員點「我在」');openRoster();}
function doCheckin(){if(isHost)return;if(hostConn&&hostConn.open)tSend(hostConn,{t:'checkin',uid:myId});$('checkinBar').style.display='none';toast('已簽到 ✅');}
/* --- 自動分組 --- */
function autoGroup(){if(!isHost)return;if(!kanbanOn||!columns.length){toast('請先開啟看板分欄');return;}
  var ids=memberArray().map(function(m){return m.id;}).filter(function(id){return id!==myId;});
  if(!ids.length){toast('目前沒有學員');return;}
  // shuffle then round-robin into columns for balance
  for(var i=ids.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=ids[i];ids[i]=ids[j];ids[j]=t;}
  var groups={};ids.forEach(function(id,idx){groups[id]=columns[idx%columns.length];});
  applyGroups(groups);hostBroadcast({t:'autogroup',groups:groups});saveSession();toast('已隨機把 '+ids.length+' 位學員分配到 '+columns.length+' 欄');}
function applyGroups(groups){for(var id in groups){if(members[id])members[id].group=groups[id];}
  feed.forEach(function(p){if(groups[p.uid]&&columns.indexOf(groups[p.uid])>=0)p.col=groups[p.uid];});renderFeed();}
/* --- 廣播公告（跑馬燈） --- */
function askAnnounce(){if(!isHost)return;var t=prompt('輸入要跑馬燈公告的文字（留空可清除）：',roomAnnounce||'');if(t===null)return;setAnnounce(t.trim());}
function setAnnounce(text){roomAnnounce=text||'';showAnnounce(roomAnnounce);if(isHost){hostBroadcast({t:'announce',text:roomAnnounce});saveSession();}}
function showAnnounce(text){var bar=$('announceBar');if(!text){bar.style.display='none';bar.innerHTML='';return;}
  bar.style.display='';bar.innerHTML='<div class="ann-track"><span>📢 '+esc(text)+'</span><span>📢 '+esc(text)+'</span></div>'+(isHost?'<button class="ann-x" onclick="setAnnounce(\'\')">✕</button>':'');}
/* --- 凍結畫面 --- */
function toggleFreeze(){if(!guardFeature('freeze'))return;frozen=!frozen;hostBroadcast({t:'freeze',on:frozen});if($('teachModal')&&$('teachModal').classList.contains('show'))openTeach();toast(frozen?'已凍結學員畫面':'已解除凍結');saveSession();}
function openTeach(){if(!guardFeature('teach'))return;
  $('teachTools').innerHTML='<button class="tbtn" onclick="closeTeach();openPollSetup()">🗳️ 快問快答</button>'+
    '<button class="tbtn" onclick="closeTeach();openCloudSetup()">☁️ 即時文字雲</button>'+
    '<button class="tbtn" onclick="closeTeach();openRoster()">📋 點名／出席</button>'+
    '<button class="tbtn" onclick="closeTeach();autoGroup()">🎲 自動分組</button>'+
    '<button class="tbtn" onclick="askAnnounce()">📢 廣播公告</button>'+
    '<button class="tbtn'+(frozen?' active':'')+'" onclick="toggleFreeze()">🧊 '+(frozen?'解除凍結':'凍結畫面')+'</button>'+
    '<button class="tbtn" onclick="closeTeach();exportRoster()">🧾 個人成績單</button>';
  $('teachModal').classList.add('show');}
function closeTeach(){$('teachModal').classList.remove('show');}
function applyFreeze(on){var ov=$('freezeOverlay');if(on&&!isHost){ov.style.display='flex';}else{ov.style.display='none';}}
/* --- 個人成績單匯出 --- */
function exportRoster(){if(!isHost)return;function q(s){s=String(s==null?'':s);return '"'+s.replace(/"/g,'""')+'"';}
  var rows=[['姓名','組別','已簽到','貼文數','得分','收到留言','給出互動']];
  memberArray().forEach(function(m){var rec=memReceived(m.id);var mm=members[m.id]||{};
    rows.push([q(m.name),q(mm.group||''),q(mm.checkedIn?'是':'否'),q(memPosts(m.id)),q(rec.score),q(rec.comments),q(memReactsGiven(m.id))]);});
  var csv='\ufeff'+rows.map(function(r){return r.join(',');}).join('\r\n');
  dl('個人成績單_'+safeName(roomName)+'.csv',new Blob([csv],{type:'text/csv'}));toast('已匯出個人成績單');}
/* ===================== 🗳️ 即時投票／問答 ===================== */
var activePoll=null,myChoices=[],myAnswer='';
function pollTypeChange(){var t=document.querySelector('input[name="ptype"]:checked').value,showChoices=(t==='single'||t==='multi');$('pollOpts').style.display=showChoices?'':'none';var wrap=$('pollLabelStyleWrap');if(wrap)wrap.style.display=showChoices?'':'none';}
function openPollSetup(){if(!isHost)return;$('pollQ').value='';$('pollOpts').value='';document.querySelector('input[name="ptype"][value="single"]').checked=true;var style=document.querySelector('input[name="pollLabelStyle"][value="alpha"]');if(style)style.checked=true;pollTypeChange();$('pollSetup').classList.add('show');setTimeout(function(){$('pollQ').focus();},80);}
function startPoll(){if(!isHost)return;var q=($('pollQ').value||'').trim();if(!q){toast('請輸入題目');return;}
  var type=document.querySelector('input[name="ptype"]:checked').value;var style=document.querySelector('input[name="pollLabelStyle"]:checked');var optionStyle=(type==='single'||type==='multi')?(style?style.value:'alpha'):'';var opts;
  if(type==='tf')opts=['O','X'];
  else if(type==='text')opts=[];
  else{opts=($('pollOpts').value||'').split('\n').map(function(s){return s.trim();}).filter(Boolean).slice(0,8);if(opts.length<2){toast('請至少輸入 2 個選項');return;}}
  activePoll={id:uid(),q:q,type:type,options:opts,optionStyle:optionStyle,open:true,votes:{},counts:opts.map(function(){return 0;}),total:0,answers:[],ansMap:{}};
  $('pollSetup').classList.remove('show');myChoices=[];myAnswer='';showPoll(activePoll);hostBroadcast({t:'pollstart',poll:pollPublic(activePoll)});}
function pollPublic(p){var o={id:p.id,q:p.q,type:p.type,options:p.options,optionStyle:p.optionStyle||'',open:p.open};if(p.type==='text')o.answers=p.answers||[];else{o.counts=p.counts;o.total=p.total;}return o;}
function tallyPoll(p){var c=p.options.map(function(){return 0;});var v=0;for(var uid in p.votes){v++;p.votes[uid].forEach(function(i){if(i>=0&&i<c.length)c[i]++;});}p.counts=c;p.total=v;}
function setAnswer(p,uid,name,text){p.ansMap=p.ansMap||{};p.ansMap[uid]={name:name,text:text};p.answers=Object.keys(p.ansMap).map(function(u){return p.ansMap[u];});}
function pollOptionMark(p,i){if(p.type==='tf')return i===0?'O':'X';if(p.optionStyle==='alpha')return String.fromCharCode(65+i);if(p.optionStyle==='number')return ''+(i+1);return '';}
function showPoll(p){$('pollQText').textContent=p.q;
  var tag=p.type==='single'?'選擇題':p.type==='multi'?'複選題（可多選後送出）':p.type==='tf'?'是非題（O／X）':'簡答題';
  $('pollTypeTag').textContent=tag+(p.open?'':' · 已結束');
  var body=$('pollBody');body.innerHTML='';var foot=$('pollFoot');foot.innerHTML='';
  if(p.type==='text'){
    var ans=p.answers||[];
    if(!ans.length){var em=document.createElement('div');em.className='poll-empty';em.textContent=p.open?'等待學員作答…':'沒有人作答';body.appendChild(em);}
    ans.forEach(function(a){var row=document.createElement('div');row.className='poll-ans';row.innerHTML='<b>'+esc(a.name||'?')+'</b><span>'+esc(a.text)+'</span>';body.appendChild(row);});
    if(p.open){var iw=document.createElement('div');iw.className='poll-ansinput';
      var ip=document.createElement('input');ip.id='pollAnsIn';ip.maxLength=200;ip.placeholder='輸入你的答案…';ip.value=myAnswer||'';
      ip.onkeydown=function(e){if(e.key==='Enter'){e.preventDefault();submitTextAnswer();}};
      var sb=document.createElement('button');sb.className='btn btn-gold';sb.textContent=(myAnswer?'更新答案':'送出答案');sb.onclick=submitTextAnswer;
      iw.appendChild(ip);iw.appendChild(sb);foot.appendChild(iw);}
    foot.appendChild(Object.assign(document.createElement('div'),{className:'poll-total',textContent:'已作答 '+ans.length+' 人'}));
  } else {
    p.options.forEach(function(opt,i){var row=document.createElement('button');row.className='poll-opt'+(myChoices.indexOf(i)>=0?' sel':'');row.setAttribute('data-i',i);
      var pct=p.total>0?Math.round((p.counts[i]/p.total)*100):0;
      var mark=pollOptionMark(p,i),label=(p.type==='tf'?'':esc(opt));row.innerHTML='<div class="poll-fill" style="width:'+pct+'%"></div>'+(mark?'<span class="poll-mark">'+mark+'</span>':'')+(label?'<span class="poll-label">'+label+'</span>':'')+'<span class="poll-count">'+p.counts[i]+'（'+pct+'%）</span>';
      row.onclick=function(){selectOpt(i);};body.appendChild(row);});
    if(p.type==='multi'&&p.open){var sb2=document.createElement('button');sb2.className='btn btn-gold';sb2.textContent='送出我的答案';sb2.onclick=submitVote;foot.appendChild(sb2);}
    foot.appendChild(Object.assign(document.createElement('div'),{className:'poll-total',textContent:'已作答 '+p.total+' 人'}));
  }
  if(isHost){var ctr=document.createElement('div');ctr.className='poll-host-ctrl';
    ctr.innerHTML=(p.open?'<button class="qbtn no" onclick="endPoll()">結束作答</button>':'')+'<button class="qbtn" onclick="closePoll()">關閉</button>';foot.appendChild(ctr);}
  $('pollModal').classList.add('show');}
function submitTextAnswer(){if(!activePollOpen())return;var el=$('pollAnsIn');if(!el)return;var t=(el.value||'').trim();if(!t)return;myAnswer=t;var p=activePoll;
  if(isHost){setAnswer(p,myId,myName,t);showPoll(p);hostBroadcast({t:'pollanswers',id:p.id,answers:p.answers});saveSession();}
  else if(hostConn&&hostConn.open){tSend(hostConn,{t:'pollanswer',id:p.id,text:t,uid:myId,name:myName});showPoll(p);toast('已送出答案');}}
function selectOpt(i){if(!activePollOpen())return;var p=activePoll;
  if(p.type==='multi'){var k=myChoices.indexOf(i);if(k>=0)myChoices.splice(k,1);else myChoices.push(i);showPoll(p);}
  else{myChoices=[i];submitVote();}}
function activePollOpen(){return activePoll&&activePoll.open;}
function submitVote(){if(!activePollOpen()||!myChoices.length)return;var p=activePoll;
  if(isHost){p.votes[myId]=myChoices.slice();tallyPoll(p);showPoll(p);hostBroadcast({t:'pollresult',id:p.id,counts:p.counts,total:p.total});saveSession();}
  else if(hostConn&&hostConn.open){tSend(hostConn,{t:'pollvote',id:p.id,choices:myChoices.slice(),uid:myId});showPoll(p);}}
function endPoll(){if(!isHost||!activePoll)return;activePoll.open=false;showPoll(activePoll);hostBroadcast({t:'pollend',id:activePoll.id});saveSession();}
function closePoll(){if(isHost)hostBroadcast({t:'pollclose'});hidePoll();activePoll=null;saveSession();}
function hidePoll(){$('pollModal').classList.remove('show');}
/* ===================== ✋ 舉手 / ❓ 匿名提問 ===================== */
var handsRaised={},myHandUp=false,questions=[];
var _hostNoteAction=null;
function hostNotify(text,action){if(!isHost)return;var el=$('hostNote');if(!el)return;el.textContent=text;el.classList.add('show');_hostNoteAction=action||null;try{beep();}catch(e){}clearTimeout(el._t);el._t=setTimeout(function(){el.classList.remove('show');},5000);}
function hostNoteClick(){var el=$('hostNote');el.classList.remove('show');var a=_hostNoteAction;_hostNoteAction=null;if(a)a();}
function updateQABadge(){var b=$('qaBtn');if(!b)return;var n=0;if(isHost)questions.forEach(function(q){if(!q.answered)n++;});b.innerHTML='❓ 提問'+(isHost&&n?(' <b>'+n+'</b>'):'');b.classList.toggle('rb-hot',isHost&&n>0);}
function handBtnClick(){if(isHost)openHands();else toggleHand();}
function updateHandBtn(){var b=$('handBtn');if(!b)return;
  if(isHost){var n=0;for(var k in handsRaised)n++;b.innerHTML='✋ 舉手'+(n?(' <b>'+n+'</b>'):'');b.classList.toggle('rb-hot',n>0);}
  else{b.textContent=myHandUp?'✋ 放下手':'✋ 舉手';b.classList.toggle('rb-hot',myHandUp);}}
function toggleHand(){if(isHost)return;
  if(!hostConn||!hostConn.open){toast('尚未連線到老師，請稍候再試');return;}
  myHandUp=!myHandUp;updateHandBtn();
  tSend(hostConn,{t:myHandUp?'handup':'handdown',uid:myId,name:myName});
  toast(myHandUp?'已舉手，等待老師':'已放下手');}
function openHands(){if(!isHost)return;var l=$('handsList');l.innerHTML='';
  var arr=[];for(var uid in handsRaised)arr.push({uid:uid,name:handsRaised[uid].name,ts:handsRaised[uid].ts});
  arr.sort(function(a,b){return a.ts-b.ts;});
  if(!arr.length){l.innerHTML='<div class="poll-empty">目前沒有人舉手</div>';}
  arr.forEach(function(m,idx){var d=document.createElement('div');d.className='roster-row';
    d.innerHTML='<div class="r-av" style="background:'+avColor(m.name)+'">'+(idx+1)+'</div><div class="r-main"><div class="r-nm">'+esc(m.name)+'</div><div class="r-stat">第 '+(idx+1)+' 位舉手</div></div>';
    var btn=document.createElement('button');btn.className='qbtn ok';btn.textContent='叫到';btn.onclick=function(){callOn(m.uid);};d.appendChild(btn);l.appendChild(d);});
  $('handsSum').textContent=arr.length+' 人舉手';$('handsModal').classList.add('show');}
function callOn(uid){if(!isHost)return;var nm=handsRaised[uid]&&handsRaised[uid].name;delete handsRaised[uid];updateHandBtn();openHands();
  hostBroadcast({t:'handack',uid:uid});notice('🙋 請 '+(nm||'該同學')+' 發言');}
function clearHands(){if(!isHost)return;handsRaised={};updateHandBtn();openHands();hostBroadcast({t:'handclear'});}
/* --- Q&A --- */
function qVotes(q){return (q.votes&&q.votes.length)||0;}
function openQA(){renderQA();$('qaModal').classList.add('show');}
function submitQuestion(){var t=($('qaIn').value||'').trim();if(!t)return;
  if(isHost){$('qaIn').value='';questions.push({id:uid(),text:t,votes:[],answered:false});qSyncAndRender();}
  else if(hostConn&&hostConn.open){$('qaIn').value='';tSend(hostConn,{t:'question',text:t});toast('已匿名送出');}
  else toast('尚未連線到老師，請稍候再試');}
function upvoteQuestion(qid){if(isHost){var q=findQ(qid);if(q){var k=q.votes.indexOf(myId);if(k>=0)q.votes.splice(k,1);else q.votes.push(myId);qSyncAndRender();}}
  else if(hostConn&&hostConn.open)tSend(hostConn,{t:'qvote',qid:qid,uid:myId});}
function findQ(qid){for(var i=0;i<questions.length;i++)if(questions[i].id===qid)return questions[i];return null;}
function toggleAnswered(qid){if(!isHost)return;var q=findQ(qid);if(q){q.answered=!q.answered;qSyncAndRender();}}
function deleteQuestion(qid){if(!isHost)return;questions=questions.filter(function(q){return q.id!==qid;});qSyncAndRender();}
function qSyncAndRender(){hostBroadcast({t:'questions',list:questions});renderQA();updateQABadge();if(isHost)saveSession();}
function sortedQuestions(){return questions.slice().sort(function(a,b){if(!!a.answered!==!!b.answered)return a.answered?1:-1;return qVotes(b)-qVotes(a);});}
function renderQA(){var l=$('qaList');if(!l)return;l.innerHTML='';var arr=sortedQuestions();
  if(!arr.length){l.innerHTML='<div class="poll-empty">還沒有人提問</div>';return;}
  arr.forEach(function(q){var d=document.createElement('div');d.className='qa-row'+(q.answered?' answered':'');
    var voted=q.votes&&q.votes.indexOf(myId)>=0;
    var up=document.createElement('button');up.className='qa-up'+(voted?' on':'');up.innerHTML='👍 '+qVotes(q);up.onclick=function(){upvoteQuestion(q.id);};
    var tx=document.createElement('div');tx.className='qa-text';tx.textContent=filterProfanity(q.text);
    d.appendChild(up);d.appendChild(tx);
    if(isHost){var a=document.createElement('button');a.className='qbtn';a.textContent=q.answered?'未答':'已答';a.onclick=function(){toggleAnswered(q.id);};
      var del=document.createElement('button');del.className='qbtn no';del.textContent='刪除';del.onclick=function(){deleteQuestion(q.id);};var spq=document.createElement('button');spq.className='qbtn';spq.textContent='🔦';spq.title='聚光燈放大給全班';spq.onclick=function(){spotlightQA(q);};d.appendChild(a);d.appendChild(del);d.appendChild(spq);}
    l.appendChild(d);});}
/* ===================== ☁️ 即時文字雲 ===================== */
var activeCloud=null;
function cloudPublic(c){return {id:c.id,q:c.q,open:c.open,words:c.words};}
function openCloudSetup(){if(!isHost)return;var q=prompt('文字雲題目（例如：用一個詞形容今天的課）：','');if(q===null)return;startCloud((q.trim()||'用一個詞表達你的想法'));}
function startCloud(q){activeCloud={id:uid(),q:q,open:true,words:{}};showCloud(activeCloud);hostBroadcast({t:'cloudstart',cloud:cloudPublic(activeCloud)});saveSession();}
function addCloudWord(c,w){if(!w)return;w=w.slice(0,24);c.words[w]=(c.words[w]||0)+1;}
function showCloud(c){$('cloudQText').textContent=c.q;$('cloudTag').textContent='即時文字雲'+(c.open?'':' · 已結束');
  renderCloud(c.words);var foot=$('cloudFoot');foot.innerHTML='';
  if(c.open){var iw=document.createElement('div');iw.className='poll-ansinput';
    var ip=document.createElement('input');ip.id='cloudIn';ip.maxLength=24;ip.placeholder='輸入一個詞，按送出…';
    ip.onkeydown=function(e){if(e.key==='Enter'){e.preventDefault();submitWord();}};
    var sb=document.createElement('button');sb.className='btn btn-gold';sb.textContent='送出';sb.onclick=submitWord;
    iw.appendChild(ip);iw.appendChild(sb);foot.appendChild(iw);}
  var tot=0;for(var k in c.words)tot+=c.words[k];
  foot.appendChild(Object.assign(document.createElement('div'),{className:'poll-total',textContent:'已收集 '+tot+' 個詞'}));
  if(isHost){var ctr=document.createElement('div');ctr.className='poll-host-ctrl';
    ctr.innerHTML=(c.open?'<button class="qbtn no" onclick="endCloud()">結束</button>':'')+'<button class="qbtn" onclick="closeCloud()">關閉</button>';foot.appendChild(ctr);}
  $('cloudModal').classList.add('show');}
function renderCloud(words){var wrap=$('cloudWrap');wrap.innerHTML='';
  var ents=Object.keys(words).map(function(w){return {w:w,n:words[w]};});
  if(!ents.length){wrap.innerHTML='<div class="poll-empty">等待大家輸入…</div>';return;}
  ents.sort(function(a,b){return b.n-a.n;});var max=ents[0].n;
  var pal=['#a9761a','#3f8a4c','#2f5fa0','#e3a3ff','#ffb3a3','#ffd98c','#a3e6d7'];
  ents.forEach(function(e,i){var sz=16+Math.round((e.n/max)*32);var sp=document.createElement('span');sp.className='cloud-word';
    sp.style.fontSize=sz+'px';sp.style.color=pal[i%pal.length];sp.textContent=e.w;sp.title=e.n+' 次';wrap.appendChild(sp);});}
function submitWord(){if(!activeCloud||!activeCloud.open)return;var el=$('cloudIn');if(!el)return;var w=(el.value||'').trim();if(!w)return;el.value='';el.focus();
  if(isHost){addCloudWord(activeCloud,w);showCloud(activeCloud);hostBroadcast({t:'cloudupdate',id:activeCloud.id,words:activeCloud.words});saveSession();}
  else if(hostConn&&hostConn.open){tSend(hostConn,{t:'cloudword',id:activeCloud.id,word:w});toast('已送出');}
  else toast('尚未連線到老師，請稍候再試');}
function endCloud(){if(!isHost||!activeCloud)return;activeCloud.open=false;showCloud(activeCloud);hostBroadcast({t:'cloudend',id:activeCloud.id});saveSession();}
function closeCloud(){if(isHost)hostBroadcast({t:'cloudclose'});hideCloud();activeCloud=null;saveSession();}
function hideCloud(){$('cloudModal').classList.remove('show');}
var REACTS=['👍','⭐','❤️','🎉'];
var REACT_PTS={'👍':1,'⭐':2,'❤️':3,'🎉':5};
function postScore(p){var s=0;REACTS.forEach(function(em){var l=(p.reactions&&p.reactions[em])||[];s+=l.length*REACT_PTS[em];});return s;}
function reactBar(p){var bar=document.createElement('div');bar.className='react-bar';
  REACTS.forEach(function(em){var list=(p.reactions&&p.reactions[em])||[];var mine=list.indexOf(myId)>=0;
    var b=document.createElement('button');b.className='react'+(mine?' on':'');b.title=em+' = '+REACT_PTS[em]+' 分';b.innerHTML=em+'<span>'+(list.length||'')+'</span>';
    b.onclick=function(ev){ev.stopPropagation();toggleReact(p.id,em);};bar.appendChild(b);});
  var sc=postScore(p);if(sc>0){var s=document.createElement('span');s.className='post-score';s.textContent='＝ '+sc+' 分';bar.appendChild(s);}
  var qbn=document.createElement('button');qbn.className='react act-btn';qbn.innerHTML='❝';qbn.title='引用回應';qbn.onclick=function(ev){ev.stopPropagation();quotePost(p.id);};bar.appendChild(qbn);
  if(isHost){var spb=document.createElement('button');spb.className='react act-btn';spb.innerHTML='🔦';spb.title='聚光燈：放大投影給全班';spb.onclick=function(ev){ev.stopPropagation();spotlightPost(p);};bar.appendChild(spb);}
  return bar;}
function applyReact(p,em,uid){if(!p.reactions)p.reactions={};var l=p.reactions[em]||(p.reactions[em]=[]);var i=l.indexOf(uid);if(i>=0)l.splice(i,1);else l.push(uid);}
function toggleReact(id,em){var p=findPost(id);if(!p)return;
  if(isHost){applyReact(p,em,myId);hostBroadcast({t:'reactset',id:id,reactions:p.reactions});refreshCard(id);saveSession();}
  else{applyReact(p,em,myId);refreshCard(id);if(hostConn&&hostConn.open)tSend(hostConn,{t:'react',id:id,emoji:em,uid:myId});}}
function computeScores(){var map={};feed.forEach(function(p){var uid=p.uid||p.name;var e=map[uid]||(map[uid]={name:p.name||'?',total:0,posts:0,counts:{'👍':0,'⭐':0,'❤️':0,'🎉':0}});
  e.name=p.name||e.name;e.posts++;REACTS.forEach(function(em){var c=((p.reactions&&p.reactions[em])||[]).length;e.counts[em]+=c;e.total+=c*REACT_PTS[em];});});
  var arr=[];for(var k in map)arr.push(map[k]);arr.sort(function(a,b){return b.total-a.total;});return arr;}
function openScores(){var arr=computeScores();var l=$('scoreList');l.innerHTML='';
  var withScore=arr.filter(function(e){return e.total>0;});
  if(!withScore.length){l.innerHTML='<div class="score-empty">還沒有任何評分<br>在貼文下方按 👍 ⭐ ❤️ 🎉 即可累積分數</div>';$('scoreModal').classList.add('show');return;}
  arr.forEach(function(e,i){if(e.total<=0)return;var rank=i+1;var medal=rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':(rank+'');
    var d=document.createElement('div');d.className='score-item'+(rank<=3?' top':'');
    d.innerHTML='<div class="sc-rank">'+medal+'</div>'+
      '<div class="sc-info"><div class="sc-name">'+esc(e.name)+'</div>'+
      '<div class="sc-break">'+e.posts+' 則 · 👍'+e.counts['👍']+' ⭐'+e.counts['⭐']+' ❤️'+e.counts['❤️']+' 🎉'+e.counts['🎉']+'</div></div>'+
      '<div class="sc-total">'+e.total+'<span>分</span></div>';
    l.appendChild(d);});
  $('scoreModal').classList.add('show');}
function lockedFileCard(p){var c=document.createElement('div');c.className='filecard locked';
  var isPdf=(p.mime==='application/pdf')||/\.pdf$/i.test(p.fname||'');
  c.innerHTML='<div class="ic">'+(isPdf?'📄':'📎')+'</div><div class="fi"><div class="fn">'+esc(p.fname||'檔案')+'</div><div class="fs">🔒 房主已限制開啟</div></div>';
  return c;}
function fileCard(p){var c=document.createElement('div');c.className='filecard';
  var isPdf=(p.mime==='application/pdf')||/\.pdf$/i.test(p.fname||'');
  c.innerHTML='<div class="ic">'+(isPdf?'📄':'📎')+'</div><div class="fi"><div class="fn">'+esc(p.fname||'檔案')+'</div><div class="fs">'+fmtSize(p.fsize||0)+'</div></div>';
  var b=document.createElement('button');b.className='open';b.textContent='開啟';
  b.onclick=function(){openFile(p);};c.appendChild(b);return c;}
function dataURLtoBlob(u){var a=u.split(',');var m=(a[0].match(/:(.*?);/)||[])[1]||'application/octet-stream';var bin=atob(a[1]);var n=bin.length;var arr=new Uint8Array(n);for(var i=0;i<n;i++)arr[i]=bin.charCodeAt(i);return new Blob([arr],{type:m});}
function openFile(p){try{var url=URL.createObjectURL(dataURLtoBlob(p.dataUrl));var w=window.open(url,'_blank');
  if(!w){var a=document.createElement('a');a.href=url;a.download=p.fname||'file';document.body.appendChild(a);a.click();a.remove();}
  setTimeout(function(){URL.revokeObjectURL(url);},60000);}catch(e){toast('無法開啟檔案');}}
function openLightbox(u){$('lbImg').src=u;$('lightbox').classList.add('show');}
function scrollFeed(){var f=$('feed');setTimeout(function(){f.scrollTop=f.scrollHeight;},30);}

