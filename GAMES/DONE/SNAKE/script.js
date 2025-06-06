const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 600;
canvas.height = 600;

const gridSize = 30;
let snake = [{x: 300, y: 300}];
let direction = {x: 0, y: 0};
let food = getRandomFoodPosition();
let score = 0;
let highScore = localStorage.getItem('highScore') || 0;
let gameRunning = true;

document.getElementById('highScore').innerText = highScore;

// Schlangentextur erstellen
const snakePattern = document.createElement('canvas');
const patternCtx = snakePattern.getContext('2d');
snakePattern.width = gridSize;
snakePattern.height = gridSize;

// Muster für die Schlangenhaut
function createSnakePattern() {
    const gradient = patternCtx.createLinearGradient(0, 0, gridSize, gridSize);
    gradient.addColorStop(0, '#4a9c2d');
    gradient.addColorStop(0.5, '#90EE90');
    gradient.addColorStop(1, '#4a9c2d');
    
    patternCtx.fillStyle = gradient;
    patternCtx.fillRect(0, 0, gridSize, gridSize);
    
    // Schuppenmuster
    patternCtx.strokeStyle = 'rgba(0,0,0,0.2)';
    patternCtx.beginPath();
    patternCtx.moveTo(0, gridSize/2);
    patternCtx.lineTo(gridSize/2, 0);
    patternCtx.lineTo(gridSize, gridSize/2);
    patternCtx.lineTo(gridSize/2, gridSize);
    patternCtx.closePath();
    patternCtx.stroke();
}

createSnakePattern();

document.addEventListener('keydown', changeDirection);
let gameLoop = setInterval(updateGame, 100);

function updateGame() {
    if (!gameRunning) return;
    
    if (didGameEnd()) {
        handleGameOver();
    } else {
        update();
        draw();
    }
}

function update() {
    const head = {
        x: snake[0].x + direction.x * gridSize,
        y: snake[0].y + direction.y * gridSize
    };
    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
        score += 1;
        document.getElementById('score').innerText = score;
        food = getRandomFoodPosition();
    } else {
        snake.pop();
    }
}

function draw() {
ctx.clearRect(0, 0, canvas.width, canvas.height);

// Hintergrundgitter zeichnen
ctx.strokeStyle = 'rgba(255,255,255,0.1)';
for(let i = 0; i < canvas.width; i += gridSize) {
ctx.beginPath();
ctx.moveTo(i, 0);
ctx.lineTo(i, canvas.height);
ctx.stroke();
ctx.beginPath();
ctx.moveTo(0, i);
ctx.lineTo(canvas.width, i);
ctx.stroke();
}

// Schlange zeichnen
for (let i = 0; i < snake.length; i++) {
const segment = snake[i];
const radius = gridSize / 2;

ctx.save();

if (i === 0) {
    // Kopf der Schlange
    ctx.fillStyle = '#5ab544';
    
    // Berechne den Winkel basierend auf der aktuellen Richtung
    let angle = 0;
    if (direction.x !== 0 || direction.y !== 0) {
        angle = Math.atan2(direction.y, direction.x);
    } else if (snake.length > 1) {
        // Wenn keine Richtung aber mehrere Segmente, nutze das nächste Segment
        const nextSegment = snake[1];
        angle = Math.atan2(nextSegment.y - segment.y, nextSegment.x - segment.x);
    }
    
    // Ovaler Kopf
    ctx.beginPath();
    ctx.ellipse(
        segment.x + radius,
        segment.y + radius,
        radius * 1.2,
        radius,
        angle,
        0,
        Math.PI * 2
    );
    ctx.fill();

    // Schuppen-Muster auf dem Kopf
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    for (let j = 0; j < 3; j++) {
        ctx.beginPath();
        ctx.arc(
            segment.x + radius + Math.cos(angle) * (j * 5),
            segment.y + radius + Math.sin(angle) * (j * 5),
            radius / 3,
            0,
            Math.PI
        );
        ctx.stroke();
    }

    // Nur Augen zeichnen, wenn die Schlange sich bewegt
    if (direction.x !== 0 || direction.y !== 0) {
        // Augen
        const eyeSize = gridSize / 6;
        const eyeDistance = radius * 0.7;
        
        // Linkes Auge
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.ellipse(
            segment.x + radius + Math.cos(angle - Math.PI/4) * eyeDistance,
            segment.y + radius + Math.sin(angle - Math.PI/4) * eyeDistance,
            eyeSize,
            eyeSize * 0.8,
            angle,
            0,
            Math.PI * 2
        );
        ctx.fill();

        // Rechtes Auge
        ctx.beginPath();
        ctx.ellipse(
            segment.x + radius + Math.cos(angle + Math.PI/4) * eyeDistance,
            segment.y + radius + Math.sin(angle + Math.PI/4) * eyeDistance,
            eyeSize,
            eyeSize * 0.8,
            angle,
            0,
            Math.PI * 2
        );
        ctx.fill();

        // Pupillen
        const pupilSize = eyeSize * 0.6;
        ctx.fillStyle = 'black';
        
        // Linke Pupille
        ctx.beginPath();
        ctx.ellipse(
            segment.x + radius + Math.cos(angle - Math.PI/4) * (eyeDistance + 1),
            segment.y + radius + Math.sin(angle - Math.PI/4) * (eyeDistance + 1),
            pupilSize,
            pupilSize * 0.8,
            angle,
            0,
            Math.PI * 2
        );
        ctx.fill();

        // Rechte Pupille
        ctx.beginPath();
        ctx.ellipse(
            segment.x + radius + Math.cos(angle + Math.PI/4) * (eyeDistance + 1),
            segment.y + radius + Math.sin(angle + Math.PI/4) * (eyeDistance + 1),
            pupilSize,
            pupilSize * 0.8,
            angle,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }
} else {
    // Körpersegmente
    let angle;
    if (i < snake.length - 1) {
        const nextSegment = snake[i + 1];
        const prevSegment = snake[i - 1];
        angle = Math.atan2(
            nextSegment.y - prevSegment.y,
            nextSegment.x - prevSegment.x
        );
    } else {
        const prevSegment = snake[i - 1];
        angle = Math.atan2(
            segment.y - prevSegment.y,
            segment.x - prevSegment.x
        );
    }
    
    // Gradient für realistischeren Look
    const gradient = ctx.createRadialGradient(
        segment.x + radius,
        segment.y + radius,
        0,
        segment.x + radius,
        segment.y + radius,
        radius
    );
    gradient.addColorStop(0, '#90EE90');
    gradient.addColorStop(0.7, '#4a9c2d');
    gradient.addColorStop(1, '#2d5a27');
    
    ctx.fillStyle = gradient;
    
    // Verbindungssegment
    ctx.beginPath();
    ctx.ellipse(
        segment.x + radius,
        segment.y + radius,
        radius * 0.9,
        radius * 0.8,
        angle,
        0,
        Math.PI * 2
    );
    ctx.fill();

    // Schuppenmuster
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1;
    for (let j = 0; j < 3; j++) {
        ctx.beginPath();
        ctx.arc(
            segment.x + radius + Math.cos(angle) * (j * 5),
            segment.y + radius + Math.sin(angle) * (j * 5),
            radius / 3,
            0,
            Math.PI
        );
        ctx.stroke();
    }
}

// Glanzeffekt
const shimmer = ctx.createLinearGradient(
    segment.x,
    segment.y,
    segment.x + gridSize,
    segment.y + gridSize
);
shimmer.addColorStop(0, 'rgba(255,255,255,0.1)');
shimmer.addColorStop(0.5, 'rgba(255,255,255,0.2)');
shimmer.addColorStop(1, 'rgba(255,255,255,0.1)');
ctx.fillStyle = shimmer;
ctx.fill();

ctx.restore();
}

// Rest des Apfel-Zeichencodes bleibt unverändert...
ctx.save();
ctx.beginPath();
ctx.fillStyle = '#ff0000';
ctx.arc(food.x + gridSize/2, food.y + gridSize/2, gridSize/2 - 2, 0, Math.PI * 2);
ctx.fill();

const appleGradient = ctx.createRadialGradient(
food.x + gridSize/3, food.y + gridSize/3, gridSize/10,
food.x + gridSize/2, food.y + gridSize/2, gridSize/2
);
appleGradient.addColorStop(0, 'rgba(255,255,255,0.8)');
appleGradient.addColorStop(0.2, 'rgba(255,0,0,0.8)');
appleGradient.addColorStop(1, 'rgb(200,0,0)');
ctx.fillStyle = appleGradient;
ctx.fill();

ctx.beginPath();
ctx.strokeStyle = '#594322';
ctx.lineWidth = 2;
ctx.moveTo(food.x + gridSize/2, food.y + 2);
ctx.lineTo(food.x + gridSize/2 + 3, food.y - 3);
ctx.stroke();

ctx.fillStyle = '#32CD32';
ctx.beginPath();
ctx.ellipse(food.x + gridSize/2 + 4, food.y - 2, 3, 6, Math.PI/4, 0, Math.PI * 2);
ctx.fill();

ctx.restore();
}
function changeDirection(event) {
    const key = event.keyCode;
    const goingUp = direction.y === -1;
    const goingDown = direction.y === 1;
    const goingRight = direction.x === 1;
    const goingLeft = direction.x === -1;

    if (key === 37 && !goingRight) direction = {x: -1, y: 0};
    if (key === 38 && !goingDown) direction = {x: 0, y: -1};
    if (key === 39 && !goingLeft) direction = {x: 1, y: 0};
    if (key === 40 && !goingUp) direction = {x: 0, y: 1};
}

function getRandomFoodPosition() {
    let position;
    do {
        position = {
            x: Math.floor(Math.random() * (canvas.width / gridSize)) * gridSize,
            y: Math.floor(Math.random() * (canvas.height / gridSize)) * gridSize
        };
    } while (snake.some(segment => segment.x === position.x && segment.y === position.y));
    return position;
}

function didGameEnd() {
    for (let i = 4; i < snake.length; i++) {
        if (snake[i].x === snake[0].x && snake[i].y === snake[0].y) return true;
    }

    const hitLeftWall = snake[0].x < 0;
    const hitRightWall = snake[0].x >= canvas.width;
    const hitTopWall = snake[0].y < 0;
    const hitBottomWall = snake[0].y >= canvas.height;

return hitLeftWall || hitRightWall || hitTopWall || hitBottomWall;
}

function handleGameOver() {
gameRunning = false;

// Speichere High Score
if (score > highScore) {
highScore = score;
localStorage.setItem('highScore', highScore);
document.getElementById('highScore').innerText = highScore;
}

// Game Over Screen anzeigen
const gameOverScreen = document.getElementById('gameOver');
gameOverScreen.style.display = 'block';
document.getElementById('finalScore').innerText = score;
document.getElementById('finalHighScore').innerText = highScore;

// Fade-Effekt für den Hintergrund
ctx.fillStyle = 'rgba(0,0,0,0.7)';
ctx.fillRect(0, 0, canvas.width, canvas.height);

// Schlange rot aufleuchten lassen
snake.forEach((segment, index) => {
ctx.save();

// Pulsierender Effekt
const pulseRate = Date.now() / 200;
const pulseIntensity = Math.sin(pulseRate) * 0.3 + 0.7;

ctx.fillStyle = `rgba(255,0,0,${pulseIntensity})`;
ctx.shadowColor = 'red';
ctx.shadowBlur = 20;
ctx.fillRect(segment.x, segment.y, gridSize, gridSize);

ctx.restore();
});
}

function restartGame() {
// Spiel zurücksetzen
snake = [{x: 300, y: 300}];
direction = {x: 0, y: 0};
score = 0;
document.getElementById('score').innerText = score;
food = getRandomFoodPosition();
gameRunning = true;

// Game Over Screen ausblenden
document.getElementById('gameOver').style.display = 'none';

// Animation neu starten
if (!gameLoop) {
gameLoop = setInterval(updateGame, 100);
}
}

// Touch-Steuerung hinzufügen
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener('touchstart', function(event) {
touchStartX = event.touches[0].clientX;
touchStartY = event.touches[0].clientY;
event.preventDefault();
});

canvas.addEventListener('touchmove', function(event) {
if (!touchStartX || !touchStartY) return;

let touchEndX = event.touches[0].clientX;
let touchEndY = event.touches[0].clientY;

let dx = touchEndX - touchStartX;
let dy = touchEndY - touchStartY;

// Bestimme die Hauptrichtung der Bewegung
if (Math.abs(dx) > Math.abs(dy)) {
// Horizontale Bewegung
if (dx > 0 && direction.x !== -1) direction = {x: 1, y: 0};  // rechts
else if (dx < 0 && direction.x !== 1) direction = {x: -1, y: 0};  // links
} else {
// Vertikale Bewegung
if (dy > 0 && direction.y !== -1) direction = {x: 0, y: 1};  // unten
else if (dy < 0 && direction.y !== 1) direction = {x: 0, y: -1};  // oben
}

touchStartX = touchEndX;
touchStartY = touchEndY;
event.preventDefault();
});

// Geschwindigkeitsanpassung basierend auf Score
function updateGameSpeed() {
clearInterval(gameLoop);
let speed = Math.max(50, 100 - (score * 2)); // Schneller werden mit höherem Score
gameLoop = setInterval(updateGame, speed);
}

// Partikeleffekt für das Essen
const particles = [];

function createFoodParticles() {
for (let i = 0; i < 10; i++) {
particles.push({
x: food.x + gridSize/2,
y: food.y + gridSize/2,
speedX: (Math.random() - 0.5) * 4,
speedY: (Math.random() - 0.5) * 4,
size: Math.random() * 4 + 2,
life: 1
});
}
}

function updateParticles() {
for (let i = particles.length - 1; i >= 0; i--) {
const particle = particles[i];
particle.x += particle.speedX;
particle.y += particle.speedY;
particle.life -= 0.02;

ctx.fillStyle = `rgba(255,0,0,${particle.life})`;
ctx.beginPath();
ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
ctx.fill();

if (particle.life <= 0) {
particles.splice(i, 1);
}
}
}

// Event Listener für Pause
document.addEventListener('keydown', function(event) {
if (event.code === 'Space') {
gameRunning = !gameRunning;
if (gameRunning) {
gameLoop = setInterval(updateGame, 100);
} else {
clearInterval(gameLoop);

// Pause-Text anzeigen
ctx.fillStyle = 'rgba(0,0,0,0.5)';
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = 'white';
ctx.font = '30px Arial';
ctx.textAlign = 'center';
ctx.fillText('PAUSE', canvas.width/2, canvas.height/2);
}
}
});

// Spiel starten
updateGameSpeed();