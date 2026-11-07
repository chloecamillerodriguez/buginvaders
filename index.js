import EnemyController from "./EnemyController.js";
import Player from "./Player.js";
import BulletController from "./BulletController.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const BG_COLOR = "#FCF8EA";
const TEXT_COLOR = "#2b2b2b";
const ACCENT_COLOR = "#BBBD2B";
const FONT = "Geist Mono";

const isTouchDevice = window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;

let gameStarted = false;
let isGameOver = false;
let didWin = false;

let playerBulletController;
let enemyBulletController;
let enemyController;
let player;
let animationId;

canvas.style.backgroundColor = BG_COLOR;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/* ---------- Canvas sizing ---------- */

function resizeCanvas() {
  if (isTouchDevice) {
    canvas.width = window.innerWidth * 0.96;
    canvas.height = window.innerHeight * 0.72; // leave room for touch controls
  } else {
    canvas.width = window.innerWidth * 0.9;
    canvas.height = window.innerHeight * 0.85;
  }

  // Buttons are positioned relative to the canvas, so rebuild them after a resize
  removeButton("start-btn");
  removeButton("play-again-btn");

  if (!gameStarted) {
    showStartScreen();
  } else if (isGameOver) {
    showGameOverScreen();
  }
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

/* ---------- Screens ---------- */

function showStartScreen() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = TEXT_COLOR;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const titleSize = clamp(canvas.width * 0.07, 28, 90);
  const bodySize = clamp(canvas.width * 0.025, 13, 28);

  ctx.font = `${titleSize}px ${FONT}`;
  drawLines(["OOPS! SOMETHING", "WENT WRONG"], canvas.height * 0.25, titleSize * 1.2);

  const instructions = isTouchDevice
    ? ["DESTROY THE BUGS", "TO RETURN HOME!", "", "USE THE ON-SCREEN", "BUTTONS TO MOVE AND SHOOT"]
    : ["DESTROY THE BUGS TO RETURN HOME!", "", "USE ARROW KEYS TO MOVE", "PRESS SPACE TO SHOOT"];

  ctx.font = `${bodySize}px ${FONT}`;
  drawLines(instructions, canvas.height * 0.5, bodySize * 1.6);

  createButton("start-btn", "start game", 0.78, () => {
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

  setTouchControlsVisible(false);

  ctx.fillStyle = TEXT_COLOR;
  ctx.font = `${clamp(canvas.width * 0.06, 28, 80)}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(didWin ? "YOU WIN" : "GAME OVER", canvas.width / 2, canvas.height / 2);

  createButton("play-again-btn", "PLAY AGAIN", 0.62, () => {
    removeButton("play-again-btn");
    startGame();
  });
}

/* ---------- Game loop ---------- */

function startGame() {
  gameStarted = true;
  isGameOver = false;
  didWin = false;

  playerBulletController = new BulletController(canvas, 10, ACCENT_COLOR, true);
  enemyBulletController = new BulletController(canvas, 4, TEXT_COLOR, false);
  enemyController = new EnemyController(canvas, enemyBulletController, playerBulletController);
  player = new Player(canvas, 3, playerBulletController);

  setTouchControlsVisible(true);

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

/* ---------- DOM buttons ---------- */

// topFraction is a fraction of the canvas height (0 to 1)
function createButton(id, label, topFraction, onClick) {
  if (document.getElementById(id)) return;

  const rect = canvas.getBoundingClientRect();
  const button = document.createElement("button");
  button.id = id;
  button.innerText = label;
  button.style.cssText = `
    position: absolute;
    top: ${rect.top + window.scrollY + rect.height * topFraction}px;
    left: ${rect.left + window.scrollX + rect.width / 2}px;
    transform: translateX(-50%);
    font-family: "${FONT}";
    font-size: ${clamp(canvas.width * 0.03, 16, 28)}px;
    padding: 10px 20px;
    background: ${ACCENT_COLOR};
    color: ${BG_COLOR};
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

/* ---------- Touch controls ---------- */

// Touch buttons fire the same keyboard events the game already listens for,
// so Player.js doesn't need to change.
const KEY_MAP = {
  left:  { key: "ArrowLeft",  code: "ArrowLeft",  keyCode: 37 },
  right: { key: "ArrowRight", code: "ArrowRight", keyCode: 39 },
  fire:  { key: " ",          code: "Space",      keyCode: 32 },
};

function fireKey(type, def) {
  document.dispatchEvent(
    new KeyboardEvent(type, { ...def, bubbles: true, cancelable: true })
  );
}

let touchControls = null;

function buildTouchControls() {
  touchControls = document.createElement("div");
  touchControls.style.cssText = `
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    height: 24vh;
    display: none;
    align-items: center;
    justify-content: space-between;
    padding: 0 4vw;
    box-sizing: border-box;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
    z-index: 10;
  `;

  const makeBtn = (label, keyDef) => {
    const btn = document.createElement("button");
    btn.innerText = label;
    btn.style.cssText = `
      width: 20vw;
      height: 20vw;
      max-width: 110px;
      max-height: 110px;
      font-family: "${FONT}";
      font-size: 2rem;
      background: ${ACCENT_COLOR};
      color: ${BG_COLOR};
      border: none;
      border-radius: 50%;
      touch-action: none;
      -webkit-tap-highlight-color: transparent;
    `;

    const press = (e) => { e.preventDefault(); btn.setPointerCapture(e.pointerId); fireKey("keydown", keyDef); };
    const release = (e) => { e.preventDefault(); fireKey("keyup", keyDef); };

    btn.addEventListener("pointerdown", press);
    btn.addEventListener("pointerup", release);
    btn.addEventListener("pointercancel", release);
    btn.addEventListener("contextmenu", (e) => e.preventDefault());
    return btn;
  };

  const moveGroup = document.createElement("div");
  moveGroup.style.cssText = "display: flex; gap: 4vw;";
  moveGroup.append(makeBtn("◀", KEY_MAP.left), makeBtn("▶", KEY_MAP.right));

  touchControls.append(moveGroup, makeBtn("●", KEY_MAP.fire));
  document.body.appendChild(touchControls);
}

function setTouchControlsVisible(visible) {
  if (!isTouchDevice) return;
  if (!touchControls) buildTouchControls();
  touchControls.style.display = visible ? "flex" : "none";
}

/* ---------- Init ---------- */

document.fonts.ready.then(() => {
  showStartScreen();
});