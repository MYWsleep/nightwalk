// util.js —— 小工具
(function (w) {
  var U = {};

  U.clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
  U.lerp = function (a, b, t) { return a + (b - a) * t; };
  U.smooth = function (t) { return t * t * (3 - 2 * t); };
  U.easeOut = function (t) { return 1 - (1 - t) * (1 - t); };
  U.easeIn = function (t) { return t * t; };

  // 确定性伪随机：同一个种子永远同一串数（场景生成用）
  U.rng = function (seed) {
    var s = (seed | 0) || 1;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  };

  // 值域映射
  U.map = function (v, a, b, c, d) {
    if (b === a) return c;
    return c + (d - c) * ((v - a) / (b - a));
  };

  // 等宽像素字（画在 canvas 上，只用于英文/数字）
  U.pixText = function (ctx, txt, x, y, size, color, align) {
    ctx.save();
    ctx.font = 'bold ' + size + 'px "Courier New", monospace';
    ctx.fillStyle = color || '#fff';
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(txt, x, y);
    ctx.restore();
  };

  // 判断一个区间进度 0..1
  U.span = function (v, a, b) {
    if (b <= a) return v >= b ? 1 : 0;
    return U.clamp((v - a) / (b - a), 0, 1);
  };

  w.U = U;
})(window);
