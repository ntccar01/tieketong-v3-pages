var pulse={}, myPulse='', pulseAgg={g:0,y:0,r:0,total:0};
var _shareOn=false, shareStream=null, shareCalls={}, shareKind='', _incomingCall=null;
var PULSE_DEF=[['g','\uD83D\uDFE2','跟得上'],['y','\uD83D\uDFE1','有點快'],['r','\uD83D\uDD34','聽不懂']];
function openPulse(){renderPulse();$('pulseModal').classList.add('show');}
function renderPulse(){var box=$('pulseBody');if(!box)return;
  var agg='<div class="pulse-agg">全班目前：'+PULSE_DEF.map(function(d){return d[1]+' '+(pulseAgg[d[0]]||0);}).join('\u3000')+'\u3000\u00b7\u3000已回應 '+pulseAgg.total+' 人</div>';
  if(isHost){var tot=pulseAgg.total||0;
    var rows=PULSE_DEF.map(function(d){var n=pulseAgg[d[0]]||0;var pct=tot?Math.round(n/tot*100):0;
      return '<div class="pulse-row"><div class="pl-lab">'+d[1]+' '+d[2]+'</div><div class="pl-track"><div class="pl-fill '+d[0]+'" style="width:'+pct+'%"></div></div><div class="pl-n">'+n+'<span>（'+pct+'%）</span></div></div>';}).join('');
    box.innerHTML=agg+'<div class="pulse-dash">'+rows+'</div><button class="btn btn-ghost" style="margin-top:14px" onclick="clearPulse()">\uD83E\uDDF9 清除全班理解度</button><div class="ms-hint" style="margin-top:8px">學生匿名回報，你只看到統計。講解中可隨時請大家更新。</div>';
  }else{
    var btns=PULSE_DEF.map(function(d){return '<button class="pulse-opt '+d[0]+(myPulse===d[0]?' on':'')+'" onclick="setMyPulse(\''+d[0]+'\')">'+d[1]+'<b>'+d[2]+'</b></button>';}).join('');
    box.innerHTML='<div class="pulse-opts">'+btns+'</div>'+agg+'<div class="ms-hint" style="margin-top:10px">匿名回報，老師只看到統計。聽不懂別客氣，點一下讓老師知道。</div>';
  }}
function setMyPulse(v){if(isHost)return;myPulse=(myPulse===v)?'':v;if(hostConn&&hostConn.open)tSend(hostConn,{t:'pulse',uid:myId,name:myName,v:myPulse});renderPulse();}
function pulseRecalc(){var g=0,y=0,r=0;for(var k in pulse){if(pulse[k]==='g')g++;else if(pulse[k]==='y')y++;else if(pulse[k]==='r')r++;}
  pulseAgg={g:g,y:y,r:r,total:g+y+r};hostBroadcast({t:'pulseagg',g:g,y:y,r:r,total:pulseAgg.total});
  if($('pulseModal').classList.contains('show'))renderPulse();updatePulseBtn();}
function clearPulse(){if(!isHost)return;pulse={};pulseAgg={g:0,y:0,r:0,total:0};hostBroadcast({t:'pulseclear'});if($('pulseModal').classList.contains('show'))renderPulse();updatePulseBtn();toast('已清除全班理解度');}
function updatePulseBtn(){var b=$('pulseBtn');if(!b)return;var r=isHost?(pulseAgg.r||0):0;b.innerHTML='\uD83D\uDEA6 理解度'+(r>0?(' <b>'+r+'</b>'):'');b.classList.toggle('rb-hot',r>0);}
function openShare(){if(!guardFeature('share'))return;renderShare();$('shareModal').classList.add('show');}
function renderShare(){var b=$('shareBody');if(!b)return;
  if(_shareOn){
    var prev=(shareKind==='cam')
      ? '<video id="sharePreview" class="share-prev" autoplay muted playsinline></video>'
      : '<div class="share-screennote">\uD83D\uDDA5\uFE0F 螢幕分享進行中<span>為避免畫面無限重複（鏡像迴圈），房主端不顯示即時預覽</span></div>';
    b.innerHTML='<div class="share-live">\uD83D\uDCE1 分享中（'+(shareKind==='cam'?'鏡頭':'螢幕')+'）\u00b7 已推送給 '+Object.keys(shareCalls).length+' 位</div>'+prev+'<button class="btn btn-gold" style="margin-top:12px" onclick="stopShare()">\u25A0 停止分享</button>';
    if(shareKind==='cam'){var v=$('sharePreview');if(v&&shareStream)v.srcObject=shareStream;}
  }else{
    b.innerHTML='<div class="share-pick"><button class="share-big" onclick="startShare(\'screen\')">\uD83D\uDDA5\uFE0F<b>分享螢幕</b><i>投影片／網頁／教材</i></button><button class="share-big" onclick="startShare(\'cam\')">\uD83D\uDCF7<b>分享鏡頭</b><i>實物／教具</i></button></div>'
      +'<div class="share-warn">\u26A0\uFE0F 請選擇「<b>單一視窗</b>」(例如你的簡報程式) 或某個「<b>分頁</b>」。為避免畫面無限重複（鏡像迴圈），本工具會自動<u>擋掉「整個螢幕」</u>分享。<br>同一台電腦測試時，學生端請另開<b>不同視窗</b>或用<b>另一台裝置</b>。</div>'
      +'<div class="ms-hint" style="margin-top:8px">畫面即時推送給全班。需以 <b>https</b> 或 localhost 開啟本頁才能擷取畫面；人數多時房主上傳頻寬較吃重，建議搭配 TURN。</div>';
  }}
function startShare(kind){if(!isHost)return;
  if(!navigator.mediaDevices||!(kind==='cam'?navigator.mediaDevices.getUserMedia:navigator.mediaDevices.getDisplayMedia)){toast('此環境不支援畫面擷取（需 https／localhost）');return;}
  var pr=kind==='cam'
    ? navigator.mediaDevices.getUserMedia({video:{width:{ideal:960},height:{ideal:540},frameRate:{ideal:15}},audio:false})
    : navigator.mediaDevices.getDisplayMedia({video:{frameRate:{ideal:10},displaySurface:'window'},audio:true,selfBrowserSurface:'exclude',monitorTypeSurfaces:'exclude',surfaceSwitching:'include'});
  pr.then(function(stream){
    var vt=stream.getVideoTracks()[0];var ds='';try{ds=(vt&&vt.getSettings&&vt.getSettings().displaySurface)||'';}catch(e){}
    if(kind==='screen'&&ds==='monitor'){stream.getTracks().forEach(function(t){try{t.stop();}catch(e){}});toast('偵測到「整個螢幕」分享，已自動取消以避免畫面無限重複；請改分享「單一視窗」（例如你的簡報）或某個「分頁」');return;}
    shareStream=stream;shareKind=kind;_shareOn=true;
    if(vt)vt.onended=function(){stopShare();};
    hostBroadcast({t:'sharestart',kind:kind});for(var pid in conns)shareCallGuest(pid);
    renderShare();updateShareBtn();toast('開始分享，已推送給全班');
  }).catch(function(e){toast('未開始分享：'+((e&&e.name)||'已取消'));});}
function shareCallGuest(pid){if(!shareStream||!peer)return;try{if(shareCalls[pid]){try{shareCalls[pid].close();}catch(e){}}
  var call=peer.call(pid,shareStream);if(!call)return;shareCalls[pid]=call;
  call.on('close',function(){delete shareCalls[pid];if($('shareModal').classList.contains('show'))renderShare();});
  call.on('error',function(){});}catch(e){}}
function stopShare(){if(!isHost)return;_shareOn=false;hostBroadcast({t:'sharestop'});
  for(var pid in shareCalls){try{shareCalls[pid].close();}catch(e){}}shareCalls={};
  if(shareStream){shareStream.getTracks().forEach(function(t){try{t.stop();}catch(e){}});shareStream=null;}
  renderShare();updateShareBtn();toast('已停止分享');}
function updateShareBtn(){var b=$('shareBtn');if(!b)return;b.innerHTML=_shareOn?'\uD83D\uDCF9 分享中':'\uD83D\uDCF9 分享';b.classList.toggle('rb-hot',_shareOn);}
function onIncomingShare(call){try{call.answer();}catch(e){}_incomingCall=call;
  call.on('stream',function(remote){showShareViewer(remote);});
  call.on('close',function(){hideShareViewer();});call.on('error',function(){});}
function showShareViewer(stream){var ov=$('shareViewer');if(!ov)return;var v=$('shareVid');if(v){v.srcObject=stream;if(v.play)v.play().catch(function(){});}
  ov.classList.add('show');var pill=$('sharePill');if(pill)pill.style.display='none';}
function hideShareViewer(){var ov=$('shareViewer');if(ov)ov.classList.remove('show');var v=$('shareVid');if(v){try{v.srcObject=null;}catch(e){}}var pill=$('sharePill');if(pill)pill.style.display='none';_incomingCall=null;}
function minShareViewer(){var ov=$('shareViewer');if(ov)ov.classList.remove('show');var pill=$('sharePill');if(pill&&_incomingCall)pill.style.display='';}
function reopenShareViewer(){var ov=$('shareViewer');if(ov)ov.classList.add('show');var pill=$('sharePill');if(pill)pill.style.display='none';}
function fsShareViewer(){var el=$('shareStage');if(!el)return;if(document.fullscreenElement){if(document.exitFullscreen)document.exitFullscreen();}else if(el.requestFullscreen){el.requestFullscreen().catch(function(){});}}
function closeToolMenus(exceptMenu){document.querySelectorAll('.tool-strip .tool-menu[open]').forEach(function(menu){if(menu!==exceptMenu)menu.open=false;});}
function initToolMenus(){var menus=document.querySelectorAll('.tool-strip .tool-menu');menus.forEach(function(menu){if(menu.dataset.menuBound)return;menu.dataset.menuBound='1';var summary=menu.querySelector('summary');if(summary)summary.addEventListener('click',function(){closeToolMenus(menu);});menu.addEventListener('toggle',function(){if(menu.open)closeToolMenus(menu);});});
  document.addEventListener('click',function(e){var menu=e.target.closest&&e.target.closest('.tool-strip .tool-menu');if(menu)return;closeToolMenus();});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')closeToolMenus();});
  document.addEventListener('click',function(e){if(!(e.target.closest&&e.target.closest('.tool-strip .tool-popover button')))return;setTimeout(function(){closeToolMenus();},0);});}
(function(){var m=$('msg');if(m)m.addEventListener('input',flagTyping);try{if(localStorage.getItem('shr_theme')==='dark')document.body.classList.add('theme-dark');}catch(e){}updateThemeBtn();try{loadMaterials();}catch(e){}initToolMenus();})();

