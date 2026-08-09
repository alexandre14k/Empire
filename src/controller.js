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

    // map touch events to the view's eventPoint so touches are transformed
    // to game coordinates taking canvas scaling and camera into account
    window.addEventListener("touchstart", (e) => {
      if (!e.touches || e.touches.length === 0) return;
      const t = e.touches[0];
      const fake = { clientX: t.clientX, clientY: t.clientY };
      const pt = this.view.eventPoint(fake);
      this.model.setTarget(pt.x, pt.y);
      e.preventDefault();
    }, { passive: false });

    window.addEventListener("touchmove", (e) => {
      if (!e.touches || e.touches.length === 0) return;
      const t = e.touches[0];
      const fake = { clientX: t.clientX, clientY: t.clientY };
      const pt = this.view.eventPoint(fake);
      this.model.setTarget(pt.x, pt.y);
      e.preventDefault();
    }, { passive: false });

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

    // compute a scale factor so movement is framerate-independent
    const deltaMs = this.lastStep === 0 ? stepMs : (time - this.lastStep);
    const scale = Math.max(0.01, Math.min(4, deltaMs / stepMs));

    this.model.step(scale);
    this.lastStep = time;

    this.view.render(this.model);
    this.frame = requestAnimationFrame((nextTime) => this.tick(nextTime));
  }
}

Empire.controller.GameController = GameController;
