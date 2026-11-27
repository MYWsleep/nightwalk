// game.js —— 主循环 / 状态机 / 输入 / 后期处理
(function (w) {
  var SCALE = (w.ART && w.ART.SCALE) || 2;   // 和 art.js 的烘焙分辨率保持一致
  var cv = document.getElementById('game');
  var ctx = cv.getContext('2d', { alpha: false });
  var elSub = document.getElementById('sub');
  var elCard = document.getElementById('card');
  var elCardCn = document.getElementById('card-cn');
  var elCardEn = document.getElementById('card-en');
  var elCover = document.getElementById('cover');
  var elJolt = document.getElementById('jolt');
  var elFlick = document.getElementById('flick');
  var elTint = document.getElementById('tint');
  var elPause = document.getElementById('pause');
  var elPauseMenu = document.getElementById('pause-menu');
  var elPauseSub = document.getElementById('pause-sub');
  var elCoverMenu = document.getElementById('cover-menu');
  var elSettings = document.getElementById('settings');
  var elFps = document.getElementById('set-fps');

  // ---------------- 存档（这台机器上的一个槽位） ----------------
  var SAVE_KEY = 'nightwalk.save.v1';
  var PAUSE_HINT = 'ESC 继续 · 进度会存在这台机器上';

  // ---------------- 设置（音量 / 字号 / 减少闪烁 / 全屏） ----------------
  var SET_KEY = 'nightwalk.settings.v1';
  var S = { v: 1, vol: 0.55, mute: 0, txt: 1, safe: 0 };

  function loadSettings() {
    try {
      var o = JSON.parse(localStorage.getItem(SET_KEY) || 'null');
      if (o && o.v === 1) {
        if (typeof o.vol === 'number') S.vol = U.clamp(o.vol, 0, 1);
        if (typeof o.txt === 'number') S.txt = U.clamp(o.txt, 0.8, 1.4);
        S.mute = o.mute ? 1 : 0;
        S.safe = o.safe ? 1 : 0;
      }
    } catch (e) {}
  }
  function saveSettings() {
    try {
      localStorage.setItem(SET_KEY, JSON.stringify({ v: 1, vol: S.vol, mute: S.mute, txt: S.txt, safe: S.safe }));
    } catch (e) {}
  }
  function syncFullLabel() {
    var fb = document.getElementById('set-full');
    if (!fb) return;
    var on = !!document.fullscreenElement;
    fb.textContent = on ? '开' : '关';
    fb.classList.toggle('on', on);
  }
  function applySettings() {
    SND.setVolume(S.vol);
    SND.setMuted(!!S.mute);
    document.documentElement.style.setProperty('--txt', S.txt.toFixed(2));
    var iv = document.getElementById('set-vol'), mv = document.getElementById('set-vol-v');
    var it = document.getElementById('set-txt'), tv = document.getElementById('set-txt-v');
    var mb = document.getElementById('set-mute'), sb = document.getElementById('set-safe');
    if (iv) iv.value = Math.round(S.vol * 100);
    if (mv) mv.textContent = Math.round(S.vol * 100);
    if (it) it.value = Math.round(S.txt * 100);
    if (tv) tv.textContent = Math.round(S.txt * 100) + '%';
    if (mb) { mb.textContent = S.mute ? '开' : '关'; mb.classList.toggle('on', !!S.mute); }
    if (sb) { sb.textContent = S.safe ? '开' : '关'; sb.classList.toggle('on', !!S.safe); }
    syncFullLabel();
  }
  function settingsOpen() {
    return !!(elSettings && elSettings.classList.contains('on'));
  }
  function openSettings() {
    if (!elSettings) return;
    G.moving = false;
    G.looking = false;
    applySettings();
    elSettings.classList.add('on');
  }
  function closeSettings() {
    if (elSettings) elSettings.classList.remove('on');
  }
  function toggleFull() {
    try {
      if (document.fullscreenElement) {
        if (document.exitFullscreen) document.exitFullscreen();
      } else {
        var el = document.documentElement;
        if (el.requestFullscreen) el.requestFullscreen();
      }
    } catch (e) {}
  }

  function snapshot() {
    return {
      v: 1,
      chapter: G.chapter,
      d: Math.round(G.d),
      dist: +G.lookDist.toFixed(3),
      dread: +(G.dread == null ? 1 : G.dread).toFixed(3),
      memory: +(G.memory || 0).toFixed(3),
      lookCount: G.lookCount || 0,
      flags: G.flags || {},
      runId: G.runId || '',
      saves: G.saves | 0,
      foreign: (G.foreign && G.d <= 600) ? 1 : 0,
      at: Date.now()
    };
  }
  // 混进来的别人的进度：章和距离都不是这一次的，dist 却还是你的
  function tamperSave(snap) {
    var other = snap.chapter;
    while (other === snap.chapter) other = Math.floor(Math.random() * CH.length);
    snap.own = snap.chapter;
    snap.chapter = other;
    var L = CH[other].len;
    snap.d = 200 + Math.floor(Math.random() * Math.max(200, L - 600));
    snap.foreign = 1;
    return snap;
  }
  function saveGame(quiet) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot()));
      if (G.foreign && G.d > 600) G.foreign = 0;   // 走远一点，这份进度就慢慢变回你的
      if (!quiet) flashPauseSub('已 保 存');
      return true;
    } catch (e) {
      if (!quiet) flashPauseSub('存 不 进 去');
      return false;
    }
  }
  function loadGame() {
    try {
      var s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (!s || s.v !== 1 || typeof s.chapter !== 'number') return null;
      return s;
    } catch (e) { return null; }
  }
  function clearSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  }
  function flashPauseSub(t) {
    if (!elPauseSub) return;
    elPauseSub.textContent = t;
    clearTimeout(flashPauseSub._t);
    flashPauseSub._t = setTimeout(function () { elPauseSub.textContent = PAUSE_HINT; }, 1500);
  }

  var W = 480, H = 270;
  var SPEED = 68;
  var G = {
    state: 'cover',      // cover | card | play | scare | end
    stateT: 0,
    chapter: 0,
    d: 0,
    len: 1,
    t: 0,
    phase: 0,
    moving: false,
    shake: 0,
    flash: 0,
    fade: 1,
    flags: {},
    ghost: {},
    evIdx: 0,
    events: [],
    pal: null,
    subT: 0,
    finalScare: false,
    started: false,
    scareKind: 'sockets',
    scareN: 0,
    microT: 6,
    micro: null,
    stalkT: 0,
    stalkGrace: 0,
    looking: false,
    lookT: 0,
    lookCount: 0,
    lookSee: 0,
    lookCool: 0,
    lookDist: 1,
    approach: 0,
    stepT: 5,
    stepN: 0,
    echoN: 0,
    echoQ: [],
    echoDelay: 0.62,
    echoSay: 0,
    saves: 0,
    runId: '',
    foreign: 0,
    grabT: 0,
    tension: 0,
    dread: 1,
    memory: 0,
    black: 0,
    blackT: 0,
    blackLen: 1,
    blackCool: 10
  };
  w.G = G;

  // ---------------- 字幕 ----------------
  var subTimer = 0;
  // 它离得近的时候，字幕会结巴、叠字、回音
  function frayText(text) {
    if (!text) return text;
    var dist = (G.lookDist == null) ? 1 : G.lookDist;
    if (dist >= 0.35) return text;
    if (text.indexOf('↓') >= 0) return text;   // 操作提示不结巴
    var k = U.clamp((0.35 - dist) / 0.30, 0, 1);       // 0 远 → 1 贴背
    var out = '';
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      if (ch === ' ' || ch === '\n' || '。，、？！'.indexOf(ch) >= 0) { out += ch; continue; }
      var rep = 1;
      if (Math.random() < 0.26 + k * 0.58) rep += 1 + (Math.random() < k * 0.65 ? 1 : 0);
      for (var r = 0; r < rep; r++) {
        out += ch;
        if (r < rep - 1) out += (Math.random() < 0.45 ? '' : ' ');
      }
    }
    if (k > 0.5 && Math.random() < 0.45) {
      var cut = Math.floor(out.length * (0.25 + Math.random() * 0.25));
      out = out + '\n' + out.slice(cut);
    }
    return out;
  }

  // UI 文字的污染：它贴得越近，界面本身越坏（一旦坏过就不会复原）
  function dreadK() {
    var d = (G.dread == null) ? 1 : G.dread;
    return U.clamp((0.55 - d) / 0.45, 0, 1);
  }
  function corruptText(text) {
    if (!text) return text;
    var k = dreadK();
    if (k <= 0.02) return text;
    var out = '';
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      if (ch === ' ' || ch === '\n' || '。，、？！：·'.indexOf(ch) >= 0) { out += ch; continue; }
      var rep = 1;
      if (Math.random() < 0.20 + k * 0.60) rep += 1 + (Math.random() < k * 0.55 ? 1 : 0);
      for (var r = 0; r < rep; r++) {
        out += ch;
        if (r < rep - 1) out += (Math.random() < 0.5 ? '' : ' ');
      }
    }
    return out;
  }

  function say(text, mood) {
    var frayed = text ? frayText(text) : text;
    elSub.textContent = frayed || '';
    elSub.classList.add('on');
    elSub.classList.toggle('eerie', mood === 'eerie');
    var close = (G.lookDist != null && G.lookDist < 0.35) && text;
    elSub.classList.toggle('fray', !!close);
    if (close && Math.random() < 0.5) SND.whisper(0.04);
    subTimer = text ? Math.max(2.6, Math.min(5.4, 1.6 + frayed.length * 0.10)) : 0;
    if (!text) elSub.classList.remove('on');
  }

  // ---------------- 章节卡 ----------------
  function showCard(ch) {
    var k = dreadK();
    var shown = G.foreign ? CH[(G.chapter + 1) % CH.length] : ch;
    elCardEn.textContent = corruptText(shown.en);
    elCardCn.textContent = corruptText(shown.cn);
    elCard.classList.toggle('fray', k > 0.02);
    elCard.classList.add('on');
  }
  function hideCard() { elCard.classList.remove('on'); }

  // ---------------- 章节切换 ----------------
  function enterChapter(i) {
    var ch = CH[i];
    G.chapter = i;
    G.pal = ART.pal(ch.pal);
    G.d = 0;
    G.len = ch.len;
    G.t = 0;
    G.phase = 0;
    G.shake = 0;
    G.flash = 0;
    G.flags = {};
    G.ghost = { s: 3120, gone: false };
    G.evIdx = 0;
    G.looking = false;
    G.lookT = 0;
    G.lookCount = 0;
    G.lookDist = Math.min(1, (G.lookDist || 1) + 0.25);
    G.approach = 0;
    G.stepT = 4 + Math.random() * 4;
    G.lookSee = 0;
    G.lookCool = 0;
    G.grabT = 0;
    G.finalScare = false;
    G.echoQ = [];
    G.events = (ch.events || []).slice().sort(function (a, b) { return a.at - b.at; });
    if (ch.init) ch.init(G);
    say('', null);
    showCard(ch);
    G.state = 'card';
    if (G.started) saveGame(true);
    G.stateT = 0;
    SND.ambient(ch.ambient);
  }

  function buildCoverMenu() {
    var sv = loadGame();
    var html = '';
    if (sv) {
      html += '<button class="btn" data-act="continue">继 续<span class="small"> 第 ' + (sv.chapter + 1) + ' 章' +
        (sv.foreign ? ' · 不 是 你 的' : '') + '</span></button>';
    }
    html += '<button class="btn' + (sv ? ' ghost' : '') + '" data-act="new">重 新 开 始</button>';
    html += '<button class="btn ghost" data-act="settings">设 置</button>';
    elCoverMenu.innerHTML = html;
  }

  function showCover() {
    if (G.started && G.state !== 'cover') {
      saveGame(true);
      // 存档有时候会混进别人的进度：回到主界面时才发现章和距离都不对
      if (Math.random() < 0.42) {
        var s2 = loadGame();
        if (s2 && !s2.foreign) {
          tamperSave(s2);
          try { localStorage.setItem(SAVE_KEY, JSON.stringify(s2)); } catch (e) {}
        }
      }
    }
    G.state = 'cover';
    G.stateT = 0;
    G.moving = false;
    G.looking = false;
    closePause();
    SND.stopAmbient();
    elCover.style.display = 'flex';
    elCover.classList.remove('hide');
    elCover.classList.remove('endq');
    document.getElementById('cover-body').style.display = 'none';
    document.getElementById('cover-hint').style.display = '';
    document.getElementById('cover-title').textContent = corruptText('夜 归');
    document.getElementById('cover-sub').textContent = corruptText('N I G H T W A L K');
    buildCoverMenu();
    say('', null);
  }

  function resumeSave(sv) {
    G.started = true;
    SND.init();
    G.foreign = sv.foreign ? 1 : 0;
    elCover.classList.add('hide');
    elCover.style.display = 'none';
    enterChapter(sv.chapter);
    G.d = Math.max(0, Math.min(sv.d || 0, G.len - 60));
    G.lookDist = typeof sv.dist === 'number' ? sv.dist : 1;
    G.dread = typeof sv.dread === 'number' ? sv.dread : 1;
    G.memory = typeof sv.memory === 'number' ? sv.memory : 0;
    G.lookCount = sv.lookCount || 0;
    G.flags = sv.flags || {};
    G.evIdx = 0;
    while (G.evIdx < G.events.length && G.events[G.evIdx].at <= G.d) G.evIdx++;
    hideCard();
    G.state = 'play';
    G.stateT = 3.4;
    G.t = 6;
    elSub.classList.remove('on');
    SND.ambient(CH[G.chapter].ambient);
    say(G.foreign ? '这 不 是 你 的 进 度。' : '…… 你 又 回 来 了。', 'eerie');
  }

  function openPause() {
    if (G.state !== 'play' && G.state !== 'card') return;
    G.prevState = G.state;
    G.state = 'pause';
    G.moving = false;
    G.looking = false;
    if (elPauseSub) elPauseSub.textContent = PAUSE_HINT;
    if (elPauseMenu) elPauseMenu.style.display = '';
    var pt = elPause && elPause.querySelector('.ptitle');
    if (pt) pt.textContent = '已 暂 停';
    elPause.classList.add('on');
  }
  function closePause() {
    if (elPause && elPause.classList.contains('on')) elPause.classList.remove('on');
    if (G.state === 'pause') G.state = G.prevState || 'play';
  }
  function toMenu() {
    saveGame(true);
    showCover();
  }
  function toDesktop() {
    saveGame(true);
    try { window.close(); } catch (e) {}
    setTimeout(function () {
      if (!window.closed && elPause) {
        elPause.classList.add('on');
        elPause.querySelector('.ptitle').textContent = '已 经 存 好 了';
        elPauseMenu.style.display = 'none';
        elPauseSub.textContent = '这 个 窗 口 可 以 直 接 关 掉';
      }
    }, 450);
  }

  function startGame() {
    clearSave();
    G.foreign = 0;
    G.saves = 0;
    G.runId = Math.random().toString(36).slice(2, 10);
    G.echoQ = [];
    G.echoDelay = 0.62;
    G.echoSay = 0;
    G.echoN = 0;
    G.stepN = 0;
    if (!G.started) {
      G.started = true;
      SND.init();
    } else {
      SND.init();
    }
    elCover.classList.add('hide');
    setTimeout(function () { elCover.style.display = 'none'; }, 900);
    enterChapter(0);
  }

  // 回头看：每看一次，它就靠近一点
  function startLook() {
    if (G.state !== 'play' || G.grabT > 0) return;
    G.looking = true;
    if (G.lookCool > 0) return;
    G.lookCool = 0.85;
    G.lookCount++;
    G.lookDist = Math.max(0.05, G.lookDist * 0.66);
    var p = 0.40 + G.tension * 0.34 + G.lookCount * 0.06;
    G.lookSee = Math.random() < Math.min(0.92, p) ? G.lookDist : 0;
    if (G.lookSee > 0) {
      SND.breath(0.07);
      G.memory = Math.min(1, (G.memory || 0) + 0.22);
      if (!G.flags.memSaid && G.memory >= 0.28) {
        G.flags.memSaid = true;
        say('路 边 的 牌 子，字 不 对 了。', 'eerie');
      }
    } else SND.whisper(0.05);
    if (G.lookDist < 0.16) { grab(); return; }
    if (G.lookCount === 1 && G.lookSee === 0) say('身后什么都没有。', 'eerie');
  }

  // 看得太多，它把你拽回去
  function grab() {
    G.grabT = 1.1;
    G.looking = false;
    G.lookT = 0;
    G.shake = 18;
    G.flash = 0.7;
    G.micro = { kind: 'faceFlash', t: 0, dur: 0.34, x: 240, y: 135 };
    SND.scream(0.55);
    SND.breath(0.16);
    say('它把你拽了回去。', 'eerie');
    G.memory = Math.min(1, (G.memory || 0) + 0.15);
    G.d = Math.max(0, G.d - 360);
    G.lookDist = 0.55;
    G.lookCount = 1;
  }

  function beginScare(power, isFinal) {
    G.state = 'scare';
    G.stateT = 0;
    G.finalScare = !!isFinal;
    G.scareN++;
    var kk = ['sockets', 'wide', 'tears', 'below'];
    G.scareKind = isFinal ? 'sockets' : kk[G.scareN % 4];
    G.micro = null;
    G.stalkT = 0;
    G.stalkGrace = 0;
    SND.stab(power || 1);
    SND.scream(0.20 + (power || 1) * 0.16);
    SND.breath(0.06);
    elJolt.classList.remove('on');
    void elJolt.offsetWidth;
    elJolt.classList.add('on');
    say('', null);
  }

  function endGame() {
    clearSave();
    elCoverMenu.innerHTML = '';
    G.state = 'end';
    G.stateT = 0;
    SND.stopAmbient();
    elCover.style.display = 'flex';
    elCover.classList.remove('hide');
    elCover.classList.add('endq');
    var fk = dreadK();
    document.getElementById('cover-title').textContent = corruptText('夜 归');
    document.getElementById('cover-sub').textContent = corruptText('N I G H T W A L K');
    var body = document.getElementById('cover-body');
    body.style.display = 'block';
    var memE = G.memory || 0;
    var ddE = (G.dread == null ? 1 : G.dread);
    var eLines;
    if (memE >= 0.7) {
      eLines = ['你走完了六段路。', '牌子上的字你都记住了，', '回家的路你也记住了。', '', '明天不用再看路了。'];
    } else if (ddE < 0.3) {
      eLines = ['你走完了六段路。', '有一次它离你太近，', '近到你能听见它呼吸。', '', '你回头了 —— 它就在那里。'];
    } else {
      eLines = ['你走完了六段路。', '每一段都比上一段更熟，', '每一段里都有人在等你。', '', '也许明天，还是一样。'];
    }
    body.textContent = corruptText(eLines.join(String.fromCharCode(10)));
    var hint = document.getElementById('cover-hint');
    if (fk > 0.02) {
      hint.innerHTML = '<button class="btn" id="again"></button>';
      document.getElementById('again').textContent = corruptText('再 走 一 次');
      elCover.classList.add('fray');
    } else {
      hint.innerHTML = '<button class="btn" id="again">再 走 一 次</button>';
      elCover.classList.remove('fray');
    }
    document.getElementById('again').addEventListener('click', function () {
      body.style.display = 'none';
      elCover.classList.remove('endq');
      hint.innerHTML = '按住 <span class="key">←</span> 向左走 · 你只能向左走';
      G.chapter = 0;
      startGame();
    });
  }

  // ---------------- 输入 ----------------
  function onDown(e) {
    if (e.type === 'keydown') {
      if (e.code === 'Escape') {
        e.preventDefault();
        if (settingsOpen()) { closeSettings(); return; }
        if (elPause && elPause.classList.contains('on')) closePause();
        else if (G.state === 'end') showCover();
        else if (G.state !== 'cover') openPause();
        return;
      }
      if (G.state === 'pause') return;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') { G.moving = true; e.preventDefault(); }
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowLeft') {
        if (G.state === 'cover') { startGame(); e.preventDefault(); }
      }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') { startLook(); e.preventDefault(); }
      if (e.code === 'KeyM') { S.mute = S.mute ? 0 : 1; saveSettings(); applySettings(); }
      return;
    }
    if (e.target && e.target.closest && e.target.closest('#settings')) return;
    if (e.target && e.target.closest && e.target.closest('button')) return;
    if (G.state === 'pause') return;
    if (G.state === 'cover') { startGame(); return; }
    G.moving = true;
  }
  function onUp(e) {
    if (e.type === 'keyup') {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') { G.moving = false; e.preventDefault(); }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') { G.looking = false; e.preventDefault(); }
      return;
    }
    G.moving = false;
  }
  w.addEventListener('keydown', onDown, { passive: false });
  w.addEventListener('keyup', onUp, { passive: false });
  var stage = document.getElementById('stage');
  stage.addEventListener('pointerdown', onDown);
  w.addEventListener('pointerup', onUp);
  w.addEventListener('pointercancel', onUp);
  elCoverMenu.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('button') : null;
    if (!b) return;
    var act = b.getAttribute('data-act');
    if (act === 'continue') {
      var sv = loadGame();
      if (sv) resumeSave(sv);
    } else if (act === 'new') {
      startGame();
    } else if (act === 'settings') {
      openSettings();
    }
  });
  elPauseMenu.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('button') : null;
    if (!b) return;
    var act = b.getAttribute('data-act');
    if (act === 'resume') closePause();
    else if (act === 'menu') toMenu();
    else if (act === 'settings') openSettings();
    else if (act === 'exit') toDesktop();
  });
  if (elSettings) {
    elSettings.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button') : null;
      if (!b) return;
      if (b.getAttribute('data-act') === 'close') closeSettings();
    });
    var iVol = document.getElementById('set-vol');
    if (iVol) iVol.addEventListener('input', function () {
      S.vol = parseFloat(iVol.value) / 100; saveSettings(); applySettings();
    });
    var iTxt = document.getElementById('set-txt');
    if (iTxt) iTxt.addEventListener('input', function () {
      S.txt = parseFloat(iTxt.value) / 100; saveSettings(); applySettings();
    });
    var bMute = document.getElementById('set-mute');
    if (bMute) bMute.addEventListener('click', function () { S.mute = S.mute ? 0 : 1; saveSettings(); applySettings(); });
    var bSafe = document.getElementById('set-safe');
    if (bSafe) bSafe.addEventListener('click', function () { S.safe = S.safe ? 0 : 1; saveSettings(); applySettings(); });
    var bFull = document.getElementById('set-full');
    if (bFull) bFull.addEventListener('click', toggleFull);
  }
  document.addEventListener('fullscreenchange', syncFullLabel);
  w.addEventListener('blur', function () { G.moving = false; });
  w.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  // ---------------- 更新 ----------------
  function update(dt) {
    if (G.state === 'pause') return;
    G.stateT += dt;
    G.t += dt;

    // 字幕计时
    if (subTimer > 0) {
      subTimer -= dt;
      if (subTimer <= 0) elSub.classList.remove('on');
    }

    // 衰减
    G.shake *= Math.pow(0.02, dt);
    G.flash *= Math.pow(0.0008, dt);
    if (G.shake < 0.04) G.shake = 0;
    if (S.safe && G.flash > 0.12) G.flash = 0.12;   // 减少闪烁：强闪压到很轻

    // 闪烁层
    elFlick.style.opacity = (G.flash * 0.9).toFixed(3);

    if (G.state === 'card') {
      if (G.stateT > 0.5) hideCard();
      if (G.stateT > 2.9) { G.state = 'play'; G.stateT = 0; var ch = CH[G.chapter]; if (ch.update) ch.update(G, dt); }
      return;
    }

    if (G.state === 'play') {
      var ch = CH[G.chapter];
      if (ch.update) ch.update(G, dt);

      if (G.lookCool > 0) G.lookCool = Math.max(0, G.lookCool - dt);
      if (G.grabT > 0) G.grabT = Math.max(0, G.grabT - dt);
      if (G.looking) G.lookT += dt; else if (G.lookT > 0) G.lookT = Math.max(0, G.lookT - dt * 5);

      if (G.moving && G.grabT <= 0) {
        G.d += SPEED * dt * (G.looking ? 0.45 : 1);
        var prevPhase = G.phase;
        G.phase += dt * 6.4;
        // 每一步的脚步声
        if (Math.floor(prevPhase / Math.PI) !== Math.floor(G.phase / Math.PI)) {
          SND.step(G.chapter === 1 || G.chapter === 2);
          G.stepN++;
          G.echoQ.push(G.echoDelay);
          if (G.echoDelay > 0.12) G.echoDelay = Math.max(0.12, G.echoDelay * 0.93);
        }
      }

      // 回声：你走一步，它跟一步；间隔越来越短，最后赶在你前面
      if (G.echoQ.length) {
        for (var qi = G.echoQ.length - 1; qi >= 0; qi--) {
          G.echoQ[qi] -= dt;
          if (G.echoQ[qi] <= 0) {
            G.echoQ.splice(qi, 1);
            G.echoN++;
            SND.step(false);
            if (G.echoDelay <= 0.16) {
              if (!G.echoSay) { G.echoSay = 1; say('脚 步 对 上 了。', 'eerie'); SND.whisper(0.05); }
              else if (Math.random() < 0.16) SND.step(false);
              if (Math.random() < 0.10) SND.breath(0.04);
            }
          }
        }
      }

      // 压迫感随距离上升
      G.tension = U.clamp(G.d / Math.max(1, G.len), 0, 1);
      if (G.lookDist < G.dread) G.dread = G.lookDist;   // 它离你最近过的那一次，永久记着
      if (G.tension > 0.62 && Math.random() < dt * (G.tension - 0.6) * 2.2) {
        G.shake = Math.max(G.shake, 1.2 + G.tension * 2.4);
      }

      // 随机的微小惊吓（不打断行走）
      G.microT -= dt;
      if (G.microT <= 0 && !G.micro) {
        G.microT = 4.2 + Math.random() * 6.4;
        var r = Math.random();
        var mk = r < 0.26 ? 'eyes'
          : (r < 0.46 ? 'faceFlash'
          : (r < 0.62 ? 'handOut'
          : (r < 0.76 ? 'blood'
          : (r < 0.90 ? 'crawl' : 'belowFace'))));
        var mdur = mk === 'faceFlash' ? 0.16 : (mk === 'crawl' ? 2.6 : (mk === 'belowFace' ? 1.25 : 0.9));
        G.micro = { kind: mk, t: 0, dur: mdur, x: 40 + Math.random() * 380, y: 40 + Math.random() * 150 };
        if (mk === 'crawl') { G.micro.x = -60 - Math.random() * 40; G.micro.y = 244; G.micro.vx = 140 + Math.random() * 90; }
        if (mk === 'belowFace') G.micro.y = 300;
        if (mk === 'eyes') SND.breath(0.04);
        else if (mk === 'faceFlash') { SND.whisper(0.05); G.flash = 0.25; }
        else if (mk === 'blood') SND.drip(0.09);
        else if (mk === 'crawl') SND.drag(0.12);
        else if (mk === 'belowFace') SND.whisper(0.06);
        else SND.thud(0.10);
      }
      if (G.micro) {
        G.micro.t += dt;
        if (G.micro.t > G.micro.dur) G.micro = null;
      }

      // ---- 停电：什么都看不见，只剩下呼吸 ----
      if (G.blackT > 0) {
        G.blackT -= dt;
        var bp = 1 - G.blackT / Math.max(0.01, G.blackLen);
        var ba = bp < 0.16 ? bp / 0.16 : (bp > 0.74 ? (1 - bp) / 0.26 : 1);
        G.black = U.clamp(ba, 0, 1);
        if (G.blackT <= 0) {
          G.black = 0;
          G.blackCool = 13 + Math.random() * 12;
          if (Math.random() < 0.45) {
            G.micro = { kind: 'faceFlash', t: 0, dur: 0.30, x: 240, y: 135 };
            G.shake = 9;
            G.flash = 0.45;
            SND.scream(0.3);
          } else {
            SND.breath(0.10);
          }
        }
      } else {
        G.black = 0;
        if (G.blackCool > 0) G.blackCool -= dt;
        else if (G.tension > 0.2 && G.moving && Math.random() < dt * 0.05) {
          G.blackLen = 1.5 + Math.random() * 1.6;
          G.blackT = G.blackLen;
          SND.thud(0.18);
          SND.whisper(0.05);
          say('灯灭了。', 'eerie');
        }
      }

      // 停下不走的时候，后面会有东西靠过来
      var stalking = CH[G.chapter] && CH[G.chapter].stalk;
      if (stalking && !G.moving && G.state === 'play') {
        G.stalkT += dt;
        if (G.stalkT > 1.4 && G.stalkT < 1.46) SND.breath(0.09);
        if (G.stalkT > 3.0 && G.stalkT < 3.06) SND.whisper(0.07);
        if (G.stalkT > 5.4 && !G.stalkGrace) {
          // 它贴到脸上了：不跳章，但这一下要够狠
          G.stalkT = 0;
          G.stalkGrace = 3.2;
          G.shake = 14;
          G.flash = 0.55;
          G.micro = { kind: 'faceFlash', t: 0, dur: 0.42, x: 240, y: 135 };
          SND.scream(0.42);
          SND.breath(0.14);
          say('它一直跟在你后面。', 'eerie');
        }
        if (G.stalkGrace > 0) G.stalkGrace = Math.max(0, G.stalkGrace - dt);
      } else if (G.stalkT > 0) {
        G.stalkT = Math.max(0, G.stalkT - dt * 2.2);
      }
      // 不回头的时候，它也在慢慢靠近
      if (G.moving && !G.looking && G.grabT <= 0) {
        G.approach += SPEED * dt;
        if (G.approach > 800) {
          G.approach -= 800;
          G.lookDist = Math.max(0.06, G.lookDist * 0.90);
          if (G.lookDist < 0.3 && Math.random() < 0.5) SND.breath(0.05);
        }
        // 身后的脚步声：回头看却没有东西
        G.stepT -= dt;
        if (G.stepT <= 0) {
          G.stepT = 3.6 + Math.random() * 4.4;
          SND.step(false);
          if (Math.random() < 0.35) SND.whisper(0.03);
        }
        if (G.lookDist < 0.11 && Math.random() < dt * 1.6) {
          say('它已经贴在你背上了。', 'eerie');
          grab();
        }
      }

      // 一次性的提示：可以回头看
      if (G.chapter === 0 && G.d > 640 && !G.flags.lookHint) {
        G.flags.lookHint = 1;
        say('按 ↓ 可以回头看。', 'eerie');
      }

      // 事件
      while (G.evIdx < G.events.length && G.d >= G.events[G.evIdx].at) {
        var ev = G.events[G.evIdx++];
        if (ev.say != null) say(ev.say, ev.mood);
        if (ev.act) { try { ev.act(G); } catch (e) {} }
        if (ev.scare) { beginScare(ev.scare, ev.final); return; }
      }

      if (G.d >= G.len + 60) { beginScare(1, G.chapter === CH.length - 1); return; }
      return;
    }

    if (G.state === 'scare') {
      G.shake = 10;
      if (G.stateT > 1.35) {
        if (G.finalScare || G.chapter >= CH.length - 1) {
          endGame();
        } else {
          enterChapter(G.chapter + 1);
        }
      }
      return;
    }
  }

  // 随机的微小惊吓画面
  function drawMicro(ctx, G) {
    var m = G.micro;
    if (!m) return;
    var k = m.t / m.dur;
    var a = k < 0.25 ? k / 0.25 : (k > 0.7 ? (1 - k) / 0.3 : 1);
    ctx.save();
    if (m.kind === 'eyes') {
      ART.eyes(ctx, m.x, m.y, G.t + 2.2, 0.55 * a);
      ART.eyes(ctx, m.x + 13, m.y + 1, G.t + 2.2, 0.42 * a);
    } else if (m.kind === 'faceFlash') {
      ctx.globalAlpha = 0.44 * a;
      ctx.translate(m.x, m.y);
      ctx.scale(0.34, 0.34);
      ctx.translate(-240, -130);
      ART.face(ctx, G.t, 1, { final: false });
    } else if (m.kind === 'handOut') {
      ART.handOut(ctx, m.x, 250, 1.5, -1.35, 0.55 * a);
    } else if (m.kind === 'crawl') {
      ctx.globalAlpha = 0.78 * a;
      ART.crawl(ctx, m.x + (m.vx || 0) * m.t, m.y, G.t * 2.4, { scale: 1.0, rim: 'rgba(214,72,58,0.30)' });
    } else if (m.kind === 'belowFace') {
      var rise = U.clamp(m.t / 0.55, 0, 1);
      ctx.globalAlpha = 0.52 * a;
      ctx.translate(240, 300 - rise * 96);
      ctx.scale(0.5, 0.5);
      ctx.translate(-240, -H * 0.47);
      ART.face(ctx, G.t, 1.25, {});
    } else {
      // 天花板上滴下来的一道
      ctx.globalAlpha = 0.55 * a;
      ctx.fillStyle = 'rgba(64,8,8,0.9)';
      var dl = 10 + k * 60;
      ctx.fillRect(m.x | 0, 0, 1.6, dl);
      ctx.beginPath();
      ctx.ellipse(m.x + 0.8, dl, 2.2, 2.8, 0, 0, 6.284);
      ctx.fill();
    }
    ctx.restore();
  }
  // ---------------- 渲染 ----------------
  function render() {
    // 暂停时继续画最后一帧（不推进逻辑）
    var rs = (G.state === 'pause') ? (G.prevState || 'play') : G.state;
    // 高清渲染：世界坐标系仍是 480x270，画布放大 2 倍
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    if (rs === 'play' || rs === 'card') {
      var ch = CH[G.chapter];
      if (ch && G.pal) {
        ctx.save();
        if (G.shake > 0.05) {
          ctx.translate((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake * 0.7);
        }
        var la = G.looking ? U.clamp(G.lookT / 0.28, 0, 1) : 0;
        G.lookA = la;
        function sceneImg(mirror, alpha) {
          ctx.save();
          ctx.globalAlpha = alpha;
          if (mirror) { ctx.translate(W, 0); ctx.scale(-1, 1); }
          ch.draw(ctx, G);
          ctx.restore();
          // 血迹/字这些不镜像，否则字是反的
          ctx.save();
          ctx.globalAlpha = alpha;
          if (CH.extra) { try { CH.extra(ctx, G); } catch (e) {} }
          drawMicro(ctx, G);
          ctx.restore();
        }
        if (la > 0) { sceneImg(false, 1 - la); sceneImg(true, la); }
        else { sceneImg(false, 1); }

        // 玩家 + 影子
        if (rs === 'play' && la < 0.9) {
          ctx.save();
          ctx.globalAlpha = 0.5;
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.ellipse(110, ART.HORIZON + 7, 15, 4, 0, 0, 6.284);
          ctx.fill();
          ctx.restore();

          ART.person(ctx, 110, 214, G.phase, {
            scale: 1.0,
            walking: G.moving,
            rim: 'rgba(170,195,225,0.20)'
          });
          // 停下的时候，身后那个人越靠越近
          if (G.stalkT > 1.2) {
            var sk = U.clamp((G.stalkT - 1.2) / 4.2, 0, 1);
            ctx.save();
            ctx.globalAlpha = 0.25 + sk * 0.7;
            ART.figure(ctx, 110 + 6 - sk * 4, 232 + sk * 6, G.t * 0.6, {
              scale: 1.25 + sk * 2.6,
              rim: 'rgba(220,60,50,0.30)'
            });
            ctx.restore();
            if (sk > 0.55) {
              ctx.fillStyle = 'rgba(0,0,0,' + ((sk - 0.55) * 1.4).toFixed(2) + ')';
              ctx.fillRect(0, 0, W, H);
            }
          }
        }

        // ---- 它离得近时，画面左侧总会多一点东西 ----
        if (la < 0.5 && G.lookDist < 0.45 && rs === 'play') {
          var na = U.clamp((0.45 - G.lookDist) / 0.34, 0, 1);
          ctx.save();
          ctx.globalAlpha = 0.10 + na * 0.26;
          if (G.lookDist < 0.22) {
            ART.handprint(ctx, 8 + Math.sin(G.t * 0.7) * 2, 176, 1.1, 0.5);
          } else {
            ART.figure(ctx, -6 + Math.sin(G.t * 0.5) * 1.5, 228, G.t * 0.3, { scale: 1.1, rim: 'rgba(210,70,56,0.22)' });
          }
          ctx.restore();
        }

        // ---- 回头看：身后那条路 ----
        if (la > 0.02 && rs === 'play') {
          ctx.save();
          // 冷色 + 更重的暗
          ctx.fillStyle = 'rgba(12,20,34,' + (0.30 * la).toFixed(2) + ')';
          ctx.fillRect(0, 0, W, H);
          var lv = ctx.createRadialGradient(W * 0.55, H * 0.52, 24, W * 0.55, H * 0.52, W * 0.62);
          lv.addColorStop(0, 'rgba(0,0,0,0)');
          lv.addColorStop(0.55, 'rgba(0,0,0,0.42)');
          lv.addColorStop(1, 'rgba(0,0,0,0.88)');
          ctx.fillStyle = lv;
          ctx.fillRect(0, 0, W, H);

          if (G.lookSee > 0) {
            // 它站在你回头正对着的位置；越近越大
            var near = 1 - G.lookSee;                    // 0 远 → 1 贴脸
            var ps = 1.05 + near * 3.1;
            var px = 300 - near * 34;
            var py = 226 + near * 10;
            ctx.globalAlpha = (0.42 + near * 0.55) * la;
            ART.figure(ctx, px, py, G.t * 0.35, { scale: ps, rim: 'rgba(210,60,48,0.34)' });
            ctx.globalAlpha = 1;
            // 近到能看清脸的时候：一张小脸长在它头上
            if (near > 0.5) {
              var fa = (near - 0.5) / 0.5;
              var hh = 46 * ps;
              ctx.save();
              ctx.globalAlpha = (0.30 + fa * 0.55) * la;
              ctx.translate(px, py - hh * 0.86);
              var fs2 = 0.040 * ps + fa * 0.02;
              ctx.scale(fs2, fs2);
              ctx.translate(-W * 0.5, -H * 0.47);
              ART.face(ctx, G.t, 1.2, {});
              ctx.restore();
            }
          }
          ctx.restore();
        }

        // ---- 被抓住 ----
        if (G.grabT > 0) {
          var gk = U.clamp(G.grabT / 1.1, 0, 1);
          ctx.fillStyle = 'rgba(0,0,0,' + Math.min(1, 0.55 + (1 - gk) * 0.9).toFixed(2) + ')';
          ctx.fillRect(0, 0, W, H);
        }
        ctx.restore();
      }
    }

    // 恐怖脸
    if (G.state === 'scare') {
      ctx.save();
      var jx = (Math.random() - 0.5) * 26, jy = (Math.random() - 0.5) * 18;
      ctx.translate(jx, jy);
      var zoom = 1 + Math.min(G.stateT, 1.05) * 0.32;
      ctx.translate(W * 0.5, H * 0.5);
      ctx.scale(zoom, zoom);
      ctx.translate(-W * 0.5, -H * 0.5);
      if (G.scareKind === 'below') {
        var rb = U.clamp(G.stateT / 0.5, 0, 1);
        ctx.translate(0, 78 * (1 - rb));
      }
      ART.face(ctx, G.t, 1.6, { final: G.finalScare });
      ART.faceVariant(ctx, G.t, G.scareKind);
      var kg = ctx.createRadialGradient(W * 0.5, H * 0.30, 10, W * 0.5, H * 0.42, H * 0.72);
      kg.addColorStop(0, 'rgba(214,224,236,0.16)');
      kg.addColorStop(0.55, 'rgba(150,168,190,0.05)');
      kg.addColorStop(1, 'rgba(0,0,0,0.34)');
      ctx.fillStyle = kg;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
      // 撕裂：随机横条左右错位
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      for (var gi = 0; gi < 3; gi++) {
        var band = [0.16, 0.52, 0.78][gi] * cv.height;
        var gy2 = band + (Math.random() - 0.5) * 26;
        var gh = 3 + Math.random() * 9;
        var off = (Math.random() - 0.5) * 22;
        ctx.drawImage(cv, 0, gy2, cv.width, gh, off, gy2, cv.width, gh);
      }
      ctx.restore();
      // 红压 + 白闪
      ctx.fillStyle = 'rgba(96,6,6,' + (0.10 + Math.random() * 0.10).toFixed(2) + ')';
      ctx.fillRect(0, 0, W, H);
      if (!S.safe && (G.stateT < 0.07 || (G.stateT > 0.30 && G.stateT < 0.335) || (G.stateT > 0.62 && G.stateT < 0.645))) {
        ctx.fillStyle = 'rgba(255,255,255,0.62)';
        ctx.fillRect(0, 0, W, H);
      }
    }

    // 闪烁
    if (G.flash > 0.01) {
      ctx.fillStyle = 'rgba(235,240,255,' + G.flash.toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
    }

    // 暗角之外的颗粒
    if (G.state !== 'cover') {
      var tz = (rs === 'play' && G.tension) ? G.tension : 0;
      if (!G.lowFX) ART.noise(ctx, G.state === 'scare' ? 0.18 : (0.045 + tz * 0.05));
      ART.scanlines(ctx, G.lowFX ? 0 : 0.20);
      ART.vignette(ctx, 1);
      if (tz > 0.35) {
        var vg = ctx.createRadialGradient(W * 0.5, H * 0.5, H * 0.34, W * 0.5, H * 0.5, H * 0.92);
        vg.addColorStop(0, 'rgba(0,0,0,0)');
        vg.addColorStop(1, 'rgba(0,0,0,' + Math.min(0.34, (tz - 0.35) * 0.9).toFixed(2) + ')');
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, W, H);
      }
      ART.scratch(ctx, G.t);
    }

    // 停电：几乎全黑，只剩一双在黑暗里反光的眼睛
    if (G.black > 0.01 && (rs === 'play' || G.state === 'pause')) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,' + (G.black * 0.97).toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
      if (G.black > 0.42 && Math.sin(G.t * 1.9) > 0.1) {
        var ea = U.clamp((G.black - 0.42) / 0.58, 0, 1);
        ctx.globalAlpha = 0.55 * ea;
        ART.eyes(ctx, 306 + Math.sin(G.t * 0.6) * 7, 116 + Math.cos(G.t * 0.5) * 3, G.t + 1.4, 0.72 * ea);
      }
      ctx.restore();
    }

    // 结束前压黑
    if (G.state === 'scare' && G.stateT > 1.05) {
      var k = U.clamp((G.stateT - 1.05) / 0.3, 0, 1);
      ctx.fillStyle = 'rgba(0,0,0,' + k.toFixed(2) + ')';
      ctx.fillRect(0, 0, W, H);
    }
  }

  // ---------------- 主循环 ----------------
  // 60 帧上限：高刷屏（120/144Hz）不再白跑两倍工作量；acc 累加保证速度不受刷新率影响。
  // dtEMA 用真实帧间隔（含合成/上屏），连续掉帧就自动降级特效，恢复后再打开。
  var last = performance.now();
  var acc = 0;
  var dtEMA = 1 / 60;
  var slowN = 0, fastN = 0;
  var fpsShown = 0;
  G.lowFX = 0;

  function loop(now) {
    requestAnimationFrame(loop);
    var dt = (now - last) / 1000;
    last = now;
    if (dt < 0) dt = 0;
    if (dt > 0.25) dt = 0.25;                  // 切窗口回来不要一次跳太远
    dtEMA = dtEMA * 0.9 + dt * 0.1;
    acc += dt;
    if (acc < 0.0155) return;                  // 上限 60 帧，别空转
    var step = Math.min(acc, 0.05);
    acc = 0;
    update(step);
    render();

    // 掉帧自适应：连续 20 帧平均帧间隔超 21ms 就关颗粒与扫描线；恢复 90 帧后再打开
    if (dtEMA > 0.021) { slowN++; fastN = 0; } else if (dtEMA < 0.0185) { fastN++; slowN = 0; }
    if (slowN > 20 && !G.lowFX) { G.lowFX = 1; slowN = 0; }
    if (fastN > 90 && G.lowFX) { G.lowFX = 0; fastN = 0; }

    if (G.tickN == null) G.tickN = 0;
    G.tickN++;
    if (G.tickN % 15 === 0 && elFps && elSettings && elSettings.classList.contains('on')) {
      var f = Math.round(1 / Math.max(0.0001, dtEMA));
      if (f !== fpsShown) { fpsShown = f; elFps.textContent = f + ' FPS'; }
    }
  }

  // 初始画面：让第一章的第一帧先画出来当背景
  G.pal = ART.pal('street');
  G.chapter = 0;
  if (CH[0].init) CH[0].init(G);
  G.state = 'cover';
  loadSettings();
  applySettings();
  buildCoverMenu();
  requestAnimationFrame(loop);

  // 调试用：跳过片头
  w.endGame = endGame;
  w.update = update;
  w.say = say;
  w.render = render;
  w.showCover = showCover;
  w.loadGame = loadGame;
  w.saveGame = saveGame;
  w.openSettings = openSettings;
  w.fps = function () { return Math.round(1 / Math.max(0.0001, dtEMA)); };
  w.closeSettings = closeSettings;
  w.settingsOpen = settingsOpen;
  w.applySettings = applySettings;
  w.S = S;
  w.CH = CH;
  w.enterChapter = enterChapter;
  w.buildCoverMenu = buildCoverMenu;
  w.tamperSave = tamperSave;
  w.forceForeignSave = function () {
    var snap = tamperSave(snapshot());
    snap.saves = Math.max(2, snap.saves);
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(snap)); } catch (e) {}
    return snap;
  };
  w.DEBUG_START = function (n) {
    G.started = true;
    SND.init();
    elCover.classList.add('hide');
    elCover.style.display = 'none';
    enterChapter(n || 0);
  };
})(window);
