MF.input = (function () {
  "use strict";
  function attach(canvas, handlers) {
    function toGameX(clientX) {
      var rect = canvas.getBoundingClientRect();
      return (clientX - rect.left) / rect.width * MF.rules.W;
    }
    canvas.addEventListener("pointermove", function (e) { handlers.aim(toGameX(e.clientX)); });
    canvas.addEventListener("pointerdown", function (e) {
      e.preventDefault(); handlers.aim(toGameX(e.clientX));
    });
    canvas.addEventListener("pointerup", function (e) {
      e.preventDefault(); handlers.aim(toGameX(e.clientX)); handlers.drop();
    });
    window.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); handlers.key(-1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); handlers.key(1); }
      else if (e.key === " " || e.key === "ArrowDown") { e.preventDefault(); handlers.drop(); }
    });
  }
  return { attach: attach };
})();
