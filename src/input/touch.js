// Touch helper (not wired automatically) — provided for structure and future use
(function () {
  if (!window.Empire) window.Empire = {};
  Empire.input = Empire.input || {};

  Empire.input.touch = {
    // helper to normalize touch coordinates relative to an element
    getTouchPoint(evt, el) {
      const t = evt.touches && evt.touches[0];
      if (!t) return null;
      const rect = el.getBoundingClientRect();
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
  };
})();
