const M = Empire.lib.math;

class BotsHelper {
  static makeBot(body, index, config) {
    const colors = config.bot.colors;
    const names = config.bot.names;

    return {
      ...body,
      id: `bot-${index}`,
      name: names[index % names.length],
      color: colors[index % colors.length],
      trail: [],
      thinkTarget: null,
      lastThink: 0
    };
  }

  // Find a nearby opponent trail point the bot can try to strike (low-cost heuristic)
  static findNearestEnemyTrail(bot, model, maxDist = 140) {
    let best = null;
    let bestDist = Infinity;

    // check player trail
    model.playerTrail.forEach((p) => {
      const d = M.hypot(p.x - bot.x, p.y - bot.y);
      if (d < bestDist && d <= maxDist) {
        bestDist = d;
        best = { x: p.x, y: p.y, owner: 'player' };
      }
    });

    // check other bots' trails
    model.bots.forEach((other) => {
      if (other.id === bot.id) return;
      other.trail.forEach((p) => {
        const d = M.hypot(p.x - bot.x, p.y - bot.y);
        if (d < bestDist && d <= maxDist) {
          bestDist = d;
          best = { x: p.x, y: p.y, owner: other.id };
        }
      });
    });

    return best;
  }

  // Simple heuristic to estimate encirclement risk: near long trails and inside smaller radius
  static predictClosingRisk(bot, model) {
    const trailThreshold = 20;
    let risk = 0;

    // distance to player
    const distPlayer = M.hypot(bot.x - model.player.x, bot.y - model.player.y);
    if (model.playerTrail.length > trailThreshold && distPlayer < 160) risk += 1;

    // nearby bot trails
    model.bots.forEach((other) => {
      if (other.id === bot.id) return;
      if (other.trail.length > trailThreshold) {
        const dist = M.hypot(bot.x - other.x, bot.y - other.y);
        if (dist < 160) risk += 1;
      }
    });

    return risk; // higher => more risk
  }

  // Async think tick for bots — updates thinkTarget without blocking main loop
  static scheduleThinking(bots, model) {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => BotsHelper.think(bots, model), { timeout: 60 });
    } else {
      setTimeout(() => BotsHelper.think(bots, model), 20);
    }
  }

  static think(bots, model) {
    const now = Date.now();

    bots.forEach((bot) => {
      // throttle thinking per-bot
      if (now - (bot.lastThink || 0) < 80) return;
      bot.lastThink = now;

      const risk = BotsHelper.predictClosingRisk(bot, model);
      const candidate = BotsHelper.findNearestEnemyTrail(bot, model, 160);

      // AGGRESSIVE behavior: prefer strikes when there's any reachable candidate
      if (candidate) {
        bot.thinkTarget = { x: candidate.x, y: candidate.y, mode: 'strike' };
      } else if (risk > 0) {
        // escape to home or away from nearest threat
        const home = model.homeTarget(bot) || { x: model.cx, y: model.cy };
        const awayX = bot.x + (bot.x - model.player.x);
        const awayY = bot.y + (bot.y - model.player.y);
        bot.thinkTarget = { x: (awayX + home.x) / 2, y: (awayY + home.y) / 2, mode: 'escape' };
      } else {
        bot.thinkTarget = null;
      }
    });
  }
}

(function () {
  if (!window.Empire) window.Empire = {};
  Empire.model = Empire.model || {};
  Empire.model.bots = BotsHelper;
})();
