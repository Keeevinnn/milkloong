(function () {
  "use strict";
  var R = MF.rules;

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  var S = {
    mode: "boot", score: 0,
    best: Number(lsGet("milkfrog-best")) || 0,
    aim: null, next: 0, cooldownUntil: 0,
    overTimer: 0, wonShown: false, last: 0
  };
  var el = {};

  function $(id) { return document.getElementById(id); }

  function bindDom() {
    el.score = $("score"); el.best = $("best"); el.nextImg = $("next-img");
    el.win = $("overlay-win"); el.over = $("overlay-over");
    el.finalWin = el.win.querySelector(".final-score");
    el.finalOver = el.over.querySelector(".final-score");
    el.finalBest = el.over.querySelector(".final-best");
    $("btn-restart").addEventListener("click", restart);
    $("btn-win-restart").addEventListener("click", restart);
    $("btn-over-restart").addEventListener("click", restart);
    $("btn-continue").addEventListener("click", function () {
      S.mode = "playing"; S.overTimer = 0; el.win.classList.add("hidden");
    });
    el.best.textContent = S.best;
  }

  function newAim(keepX) {
    var x = S.aim && keepX ? S.aim.x : R.W / 2;
    S.aim = { stage: S.next || R.randSpawnStage(Math.random), x: x };
    S.next = R.randSpawnStage(Math.random);
    el.nextImg.src = "assets/sprites/" + R.STAGES[S.next].sprite + ".png";
  }

  function addScore(n) {
    S.score += n;
    el.score.textContent = S.score;
    if (S.score > S.best) {
      S.best = S.score;
      el.best.textContent = S.best;
      lsSet("milkfrog-best", String(S.best));
    }
  }

  function onMerge(ns, x, y) {
    addScore(R.scoreFor(ns));
    MF.render.addPop(x, y, R.STAGES[ns].r);
    MF.render.addText(x, y - R.STAGES[ns].r, "+" + R.scoreFor(ns));
    if (ns === R.MAX_STAGE && !S.wonShown) {
      S.wonShown = true;
      addScore(R.ULTIMATE_BONUS);
      MF.render.addConfetti();
      S.mode = "won";
      el.finalWin.textContent = S.score;
      el.win.classList.remove("hidden");
    }
  }

  function drop() {
    if (S.mode !== "playing" || !S.aim) return;
    if (performance.now() < S.cooldownUntil) return;
    var stage = S.aim.stage, r = R.STAGES[stage].r;
    var x = R.clampX(S.aim.x, r);
    var body = MF.physics.spawn(stage, x, R.AIM_Y, true);
    MF.physics.dropVelocity(body);
    S.cooldownUntil = performance.now() + 400;
    newAim(true);
  }

  function checkFail(dtMs) {
    var now = performance.now();
    var over = MF.physics.pieces().some(function (b) {
      return now - b.plugin.bornAt > 1200 && b.position.y - b.circleRadius < R.DANGER_Y;
    });
    S.overTimer = over ? S.overTimer + dtMs : 0;
    if (S.overTimer > 1500 && S.mode === "playing") {
      S.mode = "over";
      el.finalOver.textContent = S.score;
      el.finalBest.textContent = S.best;
      el.over.classList.remove("hidden");
    }
    return over;
  }

  function restart() {
    MF.physics.reset();
    S.score = 0; S.overTimer = 0; S.wonShown = false; S.cooldownUntil = 0;
    el.score.textContent = 0;
    el.win.classList.add("hidden"); el.over.classList.add("hidden");
    S.next = 0; S.aim = null;
    newAim(false);
    S.mode = "playing";
  }

  function loop(ts) {
    requestAnimationFrame(loop);
    var dt = Math.min(ts - (S.last || ts), 50);
    S.last = ts;
    if (S.mode === "playing") {
      MF.physics.step(1000 / 60);
    }
    var warning = S.mode === "playing" && checkFail(dt);
    MF.render.frame({
      pieces: MF.physics.pieces().map(function (b) {
        return { x: b.position.x, y: b.position.y, r: b.circleRadius, angle: b.angle, stage: b.plugin.stage };
      }),
      aim: S.mode === "playing" ? S.aim : null,
      warning: warning, time: ts
    }, dt);
  }

  function start() {
    bindDom();
    MF.render.init($("game"));
    MF.physics.init(onMerge);
    MF.input.attach($("game"), {
      aim: function (x) { if (S.aim) S.aim.x = R.clampX(x, R.STAGES[S.aim.stage].r); },
      drop: drop,
      key: function (d) { if (S.aim) S.aim.x = R.clampX(S.aim.x + d * 12, R.STAGES[S.aim.stage].r); }
    });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) S.mode = S.mode === "playing" ? "paused" : S.mode;
      else if (S.mode === "paused") S.mode = "playing";
    });
    newAim(false);
    S.mode = "playing";
    requestAnimationFrame(loop);
  }

  window.__milkfrog = {
    spawn: function (stage, x) {
      var r = R.STAGES[stage].r;
      var b = MF.physics.spawn(stage, R.clampX(x == null ? R.W / 2 : x, r), R.AIM_Y, true);
      MF.physics.dropVelocity(b);
      return b.id;
    },
    spawnAt: function (stage, x, y) {
      return MF.physics.spawn(stage, x, y, true).id;
    },
    tick: function (n) {
      for (var i = 0; i < (n || 1); i++) MF.physics.step(1000 / 60);
    },
    dropAt: function (x) { if (x != null && S.aim) S.aim.x = R.clampX(x, R.STAGES[S.aim.stage].r); drop(); },
    state: function () {
      return {
        mode: S.mode, score: S.score, best: S.best,
        pieces: MF.physics.pieces().length,
        stages: MF.physics.pieces().map(function (b) { return b.plugin.stage; }),
        aimStage: S.aim && S.aim.stage, nextStage: S.next
      };
    }
  };

  MF.sprites.load(start);
})();
