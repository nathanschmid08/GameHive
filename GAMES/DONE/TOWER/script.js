const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Game state
let money = 150;
let lives = 20;
let score = 0;
let selectedTowerType = null;
let selectedTower = null;
let currentWave = 1;
let enemiesInWave = 0;
let maxEnemiesInWave = 5;
let waveActive = false;
let gameSpeed = 1;
let isPaused = false;

// Game objects
const towers = [];
const enemies = [];
const bullets = [];
const effects = [];

// Path for enemies
const path = [
  { x: -20, y: 250 },
  { x: 150, y: 250 },
  { x: 150, y: 150 },
  { x: 300, y: 150 },
  { x: 300, y: 350 },
  { x: 500, y: 350 },
  { x: 500, y: 100 },
  { x: 650, y: 100 },
  { x: 650, y: 250 },
  { x: 820, y: 250 }
];

// Tower types
const towerTypes = {
  basic: { cost: 50, damage: 1, range: 100, fireRate: 60, color: '#4a9eff', size: 12 },
  sniper: { cost: 100, damage: 3, range: 200, fireRate: 120, color: '#ff6b6b', size: 10 },
  rapid: { cost: 80, damage: 1, range: 80, fireRate: 20, color: '#ffd93d', size: 8 },
  freeze: { cost: 120, damage: 0.5, range: 90, fireRate: 90, color: '#6bcf7f', size: 14, special: 'freeze' }
};

// Enemy types
const enemyTypes = [
  { hp: 2, speed: 1, reward: 15, color: '#ff4757', size: 8 },
  { hp: 4, speed: 0.8, reward: 25, color: '#ff6348', size: 10 },
  { hp: 8, speed: 0.6, reward: 40, color: '#ff3838', size: 12 },
  { hp: 15, speed: 0.4, reward: 60, color: '#c44569', size: 14 }
];

class Tower {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.damage = towerTypes[type].damage;
    this.range = towerTypes[type].range;
    this.fireRate = towerTypes[type].fireRate;
    this.cooldown = 0;
    this.level = 1;
    this.kills = 0;
  }

  update() {
    if (this.cooldown > 0) this.cooldown--;
    
    const target = this.findTarget();
    if (target && this.cooldown === 0) {
      this.shoot(target);
      this.cooldown = this.fireRate;
    }
  }

  findTarget() {
    let closestEnemy = null;
    let maxProgress = -1;
    
    for (const enemy of enemies) {
      if (this.inRange(enemy) && enemy.pathProgress > maxProgress) {
        closestEnemy = enemy;
        maxProgress = enemy.pathProgress;
      }
    }
    return closestEnemy;
  }

  shoot(target) {
    bullets.push(new Bullet(this.x, this.y, target, this.damage, this.type));
  }

  inRange(enemy) {
    const dx = enemy.x - this.x;
    const dy = enemy.y - this.y;
    return Math.sqrt(dx*dx + dy*dy) <= this.range;
  }

  draw() {
    // Draw range circle when selected
    if (selectedTower === this) {
      ctx.strokeStyle = 'rgba(74, 158, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw tower
    const towerData = towerTypes[this.type];
    ctx.fillStyle = towerData.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, towerData.size, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw level indicator
    ctx.fillStyle = 'white';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(this.level.toString(), this.x, this.y + 3);
  }

  upgrade(type) {
    switch(type) {
      case 'damage':
        this.damage += 0.5;
        this.level++;
        return 30;
      case 'range':
        this.range += 20;
        this.level++;
        return 25;
      case 'speed':
        this.fireRate = Math.max(10, this.fireRate - 10);
        this.level++;
        return 35;
    }
  }

  getSellValue() {
    return Math.floor(towerTypes[this.type].cost * 0.7 + (this.level - 1) * 15);
  }
}

class Enemy {
  constructor(wave) {
    const typeIndex = Math.min(Math.floor(wave / 2), enemyTypes.length - 1);
    const enemyData = enemyTypes[typeIndex];
    
    this.maxHp = enemyData.hp + Math.floor(wave * 0.5);
    this.hp = this.maxHp;
    this.speed = enemyData.speed;
    this.reward = enemyData.reward + Math.floor(wave * 2);
    this.color = enemyData.color;
    this.size = enemyData.size;
    
    this.x = path[0].x;
    this.y = path[0].y;
    this.pathIndex = 0;
    this.pathProgress = 0;
    this.slowEffect = 0;
    this.freezeEffect = 0;
  }

  update() {
    if (this.freezeEffect > 0) {
      this.freezeEffect--;
      return;
    }

    const currentSpeed = this.slowEffect > 0 ? this.speed * 0.5 : this.speed;
    if (this.slowEffect > 0) this.slowEffect--;

    if (this.pathIndex < path.length - 1) {
      const current = path[this.pathIndex];
      const next = path[this.pathIndex + 1];
      
      const dx = next.x - current.x;
      const dy = next.y - current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      const moveX = (dx / distance) * currentSpeed;
      const moveY = (dy / distance) * currentSpeed;
      
      this.x += moveX;
      this.y += moveY;
      this.pathProgress += currentSpeed;
      
      const distToNext = Math.sqrt((next.x - this.x) ** 2 + (next.y - this.y) ** 2);
      if (distToNext < currentSpeed) {
        this.pathIndex++;
        this.x = next.x;
        this.y = next.y;
      }
    } else {
      this.x += currentSpeed;
    }
  }

  draw() {
    // Draw enemy
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw health bar
    const barWidth = this.size * 2;
    const barHeight = 4;
    const healthPercent = this.hp / this.maxHp;
    
    ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
    ctx.fillRect(this.x - barWidth/2, this.y - this.size - 8, barWidth, barHeight);
    
    ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
    ctx.fillRect(this.x - barWidth/2, this.y - this.size - 8, barWidth * healthPercent, barHeight);
    
    // Draw effects
    if (this.slowEffect > 0) {
      ctx.strokeStyle = 'blue';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size + 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (this.freezeEffect > 0) {
      ctx.strokeStyle = 'cyan';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size + 3, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  takeDamage(damage, effectType) {
    this.hp -= damage;
    
    if (effectType === 'freeze') {
      this.slowEffect = 60;
      if (Math.random() < 0.3) {
        this.freezeEffect = 30;
      }
    }
    
    return this.hp <= 0;
  }
}

class Bullet {
  constructor(x, y, target, damage, towerType) {
    this.x = x;
    this.y = y;
    this.target = target;
    this.damage = damage;
    this.speed = 6;
    this.towerType = towerType;
  }

  update() {
    if (!this.target || this.target.hp <= 0) return true;
    
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < 8) {
      const killed = this.target.takeDamage(this.damage, towerTypes[this.towerType].special);
      
      if (killed) {
        money += this.target.reward;
        score += this.target.reward * 2;
        
        // Find tower that shot this bullet for kill tracking
        const tower = towers.find(t => 
          Math.sqrt((t.x - this.x) ** 2 + (t.y - this.y) ** 2) < t.range + 50
        );
        if (tower) tower.kills++;
      }
      
      effects.push(new HitEffect(this.target.x, this.target.y));
      return true;
    }
    
    this.x += (dx / dist) * this.speed;
    this.y += (dy / dist) * this.speed;
    return false;
  }

  draw() {
    const colors = {
      basic: '#4a9eff',
      sniper: '#ff6b6b',
      rapid: '#ffd93d',
      freeze: '#6bcf7f'
    };
    
    ctx.fillStyle = colors[this.towerType] || '#ffffff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

class HitEffect {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.life = 20;
    this.maxLife = 20;
  }

  update() {
    this.life--;
    return this.life <= 0;
  }

  draw() {
    const alpha = this.life / this.maxLife;
    const size = (this.maxLife - this.life) * 2;
    
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// Event listeners
canvas.addEventListener('click', handleCanvasClick);
document.getElementById('basicTower').addEventListener('click', () => selectTowerType('basic'));
document.getElementById('sniperTower').addEventListener('click', () => selectTowerType('sniper'));
document.getElementById('rapidTower').addEventListener('click', () => selectTowerType('rapid'));
document.getElementById('freezeTower').addEventListener('click', () => selectTowerType('freeze'));
document.getElementById('startWave').addEventListener('click', startWave);
document.getElementById('pauseGame').addEventListener('click', togglePause);
document.getElementById('upgradeDamage').addEventListener('click', () => upgradeTower('damage'));
document.getElementById('upgradeRange').addEventListener('click', () => upgradeTower('range'));
document.getElementById('upgradeSpeed').addEventListener('click', () => upgradeTower('speed'));
document.getElementById('sellTower').addEventListener('click', sellTower);

function handleCanvasClick(e) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  // Check if clicking on existing tower
  const clickedTower = towers.find(tower => {
    const dx = tower.x - x;
    const dy = tower.y - y;
    return Math.sqrt(dx*dx + dy*dy) <= 15;
  });
  
  if (clickedTower) {
    selectTower(clickedTower);
    return;
  }
  
  // Place new tower
  if (selectedTowerType && money >= towerTypes[selectedTowerType].cost) {
    // Check if position is valid (not on path)
    if (isValidTowerPosition(x, y)) {
      towers.push(new Tower(x, y, selectedTowerType));
      money -= towerTypes[selectedTowerType].cost;
      selectedTowerType = null;
      updateTowerButtons();
    }
  }
  
  selectedTower = null;
  document.getElementById('upgradePanel').style.display = 'none';
}

function isValidTowerPosition(x, y) {
  for (let i = 0; i < path.length - 1; i++) {
    const p1 = path[i];
    const p2 = path[i + 1];
    const dist = distanceToLineSegment(x, y, p1.x, p1.y, p2.x, p2.y);
    if (dist < 30) return false;
  }
  return true;
}

function distanceToLineSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx*dx + dy*dy);
  const t = Math.max(0, Math.min(1, ((px-x1)*dx + (py-y1)*dy) / (length*length)));
  const projection = { x: x1 + t*dx, y: y1 + t*dy };
  return Math.sqrt((px-projection.x)**2 + (py-projection.y)**2);
}

function selectTowerType(type) {
  selectedTowerType = selectedTowerType === type ? null : type;
  selectedTower = null;
  document.getElementById('upgradePanel').style.display = 'none';
  updateTowerButtons();
}

function selectTower(tower) {
  selectedTower = tower;
  selectedTowerType = null;
  updateTowerButtons();
  showUpgradePanel();
}

function showUpgradePanel() {
  const panel = document.getElementById('upgradePanel');
  const stats = document.getElementById('towerStats');
  
  stats.innerHTML = `
    <div>Level: ${selectedTower.level}</div>
    <div>Damage: ${selectedTower.damage.toFixed(1)}</div>
    <div>Range: ${selectedTower.range}</div>
    <div>Kills: ${selectedTower.kills}</div>
  `;
  
  panel.style.display = 'block';
}

function upgradeTower(type) {
  if (!selectedTower) return;
  
  const cost = selectedTower.upgrade(type);
  if (money >= cost) {
    money -= cost;
    showUpgradePanel();
    updateDisplay();
  }
}

function sellTower() {
  if (!selectedTower) return;
  
  const sellValue = selectedTower.getSellValue();
  money += sellValue;
  
  const index = towers.indexOf(selectedTower);
  if (index > -1) towers.splice(index, 1);
  
  selectedTower = null;
  document.getElementById('upgradePanel').style.display = 'none';
  updateDisplay();
}

function updateTowerButtons() {
  const buttons = ['basicTower', 'sniperTower', 'rapidTower', 'freezeTower'];
  const types = ['basic', 'sniper', 'rapid', 'freeze'];
  
  buttons.forEach((btnId, i) => {
    const btn = document.getElementById(btnId);
    const cost = towerTypes[types[i]].cost;
    
    btn.disabled = money < cost;
    btn.classList.toggle('selected', selectedTowerType === types[i]);
  });
}

function startWave() {
  if (!waveActive) {
    waveActive = true;
    enemiesInWave = 0;
    maxEnemiesInWave = 5 + currentWave * 2;
    document.getElementById('startWave').textContent = 'Wave Active';
  }
}

function togglePause() {
  isPaused = !isPaused;
  document.getElementById('pauseGame').textContent = isPaused ? 'Resume' : 'Pause';
}

function spawnEnemy() {
  if (waveActive && enemiesInWave < maxEnemiesInWave && Math.random() < 0.02) {
    enemies.push(new Enemy(currentWave));
    enemiesInWave++;
  }
}

function updateDisplay() {
  document.getElementById('moneyDisplay').textContent = `$${money}`;
  document.getElementById('livesDisplay').textContent = lives;
  document.getElementById('scoreDisplay').textContent = score;
  document.getElementById('waveInfo').textContent = 
    `Wave ${currentWave} - Enemies: ${enemiesInWave}/${maxEnemiesInWave}`;
}

function drawPath() {
  ctx.strokeStyle = 'rgba(100, 100, 100, 0.5)';
  ctx.lineWidth = 20;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i++) {
    ctx.lineTo(path[i].x, path[i].y);
  }
  ctx.stroke();
}

function gameLoop() {
  if (isPaused) {
    requestAnimationFrame(gameLoop);
    return;
  }
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw path
  drawPath();
  
  // Spawn enemies
  spawnEnemy();
  
  // Update and draw towers
  for (const tower of towers) {
    tower.update();
    tower.draw();
  }
  
  // Update and draw enemies
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    enemy.update();
    enemy.draw();
    
    if (enemy.hp <= 0) {
      enemies.splice(i, 1);
    } else if (enemy.x > canvas.width + 50) {
      enemies.splice(i, 1);
      lives--;
      if (lives <= 0) {
        alert(`Game Over! Final Score: ${score}`);
        location.reload();
      }
    }
  }
  
  // Update and draw bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    if (bullet.update()) {
      bullets.splice(i, 1);
    } else {
      bullet.draw();
    }
  }
  
  // Update and draw effects
  for (let i = effects.length - 1; i >= 0; i--) {
    const effect = effects[i];
    if (effect.update()) {
      effects.splice(i, 1);
    } else {
      effect.draw();
    }
  }
  
  // Check wave completion
  if (waveActive && enemiesInWave >= maxEnemiesInWave && enemies.length === 0) {
    waveActive = false;
    currentWave++;
    money += currentWave * 10; // Wave completion bonus
    document.getElementById('startWave').textContent = 'Start Wave';
  }
  
  updateDisplay();
  updateTowerButtons();
  requestAnimationFrame(gameLoop);
}

// Start the game
updateDisplay();
gameLoop();