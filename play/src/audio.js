// audio.js —— 全部音效程序化合成，不依赖任何外部音频文件
(function (w) {
  var A = {
    ctx: null,
    master: null,
    amb: null,
    muted: false,
    vol: 0.55,
    noiseBuf: null,
    ready: false
  };

  A.init = function () {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
    var AC = w.AudioContext || w.webkitAudioContext;
    if (!AC) return;
    try {
      A.ctx = new AC();
      A.master = A.ctx.createGain();
      A.master.gain.value = A.muted ? 0 : A.vol * 0.85;
      A.master.connect(A.ctx.destination);
      A.ready = true;
      A._makeNoise();
    } catch (e) { A.ctx = null; }
  };

  A.setVolume = function (v) {
    A.vol = Math.max(0, Math.min(1, v == null ? 0.55 : v));
    if (A.master) A.master.gain.value = A.muted ? 0 : A.vol * 0.85;
  };
  A.setMuted = function (m) {
    A.muted = !!m;
    if (A.master) A.master.gain.value = A.muted ? 0 : A.vol * 0.85;
  };

  A._makeNoise = function () {
    var ctx = A.ctx, len = ctx.sampleRate * 2;
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    A.noiseBuf = buf;
  };

  A._noise = function (dur) {
    var s = A.ctx.createBufferSource();
    s.buffer = A.noiseBuf;
    s.loop = true;
    s.start(0);
    var g = A.ctx.createGain();
    g.gain.value = 0;
    s.connect(g);
    setTimeout(function () { try { s.stop(); } catch (e) {} }, dur * 1000 + 80);
    return { src: s, out: g };
  };

  // ---------- 环境底噪 ----------
  A.ambient = function (kind) {
    if (!A.ready) return;
    A.stopAmbient();
    var ctx = A.ctx;
    var g = ctx.createGain();
    g.gain.value = 0;
    g.connect(A.master);

    var oscs = [], base = 55;
    if (kind === 'store') base = 62;
    if (kind === 'stairs') base = 47;
    if (kind === 'home') base = 41;
    if (kind === 'garage') base = 43;
    if (kind === 'living') base = 52;

    for (var i = 0; i < 2; i++) {
      var o = ctx.createOscillator();
      o.type = i === 0 ? 'sine' : 'triangle';
      o.frequency.value = base * (i === 0 ? 1 : 1.005);
      var og = ctx.createGain();
      og.gain.value = i === 0 ? 0.16 : 0.05;
      o.connect(og); og.connect(g);
      o.start();
      oscs.push(o);
    }

    // 高频空气声
    var n = A._noise(3600);
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = kind === 'store' ? 2400 : (kind === 'living' ? 3400 : (kind === 'garage' ? 520 : 900));
    bp.Q.value = kind === 'living' ? 0.9 : 0.7;
    var ng = ctx.createGain(); ng.gain.value = kind === 'store' ? 0.012 : (kind === 'living' ? 0.030 : 0.018);
    n.src.connect(bp); bp.connect(ng); ng.connect(g);

    // 缓慢呼吸 LFO
    var lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    var lg = ctx.createGain(); lg.gain.value = 0.35;
    lfo.connect(lg); lg.connect(g.gain);
    lfo.start();

    g.gain.linearRampToValueAtTime(0.55, ctx.currentTime + 2.4);
    A.amb = { g: g, oscs: oscs.concat([lfo]), noise: n };
  };

  A.stopAmbient = function () {
    if (!A.amb || !A.ctx) { A.amb = null; return; }
    try {
      var t = A.ctx.currentTime;
      A.amb.g.gain.cancelScheduledValues(t);
      A.amb.g.gain.setValueAtTime(A.amb.g.gain.value, t);
      A.amb.g.gain.linearRampToValueAtTime(0.0001, t + 0.8);
      var nodes = A.amb.oscs.slice();
      setTimeout(function () {
        nodes.forEach(function (o) { try { o.stop(); } catch (e) {} });
        try { A.amb && A.amb.noise.src.stop(); } catch (e) {}
      }, 900);
    } catch (e) {}
    A.amb = null;
  };

  // 滴水（车库里那种）
  A.drip = function (vol) {
    if (!A.ready) return;
    try {
      var ctx = A.ctx, t0 = ctx.currentTime;
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(1400, t0);
      o.frequency.exponentialRampToValueAtTime(320, t0 + 0.10);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime((vol == null ? 0.10 : vol), t0 + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
      o.connect(g); g.connect(A.master);
      o.start(t0); o.stop(t0 + 0.26);
    } catch (e) {}
  };

  // 远处拖拽摩擦
  A.drag = function (vol) {
    if (!A.ready) return;
    try {
      var ctx = A.ctx, t0 = ctx.currentTime;
      var n = A._noise(0.9);
      var bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(320, t0);
      bp.frequency.linearRampToValueAtTime(760, t0 + 0.7);
      bp.Q.value = 1.6;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime((vol == null ? 0.05 : vol), t0 + 0.25);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.85);
      n.src.connect(bp); bp.connect(g); g.connect(A.master);
    } catch (e) {}
  };

  // 尖叫：噪声 + 下滑锯齿
  A.scream = function (vol) {
    if (!A.ready) return;
    try {
      var ctx = A.ctx, t0 = ctx.currentTime, v = vol == null ? 0.34 : vol;
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(1180, t0);
      o.frequency.exponentialRampToValueAtTime(220, t0 + 0.55);
      var lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 2600; lp.Q.value = 6;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(v, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.85);
      o.connect(lp); lp.connect(g); g.connect(A.master);
      o.start(t0); o.stop(t0 + 0.9);
      var n = A._noise(0.8), bp = ctx.createBiquadFilter(), ng = ctx.createGain();
      bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 0.9;
      ng.gain.setValueAtTime(0.0001, t0);
      ng.gain.exponentialRampToValueAtTime(v * 0.55, t0 + 0.03);
      ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.7);
      n.src.connect(bp); bp.connect(ng); ng.connect(A.master);
    } catch (e) {}
  };

  // 贴得很近的呼吸
  A.breath = function (vol) {
    if (!A.ready) return;
    try {
      var ctx = A.ctx, t0 = ctx.currentTime, v = vol == null ? 0.05 : vol;
      var n = A._noise(2.6), bp = ctx.createBiquadFilter(), g = ctx.createGain();
      bp.type = 'bandpass'; bp.frequency.value = 640; bp.Q.value = 1.1;
      g.gain.value = 0.0001;
      for (var i = 0; i < 3; i++) {
        var t = t0 + i * 0.82;
        g.gain.linearRampToValueAtTime(v, t + 0.20);
        g.gain.linearRampToValueAtTime(0.0001, t + 0.68);
      }
      n.src.connect(bp); bp.connect(g); g.connect(A.master);
    } catch (e) {}
  };

  // 模糊的低语（不是人话）
  A.whisper = function (vol) {
    if (!A.ready) return;
    try {
      var ctx = A.ctx, t0 = ctx.currentTime, v = vol == null ? 0.05 : vol;
      var n = A._noise(2.2), bp = ctx.createBiquadFilter(), g = ctx.createGain();
      bp.type = 'bandpass'; bp.frequency.value = 1250; bp.Q.value = 7;
      g.gain.value = 0.0001;
      var lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.type = 'triangle'; lfo.frequency.value = 6.2; lg.gain.value = v * 0.9;
      lfo.connect(lg); lg.connect(g.gain);
      g.gain.linearRampToValueAtTime(v * 0.5, t0 + 0.4);
      g.gain.linearRampToValueAtTime(0.0001, t0 + 1.9);
      n.src.connect(bp); bp.connect(g); g.connect(A.master);
      lfo.start(t0); lfo.stop(t0 + 2.1);
    } catch (e) {}
  };

  // 沉闷的一声（重物 / 关门）
  A.thud = function (vol) {
    if (!A.ready) return;
    try {
      var ctx = A.ctx, t0 = ctx.currentTime, v = vol == null ? 0.22 : vol;
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(96, t0);
      o.frequency.exponentialRampToValueAtTime(38, t0 + 0.28);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(v, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
      o.connect(g); g.connect(A.master);
      o.start(t0); o.stop(t0 + 0.55);
    } catch (e) {}
  };
  // ---------- 脚步 ----------
  A.step = function (hard) {
    if (!A.ready) return;
    var ctx = A.ctx, t = ctx.currentTime;
    var n = A._noise(0.18);
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 780 + Math.random() * 260;
    bp.Q.value = 1.1;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(hard ? 0.16 : 0.085, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    n.src.connect(bp); bp.connect(g); g.connect(A.master);

    // 鞋底的低频
    var o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(52, t + 0.09);
    var og = ctx.createGain();
    og.gain.setValueAtTime(0.001, t);
    og.gain.linearRampToValueAtTime(0.09, t + 0.012);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(og); og.connect(A.master);
    o.start(t); o.stop(t + 0.14);
  };

  // ---------- 短促提示 ----------
  A.blip = function (freq, dur, vol, type) {
    if (!A.ready) return;
    var ctx = A.ctx, t = ctx.currentTime;
    var o = ctx.createOscillator();
    o.type = type || 'sine';
    o.frequency.value = freq;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol == null ? 0.06 : vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.12));
    o.connect(g); g.connect(A.master);
    o.start(t); o.stop(t + (dur || 0.12) + 0.02);
  };

  // ---------- 灯管闪 ----------
  A.buzz = function (dur) {
    if (!A.ready) return;
    var ctx = A.ctx, t = ctx.currentTime;
    var o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = 118;
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 1600; bp.Q.value = 3;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05, t + 0.02);
    g.gain.setValueAtTime(0.05, t + (dur || 0.3) - 0.03);
    g.gain.linearRampToValueAtTime(0, t + (dur || 0.3));
    o.connect(bp); bp.connect(g); g.connect(A.master);
    o.start(t); o.stop(t + (dur || 0.3) + 0.05);
  };

  // ---------- 恐怖音（弦乐刺 + 下坠 + 低频轰） ----------
  A.stab = function (power) {
    if (!A.ready) return;
    power = power == null ? 1 : power;
    var ctx = A.ctx, t = ctx.currentTime;

    var n = A._noise(1.4);
    var hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 600;
    var ng = ctx.createGain();
    ng.gain.setValueAtTime(0, t);
    ng.gain.linearRampToValueAtTime(0.22 * power, t + 0.012);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    n.src.connect(hp); hp.connect(ng); ng.connect(A.master);

    var o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(880, t);
    o.frequency.exponentialRampToValueAtTime(46, t + 0.85);
    var og = ctx.createGain();
    og.gain.setValueAtTime(0, t);
    og.gain.linearRampToValueAtTime(0.1 * power, t + 0.02);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 2600;
    o.connect(lp); lp.connect(og); og.connect(A.master);
    o.start(t); o.stop(t + 1.0);

    var b = ctx.createOscillator();
    b.type = 'sine';
    b.frequency.setValueAtTime(64, t);
    b.frequency.exponentialRampToValueAtTime(28, t + 1.2);
    var bg = ctx.createGain();
    bg.gain.setValueAtTime(0.001, t);
    bg.gain.linearRampToValueAtTime(0.34 * power, t + 0.03);
    bg.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
    b.connect(bg); bg.connect(A.master);
    b.start(t); b.stop(t + 1.4);
  };

  // ---------- 擦过耳边的风 ----------
  A.whoosh = function (vol) {
    if (!A.ready) return;
    var ctx = A.ctx, t = ctx.currentTime;
    var n = A._noise(1.0);
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.Q.value = 0.8;
    bp.frequency.setValueAtTime(420, t);
    bp.frequency.exponentialRampToValueAtTime(1900, t + 0.7);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol == null ? 0.11 : vol, t + 0.3);
    g.gain.linearRampToValueAtTime(0, t + 0.95);
    n.src.connect(bp); bp.connect(g); g.connect(A.master);
  };

  // ---------- 心跳 ----------
  A.heart = function (intensity) {
    if (!A.ready) return;
    var ctx = A.ctx;
    var mk = function (delay, vol) {
      var t = ctx.currentTime + delay;
      var o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(74, t);
      o.frequency.exponentialRampToValueAtTime(38, t + 0.16);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
      o.connect(g); g.connect(A.master);
      o.start(t); o.stop(t + 0.3);
    };
    var k = intensity == null ? 1 : intensity;
    mk(0, 0.2 * k);
    mk(0.19, 0.13 * k);
  };

  // ---------- 数字故障 ----------
  A.glitch = function () {
    if (!A.ready) return;
    var ctx = A.ctx, t = ctx.currentTime;
    for (var i = 0; i < 5; i++) {
      var o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = 180 + Math.random() * 2400;
      var g = ctx.createGain();
      var st = t + i * 0.035;
      g.gain.setValueAtTime(0, st);
      g.gain.linearRampToValueAtTime(0.035, st + 0.004);
      g.gain.linearRampToValueAtTime(0, st + 0.03);
      o.connect(g); g.connect(A.master);
      o.start(st); o.stop(st + 0.04);
    }
  };

  // ---------- 纸页/机关 ----------
  A.click = function () { A.blip(1400, 0.05, 0.05, 'square'); };

  w.SND = A;
})(window);
