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
      lastThink: 0,
      thinkUntil: 0
    };
  }

  // Find a nearby opponent trail point the bot can try to strike (low-cost heuristic)
  static findNearestEnemyTrail(bot, model, maxDist = 160) {
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

  // Sample directions and score open space along a ray to prefer conquering large empty regions
  static sampleOpenDirection(bot, model, samples = 16, maxDist = 240, step = 6) {
    let best = null;
    for (let i = 0; i < samples; i += 1) {
      const angle = (i / samples) * Math.PI * 2;
      let score = 0;
      for (let d = step; d <= maxDist; d += step) {
        const x = bot.x + Math.cos(angle) * d;
        const y = bot.y + Math.sin(angle) * d;
        const cellX = Math.floor(x / model.config.board.cell);
        const cellY = Math.floor(y / model.config.board.cell);
        if (!model.isCellInArena(cellX, cellY)) break;
        const key = model.key(cellX, cellY);
        const owner = model.territory.get(key);
        if (!owner) score += 1; // neutral cell
        else break; // blocked by owned cell
      }

      if (!best || score > best.score) {
        best = { angle, score };
      }
    }

    if (!best || best.score === 0) return null;
    // return a target point further along the chosen angle
    const targetDist = Math.min(maxDist, (best.score * step));
    return { x: bot.x + Math.cos(best.angle) * targetDist, y: bot.y + Math.sin(best.angle) * targetDist, mode: 'conquer' };
  }

  // Async think tick for bots — updates thinkTarget without blocking main loop
  static scheduleThinking(bots, model) {
    // start a continuous non-blocking thinking loop
    const run = () => {
      try {
        BotsHelper.think(bots, model);
      } catch (err) {
        // swallow errors from AI so we don't stop the loop
        console.error('bot think error', err);
      }
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(run, { timeout: 80 });
      } else {
        setTimeout(run, 80);
      }
    };

    // kick off the loop
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(run, { timeout: 80 });
    } else {
      setTimeout(run, 80);
    }
  }

  static think(bots, model) {
    const now = Date.now();

    bots.forEach((bot) => {
      // if we still should hold current target, skip rethinking
      if (bot.thinkUntil && now < bot.thinkUntil) return;

      // throttle thinking per-bot
      if (now - (bot.lastThink || 0) < 80) return;
      bot.lastThink = now;

      const risk = BotsHelper.predictClosingRisk(bot, model);
      const candidate = BotsHelper.findNearestEnemyTrail(bot, model, 200);

      // AGGRESSIVE behavior: prefer strikes when there's any reachable candidate
      if (candidate) {
        bot.thinkTarget = { x: candidate.x, y: candidate.y, mode: 'strike' };
        bot.thinkUntil = now + 700; // persist target to avoid flip-flop
        return;
      }

      // challenge player if close enough
      const toPlayer = M.hypot(model.player.x - bot.x, model.player.y - bot.y);
      if (toPlayer < 260) {
        bot.thinkTarget = { x: model.player.x, y: model.player.y, mode: 'challenge' };
        bot.thinkUntil = now + 600;
        return;
      }

      // if risk, prefer escape behavior
      if (risk > 0) {
        const home = model.homeTarget(bot) || { x: model.cx, y: model.cy };
        const awayX = bot.x + (bot.x - model.player.x);
        const awayY = bot.y + (bot.y - model.player.y);
        bot.thinkTarget = { x: (awayX + home.x) / 2, y: (awayY + home.y) / 2, mode: 'escape' };
        bot.thinkUntil = now + 600;
        return;
      }

      // prefer to conquer open space: sample rays and pick the best
      const conquer = BotsHelper.sampleOpenDirection(bot, model, 20, 280, 6);
      if (conquer) {
        bot.thinkTarget = conquer;
        bot.thinkUntil = now + 900;
        return;
      }

      // no opinion
      bot.thinkTarget = null;
      bot.thinkUntil = 0;
    });
  }
}

(function () {
  if (!window.Empire) window.Empire = {};
  Empire.model = Empire.model || {};
  Empire.model.bots = BotsHelper;
})();
