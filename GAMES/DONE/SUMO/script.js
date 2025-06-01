const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// Game state
let score = 0;
let round = 1;
let gameState = 'playing'; // 'playing', 'victory', 'defeat'

const ring = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  radius: 220,
  innerRadius: 200
};

class Sumo {
  constructor(x, y, color, isPlayer = false, name = "Opponent") {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = isPlayer ? 35 : 30 + Math.random() * 10;
    this.mass = this.radius / 10;
    this.color = color;
    this.isPlayer = isPlayer;
    this.dragging = false;
    this.startDrag = {x: 0, y: 0};
    this.name = name;
    this.health = 100;
    this.stamina = 100;
    this.strength = 0.8 + Math.random() * 0.4;
    this.agility = 0.5 + Math.random() * 0.5;
    this.aiTimer = 0;
    this.targetAngle = 0;
    this.isCharging = false;
    this.chargeTimer = 0;
    this.stunned = false;
    this.stunnedTimer = 0;
    
    // Sumo appearance
    this.bodyColor = isPlayer ? '#FF6B6B' : this.generateBodyColor();
    this.beltColor = isPlayer ? '#FFD93D' : this.generateBeltColor();
    this.faceColor = '#FFDBAC';
    this.angle = 0;
  }

  generateBodyColor() {
    const colors = ['#DEB887', '#F4A460', '#CD853F', '#A0522D', '#8B4513'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  generateBeltColor() {
    const colors = ['#FF4444', '#4444FF', '#44FF44', '#FFFF44', '#FF44FF', '#44FFFF'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  update() {
    if (this.stunned) {
      this.stunnedTimer--;
      if (this.stunnedTimer <= 0) {
        this.stunned = false;
      }
      this.vx *= 0.95;
      this.vy *= 0.95;
      return;
    }

    if (!this.dragging) {
      // Apply movement
      this.x += this.vx;
      this.y += this.vy;
      
      // Enhanced friction based on mass
      const friction = 0.96 - (this.mass * 0.01);
      this.vx *= friction;
      this.vy *= friction;

      // Keep within ring bounds with realistic physics
      const distFromCenter = Math.hypot(this.x - ring.x, this.y - ring.y);
      if (distFromCenter + this.radius > ring.radius) {
        const angle = Math.atan2(this.y - ring.y, this.x - ring.x);
        const targetX = ring.x + Math.cos(angle) * (ring.radius - this.radius);
        const targetY = ring.y + Math.sin(angle) * (ring.radius - this.radius);
        
        // Bounce back with energy loss
        this.x = targetX;
        this.y = targetY;
        this.vx *= -0.6;
        this.vy *= -0.6;
      }
    }

    // AI behavior for enemies
    if (!this.isPlayer && !this.stunned) {
      this.aiTimer++;
      
      if (this.aiTimer > 30 + Math.random() * 60) {
        this.aiTimer = 0;
        
        // Find closest target (player or other enemies)
        let closestTarget = null;
        let closestDist = Infinity;
        
        const targets = [player, ...enemies.filter(e => e !== this)];
        for (let target of targets) {
          const dist = Math.hypot(target.x - this.x, target.y - this.y);
          if (dist < closestDist) {
            closestDist = dist;
            closestTarget = target;
          }
        }
        
        if (closestTarget && closestDist < 150) {
          // Charge towards target
          const angle = Math.atan2(closestTarget.y - this.y, closestTarget.x - this.x);
          const force = this.strength * (0.5 + Math.random() * 0.5);
          this.vx += Math.cos(angle) * force;
          this.vy += Math.sin(angle) * force;
          this.isCharging = true;
          this.chargeTimer = 20;
        } else {
          // Random movement towards center
          const centerAngle = Math.atan2(ring.y - this.y, ring.x - this.x);
          const randomAngle = centerAngle + (Math.random() - 0.5) * Math.PI;
          const force = this.agility * 0.3;
          this.vx += Math.cos(randomAngle) * force;
          this.vy += Math.sin(randomAngle) * force;
        }
      }
      
      if (this.chargeTimer > 0) {
        this.chargeTimer--;
        if (this.chargeTimer <= 0) {
          this.isCharging = false;
        }
      }
    }

    // Update facing angle based on movement
    if (Math.abs(this.vx) > 0.1 || Math.abs(this.vy) > 0.1) {
      this.angle = Math.atan2(this.vy, this.vx);
    }

    // Stamina regeneration
    if (this.stamina < 100) {
      this.stamina += 0.5;
    }
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    
    // Draw shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(2, 2, this.radius * 1.1, this.radius * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw body
    ctx.fillStyle = this.bodyColor;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw belt (mawashi)
    ctx.fillStyle = this.beltColor;
    ctx.fillRect(-this.radius * 0.8, -8, this.radius * 1.6, 16);
    
    // Draw face
    ctx.fillStyle = this.faceColor;
    ctx.beginPath();
    ctx.arc(-this.radius * 0.3, -this.radius * 0.3, this.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw eyes
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(-this.radius * 0.4, -this.radius * 0.4, 3, 0, Math.PI * 2);
    ctx.arc(-this.radius * 0.2, -this.radius * 0.4, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw topknot (chonmage) for traditional look
    ctx.fillStyle = '#2C1810';
    ctx.beginPath();
    ctx.arc(-this.radius * 0.3, -this.radius * 0.7, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Charging effect
    if (this.isCharging) {
      ctx.strokeStyle = '#FF4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // Stunned effect
    if (this.stunned) {
      ctx.fillStyle = 'yellow';
      for (let i = 0; i < 3; i++) {
        const starAngle = (Date.now() * 0.01 + i * Math.PI * 2 / 3);
        const starX = Math.cos(starAngle) * (this.radius + 15);
        const starY = Math.sin(starAngle) * (this.radius + 15);
        this.drawStar(starX, starY, 5, 3);
      }
    }
    
    ctx.restore();
    
    // Draw health bar for enemies
    if (!this.isPlayer && this.health < 100) {
      const barWidth = this.radius * 1.5;
      const barHeight = 4;
      const barY = this.y - this.radius - 15;
      
      ctx.fillStyle = 'red';
      ctx.fillRect(this.x - barWidth/2, barY, barWidth, barHeight);
      ctx.fillStyle = 'green';
      ctx.fillRect(this.x - barWidth/2, barY, barWidth * (this.health/100), barHeight);
    }
  }

  drawStar(x, y, spikes, outerRadius) {
    const innerRadius = outerRadius * 0.5;
    let rot = Math.PI / 2 * 3;
    const step = Math.PI / spikes;
    
    ctx.beginPath();
    ctx.moveTo(x, y - outerRadius);
    
    for (let i = 0; i < spikes; i++) {
      const x1 = x + Math.cos(rot) * outerRadius;
      const y1 = y + Math.sin(rot) * outerRadius;
      ctx.lineTo(x1, y1);
      rot += step;
      
      const x2 = x + Math.cos(rot) * innerRadius;
      const y2 = y + Math.sin(rot) * innerRadius;
      ctx.lineTo(x2, y2);
      rot += step;
    }
    
    ctx.lineTo(x, y - outerRadius);
    ctx.closePath();
    ctx.fill();
  }

  isOutOfRing() {
    const distFromCenter = Math.hypot(this.x - ring.x, this.y - ring.y);
    return distFromCenter > ring.radius + this.radius;
  }

  applyForce(fx, fy) {
    if (this.stamina > 10) {
      this.vx += fx / this.mass;
      this.vy += fy / this.mass;
      this.stamina -= 5;
    }
  }

  takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      this.stunned = true;
      this.stunnedTimer = 60;
    }
  }
}

// Initialize game
const player = new Sumo(ring.x, ring.y - 50, "#FF6B6B", true, "Player");
let enemies = [];

function createEnemies(count) {
  enemies = [];
  const names = ["Takeshi", "Hiroshi", "Kenji", "Satoshi", "Masaru", "Tetsuya"];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const distance = 80 + Math.random() * 60;
    const x = ring.x + Math.cos(angle) * distance;
    const y = ring.y + Math.sin(angle) * distance;
    const name = names[Math.floor(Math.random() * names.length)];
    enemies.push(new Sumo(x, y, "#8B4513", false, name));
  }
}

createEnemies(4);

// Input handling
let dragging = false;
let dragPower = 0;
let maxDragDistance = 100;

canvas.addEventListener("mousedown", e => {
  if (gameState !== 'playing') return;
  
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const dx = mx - player.x;
  const dy = my - player.y;
  const dist = Math.hypot(dx, dy);
  
  if (dist < player.radius) {
    dragging = true;
    player.dragging = true;
    player.startDrag = {x: mx, y: my};
  }
});

canvas.addEventListener("mousemove", e => {
  if (dragging) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const dx = player.startDrag.x - mx;
    const dy = player.startDrag.y - my;
    const distance = Math.hypot(dx, dy);
    dragPower = Math.min(distance / maxDragDistance, 1) * 100;
    
    // Update power meter
    document.getElementById('powerFill').style.width = dragPower + '%';
  }
});

canvas.addEventListener("mouseup", e => {
  if (dragging && gameState === 'playing') {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const dx = player.startDrag.x - mx;
    const dy = player.startDrag.y - my;
    const distance = Math.hypot(dx, dy);
    
    const power = Math.min(distance / maxDragDistance, 1);
    player.applyForce(dx * power * 0.15, dy * power * 0.15);
    
    player.dragging = false;
    dragging = false;
    dragPower = 0;
    document.getElementById('powerFill').style.width = '0%';
  }
});

function enhancedCollision(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  
  if (dist < a.radius + b.radius && dist > 0) {
    const angle = Math.atan2(dy, dx);
    const overlap = (a.radius + b.radius - dist) / 2;
    
    // Separate objects
    const separateX = Math.cos(angle) * overlap;
    const separateY = Math.sin(angle) * overlap;
    
    a.x -= separateX * (b.mass / (a.mass + b.mass)) * 2;
    a.y -= separateY * (b.mass / (a.mass + b.mass)) * 2;
    b.x += separateX * (a.mass / (a.mass + b.mass)) * 2;
    b.y += separateY * (a.mass / (a.mass + b.mass)) * 2;
    
    // Calculate collision response
    const relativeVelX = b.vx - a.vx;
    const relativeVelY = b.vy - a.vy;
    const relativeSpeed = relativeVelX * Math.cos(angle) + relativeVelY * Math.sin(angle);
    
    if (relativeSpeed > 0) return; // Objects separating
    
    const restitution = 0.7;
    const impulse = (1 + restitution) * relativeSpeed / (a.mass + b.mass);
    
    const impulseX = impulse * Math.cos(angle);
    const impulseY = impulse * Math.sin(angle);
    
    a.vx += impulseX * b.mass;
    a.vy += impulseY * b.mass;
    b.vx -= impulseX * a.mass;
    b.vy -= impulseY * a.mass;
    
    // Apply damage based on collision force
    const collisionForce = Math.hypot(impulseX, impulseY) * 10;
    if (collisionForce > 2) {
      a.takeDamage(collisionForce);
      b.takeDamage(collisionForce);
    }
    
    // Add screen shake for strong collisions
    if (collisionForce > 5) {
      canvas.style.transform = `translate(${(Math.random()-0.5)*10}px, ${(Math.random()-0.5)*10}px)`;
      setTimeout(() => {
        canvas.style.transform = 'translate(0, 0)';
      }, 100);
    }
  }
}

function drawEnhancedRing() {
  // Draw ring base
  ctx.fillStyle = '#8B4513';
  ctx.beginPath();
  ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw inner ring
  ctx.fillStyle = '#A0522D';
  ctx.beginPath();
  ctx.arc(ring.x, ring.y, ring.innerRadius, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw ring border
  ctx.strokeStyle = '#654321';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
  ctx.stroke();
  
  // Draw center circle
  ctx.strokeStyle = '#DAA520';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(ring.x, ring.y, 30, 0, Math.PI * 2);
  ctx.stroke();
  
  // Draw wood grain texture lines
  ctx.strokeStyle = 'rgba(101, 67, 33, 0.3)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const x1 = ring.x + Math.cos(angle) * (ring.innerRadius + 10);
    const y1 = ring.y + Math.sin(angle) * (ring.innerRadius + 10);
    const x2 = ring.x + Math.cos(angle) * (ring.radius - 10);
    const y2 = ring.y + Math.sin(angle) * (ring.radius - 10);
    
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
}

function updateHUD() {
  document.getElementById('score').textContent = score;
  document.getElementById('round').textContent = round;
  document.getElementById('enemies').textContent = enemies.length;
}

function nextRound() {
  round++;
  const newEnemyCount = Math.min(4 + round, 8);
  createEnemies(newEnemyCount);
  
  // Reset player position
  player.x = ring.x;
  player.y = ring.y;
  player.vx = 0;
  player.vy = 0;
  player.health = 100;
  player.stamina = 100;
  
  gameState = 'playing';
}

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  drawEnhancedRing();
  
  if (gameState === 'playing') {
    // Update player
    player.update();
    player.draw();
    
    // Update enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      enemy.update();
      enemy.draw();
      
      // Check collisions
      enhancedCollision(player, enemy);
      
      // Enemy vs enemy collisions
      for (let j = i + 1; j < enemies.length; j++) {
        enhancedCollision(enemy, enemies[j]);
      }
      
      // Remove enemies that are out of the ring
      if (enemy.isOutOfRing()) {
        enemies.splice(i, 1);
        score += 100;
      }
    }
    
    // Check win/lose conditions
    if (player.isOutOfRing()) {
      gameState = 'defeat';
      setTimeout(() => {
        if (confirm("💀 You've been pushed out of the ring! Play again?")) {
          location.reload();
        }
      }, 100);
    }
    
    if (enemies.length === 0) {
      gameState = 'victory';
      score += 500 * round;
      setTimeout(() => {
        if (confirm(`🏆 Round ${round} complete! Score: ${score}\nReady for round ${round + 1}?`)) {
          nextRound();
        } else {
          alert(`Final Score: ${score}\nRounds Completed: ${round}`);
          location.reload();
        }
      }, 1000);
    }
  }
  
  updateHUD();
  requestAnimationFrame(gameLoop);
}

// Start the game
gameLoop();