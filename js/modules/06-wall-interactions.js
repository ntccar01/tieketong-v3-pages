/* ---- delete own post ---- */
function removeMine(id){var p=findPost(id);if(!p||p.uid!==myId)return;if(!confirm('刪除這則貼文？'))return;
  applyRemove(id);
  if(isHost){hostBroadcast({t:'removed',id:id});}
  else if(hostConn&&hostConn.open){tSend(hostConn,{t:'delete',id:id});}}
function findPost(id){for(var i=0;i<feed.length;i++)if(feed[i].id===id)return feed[i];return null;}
function applyRemove(id){for(var i=0;i<feed.length;i++)if(feed[i].id===id){feed.splice(i,1);break;}
  var el=$('feed').querySelector('.card[data-id="'+cssEsc(id)+'"]');if(el)el.remove();
  if(!feed.length)renderFeed();saveSession();}
function cssEsc(s){return String(s).replace(/["\\\]]/g,'\\$&');}

/* ---- drag to reorder (pointer events, works on touch + mouse) ---- */
var _drag=null;
function startDrag(e,card,id){if(e.button&&e.button!==0)return;e.preventDefault();e.stopPropagation();
  _drag={card:card,id:id,moved:false,sx:e.clientX,sy:e.clientY};
  window.addEventListener('pointermove',onDragMove,{passive:false});
  window.addEventListener('pointerup',onDragUp);
  window.addEventListener('pointercancel',onDragUp);}
function onDragMove(e){if(!_drag)return;e.preventDefault();
  if(!_drag.moved){if(Math.abs(e.clientX-_drag.sx)+Math.abs(e.clientY-_drag.sy)<6)return;
    _drag.moved=true;_drag.card.classList.add('lift','drag');document.body.style.userSelect='none';}
  _drag.card.style.pointerEvents='none';
  var t=document.elementFromPoint(e.clientX,e.clientY);
  _drag.card.style.pointerEvents='';
  var over=t&&t.closest?t.closest('.card'):null;
  var feedEl=$('feed');
  if(!over||over===_drag.card||over.parentNode!==feedEl)return;
  var box=over.getBoundingClientRect();var before;
  if(e.clientY<box.top)before=true;else if(e.clientY>box.bottom)before=false;else before=e.clientX<(box.left+box.width/2);
  feedEl.insertBefore(_drag.card,before?over:over.nextSibling);}
function onDragUp(){if(!_drag)return;
  window.removeEventListener('pointermove',onDragMove);
  window.removeEventListener('pointerup',onDragUp);
  window.removeEventListener('pointercancel',onDragUp);
  document.body.style.userSelect='';
  var d=_drag;_drag=null;d.card.classList.remove('lift','drag');d.card.style.pointerEvents='';
  if(!d.moved)return;
  var ids=[];var els=$('feed').querySelectorAll('.card');for(var i=0;i<els.length;i++)ids.push(els[i].getAttribute('data-id'));
  applyOrder(ids);saveSession();
  if(isHost){hostBroadcast({t:'order',order:ids});}
  else if(hostConn&&hostConn.open){tSend(hostConn,{t:'reorder',order:ids});}}
function applyOrder(ids){var map={};for(var i=0;i<feed.length;i++)map[feed[i].id]=feed[i];
  var nf=[];for(var j=0;j<ids.length;j++)if(map[ids[j]]){nf.push(map[ids[j]]);delete map[ids[j]];}
  for(var k in map)nf.push(map[k]); // keep any not listed
  feed=nf;}
function reorderDOM(ids){var feedEl=$('feed');for(var i=0;i<ids.length;i++){var el=feedEl.querySelector('.card[data-id="'+cssEsc(ids[i])+'"]');if(el)feedEl.appendChild(el);}}
/* ---- 看板：拖曳卡片到其他欄位 ---- */
var _kdrag=null;
function startKanbanDrag(e,card,id){if(e.button&&e.button!==0)return;e.preventDefault();e.stopPropagation();
  _kdrag={card:card,id:id,moved:false,sx:e.clientX,sy:e.clientY,targetCol:null};
  window.addEventListener('pointermove',onKDragMove,{passive:false});
  window.addEventListener('pointerup',onKDragUp);window.addEventListener('pointercancel',onKDragUp);}
function onKDragMove(e){if(!_kdrag)return;e.preventDefault();
  if(!_kdrag.moved){if(Math.abs(e.clientX-_kdrag.sx)+Math.abs(e.clientY-_kdrag.sy)<6)return;_kdrag.moved=true;_kdrag.card.classList.add('lift','drag');document.body.style.userSelect='none';}
  _kdrag.card.style.pointerEvents='none';var t=document.elementFromPoint(e.clientX,e.clientY);_kdrag.card.style.pointerEvents='';
  var col=t&&t.closest?t.closest('.kcol'):null;
  document.querySelectorAll('.kcol').forEach(function(c){c.classList.toggle('kover',c===col);});
  _kdrag.targetCol=col?col.getAttribute('data-col'):null;}
function onKDragUp(){if(!_kdrag)return;
  window.removeEventListener('pointermove',onKDragMove);window.removeEventListener('pointerup',onKDragUp);window.removeEventListener('pointercancel',onKDragUp);
  document.body.style.userSelect='';document.querySelectorAll('.kcol').forEach(function(c){c.classList.remove('kover');});
  var d=_kdrag;_kdrag=null;d.card.classList.remove('lift','drag');d.card.style.pointerEvents='';
  if(!d.moved)return;var target=d.targetCol;var p=findPost(d.id);
  if(target&&p&&colOf(p)!==target)setCol(d.id,target);else renderFeed();}
function notice(t){toast(t);}
