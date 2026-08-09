// view UI helpers (split from large view file)
(function () {
  if (!window.Empire) window.Empire = {};
  Empire.view = Empire.view || {};

  Empire.view.ui = {
    // placeholder for HUD, dialog, and ranking helpers
    formatPercent(p) { return `${p}%`; }
  };
})();
