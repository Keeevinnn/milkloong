window.MF = window.MF || {};
MF.rules = (function () {
  "use strict";
  var W = 420, H = 700, AIM_Y = 60, DANGER_Y = 110, WALL = 4;
  var MAX_STAGE = 7, ULTIMATE_BONUS = 100;
  var STAGES = [
    null,
    { name: "比耶",       r: 24, score: 0,  sprite: "s1" },
    { name: "比心(站)",   r: 32, score: 1,  sprite: "s2" },
    { name: "抱头震惊",   r: 41, score: 3,  sprite: "s3" },
    { name: "捧腹(蹲)",   r: 51, score: 6,  sprite: "s4" },
    { name: "蛋形捧腹笑", r: 63, score: 10, sprite: "s5" },
    { name: "比心(盘腿)", r: 76, score: 15, sprite: "s6" },
    { name: "终极大奶蛙", r: 92, score: 21, sprite: "s7" }
  ];
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function clampX(x, r) { return clamp(x, r + WALL, W - r - WALL); }
  function clampPos(x, y, r) {
    return { x: clampX(x, r), y: clamp(y, r + WALL, H - r - WALL) };
  }
  function scoreFor(n) { return STAGES[n].score; }
  function randSpawnStage(rand) { return rand() < 0.6 ? 1 : 2; }
  return {
    W: W, H: H, AIM_Y: AIM_Y, DANGER_Y: DANGER_Y, WALL: WALL,
    STAGES: STAGES, MAX_STAGE: MAX_STAGE, ULTIMATE_BONUS: ULTIMATE_BONUS,
    clamp: clamp, clampX: clampX, clampPos: clampPos,
    scoreFor: scoreFor, randSpawnStage: randSpawnStage
  };
})();
