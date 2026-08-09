// Geometry helper for model (placeholder)
// This folder contains helpers split out from src/model.js.

(function () {
  if (!window.Empire) window.Empire = {};
  if (!Empire.model) Empire.model = {};
  Empire.model.geometry = Empire.model.geometry || {};

  Empire.model.geometry.pointInPolygon = function (point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      const intersect = ((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi + 0.0000001) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };
})();
