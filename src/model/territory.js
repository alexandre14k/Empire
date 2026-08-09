const M = Empire.lib.math;

(function () {
  if (!window.Empire) window.Empire = {};
  Empire.model = Empire.model || {};

  Empire.model.territory = {
    key(x, y) {
      return `${x}:${y}`;
    },

    cellCenter(config, x, y) {
      const cell = config.board.cell;
      return { x: x * cell + cell / 2, y: y * cell + cell / 2 };
    }
  };
})();
