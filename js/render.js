MF.render = (function () {
  "use strict";
  var R = MF.rules;
  var ctx = null, dpr = 1;
  var pops = [], texts = [], confetti = [], dust = [];
  var fx = {}, shakeUntil = 0, shakeMag = 0;
  var DRAW_K = 1.08;   // 贴图略大于碰撞圆：接触时视觉贴合，消除空气墙感

  function init(canvas) {
    dpr = window.devicePixelRatio || 1;
    canvas.width = R.W * dpr;
    canvas.height = R.H * dpr;
    ctx = canvas.getContext("2d");
  }

  function addText(x, y, str) { texts.push({ x: x, y: y, str: str, t: 0 }); }
  function addMerge(x, y, r, stage, id) {
    pops.push({ x: x, y: y, r: r, t: 0 });
    if (id) fx[id] = { popAt: performance.now(), sqAt: null, sq: 0 };
    if (stage >= 6) { shakeUntil = performance.now() + 160; shakeMag = 2 + stage * 0.5; }
  }

  function addImpact(im) {
    var now = performance.now();
    [im.ia, im.ib].forEach(function (id) {
      if (!id) return;
      var f = fx[id] || (fx[id] = { popAt: null, sqAt: null, sq: 0 });
      if (f.sqAt === null || im.s > f.sq) { f.sqAt = now; f.sq = im.s; }
    });
    var n = 3 + Math.round(5 * im.s);
    for (var i = 0; i < n; i++) {
      var a = Math.random() * 6.2832, v = 1 + Math.random() * 2.5 * im.s;
      dust.push({
        x: im.x, y: im.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1,
        t: 0, life: 260 + Math.random() * 180, r: 1.5 + Math.random() * 2.5
      });
    }
  }

  function addConfetti() {
    for (var i = 0; i < 80; i++) {
      confetti.push({
        x: Math.random() * R.W, y: -20 - Math.random() * 200,
        vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 3,
        s: 4 + Math.random() * 6, rot: Math.random() * 6.28,
        vr: (Math.random() - 0.5) * 0.3,
        c: ["#ff6b81", "#ffd666", "#7bd389", "#6fa8ff", "#c58cff"][i % 5]
      });
    }
  }

  function pieceScale(id) {
    var f = fx[id];
    if (!f) return null;
    var now = performance.now(), sx = 1, sy = 1, live = false;
    if (f.popAt !== null && f.popAt !== undefined) {
      var k = (now - f.popAt) / 260;
      if (k >= 1) f.popAt = null;
      else { live = true; var p = 0.35 * (1 - k) * Math.cos(k * Math.PI * 3); sx *= 1 + p; sy *= 1 + p; }
    }
    if (f.sqAt !== null && f.sqAt !== undefined) {
      var q = (now - f.sqAt) / 180;
      if (q >= 1) { f.sqAt = null; f.sq = 0; }
      else { live = true; var d = 0.28 * f.sq * (1 - q); sx *= 1 + d; sy *= 1 - d; }
    }
    if (!live) delete fx[id];
    return live ? { x: sx, y: sy } : null;
  }

  function drawPiece(p) {
    var img = MF.sprites.get(p.stage);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle || 0);
    var sc = p.id ? pieceScale(p.id) : null;
    if (sc) ctx.scale(sc.x, sc.y);
    if (img) {
      ctx.drawImage(img, -p.r * DRAW_K, -p.r * DRAW_K, p.r * 2 * DRAW_K, p.r * 2 * DRAW_K);
    } else {
      ctx.fillStyle = "#ffd666";
      ctx.beginPath(); ctx.arc(0, 0, p.r, 0, 6.2832); ctx.fill();
      ctx.fillStyle = "#6b4f2a"; ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(String(p.stage), 0, 0);
    }
    ctx.restore();
  }

  function frame(view, dtMs) {
    var dt = dtMs / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var now = performance.now();
    if (now < shakeUntil) {
      var m = shakeMag * (shakeUntil - now) / 160;
      ctx.translate((Math.random() - 0.5) * 2 * m, (Math.random() - 0.5) * 2 * m);
    }
    var g = ctx.createLinearGradient(0, 0, 0, R.H);
    g.addColorStop(0, "#fff8e8"); g.addColorStop(1, "#ffe9c2");
    ctx.fillStyle = g; ctx.fillRect(-8, -8, R.W + 16, R.H + 16);

    // 容器描边
    ctx.strokeStyle = "rgba(107,79,42,.35)"; ctx.lineWidth = 3;
    ctx.strokeRect(R.WALL, R.WALL, R.W - R.WALL * 2, R.H - R.WALL * 2);

    // 警戒线
    ctx.save();
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = view.warning
      ? "rgba(230,60,60," + (0.55 + 0.45 * Math.sin(view.time / 90)) + ")"
      : "rgba(230,60,60,.35)";
    ctx.lineWidth = view.warning ? 4 : 2;
    ctx.beginPath();
    ctx.moveTo(R.WALL, R.DANGER_Y); ctx.lineTo(R.W - R.WALL, R.DANGER_Y);
    ctx.stroke();
    ctx.restore();

    // 瞄准辅助线 + 当前棋子
    if (view.aim) {
      ctx.save();
      ctx.setLineDash([4, 8]);
      ctx.strokeStyle = "rgba(107,79,42,.25)"; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(view.aim.x, R.AIM_Y + R.STAGES[view.aim.stage].r);
      ctx.lineTo(view.aim.x, R.H);
      ctx.stroke();
      ctx.restore();
      drawPiece({ x: view.aim.x, y: R.AIM_Y, r: R.STAGES[view.aim.stage].r, stage: view.aim.stage, angle: 0 });
    }

    view.pieces.forEach(drawPiece);

    // 合并 pop 双层光环（外金内白闪）
    pops = pops.filter(function (p) { return (p.t += dtMs) < 200; });
    pops.forEach(function (p) {
      var k = p.t / 200;
      ctx.strokeStyle = "rgba(255,214,102," + (1 - k) + ")";
      ctx.lineWidth = 4 * (1 - k) + 1;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.7 + k * 0.6), 0, 6.2832); ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255," + (0.9 * (1 - k)) + ")";
      ctx.lineWidth = 3 * (1 - k) + 1;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.3 + k * 0.5), 0, 6.2832); ctx.stroke();
    });

    // 撞击 dust
    dust = dust.filter(function (d) { return (d.t += dtMs) < d.life; });
    dust.forEach(function (d) {
      d.x += d.vx; d.y += d.vy; d.vy += 0.12;
      var k = d.t / d.life;
      ctx.fillStyle = "rgba(255,244,214," + (0.8 * (1 - k)).toFixed(3) + ")";
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r * (1 - k * 0.5), 0, 6.2832); ctx.fill();
    });

    // 飘分
    texts = texts.filter(function (t) { return (t.t += dtMs) < 800; });
    texts.forEach(function (t) {
      var k = t.t / 800;
      ctx.fillStyle = "rgba(107,79,42," + (1 - k) + ")";
      ctx.font = "bold 18px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(t.str, t.x, t.y - 30 * k);
    });

    // confetti
    confetti = confetti.filter(function (c) { return c.y < R.H + 30; });
    confetti.forEach(function (c) {
      c.x += c.vx; c.y += c.vy; c.rot += c.vr;
      ctx.save();
      ctx.translate(c.x, c.y); ctx.rotate(c.rot);
      ctx.fillStyle = c.c; ctx.fillRect(-c.s / 2, -c.s / 2, c.s, c.s * 0.6);
      ctx.restore();
    });

    // 清掉已消失棋子的 fx
    var alive = {};
    view.pieces.forEach(function (p) { alive[p.id] = 1; });
    Object.keys(fx).forEach(function (k) { if (!alive[k]) delete fx[k]; });
  }

  return {
    init: init, frame: frame, addText: addText, addConfetti: addConfetti,
    addMerge: addMerge, addImpact: addImpact
  };
})();
