/* ===================== helpers ===================== */
function $(id){return document.getElementById(id);}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function linkify(s){return esc(s).replace(/(https?:\/\/[^\s]+)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>');}
function fmtSize(b){if(b<1024)return b+' B';if(b<1048576)return (b/1024).toFixed(0)+' KB';return (b/1048576).toFixed(1)+' MB';}
function nowHM(){var d=new Date();return ('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2);}
function uid(){return Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4);}
function toast(t){var el=$('toast');el.textContent=t;el.classList.add('show');clearTimeout(el._t);el._t=setTimeout(function(){el.classList.remove('show');},1800);}
function showStatus(t,err){var s=$('status');s.textContent=t||'';s.className='status'+(err?' err':'');}
var AV_COLORS=['#a9761a','#7db4ee','#7ad6a0','#e89ad0','#e2954a','#9a9af0','#6fd0d0','#f0c060'];
function avColor(name){var h=0;for(var i=0;i<name.length;i++)h=(h*31+name.charCodeAt(i))>>>0;return AV_COLORS[h%AV_COLORS.length];}
function initial(name){name=(name||'?').trim();return name?name[0].toUpperCase():'?';}

/* ===================== state ===================== */
var APP_ROLE=(window.APP_ROLE||((document.body&&document.body.getAttribute('data-app-role'))||'teacher')).toLowerCase();
function appRole(){return APP_ROLE;}
function isStudentApp(){return APP_ROLE==='student';}
function isTeacherApp(){return APP_ROLE==='teacher';}
var FEATURE_PERMISSIONS={
  createRoom:{appRole:'teacher',message:'學生版無法建立或主持房間，請輸入老師提供的代碼加入課堂'},
  openHistory:{appRole:'teacher',message:'學生版無法導入或主持既有教室'},
  importRoomFile:{appRole:'teacher',message:'學生版無法匯入教室備份'},
  importRoom:{appRole:'teacher',message:'學生版無法導入或主持既有教室'},
  materials:{appRole:'teacher',hostOnly:true,message:'此功能限教師端房主使用'},
  projects:{appRole:'teacher',hostOnly:true,message:'此功能限教師端房主使用'},
  export:{appRole:'teacher',hostOnly:true,message:'匯出功能限教師端房主使用'},
  roll:{appRole:'teacher',hostOnly:true,message:'抽座號限教師端房主使用'},
  record:{appRole:'teacher',hostOnly:true,message:'錄製功能限教師端房主使用'},
  teach:{appRole:'teacher',hostOnly:true,message:'教師管理限房主使用'},
  kanban:{appRole:'teacher',hostOnly:true,message:'看板管理限房主使用'},
  share:{appRole:'teacher',hostOnly:true,message:'分享螢幕/鏡頭限教師端房主使用'},
  freeze:{appRole:'teacher',hostOnly:true,message:'凍結畫面限房主使用'},
  lockAll:{appRole:'teacher',hostOnly:true,message:'全班唯讀限房主使用'}
};
function canUseFeature(name){var rule=FEATURE_PERMISSIONS[name];if(!rule)return true;if(rule.appRole&&APP_ROLE!==rule.appRole)return false;if(rule.hostOnly&&!isHost)return false;if(rule.blockedWhenViewOnly&&myViewOnly)return false;return true;}
function guardFeature(name){if(canUseFeature(name))return true;var rule=FEATURE_PERMISSIONS[name]||{};var msg=rule.message||'目前無法使用此功能';try{if(typeof showStatus==='function'&&!isHost)showStatus(msg,true);else toast(msg);}catch(e){}return false;}
function blockedHostActionNames(){var out=[];for(var k in FEATURE_PERMISSIONS){var r=FEATURE_PERMISSIONS[k];if(r&&r.appRole==='teacher')out.push(k);}return out;}
var myName='', myId=uid(), isHost=false, roomCodeStr='';
var roomName='貼課通', selBg='';
var myViewOnly=false;
var allowOpen=true; // 學員是否可開啟/下載 檔案/PDF（房主控制）
var timerEnd=0,timerIv=null; // 共享倒數計時器
var roomPass='',maxMembers=0,pending={},myJoinPass='',maxPosts=0; // 房間密碼/人數上限/排隊/每人貼文上限
var roomAnnounce='',frozen=false; // 廣播公告 / 凍結畫面
var feed=[], members={}; // members: id -> {name}
var peer=null, conns={}, hostConn=null; // host: conns map id->conn; guest: hostConn
var attach=null; // {type:'image'|'file', dataUrl, name, size, mime, thumb}
var BG_COLORS=[{name:'預設深色',c:''},{name:'米白',c:'#f6efe0'},{name:'天藍',c:'#e6eef8'},{name:'薄荷',c:'#e7f4ec'},{name:'淺粉',c:'#f7ebef'},{name:'薰衣草',c:'#eee9f6'},{name:'淺灰',c:'#eef0f2'}];
function buildBgPick(){var w=$('bgPick');if(!w)return;w.innerHTML='';
  BG_COLORS.forEach(function(b,i){var d=document.createElement('div');d.className='bg-sw'+(b.c===selBg?' active':'');
    d.style.background=b.c||'linear-gradient(135deg,#faf4e6,#e7dcc2)';d.title=b.name;
    d.onclick=function(){selBg=b.c;var all=w.querySelectorAll('.bg-sw');for(var j=0;j<all.length;j++)all[j].classList.remove('active');d.classList.add('active');};
    w.appendChild(d);});}
function applyName(n){roomName=(n&&n.trim())||'貼課通';var t=$('roomTitle');if(t)t.textContent=roomName;document.title=roomName+' · 貼課通';}
function applyTheme(c){selBg=c||'';var f=$('feed');if(!f)return;if(c){f.style.background=c;f.classList.add('lightbg');}else{f.style.background='';f.classList.remove('lightbg');}}
var CARD_COLORS=[{n:'預設',c:''},{n:'白',c:'#ffffff'},{n:'紅',c:'#fde8e8'},{n:'橙',c:'#fdeedd'},{n:'黃',c:'#fbf6da'},{n:'綠',c:'#e7f4ea'},{n:'藍',c:'#e6eef9'},{n:'紫',c:'#efe9f7'}];
var selCard='';
function buildCcPick(){var w=$('ccPick');if(!w)return;w.innerHTML='';
  CARD_COLORS.forEach(function(b){var d=document.createElement('div');d.className='cc-sw'+(b.c===selCard?' active':'');
    d.style.background=b.c||'linear-gradient(135deg,#fdfbf5,#e7dcc2)';d.title=b.n;
    d.onclick=function(){selCard=b.c;var all=w.querySelectorAll('.cc-sw');for(var j=0;j<all.length;j++)all[j].classList.remove('active');d.classList.add('active');};
    w.appendChild(d);});}
var _lastCol='',editingId=null;
function openPost(editId){buildCcPick();editingId=null;_quoteRef=null;renderQuoteChip();
  var pg=$('pmGroup'),sel=$('postCol');
  if(kanbanOn&&columns.length){sel.innerHTML='';columns.forEach(function(cn){var o=document.createElement('option');o.value=cn;o.textContent=cn;sel.appendChild(o);});
    var myGrp=members[myId]&&members[myId].group;var def=(columns.indexOf(myGrp)>=0)?myGrp:(columns.indexOf(_lastCol)>=0?_lastCol:columns[0]);sel.value=def;pg.style.display='';}
  else pg.style.display='none';
  if(editId){var p=findPost(editId);if(p&&p.uid===myId){editingId=editId;$('subjIn').value=p.subject||'';$('msg').value=p.text||'';selCard=p.cardColor||'';buildCcPick();
    if(p.col&&kanbanOn)sel.value=p.col;$('pmTitle').textContent='編輯貼文';$('sendBtn').textContent='儲存';}}
  else{$('subjIn').value='';$('msg').value='';selCard='';$('pmTitle').textContent='張貼到牆上';$('sendBtn').textContent='發布';}
  $('postModal').classList.add('show');setTimeout(function(){$('subjIn').focus();},80);}
function closePost(){$('postModal').classList.remove('show');editingId=null;_quoteRef=null;renderQuoteChip();stopTyping();$('pmTitle').textContent='張貼到牆上';$('sendBtn').textContent='發布';}
