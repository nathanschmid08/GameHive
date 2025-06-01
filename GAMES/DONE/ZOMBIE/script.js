const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// Game state
let gameRunning = true;
let lastShot = 0;
let waveStartTime = Date.now();
let totalZombiesKilled = 0;
let backgroundOffset = 0;

// Game variables
const keys = {};
const bullets = [];
const zombies = [];
const powerUps = [];
const particles = [];
const bloodSplatters = [];
let score = 0;
let wave = 1;
let zombiesKilledThisWave = 0;
let zombiesPerWave = 5;

// Player object
const player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  size: 25,
  speed: 5,
  angle: 0,
  health: 100,
  maxHealth: 100,
  weapon: 'pistol',
  fireRate: 200,
  damage: 1,
  invulnerable: 0,
  walkCycle: 0
};

// Weapon stats
const weapons = {
  pistol: { fireRate: 200, damage: 1, name: 'Pistol', color: '#ffff00', sound: 400 },
  shotgun: { fireRate: 600, damage: 3, name: 'Shotgun', color: '#ff8800', spread: true, sound: 300 },
  machinegun: { fireRate: 100, damage: 1, name: 'Machine Gun', color: '#ff0000', sound: 450 },
  sniper: { fireRate: 800, damage: 5, name: 'Sniper', color: '#00ffff', sound: 500 },
  plasma: { fireRate: 150, damage: 2, name: 'Plasma Gun', color: '#00ff00', sound: 600 }
};

// Sound effects
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playSound(frequency, duration, type = 'sine', volume = 0.1) {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = frequency;
  oscillator.type = type;
  
  gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
}

// Input handling
document.addEventListener("keydown", (e) => {
  keys[e.key.toLowerCase()] = true;
  if (!gameRunning && e.key === ' ') restartGame();
});
document.addEventListener("keyup", (e) => keys[e.key.toLowerCase()] = false);

let mouseX = 0, mouseY = 0;
canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
  player.angle = Math.atan2(mouseY - player.y, mouseX - player.x);
});

canvas.addEventListener("mousedown", () => {
  if (gameRunning) shoot();
});

function shoot() {
  const now = Date.now();
  if (now - lastShot < weapons[player.weapon].fireRate) return;
  
  lastShot = now;
  const weapon = weapons[player.weapon];
  
  playSound(weapon.sound + Math.random() * 100, 0.1, 'square', 0.05);
  
  if (weapon.spread) {
    // Shotgun spread
    for (let i = 0; i < 5; i++) {
      const spreadAngle = player.angle + (Math.random() - 0.5) * 0.8;
      bullets.push({
        x: player.x + Math.cos(player.angle) * player.size,
        y: player.y + Math.sin(player.angle) * player.size,
        angle: spreadAngle,
        speed: 12,
        damage: weapon.damage,
        color: weapon.color,
        size: 4,
        trail: []
      });
    }
  } else {
    bullets.push({
      x: player.x + Math.cos(player.angle) * player.size,
      y: player.y + Math.sin(player.angle) * player.size,
      angle: player.angle,
      speed: weapon.name === 'Sniper' ? 20 : 15,
      damage: weapon.damage,
      color: weapon.color,
      size: weapon.name === 'Sniper' ? 6 : 5,
      trail: []
    });
  }
  
  // Muzzle flash particles
  for (let i = 0; i < 12; i++) {
    particles.push({
      x: player.x + Math.cos(player.angle) * player.size,
      y: player.y + Math.sin(player.angle) * player.size,
      vx: Math.cos(player.angle + (Math.random() - 0.5) * 0.8) * (4 + Math.random() * 6),
      vy: Math.sin(player.angle + (Math.random() - 0.5) * 0.8) * (4 + Math.random() * 6),
      life: 0.4,
      maxLife: 0.4,
      color: '#ffaa00',
      size: 2 + Math.random() * 3
    });
  }
}

function spawnZombie() {
  const edge = Math.floor(Math.random() * 4);
  let x, y;
  const margin = 50;
  
  if (edge === 0) { x = -margin; y = Math.random() * canvas.height; }
  else if (edge === 1) { x = canvas.width + margin; y = Math.random() * canvas.height; }
  else if (edge === 2) { x = Math.random() * canvas.width; y = -margin; }
  else { x = Math.random() * canvas.width; y = canvas.height + margin; }

  const zombieType = Math.random();
  let zombie;
  
  if (zombieType < 0.6) {
    // Regular zombie
    zombie = { 
      x, y, size: 30, speed: 0.8 + Math.random() * 0.4 + wave * 0.08, 
      hp: 2 + Math.floor(wave / 3), maxHp: 2 + Math.floor(wave / 3),
      type: 'regular', damage: 15, walkCycle: Math.random() * Math.PI * 2,
      color: { skin: '#8B9467', clothes: '#4A4A4A', blood: '#8B0000' }
    };
  } else if (zombieType < 0.85) {
    // Fast zombie (runner)
    zombie = { 
      x, y, size: 25, speed: 2.2 + wave * 0.12, 
      hp: 1, maxHp: 1,
      type: 'fast', damage: 20, walkCycle: Math.random() * Math.PI * 2,
      color: { skin: '#A0A068', clothes: '#6B4423', blood: '#8B0000' }
    };
  } else {
    // Tank zombie (brute)
    zombie = { 
      x, y, size: 40, speed: 0.6 + wave * 0.04, 
      hp: 6 + Math.floor(wave / 2), maxHp: 6 + Math.floor(wave / 2),
      type: 'tank', damage: 35, walkCycle: Math.random() * Math.PI * 2,
      color: { skin: '#7A8B5A', clothes: '#2F2F2F', blood: '#8B0000' }
    };
  }
  
  zombies.push(zombie);
}

function spawnPowerUp(x, y) {
  if (Math.random() < 0.25) {
    const types = ['health', 'weapon', 'speed', 'damage'];
    const type = types[Math.floor(Math.random() * types.length)];
    powerUps.push({
      x, y, type, size: 20,
      collected: false,
      pulseTime: 0,
      bobOffset: Math.random() * Math.PI * 2
    });
  }
}

function createBloodSplatter(x, y, size = 1) {
  bloodSplatters.push({
    x: x + (Math.random() - 0.5) * 10,
    y: y + (Math.random() - 0.5) * 10,
    size: 3 + Math.random() * 5 * size,
    alpha: 0.8,
    fadeRate: 0.005
  });
  
  // Blood particles
  for (let i = 0; i < 8; i++) {
    particles.push({
      x: x + (Math.random() - 0.5) * 15,
      y: y + (Math.random() - 0.5) * 15,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      life: 0.6 + Math.random() * 0.4,
      maxLife: 0.6 + Math.random() * 0.4,
      color: '#8B0000',
      size: 2 + Math.random() * 3
    });
  }
}

function createExplosion(x, y, color = '#ff4400') {
  for (let i = 0; i < 20; i++) {
    particles.push({
      x: x + (Math.random() - 0.5) * 20,
      y: y + (Math.random() - 0.5) * 20,
      vx: (Math.random() - 0.5) * 10,
      vy: (Math.random() - 0.5) * 10,
      life: 0.6 + Math.random() * 0.6,
      maxLife: 0.6 + Math.random() * 0.6,
      color: color,
      size: 3 + Math.random() * 4
    });
  }
}

function drawZombie(zombie) {
  ctx.save();
  ctx.translate(zombie.x, zombie.y);
  
  // Update walk cycle
  zombie.walkCycle += zombie.speed * 0.3;
  const walkOffset = Math.sin(zombie.walkCycle) * 2;
  
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(0, zombie.size/2 + 2, zombie.size/2.5, zombie.size/6, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Body
  ctx.fillStyle = zombie.color.clothes;
  ctx.fillRect(-zombie.size/3, -zombie.size/4, zombie.size/1.5, zombie.size/1.2);
  
  // Arms (swaying)
  const armSwing = Math.sin(zombie.walkCycle) * 0.3;
  ctx.strokeStyle = zombie.color.skin;
  ctx.lineWidth = 4;
  
  // Left arm
  ctx.beginPath();
  ctx.moveTo(-zombie.size/3, -zombie.size/6);
  ctx.lineTo(-zombie.size/2 + Math.cos(armSwing) * 8, zombie.size/6 + Math.sin(armSwing) * 5);
  ctx.stroke();
  
  // Right arm
  ctx.beginPath();
  ctx.moveTo(zombie.size/3, -zombie.size/6);
  ctx.lineTo(zombie.size/2 + Math.cos(-armSwing) * 8, zombie.size/6 + Math.sin(-armSwing) * 5);
  ctx.stroke();
  
  // Legs (walking animation)
  ctx.lineWidth = 5;
  const legOffset = Math.sin(zombie.walkCycle) * 0.4;
  
  // Left leg
  ctx.beginPath();
  ctx.moveTo(-zombie.size/6, zombie.size/3);
  ctx.lineTo(-zombie.size/6 + Math.cos(legOffset) * 6, zombie.size/2 + walkOffset + Math.abs(Math.sin(legOffset)) * 3);
  ctx.stroke();
  
  // Right leg
  ctx.beginPath();
  ctx.moveTo(zombie.size/6, zombie.size/3);
  ctx.lineTo(zombie.size/6 + Math.cos(-legOffset) * 6, zombie.size/2 + walkOffset + Math.abs(Math.sin(-legOffset)) * 3);
  ctx.stroke();
  
  // Head
  ctx.fillStyle = zombie.color.skin;
  ctx.beginPath();
  ctx.arc(0, -zombie.size/2.5, zombie.size/4, 0, Math.PI * 2);
  ctx.fill();
  
  // Eyes (glowing red)
  ctx.fillStyle = '#ff0000';
  ctx.shadowColor = '#ff0000';
  ctx.shadowBlur = 3;
  ctx.beginPath();
  ctx.arc(-zombie.size/8, -zombie.size/2.5, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(zombie.size/8, -zombie.size/2.5, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  
  // Mouth (open, showing teeth)
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(0, -zombie.size/2.8, zombie.size/12, 0, Math.PI);
  ctx.fill();
  
  // Teeth
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(-zombie.size/15 + i * zombie.size/20, -zombie.size/2.8, 2, 4);
  }
  
  // Wounds/scratches based on damage taken
  if (zombie.hp < zombie.maxHp) {
    ctx.fillStyle = zombie.color.blood;
    const wounds = zombie.maxHp - zombie.hp;
    for (let i = 0; i < wounds; i++) {
      const woundX = (Math.random() - 0.5) * zombie.size/2;
      const woundY = (Math.random() - 0.5) * zombie.size/2;
      ctx.fillRect(woundX, woundY, 3, 8);
    }
  }
  
  ctx.restore();
  
  // Health bar for damaged zombies
  if (zombie.hp < zombie.maxHp) {
    const barWidth = zombie.size;
    const barHeight = 4;
    const healthPercent = zombie.hp / zombie.maxHp;
    
    ctx.fillStyle = '#333';
    ctx.fillRect(zombie.x - barWidth/2, zombie.y - zombie.size/2 - 15, barWidth, barHeight);
    
    ctx.fillStyle = healthPercent > 0.6 ? '#00ff00' : healthPercent > 0.3 ? '#ffff00' : '#ff0000';
    ctx.fillRect(zombie.x - barWidth/2, zombie.y - zombie.size/2 - 15, barWidth * healthPercent, barHeight);
  }
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);
  
  // Player movement animation
  if (keys["w"] || keys["s"] || keys["a"] || keys["d"] || 
      keys["arrowup"] || keys["arrowdown"] || keys["arrowleft"] || keys["arrowright"]) {
    player.walkCycle += 0.3;
  }
  
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(0, player.size/2 + 2, player.size/2.5, player.size/6, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Invulnerability flash
  if (player.invulnerable > 0 && Math.floor(player.invulnerable / 5) % 2) {
    ctx.globalAlpha = 0.5;
  }
  
  // Body
  ctx.fillStyle = "#1a5490";
  ctx.fillRect(-player.size/3, -player.size/4, player.size/1.5, player.size/1.2);
  
  // Arms
  ctx.strokeStyle = "#fdbcb4";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-player.size/3, -player.size/6);
  ctx.lineTo(-player.size/2, player.size/6);
  ctx.moveTo(player.size/3, -player.size/6);
  ctx.lineTo(player.size/2, player.size/6);
  ctx.stroke();
  
  // Legs
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#2c5aa0";
  const legAnimation = Math.sin(player.walkCycle) * 0.3;
  ctx.beginPath();
  ctx.moveTo(-player.size/6, player.size/3);
  ctx.lineTo(-player.size/6 + Math.cos(legAnimation) * 4, player.size/2);
  ctx.moveTo(player.size/6, player.size/3);
  ctx.lineTo(player.size/6 + Math.cos(-legAnimation) * 4, player.size/2);
  ctx.stroke();
  
  // Head
  ctx.fillStyle = "#fdbcb4";
  ctx.beginPath();
  ctx.arc(0, -player.size/2.5, player.size/4, 0, Math.PI * 2);
  ctx.fill();
  
  // Eyes
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(-player.size/12, -player.size/2.5, 1.5, 0, Math.PI * 2);
  ctx.arc(player.size/12, -player.size/2.5, 1.5, 0, Math.PI * 2);
  ctx.fill();
  
  // Weapon
  ctx.fillStyle = weapons[player.weapon].color;
  ctx.shadowColor = weapons[player.weapon].color;
  ctx.shadowBlur = 5;
  ctx.fillRect(player.size/3, -3, player.size/1.5, 6);
  ctx.shadowBlur = 0;
  
  ctx.restore();
}

function update() {
  if (!gameRunning) return;
  
  // Scroll background
  backgroundOffset += 0.5;
  
  // Player movement
  const prevX = player.x, prevY = player.y;
  
  if (keys["w"] || keys["arrowup"]) player.y -= player.speed;
  if (keys["s"] || keys["arrowdown"]) player.y += player.speed;
  if (keys["a"] || keys["arrowleft"]) player.x -= player.speed;
  if (keys["d"] || keys["arrowright"]) player.x += player.speed;
  
  // Keep player in bounds
  player.x = Math.max(player.size/2, Math.min(canvas.width - player.size/2, player.x));
  player.y = Math.max(player.size/2, Math.min(canvas.height - player.size/2, player.y));
  
  // Update invulnerability
  if (player.invulnerable > 0) player.invulnerable--;

  // Update bullets with trails
  bullets.forEach((b, index) => {
    // Add to trail
    b.trail.push({x: b.x, y: b.y});
    if (b.trail.length > 8) b.trail.shift();
    
    b.x += Math.cos(b.angle) * b.speed;
    b.y += Math.sin(b.angle) * b.speed;
    
    if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) {
      bullets.splice(index, 1);
    }
  });

  // Update zombies
  zombies.forEach(zombie => {
    const dx = player.x - zombie.x;
    const dy = player.y - zombie.y;
    const distance = Math.hypot(dx, dy);
    
    if (distance > 0) {
      zombie.x += (dx / distance) * zombie.speed;
      zombie.y += (dy / distance) * zombie.speed;
    }
  });

  // Update particles
  particles.forEach((particle, index) => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.life -= 0.016;
    particle.vx *= 0.98;
    particle.vy *= 0.98;
    
    if (particle.life <= 0) {
      particles.splice(index, 1);
    }
  });

  // Update blood splatters
  bloodSplatters.forEach((splatter, index) => {
    splatter.alpha -= splatter.fadeRate;
    if (splatter.alpha <= 0) {
      bloodSplatters.splice(index, 1);
    }
  });

  // Update power-ups
  powerUps.forEach(powerUp => {
    powerUp.pulseTime += 0.1;
    powerUp.bobOffset += 0.05;
  });

  // Bullet vs Zombie collision
  bullets.forEach((bullet, bulletIndex) => {
    zombies.forEach((zombie, zombieIndex) => {
      const dx = bullet.x - zombie.x;
      const dy = bullet.y - zombie.y;
      const distance = Math.hypot(dx, dy);
      
      if (distance < zombie.size / 2 + bullet.size) {
        zombie.hp -= bullet.damage;
        bullets.splice(bulletIndex, 1);
        
        createBloodSplatter(zombie.x, zombie.y);
        playSound(250, 0.1, 'sawtooth', 0.03);
        
        if (zombie.hp <= 0) {
          createExplosion(zombie.x, zombie.y, '#8B0000');
          createBloodSplatter(zombie.x, zombie.y, 2);
          spawnPowerUp(zombie.x, zombie.y);
          playSound(150, 0.3, 'sawtooth', 0.05);
          
          score += zombie.type === 'tank' ? 300 : zombie.type === 'fast' ? 150 : 100;
          zombiesKilledThisWave++;
          totalZombiesKilled++;
          zombies.splice(zombieIndex, 1);
        }
      }
    });
  });

  // Player vs Zombie collision
  if (player.invulnerable === 0) {
    zombies.forEach(zombie => {
      const distance = Math.hypot(zombie.x - player.x, zombie.y - player.y);
      if (distance < zombie.size / 2 + player.size / 2) {
        player.health -= zombie.damage;
        player.invulnerable = 90;
        playSound(100, 0.4, 'sawtooth', 0.1);
        
        // Screen shake effect
        canvas.style.transform = `translate(${(Math.random() - 0.5) * 10}px, ${(Math.random() - 0.5) * 10}px)`;
        setTimeout(() => canvas.style.transform = '', 100);
        
        if (player.health <= 0) {
          gameOver();
        }
      }
    });
  }

  // Player vs PowerUp collision
  powerUps.forEach((powerUp, index) => {
    const distance = Math.hypot(powerUp.x - player.x, powerUp.y - player.y);
    if (distance < powerUp.size + player.size / 2) {
      collectPowerUp(powerUp);
      powerUps.splice(index, 1);
    }
  });

  // Wave management
  if (zombiesKilledThisWave >= zombiesPerWave && zombies.length === 0) {
    wave++;
    zombiesKilledThisWave = 0;
    zombiesPerWave += 3;
    playSound(800, 0.8, 'sine', 0.08);
    
    // Wave completion bonus
    score += wave * 500;
    
    // Heal player slightly
    player.health = Math.min(player.maxHealth, player.health + 10);
  }

  // Spawn zombies
  const maxZombies = Math.min(wave * 2 + 5, 25);
  if (zombies.length < maxZombies) {
    if (Math.random() < 0.015 + wave * 0.003) {
      spawnZombie();
    }
  }

  updateHUD();
}

function collectPowerUp(powerUp) {
  playSound(650, 0.4, 'sine', 0.06);
  
  switch (powerUp.type) {
    case 'health':
      player.health = Math.min(player.maxHealth, player.health + 40);
      break;
    case 'weapon':
      const weaponNames = Object.keys(weapons);
      const currentIndex = weaponNames.indexOf(player.weapon);
      const nextIndex = (currentIndex + 1) % weaponNames.length;
      player.weapon = weaponNames[nextIndex];
      break;
    case 'speed':
      player.speed = Math.min(8, player.speed + 0.3);
      break;
    case 'damage':
      // Temporary damage boost
      Object.keys(weapons).forEach(w => weapons[w].damage += 1);
      setTimeout(() => {
        Object.keys(weapons).forEach(w => weapons[w].damage = Math.max(1, weapons[w].damage - 1));
      }, 15000);
      break;
  }
}
function draw() {
  // Animated background
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(0.5, '#16213e');
  gradient.addColorStop(1, '#0f3460');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Background pattern (scrolling)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  for (let x = (backgroundOffset % 50) - 50; x < canvas.width + 50; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = (backgroundOffset % 50) - 50; y < canvas.height + 50; y += 50) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Draw blood splatters
  bloodSplatters.forEach(splatter => {
    ctx.globalAlpha = splatter.alpha;
    ctx.fillStyle = '#8B0000';
    ctx.beginPath();
    ctx.arc(splatter.x, splatter.y, splatter.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });

  // Draw power-ups
  powerUps.forEach(powerUp => {
    const pulse = 1 + Math.sin(powerUp.pulseTime) * 0.3;
    const bob = Math.sin(powerUp.bobOffset) * 3;
    
    ctx.save();
    ctx.translate(powerUp.x, powerUp.y + bob);
    ctx.scale(pulse, pulse);
    
    // Glow effect
    ctx.shadowBlur = 15;
    ctx.shadowColor = getPowerUpColor(powerUp.type);
    
    ctx.fillStyle = getPowerUpColor(powerUp.type);
    ctx.beginPath();
    ctx.arc(0, 0, powerUp.size, 0, Math.PI * 2);
    ctx.fill();
    
    // Icon
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(getPowerUpIcon(powerUp.type), 0, 5);
    
    ctx.restore();
  });

  // Draw bullets with trails
  bullets.forEach(bullet => {
    // Trail
    ctx.strokeStyle = bullet.color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    bullet.trail.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
    ctx.globalAlpha = 1;
    
    // Bullet
    ctx.fillStyle = bullet.color;
    ctx.shadowBlur = 8;
    ctx.shadowColor = bullet.color;
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  // Draw zombies
  zombies.forEach(drawZombie);

  // Draw player
  drawPlayer();

  // Draw particles
  particles.forEach(particle => {
    const alpha = particle.life / particle.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });

  // Health bar
  const healthBarWidth = 200;
  const healthBarHeight = 20;
  const healthPercent = player.health / player.maxHealth;
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(10, canvas.height - 40, healthBarWidth, healthBarHeight);
  
  ctx.fillStyle = healthPercent > 0.6 ? '#00ff00' : healthPercent > 0.3 ? '#ffff00' : '#ff0000';
  ctx.fillRect(10, canvas.height - 40, healthBarWidth * healthPercent, healthBarHeight);
  
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, canvas.height - 40, healthBarWidth, healthBarHeight);
}

function getPowerUpColor(type) {
  switch (type) {
    case 'health': return '#00ff00';
    case 'weapon': return '#ffff00';
    case 'speed': return '#00ffff';
    case 'damage': return '#ff8800';
    default: return '#ffffff';
  }
}

function getPowerUpIcon(type) {
  switch (type) {
    case 'health': return '+';
    case 'weapon': return '🔫';
    case 'speed': return '⚡';
    case 'damage': return '💥';
    default: return '?';
  }
}

function updateHUD() {
  document.getElementById('score').textContent = score;
  document.getElementById('health').textContent = Math.max(0, Math.floor(player.health));
  document.getElementById('wave').textContent = wave;
  document.getElementById('zombies').textContent = zombies.length;
  document.getElementById('weapon').textContent = weapons[player.weapon].name;
  document.getElementById('firerate').textContent = weapons[player.weapon].fireRate < 200 ? 'Fast' : 
                                                  weapons[player.weapon].fireRate > 400 ? 'Slow' : 'Normal';
}

function gameOver() {
  gameRunning = false;
  document.getElementById('finalScore').textContent = score;
  document.getElementById('finalWave').textContent = wave;
  document.getElementById('zombiesKilled').textContent = totalZombiesKilled;
  document.getElementById('gameOver').style.display = 'block';
  
  playSound(150, 2, 'sawtooth', 0.1);
}

function restartGame() {
  gameRunning = true;
  player.x = canvas.width / 2;
  player.y = canvas.height / 2;
  player.health = 100;
  player.weapon = 'pistol';
  player.speed = 5;
  player.invulnerable = 0;
  score = 0;
  wave = 1;
  zombiesKilledThisWave = 0;
  zombiesPerWave = 5;
  totalZombiesKilled = 0;
  
  bullets.length = 0;
  zombies.length = 0;
  powerUps.length = 0;
  particles.length = 0;
  bloodSplatters.length = 0;
  
  // Reset weapon stats
  weapons.pistol.damage = 1;
  weapons.shotgun.damage = 3;
  weapons.machinegun.damage = 1;
  weapons.sniper.damage = 5;
  weapons.plasma.damage = 2;
  
  document.getElementById('gameOver').style.display = 'none';
  updateHUD();
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// Initialize game
updateHUD();
gameLoop();