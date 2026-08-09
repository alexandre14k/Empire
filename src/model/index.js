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

  step(scale = 1) {
    if (this.state !== "playing") return;

    const deltaSec = scale * this.config.timing.stepMs / 1000;

    this.steerPlayer();
    this.moveBody(this.player, this.config.player.speed, {}, scale);

    const beatenByPlayer = this.bots.find((bot) => this.hitsTrail(this.player, bot.trail));

    if (beatenByPlayer) {
      this.defeatBot(beatenByPlayer, { byPlayer: true, attackerName: this.playerName });
      return;
    }

    for (const bot of this.bots) {
      this.steerBot(bot);
      this.moveBody(bot, this.config.bot.speed, { bounce: true }, scale);

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

    this.updateBorderTimers(deltaSec);

    if (this.checkCoverageVictory()) return;

    this.checkWin();
  }

  moveBody(body, speed, options = {}, scale = 1) {
    body.x += M.cos(body.angle) * speed * scale;
    body.y += M.sin(body.angle) * speed * scale;

    if (this.distanceFromCenter(body) <= this.config.board.radius) return;

    this.clampToBoundary(body);
    if (options.bounce) this.bounceOffBoundary(body);
  }

  updateTrail(owner, body, trail) {
    if (this.ownerAt(body) === owner) {
      if (trail.length > 2) {
        this.closeTrail(owner, body, trail);
      }

      trail.length = 0;
      return;
    }

    Empire.model.trail.pushTrail(trail, body);
  }

  closeTrail(owner, body, trail) {
    const polygon = Empire.model.trail.closePolygon(trail, body);

    this.claimTrailLine(owner, polygon);
    this.claimClosedSpace(owner, polygon);

    try {
      this.handleEncirclement(owner, polygon);
    } catch (err) {
      console.error('encirclement error', err);
    }
  }

  claimClosedSpace(owner, trail) {
    const bounds = this.trailBounds(trail);
    const open = new Set();
    const queue = [];

    this.seedBounds(bounds, owner, open, queue);
    this.seedBoundary(bounds, owner, open, queue);
    this.floodOpen(bounds, owner, open, queue);
    this.fillClosed(bounds, owner, open);

    for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
      for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
        const key = this.key(x, y);
        if (this.isCellInArena(x, y) && !this.territory.has(key)) {
          this.setOwner(key, owner);
        }
      }
    }
  }

  pointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;

      const intersect = ((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi + 0.0000001) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  handleEncirclement(owner, polygon) {
    for (const bot of [...this.bots]) {
      if (owner === bot.id) continue;
      if (this.pointInPolygon(bot, polygon)) {
        if (owner === "player") {
          this.defeatBot(bot, { byPlayer: true, attackerName: this.playerName });
        } else {
          this.defeatBot(bot, { byPlayer: false, attackerName: this.ownerName(owner) });
        }
      }
    }

    if (owner !== "player" && this.pointInPolygon(this.player, polygon)) {
      const attacker = this.bots.find((b) => b.id === owner) || { name: this.ownerName(owner) };
      this.defeatPlayer(attacker);
    }
  }

  updateBorderTimers(deltaSec) {
    const threshold = this.config.board.radius - (this.config.border && this.config.border.margin || 0);

    const checkEntity = (entity, defeatFn) => {
      const dist = this.distanceFromCenter(entity);
      if (dist >= threshold) {
        if (!entity.borderActive) {
          entity.borderActive = true;
          entity.borderTimer = (this.config.border && this.config.border.timerSeconds) || 5;
        } else {
          entity.borderTimer -= deltaSec;
        }
        if (entity.borderTimer <= 0) {
          defeatFn(entity);
        }
      } else {
        entity.borderActive = false;
        entity.borderTimer = 0;
      }
    };

    checkEntity(this.player, (ent) => this.defeatPlayer({ name: this.ownerName('player') }));

    for (const bot of this.bots) {
      checkEntity(bot, (ent) => this.defeatBot(ent, { byPlayer: false, attackerName: this.ownerName(ent.id) }));
    }
  }

  checkCoverageVictory() {
    const stats = this.ownerStats();
    const threshold = (this.config.victory && this.config.victory.botWinPercent) || 90;
    for (const s of stats) {
      if (s.owner && s.type === 'bot' && s.percent >= threshold) {
        const bot = this.bots.find((b) => b.name === s.name) || { name: s.name };
        this.defeatPlayer(bot);
        return true;
      }
    }
    return false;
  }

  defeatPlayer(bot) {
    this.state = "lost";
    this.winner = bot.name;
    this.status = `${this.playerName} is defeated`;
    this.destroyOwner("player");
    this.playerTrail.length = 0;
    this.playerName = "";
    this.target = null;
  }
}

Empire.model.GameModel = GameModel;
