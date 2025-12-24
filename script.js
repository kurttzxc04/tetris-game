// ================= GAME CONFIGURATION =================

const COLS = 10;
const ROWS = 20;
const BLOCK = 24; // pixel size of block

const canvas = document.getElementById('tetris');
const ctx = canvas.getContext('2d');
const previewCanvas = document.getElementById('nextPreview');
const previewCtx = previewCanvas.getContext('2d');

// Colors for pieces (index 1..7)
const COLORS = [
  null,
  '#FF6B6B', // I - Red
  '#FFD93D', // J - Yellow
  '#6BCB77', // L - Green
  '#4D96FF', // O - Blue
  '#A36BFF', // S - Purple
  '#FF8AC1', // T - Pink
  '#00E5FF'  // Z - Cyan
];

// Piece definitions using matrices
const PIECES = {
  I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
  J: [[2, 0, 0], [2, 2, 2], [0, 0, 0]],
  L: [[0, 0, 3], [3, 3, 3], [0, 0, 0]],
  O: [[4, 4], [4, 4]],
  S: [[0, 5, 5], [5, 5, 0], [0, 0, 0]],
  T: [[0, 6, 0], [6, 6, 6], [0, 0, 0]],
  Z: [[7, 7, 0], [0, 7, 7], [0, 0, 0]]
};

const PIECE_KEYS = Object.keys(PIECES);

// ================= GAME STATE =================

let arena = createMatrix(COLS, ROWS);
let player = {
  pos: { x: 0, y: 0 },
  matrix: null,
  score: 0,
  lines: 0,
  level: 1
};

let nextPiece = null;
let dropCounter = 0;
let dropInterval = 1000; // ms
let lastTime = 0;
let paused = false;
let gameOver = false;
let difficulty = null; // 'easy' or 'normal'
let highScore = 0;

// ================= UTILITY FUNCTIONS =================

function createMatrix(w, h) {
  const m = [];
  for (let y = 0; y < h; y++) {
    m.push(new Array(w).fill(0));
  }
  return m;
}

function getCanvasBgColor() {
  const isLight = document.body.classList.contains('light');
  
  try {
    const computedStyle = getComputedStyle(document.documentElement);
    const cssVar = computedStyle.getPropertyValue('--canvas').trim();
    
    if (cssVar && cssVar.length > 0) {
      return cssVar;
    }
  } catch (e) {
    console.warn('Could not read CSS variable, using fallback');
  }
  
  // Fallback colors
  return isLight ? '#fafafa' : '#0b1220';
}

function drawCell(x, y, value, context = ctx, blockSize = BLOCK) {
  if (value === 0) return;
  
  const isLight = document.body.classList.contains('light');
  
  // Draw block background
  context.fillStyle = COLORS[value];
  context.fillRect(x * blockSize + 1, y * blockSize + 1, blockSize - 2, blockSize - 2);
  
  // Draw block outline/border
  if (isLight) {
    // Light mode: darker outline for visibility
    context.strokeStyle = 'rgba(0, 0, 0, 0.3)';
  } else {
    // Dark mode: subtle lighter outline
    context.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  }
  context.lineWidth = 1.5;
  context.strokeRect(x * blockSize + 1, y * blockSize + 1, blockSize - 2, blockSize - 2);
}

function drawGrid() {
  const isLight = document.body.classList.contains('light');
  
  if (isLight) {
    // Light mode: visible dark grid lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 1;
  } else {
    // Dark mode: subtle light grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
  }
  
  // Draw vertical lines
  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * BLOCK, 0);
    ctx.lineTo(x * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  
  // Draw horizontal lines
  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * BLOCK);
    ctx.lineTo(COLS * BLOCK, y * BLOCK);
    ctx.stroke();
  }
}

function drawNextPreview() {
  if (!nextPiece || difficulty !== 'easy') return;
  
  const isLight = document.body.classList.contains('light');
  const bgColor = isLight ? '#fafafa' : '#0b1220';
  
  // Clear preview canvas
  previewCtx.fillStyle = bgColor;
  previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
  
  // Draw grid in preview
  if (isLight) {
    previewCtx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
  } else {
    previewCtx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  }
  previewCtx.lineWidth = 1;
  const smallBlock = 12;
  
  for (let x = 0; x <= 4; x++) {
    previewCtx.beginPath();
    previewCtx.moveTo(x * smallBlock, 0);
    previewCtx.lineTo(x * smallBlock, 4 * smallBlock);
    previewCtx.stroke();
  }
  
  for (let y = 0; y <= 4; y++) {
    previewCtx.beginPath();
    previewCtx.moveTo(0, y * smallBlock);
    previewCtx.lineTo(4 * smallBlock, y * smallBlock);
    previewCtx.stroke();
  }
  
  // Draw piece with outlines
  nextPiece.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        // Draw block
        previewCtx.fillStyle = COLORS[value];
        previewCtx.fillRect(
          x * smallBlock + 1,
          y * smallBlock + 1,
          smallBlock - 2,
          smallBlock - 2
        );
        
        // Draw block outline
        if (isLight) {
          previewCtx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        } else {
          previewCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        }
        previewCtx.lineWidth = 1;
        previewCtx.strokeRect(
          x * smallBlock + 1,
          y * smallBlock + 1,
          smallBlock - 2,
          smallBlock - 2
        );
      }
    });
  });
}

function mergeDraw(matrix, offset) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        drawCell(x + offset.x, y + offset.y, value);
      }
    });
  });
}

function draw() {
  const bgColor = getCanvasBgColor();
  
  // Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw grid first (behind pieces)
  drawGrid();
  
  // Draw arena (placed pieces)
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const val = arena[y][x];
      if (val) {
        drawCell(x, y, val);
      }
    }
  }
  
  // Draw player (current piece) on top
  if (player.matrix) {
    mergeDraw(player.matrix, player.pos);
  }
}

function collide(arena, player) {
  const m = player.matrix;
  const o = player.pos;
  
  for (let y = 0; y < m.length; y++) {
    for (let x = 0; x < m[y].length; x++) {
      if (m[y][x] !== 0) {
        // Check out of bounds
        if (o.y + y < 0 || o.y + y >= ROWS || o.x + x < 0 || o.x + x >= COLS) {
          if (m[y][x] !== 0) return true;
        }
        // Check arena collision
        if (arena[o.y + y] && arena[o.y + y][o.x + x] !== 0) {
          return true;
        }
      }
    }
  }
  
  return false;
}

function merge(arena, player) {
  player.matrix.forEach((row, y) => {
    row.forEach((val, x) => {
      if (val !== 0) {
        arena[y + player.pos.y][x + player.pos.x] = val;
      }
    });
  });
}

function rotate(matrix, dir) {
  // Transpose
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < y; x++) {
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
  }
  
  // Reverse rows (clockwise) or columns (counter-clockwise)
  if (dir > 0) {
    matrix.forEach(row => row.reverse());
  } else {
    matrix.reverse();
  }
}

function playerDrop() {
  player.pos.y++;
  if (collide(arena, player)) {
    player.pos.y--;
    merge(arena, player);
    sweepLines();
    playerReset();
    updateScore();
  }
  dropCounter = 0;
}

function hardDrop() {
  while (!collide(arena, player)) {
    player.pos.y++;
  }
  player.pos.y--;
  merge(arena, player);
  sweepLines();
  playerReset();
  updateScore();
  dropCounter = 0;
}

function playerMove(dir) {
  player.pos.x += dir;
  if (collide(arena, player)) {
    player.pos.x -= dir;
  }
}

function playerRotate(dir) {
  const pos = player.pos.x;
  let offset = 1;
  rotate(player.matrix, dir);
  
  while (collide(arena, player)) {
    player.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    
    if (Math.abs(offset) > player.matrix[0].length) {
      rotate(player.matrix, -dir);
      player.pos.x = pos;
      return;
    }
  }
}

function sweepLines() {
  let rowCount = 0;
  
  outer: for (let y = arena.length - 1; y >= 0; y--) {
    for (let x = 0; x < arena[y].length; x++) {
      if (arena[y][x] === 0) {
        continue outer;
      }
    }
    
    const row = arena.splice(y, 1)[0].fill(0);
    arena.unshift(row);
    y++;
    rowCount++;
  }
  
  if (rowCount > 0) {
    // Scoring (classic): 1->40, 2->100, 3->300, 4->1200 multiplied by level
    const points = [0, 40, 100, 300, 1200];
    player.score += points[rowCount] * player.level;
    player.lines += rowCount;
    
    // Level up every 10 lines
    const newLevel = Math.floor(player.lines / 10) + 1;
    if (newLevel > player.level) {
      player.level = newLevel;
      dropInterval = Math.max(100, dropInterval - 100 * (player.level - 1));
    }
  }
}

function playerReset() {
  // Move next piece to current
  if (nextPiece) {
    player.matrix = nextPiece.map(row => row.slice());
  } else {
    const key = PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)];
    player.matrix = PIECES[key].map(row => row.slice());
  }
  
  // Generate new next piece
  const key = PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)];
  nextPiece = PIECES[key].map(row => row.slice());
  drawNextPreview();
  
  player.pos.y = 0;
  player.pos.x = Math.floor((COLS - player.matrix[0].length) / 2);
  
  if (collide(arena, player)) {
    // Game over
    arena = createMatrix(COLS, ROWS);
    gameOver = true;
    paused = true;
    
    // Update high score if needed
    if (player.score > highScore) {
      highScore = player.score;
      saveHighScore(highScore);
    }
    
    showGameOver();
  }
}

function updateScore() {
  document.getElementById('score').textContent = player.score;
  document.getElementById('level').textContent = player.level;
  document.getElementById('lines').textContent = player.lines;
}

function loadHighScore() {
  const saved = localStorage.getItem('tetrisHighScore');
  highScore = saved ? parseInt(saved, 10) : 0;
  document.getElementById('highScore').textContent = highScore;
}

function saveHighScore(score) {
  localStorage.setItem('tetrisHighScore', score);
  document.getElementById('highScore').textContent = score;
}

// ================= GAME LOOP =================

function update(time = 0) {
  if (paused) return;
  
  const deltaTime = time - lastTime;
  lastTime = time;
  dropCounter += deltaTime;
  
  if (dropCounter > dropInterval) {
    playerDrop();
  }
  
  draw();
  
  if (!paused) {
    requestAnimationFrame(update);
  }
}

// ================= INPUT HANDLING =================

document.addEventListener('keydown', (event) => {
  if (gameOver) {
    if (event.key.toLowerCase() === 'r') {
      restart();
    }
    return;
  }
  
  switch (event.key) {
    case 'ArrowLeft':
      playerMove(-1);
      break;
    case 'ArrowRight':
      playerMove(1);
      break;
    case 'ArrowDown':
      playerDrop();
      break;
    case ' ':
      event.preventDefault();
      hardDrop();
      break;
    case 'ArrowUp':
    case 'x':
    case 'X':
      playerRotate(1);
      break;
    case 'q':
    case 'Q':
      playerRotate(-1);
      break;
    case 'e':
    case 'E':
      playerRotate(1);
      break;
    case 'p':
    case 'P':
      togglePause();
      break;
    case 'r':
    case 'R':
      restart();
      break;
  }
  
  updateScore();
});

// Button listeners
document.getElementById('btnPause').addEventListener('click', togglePause);
document.getElementById('btnRestart').addEventListener('click', restart);
document.getElementById('themeToggle').addEventListener('click', toggleTheme);

function togglePause() {
  const btn = document.getElementById('btnPause');
  
  if (gameOver) {
    restart();
    return;
  }
  
  paused = !paused;
  btn.textContent = paused ? 'Resume (P)' : 'Pause (P)';
  
  if (!paused) {
    lastTime = performance.now();
    requestAnimationFrame(update);
  }
}

function restart() {
  arena = createMatrix(COLS, ROWS);
  player.score = 0;
  player.lines = 0;
  player.level = 1;
  dropInterval = 1000;
  nextPiece = null;
  gameOver = false;
  paused = false;
  
  clearGameOverUI();
  playerReset();
  updateScore();
  
  document.getElementById('btnPause').textContent = 'Pause (P)';
  lastTime = performance.now();
  requestAnimationFrame(update);
}

function startGame(selectedDifficulty) {
  difficulty = selectedDifficulty;
  document.getElementById('difficultyMenu').style.display = 'none';
  document.getElementById('gameContainer').style.display = 'flex';
  
  if (difficulty === 'easy') {
    document.getElementById('nextPreviewPanel').style.display = 'flex';
  } else {
    document.getElementById('nextPreviewPanel').style.display = 'none';
  }
  
  restart();
}

function showGameOver() {
  const overlay = document.getElementById('gameOverOverlay');
  overlay.classList.add('active');
  document.getElementById('gameOverScore').textContent = `Score: ${player.score}`;
  document.getElementById('gameOverLevel').textContent = `Level: ${player.level}`;
  document.getElementById('gameOverLines').textContent = `Lines: ${player.lines}`;
  document.getElementById('gameOverHighScore').textContent = `High Score: ${highScore}`;
  
  const ui = document.querySelector('.ui');
  ui.classList.add('game-over');
  
  const restartBtn = document.getElementById('btnRestart');
  restartBtn.classList.add('active');
  restartBtn.disabled = false;
  
  const pauseBtn = document.getElementById('btnPause');
  pauseBtn.disabled = true;
}

function clearGameOverUI() {
  const overlay = document.getElementById('gameOverOverlay');
  overlay.classList.remove('active');
  
  const ui = document.querySelector('.ui');
  ui.classList.remove('game-over');
  
  const restartBtn = document.getElementById('btnRestart');
  restartBtn.classList.remove('active');
  
  const pauseBtn = document.getElementById('btnPause');
  pauseBtn.disabled = false;
}

// ================= THEME MANAGEMENT =================

function initTheme() {
  const savedTheme = localStorage.getItem('tetrisTheme') || 'dark';
  applyTheme(savedTheme);
  
  // Redraw canvas on theme init
  draw();
}

function applyTheme(theme) {
  const btn = document.getElementById('themeToggle');
  
  if (theme === 'light') {
    document.body.classList.add('light');
    btn.textContent = '☀️';
    btn.title = 'Switch to dark mode';
    localStorage.setItem('tetrisTheme', 'light');
  } else {
    document.body.classList.remove('light');
    btn.textContent = '🌙';
    btn.title = 'Switch to light mode';
    localStorage.setItem('tetrisTheme', 'dark');
  }
  
  // Immediately redraw canvas and preview with new theme
  // This happens without resetting game state
  if (!gameOver && !paused) {
    // Game is running, just redraw current frame
    draw();
    drawNextPreview();
  } else if (!gameOver) {
    // Game is paused, redraw
    draw();
    drawNextPreview();
  } else {
    // Game is over, still redraw
    draw();
    drawNextPreview();
  }
}

function toggleTheme() {
  const currentTheme = document.body.classList.contains('light') ? 'light' : 'dark';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  applyTheme(newTheme);
}

// ================= INITIALIZATION =================

window.addEventListener('DOMContentLoaded', () => {
  loadHighScore();
  initTheme();
  
  // Ensure canvas is initialized with correct theme
  setTimeout(() => {
    draw();
  }, 50);
});

// Make functions available globally for onclick handlers
window.startGame = startGame;
window.restart = restart;
