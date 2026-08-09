const root = document.querySelector("[data-app]");
const model = new Empire.model.GameModel();
const view = new Empire.view.GameView(root);
const controller = new Empire.controller.GameController(model, view);

controller.start();