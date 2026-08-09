// View rendering helpers (placeholder)
(function () {
  if (!window.Empire) window.Empire = {};
  Empire.view = Empire.view || {};
  Empire.view.renderers = Empire.view.renderers || {};

  Empire.view.renderers.clear = function (ctx, width, height) {
    ctx.clearRect(0, 0, width, height);
  };
})();
