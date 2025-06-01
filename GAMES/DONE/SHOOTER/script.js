const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const minimapCanvas = document.getElementById('minimap');
const minimapCtx = minimapCanvas.getContext('2d');

// Game state
let gameState = {
  running: true,
  score: 0,
  level: 1,
  enemySpawnRate: 0.02,
  powerUpSpawnRate: 0.005
};

// Input handling
const keys = {};
let mousePos = { x: 0, y: 0 };

// Game objects
let bullets = [];
let enemies = [];
let particles = [];
let powerUps = [];
let explosions = [];

// Player object
const player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  size: 15,
  speed: 5,
  angle: 0,
  health: 100,
  maxHealth: 100,
  fireRate: 8,
  lastShot: 0,
  shield: 0,
  rapidFire: 0,
  damage: 1
};

// Enemy types
const enemyTypes = {
  basic: { size: 12, speed: 1.5, health: 1, color: '#ff4444', points: 10 },
  fast: { size: 8, speed: 3, health: 1, color: '#44ff44', points: 15 },
  tank: { size: 20, speed: 0.8, health: 3, color: '#4444ff', points: 25 },
  chaser: { size: 10, speed: 2, health: 2, color: '#ff44ff', points: 20 }
};

// Power-up types
const powerUpTypes = {
  health: { color: '#00ff00', effect: () => player.health = Math.min(player.maxHealth, player.health + 30) },
  shield: { color: '#00ffff', effect: () => player.shield = 300 },
  rapidFire: { color: '#ffff00', effect: () => player.rapidFire = 300 },
  damage: { color: '#ff8800', effect: () => player.damage = Math.min(3, player.damage + 0.5) }
};

// Event listeners
document.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
document.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  mousePos.x = e.clientX - rect.left;
  mousePos.y = e.clientY - rect.top;
  player.angle = Math.atan2(mousePos.y - player.y, mousePos.x - player.x);
});

canvas.addEventListener('click', () => {
  if (gameState.running) shoot();
});

// Shooting function
function shoot() {
  const now = Date.now();
  const fireDelay = player.rapidFire > 0 ? 50 : 1000 / player.fireRate;
  
  if (now - player.lastShot > fireDelay) {
    bullets.push({
      x: player.x + Math.cos(player.angle) * player.size,
      y: player.y + Math.sin(player.angle) * player.size,
      angle: player.angle,
      speed: 8,
      damage: player.damage,
      size: 3
    });
    player.lastShot = now;
    
    // Muzzle flash particles
    for (let i = 0; i < 5; i++) {
      particles.push({
        x: player.x + Math.cos(player.angle) * player.size,
        y: player.y + Math.sin(player.angle) * player.size,
        vx: Math.cos(player.angle + (Math.random() - 0.5) * 0.5) * 3,
        vy: Math.sin(player.angle + (Math.random() - 0.5) * 0.5) * 3,
        life: 10,
        maxLife: 10,
        color: '#ffaa00'
      });
    }
  }
}

// Spawn enemies
function spawnEnemy() {
  if (Math.random() < gameState.enemySpawnRate) {
    const types = Object.keys(enemyTypes);
    const type = types[Math.floor(Math.random() * types.length)];
    const template = enemyTypes[type];
    
    let x, y;
    if (Math.random() < 0.5) {
      x = Math.random() < 0.5 ? -template.size : canvas.width + template.size;
      y = Math.random() * canvas.height;
    } else {
      x = Math.random() * canvas.width;
      y = Math.random() < 0.5 ? -template.size : canvas.height + template.size;
    }
    
    enemies.push({
      x, y,
      type,
      size: template.size,
      speed: template.speed,
      health: template.health,
      maxHealth: template.health,
      color: template.color,
      points: template.points,
      angle: 0
    });
  }
}

// Spawn power-ups
function spawnPowerUp() {
  if (Math.random() < gameState.powerUpSpawnRate) {
    const types = Object.keys(powerUpTypes);
    const type = types[Math.floor(Math.random() * types.length)];
    
    powerUps.push({
      x: Math.random() * (canvas.width - 40) + 20,
      y: Math.random() * (canvas.height - 40) + 20,
      type,
      size: 12,
      pulse: 0
    });
  }
}

// Create explosion
function createExplosion(x, y, size, color = '#ff4444') {
  for (let i = 0; i < size * 2; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8,
      life: 30,
      maxLife: 30,
      color: color,
      size: Math.random() * 4 + 2
    });
  }
}

// Collision detection
function checkCollision(obj1, obj2) {
  const dx = obj1.x - obj2.x;
  const dy = obj1.y - obj2.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < (obj1.size + obj2.size) / 2;
}

// Update game logic
function update() {
  if (!gameState.running) return;
  
  // Player movement
  let dx = 0, dy = 0;
  if (keys['w'] || keys['arrowup']) dy -= player.speed;
  if (keys['s'] || keys['arrowdown']) dy += player.speed;
  if (keys['a'] || keys['arrowleft']) dx -= player.speed;
  if (keys['d'] || keys['arrowright']) dx += player.speed;
  
  // Normalize diagonal movement
  if (dx !== 0 && dy !== 0) {
    dx *= 0.707;
    dy *= 0.707;
  }
  
  player.x = Math.max(player.size, Math.min(canvas.width - player.size, player.x + dx));
  player.y = Math.max(player.size, Math.min(canvas.height - player.size, player.y + dy));
  
  // Update power-up timers
  if (player.shield > 0) player.shield--;
  if (player.rapidFire > 0) player.rapidFire--;
  
  // Update bullets
  bullets = bullets.filter(bullet => {
    bullet.x += Math.cos(bullet.angle) * bullet.speed;
    bullet.y += Math.sin(bullet.angle) * bullet.speed;
    return bullet.x >= 0 && bullet.x <= canvas.width && bullet.y >= 0 && bullet.y <= canvas.height;
  });
  
  // Update enemies
  enemies.forEach(enemy => {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (enemy.type === 'chaser' && distance > 0) {
      enemy.x += (dx / distance) * enemy.speed;
      enemy.y += (dy / distance) * enemy.speed;
    } else {
      enemy.angle = Math.atan2(dy, dx);
      enemy.x += Math.cos(enemy.angle) * enemy.speed;
      enemy.y += Math.sin(enemy.angle) * enemy.speed;
    }
  });
  
  // Update particles
  particles = particles.filter(particle => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vx *= 0.98;
    particle.vy *= 0.98;
    particle.life--;
    return particle.life > 0;
  });
  
  // Update power-ups
  powerUps.forEach(powerUp => {
    powerUp.pulse += 0.1;
  });
  
  // Bullet-enemy collisions
  bullets.forEach((bullet, bulletIndex) => {
    enemies.forEach((enemy, enemyIndex) => {
      if (checkCollision(bullet, enemy)) {
        enemy.health -= bullet.damage;
        bullets.splice(bulletIndex, 1);
        
        if (enemy.health <= 0) {
          gameState.score += enemy.points;
          createExplosion(enemy.x, enemy.y, enemy.size, enemy.color);
          enemies.splice(enemyIndex, 1);
        } else {
          // Hit particles
          for (let i = 0; i < 3; i++) {
            particles.push({
              x: enemy.x,
              y: enemy.y,
              vx: (Math.random() - 0.5) * 4,
              vy: (Math.random() - 0.5) * 4,
              life: 15,
              maxLife: 15,
              color: enemy.color
            });
          }
        }
      }
    });
  });
  
  // Player-enemy collisions
  enemies.forEach((enemy, index) => {
    if (checkCollision(player, enemy)) {
      if (player.shield <= 0) {
        player.health -= 20;
        createExplosion(player.x, player.y, 10, '#ff0000');
      }
      enemies.splice(index, 1);
    }
  });
  
  // Player-powerup collisions
  powerUps.forEach((powerUp, index) => {
    if (checkCollision(player, powerUp)) {
      powerUpTypes[powerUp.type].effect();
      createExplosion(powerUp.x, powerUp.y, 8, powerUpTypes[powerUp.type].color);
      powerUps.splice(index, 1);
    }
  });
  
  // Spawn enemies and power-ups
  spawnEnemy();
  spawnPowerUp();
  
  // Level progression
  if (gameState.score > gameState.level * 500) {
    gameState.level++;
    gameState.enemySpawnRate = Math.min(0.08, gameState.enemySpawnRate + 0.01);
    player.health = Math.min(player.maxHealth, player.health + 20);
  }
  
  // Check game over
  if (player.health <= 0) {
    gameState.running = false;
    document.getElementById('gameOver').style.display = 'block';
    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('finalLevel').textContent = gameState.level;
  }
}

// Render everything
function draw() {
  // Clear canvas with trail effect
  ctx.fillStyle = 'rgba(26, 26, 46, 0.1)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw particles
  particles.forEach(particle => {
    const alpha = particle.life / particle.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size || 2, 0, Math.PI * 2);
    ctx.fill();
  });
  
  ctx.globalAlpha = 1;
  
  // Draw player
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);
  
  // Shield effect
  if (player.shield > 0) {
    ctx.strokeStyle = `rgba(0, 255, 255, ${player.shield / 300})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, player.size + 5, 0, Math.PI * 2);
    ctx.stroke();
  }
  
  // Player body
  ctx.fillStyle = player.rapidFire > 0 ? '#ffff00' : '#ffffff';
  ctx.fillRect(-player.size / 2, -player.size / 2, player.size, player.size);
  
  // Player cannon
  ctx.fillStyle = '#cccccc';
  ctx.fillRect(0, -2, player.size / 2, 4);
  
  ctx.restore();
  
  // Draw bullets
  ctx.fillStyle = player.damage > 1 ? '#ff8800' : '#ff0000';
  bullets.forEach(bullet => {
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
    ctx.fill();
  });
  
  // Draw enemies
  enemies.forEach(enemy => {
    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
    ctx.fill();
    
    // Health bar for damaged enemies
    if (enemy.health < enemy.maxHealth) {
      ctx.fillStyle = 'red';
      ctx.fillRect(enemy.x - enemy.size, enemy.y - enemy.size - 8, enemy.size * 2, 3);
      ctx.fillStyle = 'green';
      ctx.fillRect(enemy.x - enemy.size, enemy.y - enemy.size - 8, 
                   (enemy.health / enemy.maxHealth) * enemy.size * 2, 3);
    }
  });
  
  // Draw power-ups
  powerUps.forEach(powerUp => {
    const pulseSize = powerUp.size + Math.sin(powerUp.pulse) * 2;
    ctx.fillStyle = powerUpTypes[powerUp.type].color;
    ctx.beginPath();
    ctx.arc(powerUp.x, powerUp.y, pulseSize, 0, Math.PI * 2);
    ctx.fill();
    
    // Power-up symbol
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(powerUp.type[0].toUpperCase(), powerUp.x, powerUp.y + 4);
  });
  
  // Draw health bar
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(10, canvas.height - 30, 204, 20);
  ctx.fillStyle = player.health > 30 ? 'green' : 'red';
  ctx.fillRect(12, canvas.height - 28, (player.health / player.maxHealth) * 200, 16);
  
  // Update UI
  document.getElementById('score').textContent = gameState.score;
  document.getElementById('health').textContent = Math.max(0, player.health);
  document.getElementById('level').textContent = gameState.level;
  document.getElementById('enemies').textContent = enemies.length;
  
  // Draw minimap
  drawMinimap();
}

// Minimap rendering
function drawMinimap() {
  minimapCtx.fillStyle = 'rgba(0,0,0,0.8)';
  minimapCtx.fillRect(0, 0, minimapCanvas.width, minimapCanvas.height);
  
  const scaleX = minimapCanvas.width / canvas.width;
  const scaleY = minimapCanvas.height / canvas.height;
  
  // Player on minimap
  minimapCtx.fillStyle = 'white';
  minimapCtx.beginPath();
  minimapCtx.arc(player.x * scaleX, player.y * scaleY, 3, 0, Math.PI * 2);
  minimapCtx.fill();
  
  // Enemies on minimap
  enemies.forEach(enemy => {
    minimapCtx.fillStyle = enemy.color;
    minimapCtx.beginPath();
    minimapCtx.arc(enemy.x * scaleX, enemy.y * scaleY, 2, 0, Math.PI * 2);
    minimapCtx.fill();
  });
  
  // Power-ups on minimap
  powerUps.forEach(powerUp => {
    minimapCtx.fillStyle = powerUpTypes[powerUp.type].color;
    minimapCtx.beginPath();
    minimapCtx.arc(powerUp.x * scaleX, powerUp.y * scaleY, 2, 0, Math.PI * 2);
    minimapCtx.fill();
  });
}

// Game loop
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// Restart game
function restartGame() {
  gameState = {
    running: true,
    score: 0,
    level: 1,
    enemySpawnRate: 0.02,
    powerUpSpawnRate: 0.005
  };
  
  player.x = canvas.width / 2;
  player.y = canvas.height / 2;
  player.health = 100;
  player.shield = 0;
  player.rapidFire = 0;
  player.damage = 1;
  
  bullets = [];
  enemies = [];
  particles = [];
  powerUps = [];
  
  document.getElementById('gameOver').style.display = 'none';
}

// Start the game
gameLoop();