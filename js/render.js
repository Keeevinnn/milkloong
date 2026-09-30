MF.render = (function () {
  "use strict";
  var R = MF.rules;
  var ctx = null, dpr = 1;
  var pops = [], texts = [], confetti = [];

  function init(canvas) {
    dpr = window.devicePixelRatio || 1;
    canvas.width = R.W * dpr;
    canvas.height = R.H * dpr;
    ctx = canvas.getContext("2d");
  }

  function addPop(x, y, r) { pops.push({ x: x, y: y, r: r, t: 0 }); }
  function addText(x, y, str) { texts.push({ x: x, y: y, str: str, t: 0 }); }
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

  function drawPiece(p) {
    var img = MF.sprites.get(p.stage);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle || 0);
    if (img) {
      ctx.drawImage(img, -p.r, -p.r, p.r * 2, p.r * 2);
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
    var g = ctx.createLinearGradient(0, 0, 0, R.H);
    g.addColorStop(0, "#fff8e8"); g.addColorStop(1, "#ffe9c2");
    ctx.fillStyle = g; ctx.fillRect(0, 0, R.W, R.H);

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

    // 合并 pop 光环
    pops = pops.filter(function (p) { return (p.t += dtMs) < 200; });
    pops.forEach(function (p) {
      var k = p.t / 200;
      ctx.strokeStyle = "rgba(255,214,102," + (1 - k) + ")";
      ctx.lineWidth = 4 * (1 - k) + 1;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.7 + k * 0.6), 0, 6.2832); ctx.stroke();
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
  }

  return { init: init, frame: frame, addPop: addPop, addText: addText, addConfetti: addConfetti };
})();
