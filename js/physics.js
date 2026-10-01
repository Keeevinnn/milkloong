MF.physics = (function () {
  "use strict";
  var R = MF.rules;
  var engine = null, mergeCb = null;
  var pending = [], marked = {}, removed = {}, impacts = [];

  function wallBodies() {
    var t = 60, o = { isStatic: true, restitution: 0.1, friction: 0.05 };
    return [
      Matter.Bodies.rectangle(R.WALL - t / 2, R.H / 2, t, R.H * 3, o),
      Matter.Bodies.rectangle(R.W - R.WALL + t / 2, R.H / 2, t, R.H * 3, o),
      Matter.Bodies.rectangle(R.W / 2, R.H - R.WALL + t / 2, R.W + 4 * t, t, o)
    ];
  }

  function init(cb) {
    mergeCb = cb;
    engine = Matter.Engine.create();
    engine.enableSleeping = false;
    Matter.Composite.add(engine.world, wallBodies());
    Matter.Events.on(engine, "collisionStart", function (e) {
      e.pairs.forEach(function (pair) {
        var a = pair.bodyA, b = pair.bodyB;
        var ra = a.circleRadius || 0, rb = b.circleRadius || 0;
        if (ra || rb) {
          var dvx = a.velocity.x - b.velocity.x, dvy = a.velocity.y - b.velocity.y;
          var rel = Math.sqrt(dvx * dvx + dvy * dvy);
          if (rel > 3.5) {
            var pc = ra ? a : b, ot = ra ? b : a, pr = ra || rb;
            var x, y;
            if (ot.circleRadius) {
              var t = pr / (pr + ot.circleRadius);
              x = pc.position.x + (ot.position.x - pc.position.x) * t;
              y = pc.position.y + (ot.position.y - pc.position.y) * t;
            } else {
              var dx = ot.position.x - pc.position.x, dy = ot.position.y - pc.position.y;
              var L = Math.sqrt(dx * dx + dy * dy) || 1;
              x = pc.position.x + dx / L * pr * 0.9;
              y = pc.position.y + dy / L * pr * 0.9;
            }
            impacts.push({
              ia: ra ? a.id : 0, ib: rb ? b.id : 0, x: x, y: y,
              s: Math.min(1, rel / 12),
              stage: Math.max((a.plugin && a.plugin.stage) || 0, (b.plugin && b.plugin.stage) || 0)
            });
          }
        }
        var sa = a.plugin && a.plugin.stage, sb = b.plugin && b.plugin.stage;
        if (!sa || !sb || sa !== sb || sa >= R.MAX_STAGE) return;
        if (marked[a.id] || marked[b.id] || removed[a.id] || removed[b.id]) return;
        marked[a.id] = marked[b.id] = true;
        pending.push({ a: a, b: b, stage: sa });
      });
    });
    Matter.Events.on(engine, "afterUpdate", flushMerges);
  }

  function alive(body) {
    return !removed[body.id] && !!Matter.Composite.get(engine.world, body.id, "body");
  }

  function flushMerges() {
    if (!pending.length) return;
    var list = pending; pending = [];
    list.forEach(function (m) {
      delete marked[m.a.id]; delete marked[m.b.id];
      if (!alive(m.a) || !alive(m.b)) return;
      var ns = m.stage + 1;
      var nr = R.STAGES[ns].r;
      var mid = R.clampPos(
        (m.a.position.x + m.b.position.x) / 2,
        (m.a.position.y + m.b.position.y) / 2, nr);
      removeBody(m.a); removeBody(m.b);
      var nb = spawn(ns, mid.x, mid.y, true);
      if (mergeCb) mergeCb(ns, mid.x, mid.y, nb.id);
    });
  }

  function removeBody(body) {
    removed[body.id] = true;
    Matter.Composite.remove(engine.world, body);
  }

  function spawn(stage, x, y, isDynamic) {
    var r = R.STAGES[stage].r;
    var body = Matter.Bodies.circle(x, y, r, {
      restitution: 0.15, friction: 0.05, frictionAir: 0.008,
      isStatic: !isDynamic
    });
    body.plugin = { stage: stage, bornAt: now() };
    Matter.Composite.add(engine.world, body);
    return body;
  }

  function dropVelocity(body) { Matter.Body.setVelocity(body, { x: 0, y: 8 }); }

  function pieces() {
    return Matter.Composite.allBodies(engine.world).filter(function (b) {
      return !b.isStatic && !removed[b.id];
    });
  }

  function step(dtMs) { Matter.Engine.update(engine, dtMs); }

  function reset() {
    pending = []; marked = {}; removed = {}; impacts = [];
    Matter.Composite.clear(engine.world, false);
    Matter.Composite.add(engine.world, wallBodies());
  }

  function now() { return performance.now(); }

  function takeImpacts() { var q = impacts; impacts = []; return q; }

  return {
    init: init, spawn: spawn, dropVelocity: dropVelocity,
    pieces: pieces, step: step, reset: reset, now: now,
    takeImpacts: takeImpacts
  };
})();
