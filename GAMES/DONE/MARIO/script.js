const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const keys = {};

// Game state
let gameState = {
  score: 0,
  coins: 0,
  lives: 3,
  level: 1,
  gameRunning: true,
  cameraX: 0,
  worldWidth: 1800
};

// Audio context for sound effects
let audioContext;
let soundEnabled = true;

// Initialize audio
function initAudio() {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {
    soundEnabled = false;
  }
}

// Simple sound generation
function playSound(frequency, duration, type = 'square') {
  if (!soundEnabled || !audioContext) return;
  
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = frequency;
  oscillator.type = type;
  
  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
}

document.addEventListener("keydown", (e) => {
  keys[e.key.toLowerCase()] = true;
  if (e.key.toLowerCase() === 'm') {
    soundEnabled = !soundEnabled;
  }
});
document.addEventListener("keyup", (e) => keys[e.key.toLowerCase()] = false);

// Click to start audio context
document.addEventListener('click', () => {
  if (!audioContext) initAudio();
}, { once: true });

const gravity = 0.5;
const friction = 0.8;

const player = {
  x: 100, y: 300, width: 32, height: 32,
  vx: 0, vy: 0, speed: 4, jump: -12, 
  grounded: false, ducking: false,
  powerUp: 'small', // small, big, fire
  invulnerable: 0,
  animFrame: 0,
  direction: 1
};

// Particle system
const particles = [];

function createParticle(x, y, color, vx = 0, vy = 0) {
  particles.push({
    x, y, vx, vy,
    color, life: 30,
    maxLife: 30
  });
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.2; // gravity
    p.life--;
    
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function drawParticles() {
  particles.forEach(p => {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - gameState.cameraX, p.y, 3, 3);
    ctx.globalAlpha = 1;
  });
}

// Game objects
const collectibles = [];
const powerUps = [];

// Level data
const levels = [
  {
    platforms: [
      { x: 0, y: 460, width: 900, height: 40 },
      { x: 900, y: 460, width: 900, height: 40 },
      { x: 200, y: 380, width: 120, height: 20 },
      { x: 400, y: 320, width: 80, height: 20 },
      { x: 600, y: 280, width: 120, height: 20 },
      { x: 800, y: 220, width: 80, height: 20 },
      { x: 1000, y: 180, width: 120, height: 20 },
      { x: 1200, y: 240, width: 100, height: 20 },
      { x: 1400, y: 300, width: 80, height: 20 },
      { x: 1600, y: 200, width: 60, height: 20 },
      { x: 1700, y: 150, width: 60, height: 60, isFlag: true },
    ],
    enemies: [
      { x: 300, y: 420, width: 32, height: 32, dir: 1, type: 'goomba' },
      { x: 500, y: 420, width: 32, height: 32, dir: -1, type: 'goomba' },
      { x: 1100, y: 420, width: 32, height: 32, dir: 1, type: 'goomba' },
      { x: 1300, y: 420, width: 32, height: 32, dir: -1, type: 'koopa' },
    ],
    coins: [
      { x: 250, y: 340, collected: false },
      { x: 450, y: 280, collected: false },
      { x: 650, y: 240, collected: false },
      { x: 1050, y: 140, collected: false },
      { x: 1250, y: 200, collected: false },
    ],
    powerUps: [
      { x: 850, y: 180, type: 'mushroom', collected: false },
    ]
  }
];

let currentLevel = levels[0];

function resetLevel() {
  player.x = 100;
  player.y = 300;
  player.vx = 0;
  player.vy = 0;
  player.powerUp = 'small';
  player.invulnerable = 0;
  gameState.cameraX = 0;
  
  // Reset collectibles
  currentLevel.coins.forEach(coin => coin.collected = false);
  currentLevel.powerUps.forEach(powerUp => powerUp.collected = false);
  
  particles.length = 0;
}

function drawRect(obj, color, offsetX = 0) {
  ctx.fillStyle = color;
  ctx.fillRect(obj.x - gameState.cameraX + offsetX, obj.y, obj.width, obj.height);
}

function drawPlayer() {
  // Invulnerability flashing
  if (player.invulnerable > 0 && Math.floor(player.invulnerable / 5) % 2) {
    return;
  }
  
  const x = player.x - gameState.cameraX;
  const y = player.y;
  
  // Player body
  if (player.powerUp === 'small') {
    ctx.fillStyle = player.ducking ? '#8B4513' : '#FF4444';
    ctx.fillRect(x, y, player.width, player.height);
  } else {
    ctx.fillStyle = player.powerUp === 'fire' ? '#FF8C00' : '#FF4444';
    ctx.fillRect(x, y, player.width, player.height + 16);
  }
  
  // Simple face
  ctx.fillStyle = '#FFE4B5';
  ctx.fillRect(x + 8, y + 6, 16, 12);
  
  // Eyes
  ctx.fillStyle = 'black';
  ctx.fillRect(x + 10, y + 8, 2, 2);
  ctx.fillRect(x + 20, y + 8, 2, 2);
  
  // Mustache
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(x + 12, y + 12, 8, 3);
}

function drawEnemies() {
  currentLevel.enemies.forEach(enemy => {
    const x = enemy.x - gameState.cameraX;
    const y = enemy.y;
    
    if (enemy.type === 'goomba') {
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(x, y, enemy.width, enemy.height);
      // Eyes
      ctx.fillStyle = 'white';
      ctx.fillRect(x + 6, y + 8, 4, 4);
      ctx.fillRect(x + 22, y + 8, 4, 4);
      ctx.fillStyle = 'black';
      ctx.fillRect(x + 8, y + 10, 2, 2);
      ctx.fillRect(x + 24, y + 10, 2, 2);
    } else if (enemy.type === 'koopa') {
      ctx.fillStyle = '#228B22';
      ctx.fillRect(x, y, enemy.width, enemy.height);
      // Shell pattern
      ctx.fillStyle = '#32CD32';
      ctx.fillRect(x + 4, y + 4, enemy.width - 8, enemy.height - 8);
    }
  });
}

function drawCoins() {
  currentLevel.coins.forEach(coin => {
    if (!coin.collected) {
      const x = coin.x - gameState.cameraX;
      const y = coin.y;
      
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(x + 8, y + 8, 8, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#FFA500';
      ctx.beginPath();
      ctx.arc(x + 8, y + 8, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function drawPowerUps() {
  currentLevel.powerUps.forEach(powerUp => {
    if (!powerUp.collected) {
      const x = powerUp.x - gameState.cameraX;
      const y = powerUp.y;
      
      if (powerUp.type === 'mushroom') {
        ctx.fillStyle = '#FF4444';
        ctx.fillRect(x, y, 16, 16);
        ctx.fillStyle = 'white';
        ctx.fillRect(x + 2, y + 2, 4, 4);
        ctx.fillRect(x + 10, y + 2, 4, 4);
        ctx.fillRect(x + 6, y + 8, 4, 4);
      }
    }
  });
}

function drawBackground() {
  // Clouds
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  for (let i = 0; i < 5; i++) {
    const x = (i * 300 + 100) - (gameState.cameraX * 0.3);
    const y = 80 + Math.sin(i) * 20;
    
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.arc(x + 25, y, 25, 0, Math.PI * 2);
    ctx.arc(x + 50, y, 20, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Hills
  ctx.fillStyle = 'rgba(34, 139, 34, 0.6)';
  for (let i = 0; i < 8; i++) {
    const x = (i * 200) - (gameState.cameraX * 0.5);
    const y = 350;
    
    ctx.beginPath();
    ctx.arc(x, y, 60, 0, Math.PI, false);
    ctx.fill();
  }
}

function updateCamera() {
  const targetX = player.x - canvas.width / 3;
  gameState.cameraX = Math.max(0, Math.min(targetX, gameState.worldWidth - canvas.width));
}

function updatePlayer() {
  // Movement
  if (keys["a"] || keys["arrowleft"]) {
    player.vx = Math.max(player.vx - 0.5, -player.speed);
    player.direction = -1;
  } else if (keys["d"] || keys["arrowright"]) {
    player.vx = Math.min(player.vx + 0.5, player.speed);
    player.direction = 1;
  } else {
    player.vx *= friction;
  }
  
  // Ducking
  player.ducking = keys["s"] || keys["arrowdown"];
  
  // Jumping
  if ((keys["w"] || keys[" "] || keys["arrowup"]) && player.grounded) {
    player.vy = player.jump;
    player.grounded = false;
    playSound(220, 0.1);
  }
  
  // Apply gravity
  player.vy += gravity;
  
  // Update position
  player.x += player.vx;
  player.y += player.vy;
  
  // Update invulnerability
  if (player.invulnerable > 0) {
    player.invulnerable--;
  }
  
  // Platform collision
  player.grounded = false;
  currentLevel.platforms.forEach(platform => {
    if (player.x < platform.x + platform.width &&
        player.x + player.width > platform.x &&
        player.y + player.height < platform.y + 10 &&
        player.y + player.height + player.vy >= platform.y) {
      
      player.y = platform.y - player.height;
      player.vy = 0;
      player.grounded = true;
      
      if (platform.isFlag) {
        playSound(440, 0.5);
        gameState.score += 1000;
        gameState.level++;
        alert("🎉 Level Complete! Next level coming soon...");
        resetLevel();
      }
    }
  });
  
  // World boundaries
  if (player.x < 0) player.x = 0;
  
  // Death
  if (player.y > canvas.height) {
    playSound(150, 1);
    gameState.lives--;
    if (gameState.lives <= 0) {
      alert("💀 Game Over! Final Score: " + gameState.score);
      location.reload();
    } else {
      resetLevel();
    }
  }
}

function updateEnemies() {
  currentLevel.enemies.forEach((enemy, enemyIndex) => {
    enemy.x += enemy.dir * (enemy.type === 'koopa' ? 1.5 : 1);
    
    // Boundary checking
    if (enemy.x < 50 || enemy.x > gameState.worldWidth - 100) {
      enemy.dir *= -1;
    }
    
    // Platform edge detection
    let onPlatform = false;
    currentLevel.platforms.forEach(platform => {
      if (enemy.x + enemy.width/2 > platform.x && 
          enemy.x + enemy.width/2 < platform.x + platform.width &&
          enemy.y + enemy.height >= platform.y - 5 &&
          enemy.y + enemy.height <= platform.y + 5) {
        onPlatform = true;
      }
    });
    
    if (!onPlatform && enemy.y < 400) {
      enemy.dir *= -1;
    }
    
    // Player collision
    if (player.invulnerable === 0 &&
        player.x < enemy.x + enemy.width &&
        player.x + player.width > enemy.x &&
        player.y < enemy.y + enemy.height &&
        player.y + player.height > enemy.y) {
      
      // Check if player is jumping on enemy
      if (player.vy > 0 && player.y + player.height - enemy.y < 15) {
        // Destroy enemy
        playSound(330, 0.2);
        gameState.score += 100;
        
        // Create particles
        for (let i = 0; i < 8; i++) {
          createParticle(
            enemy.x + enemy.width/2,
            enemy.y + enemy.height/2,
            '#8B4513',
            (Math.random() - 0.5) * 4,
            -Math.random() * 3
          );
        }
        
        currentLevel.enemies.splice(enemyIndex, 1);
        player.vy = player.jump / 2;
      } else {
        // Player hit
        playSound(150, 0.5);
        if (player.powerUp !== 'small') {
          player.powerUp = 'small';
          player.invulnerable = 120;
        } else {
          gameState.lives--;
          if (gameState.lives <= 0) {
            alert("💀 Game Over! Final Score: " + gameState.score);
            location.reload();
          } else {
            player.invulnerable = 120;
            resetLevel();
          }
        }
      }
    }
  });
}

function updateCollectibles() {
  // Coins
  currentLevel.coins.forEach(coin => {
    if (!coin.collected &&
        player.x < coin.x + 16 &&
        player.x + player.width > coin.x &&
        player.y < coin.y + 16 &&
        player.y + player.height > coin.y) {
      
      coin.collected = true;
      gameState.coins++;
      gameState.score += 50;
      playSound(520, 0.1);
      
      // Coin particles
      for (let i = 0; i < 5; i++) {
        createParticle(
          coin.x + 8,
          coin.y + 8,
          '#FFD700',
          (Math.random() - 0.5) * 2,
          -Math.random() * 2
        );
      }
    }
  });
  
  // Power-ups
  currentLevel.powerUps.forEach(powerUp => {
    if (!powerUp.collected &&
        player.x < powerUp.x + 16 &&
        player.x + player.width > powerUp.x &&
        player.y < powerUp.y + 16 &&
        player.y + player.height > powerUp.y) {
      
      powerUp.collected = true;
      gameState.score += 200;
      playSound(440, 0.3);
      
      if (powerUp.type === 'mushroom') {
        if (player.powerUp === 'small') {
          player.powerUp = 'big';
          player.height = 48;
        }
      }
    }
  });
}

function updateUI() {
  document.getElementById('score').textContent = gameState.score;
  document.getElementById('coins').textContent = gameState.coins;
  document.getElementById('lives').textContent = gameState.lives;
  document.getElementById('level').textContent = gameState.level;
}

function draw() {
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw background
  drawBackground();
  
  // Draw platforms
  currentLevel.platforms.forEach(platform => {
    drawRect(platform, platform.isFlag ? '#FFD700' : '#8B4513');
    
    if (platform.isFlag) {
      // Flag pole
      ctx.fillStyle = '#654321';
      ctx.fillRect(platform.x - gameState.cameraX + platform.width/2 - 2, platform.y - 200, 4, 200);
      
      // Flag
      ctx.fillStyle = '#FF0000';
      ctx.fillRect(platform.x - gameState.cameraX + platform.width/2 + 2, platform.y - 180, 30, 20);
    }
  });
  
  // Draw game objects
  drawCoins();
  drawPowerUps();
  drawEnemies();
  drawPlayer();
  drawParticles();
  
  // Draw UI elements
  updateUI();
}

function gameLoop() {
  if (!gameState.gameRunning) return;
  
  updatePlayer();
  updateEnemies();
  updateCollectibles();
  updateParticles();
  updateCamera();
  draw();
  
  requestAnimationFrame(gameLoop);
}

// Initialize game
resetLevel();
gameLoop();

// Start message
setTimeout(() => {
  alert("🎮 Super Mario!\n\nControls:\nA/D or Arrow Keys - Move\nW/Space/Up - Jump\nS/Down - Duck\nM - Toggle Sound\n\nCollect coins and reach the flag!");
}, 500);