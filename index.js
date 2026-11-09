import EnemyController from "./EnemyController.js";
import Player from "./Player.js";
import BulletController from "./BulletController.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const BG_COLOR = "#FCF8EA";
const TEXT_COLOR = "#2b2b2b";
const ACCENT_COLOR = "#BBBD2B";
const FONT = "Geist Mono";

const GAME_WIDTH = 420;                
const UPDATES_PER_SECOND = 48;        
const MAX_WIDTH = 560;                
const APPLY_PAGE_BACKGROUND = true;    
const TOUCH_CONTROLS_MAX_WIDTH = 700; 
const DESKTOP_ASPECT = 1.25;           
const TOUCH_ASPECT = 1.25;             
const CONTROL_SIZE = 40;              

const showTouchControls = () => window.innerWidth <= TOUCH_CONTROLS_MAX_WIDTH;

let gameStarted = false;
let isGameOver = false;
let didWin = false;

let playerBulletController;
let enemyBulletController;
let enemyController;
let player;
let animationId;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);


let W = GAME_WIDTH;
let H = Math.round(GAME_WIDTH * DESKTOP_ASPECT);
const view = {
  get width() { return W; },
  get height() { return H; },
};


if (APPLY_PAGE_BACKGROUND) {
  document.documentElement.style.backgroundColor = BG_COLOR;
  document.body.style.backgroundColor = BG_COLOR;
}
document.body.style.margin = "0";

for (const el of [document.documentElement, document.body, canvas]) {
  el.style.userSelect = "none";
  el.style.webkitUserSelect = "none";
  el.style.webkitTouchCallout = "none";
  el.style.webkitTapHighlightColor = "transparent";
}
canvas.style.touchAction = "none";
canvas.style.display = "block";
canvas.style.backgroundColor = BG_COLOR;
canvas.style.outline = "none";
canvas.addEventListener("touchstart", (e) => e.preventDefault(), { passive: false });
canvas.addEventListener("selectstart", (e) => e.preventDefault());

function resizeCanvas() {
  const container = canvas.parentElement || document.body;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const aspect = showTouchControls() ? TOUCH_ASPECT : DESKTOP_ASPECT;

  W = GAME_WIDTH;
  H = Math.round(GAME_WIDTH * aspect);

  let displayW = Math.min(container.clientWidth || window.innerWidth, MAX_WIDTH);
  let displayH = displayW * aspect;
  const maxH = window.innerHeight * 0.95;
  if (displayH > maxH) {
    displayH = maxH;
    displayW = displayH / aspect;
  }
  displayW = Math.round(displayW);
  displayH = Math.round(displayH);

  canvas.style.width = displayW + "px";
  canvas.style.height = displayH + "px";
  canvas.width = Math.round(displayW * dpr);
  canvas.height = Math.round(displayH * dpr);
  ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);

  releaseAllTouch();

  if (!gameStarted) {
    showStartScreen();
  } else if (isGameOver) {
    showGameOverScreen();
  }
}


let uiButton = null;

function drawButton(label, centerY, onClick) {
  const fontSize = W * 0.04;
  ctx.font = `${fontSize}px ${FONT}`;
  const w = ctx.measureText(label).width + fontSize * 2.4;
  const h = fontSize * 2.2;
  const x = W / 2 - w / 2;
  const y = centerY - h / 2;

  ctx.fillStyle = ACCENT_COLOR;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = BG_COLOR;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, W / 2, centerY + fontSize * 0.05);

  uiButton = { x, y, w, h, onClick };
}

function hitTest(rect, px, py, pad = 0) {
  return px >= rect.x - pad && px <= rect.x + rect.w + pad &&
         py >= rect.y - pad && py <= rect.y + rect.h + pad;
}

function toCanvasCoords(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (W / r.width),
    y: (e.clientY - r.top) * (H / r.height),
  };
}


function showStartScreen() {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = TEXT_COLOR;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const titleSize = W * 0.085;
  const bodySize = W * 0.036;

  ctx.font = `${titleSize}px ${FONT}`;
  drawLines(["OOPS! SOMETHING", "WENT WRONG"], H * 0.2, titleSize * 1.2);

  const instructions = showTouchControls()
    ? ["DESTROY THE BUGS", "TO RETURN HOME!", "", "USE THE BUTTONS", "TO MOVE AND SHOOT"]
    : ["DESTROY THE BUGS TO RETURN HOME!", "", "USE ARROW KEYS TO MOVE", "PRESS SPACE TO SHOOT"];

  ctx.font = `${bodySize}px ${FONT}`;
  drawLines(instructions, H * 0.48, bodySize * 1.6);

  drawButton("START GAME", H * 0.82, startGame);
}

function drawLines(lines, startY, lineHeight) {
  lines.forEach((line, index) => {
    ctx.fillText(line, W / 2, startY + index * lineHeight);
  });
}

function showGameOverScreen() {
  releaseAllTouch();

  ctx.fillStyle = TEXT_COLOR;
  ctx.font = `${W * 0.085}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(didWin ? "YOU WIN" : "GAME OVER", W / 2, H * 0.45);

  drawButton("PLAY AGAIN", H * 0.62, startGame);
}


function startGame() {
  uiButton = null;
  gameStarted = true;
  isGameOver = false;
  didWin = false;

  playerBulletController = new BulletController(view, 10, ACCENT_COLOR, true);
  enemyBulletController = new BulletController(view, 4, TEXT_COLOR, false);
  enemyController = new EnemyController(view, enemyBulletController, playerBulletController);
  player = new Player(view, 3, playerBulletController);

  lastTime = 0;
  accumulator = 0;
  if (animationId) cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(game);
}

const STEP = 1000 / UPDATES_PER_SECOND;
let lastTime = 0;
let accumulator = 0;

function stepGame() {
  ctx.clearRect(0, 0, W, H);

  enemyController.draw(ctx);
  player.draw(ctx);
  playerBulletController.draw(ctx);
  enemyBulletController.draw(ctx);

  if (showTouchControls()) drawTouchControls();

  checkGameOver();
}

function game(timestamp) {
  if (!lastTime) lastTime = timestamp;
  accumulator += Math.min(timestamp - lastTime, 100); 
  lastTime = timestamp;

  let steps = 0;
  while (accumulator >= STEP && steps < 5 && !isGameOver) {
    stepGame();
    accumulator -= STEP;
    steps++;
  }

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


const KEY_MAP = {
  left:  { key: "ArrowLeft",  code: "ArrowLeft",  keyCode: 37 },
  right: { key: "ArrowRight", code: "ArrowRight", keyCode: 39 },
  fire:  { key: " ",          code: "Space",      keyCode: 32 },
};

function fireKey(type, def) {
  document.dispatchEvent(new KeyboardEvent(type, { ...def, bubbles: true, cancelable: true }));
}

const activePointers = new Map(); 
const pressedActions = new Set();

function getControlRects() {
  const size = CONTROL_SIZE;
  const margin = size * 0.3;
  const y = H - margin - size;
  return {
    left:  { x: margin,            y, w: size, h: size },
    right: { x: margin * 2 + size, y, w: size, h: size },
    fire:  { x: W - margin - size, y, w: size, h: size },
  };
}

function drawTouchControls() {
  const rects = getControlRects();

  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = ACCENT_COLOR;
  ctx.fillStyle = ACCENT_COLOR;

  for (const [action, r] of Object.entries(rects)) {
    if (pressedActions.has(action)) {
      ctx.globalAlpha = 0.25;
      ctx.fillRect(r.x, r.y, r.w, r.h);
    }

    ctx.globalAlpha = 1;
    ctx.strokeRect(r.x, r.y, r.w, r.h);

    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    const s = r.w * 0.2;

    ctx.beginPath();
    if (action === "left") {
      ctx.moveTo(cx - s, cy);
      ctx.lineTo(cx + s, cy - s * 1.2);
      ctx.lineTo(cx + s, cy + s * 1.2);
    } else if (action === "right") {
      ctx.moveTo(cx + s, cy);
      ctx.lineTo(cx - s, cy - s * 1.2);
      ctx.lineTo(cx - s, cy + s * 1.2);
    } else {
      ctx.moveTo(cx, cy - s);
      ctx.lineTo(cx - s * 1.2, cy + s);
      ctx.lineTo(cx + s * 1.2, cy + s);
    }
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function actionAt(x, y) {
  const rects = getControlRects();
  for (const [action, r] of Object.entries(rects)) {
    if (hitTest(r, x, y, r.w * 0.3)) return action;
  }
  return null;
}

function pressAction(action) {
  if (pressedActions.has(action)) return;
  pressedActions.add(action);
  fireKey("keydown", KEY_MAP[action]);
}

function releaseAction(action) {
  if ([...activePointers.values()].includes(action)) return;
  if (!pressedActions.has(action)) return;
  pressedActions.delete(action);
  fireKey("keyup", KEY_MAP[action]);
}

function releaseAllTouch() {
  activePointers.clear();
  for (const action of [...pressedActions]) {
    pressedActions.delete(action);
    fireKey("keyup", KEY_MAP[action]);
  }
}


canvas.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  const { x, y } = toCanvasCoords(e);

  if (uiButton && hitTest(uiButton, x, y)) {
    uiButton.onClick();
    return;
  }

  if (showTouchControls() && gameStarted && !isGameOver) {
    const action = actionAt(x, y);
    if (action) {
      canvas.setPointerCapture(e.pointerId);
      activePointers.set(e.pointerId, action);
      pressAction(action);
    }
  }
});

function onPointerEnd(e) {
  const action = activePointers.get(e.pointerId);
  if (!action) return;
  activePointers.delete(e.pointerId);
  releaseAction(action);
}
canvas.addEventListener("pointerup", onPointerEnd);
canvas.addEventListener("pointercancel", onPointerEnd);
canvas.addEventListener("contextmenu", (e) => e.preventDefault());

canvas.addEventListener("pointermove", (e) => {
  if (e.pointerType !== "mouse") return;
  const { x, y } = toCanvasCoords(e);
  canvas.style.cursor = uiButton && hitTest(uiButton, x, y) ? "pointer" : "default";
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && uiButton) uiButton.onClick();
});


resizeCanvas();
window.addEventListener("resize", resizeCanvas);

document.fonts.ready.then(() => {
  if (!gameStarted) showStartScreen();
});