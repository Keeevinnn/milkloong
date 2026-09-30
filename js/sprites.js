MF.sprites = (function () {
  "use strict";
  var images = {}, failed = {};
  function load(onDone) {
    var left = MF.rules.MAX_STAGE;
    for (var n = 1; n <= MF.rules.MAX_STAGE; n++) {
      (function (n) {
        var img = new Image();
        img.onload = function () { if (--left === 0) onDone(); };
        img.onerror = function () { failed[n] = true; if (--left === 0) onDone(); };
        img.src = "assets/sprites/" + MF.rules.STAGES[n].sprite + ".png";
        images[n] = img;
      })(n);
    }
  }
  function get(n) { return failed[n] ? null : images[n]; }
  function isFailed(n) { return !!failed[n]; }
  return { load: load, get: get, isFailed: isFailed };
})();
