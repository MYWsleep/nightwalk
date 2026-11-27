// touch.js —— 移动端触控层：走 / 回头 / 暂停，以及横屏提示与常亮
(function (w) {
  var d = w.document;
  var coarse = (navigator.maxTouchPoints > 0) || ('ontouchstart' in w) || /[?&]touch=1/.test(location.search);
  if (!coarse) return;

  function ready(fn) {
    if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  ready(function () {
    var stage = d.getElementById('stage');
    var NW = w.NW;
    if (!stage || !NW) return;
    d.body.classList.add('touch');

    var wrap = d.createElement('div');
    wrap.id = 'touch';
    wrap.innerHTML =
      '<div class="tbtn" id="walk">走</div>' +
      '<div class="tbtn" id="look">回 头</div>' +
      '<div class="tbtn" id="tpause">Ⅱ</div>' +
      '<div id="mtip"></div>';
    stage.appendChild(wrap);

    var elWalk = d.getElementById('walk');
    var elLook = d.getElementById('look');
    var elPause = d.getElementById('tpause');
    var elTip = d.getElementById('mtip');

    function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }

    function tip(text, ms) {
      elTip.textContent = text;
      elTip.classList.add('on');
      clearTimeout(tip._t);
      tip._t = setTimeout(function () { elTip.classList.remove('on'); }, ms || 2600);
    }

    // ---- 走（按住） ----
    elWalk.addEventListener('pointerdown', function (e) {
      e.preventDefault(); e.stopPropagation();
      elWalk.classList.add('hit');
      buzz(8);
      if (NW.state() === 'cover') { NW.startGame(); }
      NW.setMoving(true);
      keepAwake();
      goFull();
    });
    function releaseWalk(e) {
      elWalk.classList.remove('hit');
      NW.setMoving(false);
    }
    elWalk.addEventListener('pointerup', releaseWalk);
    elWalk.addEventListener('pointercancel', releaseWalk);
    elWalk.addEventListener('pointerleave', releaseWalk);

    // ---- 回头（按住才看） ----
    elLook.addEventListener('pointerdown', function (e) {
      e.preventDefault(); e.stopPropagation();
      if (NW.state() === 'pause' || NW.settingsOpen()) return;
      elLook.classList.add('hit');
      buzz(12);
      NW.look(true);
    });
    function releaseLook(e) {
      elLook.classList.remove('hit');
      NW.look(false);
    }
    elLook.addEventListener('pointerup', releaseLook);
    elLook.addEventListener('pointercancel', releaseLook);
    elLook.addEventListener('pointerleave', releaseLook);

    // ---- 暂停 / 继续 ----
    elPause.addEventListener('pointerdown', function (e) {
      e.preventDefault(); e.stopPropagation();
      if (NW.settingsOpen()) { w.closeSettings && w.closeSettings(); return; }
      if (NW.state() === 'pause') { NW.closePause(); return; }
      if (NW.state() === 'cover' || NW.state() === 'end') return;
      NW.openPause();
    });

    // ---- 暂停/设置打开时收起触控按钮，避免误触 ----
    var layers = [d.getElementById('pause'), d.getElementById('settings')];
    var obs = new MutationObserver(sync);
    layers.forEach(function (el) { if (el) obs.observe(el, { attributes: true, attributeFilter: ['class'] }); });
    function sync() {
      var busy = (d.getElementById('pause') || {}).classList && d.getElementById('pause').classList.contains('on');
      var set = (d.getElementById('settings') || {}).classList && d.getElementById('settings').classList.contains('on');
      wrap.style.opacity = (busy || set) ? '0' : '1';
      wrap.style.pointerEvents = 'none';
      if (busy || set) { releaseWalk(); releaseLook(); }
    }
    sync();

    // ---- 文案改成触屏版 ----
    var hint = d.getElementById('cover-hint');
    if (hint) hint.innerHTML = '按住左边的<b>走</b> · 右边可以<b>回头</b>';
    var psub = d.getElementById('pause-sub');
    if (psub) psub.textContent = '进度会存在这台机器上';
    var tiny = d.querySelector('#cover .tiny');
    if (tiny) tiny.textContent = '戴上耳机 · 关掉灯 · 建议横屏';

    // ---- 竖屏提示 ----
    function checkOrientation() {
      var portrait = (w.innerHeight > w.innerWidth);
      if (portrait && !checkOrientation.shown) {
        checkOrientation.shown = true;
        tip('横 屏 更 好 玩');
      }
    }
    w.addEventListener('orientationchange', function () { checkOrientation.shown = false; setTimeout(checkOrientation, 260); });
    setTimeout(checkOrientation, 900);

    // ---- 全屏（第一次开始游戏时尝试一次） ----
    var fullTried = false;
    function goFull() {
      if (fullTried) return;
      fullTried = true;
      var el = stage;
      try {
        if (!d.fullscreenElement && el.requestFullscreen) el.requestFullscreen({ navigationUI: 'hide' }).catch(function () {});
      } catch (e) {}
      try {
        if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(function () {});
      } catch (e) {}
    }
    stage.addEventListener('pointerdown', function (e) {
      if (NW.state() === 'cover') goFull();
    }, true);

    // ---- 屏幕常亮 ----
    var wl = null;
    function keepAwake() {
      if (!navigator.wakeLock || wl) return;
      try {
        navigator.wakeLock.request('screen').then(function (s) {
          wl = s;
          s.addEventListener('release', function () { wl = null; });
        }).catch(function () {});
      } catch (e) {}
    }
    d.addEventListener('visibilitychange', function () {
      if (d.visibilityState === 'visible' && NW.state() === 'play') { wl = null; keepAwake(); }
    });

    // ---- 双击缩放 / 长按菜单 ----
    d.addEventListener('gesturestart', function (e) { e.preventDefault(); }, { passive: false });
    d.addEventListener('dblclick', function (e) { e.preventDefault(); }, { passive: false });

    w.NW.touchUI = { tip: tip, keepAwake: keepAwake, goFull: goFull };
  });
})(window);
