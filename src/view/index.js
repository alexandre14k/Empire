// Re-export view as index to allow folder per-file organization.
(function () {
  if (!window.Empire) window.Empire = {};
  Empire.view = Empire.view || {};
})();
