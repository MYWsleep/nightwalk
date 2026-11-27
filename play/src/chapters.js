// chapters.js —— 四个短篇章节的脚本、事件与场景绘制
(function (w) {
  var CH = [];
  var PLAYER_X = 110;
  var FOOT_Y = 214;

  // 屏幕位置：s 是"从起点走到这里需要的距离"
  function sx(s, G) { return PLAYER_X + (s - G.d); }

  function inView(s, G, pad) {
    var x = sx(s, G);
    return x > -(pad || 200) && x < 480 + (pad || 200);
  }

  // =====================================================================
  // 第一章 · 下班
  // =====================================================================
  var C1 = {
    key: 'street',
    cn: '下 班',
    en: 'chapter one',
    pal: 'street',
    ambient: 'street',
    len: 5200,
    init: function (G) {
      G.light = 1;
      G.lampFlick = 0;
      G.ghost = { seen: false, s: 3120 };
    },
    update: function (G, dt) {
      // 越接近结尾，灯越不稳
      var near = U.span(G.d, 3600, 4600);
      G.lampFlick = near * 0.6;
    },
    draw: function (ctx, G) {
      var pal = G.pal;
      ART.sky(ctx, pal, G.t, { stars: true, moon: 1 });
      ART.cityFar(ctx, G.d, pal, 1337, false);
      ART.cityMid(ctx, G.d, pal, 7717);
      ART.ground(ctx, G.d, pal);

      // 路灯
      var gap = 430;
      var k0 = Math.floor((G.d - 260) / gap), k1 = Math.ceil((G.d + 780) / gap);
      for (var k = k0; k <= k1; k++) {
        var s = k * gap;
        var x = sx(s, G);
        if (x < -140 || x > 620) continue;
        var on = 1;
        // 后面几盏开始闪
        if (k >= 8) {
          var fl = G.lampFlick * (0.5 + 0.5 * Math.sin(G.t * (7 + k) + k * 1.7));
          on = 1 - fl * (0.85 + 0.15 * Math.sin(G.t * 31 + k));
          if (G.flags.blackout > 0) on = 0;
        }
        ART.lamp(ctx, x, U.clamp(on, 0, 1), pal, 1);
      }

      // 树
      var trees = [180, 700, 1180, 1720, 2380, 2960, 3540, 4180, 4820];
      for (var i = 0; i < trees.length; i++) {
        var ts = trees[i];
        if (!inView(ts, G)) continue;
        ART.tree(ctx, sx(ts, G), 132 + (i % 3) * 20, pal, 100 + i * 37);
      }

      // 栏杆
      var fences = [[520, 260], [2020, 300], [3900, 220]];
      for (var f = 0; f < fences.length; f++) {
        var fs = fences[f][0], fw = fences[f][1];
        if (!inView(fs, G) && !inView(fs + fw, G)) continue;
        ART.fence(ctx, sx(fs, G), fw, pal);
      }

      // 公交站牌
      if (inView(860, G)) {
        var bx = sx(860, G);
        ctx.fillStyle = '#151a22';
        ctx.fillRect((bx - 2) | 0, ART.HORIZON - 74, 4, 74);
        ctx.fillStyle = '#1d242e';
        ctx.fillRect((bx - 14) | 0, ART.HORIZON - 96, 28, 24);
        ctx.fillStyle = 'rgba(200,215,230,0.30)';
        ctx.fillRect((bx - 10) | 0, ART.HORIZON - 92, 20, 2);
        ctx.fillRect((bx - 10) | 0, ART.HORIZON - 86, 14, 2);
        ctx.fillRect((bx - 10) | 0, ART.HORIZON - 81, 17, 2);
      }

      // 那个"人"
      var gs = G.ghost.s;
      if (!G.ghost.gone) {
        if (inView(gs, G)) {
          var gx = sx(gs, G);
          ART.person(ctx, gx, ART.HORIZON + 6, 0, {
            scale: 1.02, color: '#04050a', walking: false, rim: 'rgba(190,210,235,0.20)'
          });
        }
        if (G.d > gs + 40) { G.ghost.gone = true; SND.whoosh(0.05); }
      }

      // ---- 恐怖元素 ----
      // 卷帘门上被抹掉一半的招牌缝里，有东西在看
      if (inView(1980, G, 140)) {
        var e1 = sx(1980, G);
        ctx.fillStyle = 'rgba(2,3,5,0.92)';
        ctx.fillRect((e1 - 3) | 0, ART.HORIZON - 58, 8, 58);
        ART.eyes(ctx, e1 + 1, ART.HORIZON - 40, G.t, 0.62 + 0.2 * Math.sin(G.t * 0.9));
      }
      // 墙上的血手印（两处，第二处更低，像有人被拖过去）
      if (inView(1420, G, 120)) {
        ART.handprint(ctx, sx(1420, G), ART.HORIZON - 66, 0.92, 0.42);
        ART.handprint(ctx, sx(1508, G), ART.HORIZON - 40, 0.78, 0.30);
      }
      if (inView(3860, G, 120)) {
        ART.handprint(ctx, sx(3860, G), ART.HORIZON - 52, 1.05, 0.36);
        ART.scratches(ctx, sx(3900, G), ART.HORIZON - 74, 26, 52, 331, 0.40);
      }
      // 树丛后的一双眼睛
      if (inView(1850, G, 100)) {
        ART.eyes(ctx, sx(1850, G), ART.HORIZON - 34, G.t + 1.7, 0.55);
      }
      // 路边停着的车，车窗后有张脸
      if (inView(2760, G, 220)) {
        var cx1 = sx(2760, G);
        ART.car(ctx, cx1, ART.HORIZON + 12, 96, 40, 77);
        // 车窗里的脸（贴得很近）
        var fy = ART.HORIZON + 12 - 40 * 0.80;
        ctx.save();
        ctx.globalAlpha = 0.50;
        ctx.fillStyle = 'rgba(196,186,172,0.9)';
        ctx.beginPath();
        ctx.ellipse(cx1 + 40, fy + 4, 5.2, 6.6, 0, 0, 6.284);
        ctx.fill();
        ctx.fillStyle = 'rgba(6,4,4,0.95)';
        ctx.beginPath();
        ctx.ellipse(cx1 + 38.2, fy + 3, 1.1, 1.4, 0, 0, 6.284);
        ctx.ellipse(cx1 + 41.6, fy + 3, 1.1, 1.4, 0, 0, 6.284);
        ctx.fill();
        ctx.restore();
      }
      // 电线杆上垂下来的头发
      if (inView(3300, G, 120)) {
        ART.hairStrands(ctx, sx(3300, G) - 8, ART.HORIZON - 96, 18, 46, G.t, 0.62);
      }
      // 地面上的拖痕
      if (inView(4600, G, 160)) {
        ctx.save();
        ctx.globalAlpha = 0.30;
        ctx.strokeStyle = 'rgba(70,12,10,0.9)';
        ctx.lineWidth = 2.2;
        var tx0 = sx(4560, G);
        ctx.beginPath();
        ctx.moveTo(tx0, ART.HORIZON + 16);
        ctx.quadraticCurveTo(tx0 + 40, ART.HORIZON + 22, tx0 + 96, ART.HORIZON + 19);
        ctx.stroke();
        ctx.restore();
      }

      // 雨丝
      ART.rain(ctx, G.t, 32 + Math.floor(U.span(G.d, 3200, 5200) * 50), 'rgba(170,200,225,0.13)');
    },
    events: [
      { at: 260, say: '又是这个点。' },
      { at: 980, say: '最后一班公交已经走了。' },
      { at: 1780, say: '走路回去，四十分钟。' },
      { at: 2520, act: function (G) { SND.buzz(0.6); G.flicker(0.5); } },
      { at: 3180, say: '……' , mood: 'eerie' },
      { at: 3260, act: function (G) { SND.whoosh(0.09); } },
      { at: 3620, say: '这条街，好像走过一遍了。', mood: 'eerie' },
      { at: 4200, act: function (G) { SND.heart(1.1); G.shake = 2; } },
      { at: 4460, say: '前面有人。', mood: 'eerie' },
      { at: 4700, act: function (G) { SND.stab(0.4); G.shake = 4; } },
      { at: 4980, say: '他一直站在那里，没有动。', mood: 'eerie' },
      { at: 5180, scare: 1.0 }
    ]
  };

  // =====================================================================
  // 第二章 · 便利店
  // =====================================================================
  var C2 = {
    key: 'store',
    cn: '便 利 店',
    en: 'chapter two',
    pal: 'store',
    ambient: 'store',
    len: 4300,
    init: function (G) {
      G.light = 1;
      G.clerkGone = false;
      G.labelSwap = false;
    },
    update: function (G, dt) {
      // 走到 2100 之后灯开始抽
      G.storeFlicker = U.span(G.d, 1900, 2600) > 0.4;
    },
    draw: function (ctx, G) {
      var pal = G.pal;
      var flick = G.storeFlicker ? (0.6 + 0.4 * Math.sin(G.t * 26)) : 1;
      ART.storeInterior(ctx, G.d, pal, G.t, { lightOn: flick, flicker: G.storeFlicker });

      // 货架
      var shelfGap = 250;
      var k0 = Math.floor((G.d - 200) / shelfGap), k1 = Math.ceil((G.d + 700) / shelfGap);
      for (var k = k0; k <= k1; k++) {
        var s = k * shelfGap + 120;
        var x = sx(s, G);
        if (x < -160 || x > 620) continue;
        ART.shelf(ctx, x, 86, 66, 30 + k * 13);
      }

      // 收银台 + 店员
      if (!G.clerkGone) {
        var cs = 2200;
        if (inView(cs, G, 260)) {
          var cx = sx(cs, G);
          // 台子
          ctx.fillStyle = '#333a42';
          ctx.fillRect((cx - 6) | 0, ART.HORIZON - 22, 84, 26);
          ctx.fillStyle = '#414a53';
          ctx.fillRect((cx - 6) | 0, ART.HORIZON - 22, 84, 3);
          ctx.fillStyle = 'rgba(255,255,255,0.06)';
          ctx.fillRect((cx - 6) | 0, ART.HORIZON - 22, 84, 1);
          ctx.fillStyle = 'rgba(0,0,0,0.35)';
          ctx.fillRect((cx - 6) | 0, ART.HORIZON + 4, 84, 7);
          // 店员
          ART.person(ctx, cx + 42, ART.HORIZON + 6, 0, {
            scale: 0.94, color: '#0f1418', walking: false
          });
          // 收银机
          ctx.fillStyle = '#20262c';
          ctx.fillRect((cx + 6) | 0, ART.HORIZON - 32, 16, 10);
          ctx.fillStyle = 'rgba(150,220,255,0.42)';
          ctx.fillRect((cx + 9) | 0, ART.HORIZON - 29, 5, 3);
        }
      }

      // 冷柜（背景）
      for (var j = 0; j < 6; j++) {
        var qs = 300 + j * 640;
        if (!inView(qs, G, 240)) continue;
        var qx = sx(qs, G) | 0;
        var qw = 46, qh = 60, qy = ART.HORIZON - qh;
        var qg = ctx.createLinearGradient(0, qy, 0, qy + qh);
        qg.addColorStop(0, 'rgba(18,24,30,0.94)');
        qg.addColorStop(1, 'rgba(12,17,22,0.94)');
        ctx.fillStyle = qg;
        ctx.fillRect(qx, qy, qw, qh);
        var qin = ctx.createLinearGradient(0, qy, 0, qy + qh);
        qin.addColorStop(0, 'rgba(198,232,255,0.15)');
        qin.addColorStop(1, 'rgba(150,200,235,0.04)');
        ctx.fillStyle = qin;
        ctx.fillRect(qx + 3, qy + 3, qw - 6, qh - 6);
        var qrr = U.rng(j * 17 + 3);
        for (var lv = 0; lv < 3; lv++) {
          var ly = qy + 12 + lv * 16;
          ctx.fillStyle = 'rgba(210,240,255,0.20)';
          ctx.fillRect(qx + 5, ly, qw - 10, 1);
          for (var bx2 = qx + 6; bx2 < qx + qw - 8; bx2 += 5) {
            var bh = 5 + qrr() * 6;
            ctx.fillStyle = 'hsla(' + Math.floor(178 + qrr() * 40) + ',24%,' + Math.round(38 + qrr() * 14) + '%,0.8)';
            ctx.fillRect(bx2, Math.round(ly - bh), 3, Math.round(bh));
          }
        }
        ctx.fillStyle = 'rgba(255,255,255,0.045)';
        ctx.fillRect(qx + 5, qy + 3, 6, qh - 6);
        ctx.strokeStyle = 'rgba(150,190,220,0.26)';
        ctx.lineWidth = 1;
        ctx.strokeRect(qx + 0.5, qy + 0.5, qw - 1, qh - 1);
        ctx.fillStyle = 'rgba(180,220,245,0.06)';
        ctx.fillRect(qx - 2, ART.HORIZON, qw + 4, 3);
      }

      // 玻璃门 / 出口
      if (inView(3900, G, 300)) {
        var gx = sx(3900, G);
        ctx.fillStyle = 'rgba(120,160,190,0.16)';
        ctx.fillRect((gx - 40) | 0, ART.HORIZON - 130, 96, 130);
        ctx.fillStyle = 'rgba(200,225,245,0.25)';
        ctx.fillRect((gx - 40) | 0, ART.HORIZON - 130, 2, 130);
        ctx.fillRect((gx + 54) | 0, ART.HORIZON - 130, 2, 130);
        // 玻璃上的血手印
        ART.handprint(ctx, gx - 10, ART.HORIZON - 76, 0.86, 0.34);
        ART.handprint(ctx, gx + 30, ART.HORIZON - 96, 0.62, 0.22);
      }

      // ---- 恐怖元素 ----
      // 冷柜玻璃后面贴着一张脸（第三组冷柜）
      if (inView(1580, G, 120)) {
        var fz = sx(1580, G) | 0;
        var fyy = ART.HORIZON - 44;
        ctx.save();
        ctx.globalAlpha = 0.42 + 0.18 * Math.sin(G.t * 1.4);
        ctx.fillStyle = 'rgba(188,200,196,0.85)';
        ctx.beginPath();
        ctx.ellipse(fz + 23, fyy, 6.4, 8.0, 0, 0, 6.284);
        ctx.fill();
        ctx.fillStyle = 'rgba(4,6,6,0.95)';
        ctx.beginPath();
        ctx.ellipse(fz + 20.4, fyy - 1.4, 1.3, 1.7, 0, 0, 6.284);
        ctx.ellipse(fz + 25.6, fyy - 1.4, 1.3, 1.7, 0, 0, 6.284);
        ctx.fill();
        ctx.fillStyle = 'rgba(8,4,4,0.9)';
        ctx.fillRect(fz + 20, fyy + 4.2, 7, 1.8);
        ctx.restore();
      }
      // 货架尽头站着的人影
      if (inView(1180, G, 160)) {
        ART.figure(ctx, sx(1180, G), ART.HORIZON + 6, 0, {
          scale: 0.95, color: 'rgba(4,6,8,0.96)', rim: 'rgba(170,200,220,0.10)'
        });
        ART.eyes(ctx, sx(1180, G), ART.HORIZON - 36, G.t, 0.5);
      }
      // 天花板的垂发
      if (inView(2640, G, 120)) ART.hairStrands(ctx, sx(2640, G), 0, 46, 62, G.t, 0.55);
      if (inView(3520, G, 120)) ART.hairStrands(ctx, sx(3520, G), 0, 34, 78, G.t + 2, 0.45);
      // 收银台后的抓痕
      if (inView(2200, G, 160)) ART.scratches(ctx, sx(2200, G) - 12, ART.HORIZON - 96, 30, 58, 917, 0.35);
    },
    events: [
      { at: 240, say: '进来买瓶水。' },
      { at: 900, say: '灯管在响。', mood: 'eerie' },
      { at: 1560, act: function (G) { SND.buzz(0.8); G.flicker(0.3); } },
      { at: 2100, say: '店员一直在看我。', mood: 'eerie' },
      { at: 2280, act: function (G) { SND.blip(700, 0.1, 0.04, 'square'); } },
      { at: 2760, say: '货架上的牌子，是不是换了。', mood: 'eerie' },
      { at: 3020, act: function (G) { SND.glitch(); G.shake = 1.5; } },
      { at: 3300, say: '我想回头看一眼。', mood: 'eerie' },
      { at: 3480, act: function (G) { G.clerkGone = true; SND.whoosh(0.1); } },
      { at: 3560, say: '收银台后面没有人了。', mood: 'eerie' },
      { at: 3900, act: function (G) { SND.heart(1.0); G.shake = 3; } },
      { at: 4120, say: '玻璃上，多了一个人。', mood: 'eerie' },
      { at: 4280, scare: 1.0 }
    ]
  };

  // =====================================================================
  // 第三章 · 楼道
  // =====================================================================
  var C3 = {
    key: 'stairs',
    cn: '楼 道',
    en: 'chapter four',
    pal: 'stairs',
    ambient: 'stairs',
    stalk: true,
    len: 4600,
    init: function (G) {
      G.light = 1;
      G.floor = 5;
      G.lampTimer = 0;
      G.lampOn = 1;
    },
    update: function (G, dt) {
      // 每一步踏响声控灯
      if (G.moving) {
        G.lampTimer -= dt;
        if (G.lampTimer <= 0) {
          G.lampTimer = 1.05;
          SND.click();
        }
      }
      // 越往后灯越暗
      var decay = 1 - U.span(G.d, 2400, 4300) * 0.88;
      G.lampOn = decay * (0.82 + 0.18 * Math.sin(G.t * 3.1));
      G.floor = Math.max(-1, Math.round(5 - G.d / 620));
    },
    draw: function (ctx, G) {
      var pal = G.pal;
      ART.stairs(ctx, G.d, pal, G.t, { lightOn: G.lampOn });

      // 楼层门
      var gap = 620;
      var k0 = Math.floor((G.d - 200) / gap), k1 = Math.ceil((G.d + 620) / gap);
      for (var k = k0; k <= k1; k++) {
        var s = k * gap + 160;
        var x = sx(s, G);
        if (x < -180 || x > 640) continue;
        var floor = 5 - k;
        ART.door(ctx, x, 46, 60, { color: floor === 0 ? '#2a2320' : '#241d17' });
        // 门牌
        var label = floor > 0 ? (floor + '0' + (k % 4 + 1)) : (floor === 0 ? '000' : '-' + Math.abs(floor) + '0' + (k % 4 + 1));
        ctx.save();
        ctx.globalAlpha = 0.55 + G.lampOn * 0.4;
        var l2 = flickerNo(label, G, k);
        ART.pixelDigits(ctx, l2, x + 23 - l2.length * 4, ART.HORIZON - 52, 1.6, '#e8f0f8');
        ctx.restore();
      }

      // 楼层告示
      if (inView(1500, G, 260)) {
        var ax = sx(1500, G);
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect((ax - 21) | 0, ART.HORIZON - 79, 42, 30);
        ctx.fillStyle = 'rgba(176,172,158,0.15)';
        ctx.fillRect((ax - 20) | 0, ART.HORIZON - 78, 40, 28);
        ctx.fillStyle = 'rgba(30,33,38,0.45)';
        for (var i2 = 0; i2 < 4; i2++) ctx.fillRect((ax - 15) | 0, ART.HORIZON - 73 + i2 * 5, 30, 1);
      }

      // 尽头的窗
      if (inView(4600, G, 320)) {
        var wx = sx(4600, G);
        ctx.fillStyle = 'rgba(150,175,200,0.14)';
        ctx.fillRect((wx - 30) | 0, ART.HORIZON - 150, 60, 70);
        ctx.fillStyle = 'rgba(200,225,250,0.30)';
        ctx.fillRect((wx - 30) | 0, ART.HORIZON - 150, 1, 70);
        ctx.fillRect((wx - 30) | 0, ART.HORIZON - 115, 60, 1);
        // 窗外的脸
        ctx.save();
        ctx.globalAlpha = 0.34 + 0.12 * Math.sin(G.t * 1.1);
        ctx.fillStyle = 'rgba(196,204,208,0.9)';
        ctx.beginPath();
        ctx.ellipse(wx + 6, ART.HORIZON - 122, 7.4, 9.2, 0, 0, 6.284);
        ctx.fill();
        ctx.fillStyle = 'rgba(4,6,8,0.95)';
        ctx.beginPath();
        ctx.ellipse(wx + 3.4, ART.HORIZON - 124, 1.4, 1.8, 0, 0, 6.284);
        ctx.ellipse(wx + 8.8, ART.HORIZON - 124, 1.4, 1.8, 0, 0, 6.284);
        ctx.fill();
        ctx.restore();
      }

      // ---- 恐怖元素 ----
      // 天花板垂落的头发
      if (inView(960, G, 120)) ART.hairStrands(ctx, sx(960, G), 0, 40, 54, G.t, 0.5);
      if (inView(2240, G, 120)) ART.hairStrands(ctx, sx(2240, G), 0, 52, 72, G.t + 1.2, 0.58);
      if (inView(3480, G, 120)) ART.hairStrands(ctx, sx(3480, G), 0, 30, 46, G.t + 2.4, 0.42);
      // 门缝里的眼睛（每层某扇门）
      if (inView(780, G, 120)) {
        var dx3 = sx(780, G);
        ctx.fillStyle = 'rgba(0,0,0,0.95)';
        ctx.fillRect((dx3 + 44) | 0, ART.HORIZON - 62, 3, 62);
        ART.eyes(ctx, dx3 + 45.5, ART.HORIZON - 44, G.t, 0.55);
      }
      if (inView(2640, G, 120)) {
        var dx4 = sx(2640, G);
        ctx.fillStyle = 'rgba(0,0,0,0.95)';
        ctx.fillRect((dx4 + 44) | 0, ART.HORIZON - 62, 3, 62);
        ART.eyes(ctx, dx4 + 45.5, ART.HORIZON - 36, G.t + 1.9, 0.48);
      }
      // 墙上的血手印与抓痕
      if (inView(1320, G, 120)) {
        ART.handprint(ctx, sx(1320, G), ART.HORIZON - 78, 0.84, 0.36);
        ART.scratches(ctx, sx(1360, G), ART.HORIZON - 96, 28, 62, 451, 0.42);
      }
      if (inView(3180, G, 120)) ART.handprint(ctx, sx(3180, G), ART.HORIZON - 58, 1.0, 0.30);
      // 转角伸出来的一只手
      if (inView(4060, G, 140)) {
        var hx3 = sx(4060, G);
        ctx.save();
        ctx.fillStyle = 'rgba(164,156,146,0.55)';
        ART.rr(ctx, hx3 + 4, ART.HORIZON - 26, 9, 16, 3);
        ctx.fill();
        for (var fi = 0; fi < 4; fi++) {
          ctx.fillRect((hx3 + 5 + fi * 2) | 0, ART.HORIZON - 34, 1.6, 9);
        }
        ctx.restore();
      }
    },
    events: [
      { at: 200, say: '电梯坏了。' },
      { at: 860, say: '五楼而已。' },
      { at: 1600, say: '……四楼。', mood: 'eerie' },
      { at: 2300, say: '三楼。', mood: 'eerie' },
      { at: 2900, act: function (G) { SND.buzz(0.5); } },
      { at: 2360, act: function (G) { SND.whisper(0.07); G.shake = 2; } },
      { at: 3060, say: '这个灯，是我踩出来的吗。', mood: 'eerie' },
      { at: 3500, act: function (G) { SND.heart(1.2); G.shake = 2; } },
      { at: 3620, say: '二楼……不对。', mood: 'eerie' },
      { at: 3980, act: function (G) { SND.whoosh(0.12); G.shake = 3; } },
      { at: 4100, say: '这栋楼只有六层。', mood: 'eerie' },
      { at: 4380, act: function (G) { SND.stab(0.5); } },
      { at: 4470, say: '可我一直在往下走。', mood: 'eerie' },
      { at: 4580, scare: 0.9 }
    ]
  };

  // =====================================================================
  // 第四章 · 家
  // =====================================================================
  var C4 = {
    key: 'home',
    cn: '到 家',
    en: 'chapter five',
    pal: 'home',
    ambient: 'home',
    len: 3600,
    init: function (G) {
      G.light = 1;
      G.figureTurned = false;
    },
    update: function (G, dt) {},
    draw: function (ctx, G) {
      var pal = G.pal;
      ART.homeHall(ctx, G.d, pal, G.t, {});

      var gap = 520;
      var k0 = Math.floor((G.d - 200) / gap), k1 = Math.ceil((G.d + 620) / gap);
      for (var k = k0; k <= k1; k++) {
        var s = k * gap + 150;
        var x = sx(s, G);
        if (x < -180 || x > 640) continue;
        if (k === 0) continue; // 第一个位置留给"自己家门"
        ART.door(ctx, x, 44, 58, {});
        // 门牌：走过之后再看，号会变
        var hp = flickerNo('60' + (k % 4 + 1), G, k);
        ctx.save();
        ctx.globalAlpha = 0.52;
        ART.pixelDigits(ctx, hp, x + 22 - hp.length * 4, ART.HORIZON - 50, 1.5, '#e6eef6');
        ctx.restore();
      }

      // 尽头：自己家门
      var ds = G.len - 120;
      if (inView(ds, G, 260)) {
        var dx = sx(ds, G);
        // 门框
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect((dx - 36) | 0, ART.HORIZON - 74, 72, 76);
        ART.door(ctx, dx - 31, 62, 70, { color: '#241c15', underLight: 0.30, plate: false });
        // 门缝里透出的光
        var lg = ctx.createLinearGradient(dx - 31, 0, dx + 31, 0);
        lg.addColorStop(0, 'rgba(255,205,140,0)');
        lg.addColorStop(0.5, 'rgba(255,205,140,' + (0.05 + 0.09 * G.light).toFixed(2) + ')');
        lg.addColorStop(1, 'rgba(255,205,140,0)');
        ctx.fillStyle = lg;
        ctx.fillRect((dx - 31) | 0, ART.HORIZON - 74, 62, 76);

        // 自己家的门牌：数字对不上
        var own = flickerNo('602', G, 9);
        ctx.save();
        ctx.globalAlpha = 0.60;
        ART.pixelDigits(ctx, own, dx + 24, ART.HORIZON - 60, 1.7, '#ffe7c0');
        ctx.restore();

        // 门口的人
        if (!G.figureGone) {
          ART.person(ctx, dx + 8, ART.HORIZON + 9, 0, {
            scale: 1.06, color: '#020306', walking: false,
            rim: 'rgba(255,210,150,0.22)'
          });
        }
      }

      // 头顶吊灯
      for (var i = 0; i < 16; i++) {
        var ls = 200 + i * 340;
        if (!inView(ls, G, 200)) continue;
        var lx = sx(ls, G);
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(lx | 0, 0, 1, 14);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        var g = ctx.createRadialGradient(lx, 16, 2, lx, 86, 168);
        g.addColorStop(0, 'rgba(255,204,142,0.46)');
        g.addColorStop(0.45, 'rgba(255,190,126,0.13)');
        g.addColorStop(1, 'rgba(255,180,110,0)');
        ctx.fillStyle = g;
        ctx.fillRect(lx - 176, 0, 352, 240);
        // 地面光斑
        var fg = ctx.createRadialGradient(lx, ART.HORIZON + 26, 2, lx, ART.HORIZON + 26, 96);
        fg.addColorStop(0, 'rgba(255,196,140,0.16)');
        fg.addColorStop(1, 'rgba(255,190,130,0)');
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.ellipse(lx, ART.HORIZON + 26, 90, 26, 0, 0, 6.284);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = 'rgba(255,214,164,0.86)';
        ctx.fillRect((lx - 4) | 0, 13, 9, 3);
      }

      // ---- 恐怖元素 ----
      // 相框（一张被划掉的脸）
      if (inView(700, G, 120)) ART.frame(ctx, sx(700, G), ART.HORIZON - 96, 30, 38, { slashed: true });
      if (inView(1420, G, 120)) ART.frame(ctx, sx(1420, G), ART.HORIZON - 92, 24, 30, { who: true });
      // 天花板垂落的头发
      if (inView(1860, G, 120)) ART.hairStrands(ctx, sx(1860, G), 26, 44, 58, G.t, 0.5);
      // 墙上的血手印
      if (inView(2460, G, 120)) {
        ART.handprint(ctx, sx(2460, G), ART.HORIZON - 74, 0.88, 0.34);
        ART.scratches(ctx, sx(2500, G), ART.HORIZON - 92, 24, 56, 771, 0.38);
      }
      // 暗处的眼睛
      if (inView(3060, G, 120)) ART.eyes(ctx, sx(3060, G), ART.HORIZON - 52, G.t + 0.8, 0.5);

      ART.dust(ctx, G.t, 46);
    },
    events: [
      { at: 220, say: '到家了。' },
      { at: 900, say: '楼道里的灯，好几年没换过了。', mood: 'eerie' },
      { at: 1500, act: function (G) { SND.click(); } },
      { at: 1180, act: function (G) { SND.breath(0.08); } },
      { at: 1620, say: '门是开的。', mood: 'eerie' },
      { at: 2100, act: function (G) { SND.heart(1.0); } },
      { at: 2280, say: '钥匙还在我口袋里。', mood: 'eerie' },
      { at: 2760, act: function (G) { SND.whoosh(0.1); G.shake = 2; } },
      { at: 2880, say: '有人站在走廊尽头。', mood: 'eerie' },
      { at: 3180, act: function (G) { SND.heart(1.4); G.shake = 3; } },
      { at: 3300, say: '他穿着和我一样的衣服。', mood: 'eerie' },
      { at: 3520, scare: 0.95 }
    ]
  };


  // =====================================================================
  // 第三章 · 车库
  // =====================================================================
  var C5 = {
    key: 'garage',
    cn: '车 库',
    en: 'chapter three',
    pal: 'garage',
    ambient: 'garage',
    stalk: true,
    len: 4800,
    init: function (G) {
      G.light = 1;
      G.lampTimer = 0;
      G.lampOn = 1;
      G.sawFeet = false;
      G.carFaceOn = false;
    },
    update: function (G, dt) {
      var decay = 1 - U.span(G.d, 2600, 4600) * 0.80;
      G.lampOn = decay * (0.84 + 0.16 * Math.sin(G.t * 2.4));
      if (G.moving) {
        G.lampTimer -= dt;
        if (G.lampTimer <= 0) { G.lampTimer = 0.86; SND.step(false); }
    G.dripTimer = (G.dripTimer || 0) - dt;
    if (G.dripTimer <= 0) { G.dripTimer = 1.6 + Math.random() * 3.4; SND.drip(0.05 + Math.random() * 0.06); }
      }
    },
    draw: function (ctx, G) {
      var pal = G.pal;
      ART.garageInterior(ctx, G.d, pal, G.t, { lightOn: G.lampOn });

      // 柱子
      var pgap = 330;
      var k0 = Math.floor((G.d - 200) / pgap), k1 = Math.ceil((G.d + 700) / pgap);
      for (var k = k0; k <= k1; k++) {
        var s = k * pgap + 170;
        var x = sx(s, G);
        if (x < -140 || x > 620) continue;
        ART.pillar(ctx, x, ART.HORIZON + 4, 26, 120);
        // 柱上的手印
        if (k === 3) {
          ART.handprint(ctx, x + 6, ART.HORIZON - 74, 0.8, 0.32);
          ART.scratches(ctx, x + 4, ART.HORIZON - 92, 20, 54, 613, 0.34);
        }
        // 柱子编号
        ctx.save();
        ctx.globalAlpha = 0.20 + G.lampOn * 0.25;
        ART.pixelDigits(ctx, 'B' + (12 - k), x + 5, ART.HORIZON - 108, 1.3, '#cfe0ef');
        ctx.restore();
      }

      // 停着的车
      var cars = [960, 2120, 3320, 4260];
      for (var i = 0; i < cars.length; i++) {
        var cs = cars[i];
        if (!inView(cs, G, 240)) continue;
        var cx = sx(cs, G);
        ART.car(ctx, cx, ART.HORIZON + 14, 100, 42, 41 + i * 17);
        // 第一辆车：车底露出一双脚
        if (i === 0) {
          ctx.save();
          ctx.globalAlpha = 0.75;
          ctx.fillStyle = '#05070a';
          ctx.fillRect((cx + 44) | 0, ART.HORIZON + 8, 4, 9);
          ctx.fillRect((cx + 52) | 0, ART.HORIZON + 8, 4, 9);
          ctx.fillStyle = 'rgba(170,166,158,0.35)';
          ctx.fillRect((cx + 44) | 0, ART.HORIZON + 15, 4, 2);
          ctx.fillRect((cx + 52) | 0, ART.HORIZON + 15, 4, 2);
          ctx.restore();
        }
        // 最后一辆车：车窗里坐着人，走到近处才抬头
        if (i === 3) {
          var near = U.span(G.d, 4180, 4560);
          var hy2 = ART.HORIZON + 14 - 42 * 0.78;
          ctx.save();
          ctx.globalAlpha = 0.30 + near * 0.55;
          ctx.fillStyle = 'rgba(198,192,180,0.92)';
          ctx.beginPath();
          ctx.ellipse(cx + 46, hy2 + 1, 5.6, 7.2, 0, 0, 6.284);
          ctx.fill();
          // 眼睛：随靠近慢慢转过来
          var ex = 2.2;
          ctx.fillStyle = 'rgba(4,4,6,0.95)';
          ctx.beginPath();
          ctx.ellipse(cx + 46 - ex, hy2 - 1.6, 1.2, 1.6, 0, 0, 6.284);
          ctx.ellipse(cx + 46 + ex, hy2 - 1.6, 1.2, 1.6, 0, 0, 6.284);
          ctx.fill();
          ctx.restore();
        }
      }

      // 车与车之间的黑暗里，有东西在喘
      if (inView(2760, G, 120)) {
        ctx.fillStyle = 'rgba(2,3,4,0.9)';
        ctx.fillRect(sx(2760, G) | 0, ART.HORIZON - 80, 54, 84);
        ART.eyes(ctx, sx(2760, G) + 26, ART.HORIZON - 34, G.t + 1.1, 0.6);
      }
      // 天花板垂下的头发
      if (inView(1900, G, 120)) ART.hairStrands(ctx, sx(1900, G), 0, 46, 70, G.t, 0.52);
      if (inView(3700, G, 120)) ART.hairStrands(ctx, sx(3700, G), 0, 34, 52, G.t + 1.8, 0.44);
      // 水洼里倒映的脸（低头才看得见）
      if (inView(3880, G, 140)) {
        var px5 = sx(3880, G);
        ctx.save();
        ctx.globalAlpha = 0.26 + 0.10 * Math.sin(G.t * 1.6);
        ctx.fillStyle = 'rgba(200,220,240,0.75)';
        ctx.beginPath();
        ctx.ellipse(px5 + 20, ART.HORIZON + 34, 10, 4.4, 0, 0, 6.284);
        ctx.fill();
        ctx.fillStyle = 'rgba(2,4,6,0.9)';
        ctx.beginPath();
        ctx.ellipse(px5 + 16, ART.HORIZON + 33, 1.6, 1.1, 0, 0, 6.284);
        ctx.ellipse(px5 + 24, ART.HORIZON + 33, 1.6, 1.1, 0, 0, 6.284);
        ctx.fill();
        ctx.restore();
      }
      // 后视镜：镜子里多出来的一张脸
      if (inView(4620, G, 200)) {
        var mx = sx(4620, G);
        ART.car(ctx, mx, ART.HORIZON + 14, 96, 40, 99);
        var near2 = U.span(G.d, 4520, 4780);
        if (near2 > 0.15) {
          ctx.save();
          ctx.globalAlpha = 0.20 + near2 * 0.55;
          ctx.fillStyle = '#05070a';
          ctx.fillRect((mx + 20) | 0, ART.HORIZON - 30, 20, 11);
          ctx.fillStyle = 'rgba(198,190,178,0.9)';
          ctx.beginPath();
          ctx.ellipse(mx + 30, ART.HORIZON - 24, 4.6, 5.4, 0, 0, 6.284);
          ctx.fill();
          ctx.fillStyle = 'rgba(3,3,4,0.96)';
          ctx.beginPath();
          ctx.ellipse(mx + 28.4, ART.HORIZON - 25, 1.1, 1.4, 0, 0, 6.284);
          ctx.ellipse(mx + 31.8, ART.HORIZON - 25, 1.1, 1.4, 0, 0, 6.284);
          ctx.fill();
          ctx.restore();
        }
      }
    },
    events: [
      { at: 220, say: '车停在 B 区。' },
      { at: 820, say: '这个点了，还有这么多车。' },
      { at: 1400, act: function (G) { SND.blip(180, 0.12, 0.05, 'sine'); } },
      { at: 1520, say: '水滴声，一直在同一个节奏。', mood: 'eerie' },
      { at: 2160, act: function (G) { SND.whoosh(0.10); } },
      { at: 2280, say: '那辆车底下……有人躺着？', mood: 'eerie' },
      { at: 2720, act: function (G) { G.shake = 1.5; } },
      { at: 2840, say: '我数过车位的。', mood: 'eerie' },
      { at: 3180, act: function (G) { SND.buzz(0.7); G.flicker(0.3); } },
      { at: 3300, say: '刚才没有这一辆。', mood: 'eerie' },
      { at: 3760, act: function (G) { SND.heart(1.1); } },
      { at: 3880, say: '水洼里……不是我。', mood: 'eerie' },
      { at: 4260, act: function (G) { SND.glitch(); G.shake = 2; } },
      { at: 4400, say: '车窗里坐着人。', mood: 'eerie' },
      { at: 4620, act: function (G) { SND.stab(0.5); G.shake = 4; } },
      { at: 4740, scare: 1.0 }
    ]
  };

  // =====================================================================
  // 第六章 · 客厅
  // =====================================================================
  var C6 = {
    key: 'living',
    cn: '客 厅',
    en: 'chapter six',
    pal: 'living',
    ambient: 'living',
    stalk: true,
    len: 4200,
    init: function (G) {
      G.light = 1;
      G.tvOn = 1;
      G.figureSit = false;
    },
    update: function (G, dt) {
    G.dragTimer = (G.dragTimer || 0) - dt;
    if (G.dragTimer <= 0) { G.dragTimer = 2.4 + Math.random() * 4.2; SND.drag(0.035 + G.d * 0.000012); }
      // 电视闪得越来越凶
      var near = U.span(G.d, 1800, 3600);
      G.tvOn = 1 - near * 0.25 * (0.5 + 0.5 * Math.sin(G.t * 17));
    },
    draw: function (ctx, G) {
      var pal = G.pal;
      ART.livingRoom(ctx, G.d, pal, G.t, {});

      // 墙上的相框
      if (inView(620, G, 140)) ART.frame(ctx, sx(620, G), ART.HORIZON - 108, 34, 42, { slashed: true });
      if (inView(760, G, 140)) ART.frame(ctx, sx(760, G), ART.HORIZON - 100, 26, 32, {});
      if (inView(2480, G, 140)) ART.frame(ctx, sx(2480, G), ART.HORIZON - 112, 40, 48, { slashed: true, img: '#1c1a16' });
      if (inView(3140, G, 140)) ART.frame(ctx, sx(3140, G), ART.HORIZON - 96, 22, 28, {});

      // 落地灯（唯一的光源）
      if (inView(1010, G, 200)) ART.floorLamp(ctx, sx(1010, G), ART.HORIZON + 14, 0.9 + 0.1 * Math.sin(G.t * 1.7));
      if (inView(2880, G, 220)) ART.floorLamp(ctx, sx(2880, G), ART.HORIZON + 14, 0.72 + 0.06 * Math.sin(G.t * 2.3));
      if (inView(3620, G, 240)) ART.floorLamp(ctx, sx(3620, G), ART.HORIZON + 14, 0.66 + 0.05 * Math.sin(G.t * 2.9));
      if (inView(3980, G, 240)) ART.floorLamp(ctx, sx(3980, G), ART.HORIZON + 14, 0.58 + 0.04 * Math.sin(G.t * 3.3));

      // 沙发（两处）+ 坐着背对的人
      var sofas = [1080, 2560];
      for (var i = 0; i < sofas.length; i++) {
        var ss = sofas[i];
        if (!inView(ss, G, 220)) continue;
        var sx6 = sx(ss, G);
        ART.sofa(ctx, sx6, ART.HORIZON + 12, 92);
        if (i === 1) {
          // 沙发上坐着一个人，背对着
          var near = U.span(G.d, 2200, 2700);
          ctx.save();
          ctx.globalAlpha = 0.55 + near * 0.42;
          ctx.fillStyle = '#04060a';
          ctx.beginPath();
          ctx.ellipse(sx6 + 46, ART.HORIZON - 8, 6.4, 7.6, 0, 0, 6.284);
          ctx.fill();
          ART.rr(ctx, sx6 + 34, ART.HORIZON - 2, 24, 16, 4);
          ctx.fill();
          ctx.restore();
          // 那双手放在膝上
          ctx.fillStyle = 'rgba(176,166,154,0.28)';
          ctx.fillRect((sx6 + 56) | 0, ART.HORIZON + 2, 7, 2.4);
        }
      }

      // 电视
      var tvs = [1900];
      for (var j = 0; j < tvs.length; j++) {
        if (!inView(tvs[j], G, 260)) continue;
        var tx = sx(tvs[j], G);
        ART.tv(ctx, tx, ART.HORIZON - 40, 78, 52, G.t, G.tvOn);
        // 电视下面放着的柜子
        ctx.fillStyle = '#1a1410';
        ctx.fillRect((tx - 8) | 0, ART.HORIZON - 12, 94, 14);
        ctx.fillStyle = 'rgba(255,214,168,0.05)';
        ctx.fillRect((tx - 8) | 0, ART.HORIZON - 12, 94, 1);
        // 雪花里浮出一张脸（走近才看清）
        var deep = U.span(G.d, 2000, 3000);
        if (deep > 0.1 && G.tvOn > 0.2) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(tx + 3, ART.HORIZON - 37, 72, 46);
          ctx.clip();
          ctx.globalAlpha = 0.10 + deep * 0.55;
          ctx.translate(tx + 3 + 36 - 240, ART.HORIZON - 37 + 23 - 135);
          ART.face(ctx, G.t, 0.35 * deep, { tv: true });
          ctx.restore();
        }
      }

      // 窗帘（后面有轮廓）
      if (inView(3520, G, 200)) {
        var wx6 = sx(3520, G);
        ctx.fillStyle = 'rgba(10,14,20,0.85)';
        ctx.fillRect(wx6 - 4, ART.HORIZON - 132, 88, 96);
        ctx.fillStyle = 'rgba(150,175,200,0.10)';
        ctx.fillRect(wx6 + 4, ART.HORIZON - 128, 72, 88);
        // 窗外的雨
        ART.rain(ctx, G.t, 26, 'rgba(170,200,225,0.10)');
        // 窗帘后的站立轮廓
        ctx.save();
        ctx.globalAlpha = 0.42 + 0.10 * Math.sin(G.t * 0.8);
        ctx.fillStyle = 'rgba(6,8,10,0.96)';
        ctx.beginPath();
        ctx.ellipse(wx6 + 40, ART.HORIZON - 84, 7, 9, 0, 0, 6.284);
        ctx.fill();
        ART.rr(ctx, wx6 + 26, ART.HORIZON - 74, 28, 52, 6);
        ctx.fill();
        ctx.restore();
      }
      // 天花板垂发
      if (inView(1500, G, 120)) ART.hairStrands(ctx, sx(1500, G), 26, 52, 64, G.t, 0.5);
      if (inView(2900, G, 120)) ART.hairStrands(ctx, sx(2900, G), 26, 40, 48, G.t + 1.4, 0.42);
      // 墙上的手印与拖痕
      if (inView(2200, G, 120)) {
        ART.handprint(ctx, sx(2200, G), ART.HORIZON - 82, 0.92, 0.36);
        ART.scratches(ctx, sx(2260, G), ART.HORIZON - 104, 26, 62, 887, 0.40);
      }
      // 地板上的拖痕
      if (inView(3300, G, 200)) {
        ctx.save();
        ctx.globalAlpha = 0.30;
        ctx.strokeStyle = 'rgba(78,14,12,0.9)';
        ctx.lineWidth = 2.6;
        var bx6 = sx(3260, G);
        ctx.beginPath();
        ctx.moveTo(bx6, ART.HORIZON + 26);
        ctx.quadraticCurveTo(bx6 + 52, ART.HORIZON + 34, bx6 + 118, ART.HORIZON + 28);
        ctx.stroke();
        ctx.restore();
      }
    },
    events: [
      { at: 200, say: '灯自己亮了。' },
      { at: 760, say: '电视也是。' },
      { at: 1300, act: function (G) { SND.buzz(0.6); } },
      { at: 1080, act: function (G) { SND.whisper(0.06); } },
      { at: 1420, say: '没有信号。', mood: 'eerie' },
      { at: 1880, act: function (G) { SND.glitch(); } },
      { at: 2000, say: '雪花里……有张脸。', mood: 'eerie' },
      { at: 2380, act: function (G) { SND.heart(1.0); G.shake = 2; } },
      { at: 2500, say: '沙发上坐着人。', mood: 'eerie' },
      { at: 2860, act: function (G) { SND.whoosh(0.11); } },
      { at: 2980, say: '他背对着我，一动不动。', mood: 'eerie' },
      { at: 3260, act: function (G) { SND.heart(1.3); G.shake = 3; } },
      { at: 3380, say: '相框里的脸，都被划掉了。', mood: 'eerie' },
      { at: 3600, act: function (G) { SND.buzz(0.9); G.flicker(0.5); } },
      { at: 3760, say: '电视里放的，是这个房间。', mood: 'eerie' },
      { at: 3960, act: function (G) { SND.stab(0.6); G.shake = 5; } },
      { at: 4080, say: '镜头在我背后。', mood: 'eerie' },
      { at: 4160, scare: 1.0, final: true }
    ]
  };

  // ---------------- 环境文字（回忆被改写时，第二个字符串会顶掉第一个） ----------------
  CH.SIGNS = [
    [ { at: 700, good: '开 门 十 点', bad: '关 门 十 点' },
      { at: 1900, good: '和 平 路', bad: '和 平 路 无 人' },
      { at: 4000, good: '出 租', bad: '出 不 去' } ],
    [ { at: 900, good: '冷 柜', bad: '别 打 开' },
      { at: 2500, good: '收 银 台', bad: '别 回 头' },
      { at: 3700, good: '24 小 时', bad: '24 个 人' } ],
    [ { at: 800, good: 'B 区', bad: '无 此 区' },
      { at: 2200, good: '出 口 →', bad: '← 出 口' },
      { at: 3900, good: '限 高 2.1m', bad: '限 高 1.6m' } ],
    [ { at: 760, good: '5 F', bad: '5 F  5 F' },
      { at: 2100, good: '楼 梯', bad: '向 下' },
      { at: 3500, good: '消 防 栓', bad: '别 靠 近' } ],
    [ { at: 620, good: '602', bad: '602 已 满' },
      { at: 2000, good: '出 口', bad: '回 来' },
      { at: 3000, good: '楼 层 五', bad: '楼 层 六' } ],
    [ { at: 700, good: '2019 夏', bad: '2026 冬' },
      { at: 2600, good: '家', bad: '家 里 有 人' },
      { at: 3500, good: '电 视', bad: '它 在 看 你' } ]
  ];

  CH.push(C1, C2, C5, C3, C4, C6);


  // ---------------- 各章的额外恐怖装饰（统一挂在这里，避免把每章 draw 改烂） ----------------
  function extra(ctx, G) {
    var H = ART.HORIZON;
    var i = G.chapter;
    function at(w, m) { return inView(w, G, m == null ? 150 : m); }
    function X(w) { return sx(w, G); }

    // 环境牌子：它看过你之后，这些字会被改掉（回头时也一定被改掉）
    var mem = (G.memory || 0);
    var rewritten = mem >= 0.28 || (G.looking && G.lookSee > 0);
    var list = (CH.SIGNS && CH.SIGNS[i]) || [];
    for (var si = 0; si < list.length; si++) {
      var sg = list[si];
      if (!at(sg.at, 190)) continue;
      var txt = rewritten ? sg.bad : sg.good;
      var wSign = Math.max(30, txt.length * 7 + 12);
      var pl = Math.sin(G.t * 3.1 + si) * 0.02;
      var sxp = X(sg.at);
      if (sxp < wSign * 0.5 + 6 || sxp > 480 - wSign * 0.5 - 6) continue;   // 不让牌子被屏幕切一半
      // 立杆：让牌子像挂在路边，而不是浮在天上
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#0b0f11';
      ctx.fillRect(sxp - 1, H - 92, 2, 92);
      ctx.fillStyle = 'rgba(150,172,182,0.10)';
      ctx.fillRect(sxp - 1, H - 92, 1, 92);
      ctx.restore();
      ART.sign(ctx, sxp - wSign * 0.5, H - 112, wSign, 20, txt, {
        bad: rewritten, size: 8, alpha: 0.88 + pl
      });
    }

    if (i === 0) {
      if (at(1180)) ART.bloodText(ctx, X(1180), H - 96, '别 回 头', 15, 0.5);
      if (at(2380)) ART.chalk(ctx, X(2380) + 20, H + 12, 1.2, 0.16);
      if (at(3180)) ART.bloodText(ctx, X(3180), H - 40, '进 来', 18, 0.44);
      if (at(4400)) ART.wallFace(ctx, X(4400), H - 58, 0.86, G.t, 0.5);
      if (at(610)) ART.hanging(ctx, X(610) + 26, -6, 0.9, G.t, 0.5);
    } else if (i === 1) {
      if (at(980)) ART.bloodText(ctx, X(980), H - 74, '别 拿 后 面 的', 12, 0.42);
      if (at(2020)) ART.wallFace(ctx, X(2020), H - 66, 0.92, G.t + 1, 0.46);
      if (at(2620)) ART.handOut(ctx, X(2620), H - 14, 0.9, -0.28, 0.6);
      if (at(3440)) ART.chalk(ctx, X(3440), H + 16, 1.1, 0.13);
    } else if (i === 2) {
      if (at(760)) ART.chalk(ctx, X(760), H + 10, 1.3, 0.14);
      if (at(1420)) ART.bloodText(ctx, X(1420), H - 88, '出 口 不 在 这', 14, 0.5);
      if (at(2380)) ART.wallFace(ctx, X(2380) + 10, H - 78, 1.0, G.t, 0.5);
      if (at(3020)) ART.handOut(ctx, X(3020), H + 2, 1.05, -0.18, 0.62);
      if (at(3620)) ART.hanging(ctx, X(3620), 2, 1.0, G.t + 0.6, 0.62);
      if (at(4300)) ART.bloodText(ctx, X(4300), H - 52, '你 数 错 了', 13, 0.46);
    } else if (i === 3) {
      if (at(920)) ART.bloodText(ctx, X(920), H - 92, '上 面 有 人', 14, 0.46);
      if (at(1760)) ART.wallFace(ctx, X(1760), H - 70, 0.9, G.t, 0.5);
      if (at(2500)) ART.handOut(ctx, X(2500), H - 6, 0.95, -0.34, 0.6);
      if (at(3300)) ART.mirror(ctx, X(3300), H - 118, 46, 74, G.t, 0.9);
      if (at(4020)) ART.bloodText(ctx, X(4020), H - 44, '别 敲 门', 15, 0.44);
    } else if (i === 4) {
      if (at(700)) ART.bloodText(ctx, X(700), H - 98, '别 进 去', 15, 0.46);
      if (at(1520)) ART.mirror(ctx, X(1520), H - 116, 44, 72, G.t, 0.9);
      if (at(2180)) ART.chalk(ctx, X(2180), H + 12, 1.2, 0.15);
      if (at(2760)) ART.wallFace(ctx, X(2760), H - 74, 0.94, G.t, 0.44);
    } else if (i === 5) {
      if (at(640)) ART.bloodText(ctx, X(640), H - 96, '看 着 我', 16, 0.5);
      if (at(1420)) ART.mirror(ctx, X(1420), H - 120, 48, 78, G.t, 0.92);
      if (at(2260)) ART.handOut(ctx, X(2260), H - 4, 1.0, -0.2, 0.62);
      if (at(2900)) ART.wallFace(ctx, X(2900), H - 72, 0.96, G.t + 0.7, 0.5);
      if (at(3660)) ART.bloodText(ctx, X(3660), H - 50, '你 带 回 来 了', 13, 0.46);
    }
  }
  // 门牌号：记得太多或者回头时，数字会自己换一个
  function flickerNo(text, G, k) {
    var mem = G.memory || 0;
    var kk = Math.min(1, mem * 1.1 + (G.looking ? 0.5 : 0) + (G.lookCount || 0) * 0.04);
    if (kk <= 0.06) return text;
    var map = { '0': '8', '1': '7', '2': '3', '3': '8', '4': '9', '5': '6', '6': '5', '7': '1', '8': '0', '9': '4' };
    var flips = kk > 0.90 ? 2 : 1;   // 一次最多换两位，而且只换末尾那几位
    var out = '';
    for (var i = 0; i < text.length; i++) {
      var ch1 = text.charAt(i);
      var th = 1.05 - kk * 0.95;
      var on = i >= text.length - flips && Math.sin((G.t || 0) * 1.35 + k * 2.1 + (text.length - i) * 1.7) > th;
      out += (map[ch1] && on) ? map[ch1] : ch1;
    }
    return out;
  }
  CH.doorNo = flickerNo;

  CH.extra = extra;

  w.CH = CH;
  w.CH_HELP = { PLAYER_X: PLAYER_X, FOOT_Y: FOOT_Y, sx: sx };
})(window);
