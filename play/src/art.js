// art.js —— 全部画面都用 canvas 程序化绘制，不加载任何图片
(function (w) {
  var W = 480, H = 270;
  var ART = { W: W, H: H, HORIZON: 208 };

  // ---------------- 调色板 ----------------
  ART.PAL = {
    street: {
      sky1: '#04060c', sky2: '#0b1220', sky3: '#212c3e',
      far: '#080e17', mid: '#101825', midEdge: '#25313f',
      road: '#0e1218', curb: '#2a313b', walk: '#1a1f27', walkLine: '#232935',
      lamp: '#ffdda6', lampGlow: 'rgba(255,197,126,', win: '#cbd6e2',
      accent: '#8fa3ba', fog: '#0a0f16', shop: '#0a0d12'
    },
    store: {
      sky1: '#0c1014', sky2: '#12171c', sky3: '#1a2027',
      far: '#141a20', mid: '#1b222a', midEdge: '#2f3a44',
      road: '#2c333a', curb: '#3c454d', walk: '#454e57', walkLine: '#525c66',
      lamp: '#fff2d8', lampGlow: 'rgba(255,236,200,', win: '#e6f0fa',
      accent: '#9db2c4', fog: '#0d1115', shop: '#232a31'
    },
    stairs: {
      sky1: '#080a0d', sky2: '#101317', sky3: '#191d23',
      far: '#0c0f13', mid: '#161a20', midEdge: '#2a3038',
      road: '#1c2027', curb: '#262c34', walk: '#22272e', walkLine: '#2b3138',
      lamp: '#ffe3b8', lampGlow: 'rgba(255,206,150,', win: '#9fb0c0',
      accent: '#7b8b9b', fog: '#0a0c0f', shop: '#14181d'
    },
    home: {
      sky1: '#0a0908', sky2: '#12100e', sky3: '#1d1915',
      far: '#0b0a09', mid: '#141110', midEdge: '#2a2220',
      road: '#1b1613', curb: '#241d19', walk: '#1e1814', walkLine: '#271f1a',
      lamp: '#ffcf9a', lampGlow: 'rgba(255,193,132,', win: '#c8b79c',
      accent: '#8a7462', fog: '#080605', shop: '#120e0c'
    },
    garage: {
      sky1: '#080a0c', sky2: '#0e1114', sky3: '#171b1f',
      far: '#0b0d10', mid: '#14181c', midEdge: '#252c33',
      road: '#1a1e22', curb: '#262c31', walk: '#20252a', walkLine: '#2c3238',
      lamp: '#e8f4ff', lampGlow: 'rgba(198,226,255,', win: '#8fa4b6',
      accent: '#7d8f9e', fog: '#06080a', shop: '#101418'
    },
    living: {
      sky1: '#0a0806', sky2: '#12100c', sky3: '#1c1813',
      far: '#0b0907', mid: '#15120f', midEdge: '#2b2420',
      road: '#1c1712', curb: '#261f19', walk: '#201a15', walkLine: '#2a231c',
      lamp: '#ffd7a6', lampGlow: 'rgba(255,201,146,', win: '#c9b394',
      accent: '#8d7a66', fog: '#070605', shop: '#120f0c'
    }
  };

  ART.pal = function (name) { return ART.PAL[name] || ART.PAL.street; };

  // ---------------- 工具 ----------------
  function vgrad(ctx, y0, y1, c0, c1) {
    var g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, c0);
    g.addColorStop(1, c1);
    return g;
  }
  ART.vgrad = vgrad;

  function px(ctx, x, y, w, h, c) {
    ctx.fillStyle = c;
    ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
  }
  ART.px = px;

  function rr(ctx, x, y, w, h, rad) {
    var r = Math.min(rad, w * 0.5, h * 0.5);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  ART.rr = rr;

  // 细颗粒纹理（一次生成，重复平铺）
  var grainPat = null;
  function grain(ctx) {
    if (!grainPat) {
      var c = document.createElement('canvas');
      c.width = 96; c.height = 96;
      var g = c.getContext('2d');
      var img = g.createImageData(96, 96);
      for (var i = 0; i < 96 * 96; i++) {
        var v = 128 + (Math.random() - 0.5) * 74;
        img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v;
        img.data[i * 4 + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      grainPat = ctx.createPattern(c, 'repeat');
    }
    return grainPat;
  }
  ART.grain = function (ctx, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha == null ? 0.05 : alpha;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = grain(ctx);
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  };

  // 柔和光斑
  function glowSpot(ctx, x, y, r, col, a) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col + a + ')');
    g.addColorStop(0.45, col + (a * 0.32).toFixed(3) + ')');
    g.addColorStop(1, col + '0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ART.glowSpot = glowSpot;

  // ---------------- 天空 ----------------
  ART.sky = function (ctx, pal, t, opts) {
    opts = opts || {};
    ctx.fillStyle = vgrad(ctx, 0, ART.HORIZON, pal.sky1, pal.sky3);
    ctx.fillRect(0, 0, W, ART.HORIZON);

    // 地平线附近的城市光污染
    var hg = ctx.createLinearGradient(0, ART.HORIZON - 96, 0, ART.HORIZON);
    hg.addColorStop(0, 'rgba(70,58,40,0)');
    hg.addColorStop(1, 'rgba(96,74,44,0.20)');
    ctx.fillStyle = hg;
    ctx.fillRect(0, ART.HORIZON - 96, W, 96);

    if (opts.stars) {
      var r = U.rng(9182);
      for (var i = 0; i < 34; i++) {
        var x = r() * W, y = r() * 108;
        var a = 0.10 + r() * 0.30;
        var tw = 0.55 + 0.45 * Math.sin(t * 1.3 + i * 2.1);
        ctx.fillStyle = 'rgba(196,212,236,' + (a * tw).toFixed(3) + ')';
        ctx.fillRect(x | 0, y | 0, 1, 1);
      }
    }

    if (opts.moon) {
      var mx = opts.moon === 2 ? 366 : 86, my = 42;
      glowSpot(ctx, mx, my, 52, 'rgba(150,168,196,', 0.16);
      ctx.fillStyle = 'rgba(214,222,234,0.62)';
      ctx.beginPath(); ctx.arc(mx, my, 6.2, 0, 6.284); ctx.fill();
      ctx.fillStyle = 'rgba(180,192,210,0.42)';
      ctx.beginPath(); ctx.arc(mx - 1.8, my - 1.4, 1.5, 0, 6.284); ctx.fill();
      ctx.beginPath(); ctx.arc(mx + 2.1, my + 2.0, 1.0, 0, 6.284); ctx.fill();
      // 薄云
      var cr = U.rng(551);
      for (var k = 0; k < 3; k++) {
        var cy = my - 12 + cr() * 30, cw = 60 + cr() * 90;
        var cx = mx - cw * 0.5 + (cr() - 0.5) * 40;
        ctx.fillStyle = 'rgba(20,26,38,' + (0.35 + cr() * 0.3).toFixed(2) + ')';
        ctx.beginPath();
        ctx.ellipse(cx, cy, cw * 0.5, 3 + cr() * 3, 0, 0, 6.284);
        ctx.fill();
      }
    }
  };

  // ---------------- 远景城市 ----------------
  ART.cityFar = function (ctx, scroll, pal, seed, dim) {
    var baseY = ART.HORIZON + 2;
    var span = 620;
    var x = -((scroll * 0.18) % span) - span;
    for (var pass = 0; pass < 2; pass++) {
      var ox = x + pass * span;
      var r = U.rng(seed || 1337);
      var cx = ox;
      while (cx < ox + span + 20) {
        var bw = 24 + r() * 52;
        var bh = 22 + r() * 92;
        var topY = baseY - bh;
        ctx.fillStyle = pal.far;
        ctx.fillRect(cx | 0, topY | 0, bw | 0, bh | 0);
        // 天线 / 水塔
        if (r() > 0.76) {
          ctx.fillRect((cx + bw * 0.5) | 0, (topY - 7) | 0, 1, 7);
          ctx.fillRect((cx + bw * 0.5 - 3) | 0, (topY - 7) | 0, 7, 1);
        }
        if (r() > 0.9) {
          ctx.fillRect((cx + 4) | 0, (topY - 9) | 0, 8, 9);
        }
        // 零星窗
        var cols = Math.max(1, Math.floor(bw / 10));
        var rows = Math.max(1, Math.floor(bh / 12));
        for (var i = 0; i < cols; i++) {
          for (var j = 0; j < rows; j++) {
            if (r() > 0.94) {
              ctx.fillStyle = 'rgba(226,196,140,' + (0.06 + r() * 0.10).toFixed(2) + ')';
              ctx.fillRect((cx + 3 + i * 10) | 0, (topY + 5 + j * 12) | 0, 3, 3);
            }
          }
        }
        cx += bw + 3 + r() * 9;
      }
    }
    // 远景压雾
    var fg = ctx.createLinearGradient(0, ART.HORIZON - 100, 0, ART.HORIZON + 2);
    fg.addColorStop(0, 'rgba(10,14,22,0.05)');
    fg.addColorStop(1, 'rgba(10,14,22,0.55)');
    ctx.fillStyle = fg;
    ctx.fillRect(0, ART.HORIZON - 100, W, 102);
    if (dim) {
      ctx.fillStyle = 'rgba(6,9,14,0.4)';
      ctx.fillRect(0, 0, W, ART.HORIZON + 2);
    }
  };

  // ---------------- 中景（临街立面 + 店面） ----------------
  ART.cityMid = function (ctx, scroll, pal, seed) {
    var baseY = ART.HORIZON + 2;
    var span = 520;
    var off = (scroll * 0.5) % span;
    for (var pass = -1; pass <= 1; pass++) {
      var startX = -off + pass * span;
      var r = U.rng(seed || 7717);
      var cx = startX;
      while (cx < startX + span + 24) {
        var bw = 56 + r() * 68;
        var bh = 64 + r() * 88;
        var topY = baseY - bh;

        ctx.fillStyle = pal.mid;
        ctx.fillRect(cx | 0, topY | 0, bw | 0, bh | 0);
        ctx.fillStyle = 'rgba(0,0,0,0.34)';
        ctx.fillRect((cx + bw - 4) | 0, topY | 0, 4, bh | 0);
        ctx.fillStyle = pal.midEdge;
        ctx.fillRect(cx | 0, topY | 0, bw | 0, 2);
        ctx.fillStyle = 'rgba(0,0,0,0.42)';
        ctx.fillRect(cx | 0, (topY + 2) | 0, bw | 0, 1);

        var floorH = 14 + Math.floor(r() * 4);
        var floors = Math.max(1, Math.floor((bh - 28) / floorH));
        for (var f = 0; f < floors; f++) {
          var wy0 = topY + 8 + f * floorH;
          ctx.fillStyle = 'rgba(0,0,0,0.20)';
          ctx.fillRect(cx | 0, (wy0 + floorH - 3) | 0, bw | 0, 1);
          var floorMode = r();
          var wx = cx + 5 + r() * 6;
          while (wx < cx + bw - 10) {
            var ww = 5 + Math.floor(r() * 5);
            var wh = 7 + Math.floor(r() * 2);
            ctx.fillStyle = 'rgba(0,0,0,0.42)';
            ctx.fillRect((wx - 1) | 0, (wy0 - 1) | 0, ww + 2, wh + 2);
            var on;
            if (floorMode > 0.74) on = r() > 0.3;
            else if (floorMode > 0.5) on = r() > 0.55;
            else on = r() > 0.86;
            if (on) {
              var warm = r() > 0.26;
              var a = warm ? (0.16 + r() * 0.18) : (0.08 + r() * 0.07);
              ctx.fillStyle = warm
                ? 'rgba(255,201,132,' + a.toFixed(3) + ')'
                : 'rgba(146,186,222,' + a.toFixed(3) + ')';
              ctx.fillRect(wx | 0, wy0 | 0, ww, wh);
              if (r() > 0.55) {
                ctx.fillStyle = 'rgba(0,0,0,0.34)';
                ctx.fillRect(wx | 0, wy0 | 0, ww, 2 + Math.floor(r() * 3));
              }
            } else {
              ctx.fillStyle = 'rgba(110,130,156,0.05)';
              ctx.fillRect(wx | 0, wy0 | 0, ww, wh);
            }
            wx += ww + 4 + r() * 5;
          }
        }

        if (r() > 0.66) {
          var sx0 = (cx + bw - 12) | 0;
          var sy0 = (topY + 12 + r() * 24) | 0;
          var sh = 16 + r() * 20;
          var hot = r() > 0.5;
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillRect((sx0 - 1) | 0, (sy0 - 1) | 0, 9, (sh + 2) | 0);
          ctx.fillStyle = hot ? 'rgba(255,120,96,0.26)' : 'rgba(120,200,235,0.22)';
          ctx.fillRect(sx0 | 0, sy0 | 0, 7, sh | 0);
          ctx.fillStyle = 'rgba(255,255,255,0.08)';
          ctx.fillRect(sx0 | 0, sy0 | 0, 7, 1);
        }

        if (r() > 0.6) {
          var acx = (cx + 6 + r() * (bw - 22)) | 0;
          var acy = (topY + 14 + r() * 26) | 0;
          ctx.fillStyle = 'rgba(0,0,0,0.4)';
          ctx.fillRect(acx, acy, 10, 7);
          ctx.fillStyle = 'rgba(150,160,170,0.14)';
          ctx.fillRect(acx, acy, 10, 2);
        }

        // 沿街店面层
        var shopH = 26;
        ctx.fillStyle = pal.shop;
        ctx.fillRect(cx | 0, (baseY - shopH) | 0, bw | 0, shopH);
        var kind = r();
        if (kind < 0.45) {
          ctx.fillStyle = 'rgba(0,0,0,0.35)';
          ctx.fillRect(cx | 0, (baseY - shopH) | 0, bw | 0, shopH);
          for (var vx = cx + 2; vx < cx + bw - 2; vx += 3) {
            ctx.fillStyle = 'rgba(120,132,146,0.05)';
            ctx.fillRect(vx | 0, (baseY - shopH + 2) | 0, 1, shopH - 4);
          }
        } else {
          var gx0 = cx + 4, gw = bw - 8;
          ctx.fillStyle = 'rgba(58,74,90,0.26)';
          ctx.fillRect(gx0 | 0, (baseY - shopH + 3) | 0, gw | 0, shopH - 5);
          ctx.fillStyle = 'rgba(200,220,240,0.09)';
          ctx.fillRect(gx0 | 0, (baseY - shopH + 3) | 0, 1, shopH - 5);
          ctx.fillRect((gx0 + gw - 1) | 0, (baseY - shopH + 3) | 0, 1, shopH - 5);
          ctx.fillStyle = 'rgba(255,190,130,0.09)';
          ctx.fillRect((cx + 2) | 0, (baseY - shopH - 4) | 0, (bw - 4) | 0, 3);
        }
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(cx | 0, (baseY - 3) | 0, bw | 0, 3);

        cx += bw + 4;
      }
    }
  };

  // ---------------- 地面 / 人行道 ----------------
  ART.ground = function (ctx, scroll, pal, kind) {
    var hy = ART.HORIZON;

    // 路面底色
    ctx.fillStyle = pal.road;
    ctx.fillRect(0, hy, W, H - hy);

    // 路缘石：顶面 + 立面
    ctx.fillStyle = pal.curb;
    ctx.fillRect(0, hy, W, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(0, hy, W, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, hy + 3, W, 2);

    // 人行道砖：近大远小的透视缝
    var y0 = hy + 5;
    ctx.fillStyle = pal.walk;
    ctx.fillRect(0, y0, W, H - y0);
    // 横向砖缝（远密近疏）
    var acc = y0, stepY = 3.2;
    while (acc < H) {
      ctx.fillStyle = 'rgba(0,0,0,0.32)';
      ctx.fillRect(0, acc | 0, W, 1);
      acc += stepY;
      stepY *= 1.42;
    }
    // 纵向砖缝（随滚动）
    var stepX = 30;
    var off = scroll % stepX;
    ctx.fillStyle = 'rgba(0,0,0,0.26)';
    for (var x = -off; x < W + stepX; x += stepX) {
      ctx.fillRect(x | 0, y0, 1, H - y0);
    }
    // 近处再密一层
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (var x2 = -((scroll * 1.3) % 78); x2 < W + 78; x2 += 78) {
      ctx.fillRect(x2 | 0, y0 + 18, 2, H - y0 - 18);
    }

    // 积水反光
    var pr = U.rng(4471);
    for (var i = 0; i < 3; i++) {
      var px0 = ((pr() * W + scroll * 1.0) % (W + 40)) - 20;
      var py0 = y0 + 8 + pr() * 34;
      var pw = 14 + pr() * 22;
      ctx.save();
      ctx.globalAlpha = 0.20;
      ctx.fillStyle = 'rgba(150,180,210,0.5)';
      ctx.beginPath();
      ctx.ellipse(px0, py0, pw * 0.5, 1.8, 0, 0, 6.284);
      ctx.fill();
      ctx.restore();
    }

    // 地面渐暗（近处更黑，压缩视觉）
    var g = ctx.createLinearGradient(0, y0, 0, H);
    g.addColorStop(0, 'rgba(0,0,0,0.10)');
    g.addColorStop(0.5, 'rgba(0,0,0,0.42)');
    g.addColorStop(1, 'rgba(0,0,0,0.86)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y0, W, H - y0);
  };

  // ---------------- 路灯 ----------------
  ART.lamp = function (ctx, x, on, pal, scale) {
    var s = scale || 1;
    var hy = ART.HORIZON + 4;
    var topY = hy - 104 * s;
    var poleX = x + 9 * s;

    if (on > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var gx = x + 9 * s, gy = topY + 5 * s;
      // 锥形光
      var lg = ctx.createLinearGradient(0, gy, 0, hy + 26);
      lg.addColorStop(0, pal.lampGlow + (0.26 * on).toFixed(3) + ')');
      lg.addColorStop(0.5, pal.lampGlow + (0.11 * on).toFixed(3) + ')');
      lg.addColorStop(1, pal.lampGlow + '0)');
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.moveTo(gx - 7 * s, gy);
      ctx.lineTo(gx + 7 * s, gy);
      ctx.lineTo(gx + 48 * s, hy + 26);
      ctx.lineTo(gx - 48 * s, hy + 26);
      ctx.closePath();
      ctx.fill();
      // 灯头光晕
      glowSpot(ctx, gx, gy, 20 * s, pal.lampGlow, (0.42 * on).toFixed(3));
      // 地面光池
      var eg = ctx.createRadialGradient(gx, hy + 14, 1, gx, hy + 14, 54 * s);
      eg.addColorStop(0, pal.lampGlow + (0.22 * on).toFixed(3) + ')');
      eg.addColorStop(0.6, pal.lampGlow + (0.06 * on).toFixed(3) + ')');
      eg.addColorStop(1, pal.lampGlow + '0)');
      ctx.fillStyle = eg;
      ctx.beginPath();
      ctx.ellipse(gx, hy + 14, 54 * s, 17 * s, 0, 0, 6.284);
      ctx.fill();
      ctx.restore();
    }

    // 灯杆
    ctx.fillStyle = '#080a0e';
    ctx.fillRect(poleX | 0, topY, Math.max(2, 2 * s), hy - topY);
    // 弯臂
    ctx.strokeStyle = '#080a0e';
    ctx.lineWidth = Math.max(2, 2.4 * s);
    ctx.beginPath();
    ctx.moveTo(poleX, topY + 2 * s);
    ctx.quadraticCurveTo(x + 2 * s, topY - 1 * s, x - 2 * s, topY + 1 * s);
    ctx.stroke();
    // 灯罩
    ctx.fillStyle = on > 0.2 ? pal.lamp : '#2a2f36';
    ctx.beginPath();
    ctx.ellipse(x - 2 * s, topY + 2 * s, 6 * s, 2.2 * s, 0, 0, 6.284);
    ctx.fill();
    // 底座
    ctx.fillStyle = '#0b0e12';
    ctx.fillRect((poleX - 3 * s) | 0, (hy - 6) | 0, (8 * s) | 0, 7);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect((poleX - 3 * s) | 0, (hy - 6) | 0, (8 * s) | 0, 1);
  };

  // ---------------- 栏杆 ----------------
  ART.fence = function (ctx, x, width, pal) {
    var y = ART.HORIZON - 22;
    ctx.fillStyle = 'rgba(130,150,172,0.16)';
    ctx.fillRect(x | 0, y | 0, width | 0, 1);
    ctx.fillRect(x | 0, (y + 14) | 0, width | 0, 1);
    for (var i = 0; i < width; i += 9) {
      ctx.fillStyle = 'rgba(120,140,165,0.11)';
      ctx.fillRect((x + i) | 0, y | 0, 1, 22);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x | 0, (y + 15) | 0, width | 0, 1);
  };

  // ---------------- 树（剪影） ----------------
  ART.tree = function (ctx, x, h, pal, seed) {
    var hy = ART.HORIZON + 2;
    var r = U.rng(seed || 11);
    ctx.fillStyle = '#06080b';
    ctx.fillRect((x - 1) | 0, hy - h * 0.52, 2, h * 0.52);
    ctx.fillRect((x - 4) | 0, (hy - h * 0.52) | 0, 9, 2);
    for (var i = 0; i < 9; i++) {
      var rx = x + (r() - 0.5) * h * 0.6;
      var ry = hy - h * 0.5 - r() * h * 0.5;
      var rad = h * (0.10 + r() * 0.13);
      ctx.beginPath();
      ctx.ellipse(rx, ry, rad, rad * 0.92, 0, 0, 6.284);
      ctx.fill();
    }
  };


  // 3x5 点阵数字（放大后不发虚）
  var DIG = {
    '0': ['111', '101', '101', '101', '111'],
    '1': ['010', '110', '010', '010', '111'],
    '2': ['111', '001', '111', '100', '111'],
    '3': ['111', '001', '111', '001', '111'],
    '4': ['101', '101', '111', '001', '001'],
    '5': ['111', '100', '111', '001', '111'],
    '6': ['111', '100', '111', '101', '111'],
    '7': ['111', '001', '010', '010', '010'],
    '8': ['111', '101', '111', '101', '111'],
    '9': ['111', '101', '111', '001', '111'],
    '-': ['000', '000', '111', '000', '000']
  };
  ART.pixelDigits = function (ctx, str, x, y, s, color) {
    s = s || 1;
    var cw = 4 * s;
    ctx.fillStyle = color || '#dfe7f0';
    for (var i = 0; i < str.length; i++) {
      var g = DIG[str.charAt(i)];
      if (!g) continue;
      for (var rw = 0; rw < 5; rw++) {
        for (var cl = 0; cl < 3; cl++) {
          if (g[rw].charAt(cl) === '1') {
            ctx.fillRect((x + i * cw + cl * s) | 0, (y + rw * s) | 0, s, s);
          }
        }
      }
    }
  };

  // ---------------- 人形剪影 ----------------
  ART.person = function (ctx, x, footY, phase, opts) {
    opts = opts || {};
    var sc = opts.scale || 1;
    var h = 46 * sc;
    var headR = 4.5 * sc;
    var shoulderW = 10.5 * sc;
    var hipY = footY - h * 0.48;
    var headY = footY - h + headR;
    var col = opts.color || '#04050a';
    var walk = opts.walking === false ? 0 : 1;

    ctx.save();
    ctx.fillStyle = col;
    ctx.strokeStyle = col;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 腿
    var sw = Math.sin(phase) * 5.6 * sc * walk;
    ctx.lineWidth = Math.max(2, 3.1 * sc);
    ctx.beginPath();
    ctx.moveTo(x - 1.2 * sc, hipY);
    ctx.lineTo(x - 1.2 * sc + sw * 0.6, footY - 0.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 1.2 * sc, hipY);
    ctx.lineTo(x + 1.2 * sc - sw * 0.6, footY - 0.6);
    ctx.stroke();

    // 躯干（含肩）
    ctx.beginPath();
    ctx.moveTo(x - shoulderW * 0.5, hipY + 1);
    ctx.lineTo(x - shoulderW * 0.44, footY - h * 0.74);
    ctx.lineTo(x - shoulderW * 0.34, footY - h * 0.80);
    ctx.lineTo(x + shoulderW * 0.34, footY - h * 0.80);
    ctx.lineTo(x + shoulderW * 0.44, footY - h * 0.74);
    ctx.lineTo(x + shoulderW * 0.5, hipY + 1);
    ctx.closePath();
    ctx.fill();

    // 手臂（前后各一，摆动）
    var aw = Math.sin(phase + Math.PI) * 3.6 * sc * walk;
    ctx.lineWidth = Math.max(1.8, 2.5 * sc);
    ctx.beginPath();
    ctx.moveTo(x - shoulderW * 0.38, footY - h * 0.76);
    ctx.lineTo(x - shoulderW * 0.52 + aw * 0.45, hipY + 1.5 * sc);
    ctx.stroke();
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(1.6, 2.2 * sc);
    ctx.beginPath();
    ctx.moveTo(x + shoulderW * 0.38, footY - h * 0.76);
    ctx.lineTo(x + shoulderW * 0.5 - aw * 0.45, hipY + 1.5 * sc);
    ctx.stroke();

    // 脖子
    ctx.fillStyle = col;
    ctx.fillRect((x - 1.5 * sc) | 0, (headY + headR * 0.55) | 0, Math.max(2, 3 * sc) | 0, (h * 0.09) | 0);

    // 头
    ctx.beginPath();
    ctx.ellipse(x, headY, headR * 0.9, headR, 0, 0, 6.284);
    ctx.fill();
    // 后脑
    ctx.beginPath();
    ctx.ellipse(x - headR * 0.5, headY + 0.4 * sc, headR * 0.5, headR * 0.8, 0, 0, 6.284);
    ctx.fill();

    // 轮廓光
    if (opts.rim) {
      ctx.strokeStyle = opts.rim;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(x - 0.5, headY, headR * 0.92, headR * 1.02, 0, Math.PI * 0.62, Math.PI * 1.78);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + shoulderW * 0.46, footY - h * 0.76);
      ctx.lineTo(x + shoulderW * 0.5, hipY + 1);
      ctx.stroke();
    }

    ctx.restore();
  };

  // ---------------- 便利店内部 ----------------
  ART.storeInterior = function (ctx, scroll, pal, t, opts) {
    var hy = ART.HORIZON;
    opts = opts || {};
    var on = opts.lightOn == null ? 1 : opts.lightOn;

    // 天花板
    ctx.fillStyle = '#171d23';
    ctx.fillRect(0, 0, W, 30);
    ctx.fillStyle = '#212830';
    ctx.fillRect(0, 28, W, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 30, W, 1);

    // 后墙
    ctx.fillStyle = vgrad(ctx, 31, hy, '#4a545f', '#363f48');
    ctx.fillRect(0, 31, W, hy - 31);

    // 后墙矮货架
    var r = U.rng(6612);
    for (var bx = -((scroll * 0.22) % 96) - 96; bx < W + 96; bx += 96) {
      var sh0 = 50 + Math.floor(r() * 8);
      ctx.fillStyle = 'rgba(13,17,21,0.58)';
      ctx.fillRect(bx | 0, hy - sh0, 84, sh0 | 0);
      ctx.fillStyle = 'rgba(130,150,170,0.11)';
      ctx.fillRect(bx | 0, (hy - sh0) | 0, 84, 1);
      for (var k = 1; k < 3; k++) {
        ctx.fillStyle = 'rgba(130,150,170,0.07)';
        ctx.fillRect(bx | 0, (hy - sh0 + k * 16) | 0, 84, 1);
      }
      // 货架上的色块
      var rr2 = U.rng(Math.round(bx) + 77);
      for (var row = 0; row < 3; row++) {
        var xx = bx + 3;
        while (xx < bx + 80) {
          var bw2 = 3 + rr2() * 4;
          ctx.fillStyle = 'hsla(' + Math.floor(rr2() * 360) + ',12%,' + (21 + rr2() * 9).toFixed(0) + '%,0.7)';
          ctx.fillRect(xx | 0, (hy - sh0 + 4 + row * 16) | 0, bw2 | 0, 9);
          xx += bw2 + 2;
        }
      }
    }

    // 墙上的价签与海报
    var pr2 = U.rng(3321);
    for (var pi = 0; pi < 5; pi++) {
      var pxw = ((pi * 118 - (scroll * 0.5) % 118) + 600) % 600 - 60;
      var pyw = 52 + pr2() * 26;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(pxw | 0, pyw | 0, 26, 16);
      ctx.fillStyle = 'rgba(196,204,214,0.16)';
      ctx.fillRect((pxw + 1) | 0, (pyw + 1) | 0, 24, 14);
      ctx.fillStyle = 'rgba(40,46,54,0.5)';
      ctx.fillRect((pxw + 4) | 0, (pyw + 5) | 0, 18, 2);
      ctx.fillRect((pxw + 4) | 0, (pyw + 9) | 0, 12, 2);
    }
    for (var hi = 0; hi < 3; hi++) {
      var hx = ((hi * 196 - (scroll * 0.5) % 196) + 600) % 600 - 70;
      ctx.fillStyle = 'rgba(120,150,170,0.07)';
      ctx.fillRect(hx | 0, 44, 40, 56);
      ctx.fillStyle = 'rgba(180,204,220,0.10)';
      ctx.fillRect((hx + 4) | 0, 50, 32, 10);
      ctx.fillStyle = 'rgba(150,180,200,0.06)';
      ctx.fillRect((hx + 4) | 0, 66, 32, 3);
      ctx.fillRect((hx + 4) | 0, 73, 24, 3);
    }

    // 墙裙
    ctx.fillStyle = '#252d35';
    ctx.fillRect(0, hy - 20, W, 20);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(0, hy - 20, W, 1);

    // 地面
    ctx.fillStyle = '#3d454d';
    ctx.fillRect(0, hy, W, H - hy);
    var acc = hy + 5, st = 3.6;
    while (acc < H) {
      ctx.fillStyle = 'rgba(0,0,0,0.20)';
      ctx.fillRect(0, acc | 0, W, 1);
      acc += st; st *= 1.42;
    }
    ctx.fillStyle = 'rgba(0,0,0,0.20)';
    for (var gx = -((scroll * 1.0) % 48); gx < W + 48; gx += 48) ctx.fillRect(gx | 0, hy, 1, H - hy);

    // 灯带 + 地面光池（关键：局部照明而非整屏发白）
    for (var i = 0; i < 5; i++) {
      var lx = ((i * 108) - (scroll * 0.36) % 108 + 600) % 600 - 80;
      var flick = 1;
      if (opts.flicker) flick = 0.5 + 0.5 * Math.sin(t * 19 + i * 2.3);
      var k2 = on * flick;
      // 灯槽
      ctx.fillStyle = 'rgba(10,13,17,0.8)';
      ctx.fillRect((lx) | 0, 8, 62, 8);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      glowSpot(ctx, lx + 31, 30, 158, pal.lampGlow, (0.085 * k2).toFixed(3));
      glowSpot(ctx, lx + 31, 20, 74, pal.lampGlow, (0.15 * k2).toFixed(3));
      // 地面光池
      var eg = ctx.createRadialGradient(lx + 31, hy + 24, 1, lx + 31, hy + 24, 92);
      eg.addColorStop(0, pal.lampGlow + (0.30 * k2).toFixed(3) + ')');
      eg.addColorStop(0.45, pal.lampGlow + (0.07 * k2).toFixed(3) + ')');
      eg.addColorStop(1, pal.lampGlow + '0)');
      ctx.fillStyle = eg;
      ctx.beginPath();
      ctx.ellipse(lx + 31, hy + 24, 86, 30, 0, 0, 6.284);
      ctx.fill();
      ctx.restore();
      // 灯管本体
      ctx.fillStyle = 'rgba(255,251,240,' + (0.9 * k2).toFixed(2) + ')';
      ctx.fillRect((lx + 5) | 0, 11, 52, 3);
      ctx.fillStyle = 'rgba(255,236,200,' + (0.35 * k2).toFixed(2) + ')';
      ctx.fillRect((lx + 5) | 0, 14, 52, 1);
    }

    // 纵深：顶部亮、近处暗
    var dg = ctx.createLinearGradient(0, 26, 0, H);
    dg.addColorStop(0, 'rgba(255,244,220,0.05)');
    dg.addColorStop(0.55, 'rgba(0,0,0,0.12)');
    dg.addColorStop(1, 'rgba(0,0,0,0.40)');
    ctx.fillStyle = dg;
    ctx.fillRect(0, 26, W, H - 26);
  };

  // 货架
  ART.shelf = function (ctx, x, w0, h0, seed) {
    var hy = ART.HORIZON;
    var top = hy - h0;
    var r = U.rng(seed || 5);

    // 货架主体
    ctx.fillStyle = '#454e56';
    ctx.fillRect(x | 0, top | 0, w0 | 0, h0 | 0);
    ctx.fillStyle = 'rgba(0,0,0,0.30)';
    ctx.fillRect((x + w0 - 5) | 0, top | 0, 5, h0 | 0);
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fillRect(x | 0, top | 0, w0 | 0, 1);

    var rows = Math.max(3, Math.floor(h0 / 20));
    for (var j = 0; j < rows; j++) {
      var ry = top + j * (h0 / rows);
      ctx.fillStyle = 'rgba(20,26,32,0.65)';
      ctx.fillRect(x | 0, ry | 0, w0 | 0, 2);
      // 商品
      var xx = x + 3;
      while (xx < x + w0 - 5) {
        var bw = 4 + r() * 5;
        var hh = 11 + r() * 5;
        var hue = r() * 360;
        ctx.fillStyle = 'hsla(' + Math.floor(hue) + ',18%,' + (34 + r() * 16).toFixed(0) + '%,0.9)';
        ctx.fillRect(xx | 0, (ry + 3 + (h0 / rows) - hh - 4) | 0, bw | 0, hh | 0);
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(xx | 0, (ry + 3 + (h0 / rows) - hh - 4) | 0, bw | 0, 1);
        xx += bw + 2;
      }
    }
    // 底部阴影
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.fillRect((x - 2) | 0, (hy - 3) | 0, (w0 + 4) | 0, 4);
  };

  // ---------------- 楼道 ----------------
  ART.stairs = function (ctx, scroll, pal, t, opts) {
    opts = opts || {};
    var hy = ART.HORIZON;
    var on = opts.lightOn == null ? 1 : opts.lightOn;

    ctx.fillStyle = '#12161a';
    ctx.fillRect(0, 0, W, H);

    // 后墙（混凝土 + 颗粒）
    ctx.fillStyle = vgrad(ctx, 20, hy, '#242a31', '#1a1f26');
    ctx.fillRect(0, 20, W, hy - 20);
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = grain(ctx);
    ctx.fillRect(0, 20, W, hy - 20);
    ctx.restore();

    // 墙裙
    ctx.fillStyle = '#191d23';
    ctx.fillRect(0, hy - 52, W, 52);
    ctx.fillStyle = 'rgba(180,190,205,0.09)';
    ctx.fillRect(0, hy - 52, W, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, hy - 51, W, 1);

    // 顶部梁
    ctx.fillStyle = '#0f1317';
    ctx.fillRect(0, 0, W, 18);
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    ctx.fillRect(0, 18, W, 1);

    // 管道
    for (var p2 = 0; p2 < 3; p2++) {
      var pxs = ((p2 * 190 - (scroll * 0.5) % 190) + 600) % 600 - 60;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(pxs | 0, 18, 6, hy - 70);
      ctx.fillStyle = 'rgba(125,138,152,0.15)';
      ctx.fillRect((pxs + 1) | 0, 18, 2, hy - 70);
      ctx.fillStyle = 'rgba(125,138,152,0.10)';
      ctx.fillRect((pxs - 1) | 0, (hy - 90) | 0, 8, 3);
    }

    // 扶手
    ctx.fillStyle = 'rgba(150,162,176,0.18)';
    ctx.fillRect(0, hy - 58, W, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.30)';
    ctx.fillRect(0, hy - 56, W, 1);
    for (var bx2 = -((scroll * 0.9) % 46); bx2 < W + 46; bx2 += 46) {
      ctx.fillStyle = 'rgba(130,142,156,0.12)';
      ctx.fillRect(bx2 | 0, hy - 58, 2, 20);
    }

    // 地面（水磨石）
    ctx.fillStyle = '#1b2028';
    ctx.fillRect(0, hy, W, H - hy);
    var acc = hy + 4, st = 3.4;
    while (acc < H) {
      ctx.fillStyle = 'rgba(0,0,0,0.26)';
      ctx.fillRect(0, acc | 0, W, 1);
      acc += st; st *= 1.44;
    }
    ctx.fillStyle = 'rgba(0,0,0,0.20)';
    for (var gx2 = -((scroll * 1.0) % 54); gx2 < W + 54; gx2 += 54) ctx.fillRect(gx2 | 0, hy, 1, H - hy);
    // 地面反光
    var rg2 = ctx.createLinearGradient(0, hy, 0, H);
    rg2.addColorStop(0, 'rgba(255,226,180,0.06)');
    rg2.addColorStop(0.45, 'rgba(0,0,0,0.25)');
    rg2.addColorStop(0.45, 'rgba(0,0,0,0.34)');
    rg2.addColorStop(1, 'rgba(0,0,0,0.86)');
    ctx.fillStyle = rg2;
    ctx.fillRect(0, hy, W, H - hy);

    // 声控灯
    var lx = W * 0.5, ly = 30;
    if (on > 0.02) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var cg = ctx.createRadialGradient(lx, ly, 4, lx, ly + 50, 175);
      cg.addColorStop(0, pal.lampGlow + (0.26 * on).toFixed(3) + ')');
      cg.addColorStop(0.42, pal.lampGlow + (0.09 * on).toFixed(3) + ')');
      cg.addColorStop(1, pal.lampGlow + '0)');
      ctx.fillStyle = cg;
      ctx.fillRect(0, 0, W, hy + 30);
      glowSpot(ctx, lx, hy + 16, 70, pal.lampGlow, (0.07 * on).toFixed(3));
      ctx.restore();
    }
    // 吸顶灯
    ctx.fillStyle = '#0d1114';
    ctx.fillRect((lx - 1) | 0, 16, 2, 8);
    ctx.fillStyle = on > 0.15 ? 'rgba(255,228,186,' + (0.6 + on * 0.35).toFixed(2) + ')' : '#2a2f35';
    ctx.fillRect((lx - 13) | 0, 24, 26, 5);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect((lx - 13) | 0, 29, 26, 1);
  };

  // ---------------- 走廊 / 家 ----------------
  ART.homeHall = function (ctx, scroll, pal, t, opts) {
    opts = opts || {};
    var hy = ART.HORIZON;

    ctx.fillStyle = '#120e0b';
    ctx.fillRect(0, 0, W, 30);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 28, W, 2);

    // 墙面
    ctx.fillStyle = vgrad(ctx, 30, hy, '#221c17', '#191410');
    ctx.fillRect(0, 30, W, hy - 30);
    // 壁纸细竖纹
    for (var x = -((scroll * 0.55) % 6); x < W + 6; x += 6) {
      ctx.fillStyle = 'rgba(255,226,190,0.014)';
      ctx.fillRect(x | 0, 30, 1, hy - 30);
    }
    for (var x3 = -((scroll * 0.55) % 24); x3 < W + 24; x3 += 24) {
      ctx.fillStyle = 'rgba(0,0,0,0.10)';
      ctx.fillRect(x3 | 0, 30, 1, hy - 30);
    }
    // 护墙板
    ctx.fillStyle = '#161109';
    ctx.fillRect(0, hy - 40, W, 40);
    ctx.fillStyle = 'rgba(220,180,140,0.08)';
    ctx.fillRect(0, hy - 40, W, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, hy - 39, W, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, hy - 6, W, 6);

    // 木地板
    ctx.fillStyle = '#1a1511';
    ctx.fillRect(0, hy, W, H - hy);
    // 木板横缝（细，稀疏，不形成条纹）
    var acc = hy + 3, st = 2.6;
    while (acc < H) {
      ctx.fillStyle = 'rgba(0,0,0,0.30)';
      ctx.fillRect(0, acc | 0, W, 1);
      acc += st; st *= 1.46;
    }
    // 木纹（稀疏短线）
    var wr = U.rng(7771);
    for (var i = 0; i < 60; i++) {
      var wx = wr() * W, wy = hy + wr() * (H - hy);
      var wl = 6 + wr() * 26;
      ctx.fillStyle = 'rgba(255,214,170,' + (0.012 + wr() * 0.02).toFixed(3) + ')';
      ctx.fillRect(wx | 0, wy | 0, wl | 0, 1);
    }
    // 板缝竖线
    for (var bx3 = -((scroll * 0.85) % 62); bx3 < W + 62; bx3 += 62) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(bx3 | 0, hy, 1, H - hy);
    }
    // 地面渐变反光
    var g = ctx.createLinearGradient(0, hy, 0, H);
    g.addColorStop(0, 'rgba(255,196,140,0.055)');
    g.addColorStop(0.35, 'rgba(0,0,0,0.20)');
    g.addColorStop(1, 'rgba(0,0,0,0.86)');
    ctx.fillStyle = g;
    ctx.fillRect(0, hy, W, H - hy);
  };

  // 门
  ART.door = function (ctx, x, w0, h0, opts) {
    opts = opts || {};
    var hb = ART.HORIZON + 4;
    var top = hb - h0;
    var col = opts.color || '#2b211a';

    // 门框
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect((x - 4) | 0, (top - 4) | 0, (w0 + 8) | 0, (h0 + 8) | 0);
    ctx.fillStyle = 'rgba(210,180,150,0.10)';
    ctx.fillRect((x - 3) | 0, (top - 3) | 0, (w0 + 6) | 0, 1);

    // 门板
    ctx.fillStyle = col;
    ctx.fillRect(x | 0, top | 0, w0 | 0, h0 | 0);
    // 顶部受光
    var dg = ctx.createLinearGradient(0, top, 0, top + h0);
    dg.addColorStop(0, 'rgba(255,220,180,0.10)');
    dg.addColorStop(0.5, 'rgba(255,220,180,0.02)');
    dg.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = dg;
    ctx.fillRect(x | 0, top | 0, w0 | 0, h0 | 0);

    // 门板凹格
    if (w0 > 40 && h0 > 70) {
      var pads = [[0.16, 0.10, 0.68, 0.34], [0.16, 0.52, 0.68, 0.38]];
      for (var i = 0; i < pads.length; i++) {
        var pd = pads[i];
        var px0 = x + w0 * pd[0], py0 = top + h0 * pd[1];
        var pw0 = w0 * pd[2], ph0 = h0 * pd[3];
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.fillRect(px0 | 0, py0 | 0, pw0 | 0, ph0 | 0);
        ctx.fillStyle = 'rgba(255,225,190,0.05)';
        ctx.fillRect(px0 | 0, py0 | 0, pw0 | 0, 1);
        ctx.fillRect(px0 | 0, py0 | 0, 1, ph0 | 0);
      }
    }

    // 门缝
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 1;
    ctx.strokeRect((x + 0.5) | 0, (top + 0.5) | 0, (w0 - 1) | 0, (h0 - 1) | 0);

    // 门下透光
    if (opts.underLight) {
      var lg = ctx.createLinearGradient(0, hb - 2, 0, hb + 4);
      lg.addColorStop(0, 'rgba(255,200,140,' + opts.underLight + ')');
      lg.addColorStop(1, 'rgba(255,200,140,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(x | 0, (hb - 2) | 0, w0 | 0, 6);
    }

    // 把手
    ctx.fillStyle = '#c9a86b';
    ctx.fillRect((x + w0 - 9) | 0, (top + h0 * 0.5) | 0, 3, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect((x + w0 - 9) | 0, (top + h0 * 0.5) | 0, 1, 1);

    // 猫眼
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.arc(x + w0 * 0.5, top + h0 * 0.18, 1.6, 0, 6.284);
    ctx.fill();

    // 门牌
    if (opts.plate) {
      ctx.fillStyle = 'rgba(230,235,242,0.55)';
      ctx.fillRect((x + w0 * 0.5 - 7) | 0, (top + 7) | 0, 14, 7);
      ctx.fillStyle = 'rgba(30,34,40,0.85)';
      ctx.fillRect((x + w0 * 0.5 - 5) | 0, (top + 9) | 0, 10, 3);
    }
  };

  // ---------------- 雨 / 尘 ----------------
  ART.rain = function (ctx, t, amt, color) {
    var r = U.rng(2201);
    var n = Math.floor(amt || 60);
    ctx.save();
    ctx.strokeStyle = color || 'rgba(180,205,225,0.16)';
    ctx.lineWidth = 1;
    for (var i = 0; i < n; i++) {
      var bx = r() * (W + 60), by = r() * H, sp = 90 + r() * 130;
      var y = ((by + t * sp) % (H + 40)) - 20;
      var x = bx + y * 0.05 - 30;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 1.1, y + 6.5);
      ctx.stroke();
    }
    ctx.restore();
  };

  ART.dust = function (ctx, t, amt) {
    var r = U.rng(99131);
    var n = Math.floor(amt || 40);
    for (var i = 0; i < n; i++) {
      var x = (r() * W + t * (5 + r() * 12)) % W;
      var y = r() * H;
      var a = 0.04 + r() * 0.10;
      ctx.fillStyle = 'rgba(225,212,190,' + a.toFixed(3) + ')';
      ctx.fillRect(x | 0, y | 0, 1, 1);
    }
  };

  // ---------------- 恐怖脸 ----------------
  ART.scareFace = function (ctx, t, power) {
    var cx = W / 2, cy = H / 2 - 6;
    var s = 1 + Math.sin(t * 40) * 0.02 + (power || 1) * 0.06;

    ctx.save();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    var fw = 96 * s, fh = 128 * s;
    var grd = ctx.createRadialGradient(cx, cy - 10, 8, cx, cy, fh * 0.8);
    grd.addColorStop(0, '#ddd6ca');
    grd.addColorStop(0.55, '#a9a294');
    grd.addColorStop(1, '#3b3833');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.ellipse(cx, cy, fw * 0.52, fh * 0.56, 0, 0, 6.284);
    ctx.fill();

    ctx.fillStyle = '#050508';
    for (var i = 0; i < 30; i++) {
      var a = -Math.PI * 0.96 + (i / 29) * Math.PI * 1.92;
      var r0 = fw * 0.44;
      var len = fh * (0.34 + (i % 5) * 0.09);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r0 * 1.06, cy + Math.sin(a) * r0 * 0.98);
      ctx.lineTo(cx + Math.cos(a) * (r0 + len * 0.55), cy + Math.sin(a) * (r0 * 1.5 + len * 0.7));
      ctx.lineTo(cx + Math.cos(a + 0.06) * r0 * 1.06, cy + Math.sin(a + 0.06) * r0 * 0.98);
      ctx.closePath();
      ctx.fill();
    }

    var eyeY = cy - 16 * s;
    ctx.fillStyle = '#040405';
    ctx.beginPath();
    ctx.ellipse(cx - 20 * s, eyeY, 13 * s, 10 * s, -0.12, 0, 6.284);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 20 * s, eyeY, 13 * s, 10 * s, 0.12, 0, 6.284);
    ctx.fill();
    ctx.fillStyle = 'rgba(235,230,220,0.5)';
    ctx.beginPath();
    ctx.ellipse(cx - 20 * s, eyeY + 1, 3 * s, 2.2 * s, 0, 0, 6.284);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 20 * s, eyeY + 1, 3 * s, 2.2 * s, 0, 0, 6.284);
    ctx.fill();

    ctx.fillStyle = '#07070a';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 34 * s, 17 * s, 24 * s, 0, 0, 6.284);
    ctx.fill();
    ctx.fillStyle = 'rgba(214,208,194,0.75)';
    for (var j = 0; j < 6; j++) {
      ctx.fillRect((cx - 15 * s + j * 5.4 * s) | 0, (cy + 14 * s) | 0, (3.4 * s) | 0, (4 * s) | 0);
    }

    ctx.strokeStyle = 'rgba(60,20,20,0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx + 26 * s, cy - 44 * s);
    ctx.lineTo(cx + 34 * s, cy - 12 * s);
    ctx.lineTo(cx + 28 * s, cy + 6 * s);
    ctx.stroke();

    ctx.restore();
  };

  // ---------------- 噪点 ----------------
  var noiseCache = null;
  ART.noise = function (ctx, alpha) {
    if (!noiseCache) {
      noiseCache = document.createElement('canvas');
      noiseCache.width = W; noiseCache.height = H;
      var nc = noiseCache.getContext('2d');
      var img = nc.createImageData(W, H);
      for (var i = 0; i < W * H; i++) {
        var v = (Math.random() * 255) | 0;
        img.data[i * 4] = v;
        img.data[i * 4 + 1] = v;
        img.data[i * 4 + 2] = v;
        img.data[i * 4 + 3] = 255;
      }
      nc.putImageData(img, 0, 0);
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = alpha == null ? 0.05 : alpha;
    ctx.globalCompositeOperation = 'overlay';
    var ox = -((Math.random() * W) | 0), oy = -((Math.random() * H) | 0);
    for (var yy = -1; yy < 3; yy++) {
      for (var xx = -1; xx < 3; xx++) ctx.drawImage(noiseCache, ox + xx * W, oy + yy * H);
    }
    ctx.restore();
  };

  ART.scratch = function (ctx, t) {
    if (Math.random() > 0.3) return;
    var x = Math.random() * W;
    ctx.fillStyle = 'rgba(255,255,255,' + (0.015 + Math.random() * 0.04).toFixed(3) + ')';
    ctx.fillRect(x | 0, 0, 1, H);
  };


  // =====================================================================
  // 写实恐怖组件
  // =====================================================================

  // 一张"照片感"的扭曲脸（铺满画面）
  ART.face = function (ctx, t, power, opts) {
    opts = opts || {};
    var cx = W * 0.5, cy = H * 0.47;
    var fw = 208, fh = 252;
    var jitter = (Math.random() - 0.5) * 2.4 * power;

    ctx.save();
    ctx.translate(jitter, (Math.random() - 0.5) * 1.6 * power);

    // 背景：几乎全黑，靠脸自身的暗部撑住
    ctx.fillStyle = '#040506';
    ctx.fillRect(-20, -20, W + 40, H + 40);

    // 顶部压暗（夜里的顶光）
    var topg = ctx.createLinearGradient(0, cy - fh * 0.7, 0, cy + fh * 0.05);
    topg.addColorStop(0, 'rgba(0,0,0,0.42)');
    topg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = topg;
    ctx.fillRect(cx - fw, cy - fh, fw * 2, fh * 1.1);

    // 头部轮廓（椭圆 + 下颌收窄）
    ctx.beginPath();
    ctx.moveTo(cx - fw * 0.5, cy - fh * 0.28);
    ctx.bezierCurveTo(cx - fw * 0.52, cy - fh * 0.72, cx + fw * 0.52, cy - fh * 0.72, cx + fw * 0.5, cy - fh * 0.28);
    ctx.bezierCurveTo(cx + fw * 0.48, cy + fh * 0.20, cx + fw * 0.26, cy + fh * 0.52, cx, cy + fh * 0.56);
    ctx.bezierCurveTo(cx - fw * 0.26, cy + fh * 0.52, cx - fw * 0.48, cy + fh * 0.20, cx - fw * 0.5, cy - fh * 0.28);
    ctx.closePath();

    // 皮肤：下方打光（手电筒），上半沉入黑暗
    var sg = ctx.createRadialGradient(cx - 6, cy + fh * 0.34, 6, cx, cy + fh * 0.1, fw * 0.92);
    sg.addColorStop(0, '#bfa997');
    sg.addColorStop(0.30, '#8b7666');
    sg.addColorStop(0.60, '#493a33');
    sg.addColorStop(1, '#171210');
    ctx.fillStyle = sg;
    ctx.fill();

    // 皮肤斑驳
    ctx.save();
    ctx.clip();
    var sr = U.rng(9182);
    for (var i = 0; i < 220; i++) {
      var px = cx - fw * 0.5 + sr() * fw, py = cy - fh * 0.6 + sr() * fh * 1.15;
      var pv = sr();
      ctx.fillStyle = pv > 0.5 ? 'rgba(214,196,180,0.05)' : 'rgba(20,14,12,0.07)';
      ctx.fillRect(px, py, 1 + sr() * 3, 1 + sr() * 2);
    }
    // 侧面的阴影（颧骨下）
    var sg2 = ctx.createLinearGradient(cx - fw * 0.5, 0, cx + fw * 0.5, 0);
    sg2.addColorStop(0, 'rgba(0,0,0,0.72)');
    sg2.addColorStop(0.22, 'rgba(0,0,0,0.06)');
    sg2.addColorStop(0.78, 'rgba(0,0,0,0.10)');
    sg2.addColorStop(1, 'rgba(0,0,0,0.78)');
    ctx.fillStyle = sg2;
    ctx.fillRect(cx - fw * 0.5, cy - fh * 0.7, fw, fh * 1.3);
    ctx.restore();

    // 眼窝
    function socket(ex) {
      var g = ctx.createRadialGradient(ex, cy - fh * 0.10, 1, ex, cy - fh * 0.10, 30);
      g.addColorStop(0, 'rgba(0,0,0,0.96)');
      g.addColorStop(0.55, 'rgba(12,8,8,0.85)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(ex, cy - fh * 0.10, 27, 22, 0, 0, 6.284);
      ctx.fill();
      // 眼球
      var look = Math.sin(t * 0.7) * 2.2;
      ctx.fillStyle = 'rgba(244,242,232,0.96)';
      ctx.beginPath();
      ctx.ellipse(ex + look, cy - fh * 0.10, 7.2, 6.4, 0, 0, 6.284);
      ctx.fill();
      ctx.fillStyle = '#07070a';
      ctx.beginPath();
      ctx.ellipse(ex + look + 0.8, cy - fh * 0.10, 3.4, 3.8, 0, 0, 6.284);
      ctx.fill();
      // 血丝
      ctx.strokeStyle = 'rgba(150,40,36,0.5)';
      ctx.lineWidth = 0.5;
      for (var k = 0; k < 3; k++) {
        var ang = k * 0.9 + ex * 0.01;
        ctx.beginPath();
        ctx.moveTo(ex + look + Math.cos(ang) * 3, cy - fh * 0.10 + Math.sin(ang) * 3);
        ctx.lineTo(ex + look + Math.cos(ang) * 7, cy - fh * 0.10 + Math.sin(ang) * 6);
        ctx.stroke();
      }
    }
    socket(cx - fw * 0.24);
    socket(cx + fw * 0.24);

    // 鼻子：鼻梁一道高光 + 两侧阴影 + 鼻翼
    ctx.save();
    var nbx = cx, nty = cy - fh * 0.03, nby = cy + fh * 0.165;
    var nlg = ctx.createLinearGradient(nbx - 9, 0, nbx + 9, 0);
    nlg.addColorStop(0, 'rgba(0,0,0,0)');
    nlg.addColorStop(0.5, 'rgba(196,178,160,0.10)');
    nlg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = nlg;
    ctx.beginPath();
    ctx.moveTo(nbx - 6, nty);
    ctx.quadraticCurveTo(nbx - 8, nby - 6, nbx - 10, nby);
    ctx.lineTo(nbx + 10, nby);
    ctx.quadraticCurveTo(nbx + 8, nby - 6, nbx + 6, nty);
    ctx.closePath();
    ctx.fill();
    // 两侧阴影
    [-1, 1].forEach(function (side) {
      var sg3 = ctx.createLinearGradient(nbx + side * 4, 0, nbx + side * 16, 0);
      sg3.addColorStop(0, 'rgba(0,0,0,0.05)');
      sg3.addColorStop(1, 'rgba(0,0,0,0.42)');
      ctx.fillStyle = sg3;
      ctx.beginPath();
      ctx.moveTo(nbx + side * 5, nty + 4);
      ctx.quadraticCurveTo(nbx + side * 8, nby - 8, nbx + side * 12, nby + 2);
      ctx.lineTo(nbx + side * 6, nby + 2);
      ctx.closePath();
      ctx.fill();
    });
    // 鼻孔 + 鼻底阴影
    ctx.fillStyle = 'rgba(0,0,0,0.62)';
    [-1, 1].forEach(function (side) {
      ctx.beginPath();
      ctx.ellipse(nbx + side * 6.4, nby + 1.4, 3.1, 2.1, side * 0.2, 0, 6.284);
      ctx.fill();
    });
    var nb = ctx.createRadialGradient(nbx, nby + 4, 1, nbx, nby + 2, 16);
    nb.addColorStop(0, 'rgba(0,0,0,0.42)');
    nb.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = nb;
    ctx.fillRect(nbx - 18, nby - 6, 36, 16);
    ctx.restore();

    // 嘴：张开的黑洞
    var mo = 1 + Math.sin(t * 6) * 0.12;
    ctx.beginPath();
    ctx.moveTo(cx - 26, cy + fh * 0.27);
    ctx.quadraticCurveTo(cx, cy + fh * 0.235, cx + 26, cy + fh * 0.27);
    ctx.quadraticCurveTo(cx, cy + fh * 0.46 * mo, cx - 26, cy + fh * 0.27);
    ctx.closePath();
    var mg = ctx.createRadialGradient(cx, cy + fh * 0.30, 2, cx, cy + fh * 0.30, 40);
    mg.addColorStop(0, '#0a0202');
    mg.addColorStop(1, '#000');
    ctx.fillStyle = mg;
    ctx.fill();
    // 牙
    ctx.fillStyle = 'rgba(206,198,178,0.72)';
    for (var d = 0; d < 6; d++) {
      var tx = cx - 21 + d * 7.4 + (d % 2) * 0.6;
      ctx.fillRect(tx, cy + fh * 0.255, 4.6, 5 + (d % 3) * 1.4);
    }
    // 嘴角血痕
    ctx.strokeStyle = 'rgba(96,16,14,0.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx + 24, cy + fh * 0.275);
    ctx.quadraticCurveTo(cx + 30, cy + fh * 0.34, cx + 27, cy + fh * 0.40);
    ctx.stroke();

    // 头发：一簇一簇垂下来，遮住额头与一侧（不要排成条码）
    var hr = U.rng(4471);
    // 先给额头压一片发根
    var hg0 = ctx.createLinearGradient(0, cy - fh * 0.72, 0, cy - fh * 0.10);
    hg0.addColorStop(0, 'rgba(3,3,5,0.96)');
    hg0.addColorStop(0.55, 'rgba(6,6,9,0.62)');
    hg0.addColorStop(1, 'rgba(8,8,12,0)');
    ctx.fillStyle = hg0;
    ctx.fillRect(cx - fw * 0.56, cy - fh * 0.74, fw * 1.12, fh * 0.72);

    for (var cl = 0; cl < 26; cl++) {
      var clx = cx - fw * 0.54 + hr() * fw * 1.08;
      var n = 3 + (hr() * 5 | 0);
      var clen = 26 + hr() * (fh * 0.40);
      var cw = 0.7 + hr() * 1.5;
      var csway = (hr() - 0.5) * 9;
      for (var s2 = 0; s2 < n; s2++) {
        var hx = clx + (hr() - 0.5) * 7;
        var hy = cy - fh * 0.60 + hr() * 26;
        var len = Math.min(clen * (0.55 + hr() * 0.6), fh * 0.50);
        var sway = csway + Math.sin(t * 1.1 + cl + s2 * 0.4) * 2.6 + (hr() - 0.5) * 4;
        var lw = cw * (0.5 + hr() * 1.1);
        ctx.strokeStyle = 'rgba(3,3,6,' + (0.48 + hr() * 0.44).toFixed(2) + ')';
        ctx.lineWidth = lw;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.bezierCurveTo(hx + sway * 0.3, hy + len * 0.35, hx + sway * 0.8, hy + len * 0.7, hx + sway, hy + len);
        ctx.stroke();
        // 发丝上的高光，让头发有体积
        if (hr() > 0.72) {
          ctx.strokeStyle = 'rgba(96,104,120,0.16)';
          ctx.lineWidth = Math.max(0.5, lw * 0.4);
          ctx.beginPath();
          ctx.moveTo(hx + 0.6, hy + len * 0.1);
          ctx.quadraticCurveTo(hx + sway * 0.6, hy + len * 0.55, hx + sway * 0.9, hy + len * 0.8);
          ctx.stroke();
        }
      }
    }

    // 眉骨阴影：给眼窝一个上沿，脸才立起来
    ctx.strokeStyle = 'rgba(6,4,4,0.55)';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    [-1, 1].forEach(function (side) {
      var bx = cx + side * fw * 0.24;
      ctx.beginPath();
      ctx.moveTo(bx - 24, cy - fh * 0.185);
      ctx.quadraticCurveTo(bx, cy - fh * 0.225, bx + 24, cy - fh * 0.185);
      ctx.stroke();
    });

    // 颧骨高光 + 颊侧凹陷
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    [-1, 1].forEach(function (side) {
      var gx = cx + side * fw * 0.29, gy = cy + fh * 0.10;
      var cg = ctx.createRadialGradient(gx, gy, 1, gx, gy, 30);
      cg.addColorStop(0, 'rgba(198,178,158,0.07)');
      cg.addColorStop(1, 'rgba(206,186,166,0)');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.ellipse(gx, gy, 40, 28, 0, 0, 6.284);
      ctx.fill();
    });
    ctx.restore();
    ctx.save();
    [-1, 1].forEach(function (side) {
      var hx2 = cx + side * fw * 0.335, hy2 = cy + fh * 0.19;
      var dg = ctx.createRadialGradient(hx2, hy2, 1, hx2, hy2, 26);
      dg.addColorStop(0, 'rgba(0,0,0,0.30)');
      dg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = dg;
      ctx.beginPath();
      ctx.ellipse(hx2, hy2, 26, 30, side * 0.12, 0, 6.284);
      ctx.fill();
    });
    ctx.restore();

    // 两侧再压一道暗，脸收窄
    ctx.save();
    var eg = ctx.createLinearGradient(cx - fw * 0.5, 0, cx + fw * 0.5, 0);
    eg.addColorStop(0, 'rgba(0,0,0,0.86)');
    eg.addColorStop(0.18, 'rgba(0,0,0,0.10)');
    eg.addColorStop(0.82, 'rgba(0,0,0,0.14)');
    eg.addColorStop(1, 'rgba(0,0,0,0.88)');
    ctx.fillStyle = eg;
    ctx.fillRect(cx - fw * 0.5, cy - fh * 0.5, fw, fh * 1.1);
    ctx.restore();

    // 人中的两道浅影
    ctx.strokeStyle = 'rgba(0,0,0,0.30)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy + fh * 0.19);
    ctx.lineTo(cx - 3, cy + fh * 0.235);
    ctx.moveTo(cx + 4, cy + fh * 0.19);
    ctx.lineTo(cx + 3, cy + fh * 0.235);
    ctx.stroke();

    // 额头的裂口
    ctx.strokeStyle = 'rgba(70,10,10,0.7)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy - fh * 0.46);
    ctx.lineTo(cx - 4, cy - fh * 0.34);
    ctx.lineTo(cx - 9, cy - fh * 0.22);
    ctx.stroke();

    // 柔光提亮（让脸从黑底里浮起来）
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var lg = ctx.createRadialGradient(cx, cy + fh * 0.18, 8, cx, cy + fh * 0.18, fw * 0.78);
    lg.addColorStop(0, 'rgba(186,168,148,0.15)');
    lg.addColorStop(0.5, 'rgba(140,124,110,0.06)');
    lg.addColorStop(1, 'rgba(120,110,100,0)');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.ellipse(cx, cy + fh * 0.12, fw * 0.56, fh * 0.62, 0, 0, 6.284);
    ctx.fill();
    ctx.restore();

    // 冷色轮廓光（让脸从黑里浮出来）
    ctx.strokeStyle = 'rgba(206,222,238,0.26)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx - fw * 0.48, cy - fh * 0.24);
    ctx.bezierCurveTo(cx - fw * 0.5, cy + fh * 0.2, cx - fw * 0.26, cy + fh * 0.5, cx, cy + fh * 0.55);
    ctx.stroke();

    ctx.restore();

    // 整体压一层冷色，制造夜视/监控感
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(150,170,200,0.05)';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  };

  // 更细致的人形（背影）
  ART.figure = function (ctx, x, footY, phase, opts) {
    opts = opts || {};
    var s = opts.scale || 1;
    var hh = 46 * s;            // 身高
    var sw = 10.5 * s;          // 肩宽的一半
    var col = opts.color || '#05070b';
    var walk = !!opts.walking;
    var sw2 = walk ? Math.sin(phase) * 3.4 * s : 0;

    ctx.save();
    ctx.translate(x, footY - hh);

    // 影子
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(0, hh + 3, sw * 1.6, 3.4 * s, 0, 0, 6.284);
    ctx.fill();

    // 腿
    ctx.strokeStyle = col;
    ctx.lineWidth = 4.2 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-2.4 * s, hh * 0.52);
    ctx.lineTo(-2.6 * s + sw2, hh * 0.98);
    ctx.moveTo(2.4 * s, hh * 0.52);
    ctx.lineTo(2.6 * s - sw2, hh * 0.98);
    ctx.stroke();

    // 躯干（带腰线收窄）
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-sw, hh * 0.30);
    ctx.quadraticCurveTo(-sw * 0.86, hh * 0.52, -sw * 0.66, hh * 0.60);
    ctx.lineTo(sw * 0.66, hh * 0.60);
    ctx.quadraticCurveTo(sw * 0.86, hh * 0.52, sw, hh * 0.30);
    ctx.quadraticCurveTo(sw * 0.5, hh * 0.22, 0, hh * 0.21);
    ctx.quadraticCurveTo(-sw * 0.5, hh * 0.22, -sw, hh * 0.30);
    ctx.closePath();
    ctx.fill();

    // 手臂
    ctx.lineWidth = 3.2 * s;
    ctx.beginPath();
    ctx.moveTo(-sw * 0.92, hh * 0.33);
    ctx.lineTo(-sw * 1.12 - sw2 * 0.4, hh * 0.58);
    ctx.moveTo(sw * 0.92, hh * 0.33);
    ctx.lineTo(sw * 1.12 + sw2 * 0.4, hh * 0.58);
    ctx.stroke();

    // 脖子
    ctx.fillRect(-1.8 * s, hh * 0.17, 3.6 * s, hh * 0.06);

    // 头 + 头发
    ctx.beginPath();
    ctx.ellipse(0, hh * 0.115, 4.6 * s, 5.6 * s, 0, 0, 6.284);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, hh * 0.10, 5.1 * s, 5.4 * s, 0, 0, 6.284);
    ctx.fill();

    // 轮廓光
    if (opts.rim) {
      ctx.strokeStyle = opts.rim;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(-sw * 0.96, hh * 0.31);
      ctx.quadraticCurveTo(-sw * 1.16, hh * 0.44, -sw * 1.06, hh * 0.58);
      ctx.moveTo(sw * 0.2, hh * 0.06);
      ctx.quadraticCurveTo(sw * 0.62, hh * 0.05, sw * 0.74, hh * 0.26);
      ctx.stroke();
    }
    ctx.restore();
  };

  // 血手印
  ART.handprint = function (ctx, x, y, s, alpha, col) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.globalAlpha = alpha == null ? 0.5 : alpha;
    ctx.fillStyle = col || 'rgba(74,10,10,0.85)';
    // 掌
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 11, 0, 0, 6.284);
    ctx.fill();
    // 五指
    var fingers = [[-8, -13, -12, -22, 2.6], [-3, -15, -5, -26, 2.4], [1, -15, 2, -27, 2.4],
                   [5, -14, 9, -25, 2.2], [8, -10, 14, -18, 2.0]];
    for (var i = 0; i < fingers.length; i++) {
      var f = fingers[i];
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineCap = 'round';
      ctx.lineWidth = f[4];
      ctx.beginPath();
      ctx.moveTo(f[0], f[1]);
      ctx.quadraticCurveTo((f[0] + f[2]) * 0.5 + 1, (f[1] + f[3]) * 0.5, f[2], f[3]);
      ctx.stroke();
    }
    // 手腕拖痕
    ctx.lineWidth = 5.2;
    ctx.beginPath();
    ctx.moveTo(-2, 9);
    ctx.quadraticCurveTo(-1, 18, 2, 26);
    ctx.stroke();
    // 滴落
    ctx.beginPath();
    ctx.ellipse(3, 34, 1.2, 2.6, 0, 0, 6.284);
    ctx.fill();
    ctx.restore();
  };

  // 墙上抓痕
  ART.scratches = function (ctx, x, y, w, h, seed, alpha) {
    var r = U.rng(seed || 11);
    ctx.save();
    ctx.globalAlpha = alpha == null ? 0.55 : alpha;
    for (var i = 0; i < 5; i++) {
      var ox = r() * w;
      ctx.strokeStyle = 'rgba(16,10,8,0.7)';
      ctx.lineWidth = 0.9 + r() * 0.9;
      ctx.beginPath();
      ctx.moveTo(x + ox, y);
      ctx.bezierCurveTo(x + ox + 6 - r() * 12, y + h * 0.35,
                        x + ox + 8 - r() * 16, y + h * 0.7,
                        x + ox + 3 - r() * 8, y + h);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(180,170,160,0.10)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
    ctx.restore();
  };

  // 从上方垂落的头发
  ART.hairStrands = function (ctx, x, y, w, len, t, alpha) {
    var r = U.rng(Math.round(x) + 31);
    ctx.save();
    ctx.globalAlpha = alpha == null ? 0.8 : alpha;
    ctx.strokeStyle = 'rgba(3,3,5,0.95)';
    for (var i = 0; i < 34; i++) {
      var hx = x + r() * w;
      var l = len * (0.5 + r() * 0.9);
      var sw = Math.sin(t * 1.1 + i * 0.7) * 3.4;
      ctx.lineWidth = 0.6 + r() * 1.2;
      ctx.beginPath();
      ctx.moveTo(hx, y - 6);
      ctx.quadraticCurveTo(hx + sw * 0.6, y + l * 0.55, hx + sw, y + l);
      ctx.stroke();
    }
    ctx.restore();
  };

  // 暗处的一双眼睛
  ART.eyes = function (ctx, x, y, t, alpha) {
    var blink = Math.sin(t * 0.6) > 0.985 ? 0.15 : 1;
    ctx.save();
    ctx.globalAlpha = alpha == null ? 0.9 : alpha;
    ctx.fillStyle = 'rgba(228,226,208,0.92)';
    ctx.beginPath();
    ctx.ellipse(x - 3.6, y, 1.9, 1.5 * blink, 0, 0, 6.284);
    ctx.ellipse(x + 3.6, y, 1.9, 1.5 * blink, 0, 0, 6.284);
    ctx.fill();
    ctx.fillStyle = 'rgba(4,4,6,0.95)';
    ctx.beginPath();
    ctx.ellipse(x - 3.4, y, 0.9, 1.4 * blink, 0, 0, 6.284);
    ctx.ellipse(x + 3.8, y, 0.9, 1.4 * blink, 0, 0, 6.284);
    ctx.fill();
    // 微光
    var g = ctx.createRadialGradient(x, y, 1, x, y, 16);
    g.addColorStop(0, 'rgba(255,240,220,0.10)');
    g.addColorStop(1, 'rgba(255,240,220,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, 18, 12, 0, 0, 6.284);
    ctx.fill();
    ctx.restore();
  };

  // 停着的车（侧视）
  ART.car = function (ctx, x, gy, w, h, seed) {
    var r = U.rng(seed || 3);
    var body = ['#1b2027', '#222a33', '#2a2229', '#1d2626'][Math.floor(r() * 4)];
    ctx.save();
    // 地面倒影
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = body;
    ctx.fillRect(x, gy, w, 6);
    ctx.globalAlpha = 1;
    // 车身
    ctx.fillStyle = body;
    ART.rr(ctx, x, gy - h * 0.62, w, h * 0.62, 5);
    ctx.fill();
    // 车顶
    ctx.beginPath();
    ctx.moveTo(x + w * 0.16, gy - h * 0.62);
    ctx.lineTo(x + w * 0.28, gy - h);
    ctx.lineTo(x + w * 0.72, gy - h);
    ctx.lineTo(x + w * 0.84, gy - h * 0.62);
    ctx.closePath();
    ctx.fill();
    // 车窗
    ctx.fillStyle = 'rgba(120,150,180,0.14)';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.20, gy - h * 0.64);
    ctx.lineTo(x + w * 0.31, gy - h * 0.95);
    ctx.lineTo(x + w * 0.69, gy - h * 0.95);
    ctx.lineTo(x + w * 0.80, gy - h * 0.64);
    ctx.closePath();
    ctx.fill();
    // 高光
    ctx.fillStyle = 'rgba(190,215,240,0.10)';
    ctx.fillRect(x + w * 0.34, gy - h * 0.90, w * 0.28, 1.4);
    // 车轮
    ctx.fillStyle = '#080a0c';
    ctx.beginPath();
    ctx.arc(x + w * 0.24, gy - 3, h * 0.13, 0, 6.284);
    ctx.arc(x + w * 0.78, gy - 3, h * 0.13, 0, 6.284);
    ctx.fill();
    // 保险杠反光
    ctx.fillStyle = 'rgba(255,220,180,0.06)';
    ctx.fillRect(x + w * 0.02, gy - h * 0.28, w * 0.96, 1);
    ctx.restore();
  };

  // 车库柱子
  ART.pillar = function (ctx, x, gy, w, h) {
    ctx.save();
    ctx.fillStyle = '#2c3138';
    ctx.fillRect(x, gy - h, w, h);
    var g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.55)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.05)');
    g.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = g;
    ctx.fillRect(x, gy - h, w, h);
    // 黄黑警示带
    for (var i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 ? '#3a3524' : '#1a1a1a';
      ctx.fillRect(x, gy - 26 + i * 6, w, 6);
    }
    // 污渍
    var r = U.rng(Math.round(x) + 5);
    for (var k = 0; k < 14; k++) {
      ctx.fillStyle = 'rgba(10,10,12,0.35)';
      ctx.fillRect(x + r() * w, gy - h + r() * h * 0.7, 2 + r() * 5, 3 + r() * 9);
    }
    ctx.restore();
  };

  // 沙发 + 电视（客厅）
  ART.sofa = function (ctx, x, gy, w) {
    var h = 22;
    ctx.save();
    ctx.fillStyle = '#1a1614';
    ART.rr(ctx, x, gy - h * 0.62, w, h * 0.62, 3);
    ctx.fill();
    ctx.fillStyle = '#221c19';
    ART.rr(ctx, x + 3, gy - h, w - 6, h * 0.5, 3);
    ctx.fill();
    // 坐垫缝
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.34, gy - h * 0.55);
    ctx.lineTo(x + w * 0.34, gy - h * 0.08);
    ctx.moveTo(x + w * 0.68, gy - h * 0.55);
    ctx.lineTo(x + w * 0.68, gy - h * 0.08);
    ctx.stroke();
    // 扶手高光
    ctx.fillStyle = 'rgba(200,190,180,0.05)';
    ctx.fillRect(x + 3, gy - h, w - 6, 1);
    ctx.restore();
  };

  ART.tv = function (ctx, x, gy, w, h, t, on) {
    ctx.save();
    // 机身
    ctx.fillStyle = '#0d1013';
    ctx.fillRect(x, gy - h, w, h);
    // 屏幕
    var k = on == null ? 1 : on;
    var g = ctx.createLinearGradient(0, gy - h, 0, gy);
    g.addColorStop(0, 'rgba(198,226,248,' + (0.52 * k).toFixed(3) + ')');
    g.addColorStop(0.55, 'rgba(126,168,204,' + (0.34 * k).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(58,88,118,' + (0.20 * k).toFixed(3) + ')');
    ctx.fillStyle = g;
    ctx.fillRect(x + 3, gy - h + 3, w - 6, h - 6);
    // 雪花
    if (k > 0.05) {
      var r = U.rng(Math.round(t * 14) + 7);
      for (var i = 0; i < 40; i++) {
        ctx.fillStyle = 'rgba(238,246,255,' + (0.12 + r() * 0.55).toFixed(2) + ')';
        ctx.fillRect(x + 3 + r() * (w - 6), gy - h + 3 + r() * (h - 6), 2 + r() * 2, 1 + r() * 1.4);
      }
    }
    // 屏幕光溢出
    if (k > 0.1) {
      var gl = ctx.createRadialGradient(x + w * 0.5, gy - h * 0.5, 2, x + w * 0.5, gy - h * 0.5, w * 1.5);
      gl.addColorStop(0, 'rgba(168,206,238,' + (0.24 * k).toFixed(3) + ')');
      gl.addColorStop(1, 'rgba(150,190,225,0)');
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = gl;
      ctx.fillRect(x - w, gy - h * 2, w * 3, h * 3);
      ctx.restore();
    }
    ctx.restore();
  };

  // 圆角矩形路径
  ART.rr = function (ctx, x, y, w, h, r) {
    r = Math.min(r, w * 0.5, h * 0.5);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };


  // 地下车库
  ART.garageInterior = function (ctx, scroll, pal, t, opts) {
    opts = opts || {};
    var hy = ART.HORIZON;

    // 天花板
    ctx.fillStyle = '#0a0c0f';
    ctx.fillRect(0, 0, W, 34);
    // 管道（随滚动平移）
    for (var p = 0; p < 4; p++) {
      var py = 8 + p * 6;
      ctx.fillStyle = 'rgba(38,44,50,0.9)';
      ctx.fillRect(0, py, W, 2.4);
      ctx.fillStyle = 'rgba(120,140,158,0.10)';
      ctx.fillRect(0, py, W, 0.8);
    }
    // 管道吊架
    for (var hx = -((scroll * 0.5) % 76); hx < W + 76; hx += 76) {
      ctx.fillStyle = 'rgba(20,24,28,0.9)';
      ctx.fillRect(hx | 0, 0, 2, 34);
    }

    // 后墙
    ctx.fillStyle = vgrad(ctx, 34, hy, '#171c21', '#0f1317');
    ctx.fillRect(0, 34, W, hy - 34);
    // 混凝土分块缝
    for (var bx = -((scroll * 0.55) % 120); bx < W + 120; bx += 120) {
      ctx.fillStyle = 'rgba(0,0,0,0.42)';
      ctx.fillRect(bx | 0, 34, 1, hy - 34);
    }
    // 墙面水渍/霉斑
    var r = U.rng(5521);
    for (var s = 0; s < 46; s++) {
      var sx2 = r() * W, sy = 40 + r() * (hy - 60);
      var sw = 4 + r() * 22, sh = 6 + r() * 34;
      ctx.fillStyle = 'rgba(8,10,10,' + (0.06 + r() * 0.12).toFixed(2) + ')';
      ctx.beginPath();
      ctx.ellipse(sx2, sy, sw, sh, 0, 0, 6.284);
      ctx.fill();
    }
    // 墙裙
    ctx.fillStyle = '#12161a';
    ctx.fillRect(0, hy - 30, W, 30);
    ctx.fillStyle = 'rgba(190,210,225,0.05)';
    ctx.fillRect(0, hy - 30, W, 1);

    // 地面
    ctx.fillStyle = '#14181c';
    ctx.fillRect(0, hy, W, H - hy);
    // 车位线
    for (var lx = -((scroll * 1.0) % 128); lx < W + 128; lx += 128) {
      ctx.fillStyle = 'rgba(196,186,140,0.16)';
      ctx.fillRect(lx | 0, hy + 4, 2, 40);
      // 磨损缺口
      ctx.fillStyle = 'rgba(20,24,28,0.85)';
      ctx.fillRect((lx + 0) | 0, hy + 14 + ((lx | 0) % 9), 2, 3);
      ctx.fillRect((lx + 0) | 0, hy + 30 + ((lx | 0) % 7), 2, 4);
    }
    // 地面渐变
    var g = ctx.createLinearGradient(0, hy, 0, H);
    g.addColorStop(0, 'rgba(140,170,200,0.05)');
    g.addColorStop(0.4, 'rgba(0,0,0,0.28)');
    g.addColorStop(1, 'rgba(0,0,0,0.9)');
    ctx.fillStyle = g;
    ctx.fillRect(0, hy, W, H - hy);
    // 油渍水洼
    var rr2 = U.rng(8812);
    for (var w2 = 0; w2 < 7; w2++) {
      var wx2 = ((rr2() * 700 - (scroll * 0.9)) % 700 + 700) % 700 - 100;
      var wy2 = hy + 10 + rr2() * 46;
      var wr2 = 12 + rr2() * 30;
      ctx.fillStyle = 'rgba(120,150,180,0.045)';
      ctx.beginPath();
      ctx.ellipse(wx2, wy2, wr2, wr2 * 0.28, 0, 0, 6.284);
      ctx.fill();
      ctx.fillStyle = 'rgba(210,235,255,0.10)';
      ctx.beginPath();
      ctx.ellipse(wx2 - wr2 * 0.3, wy2 - 1, wr2 * 0.22, wr2 * 0.07, 0, 0, 6.284);
      ctx.fill();
    }
    // 天花板灯带（荧光管）
    var stripGap = 260;
    var k0 = Math.floor((scroll - 200) / stripGap), k1 = Math.ceil((scroll + 700) / stripGap);
    for (var k = k0; k <= k1; k++) {
      var ss = k * stripGap + 90;
      var lxk = 480 * 0.5 + (ss - scroll);
      // 深度：灯在天花板，投影位置略微前移
      if (lxk < -180 || lxk > 660) continue;
      var on = 1;
      if (opts.lightOn != null) on = opts.lightOn;
      // 单灯随机抽
      var ph = (k * 37) % 11;
      if (ph < 3) {
        var f = Math.sin(t * (9 + ph * 3) + k) * 0.5 + 0.5;
        on *= 0.35 + 0.65 * (f > 0.72 ? 0 : 1);
      }
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var gg = ctx.createRadialGradient(lxk, 30, 4, lxk, 130, 190);
      gg.addColorStop(0, 'rgba(206,232,255,' + (0.22 * on).toFixed(3) + ')');
      gg.addColorStop(0.4, 'rgba(180,214,244,' + (0.07 * on).toFixed(3) + ')');
      gg.addColorStop(1, 'rgba(160,200,230,0)');
      ctx.fillStyle = gg;
      ctx.fillRect(lxk - 190, 0, 380, 250);
      ctx.restore();
      // 灯管本体
      ctx.fillStyle = 'rgba(226,242,255,' + (0.7 * on).toFixed(3) + ')';
      ctx.fillRect((lxk - 22) | 0, 30, 44, 2.6);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.9 * on).toFixed(3) + ')';
      ctx.fillRect((lxk - 22) | 0, 30, 44, 1);
      // 地面反光
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var fg = ctx.createRadialGradient(lxk, hy + 24, 2, lxk, hy + 24, 110);
      fg.addColorStop(0, 'rgba(196,224,250,' + (0.10 * on).toFixed(3) + ')');
      fg.addColorStop(1, 'rgba(196,224,250,0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.ellipse(lxk, hy + 26, 104, 30, 0, 0, 6.284);
      ctx.fill();
      ctx.restore();
    }
  };

  // 客厅
  ART.livingRoom = function (ctx, scroll, pal, t, opts) {
    opts = opts || {};
    var hy = ART.HORIZON;

    // 天花板
    ctx.fillStyle = '#100d0a';
    ctx.fillRect(0, 0, W, 26);

    // 墙面
    ctx.fillStyle = vgrad(ctx, 26, hy, '#2d2419', '#1e1812');
    ctx.fillRect(0, 26, W, hy - 26);
    // 墙纸暗纹（菱形）
    for (var cy = 40; cy < hy; cy += 26) {
      for (var cx = -((scroll * 0.5) % 26); cx < W + 26; cx += 26) {
        ctx.strokeStyle = 'rgba(180,150,120,0.028)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx + 13, cy - 8);
        ctx.lineTo(cx + 21, cy);
        ctx.lineTo(cx + 13, cy + 8);
        ctx.lineTo(cx + 5, cy);
        ctx.closePath();
        ctx.stroke();
      }
    }
    // 墙顶阴影
    var tg = ctx.createLinearGradient(0, 26, 0, 90);
    tg.addColorStop(0, 'rgba(0,0,0,0.55)');
    tg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = tg;
    ctx.fillRect(0, 26, W, 64);

    // 护墙板
    ctx.fillStyle = '#241b13';
    ctx.fillRect(0, hy - 44, W, 44);
    ctx.fillStyle = 'rgba(212,176,132,0.07)';
    ctx.fillRect(0, hy - 44, W, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, hy - 43, W, 1);
    // 护墙板格子
    for (var px2 = -((scroll * 0.7) % 58); px2 < W + 58; px2 += 58) {
      ctx.strokeStyle = 'rgba(0,0,0,0.40)';
      ctx.lineWidth = 1;
      ctx.strokeRect((px2 + 6) | 0, hy - 36, 46, 26);
      ctx.strokeStyle = 'rgba(220,186,146,0.045)';
      ctx.strokeRect((px2 + 7) | 0, hy - 35, 44, 24);
    }
    // 踢脚
    ctx.fillStyle = '#0e0a07';
    ctx.fillRect(0, hy - 6, W, 6);

    // 地板（深色木地板 + 地毯感）
    ctx.fillStyle = '#211a13';
    ctx.fillRect(0, hy, W, H - hy);
    for (var ly = hy + 5, st = 3; ly < H; ly += st, st *= 1.5) {
      ctx.fillStyle = 'rgba(0,0,0,0.34)';
      ctx.fillRect(0, ly | 0, W, 1);
    }
    for (var vx = -((scroll * 0.9) % 66); vx < W + 66; vx += 66) {
      ctx.fillStyle = 'rgba(0,0,0,0.30)';
      ctx.fillRect(vx | 0, hy, 1, H - hy);
    }
    var fg2 = ctx.createLinearGradient(0, hy, 0, H);
    fg2.addColorStop(0, 'rgba(255,196,140,0.09)');
    fg2.addColorStop(0.4, 'rgba(0,0,0,0.26)');
    fg2.addColorStop(1, 'rgba(0,0,0,0.82)');
    ctx.fillStyle = fg2;
    ctx.fillRect(0, hy, W, H - hy);

    // 顶灯 + 壁灯的光（让客厅不至于全黑，但仍是零散暖光）
    for (var lx = -((scroll * 0.98) % 1180); lx < W + 1180; lx += 1180) {
      var cxp = lx + 300;
      var cone = ctx.createLinearGradient(0, 28, 0, hy + 8);
      cone.addColorStop(0, 'rgba(255,206,150,0.16)');
      cone.addColorStop(0.55, 'rgba(255,190,132,0.07)');
      cone.addColorStop(1, 'rgba(255,178,120,0.015)');
      ctx.fillStyle = cone;
      ctx.beginPath();
      ctx.moveTo(cxp - 22, 28);
      ctx.lineTo(cxp + 22, 28);
      ctx.lineTo(cxp + 132, hy + 8);
      ctx.lineTo(cxp - 132, hy + 8);
      ctx.closePath();
      ctx.fill();
      // 灯罩
      ctx.fillStyle = 'rgba(38,30,22,0.95)';
      ctx.beginPath();
      ctx.moveTo(cxp - 30, 26);
      ctx.lineTo(cxp + 30, 26);
      ctx.lineTo(cxp + 20, 34);
      ctx.lineTo(cxp - 20, 34);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,222,178,0.30)';
      ctx.fillRect(cxp - 19, 33.4, 38, 1.6);
      // 地面光斑
      var pool = ctx.createRadialGradient(cxp, hy + 16, 2, cxp, hy + 16, 150);
      pool.addColorStop(0, 'rgba(255,198,146,0.13)');
      pool.addColorStop(0.5, 'rgba(255,186,132,0.05)');
      pool.addColorStop(1, 'rgba(255,186,132,0)');
      ctx.fillStyle = pool;
      ctx.fillRect(cxp - 160, hy - 8, 320, 150);
    }

    // 灯与灯之间的暗区（让明暗有对比，而不是整屏一片灰亮）
    for (var dx = -((scroll * 0.98) % 1180) + 590; dx < W + 1180; dx += 1180) {
      var dark = ctx.createRadialGradient(dx, hy - 10, 10, dx, hy - 10, 330);
      dark.addColorStop(0, 'rgba(0,0,0,0.52)');
      dark.addColorStop(0.55, 'rgba(0,0,0,0.26)');
      dark.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = dark;
      ctx.fillRect(dx - 340, 24, 680, H - 24);
    }
  };

  // 墙上的相框（画面可被"划掉"）
  ART.frame = function (ctx, x, y, w, h, opts) {
    opts = opts || {};
    ctx.save();
    // 框
    ctx.fillStyle = '#2a2118';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
    // 画面
    ctx.fillStyle = opts.img || '#1a1916';
    ctx.fillRect(x + 3.5, y + 3.5, w - 7, h - 7);
    // 里面模糊的人影
    if (opts.who !== false) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath();
      ctx.ellipse(x + w * 0.5, y + h * 0.68, w * 0.26, h * 0.30, 0, 0, 6.284);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + w * 0.5, y + h * 0.36, w * 0.13, 0, 6.284);
      ctx.fill();
    }
    // 玻璃反光
    ctx.fillStyle = 'rgba(200,225,245,0.07)';
    ctx.beginPath();
    ctx.moveTo(x + 3.5, y + h - 3.5);
    ctx.lineTo(x + w * 0.62, y + 3.5);
    ctx.lineTo(x + w * 0.82, y + 3.5);
    ctx.lineTo(x + 3.5, y + h * 0.72);
    ctx.closePath();
    ctx.fill();
    // 划痕（划掉脸）
    if (opts.slashed) {
      ctx.strokeStyle = 'rgba(150,30,26,0.75)';
      ctx.lineWidth = 1.3;
      for (var i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(x + 4 + i * 2, y + 5 + i * 3);
        ctx.lineTo(x + w - 5 - i * 2, y + h - 6 - i * 2);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(10,6,6,0.8)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(x + 5, y + h * 0.42);
      ctx.lineTo(x + w - 6, y + h * 0.34);
      ctx.stroke();
    }
    ctx.restore();
  };


  // 落地灯（客厅）
  ART.floorLamp = function (ctx, x, gy, on) {
    on = on == null ? 1 : on;
    ctx.save();
    // 灯杆
    ctx.fillStyle = '#191411';
    ctx.fillRect((x - 0.8) | 0, gy - 62, 1.6, 62);
    // 底座
    ctx.fillStyle = '#141010';
    ctx.beginPath();
    ctx.ellipse(x, gy, 7, 2.2, 0, 0, 6.284);
    ctx.fill();
    // 灯罩
    ctx.beginPath();
    ctx.moveTo(x - 11, gy - 62);
    ctx.lineTo(x + 11, gy - 62);
    ctx.lineTo(x + 7, gy - 76);
    ctx.lineTo(x - 7, gy - 76);
    ctx.closePath();
    ctx.fillStyle = 'rgba(64,52,40,0.95)';
    ctx.fill();
    ctx.fillStyle = 'rgba(255,214,160,' + (0.55 * on).toFixed(3) + ')';
    ctx.fillRect(x - 9.5, gy - 63.5, 19, 2);
    // 光锥
    ctx.globalCompositeOperation = 'lighter';
    var g = ctx.createLinearGradient(0, gy - 62, 0, gy + 8);
    g.addColorStop(0, 'rgba(255,198,132,' + (0.26 * on).toFixed(3) + ')');
    g.addColorStop(0.6, 'rgba(255,186,120,' + (0.10 * on).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(255,180,112,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - 10, gy - 62);
    ctx.lineTo(x + 10, gy - 62);
    ctx.lineTo(x + 44, gy + 6);
    ctx.lineTo(x - 44, gy + 6);
    ctx.closePath();
    ctx.fill();
    // 地面光斑
    var fg = ctx.createRadialGradient(x, gy + 2, 2, x, gy + 2, 54);
    fg.addColorStop(0, 'rgba(255,200,140,' + (0.22 * on).toFixed(3) + ')');
    fg.addColorStop(1, 'rgba(255,196,136,0)');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.ellipse(x, gy + 3, 52, 15, 0, 0, 6.284);
    ctx.fill();
    ctx.restore();
  };


  // 墙上用血写的字（手写歪斜 + 往下淌）
  ART.bloodText = function (ctx, x, y, text, size, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha == null ? 0.80 : alpha;
    ctx.fillStyle = '#8f1411';
    ctx.font = '700 ' + (size || 15) + 'px "Songti SC", "SimSun", serif';
    ctx.textBaseline = 'middle';
    var rr = U.rng(3311 + (text || '').length * 7);
    var cxp = x;
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      var w = ctx.measureText(ch).width;
      ctx.save();
      ctx.translate(cxp + w * 0.5, y + (rr() - 0.5) * 3.2);
      ctx.rotate((rr() - 0.5) * 0.34);
      ctx.fillText(ch, -w * 0.5, 0);
      ctx.restore();
      // 淌下来的一道
      if (rr() > 0.45) {
        var dl = 3 + rr() * 13;
        ctx.fillRect((cxp + w * 0.5) | 0, (y + size * 0.35) | 0, 1 + rr() * 0.9, dl);
      }
      cxp += w + 1.4;
    }
    ctx.restore();
  };

  // 地上粉笔人形（现场的那种）
  ART.chalk = function (ctx, x, gy, s, alpha) {
    s = s || 1;
    ctx.save();
    ctx.globalAlpha = alpha == null ? 0.20 : alpha;
    ctx.strokeStyle = '#dfe6ea';
    ctx.lineWidth = 0.9 * s;
    ctx.beginPath();
    ctx.ellipse(x, gy - 2 * s, 6.4 * s, 3.6 * s, 0, 0, 6.284);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 8 * s, gy + 4 * s);
    ctx.lineTo(x - 2 * s, gy + 2 * s);
    ctx.lineTo(x + 2 * s, gy + 8 * s);
    ctx.lineTo(x + 9 * s, gy + 9 * s);
    ctx.moveTo(x - 3 * s, gy + 3.4 * s);
    ctx.lineTo(x - 12 * s, gy + 1 * s);
    ctx.moveTo(x + 1 * s, gy + 5 * s);
    ctx.lineTo(x + 11 * s, gy + 4 * s);
    ctx.stroke();
    ctx.restore();
  };

  // 吊在天花板上的人（只有轮廓）
  ART.hanging = function (ctx, x, yTop, s, t, alpha) {
    s = s || 1;
    var sway = Math.sin((t || 0) * 0.9) * 2.4;
    ctx.save();
    ctx.globalAlpha = alpha == null ? 0.72 : alpha;
    ctx.strokeStyle = '#0d0d10';
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(x, yTop);
    ctx.lineTo(x + sway * 0.3, yTop + 24 * s);
    ctx.stroke();
    ctx.fillStyle = '#0a0b0d';
    ctx.beginPath();
    ctx.ellipse(x + sway * 0.6, yTop + 33 * s, 5 * s, 6.4 * s, sway * 0.02, 0, 6.284);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + sway * 0.6 - 7 * s, yTop + 41 * s);
    ctx.quadraticCurveTo(x + sway * 0.8, yTop + 56 * s, x + sway * 0.5 - 5 * s, yTop + 74 * s);
    ctx.lineTo(x + sway * 0.5 + 5 * s, yTop + 74 * s);
    ctx.quadraticCurveTo(x + sway * 0.8, yTop + 56 * s, x + sway * 0.6 + 7 * s, yTop + 41 * s);
    ctx.closePath();
    ctx.fill();
    // 两只垂下的手
    ctx.strokeStyle = '#0a0b0d';
    ctx.lineWidth = 2.4 * s;
    ctx.beginPath();
    ctx.moveTo(x + sway * 0.6 - 7 * s, yTop + 46 * s);
    ctx.lineTo(x + sway * 0.6 - 10 * s, yTop + 66 * s);
    ctx.moveTo(x + sway * 0.6 + 7 * s, yTop + 46 * s);
    ctx.lineTo(x + sway * 0.6 + 10 * s, yTop + 66 * s);
    ctx.stroke();
    ctx.restore();
  };

  // 镜子：里面站着个背对你的人
  ART.mirror = function (ctx, x, y, w, h, t, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha == null ? 0.9 : alpha;
    ctx.fillStyle = '#191512';
    ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
    var mg = ctx.createLinearGradient(x, y, x + w, y + h);
    mg.addColorStop(0, '#20262b');
    mg.addColorStop(0.55, '#0d1114');
    mg.addColorStop(1, '#181d21');
    ctx.fillStyle = mg;
    ctx.fillRect(x, y, w, h);
    // 镜子里的人（背对，头略低）
    ctx.fillStyle = 'rgba(6,7,9,0.92)';
    var bx = x + w * 0.52, by = y + h * 0.30;
    ctx.beginPath();
    ctx.ellipse(bx, by, w * 0.11, h * 0.10, 0, 0, 6.284);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(bx - w * 0.20, y + h);
    ctx.quadraticCurveTo(bx - w * 0.17, by + h * 0.06, bx, by + h * 0.09);
    ctx.quadraticCurveTo(bx + w * 0.17, by + h * 0.06, bx + w * 0.20, y + h);
    ctx.closePath();
    ctx.fill();
    // 玻璃反光
    ctx.fillStyle = 'rgba(190,214,232,0.05)';
    ctx.beginPath();
    ctx.moveTo(x + 2, y + h - 2);
    ctx.lineTo(x + w * 0.62, y + 2);
    ctx.lineTo(x + w * 0.82, y + 2);
    ctx.lineTo(x + 2, y + h * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  // 墙里/玻璃后面贴着的一张脸，两只手按在旁边
  ART.wallFace = function (ctx, x, y, s, t, alpha) {
    s = s || 1;
    ctx.save();
    ctx.globalAlpha = alpha == null ? 0.7 : alpha;
    // 脸
    var fg = ctx.createRadialGradient(x, y + 3 * s, 1, x, y, 13 * s);
    fg.addColorStop(0, 'rgba(214,206,192,0.95)');
    fg.addColorStop(0.6, 'rgba(150,142,130,0.55)');
    fg.addColorStop(1, 'rgba(40,36,32,0)');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.ellipse(x, y, 9.5 * s, 12.5 * s, 0, 0, 6.284);
    ctx.fill();
    // 眼睛（黑的）
    ctx.fillStyle = 'rgba(3,3,5,0.95)';
    ctx.beginPath();
    ctx.ellipse(x - 3.4 * s, y - 2 * s, 1.5 * s, 2.1 * s, 0, 0, 6.284);
    ctx.ellipse(x + 3.4 * s, y - 2 * s, 1.5 * s, 2.1 * s, 0, 0, 6.284);
    ctx.fill();
    // 张开的嘴
    ctx.beginPath();
    ctx.ellipse(x, y + 5.6 * s, 2.2 * s, 3 * s + Math.sin((t || 0) * 2) * 0.6, 0, 0, 6.284);
    ctx.fill();
    // 两只按在墙上的手
    ART.handprint(ctx, x - 17 * s, y + 1 * s, 0.62 * s, 0.34);
    ART.handprint(ctx, x + 20 * s, y + 1 * s, 0.62 * s, 0.34);
    ctx.restore();
  };

  // 从缝里伸出来的手
  ART.handOut = function (ctx, x, y, s, ang, alpha) {
    s = s || 1;
    ctx.save();
    ctx.globalAlpha = alpha == null ? 0.8 : alpha;
    ctx.translate(x, y);
    ctx.rotate(ang || 0);
    ctx.fillStyle = 'rgba(18,16,15,0.95)';
    ctx.fillRect(0, -1.6 * s, 16 * s, 3.2 * s);
    ctx.beginPath();
    ctx.ellipse(18 * s, 0, 4.4 * s, 5.2 * s, 0, 0, 6.284);
    ctx.fill();
    for (var i = 0; i < 4; i++) {
      var fy = -3.4 * s + i * 2.1 * s;
      ctx.fillRect((20 + Math.abs(i - 1.5) * -0.6) * s, fy, (5.2 - Math.abs(i - 1.5)) * s, 1.1 * s);
    }
    ctx.restore();
  };

  // 眼睛/嘴巴的变体覆盖层（用来做同一张脸的不同形态）
  ART.faceVariant = function (ctx, t, kind) {
    var cx = W * 0.5, cy = H * 0.47, fw = 208, fh = 252;
    var i, ex;
    ctx.save();
    if (kind === 'sockets') {
      for (i = 0; i < 2; i++) {
        ex = i === 0 ? cx - fw * 0.24 : cx + fw * 0.24;
        ctx.fillStyle = '#050405';
        ctx.beginPath();
        ctx.ellipse(ex, cy - fh * 0.10, 9.6, 8.2, 0, 0, 6.284);
        ctx.fill();
        // 从眼窝里流下来
        ctx.fillStyle = 'rgba(74,10,10,0.8)';
        ctx.fillRect(ex - 1.4, cy - fh * 0.075, 2.2, 26 + Math.abs(Math.sin(t + i)) * 10);
        ctx.fillRect(ex + 2.4, cy - fh * 0.062, 1.2, 16 + Math.abs(Math.cos(t + i)) * 8);
      }
      // 额头的裂口张开了
      ctx.strokeStyle = 'rgba(120,16,14,0.85)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(cx - 14, cy - fh * 0.48);
      ctx.lineTo(cx - 3, cy - fh * 0.33);
      ctx.lineTo(cx + 4, cy - fh * 0.42);
      ctx.stroke();
    } else if (kind === 'wide') {
      // 嘴撑得更大
      ctx.beginPath();
      ctx.moveTo(cx - 30, cy + fh * 0.25);
      ctx.quadraticCurveTo(cx, cy + fh * 0.20, cx + 30, cy + fh * 0.25);
      ctx.quadraticCurveTo(cx + 6, cy + fh * 0.60, cx - 30, cy + fh * 0.25);
      ctx.closePath();
      ctx.fillStyle = '#030102';
      ctx.fill();
      ctx.fillStyle = 'rgba(198,190,170,0.66)';
      for (i = 0; i < 9; i++) {
        ctx.fillRect(cx - 26 + i * 6.1, cy + fh * 0.235, 3.6, 4.6 + (i % 3) * 1.8);
      }
      // 嘴角裂开的一道
      ctx.strokeStyle = 'rgba(96,14,12,0.8)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(cx + 29, cy + fh * 0.245);
      ctx.lineTo(cx + 45, cy + fh * 0.30);
      ctx.moveTo(cx - 29, cy + fh * 0.245);
      ctx.lineTo(cx - 45, cy + fh * 0.30);
      ctx.stroke();
    } else if (kind === 'tears') {
      for (i = 0; i < 2; i++) {
        ex = i === 0 ? cx - fw * 0.24 : cx + fw * 0.24;
        ctx.fillStyle = 'rgba(70,8,8,0.72)';
        ctx.fillRect(ex - 1, cy - fh * 0.08, 1.8, 30 + Math.abs(Math.sin(t * 1.4 + i)) * 14);
      }
    }
    ctx.restore();
  };

  // 墙上的牌子 / 门牌：回忆被改写的时候，字会变
  ART.sign = function (ctx, x, y, w, h, text, opts) {
    opts = opts || {};
    var al = opts.alpha == null ? 0.92 : opts.alpha;
    var bad = !!opts.bad;
    ctx.save();
    ctx.globalAlpha = al;
    ctx.fillStyle = opts.plate || '#161d20';
    rr(ctx, x, y, w, h, 2); ctx.fill();
    ctx.strokeStyle = bad ? 'rgba(150,60,54,0.55)' : 'rgba(150,172,182,0.34)';
    ctx.lineWidth = 1;
    rr(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 2); ctx.stroke();
    // 锈迹 / 污渍
    for (var i = 0; i < 5; i++) {
      var gx = x + 3 + (i * 17.3 % (w - 6));
      var gy = y + 2 + (i * 9.7 % (h - 4));
      ctx.fillStyle = 'rgba(0,0,0,' + (0.10 + (i % 3) * 0.05) + ')';
      ctx.fillRect(gx, gy, 3 + (i % 4), 1 + (i % 2));
    }
    // 螺丝
    ctx.fillStyle = 'rgba(180,196,204,0.22)';
    ctx.fillRect(x + 2, y + 2, 1.4, 1.4);
    ctx.fillRect(x + w - 3.4, y + 2, 1.4, 1.4);
    ctx.font = 'bold ' + (opts.size || 8) + 'px "Microsoft YaHei", "PingFang SC", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = opts.color || (bad ? '#d8b2ac' : '#c6d2cc');
    if (bad) {
      ctx.shadowColor = 'rgba(150,20,16,0.6)';
      ctx.shadowBlur = 6;
    }
    ctx.fillText(text, x + w * 0.5, y + h * 0.5 + 0.5);
    ctx.restore();
  };

  // 地上爬的东西：手脚并用，从画面一侧横着过去
  ART.crawl = function (ctx, x, groundY, phase, opts) {
    opts = opts || {};
    var s = opts.scale == null ? 1 : opts.scale;
    var rim = opts.rim || 'rgba(210,70,56,0.26)';
    var sway = Math.sin(phase) * 2.4;
    var lift = Math.sin(phase * 2) * 1.2;
    ctx.save();
    ctx.translate(x, groundY);
    ctx.scale(s, s);
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath(); ctx.ellipse(-4, -1, 30, 4.4, 0, 0, 6.284); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#07090b';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-18, -16);
    ctx.quadraticCurveTo(-6, -23 + lift, 7, -19);
    ctx.stroke();
    ctx.lineWidth = 4.6;
    ctx.beginPath(); ctx.moveTo(7, -20); ctx.quadraticCurveTo(17, -13 + sway, 21, -1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(2, -21); ctx.quadraticCurveTo(11, -9 - sway, 15, -1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-17, -16); ctx.quadraticCurveTo(-28, -11, -30, -1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-14, -17); ctx.quadraticCurveTo(-21, -7, -17, -1); ctx.stroke();
    ctx.fillStyle = '#07090b';
    ctx.beginPath();
    ctx.ellipse(13, -14.5, 6.6, 5.6, 0.34, 0, 6.284);
    ctx.fill();
    ctx.strokeStyle = 'rgba(6,7,9,0.92)';
    ctx.lineWidth = 0.9;
    for (var i = 0; i < 9; i++) {
      var hx = 9 + i * 1.1;
      ctx.beginPath();
      ctx.moveTo(hx, -11.5);
      ctx.quadraticCurveTo(hx - 0.8, -5 + (i % 3), hx - 1.4, -1.4);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = rim;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-18, -16);
    ctx.quadraticCurveTo(-6, -23 + lift, 7, -19);
    ctx.stroke();
    ctx.beginPath(); ctx.ellipse(13, -14.5, 6.8, 5.8, 0.34, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    ctx.restore();
  };

  w.ART = ART;
})(window);
