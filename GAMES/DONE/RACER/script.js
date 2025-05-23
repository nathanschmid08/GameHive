const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Spiel-Variablen
let gameTime = 0;
let bestTime = null;
let currentLap = 1;
let gameRunning = true;
let currentCheckpoint = 0;

// Auto
const car = {
    x: 100,
    y: 100,
    width: 20,
    height: 40,
    angle: 0,
    velocityX: 0,
    velocityY: 0,
    speed: 0,
    maxSpeed: 5,
    acceleration: 0.2,
    friction: 0.05,
    turnSpeed: 0.05
};

// Einfache Strecke
const track = {
    walls: [
        // Äußere Wände
        {x: 50, y: 50, width: 900, height: 20},     // oben
        {x: 950, y: 50, width: 20, height: 500},    // rechts
        {x: 50, y: 530, width: 900, height: 20},    // unten
        {x: 50, y: 50, width: 20, height: 500},     // links
        
        // Innere Hindernisse
        {x: 200, y: 200, width: 150, height: 20},
        {x: 500, y: 150, width: 20, height: 200},
        {x: 700, y: 300, width: 200, height: 20},
        {x: 300, y: 400, width: 20, height: 100},
    ],
    
    checkpoints: [
        {x: 200, y: 100, width: 20, height: 20, color: '#00ff00'},
        {x: 800, y: 150, width: 20, height: 20, color: '#00ff00'},
        {x: 850, y: 450, width: 20, height: 20, color: '#00ff00'},
        {x: 200, y: 480, width: 20, height: 20, color: '#00ff00'},
        {x: 100, y: 300, width: 20, height: 20, color: '#ffff00'}, // Ziel
    ]
};

// Partikel für Effekte
const particles = [];

// Eingabe-Handler
const keys = {};

document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'KeyR') {
        resetGame();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// Spiel zurücksetzen
function resetGame() {
    car.x = 100;
    car.y = 100;
    car.angle = 0;
    car.velocityX = 0;
    car.velocityY = 0;
    car.speed = 0;
    gameTime = 0;
    currentLap = 1;
    currentCheckpoint = 0;
    gameRunning = true;
    particles.length = 0;
    document.getElementById('gameOver').style.display = 'none';
}

// Kollisionserkennung
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// Auto-Update
function updateCar() {
    if (!gameRunning) return;

    // Eingaben
    const accelerating = keys['KeyW'] || keys['ArrowUp'];
    const braking = keys['KeyS'] || keys['ArrowDown'] || keys['ShiftLeft'];
    const turningLeft = keys['KeyA'] || keys['ArrowLeft'];
    const turningRight = keys['KeyD'] || keys['ArrowRight'];

    // Beschleunigung
    if (accelerating) {
        car.speed = Math.min(car.speed + car.acceleration, car.maxSpeed);
    } else if (braking) {
        car.speed = Math.max(car.speed - car.acceleration * 2, -car.maxSpeed * 0.5);
    } else {
        car.speed *= 0.95; // Reibung
    }

    // Lenkung
    if (Math.abs(car.speed) > 0.1) {
        if (turningLeft) {
            car.angle -= car.turnSpeed * Math.abs(car.speed);
        }
        if (turningRight) {
            car.angle += car.turnSpeed * Math.abs(car.speed);
        }
    }

    // Bewegung
    const moveX = Math.sin(car.angle) * car.speed;
    const moveY = -Math.cos(car.angle) * car.speed;
    
    const newX = car.x + moveX;
    const newY = car.y + moveY;

    // Kollision mit Wänden prüfen
    let collision = false;
    const carRect = {x: newX, y: newY, width: car.width, height: car.height};
    
    for (let wall of track.walls) {
        if (checkCollision(carRect, wall)) {
            collision = true;
            // Crash-Effekt
            car.speed *= 0.1;
            for (let i = 0; i < 5; i++) {
                particles.push({
                    x: car.x + Math.random() * car.width,
                    y: car.y + Math.random() * car.height,
                    vx: (Math.random() - 0.5) * 4,
                    vy: (Math.random() - 0.5) * 4,
                    life: 30,
                    color: '#ff6b6b'
                });
            }
            break;
        }
    }

    if (!collision) {
        car.x = newX;
        car.y = newY;
    }

    // Checkpoint-Prüfung
    const nextCheckpoint = track.checkpoints[currentCheckpoint];
    if (nextCheckpoint && checkCollision(carRect, nextCheckpoint)) {
        // Checkpoint erreicht
        particles.push({
            x: nextCheckpoint.x + 10,
            y: nextCheckpoint.y + 10,
            vx: 0,
            vy: -2,
            life: 60,
            color: '#00ff00',
            text: '✓'
        });

        currentCheckpoint++;
        
        if (currentCheckpoint >= track.checkpoints.length) {
            // Runde abgeschlossen
            currentCheckpoint = 0;
            currentLap++;
            
            if (currentLap > 3) {
                // Spiel beendet
                gameRunning = false;
                if (!bestTime || gameTime < bestTime) {
                    bestTime = gameTime;
                }
                document.getElementById('finalTime').textContent = (gameTime / 1000).toFixed(1) + 's';
                document.getElementById('gameOver').style.display = 'block';
            }
        }
    }

    // Drift-Partikel
    if (Math.abs(car.speed) > 3 && (turningLeft || turningRight)) {
        particles.push({
            x: car.x + car.width/2 - Math.sin(car.angle) * 20,
            y: car.y + car.height/2 + Math.cos(car.angle) * 20,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            life: 20,
            color: '#666'
        });
    }
}

// Partikel-Update
function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

// Zeichnen
function draw() {
    // Hintergrund
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Strecke zeichnen
    ctx.fillStyle = '#8B4513';
    track.walls.forEach(wall => {
        ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
    });

    // Checkpoints
    track.checkpoints.forEach((checkpoint, index) => {
        if (index === currentCheckpoint) {
            ctx.fillStyle = checkpoint.color;
            ctx.fillRect(checkpoint.x, checkpoint.y, checkpoint.width, checkpoint.height);
            
            // Blinkender Effekt für aktuellen Checkpoint
            if (Math.floor(Date.now() / 200) % 2) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(checkpoint.x - 2, checkpoint.y - 2, checkpoint.width + 4, checkpoint.height + 4);
            }
        } else if (index < currentCheckpoint) {
            ctx.fillStyle = '#666';
            ctx.fillRect(checkpoint.x, checkpoint.y, checkpoint.width, checkpoint.height);
        } else {
            ctx.fillStyle = checkpoint.color;
            ctx.globalAlpha = 0.5;
            ctx.fillRect(checkpoint.x, checkpoint.y, checkpoint.width, checkpoint.height);
            ctx.globalAlpha = 1;
        }
    });

    // Auto zeichnen
    ctx.save();
    ctx.translate(car.x + car.width/2, car.y + car.height/2);
    ctx.rotate(car.angle);
    
    // Auto-Schatten
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-car.width/2 + 1, -car.height/2 + 1, car.width, car.height);
    
    // Auto
    ctx.fillStyle = '#ff4757';
    ctx.fillRect(-car.width/2, -car.height/2, car.width, car.height);
    
    // Auto-Details
    ctx.fillStyle = '#2f3542';
    ctx.fillRect(-car.width/2 + 2, -car.height/2 + 2, car.width - 4, 8);
    ctx.fillRect(-car.width/2 + 2, car.height/2 - 10, car.width - 4, 8);
    
    // Richtungsanzeiger
    ctx.fillStyle = '#ffa502';
    ctx.fillRect(-2, -car.height/2 - 3, 4, 6);
    
    ctx.restore();

    // Partikel
    particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.life / 30;
        ctx.fillStyle = p.color;
        
        if (p.text) {
            ctx.font = '20px Arial';
            ctx.fillText(p.text, p.x, p.y);
        } else {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    });
}

// UI Update
function updateUI() {
    if (gameRunning) {
        gameTime += 16.67; // ~60fps
    }
    
    document.getElementById('time').textContent = (gameTime / 1000).toFixed(1) + 's';
    document.getElementById('speed').textContent = Math.round(Math.abs(car.speed) * 20);
    document.getElementById('lap').textContent = currentLap;
    document.getElementById('bestTime').textContent = bestTime ? (bestTime / 1000).toFixed(1) + 's' : '--';
}

// Spiel-Loop
function gameLoop() {
    updateCar();
    updateParticles();
    updateUI();
    draw();
    requestAnimationFrame(gameLoop);
}

// Spiel starten
resetGame();
gameLoop();