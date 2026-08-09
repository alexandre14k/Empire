class GameView {
  constructor(root) {
    this.root = root;
    this.stage = root.querySelector("[data-stage]");
    this.canvas = root.querySelector("[data-canvas]");
    this.ctx = this.canvas.getContext("2d");
    this.miniMap = root.querySelector("[data-mini-map]");
    this.miniCtx = this.miniMap.getContext("2d");
    this.message = root.querySelector("[data-message]");
    this.ranking = root.querySelector("[data-ranking]");
    this.area = root.querySelector("[data-area]");
    this.lost = root.querySelector("[data-lost]");
    this.conquered = root.querySelector("[data-conquered]");
    this.state = root.querySelector("[data-state]");
    this.restart = root.querySelector("[data-restart]");
    this.form = root.querySelector("[data-start-form]");
    this.name = root.querySelector("[data-name]");
    this.playerName = root.querySelector("[data-player-name]");
    this.dialog = root.querySelector("[data-dialog]");
    this.dialogMessage = root.querySelector("[data-dialog-message]");
    this.dialogRestart = root.querySelector("[data-dialog-restart]");
    this.camera = { x: 0, y: 0, zoom: 1 };
    this.territoryCanvas = document.createElement("canvas");
    this.territoryCtx = this.territoryCanvas.getContext("2d");
    this.territoryVersion = -1;
    this.rankingVersion = -1;
  }

  onStart(handler) {
    this.form.addEventListener("submit", (event) => {
      event.preventDefault();
      handler(this.name.value);
    });
  }

  onRestart(handler) {
    this.restart.addEventListener("click", handler);
    this.dialogRestart.addEventListener("click", handler);
  }

  onAim(handler) {
    this.canvas.addEventListener("mousemove", (event) => {
      handler(this.eventPoint(event));
    });

    this.canvas.addEventListener("pointerdown", (event) => {
      handler(this.eventPoint(event));
    });
  }

  eventPoint(event) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    return {
      x: ((event.clientX - rect.left) * scaleX - this.camera.x) /
        this.camera.zoom,
      y: ((event.clientY - rect.top) * scaleY - this.camera.y) /
        this.camera.zoom
    };
  }

  resize(model) {
    const width = this.stage.clientWidth;
    const height = this.stage.clientHeight;

    if (model.state === "idle") {
      model.resizeBoard(width, height);
    }

    this.canvas.width = width;
    this.canvas.height = height;
    this.territoryCanvas.width = width;
    this.territoryCanvas.height = height;
    this.resetTerritory(model);
  }

  render(model) {
    const stats = model.ownerStats();

    this.syncTheme(model);
    this.clear();
    this.camera = this.makeCamera(model);
    this.ctx.save();
    this.ctx.translate(this.camera.x, this.camera.y);
    this.ctx.scale(this.camera.zoom, this.camera.zoom);
    this.drawArena(model);
    this.drawTerritory(model);
    this.drawPercentLabels(stats);

    if (model.state !== "idle") {
      model.bots.forEach((bot) => {
        this.drawTrail(bot.trail, bot.color, 0.45, 7);
      });

      this.drawTrail(model.playerTrail, model.playerColor, 0.34, 7);
      model.bots.forEach((bot) => {
        this.drawBody(bot, bot.color, model.config.bot.radius);
        this.drawName(bot.name, bot, bot.color);
      });

      this.drawBody(model.player, model.playerColor,
        model.config.player.radius);
      this.drawName(model.playerName, model.player, model.playerColor);
    }

    this.ctx.restore();
    this.drawMiniMap(model);
    this.syncHud(model);
    this.syncRanking(model, stats);
    this.syncDialog(model);
  }

  syncTheme(model) {
    const color = model.playerColor || "silver";

    this.root.style.setProperty("--interface-color", color);
  }

  makeCamera(model) {
    const active = model.state === "playing" || model.state === "won";
    const zoom = active ? 1.35 : 0.52;
    const target = active ? model.player : { x: model.cx, y: model.cy };

    return {
      x: this.canvas.width / 2 - target.x * zoom,
      y: this.canvas.height / 2 - target.y * zoom,
      zoom
    };
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawArena(model) {
    const { radius } = model.config.board;

    this.ctx.fillStyle = model.playerColor || "silver";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(model.cx, model.cy, radius, 0, Math.PI * 2);
    this.ctx.clip();
    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();
    this.ctx.strokeStyle = "rgba(15, 23, 42, 0.22)";
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(model.cx, model.cy, radius, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  drawTerritory(model) {
    if (this.territoryVersion !== model.territoryVersion) {
      this.cacheTerritory(model);
    }

    this.ctx.drawImage(this.territoryCanvas, 0, 0);
  }

  resetTerritory(model) {
    this.territoryCtx.clearRect(0, 0, this.territoryCanvas.width,
      this.territoryCanvas.height);
    this.paintTerritory(model, model.territory);
    model.consumeDirty();
    this.territoryVersion = model.territoryVersion;
  }

  paintTerritory(model, entries) {
    const ctx = this.territoryCtx;
    const cell = model.config.board.cell;

    entries.forEach((owner, key) => {
      const [x, y] = key.split(":").map(Number);

      if (owner) {
        ctx.fillStyle = model.ownerColor(owner);
        ctx.fillRect(x * cell, y * cell, cell + 1, cell + 1);
      } else {
        ctx.clearRect(x * cell, y * cell, cell + 1, cell + 1);
      }
    });
  }

  cacheTerritory(model) {
    this.paintTerritory(model, model.consumeDirty());
    this.territoryVersion = model.territoryVersion;
  }

  drawTrail(trail, color, alpha, width) {
    if (trail.length < 2) {
      return;
    }

    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.strokeStyle = color;
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
    this.ctx.lineWidth = width;
    this.ctx.beginPath();
    this.ctx.moveTo(trail[0].x, trail[0].y);

    trail.slice(1).forEach((point) => {
      this.ctx.lineTo(point.x, point.y);
    });

    this.ctx.stroke();
    this.ctx.restore();
  }

  drawBody(body, color, radius) {
    if (!color) {
      return;
    }

    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(body.x, body.y, radius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  drawName(name, body, color) {
    this.ctx.font = "700 13px Arial";
    this.ctx.lineWidth = 4;
    this.ctx.strokeStyle = "#ffffff";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "bottom";
    this.ctx.strokeText(name, body.x, body.y - 14);
    this.ctx.fillStyle = color;
    this.ctx.fillText(name, body.x, body.y - 14);
  }

  drawPercentLabels(stats) {
    stats.forEach((item) => {
      if (item.percent <= 0) {
        return;
      }

      const text = `${item.percent}%`;

      this.ctx.font = "700 16px Arial";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.lineWidth = 5;
      this.ctx.strokeStyle = this.contrastStroke(item.color);
      this.ctx.strokeText(text, item.x, item.y);
      this.ctx.fillStyle = this.contrastText(item.color);
      this.ctx.fillText(text, item.x, item.y);
    });
  }

  drawMiniMap(model) {
    const ctx = this.miniCtx;
    const scaleX = this.miniMap.width / model.config.board.width;
    const scaleY = this.miniMap.height / model.config.board.height;
    const scale = Empire.lib.math.min(scaleX, scaleY);
    const width = model.config.board.width * scale;
    const height = model.config.board.height * scale;
    const offsetX = (this.miniMap.width - width) / 2;
    const offsetY = (this.miniMap.height - height) / 2;

    ctx.clearRect(0, 0, this.miniMap.width, this.miniMap.height);
    ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
    ctx.fillRect(0, 0, this.miniMap.width, this.miniMap.height);
    ctx.strokeStyle = "rgba(15, 23, 42, 0.28)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(model.cx * scale + offsetX, model.cy * scale + offsetY,
      model.config.board.radius * scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.drawImage(this.territoryCanvas, offsetX, offsetY, width, height);
  }

  syncHud(model) {
    const active = model.state === "playing" || model.state === "won";
    const terminal = model.state === "lost" || model.state === "won";

    this.root.classList.toggle("is-playing", active);
    this.area.textContent = `${model.areaPercent()}%`;
    this.lost.textContent = `${model.lostPercent()}%`;
    this.conquered.textContent = model.conquered;
    this.playerName.textContent = model.playerName || "-";
    this.restart.disabled = model.state === "idle" ||
      model.state === "lost";
    this.state.textContent = this.labelState(model.state);
    this.message.textContent = terminal ? "" : this.statusText(model);
  }

  syncRanking(model, stats) {
    if (this.rankingVersion === model.territoryVersion) {
      return;
    }

    this.ranking.innerHTML = "";

    stats.forEach((item) => {
      const row = document.createElement("div");
      const swatch = document.createElement("span");
      const name = document.createElement("strong");
      const percent = document.createElement("span");

      row.className = "ranking-row";
      swatch.className = "ranking-color";
      swatch.style.background = item.color;
      name.textContent = item.name;
      percent.textContent = `${item.percent}%`;
      row.append(swatch, name, percent);
      this.ranking.append(row);
    });

    this.rankingVersion = model.territoryVersion;
  }

  syncDialog(model) {
    const isTerminal = model.state === "lost" || model.state === "won";

    this.dialog.hidden = !isTerminal;

    if (isTerminal) {
      this.dialogMessage.textContent = this.statusText(model);
      this.dialogRestart.textContent = model.state === "won" ?
        "Play again" : "New game";
    }
  }

  statusText(model) {
    if (model.state === "lost") {
      return `${model.status}. Select another name before entering the grid`;
    }

    if (model.status) {
      return model.status;
    }

    return "";
  }

  contrastText(color) {
    return this.luminance(color) > 0.5 ? "#111827" : "#ffffff";
  }

  contrastStroke(color) {
    return this.luminance(color) > 0.5 ? "#ffffff" : "#111827";
  }

  luminance(color) {
    const hex = color.replace("#", "");
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  labelState(state) {
    const labels = {
      idle: "Idle",
      playing: "Playing",
      lost: "Lost",
      won: "Won"
    };

    return labels[state] || state;
  }
}

Empire.view.GameView = GameView;