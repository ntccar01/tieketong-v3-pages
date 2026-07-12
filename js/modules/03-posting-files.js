/* ===================== posting ===================== */
function countMyPosts(){var n=0;for(var i=0;i<feed.length;i++)if(feed[i].uid===myId)n++;return n;}
function sendPost(){var txt=($('msg').value||'').trim();var subj=($('subjIn').value||'').trim();
  if(!txt&&!attach&&!subj)return;
  if(editingId){var ep=findPost(editingId);if(ep&&ep.uid===myId){ep.subject=subj||'';ep.text=txt;ep.cardColor=selCard||'';
      if(kanbanOn&&columns.length){var ec=$('postCol').value;if(columns.indexOf(ec)>=0)ep.col=ec;}
      refreshCard(editingId);renderFeed();
      if(isHost){hostBroadcast({t:'postedit',id:editingId,subject:ep.subject,text:ep.text,cardColor:ep.cardColor,col:ep.col});}
      else if(hostConn&&hostConn.open){tSend(hostConn,{t:'editpost',id:editingId,subject:ep.subject,text:ep.text,cardColor:ep.cardColor,col:ep.col});}
      $('msg').value='';$('subjIn').value='';selCard='';autoGrow();clearAttach();closePost();saveSession();}return;}
  if(!isHost&&maxPosts>0&&countMyPosts()>=maxPosts){toast('已達每人貼文上限（'+maxPosts+' 則）');return;}
  var post={id:uid(),uid:myId,name:myName,ts:nowHM()};
  if(_quoteRef)post.quote=_quoteRef;
  if(subj)post.subject=subj;
  if(selCard)post.cardColor=selCard;
  if(kanbanOn&&columns.length){var pc=$('postCol').value;if(columns.indexOf(pc)>=0){post.col=pc;_lastCol=pc;}}
  if(attach){post.type=attach.type;post.dataUrl=attach.dataUrl;post.fname=attach.name;post.fsize=attach.size;post.mime=attach.mime;post.text=txt;if(attach.thumb)post.thumb=attach.thumb;}
  else{post.type='text';post.text=txt;}
  // show locally
  feed.push(post);addPostEl(post);
  // send
  if(isHost){hostBroadcast({t:'post',post:sanitizePost(post)});}
  else if(hostConn&&hostConn.open){tSend(hostConn,{t:'post',post:post});}
  $('msg').value='';$('subjIn').value='';selCard='';autoGrow();clearAttach();closePost();saveSession();
}

/* ===================== file handling ===================== */
function pickImage(){$('imgFile').value='';$('imgFile').click();}
function pickFile(){$('docFile').value='';$('docFile').click();}
$('imgFile').addEventListener('change',function(e){var f=e.target.files[0];if(f)loadImageAttach(f);});
$('camFile').addEventListener('change',function(e){var f=e.target.files[0];if(f){ensurePostOpen();loadImageAttach(f);}});
$('docFile').addEventListener('change',function(e){var f=e.target.files[0];if(!f)return;
  if(f.type.indexOf('image/')===0){loadImageAttach(f);return;}
  if(f.type.indexOf('video/')===0){loadMediaAttach(f,'video');return;}
  if(f.type.indexOf('audio/')===0){loadMediaAttach(f,'audio');return;}
  if(f.type==='application/pdf'){loadFileAttach(f);return;}
  loadFileAttach(f);});
function loadImageAttach(f){
  var rd=new FileReader();rd.onload=function(ev){var img=new Image();
    img.onload=function(){
      var max=1280,w=img.width,h=img.height;if(w>max||h>max){var k=Math.min(max/w,max/h);w=Math.round(w*k);h=Math.round(h*k);}
      var cv=document.createElement('canvas');cv.width=w;cv.height=h;cv.getContext('2d').drawImage(img,0,0,w,h);
      var url;try{url=cv.toDataURL('image/webp',0.82);}catch(_){url=cv.toDataURL('image/jpeg',0.82);}
      setAttach({type:'image',dataUrl:url,name:f.name||'image',size:Math.round(url.length*0.75),mime:'image/webp'});
    };img.onerror=function(){toast('圖片讀取失敗');};img.src=ev.target.result;};
  rd.readAsDataURL(f);}
function loadMediaAttach(f,kind){
  var cap=(kind==='video'?16:12)*1048576;
  if(f.size>cap){toast((kind==='video'?'影片':'音訊')+'請小於 '+(cap/1048576)+'MB（傳輸較慢）');return;}
  if(f.size>4*1048576)toast('檔案較大，傳送可能需要一點時間…');
  var rd=new FileReader();rd.onload=function(ev){setAttach({type:kind,dataUrl:ev.target.result,name:f.name,size:f.size,mime:f.type});};
  rd.readAsDataURL(f);}
function loadFileAttach(f){
  if(f.size>9*1048576){toast('檔案請小於 9MB');return;}
  var rd=new FileReader();rd.onload=function(ev){
    var a={type:'file',dataUrl:ev.target.result,name:f.name,size:f.size,mime:f.type};
    setAttach(a);
    if(f.type==='application/pdf'){toast('產生預覽縮圖中…');makePdfThumb(a.dataUrl,function(thumb){if(thumb&&attach===a){a.thumb=thumb;
      $('attachImg').src=thumb;$('attachImg').style.display='block';}});}
  };
  rd.readAsDataURL(f);}
function fmtMMSS(s){return ('0'+Math.floor(s/60)).slice(-2)+':'+('0'+(s%60)).slice(-2);}
function ensurePostOpen(){if(!$('postModal').classList.contains('show'))openPost();}
/* ---- 📷 相機拍照 ---- */
var camStream=null,camFacing='environment';
function openCamera(){if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){$('camFile').value='';$('camFile').click();return;}
  $('cameraModal').classList.add('show');startCam();}
function startCam(){stopCam();navigator.mediaDevices.getUserMedia({video:{facingMode:camFacing},audio:false}).then(function(s){camStream=s;var v=$('camVideo');v.srcObject=s;v.play&&v.play().catch(function(){});}).catch(function(){toast('無法開啟相機，改用相機/相簿');$('cameraModal').classList.remove('show');$('camFile').value='';$('camFile').click();});}
function stopCam(){if(camStream){camStream.getTracks().forEach(function(t){t.stop();});camStream=null;}}
function flipCamera(){camFacing=(camFacing==='environment'?'user':'environment');startCam();}
function snapCamera(){var v=$('camVideo');if(!v.videoWidth){toast('相機尚未就緒，請稍候');return;}
  var max=1280,w=v.videoWidth,h=v.videoHeight;if(w>max||h>max){var k=Math.min(max/w,max/h);w=Math.round(w*k);h=Math.round(h*k);}
  var cv=document.createElement('canvas');cv.width=w;cv.height=h;cv.getContext('2d').drawImage(v,0,0,w,h);
  var url;try{url=cv.toDataURL('image/webp',0.82);}catch(_){url=cv.toDataURL('image/jpeg',0.82);}
  setAttach({type:'image',dataUrl:url,name:'photo_'+Date.now()+'.webp',size:Math.round(url.length*0.75),mime:'image/webp'});
  closeCamera();ensurePostOpen();toast('已拍照，按發布即可張貼');}
function closeCamera(){stopCam();$('cameraModal').classList.remove('show');}
/* ---- 🎤 錄音 ---- */
var mediaRec=null,recChunks=[],recStream=null,recTimer=null,recSec=0,recURL=null,recBlob=null;
function openRecorder(){recReset();$('recModal').classList.add('show');}
function recReset(){recChunks=[];recSec=0;recBlob=null;$('recTime').textContent='00:00';$('recPreview').style.display='none';$('recUse').style.display='none';$('recToggle').textContent='● 開始錄音';$('recToggle').classList.remove('rec-on');}
function toggleRec(){if(mediaRec&&mediaRec.state==='recording'){stopRec();return;}
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia||typeof MediaRecorder==='undefined'){toast('此瀏覽器不支援錄音');return;}
  navigator.mediaDevices.getUserMedia({audio:true}).then(function(s){recStream=s;recChunks=[];
    var mime=(typeof MediaRecorder.isTypeSupported==='function'&&MediaRecorder.isTypeSupported('audio/webm'))?'audio/webm':'';
    mediaRec=mime?new MediaRecorder(s,{mimeType:mime}):new MediaRecorder(s);
    mediaRec.ondataavailable=function(e){if(e.data&&e.data.size)recChunks.push(e.data);};
    mediaRec.onstop=function(){recBlob=new Blob(recChunks,{type:(mediaRec.mimeType||'audio/webm')});if(recURL)URL.revokeObjectURL(recURL);recURL=URL.createObjectURL(recBlob);
      var a=$('recPreview');a.src=recURL;a.style.display='';$('recUse').style.display='';if(recStream){recStream.getTracks().forEach(function(t){t.stop();});recStream=null;}};
    mediaRec.start();recSec=0;$('recTime').textContent='00:00';if(recTimer)clearInterval(recTimer);
    recTimer=setInterval(function(){recSec++;$('recTime').textContent=fmtMMSS(recSec);if(recSec>=180)stopRec();},1000);
    $('recToggle').textContent='■ 停止錄音';$('recToggle').classList.add('rec-on');
  }).catch(function(){toast('無法存取麥克風（請允許權限）');});}
function stopRec(){if(recTimer){clearInterval(recTimer);recTimer=null;}if(mediaRec&&mediaRec.state==='recording')mediaRec.stop();$('recToggle').textContent='● 重新錄音';$('recToggle').classList.remove('rec-on');}
function useRecording(){if(!recBlob){toast('還沒有錄音');return;}if(recBlob.size>12*1048576){toast('錄音過長，請小於 12MB');return;}
  var rd=new FileReader();rd.onload=function(ev){setAttach({type:'audio',dataUrl:ev.target.result,name:'錄音_'+nowHM().replace(':','')+'.webm',size:recBlob.size,mime:recBlob.type||'audio/webm'});closeRecorder();ensurePostOpen();toast('已加入語音，按發布即可張貼');};rd.readAsDataURL(recBlob);}
function closeRecorder(){if(recTimer){clearInterval(recTimer);recTimer=null;}if(mediaRec&&mediaRec.state==='recording')try{mediaRec.stop();}catch(e){}if(recStream){recStream.getTracks().forEach(function(t){t.stop();});recStream=null;}$('recModal').classList.remove('show');}
/* ---- 🎙️ 語音輸入（語音轉文字） ---- */
var recog=null,recogOn=false,_dictBase='';
function toggleDictate(){var SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){toast('此瀏覽器不支援語音輸入（建議用 Chrome）');return;}
  if(recogOn){try{recog.stop();}catch(e){}return;}
  recog=new SR();recog.lang='zh-TW';recog.continuous=true;recog.interimResults=true;_dictBase=$('msg').value;
  recog.onresult=function(e){var fin='',intr='';for(var i=e.resultIndex;i<e.results.length;i++){var r=e.results[i];if(r.isFinal)fin+=r[0].transcript;else intr+=r[0].transcript;}
    if(fin)_dictBase+=fin;$('msg').value=_dictBase+intr;autoGrow();};
  recog.onerror=function(){dictOff();};recog.onend=function(){dictOff();};
  try{recog.start();recogOn=true;dictUI(true);toast('開始聆聽，請說話…');}catch(e){toast('無法啟動語音輸入');}}
function dictOff(){recogOn=false;dictUI(false);}
function dictUI(on){var b=$('dictBtn');if(!b)return;b.classList.toggle('rec-on',on);var l=b.querySelector('.dl');if(l)l.textContent=on?'停止聆聽':'語音輸入';}
function setAttach(a){attach=a;var p=$('attachPrev');
  if(a.type==='image'||a.thumb){$('attachImg').src=a.thumb||a.dataUrl;$('attachImg').style.display='block';$('attachName').textContent=(a.type==='file'?'📄 ':'')+a.name+' · '+fmtSize(a.size);}
  else{$('attachImg').style.display='none';var ic=a.type==='video'?'🎬 ':(a.type==='audio'?'🎵 ':'📄 ');$('attachName').textContent=ic+a.name+' · '+fmtSize(a.size);}
  p.classList.add('show');updateSendBtn();}
function clearAttach(){attach=null;$('attachPrev').classList.remove('show');updateSendBtn();}

/* ---- lazy pdf.js -> first-page thumbnail (uploader generates; others just see the image) ---- */
var _pdfjs=false,_pdfjsLoading=false,_pdfjsCbs=[];
function loadPdfJs(cb){if(_pdfjs){cb(true);return;}_pdfjsCbs.push(cb);if(_pdfjsLoading)return;_pdfjsLoading=true;
  var s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  s.onload=function(){try{pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';}catch(e){}
    _pdfjs=true;_pdfjsLoading=false;_pdfjsCbs.forEach(function(f){f(true);});_pdfjsCbs=[];};
  s.onerror=function(){_pdfjsLoading=false;_pdfjsCbs.forEach(function(f){f(false);});_pdfjsCbs=[];};
  document.head.appendChild(s);}
function makePdfThumb(dataUrl,cb){loadPdfJs(function(ok){if(!ok||typeof pdfjsLib==='undefined'){cb(null);return;}
  try{var b=atob(dataUrl.split(',')[1]);var arr=new Uint8Array(b.length);for(var i=0;i<b.length;i++)arr[i]=b.charCodeAt(i);
    pdfjsLib.getDocument({data:arr}).promise.then(function(pdf){return pdf.getPage(1);}).then(function(page){
      var vp=page.getViewport({scale:1});var sc=Math.min(380/vp.width,2.2);var v2=page.getViewport({scale:sc});
      var cv=document.createElement('canvas');cv.width=v2.width;cv.height=v2.height;
      return page.render({canvasContext:cv.getContext('2d'),viewport:v2}).promise.then(function(){
        var t;try{t=cv.toDataURL('image/webp',0.7);}catch(_){t=cv.toDataURL('image/jpeg',0.7);}cb(t);});
    }).catch(function(){cb(null);});
  }catch(e){cb(null);}});}

// Ctrl+V 貼上圖片：依目前開啟的視窗自動判斷（畫布→插入畫布；張貼視窗→當附件）
function pasteImageFrom(e){var it=(e.clipboardData||window.clipboardData||{}).items||[];var file=null;
  for(var i=0;i<it.length;i++){if(it[i].type&&it[i].type.indexOf('image/')===0){file=it[i].getAsFile();break;}}
  if(!file)return false;
  if($('drawModal')&&$('drawModal').classList.contains('show')){e.preventDefault();insertDrawImage(file);return true;}
  if($('postModal')&&$('postModal').classList.contains('show')){e.preventDefault();loadImageAttach(file);return true;}
  return false;}
document.addEventListener('paste',function(e){pasteImageFrom(e);});
