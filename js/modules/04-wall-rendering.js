/* ===================== rendering ===================== */
var kanbanOn=false,columns=[];
function colOf(p){var c=p.col;if(c&&columns.indexOf(c)>=0)return c;return columns[0];}
function renderFeed(){var f=$('feed');f.innerHTML='';f.classList.remove('kanban');
  if(!feed.length){f.classList.add('empty');f.innerHTML='<div class="wall-empty">還沒有任何貼文 ✨<br>貼上文字、圖片或 PDF，大家都會看到</div>';return;}
  f.classList.remove('empty');
  var list=displayPosts();
  if(!list.length){f.innerHTML='<div class="wall-empty">沒有符合條件的貼文 🔍<br>試試其他關鍵字或清除篩選</div>';return;}
  if(kanbanOn&&columns.length){f.classList.add('kanban');
    columns.forEach(function(cn){var col=document.createElement('div');col.className='kcol';col.setAttribute('data-col',cn);
      var inCol=list.filter(function(p){return colOf(p)===cn;});
      col.innerHTML='<div class="kcol-head">'+esc(cn)+'<span>'+inCol.length+'</span></div>';
      var body=document.createElement('div');body.className='kcol-body';
      inCol.forEach(function(p){body.appendChild(buildCard(p));});
      col.appendChild(body);f.appendChild(col);});
    return;}
  for(var i=0;i<list.length;i++)f.appendChild(buildCard(list[i]));}
function addPostEl(p){if((kanbanOn&&columns.length)||filterActive()||p.pinned){renderFeed();return;}
  var f=$('feed');if(f.classList.contains('empty')){f.classList.remove('empty');f.innerHTML='';}
  f.appendChild(buildCard(p));}
function buildCard(p){
  var mine=p.uid===myId;
  var card=document.createElement('div');card.className='card'+(mine?' mine':'')+(p.cardColor?' lightcard':'');card.setAttribute('data-id',p.id);
  if(p.cardColor)card.style.background=p.cardColor;
  var h=document.createElement('div');h.className='card-h';
  var av=document.createElement('div');av.className='av';av.style.background=avColor(p.name||'?');av.textContent=initial(p.name);
  var who=document.createElement('div');who.className='who';who.innerHTML='<b>'+esc(p.name||'?')+'</b><time>'+esc(p.ts||'')+'</time>';
  h.appendChild(av);h.appendChild(who);
  var grip=document.createElement('div');grip.className='grip';grip.textContent='⠿';grip.title='拖動排序';
  grip.addEventListener('pointerdown',function(e){startDrag(e,card,p.id);});
  if(!kanbanOn)h.appendChild(grip);
  if(kanbanOn&&columns.length&&(isHost||mine)){
    var kgrip=document.createElement('div');kgrip.className='grip kgrip';kgrip.textContent='⠿';kgrip.title='拖曳到其他欄位';
    kgrip.addEventListener('pointerdown',function(e){startKanbanDrag(e,card,p.id);});h.appendChild(kgrip);
    var sel=document.createElement('select');sel.className='kmove';sel.title='移動到欄位';
    columns.forEach(function(cn){var o=document.createElement('option');o.value=cn;o.textContent=cn;if(colOf(p)===cn)o.selected=true;sel.appendChild(o);});
    sel.onchange=function(e){e.stopPropagation();setCol(p.id,sel.value);};sel.onclick=function(e){e.stopPropagation();};h.appendChild(sel);}
  if(isHost){var pin=document.createElement('button');pin.className='del pinbtn'+(p.pinned?' on':'');pin.textContent='📌';pin.title=p.pinned?'取消置頂':'置頂／精選';
    pin.onclick=function(){togglePin(p.id);};h.appendChild(pin);}
  if(iCanDraw()){var anb=document.createElement('button');anb.className='del anbtn';anb.textContent='✏️';anb.title='在這張卡片上塗鴉標註';
    anb.onclick=function(){annotateCard(p.id);};h.appendChild(anb);}
  if(mine){var edt=document.createElement('button');edt.className='del editbtn';edt.textContent='✎';edt.title='編輯我的貼文';
    edt.onclick=function(){openPost(p.id);};h.appendChild(edt);}
  if(mine){var del=document.createElement('button');del.className='del';del.textContent='✕';del.title='刪除我的貼文';
    del.onclick=function(){removeMine(p.id);};h.appendChild(del);}
  card.appendChild(h);
  if(p.pinned){card.classList.add('pinned');var pb=document.createElement('div');pb.className='pin-badge';pb.textContent='📌 精選';card.appendChild(pb);}
  if(p.quote){var qbk=document.createElement('div');qbk.className='quote-block';qbk.innerHTML='❝ 回應 <b>@'+esc(p.quote.name||'')+'</b>：'+esc(p.quote.snippet||'');card.appendChild(qbk);}
  if(p.subject){var ti=document.createElement('div');ti.className='card-title';ti.textContent=filterProfanity(p.subject);card.appendChild(ti);}
  if(p.text){var tx=document.createElement('div');tx.className='txt';tx.innerHTML=mentionify(linkify(filterProfanity(p.text)));card.appendChild(tx);}
  var tags=parseTags(p.text);if(tags.length){var tw=document.createElement('div');tw.className='tagwrap';
    tags.forEach(function(tg){var c=document.createElement('button');c.className='tagchip';c.textContent='#'+tg;c.onclick=function(e){e.stopPropagation();filterByTag(tg);};tw.appendChild(c);});card.appendChild(tw);}
  if(p.type==='image'&&p.dataUrl){var iw=document.createElement('div');iw.className='imgwrap';
    var im=document.createElement('img');im.className='shot';im.src=p.dataUrl;im.onclick=function(){openLightbox(p.dataUrl);};iw.appendChild(im);
    card.appendChild(iw);}
  if(p.type==='video'&&p.dataUrl){var vd=document.createElement('video');vd.className='shot vid';vd.src=p.dataUrl;vd.controls=true;vd.playsInline=true;vd.preload='metadata';card.appendChild(vd);
    if(p.fname){var vn=document.createElement('div');vn.className='medianame';vn.textContent='🎬 '+p.fname;card.appendChild(vn);}}
  if(p.type==='audio'&&p.dataUrl){if(p.fname){var an=document.createElement('div');an.className='medianame';an.textContent='🎵 '+p.fname;card.appendChild(an);}
    var au=document.createElement('audio');au.className='aud';au.src=p.dataUrl;au.controls=true;au.preload='metadata';card.appendChild(au);}
  if(p.type==='file'&&p.dataUrl){
    if(p.thumb){var th=document.createElement('img');th.className='filethumb';th.src=p.thumb;th.title='開啟檔案';th.onclick=function(){openFile(p);};card.appendChild(th);}
    card.appendChild(fileCard(p));}
  if(p.type==='file'&&!p.dataUrl){card.appendChild(lockedFileCard(p));}
  if(p.anno){var al=document.createElement('img');al.className='annolayer';al.src=p.anno;card.appendChild(al);}
  card.appendChild(reactBar(p));
  card.appendChild(commentBlock(p));
  return card;}
var expandedComments={};
function commentBlock(p){var wrap=document.createElement('div');wrap.className='cmt-wrap';
  var n=(p.comments&&p.comments.length)||0;
  var tg=document.createElement('button');tg.className='cmt-toggle'+(n?' has':'');tg.textContent='💬 留言'+(n?(' '+n):'');
  tg.onclick=function(ev){ev.stopPropagation();if(expandedComments[p.id])delete expandedComments[p.id];else expandedComments[p.id]=1;refreshCard(p.id);};
  wrap.appendChild(tg);
  if(expandedComments[p.id]){var panel=document.createElement('div');panel.className='cmt-panel';
    (p.comments||[]).forEach(function(c){var row=document.createElement('div');row.className='cmt-row';
      row.innerHTML='<div class="cmt-meta"><b>'+esc(c.name||'?')+'</b><time>'+esc(c.ts||'')+'</time></div><div class="cmt-text">'+linkify(c.text||'')+'</div>';panel.appendChild(row);});
    if(!n){var em=document.createElement('div');em.className='cmt-empty';em.textContent='還沒有留言';panel.appendChild(em);}
    var ipw=document.createElement('div');ipw.className='cmt-input';var ip=document.createElement('input');ip.maxLength=200;ip.placeholder='輸入留言…';
    ip.onkeydown=function(e){if(e.key==='Enter'){e.preventDefault();addComment(p.id,ip.value);}};ip.onclick=function(e){e.stopPropagation();};
    var sd=document.createElement('button');sd.textContent='送出';sd.onclick=function(e){e.stopPropagation();addComment(p.id,ip.value);};
    ipw.appendChild(ip);ipw.appendChild(sd);panel.appendChild(ipw);wrap.appendChild(panel);}
  return wrap;}
function addComment(id,text){text=(text||'').trim();if(!text)return;var p=findPost(id);if(!p)return;if(!p.comments)p.comments=[];
  var c={name:myName,text:text,ts:nowHM()};
  if(isHost){p.comments.push(c);hostBroadcast({t:'commentset',id:id,comments:p.comments});refreshCard(id);saveSession();}
  else{p.comments.push(c);refreshCard(id);if(hostConn&&hostConn.open)tSend(hostConn,{t:'comment',id:id,comment:c});}}
/* ===================== 看板分欄 ===================== */
function setCol(id,col){var p=findPost(id);if(!p)return;
  if(isHost){p.col=col;hostBroadcast({t:'colset',id:id,col:col});renderFeed();saveSession();}
  else{p.col=col;renderFeed();if(hostConn&&hostConn.open)tSend(hostConn,{t:'setcol',id:id,col:col});}}
function applyKanban(on,cols){kanbanOn=!!on;columns=(cols||[]).slice(0,8);renderFeed();}
function openKanban(){if(!guardFeature('kanban'))return;$('kbToggle').checked=kanbanOn;$('kbCols').value=(columns.length?columns:['第一組','第二組','第三組']).join('\n');$('kanbanModal').classList.add('show');}
function applyKanbanFromUI(){var on=$('kbToggle').checked;var cols=($('kbCols').value||'').split(/[\n,，]/).map(function(s){return s.trim();}).filter(Boolean).slice(0,8);
  if(on&&!cols.length){toast('請至少輸入一個欄位名稱');return;}
  kanbanOn=on;columns=cols;$('kanbanModal').classList.remove('show');renderFeed();
  hostBroadcast({t:'kanban',on:kanbanOn,columns:columns});saveSession();toast(kanbanOn?'已開啟看板分欄':'已切回牆面模式');}
function kbPreset(which){var map={group:'第一組\n第二組\n第三組\n第四組',progress:'待討論\n進行中\n已完成',topic:'主題A\n主題B\n主題C'};$('kbCols').value=map[which]||'';$('kbToggle').checked=true;}
/* ===================== 貼文強化：置頂 / 標籤 / 搜尋篩選 ===================== */
function setMaxPosts(v){if(!isHost)return;maxPosts=Math.max(0,parseInt(v,10)||0);hostBroadcast({t:'maxposts',n:maxPosts});saveSession();toast(maxPosts?('每人貼文上限：'+maxPosts+' 則'):'已取消貼文上限');}
function togglePin(id){if(!isHost)return;var p=findPost(id);if(!p)return;p.pinned=!p.pinned;hostBroadcast({t:'pinset',id:id,on:p.pinned});renderFeed();saveSession();}
function parseTags(text){if(!text)return [];var out=[],seen={},m,re=/#([0-9A-Za-z_\u4e00-\u9fff]{1,20})/g;while((m=re.exec(text))){var t=m[1];if(!seen[t.toLowerCase()]){seen[t.toLowerCase()]=1;out.push(t);}}return out;}
var _filter={kw:'',author:'',col:''};
function filterActive(){return !!(_filter.kw||_filter.author||_filter.col);}
function matchFilter(p){if(_filter.author&&p.uid!==_filter.author)return false;
  if(_filter.col&&colOf(p)!==_filter.col)return false;
  if(_filter.kw){var kw=_filter.kw.toLowerCase().replace(/^#/,'');var hay=((p.subject||'')+' '+(p.text||'')+' '+(p.name||'')).toLowerCase();if(hay.indexOf(kw)<0)return false;}
  return true;}
function displayPosts(){var vis=feed.filter(matchFilter);var pin=[],rest=[];vis.forEach(function(p){(p.pinned?pin:rest).push(p);});return pin.concat(rest);}
function filterByTag(tg){openFilterBar(true);_filter.kw='#'+tg;$('fltKw').value='#'+tg;renderFeed();}
function openFilterBar(show){var b=$('filterBar');if(show===undefined)show=b.style.display==='none';b.style.display=show?'':'none';if(show)buildFilterAuthors();}
function buildFilterAuthors(){var s=$('fltAuthor');if(!s)return;var cur=s.value;s.innerHTML='<option value="">全部作者</option>';
  var seen={};feed.forEach(function(p){if(p.uid&&!seen[p.uid]){seen[p.uid]=1;var o=document.createElement('option');o.value=p.uid;o.textContent=p.name||'?';s.appendChild(o);}});s.value=cur;
  var cs=$('fltCol');if(cs){cs.style.display=(kanbanOn&&columns.length)?'':'none';if(kanbanOn){var cc=cs.value;cs.innerHTML='<option value="">全部欄位</option>';columns.forEach(function(cn){var o=document.createElement('option');o.value=cn;o.textContent=cn;cs.appendChild(o);});cs.value=cc;}}}
function applyFilterUI(){_filter.kw=($('fltKw').value||'').trim();_filter.author=$('fltAuthor').value||'';_filter.col=($('fltCol')&&kanbanOn)?($('fltCol').value||''):'';renderFeed();}
function clearFilter(){_filter={kw:'',author:'',col:''};$('fltKw').value='';if($('fltAuthor'))$('fltAuthor').value='';if($('fltCol'))$('fltCol').value='';renderFeed();}
/* ===================== 🧑‍🏫 教師管理 ===================== */
