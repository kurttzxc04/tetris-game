/* ================= THEME ================= */

const themeBtn = document.getElementById("themeToggle");

function applyTheme(theme){
  document.body.classList.toggle("light", theme === "light");
  themeBtn.textContent = theme === "light" ? "☀️" : "🌙";
  localStorage.setItem("theme",""+theme);
}

themeBtn.onclick = () => {
  const next = document.body.classList.contains("light") ? "dark" : "light";
  applyTheme(next);
};

applyTheme(localStorage.getItem("theme") || "dark");

/* ================= GAME ================= */

const COLS=10, ROWS=20, SIZE=24;
const canvas=document.getElementById("tetris");
canvas.width=COLS*SIZE;
canvas.height=ROWS*SIZE;
const ctx=canvas.getContext("2d");

const scoreEl=document.getElementById("score");
const highEl=document.getElementById("highScore");

let highScore=Number(localStorage.getItem("highScore")||0);
highEl.textContent=highScore;

function drawGrid(){
  ctx.strokeStyle=getComputedStyle(document.body).getPropertyValue("--grid");
  for(let x=0;x<COLS;x++)
    for(let y=0;y<ROWS;y++)
      ctx.strokeRect(x*SIZE,y*SIZE,SIZE,SIZE);
}

function draw(){
  ctx.fillStyle=getComputedStyle(document.body).getPropertyValue("--canvas");
  ctx.fillRect(0,0,canvas.width,canvas.height);
  drawGrid();
}

/* ================= SCORE ================= */

let score=0;

function updateScore(){
  scoreEl.textContent=score;
  if(score>highScore){
    highScore=score;
    highEl.textContent=highScore;
    localStorage.setItem("highScore",highScore);
  }
}

draw();
updateScore();
