class GameController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
    this.lastStep = 0;
    this.frame = 0;
    this.bindings = {
      ArrowUp: "up",
      KeyW: "up",
      ArrowRight: "right",
      KeyD: "right",
      ArrowDown: "down",
      KeyS: "down",
      ArrowLeft: "left",
      KeyA: "left"
    };
  }

  start() {
    window.addEventListener("keydown", (event) => this.onKeyDown(event));
    this.view.onStart((name) => this.startGame(name));
    this.view.onRestart(() => this.restart());
    this.view.onAim((point) => this.model.setTarget(point.x, point.y));
    this.view.resize(this.model);
    window.addEventListener("resize", () => this.view.resize(this.model));
    this.frame = requestAnimationFrame((time) => this.tick(time));
  }

  startGame(name) {
    this.model.start(name);
    this.lastStep = 0;
    this.view.resetTerritory(this.model);
    this.view.render(this.model);
  }

  restart() {
    this.model.restart();
    this.lastStep = 0;
    this.view.resetTerritory(this.model);
    this.view.render(this.model);
  }

  onKeyDown(event) {
    if (event.target.closest && event.target.closest("input")) {
      return;
    }

    const direction = this.bindings[event.code];

    if (!direction) {
      return;
    }

    event.preventDefault();
    this.model.setDirection(direction);
  }

  tick(time) {
    const stepMs = this.model.config.timing.stepMs;

    if (time - this.lastStep >= stepMs) {
      this.model.step();
      this.lastStep = time;
    }

    this.view.render(this.model);
    this.frame = requestAnimationFrame((nextTime) => this.tick(nextTime));
  }
}

Empire.controller.GameController = GameController;