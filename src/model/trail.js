const M = Empire.lib.math;

class TrailHelper {
  static pushTrail(trail, body) {
    trail.push({ x: body.x, y: body.y });
  }

  static closePolygon(trail, body) {
    return trail.concat([{ x: body.x, y: body.y }]);
  }
}

(function () {
  if (!window.Empire) window.Empire = {};
  Empire.model = Empire.model || {};
  Empire.model.trail = TrailHelper;
})();
