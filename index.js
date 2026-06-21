import EnemyController from "./EnemyController.js";
import Player from "./Player.js";
import BulletController from "./BulletController.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  canvas.width = window.innerWidth - (window.innerWidth * 0.1);
  canvas.height = window.innerHeight - (window.innerHeight * 0.15);
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

let playerBulletController;
let enemyBulletController;
let enemyController;
let player;

let animationId;
let isGameOver = false;
let didWin = false;


function showStartScreen() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#00000C";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.font = `${canvas.width * 0.07}px Pixelify Sans`;
  drawLines(["oops! something", "went wrong"], canvas.height * 0.3, canvas.height * 0.08);

  ctx.font = `${canvas.width * 0.025}px Pixelify Sans`;
  drawLines(
    [
      "destroy the bugs to return home!",
      "",
      "use arrow keys to move",
      "press space to shoot"
    ],
    canvas.height * 0.55,  
    canvas.height * 0.04  
  );

  createButton("start-btn", "start game", "70%", () => {
    removeButton("start-btn");
    startGame();
  });
}

function drawLines(lines, startY, lineHeight) {
  lines.forEach((line, index) => {
    ctx.fillText(line, canvas.width / 2, startY + index * lineHeight);
  });
}

function showGameOverScreen() {
  if (document.getElementById("play-again-btn")) return;

  ctx.fillStyle = "#00000C";
  ctx.font = `${canvas.width * 0.07}px Pixelify Sans`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(didWin ? "you win" : "game over", canvas.width / 2, canvas.height / 2);

  createButton("play-again-btn", "play again", "62%", () => {
    removeButton("play-again-btn");
    startGame();})

  //createButton("home-btn", "home", "75%", () => {
    //window.location.href = "https://chloecamille.work";
  //})
}

function startGame() {
  isGameOver = false;
  didWin = false;

  playerBulletController = new BulletController(canvas, 10, "#FF8DA1", true);
  enemyBulletController = new BulletController(canvas, 4, "#00000C", false);
  enemyController = new EnemyController(canvas, enemyBulletController, playerBulletController);
  player = new Player(canvas, 3, playerBulletController);

  if (animationId) cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(game);
}

const TARGET_FPS = 70;
const FRAME_DURATION = 1000 / TARGET_FPS;
let lastFrameTime = 0;

function game(timestamp) {
  if (timestamp - lastFrameTime < FRAME_DURATION) {
    animationId = requestAnimationFrame(game);
    return;
  }
  lastFrameTime = timestamp;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  enemyController.draw(ctx);
  player.draw(ctx);
  playerBulletController.draw(ctx);
  enemyBulletController.draw(ctx);

  checkGameOver();

  if (isGameOver) {
    showGameOverScreen();
  } else {
    animationId = requestAnimationFrame(game);
  }
}

function checkGameOver() {
  if (isGameOver) return;

  if (enemyBulletController.collideWith(player)) isGameOver = true;
  if (enemyController.collideWith(player)) isGameOver = true;
  if (enemyController.enemyRows.length === 0) {
    didWin = true;
    isGameOver = true;
  }
}


function createButton(id, label, topPercent, onClick) {
  if (document.getElementById(id)) return;

  const button = document.createElement("button");
  button.id = id;
  button.innerText = label;
  button.style.cssText = `
    position: absolute;
    top: ${topPercent};
    left: 50%;
    transform: translateX(-50%);
    font-family: "Pixelify Sans";
    font-size: 1.2em;
    padding: 8px 16px;
    background: #FF8DA1;
    color: #00000C;
    cursor: pointer;
    border: none;
  `;
  button.addEventListener("click", onClick);
  document.body.appendChild(button);
}

function removeButton(id) {
  const button = document.getElementById(id);
  if (button) button.remove();
}

showStartScreen();