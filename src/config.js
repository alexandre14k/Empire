const Lib = {
  math: {
    hypot: Math.hypot,
    atan2: Math.atan2,
    random: Math.random,
    cos: Math.cos,
    sin: Math.sin,
    sqrt: Math.sqrt,
    floor: Math.floor,
    ceil: Math.ceil,
    round: Math.round,
    max: Math.max,
    min: Math.min,
    PI: Math.PI
  }
};

const Empire = {
  lib: Lib,
  config: {},
  model: {},
  view: {},
  controller: {}
};

Empire.config.CONFIG = {
  board: {
    width: 1024,
    height: 768,
    radius: 360,
    cell: 4
  },
  player: {
    radius: 5,
    claimRadius: 9,
    startRadius: 30,
    speed: 1.5
  },
  bot: {
    count: 1,
    radius: 5,
    claimRadius: 9,
    speed: 1.5,
    startRadius: 30,
    turnChance: 0.035,
    colors: [
      "red",
      "black",
      "brown"
    ],
    names: [
      "alpha",
      "beta",
      "gamma",
      "phi"
    ]
  },
  colors: [
    "blue",
    "lime",
  ],
  timing: {
    stepMs: 10
  }
};

Empire.config.DIRECTIONS = {
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 }
};

window.Empire = Empire;