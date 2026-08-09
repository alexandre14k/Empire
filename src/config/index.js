// small config index re-export
(function () {
  if (!window.Empire) window.Empire = {};
  Empire.config = Empire.config || {};

  // placeholder to expose configuration helpers if needed
  Empire.config.helpers = Empire.config.helpers || {};
})();
