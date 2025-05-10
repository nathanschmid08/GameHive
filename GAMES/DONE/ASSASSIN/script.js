const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Hintergrundsterne
const stars = [];
for (let i = 0; i < 200; i++) {
  stars.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: Math.random() * 2,
    speed: Math.random() * 2 + 0.5
  });
}

// Player properties
const player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  health: 100
};

// Verbessertes Fadenkreuz
const crosshair = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  size: 20,
  rotation: 0
};

// Gegner Array
const enemies = [];

function spawnEnemy() {
  // Zufällige Position am Rand des Bildschirms
  let x, y;
  if (Math.random() < 0.5) {
    x = Math.random() < 0.5 ? -50 : canvas.width + 50;
    y = Math.random() * canvas.height;
  } else {
    x = Math.random() * canvas.width;
    y = Math.random() < 0.5 ? -50 : canvas.height + 50;
  }

  const enemy = {
    x: x,
    y: y,
    width: 50,
    height: 50,
    health: 100,
    damage: 10,
    color: `hsl(${Math.random() * 360}, 70%, 50%)`,
    speed: Math.random() * 2 + 1
  };
  enemies.push(enemy);
}

setInterval(spawnEnemy, 2000);

window.addEventListener('mousemove', (e) => {
  crosshair.x = e.clientX;
  crosshair.y = e.clientY;
});

window.addEventListener('click', () => {
  // Schusseffekt
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
  ctx.lineWidth = 2;
  ctx.moveTo(canvas.width/2, canvas.height/2);
  ctx.lineTo(crosshair.x, crosshair.y);
  ctx.stroke();

  enemies.forEach((enemy, index) => {
    if (
      crosshair.x >= enemy.x &&
      crosshair.x <= enemy.x + enemy.width &&
      crosshair.y >= enemy.y &&
      crosshair.y <= enemy.y + enemy.height
    ) {
      enemy.health -= 50;
      if (enemy.health <= 0) {
        enemies.splice(index, 1);
      }
    }
  });
});

function drawBackground() {
  // Weltraum-Hintergrund
  ctx.fillStyle = '#000033';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Sterne zeichnen und bewegen
  stars.forEach(star => {
    ctx.fillStyle = `rgba(255, 255, 255, ${star.speed/2})`;
    ctx.fillRect(star.x, star.y, star.size, star.size);
    star.y += star.speed;
    if (star.y > canvas.height) {
      star.y = 0;
      star.x = Math.random() * canvas.width;
    }
  });
}

function drawCrosshair() {
  ctx.save();
  ctx.translate(crosshair.x, crosshair.y);
  crosshair.rotation += 0.02;
  ctx.rotate(crosshair.rotation);

  // Äußerer Ring
  ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, crosshair.size, 0, Math.PI * 2);
  ctx.stroke();

  // Innere Linien
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI/2);
    ctx.beginPath();
    ctx.moveTo(5, 0);
    ctx.lineTo(15, 0);
    ctx.stroke();
  }

  // Mittelpunkt
  ctx.fillStyle = '#ff0000';
  ctx.beginPath();
  ctx.arc(0, 0, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function showGameOver() {
  document.getElementById('gameOverModal').style.display = 'block';
}

function restartGame() {
  document.getElementById('gameOverModal').style.display = 'none';
  player.health = 100;
  document.getElementById('player-health').style.width = '100%';
  enemies.length = 0; // Clear all enemies
}

function drawEnemies() {
  enemies.forEach((enemy) => {
// Größere Gegner
enemy.width = 80;
enemy.height = 80;

// Bewegung zum Spieler
const dx = canvas.width/2 - enemy.x;
const dy = canvas.height/2 - enemy.y;
const distance = Math.sqrt(dx * dx + dy * dy);
enemy.x += (dx / distance) * 1.5;
enemy.y += (dy / distance) * 1.5;

// Schatten unter dem Gegner
ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
ctx.shadowBlur = 15;
ctx.shadowOffsetY = 5;

// Metallischer Kopf mit komplexer Schattierung
const headX = enemy.x + enemy.width / 2;
const headY = enemy.y + enemy.height / 3;
const headRadius = enemy.width / 3;

// Kopf-Basis mit metallischem Effekt
const metalGradient = ctx.createRadialGradient(
  headX - headRadius/2, headY - headRadius/2, 0,
  headX, headY, headRadius
);
metalGradient.addColorStop(0, '#e0e0e0');
metalGradient.addColorStop(0.5, '#a0a0a0');
metalGradient.addColorStop(1, '#707070');

ctx.shadowBlur = 10;
ctx.beginPath();
ctx.fillStyle = metalGradient;
ctx.arc(headX, headY, headRadius, 0, Math.PI * 2);
ctx.fill();

// Kopfplatten
ctx.strokeStyle = '#505050';
ctx.lineWidth = 2;
for(let i = 0; i < 3; i++) {
  ctx.beginPath();
  ctx.arc(headX, headY, headRadius - (i * 5), -Math.PI/3, Math.PI/3);
  ctx.stroke();
}

// Realistische Augen mit Leuchteffekt
const drawEye = (offsetX, offsetY) => {
  // Äußerer Augenring
  ctx.fillStyle = '#300000';
  ctx.beginPath();
  ctx.arc(enemy.x + offsetX, enemy.y + offsetY, enemy.width / 10, 0, Math.PI * 2);
  ctx.fill();
  
  // Inneres leuchtendes Auge
  const eyeGlow = ctx.createRadialGradient(
    enemy.x + offsetX, enemy.y + offsetY, 0,
    enemy.x + offsetX, enemy.y + offsetY, enemy.width / 10
  );
  eyeGlow.addColorStop(0, '#ff0000');
  eyeGlow.addColorStop(0.5, '#aa0000');
  eyeGlow.addColorStop(1, '#300000');
  
  ctx.fillStyle = eyeGlow;
  ctx.beginPath();
  ctx.arc(enemy.x + offsetX, enemy.y + offsetY, enemy.width / 15, 0, Math.PI * 2);
  ctx.fill();
  
  // Leuchteffekt
  ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.arc(enemy.x + offsetX, enemy.y + offsetY, enemy.width / 8, 0, Math.PI * 2);
  ctx.fill();
};

drawEye(enemy.width / 2.5, enemy.height / 4);
drawEye(enemy.width / 1.7, enemy.height / 4);

// Mechanischer Mund/Sprechergrills
ctx.fillStyle = '#404040';
for(let i = 0; i < 3; i++) {
  ctx.fillRect(
    enemy.x + enemy.width/3 + (i * enemy.width/9),
    enemy.y + enemy.height/2.2,
    enemy.width/15,
    enemy.width/10
  );
}

ctx.shadowBlur = 5;

// Gepanzerter Körper
const bodyGradient = ctx.createLinearGradient(
  enemy.x + enemy.width/3,
  enemy.y + enemy.height/2,
  enemy.x + enemy.width/3 + enemy.width/3,
  enemy.y + enemy.height
);
bodyGradient.addColorStop(0, '#505050');
bodyGradient.addColorStop(0.5, '#404040');
bodyGradient.addColorStop(1, '#303030');

// Hauptkörper
ctx.fillStyle = bodyGradient;
ctx.fillRect(
  enemy.x + enemy.width/3,
  enemy.y + enemy.height/2,
  enemy.width/3,
  enemy.height/1.5
);

// Panzerplatten auf dem Körper
ctx.strokeStyle = '#606060';
ctx.lineWidth = 2;
for(let i = 0; i < 3; i++) {
  ctx.strokeRect(
    enemy.x + enemy.width/3 + 2,
    enemy.y + enemy.height/2 + (i * enemy.height/5),
    enemy.width/3 - 4,
    enemy.height/6
  );
}

// Mechanische Arme mit Gelenken
const armWave = Math.sin(Date.now() / 200) * 5;
const drawArm = (x, y, mirror = 1) => {
  // Oberarm
  ctx.fillStyle = '#404040';
  ctx.fillRect(x, y + armWave * mirror,
              enemy.width/3, enemy.height/8);
  
  // Gelenk
  ctx.fillStyle = '#303030';
  ctx.beginPath();
  ctx.arc(x + (mirror === 1 ? 0 : enemy.width/3),
          y + enemy.height/16 + armWave * mirror,
          enemy.height/16, 0, Math.PI * 2);
  ctx.fill();
};

drawArm(enemy.x, enemy.y + enemy.height/2);
drawArm(enemy.x + enemy.width * 2/3, enemy.y + enemy.height/2, -1);

// Beine mit Hydraulik
const legOffset = Math.sin(Date.now() / 150) * 3;
const drawLeg = (x, y, offset) => {
  // Oberschenkel
  ctx.fillStyle = '#404040';
  ctx.fillRect(x, y + offset,
              enemy.width/6, enemy.height/3);
  
  // Kniegelenk
  ctx.fillStyle = '#303030';
  ctx.beginPath();
  ctx.arc(x + enemy.width/12,
          y + enemy.height/3 + offset,
          enemy.height/12, 0, Math.PI * 2);
  ctx.fill();
  
  // Unterschenkel
  ctx.fillStyle = '#404040';
  ctx.fillRect(x, y + enemy.height/3 + offset,
              enemy.width/6, enemy.height/3);
};

drawLeg(enemy.x + enemy.width/3, enemy.y + enemy.height, legOffset);
drawLeg(enemy.x + enemy.width/2, enemy.y + enemy.height, -legOffset);

// Energieschild-Effekt wenn Schaden genommen
if(enemy.health < 100) {
  ctx.strokeStyle = `rgba(0, 150, 255, ${(100 - enemy.health) / 200})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(enemy.x + enemy.width/2,
          enemy.y + enemy.height/2,
          enemy.width/1.5,
          0, Math.PI * 2);
  ctx.stroke();
}

ctx.shadowBlur = 0;
ctx.shadowOffsetY = 0;

// Verbesserte Gesundheitsanzeige mit Energieeffekt
const barWidth = enemy.width * 1.2;
const barX = enemy.x + enemy.width/2 - barWidth/2;

// Hintergrund der Gesundheitsanzeige
ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
ctx.fillRect(barX - 2, enemy.y - 15, barWidth + 4, 9);

// Energieeffekt
const healthGradient = ctx.createLinearGradient(barX, enemy.y - 13, barX + barWidth, enemy.y - 13);
healthGradient.addColorStop(0, '#ff0000');
healthGradient.addColorStop(0.5, '#ffff00');
healthGradient.addColorStop(1, '#00ff00');

ctx.fillStyle = healthGradient;
ctx.fillRect(barX, enemy.y - 13, (enemy.health / 100) * barWidth, 5);

// Energiefluss-Effekt
ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.3})`;
ctx.fillRect(barX, enemy.y - 13, (enemy.health / 100) * barWidth, 2);

// Schusseffekt mit Energiestrahl
if (Math.random() < 0.01) {
  // Energiestrahl
  const gradient = ctx.createLinearGradient(
    enemy.x + enemy.width/2, enemy.y + enemy.height/2,
    canvas.width/2, canvas.height/2
  );
  gradient.addColorStop(0, 'rgba(255, 0, 0, 0.8)');
  gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
  
  ctx.beginPath();
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 4;
  ctx.moveTo(enemy.x + enemy.width/2, enemy.y + enemy.height/2);
  ctx.lineTo(canvas.width/2, canvas.height/2);
  ctx.stroke();
  
  // Aufleuchten am Anfang des Strahls
  ctx.beginPath();
  ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
  ctx.arc(enemy.x + enemy.width/2,
          enemy.y + enemy.height/2,
          10, 0, Math.PI * 2);
  ctx.fill();          
      player.health -= enemy.damage;
      document.getElementById('player-health').style.width = player.health + '%';
      if (player.health <= 0) {
        showGameOver();
      }
    }
  });
}

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  drawBackground();
  drawCrosshair();
  drawEnemies();

  requestAnimationFrame(gameLoop);
}

gameLoop();