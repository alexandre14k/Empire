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
      trail: []
    };
  }
}

(function () {
  if (!window.Empire) window.Empire = {};
  Empire.model = Empire.model || {};
  Empire.model.bots = BotsHelper;
})();
