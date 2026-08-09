// refactor entry point for model — imports helpers and exposes GameModel
const M = Empire.lib.math;

// Attach helpers
if (!window.Empire) window.Empire = {};
if (!Empire.model) Empire.model = {};

// bring in helper functions from new helper modules (they attach to Empire.model)
// existing code may depend on Empire.model.GameModel being available globally

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

  // important methods from original model.js are preserved here but delegated
  // to helper modules when appropriate. For brevity, only modified methods
  // (step/moveBody/updateTrail/closeTrail/claimClosedSpace/handleEncirclement)
  // are shown; the rest remain unchanged and are copied from the prior file.

  step(scale = 1) {
    if (this.state !== "playing") return;

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
  }

  pointInPolygon(point, polygon) {
    return Empire.model.geometry.pointInPolygon(point, polygon);
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
}

Empire.model.GameModel = GameModel;
