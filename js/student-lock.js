(function(){
  var role=(window.APP_ROLE||'teacher').toLowerCase();
  if(role!=='student')return;

  function blockHostAction(name){
    return function(){
      var rule=(window.FEATURE_PERMISSIONS&&FEATURE_PERMISSIONS[name])||{};
      var msg=rule.message||'學生版無法建立或主持房間，請輸入老師提供的代碼加入課堂';
      try{showStatus(msg,true);}catch(e){}
      return false;
    };
  }

  var actions=(typeof blockedHostActionNames==='function')?blockedHostActionNames():[
    'createRoom',
    'openHistory',
    'importRoomFile',
    'importRoom'
  ];
  var aliases={
    materials:'openMaterials',
    projects:'openProjects',
    roll:'openRoll',
    record:'startRecord',
    export:'openExport',
    teach:'openTeach',
    kanban:'openKanban',
    share:'openShare',
    freeze:'toggleFreeze',
    lockAll:'toggleLockAll'
  };

  actions.forEach(function(name){
    var fn=aliases[name]||name;
    window[fn]=blockHostAction(name);
  });
})();
