const M = Empire.lib.math;

class GameModel {
  constructor(config = Empire.config.CONFIG) {
    this.config = config;
    this.cx = config.board.width / 2;
    this.cy = config.board.height / 2;
    this.cols = M.ceil(config.board.width / config.board.cell);
    this.rows = M.ceil(config.board.height / config.board.cell);
    this.totalCells = this.countArenaCells();
    this.reset();
  }

  resizeBoard(width, height) {
    const cell = this.config.board.cell;

    this.config.board.width = width;
    this.config.board.height = height;
    this.config.board.radius = M.max(80, M.min(width, height) / 2 - 24);
    this.cx = width / 2;
    this.cy = height / 2;
    this.cols = M.ceil(width / cell);
    this.rows = M.ceil(height / cell);
    this.totalCells = this.countArenaCells();
  }

  reset() {
    this.playerName = "";
    this.playerColor = "";
    this.state = "idle";
    this.winner = "";
    this.target = null;
    this.lostCells = 0;
    this.conquered = 0;
    this.botIndex = 0;
    this.status = "";
    this.territoryVersion = 0;
    this.statsVersion = -1;
    this.statsCache = [];
    this.territory = new Map();
    this.dirty = new Map();
    this.playerTrail = [];
    this.player = this.makeBody(this.cx, this.cy, 0);
    this.bots = [];
  }

  start(name) {
    this.playerName = this.cleanName(name);
    this.playerColor = this.randomColor();
    this.state = "playing";
    this.winner = "";
    this.target = null;
    this.lostCells = 0;
    this.conquered = 0;
    this.botIndex = 0;
    this.status = "";
    this.territoryVersion = 0;
    this.statsVersion = -1;
    this.statsCache = [];
    this.territory = new Map();
    this.dirty = new Map();
    this.playerTrail = [];
    this.player = this.spawnPlayer();
    this.bots = [];
    this.claimDisk(this.player, "player", this.config.player.startRadius);

    for (let i = 0; i < this.config.bot.count; i += 1) {
      this.addBot();
    }
  }

  restart() {
    if (!this.playerName) {
      this.reset();
      return;
    }

    this.start(this.playerName);
  }

  setDirection(direction) {
    if (this.state !== "playing") {
      return;
    }

    const vector = Empire.config.DIRECTIONS[direction];

    if (!vector) {
      return;
    }

    this.target = null;
    this.player.angle = M.atan2(vector.y, vector.x);
  }

  setTarget(x, y) {
    if (this.state !== "playing") {
      return;
    }

    this.target = { x, y };
  }

  step() {
    if (this.state !== "playing") {
      return;
    }

    this.steerPlayer();
    this.moveBody(this.player, this.config.player.speed);

    const beatenByPlayer = this.bots.find((bot) => {
      return this.hitsTrail(this.player, bot.trail);
    });

    if (beatenByPlayer) {
      this.defeatBot(beatenByPlayer, {
        byPlayer: true,
        attackerName: this.playerName
      });
      return;
    }

    for (const bot of this.bots) {
      this.steerBot(bot);
      this.moveBody(bot, this.config.bot.speed, { bounce: true });

      if (this.hitsTrail(bot, this.playerTrail)) {
        this.defeatPlayer(bot);
        return;
      }

      const victim = this.findBotVictim(bot);

      if (victim) {
        this.defeatBot(victim, { byPlayer: false, attackerName: bot.name });
        return;
      }

      this.updateTrail(bot.id, bot, bot.trail);
    }

    this.updateTrail("player", this.player, this.playerTrail);
    this.checkWin();
  }

  findBotVictim(attacker) {
    return this.bots.find((other) => {
      return other.id !== attacker.id &&
        this.hitsTrail(attacker, other.trail);
    });
  }

  steerPlayer() {
    if (!this.target) {
      return;
    }

    const dx = this.target.x - this.player.x;
    const dy = this.target.y - this.player.y;

    if (M.hypot(dx, dy) > 5) {
      this.player.angle = M.atan2(dy, dx);
    }
  }

  steerBot(bot) {
    const edge = this.distanceFromCenter(bot);
    const nearEdge = edge > this.config.board.radius - 56;
    const duel = this.duelTarget(bot);

    if (duel) {
      bot.angle = M.atan2(duel.y - bot.y, duel.x - bot.x);
      return;
    }

    if (bot.trail.length > 36) {
      const home = this.homeTarget(bot);

      if (home) {
        bot.angle = M.atan2(home.y - bot.y, home.x - bot.x);
        return;
      }
    }

    if (nearEdge || M.random() < this.config.bot.turnChance) {
      const home = M.atan2(this.cy - bot.y, this.cx - bot.x);
      const drift = (M.random() - 0.5) * 1.6;
      const expand = M.atan2(bot.y - this.cy, bot.x - this.cx);
      bot.angle = nearEdge ? home + drift : expand + drift;
    }
  }

  duelTarget(bot) {
    if (this.distanceToPoint(bot, this.player) > 220) {
      return null;
    }

    return this.isBotExposed(bot) ?
      this.evadePoint(bot) :
      this.envelopPoint(bot);
  }

  isBotExposed(bot) {
    return bot.trail.length > 14;
  }

  envelopPoint(bot) {
    const home = this.homeTarget(bot) || { x: this.cx, y: this.cy };
    const side = this.flankSide(home);
    const lead = 46;
    const aheadX = this.player.x + M.cos(this.player.angle) * lead;
    const aheadY = this.player.y + M.sin(this.player.angle) * lead;
    const perpX = -M.sin(this.player.angle);
    const perpY = M.cos(this.player.angle);
    const spread = 40;

    return {
      x: aheadX + perpX * spread * side,
      y: aheadY + perpY * spread * side
    };
  }

  flankSide(home) {
    const toHomeX = home.x - this.player.x;
    const toHomeY = home.y - this.player.y;
    const perpX = -M.sin(this.player.angle);
    const perpY = M.cos(this.player.angle);

    return (toHomeX * perpX + toHomeY * perpY) >= 0 ? 1 : -1;
  }

  evadePoint(bot) {
    const home = this.homeTarget(bot) || { x: this.cx, y: this.cy };
    const awayX = bot.x + (bot.x - this.player.x);
    const awayY = bot.y + (bot.y - this.player.y);

    return {
      x: (awayX + home.x) / 2,
      y: (awayY + home.y) / 2
    };
  }

  homeTarget(bot) {
    const mine = this.ownerStats().find((item) => item.owner === bot.id);

    return mine ? { x: mine.x, y: mine.y } : null;
  }

  moveBody(body, speed, options = {}) {
    body.x += M.cos(body.angle) * speed;
    body.y += M.sin(body.angle) * speed;

    if (this.distanceFromCenter(body) <= this.config.board.radius) {
      return;
    }

    this.clampToBoundary(body);

    if (options.bounce) {
      this.bounceOffBoundary(body);
    }
  }

  clampToBoundary(body) {
    const angle = M.atan2(body.y - this.cy, body.x - this.cx);

    body.x = this.cx + M.cos(angle) * this.config.board.radius;
    body.y = this.cy + M.sin(angle) * this.config.board.radius;
  }

  bounceOffBoundary(body) {
    const angle = M.atan2(body.y - this.cy, body.x - this.cx);

    body.angle = angle + M.PI + (M.random() - 0.5) * 0.8;
  }

  updateTrail(owner, body, trail) {
    if (this.ownerAt(body) === owner) {
      if (trail.length > 2) {
        this.closeTrail(owner, body, trail);
      }

      trail.length = 0;
      return;
    }

    this.pushTrail(trail, body);
  }

  closeTrail(owner, body, trail) {
    const polygon = trail.concat([{ x: body.x, y: body.y }]);

    this.claimTrailLine(owner, polygon);
    this.claimClosedSpace(owner, polygon);
  }

  claimTrailLine(owner, trail) {
    const radius = owner === "player" ?
      this.config.player.claimRadius :
      this.config.bot.claimRadius;

    trail.forEach((point) => {
      this.claimDisk(point, owner, radius);
    });
  }

  claimClosedSpace(owner, trail) {
    const bounds = this.trailBounds(trail);
    const open = new Set();
    const queue = [];

    this.seedBounds(bounds, owner, open, queue);
    this.seedBoundary(bounds, owner, open, queue);
    this.floodOpen(bounds, owner, open, queue);
    this.fillClosed(bounds, owner, open);
  }

  trailBounds(trail) {
    const cell = this.config.board.cell;
    const margin = 6;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    trail.forEach((point) => {
      const x = M.floor(point.x / cell);
      const y = M.floor(point.y / cell);

      minX = M.min(minX, x);
      maxX = M.max(maxX, x);
      minY = M.min(minY, y);
      maxY = M.max(maxY, y);
    });

    return {
      minX: M.max(0, minX - margin),
      maxX: M.min(this.cols - 1, maxX + margin),
      minY: M.max(0, minY - margin),
      maxY: M.min(this.rows - 1, maxY + margin)
    };
  }

  seedBounds(bounds, owner, open, queue) {
    for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
      this.pushOpen(bounds.minX, y, owner, open, queue);
      this.pushOpen(bounds.maxX, y, owner, open, queue);
    }

    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      this.pushOpen(x, bounds.minY, owner, open, queue);
      this.pushOpen(x, bounds.maxY, owner, open, queue);
    }
  }

  seedBoundary(bounds, owner, open, queue) {
    for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
      for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
        if (this.isBoundaryCell(x, y)) {
          this.pushOpen(x, y, owner, open, queue);
        }
      }
    }
  }

  floodOpen(bounds, owner, open, queue) {
    for (let index = 0; index < queue.length; index += 1) {
      const [x, y] = queue[index].split(":").map(Number);

      Object.values(Empire.config.DIRECTIONS).forEach((vector) => {
        const nx = x + vector.x;
        const ny = y + vector.y;

        if (nx < bounds.minX || nx > bounds.maxX ||
            ny < bounds.minY || ny > bounds.maxY) {
          return;
        }

        this.pushOpen(nx, ny, owner, open, queue);
      });
    }
  }

  fillClosed(bounds, owner, open) {
    for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
      for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
        const key = this.key(x, y);

        if (this.isCellInArena(x, y) && !open.has(key)) {
          this.setOwner(key, owner);
        }
      }
    }
  }

  pushOpen(x, y, owner, open, queue) {
    const key = this.key(x, y);

    if (!this.isCellInArena(x, y) || open.has(key)) {
      return;
    }

    if (this.territory.get(key) === owner) {
      return;
    }

    open.add(key);
    queue.push(key);
  }

  claimDisk(body, owner, radius) {
    const cell = this.config.board.cell;
    const minX = M.floor((body.x - radius) / cell);
    const maxX = M.floor((body.x + radius) / cell);
    const minY = M.floor((body.y - radius) / cell);
    const maxY = M.floor((body.y + radius) / cell);

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        this.claimCell(x, y, body, owner, radius);
      }
    }
  }

  claimCell(x, y, body, owner, radius) {
    if (!this.isCellInArena(x, y)) {
      return;
    }

    const center = this.cellCenter(x, y);

    if (this.distanceSq(center, body) > radius * radius) {
      return;
    }

    this.setOwner(this.key(x, y), owner);
  }

  setOwner(key, owner) {
    const lastOwner = this.territory.get(key);

    if (this.isBotOwner(owner) && lastOwner === "player") {
      this.lostCells += 1;
    }

    this.territory.set(key, owner);
    this.dirty.set(key, owner);
    this.territoryVersion += 1;
  }

  defeatBot(bot, options = {}) {
    const byPlayer = options.byPlayer === true;
    const attackerName = options.attackerName || "";

    if (byPlayer) {
      this.conquered += 1;
    }

    this.status = attackerName ?
      `${attackerName} defeated ${bot.name}` :
      `${bot.name} is defeated`;
    this.destroyOwner(bot.id);
    this.bots = this.bots.filter((item) => item.id !== bot.id);

    if (byPlayer) {
      this.checkWin();
    }

    if (this.state === "won") {
      return;
    }

    this.addBot();
  }

  defeatPlayer(bot) {
    this.state = "lost";
    this.winner = bot.name;
    this.status = `${this.playerName} is defeated`;
    this.playerName = "";
    this.target = null;
  }

  addBot() {
    const bot = this.spawnBot();

    if (!bot) {
      return;
    }

    this.bots.push(bot);
    this.claimDisk(bot, bot.id, this.config.bot.startRadius);
  }

  destroyOwner(owner) {
    const remove = [];

    this.territory.forEach((value, key) => {
      if (value === owner) {
        remove.push(key);
      }
    });

    remove.forEach((key) => {
      this.territory.delete(key);
      this.dirty.set(key, null);
      this.territoryVersion += 1;
    });
  }

  spawnPlayer() {
    const angle = M.random() * M.PI * 2;

    return this.makeBody(this.cx, this.cy, angle);
  }

  spawnBot() {
    const radius = this.config.bot.startRadius;

    for (let i = 0; i < 120; i += 1) {
      const body = this.randomArenaBody();
      const away = M.hypot(body.x - this.player.x, body.y - this.player.y);

      if (away > 160 && this.diskIsEmpty(body, radius)) {
        return this.makeBot(body);
      }
    }

    return null;
  }

  makeBot(body) {
    const colors = this.config.bot.colors;
    const names = this.config.bot.names;
    const index = this.botIndex;

    this.botIndex += 1;

    return {
      ...body,
      id: `bot-${index}`,
      name: names[index % names.length],
      color: colors[index % colors.length],
      trail: []
    };
  }

  randomArenaBody() {
    const moveAngle = M.random() * M.PI * 2;
    const spawnAngle = M.random() * M.PI * 2;
    const max = this.config.board.radius - this.config.bot.startRadius;
    const distance = max * M.sqrt(M.random());
    const x = this.cx + M.cos(spawnAngle) * distance;
    const y = this.cy + M.sin(spawnAngle) * distance;

    return this.makeBody(x, y, moveAngle);
  }

  diskIsEmpty(body, radius) {
    const cell = this.config.board.cell;
    const minX = M.floor((body.x - radius) / cell);
    const maxX = M.floor((body.x + radius) / cell);
    const minY = M.floor((body.y - radius) / cell);
    const maxY = M.floor((body.y + radius) / cell);

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        if (!this.emptySpawnCell(x, y, body, radius)) {
          return false;
        }
      }
    }

    return true;
  }

  emptySpawnCell(x, y, body, radius) {
    if (!this.isCellInArena(x, y)) {
      return false;
    }

    const center = this.cellCenter(x, y);
    const inside = this.distanceSq(center, body) <= radius * radius;

    if (!inside) {
      return true;
    }

    return !this.territory.has(this.key(x, y));
  }

  makeBody(x, y, angle) {
    return { x, y, angle };
  }

  pushTrail(trail, body) {
    trail.push({ x: body.x, y: body.y });
  }

  hitsTrail(body, trail) {
    const threshold = this.config.player.radius + 4;
    const thresholdSq = threshold * threshold;

    return trail.some((point, index) => {
      if (index % 2 !== 0) {
        return false;
      }

      return this.distanceSq(point, body) <= thresholdSq;
    });
  }

  distanceSq(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;

    return dx * dx + dy * dy;
  }

  ownerAt(point) {
    const cell = this.cellAt(point);

    return this.territory.get(this.key(cell.x, cell.y));
  }

  cellAt(point) {
    const cell = this.config.board.cell;

    return {
      x: M.floor(point.x / cell),
      y: M.floor(point.y / cell)
    };
  }

  areaPercent() {
    return M.round((this.playerCells() / this.totalCells) * 100);
  }

  lostPercent() {
    return M.round((this.lostCells / this.totalCells) * 100);
  }

  playerCells() {
    let count = 0;

    this.territory.forEach((owner) => {
      if (owner === "player") {
        count += 1;
      }
    });

    return count;
  }

  countArenaCells() {
    let count = 0;

    for (let y = 0; y < this.rows; y += 1) {
      for (let x = 0; x < this.cols; x += 1) {
        if (this.isCellInArena(x, y)) {
          count += 1;
        }
      }
    }

    return count;
  }

  isCellInArena(x, y) {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) {
      return false;
    }

    return this.distanceFromCenter(this.cellCenter(x, y)) <=
      this.config.board.radius;
  }

  isBoundaryCell(x, y) {
    if (!this.isCellInArena(x, y)) {
      return false;
    }

    return Object.values(Empire.config.DIRECTIONS).some((vector) => {
      return !this.isCellInArena(x + vector.x, y + vector.y);
    });
  }

  distanceFromCenter(point) {
    return M.hypot(point.x - this.cx, point.y - this.cy);
  }

  cellCenter(x, y) {
    const cell = this.config.board.cell;

    return {
      x: x * cell + cell / 2,
      y: y * cell + cell / 2
    };
  }

  ownerColor(owner) {
    if (owner === "player") {
      return this.playerColor;
    }

    const bot = this.bots.find((item) => item.id === owner);

    return bot ? bot.color : "#d7dce5";
  }

  ownerName(owner) {
    if (owner === "player") {
      return this.playerName || "user";
    }

    const bot = this.bots.find((item) => item.id === owner);

    return bot ? bot.name : owner;
  }

  consumeDirty() {
    const entries = this.dirty;

    this.dirty = new Map();
    return entries;
  }

  ownerStats() {
    if (this.statsVersion === this.territoryVersion) {
      return this.statsCache;
    }

    const stats = new Map();

    this.territory.forEach((owner, key) => {
      const [x, y] = key.split(":").map(Number);
      const point = this.cellCenter(x, y);
      const current = stats.get(owner) || {
        owner,
        cells: 0,
        x: 0,
        y: 0
      };

      current.cells += 1;
      current.x += point.x;
      current.y += point.y;
      stats.set(owner, current);
    });

    this.statsCache = Array.from(stats.values()).map((item) => {
      return {
        owner: item.owner,
        name: this.ownerName(item.owner),
        color: this.ownerColor(item.owner),
        percent: M.round((item.cells / this.totalCells) * 100),
        x: item.x / item.cells,
        y: item.y / item.cells
      };
    }).sort((a, b) => b.percent - a.percent);
    this.statsVersion = this.territoryVersion;

    return this.statsCache;
  }

  distanceToPoint(a, b) {
    return M.hypot(a.x - b.x, a.y - b.y);
  }

  isBotOwner(owner) {
    return typeof owner === "string" && owner.indexOf("bot-") === 0;
  }

  checkWin() {
    if (this.areaPercent() >= 95) {
      this.state = "won";
      this.winner = this.playerName;
      this.status = `${this.playerName} wins`;
    }
  }

  key(x, y) {
    return `${x}:${y}`;
  }

  cleanName(name) {
    const clean = String(name || "").trim();

    return clean || "user";
  }

  randomColor() {
    const { colors } = this.config;
    const index = M.floor(M.random() * colors.length);

    return colors[index];
  }
}

Empire.model.GameModel = GameModel;