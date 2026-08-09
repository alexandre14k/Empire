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

  /* ... unchanged methods above ... */

  step(scale = 1) {
    if (this.state !== "playing") {
      return;
    }

    this.steerPlayer();
    this.moveBody(this.player, this.config.player.speed, {}, scale);

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
    // scale movement so speed can be treated as "per-step" and we support
    // framerate-independent updates by multiplying with scale.
    body.x += M.cos(body.angle) * speed * scale;
    body.y += M.sin(body.angle) * speed * scale;

    if (this.distanceFromCenter(body) <= this.config.board.radius) {
      return;
    }

    this.clampToBoundary(body);

    if (options.bounce) {
      this.bounceOffBoundary(body);
    }
  }

  /* existing claim/territory functions remain unchanged, but we add
     encirclement handling when a trail is closed */

  closeTrail(owner, body, trail) {
    const polygon = trail.concat([{ x: body.x, y: body.y }]);

    this.claimTrailLine(owner, polygon);
    this.claimClosedSpace(owner, polygon);

    // after territory is claimed, detect if any players/bots are now
    // enclosed by this polygon and defeat them
    try {
      this.handleEncirclement(owner, polygon);
    } catch (err) {
      // safety: do not break the game if encirclement handling fails
      console.error("encirclement error", err);
    }
  }

  /* point-in-polygon using ray-casting */
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
    // check bots
    for (const bot of [...this.bots]) {
      if (owner === bot.id) continue; // owner cannot encircle itself

      if (this.pointInPolygon(bot, polygon)) {
        // if owner is player, the bot was defeated by player
        if (owner === "player") {
          this.defeatBot(bot, { byPlayer: true, attackerName: this.playerName });
        } else {
          // encircled by a bot
          this.defeatBot(bot, { byPlayer: false, attackerName: this.ownerName(owner) });
        }
      }
    }

    // check player
    if (owner !== "player" && this.pointInPolygon(this.player, polygon)) {
      // find attacker bot object if possible
      const attacker = this.bots.find((b) => b.id === owner) || { name: this.ownerName(owner) };
      this.defeatPlayer(attacker);
    }
  }

  /* rest of file remains the same (utility functions etc.) */
}

Empire.model.GameModel = GameModel;
