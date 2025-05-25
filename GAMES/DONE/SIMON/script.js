// Game state
const colors = ["green", "red", "yellow", "blue"];
let sequence = [];
let playerSequence = [];
let level = 1;
let score = 0;
let bestScore = parseInt(localStorage.getItem('simonBestScore') || '0');
let isPlaying = false;
let isPlayerTurn = false;
let difficulty = 'easy';
let soundEnabled = true;

// Difficulty settings
const difficultySettings = {
  easy: { speed: 800, bonus: 10 },
  medium: { speed: 600, bonus: 15 },
  hard: { speed: 400, bonus: 25 }
};

// DOM elements
const buttons = document.querySelectorAll(".btn");
const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");
const levelEl = document.getElementById("level");
const scoreEl = document.getElementById("score");
const bestScoreEl = document.getElementById("bestScore");
const statusEl = document.getElementById("status");
const gameOverEl = document.getElementById("gameOver");
const finalLevelEl = document.getElementById("finalLevel");
const finalScoreEl = document.getElementById("finalScore");
const difficultyBtns = document.querySelectorAll(".difficulty-btn");
const soundToggle = document.getElementById("soundToggle");

// Initialize
init();

function init() {
  bestScoreEl.textContent = bestScore;
  createStars();
  
  // Event listeners
  startBtn.addEventListener("click", startGame);
  resetBtn.addEventListener("click", resetGame);
  buttons.forEach(btn => btn.addEventListener("click", handlePlayerClick));
  difficultyBtns.forEach(btn => btn.addEventListener("click", setDifficulty));
  soundToggle.addEventListener("click", toggleSound);
}

function createStars() {
  const starsContainer = document.querySelector('.stars');
  for (let i = 0; i < 50; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    star.style.left = Math.random() * 100 + '%';
    star.style.top = Math.random() * 100 + '%';
    star.style.animationDelay = Math.random() * 3 + 's';
    starsContainer.appendChild(star);
  }
}

function playSound(frequency, duration = 200) {
  if (!soundEnabled) return;
  
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  oscillator.type = 'sine';
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration / 1000);
}

function getColorFrequency(color) {
  const frequencies = {
    green: 220,
    red: 180,
    yellow: 247,
    blue: 196
  };
  return frequencies[color];
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  soundToggle.textContent = soundEnabled ? '🔊' : '🔇';
}

function setDifficulty(e) {
  if (isPlaying) return;
  
  difficultyBtns.forEach(btn => btn.classList.remove('active'));
  e.target.classList.add('active');
  difficulty = e.target.dataset.difficulty;
}

function startGame() {
  if (isPlaying) return;
  
  isPlaying = true;
  sequence = [];
  level = 1;
  score = 0;
  gameOverEl.style.display = 'none';
  updateUI();
  nextRound();
}

function resetGame() {
  isPlaying = false;
  isPlayerTurn = false;
  sequence = [];
  playerSequence = [];
  level = 1;
  score = 0;
  gameOverEl.style.display = 'none';
  statusEl.textContent = 'Klicke Start um zu beginnen!';
  updateUI();
  enableButtons();
}

function nextRound() {
  if (!isPlaying) return;
  
  playerSequence = [];
  isPlayerTurn = false;
  
  const nextColor = colors[Math.floor(Math.random() * colors.length)];
  sequence.push(nextColor);
  
  statusEl.textContent = `Level ${level} - Merke dir die Sequenz...`;
  
  setTimeout(() => {
    playSequence();
  }, 1000);
}

function playSequence() {
  disableButtons();
  let i = 0;
  
  const interval = setInterval(() => {
    activateButton(sequence[i]);
    i++;
    
    if (i >= sequence.length) {
      clearInterval(interval);
      setTimeout(() => {
        isPlayerTurn = true;
        statusEl.textContent = 'Deine Reihe! Wiederhole die Sequenz.';
        enableButtons();
      }, 500);
    }
  }, difficultySettings[difficulty].speed);
}

function activateButton(color) {
  const btn = document.querySelector(`.btn.${color}`);
  btn.classList.add("active");
  playSound(getColorFrequency(color), 300);
  
  setTimeout(() => {
    btn.classList.remove("active");
  }, 300);
}

function handlePlayerClick(e) {
  if (!isPlayerTurn || !isPlaying) return;
  
  const color = e.target.dataset.color;
  playerSequence.push(color);
  activateButton(color);
  
  const currentIndex = playerSequence.length - 1;
  
  if (playerSequence[currentIndex] !== sequence[currentIndex]) {
    gameOver();
    return;
  }
  
  if (playerSequence.length === sequence.length) {
    isPlayerTurn = false;
    score += difficultySettings[difficulty].bonus * level;
    level++;
    statusEl.textContent = 'Richtig! Nächstes Level...';
    updateUI();
    
    setTimeout(() => {
      nextRound();
    }, 1500);
  }
}

function gameOver() {
  isPlaying = false;
  isPlayerTurn = false;
  
  // Add error animation to all buttons
  buttons.forEach(btn => {
    btn.classList.add('error');
    setTimeout(() => btn.classList.remove('error'), 500);
  });
  
  // Play error sound
  playSound(100, 500);
  
  statusEl.textContent = 'Falsch! Spiel vorbei.';
  
  // Update best score
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('simonBestScore', bestScore.toString());
    bestScoreEl.textContent = bestScore;
  }
  
  // Show game over screen
  finalLevelEl.textContent = level;
  finalScoreEl.textContent = score;
  gameOverEl.style.display = 'block';
  
  disableButtons();
}

function disableButtons() {
  buttons.forEach(btn => btn.disabled = true);
}

function enableButtons() {
  buttons.forEach(btn => btn.disabled = false);
}

function updateUI() {
  levelEl.textContent = level;
  scoreEl.textContent = score;
}