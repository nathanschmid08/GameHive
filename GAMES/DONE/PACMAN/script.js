const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
const levelElement = document.getElementById('level');

// Game state
let score = 0;
let lives = 3;
let level = 1;
let gameOver = false;
let powerMode = false;
let powerModeTimer = 0;
let gameTime = 0;

// Pac-Man settings
const pacMan = {
    x: 50,
    y: 50,
    radius: 20,
    speed: 4,
    direction: 0,
    mouthAngle: 0,
    mouthSpeed: 0.15,
    mouthOpen: true,
    powerMode: false,
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.direction * Math.PI/2);

        // Main body
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, this.mouthAngle, 2 * Math.PI - this.mouthAngle);
        ctx.lineTo(0, 0);
        ctx.fillStyle = '#FFFF00';
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Eye
        const eyeX = 0;
        const eyeY = -this.radius/2;
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, this.radius/6, 0, 2 * Math.PI);
        ctx.fillStyle = '#000000';
        ctx.fill();

        ctx.restore();
    },
    animate() {
        if (this.mouthOpen) {
            this.mouthAngle += this.mouthSpeed;
            if (this.mouthAngle >= Math.PI/4) {
                this.mouthOpen = false;
            }
        } else {
            this.mouthAngle -= this.mouthSpeed;
            if (this.mouthAngle <= 0) {
                this.mouthOpen = true;
            }
        }
    }
};

// Ghost class with improved AI and animations
class Ghost {
    constructor(x, y, color, personality) {
        this.x = x;
        this.y = y;
        this.baseColor = color;
        this.color = color;
        this.radius = 20;
        this.speed = 3;
        this.direction = Math.random() * Math.PI * 2;
        this.personality = personality;
        this.scared = false;
        this.scaredTimer = 0;
        this.wobble = 0;
        this.eyeOffset = { x: 0, y: 0 };
    }

    update() {
        this.wobble += 0.1;
        
        if (powerMode) {
            this.scared = true;
            this.color = '#2121ff';
            this.speed = 2;
        } else {
            this.scared = false;
            this.color = this.baseColor;
            this.speed = 3;
        }

        // Update eye direction based on movement
        const dx = pacMan.x - this.x;
        const dy = pacMan.y - this.y;
        const angle = Math.atan2(dy, dx);
        this.eyeOffset = {
            x: Math.cos(angle) * 3,
            y: Math.sin(angle) * 3
        };

        // AI behavior based on personality
        switch(this.personality) {
            case 'chase':
                if (!this.scared) {
                    this.direction = Math.atan2(pacMan.y - this.y, pacMan.x - this.x);
                } else {
                    this.direction = Math.atan2(pacMan.y - this.y, pacMan.x - this.x) + Math.PI;
                }
                break;
            case 'ambush':
                // Predict Pac-Man's position
                const futureX = pacMan.x + Math.cos(pacMan.direction * Math.PI/2) * 100;
                const futureY = pacMan.y + Math.sin(pacMan.direction * Math.PI/2) * 100;
                this.direction = Math.atan2(futureY - this.y, futureX - this.x);
                break;
            case 'random':
                if (Math.random() < 0.02) {
                    this.direction += (Math.random() - 0.5) * Math.PI;
                }
                break;
            case 'patrol':
                if (Math.random() < 0.01) {
                    this.direction += Math.PI/2;
                }
                break;
        }

        // Move ghost
        this.x += Math.cos(this.direction) * this.speed;
        this.y += Math.sin(this.direction) * this.speed;

        // Bounce off walls
        if (this.x < this.radius) {
            this.x = this.radius;
            this.direction = Math.PI - this.direction;
        }
        if (this.x > canvas.width - this.radius) {
            this.x = canvas.width - this.radius;
            this.direction = Math.PI - this.direction;
        }
        if (this.y < this.radius) {
            this.y = this.radius;
            this.direction = -this.direction;
        }
        if (this.y > canvas.height - this.radius) {
            this.y = canvas.height - this.radius;
            this.direction = -this.direction;
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Ghost body with wobble effect
        ctx.beginPath();
        ctx.arc(0, -5, this.radius, Math.PI, 0, false);
        
        // Wavy bottom
        ctx.lineTo(this.radius, -5);
        for (let i = this.radius; i >= -this.radius; i -= 5) {
            ctx.lineTo(i, 15 + Math.sin(this.wobble + i/10) * 5);
        }
        ctx.lineTo(-this.radius, -5);
        
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Eyes
        const eyeSpacing = 8;
        for (let i = -1; i <= 1; i += 2) {
            ctx.beginPath();
            ctx.arc(i * eyeSpacing, -5, 6, 0, Math.PI * 2);
            ctx.fillStyle = 'white';
            ctx.fill();
            
            // Pupils that follow Pac-Man
            ctx.beginPath();
            ctx.arc(i * eyeSpacing + this.eyeOffset.x, 
                   -5 + this.eyeOffset.y, 
                   3, 0, Math.PI * 2);
            ctx.fillStyle = 'blue';
            ctx.fill();
        }

        // If scared, add scared expression
        if (this.scared) {
            ctx.beginPath();
            ctx.moveTo(-10, 5);
            ctx.lineTo(-5, 0);
            ctx.lineTo(0, 5);
            ctx.lineTo(5, 0);
            ctx.lineTo(10, 5);
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        ctx.restore();
    }
}

const ghosts = [
    new Ghost(300, 200, '#FF0000', 'chase'),     // Red ghost - chaser
    new Ghost(300, 300, '#FFA500', 'ambush'),    // Orange ghost - ambusher
    new Ghost(400, 200, '#FFB8FF', 'random'),    // Pink ghost - random
    new Ghost(400, 300, '#00FFFF', 'patrol')     // Cyan ghost - patroller
];

// Power pellets with glow effect
const powerPelletRadius = 10;
const powerPellets = [
    { x: 50, y: 550 },
    { x: 750, y: 50 },
    { x: 50, y: 50 },
    { x: 750, y: 550 }
];

// Enhanced dots with light effect
const dotRadius = 4;
const dots = [];
function generateDots() {
    dots.length = 0;
    const spacing = 40;
    for (let x = spacing; x < canvas.width; x += spacing) {
        for (let y = spacing; y < canvas.height; y += spacing) {
            if (!powerPellets.some(pellet => 
                Math.hypot(pellet.x - x, pellet.y - y) < spacing)) {
                dots.push({ 
                    x, 
                    y,
                    glow: 0,
                    glowDir: 1
                });
            }
        }
    }
}

function drawDots() {
    // Regular dots with subtle animation
    dots.forEach(dot => {
        // Dot glow animation
        dot.glow += 0.05 * dot.glowDir;
        if (dot.glow >= 1) dot.glowDir = -1;
        if (dot.glow <= 0) dot.glowDir = 1;

        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dotRadius + dot.glow, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.8 + dot.glow * 0.2})`;
        ctx.fill();
    });

    // Power pellets with pulse effect
    powerPellets.forEach(pellet => {
        const pulseSize = Math.sin(gameTime * 0.1) * 2;
        
        // Outer glow
        ctx.beginPath();
        ctx.arc(pellet.x, pellet.y, powerPelletRadius + 5 + pulseSize, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 0, 0.2)';
        ctx.fill();

        // Inner pellet
        ctx.beginPath();
        ctx.arc(pellet.x, pellet.y, powerPelletRadius + pulseSize, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFF00';
        ctx.fill();
    });
}

generateDots();

// Handle key presses with smooth movement
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    ArrowDown: false
};

document.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = true;
        if (gameOver && e.key === 'ArrowUp') {
            restartGame();
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = false;
    }
});

function movePacMan() {
    let dx = 0;
    let dy = 0;

    if (keys.ArrowLeft) {
        dx -= pacMan.speed;
        pacMan.direction = 2;
    }
    if (keys.ArrowRight) {
        dx += pacMan.speed;
        pacMan.direction = 0;
    }
    if (keys.ArrowUp) {
        dy -= pacMan.speed;
        pacMan.direction = 3;
    }
    if (keys.ArrowDown) {
        dy += pacMan.speed;
        pacMan.direction = 1;
    }

    // Diagonal movement speed normalization
    if (dx !== 0 && dy !== 0) {
        dx *= 0.707;
        dy *= 0.707;
    }

    pacMan.x += dx;
    pacMan.y += dy;

    // Prevent Pac-Man from going out of bounds
    pacMan.x = Math.max(pacMan.radius, Math.min(canvas.width - pacMan.radius, pacMan.x));
    pacMan.y = Math.max(pacMan.radius, Math.min(canvas.height - pacMan.radius, pacMan.y));
}

function checkCollisions() {
    // Check dots
    for (let i = dots.length - 1; i >= 0; i--) {
        const dot = dots[i];
        const dist = Math.hypot(pacMan.x - dot.x, pacMan.y - dot.y);
        if (dist < pacMan.radius + dotRadius) {
            dots.splice(i, 1);
            score += 10;
            updateDisplay();
        }
    }

    // Check power pellets
    for (let i = powerPellets.length - 1; i >= 0; i--) {
        const pellet = powerPellets[i];
        const dist = Math.hypot(pacMan.x - pellet.x, pacMan.y - pellet.y);
        if (dist < pacMan.radius + powerPelletRadius) {
            powerPellets.splice(i, 1);
            score += 50;
            powerMode = true;
            powerModeTimer = 300; // 5 seconds at 60fps
            updateDisplay();
        }
    }

    // Check ghosts
    ghosts.forEach(ghost => {
        const dist = Math.hypot(pacMan.x - ghost.x, pacMan.y - ghost.y);
        if (dist < pacMan.radius + ghost.radius) {
            if (powerMode) {
                score += 200;
                // Respawn ghost
                ghost.x = canvas.width / 2;
                ghost.y = canvas.height / 2;
            } else {
                lives--;
                updateDisplay();
                if (lives <= 0) {
                    gameOver = true;
                } else {
                    resetPositions();
                }
            }
        }
    });

    // Check level completion
    if (dots.length === 0 && powerPellets.length === 0) {
        level++;
        resetLevel();
        updateDisplay();
    }
}

function resetPositions() {
    pacMan.x = 50;
    pacMan.y = 50;
    ghosts.forEach((ghost, index) => {
        ghost.x = canvas.width / 2 + (index % 2) * 100;
        ghost.y = canvas.height / 2 + Math.floor(index / 2) * 100;
    });
}

function resetLevel() {
    resetPositions();
    generateDots();
    powerPellets.length = 0;
    [
        { x: 50, y: 550 },
        { x: 750, y: 50 },
        { x: 50, y: 50 },
        { x: 750, y: 550 }
    ].forEach(pellet => powerPellets.push(pellet));
    
    // Increase difficulty
    ghosts.forEach(ghost => ghost.speed += 0.2);
    pacMan.speed += 0.1;
}

function restartGame() {
    score = 0;
    lives = 3;
    level = 1;
    gameOver = false;
    powerMode = false;
    powerModeTimer = 0;
    resetLevel();
    updateDisplay();
}

function updateDisplay() {
    scoreElement.textContent = score;
    livesElement.textContent = lives;
    levelElement.textContent = level;
}

function drawGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2);
    
    ctx.font = '24px Arial';
    ctx.fillStyle = 'white';
    ctx.fillText('Press UP to restart', canvas.width/2, canvas.height/2 + 40);
    ctx.fillText(`Final Score: ${score}`, canvas.width/2, canvas.height/2 + 80);
    ctx.fillText(`Level Reached: ${level}`, canvas.width/2, canvas.height/2 + 120);
}

// Add visual effects
function drawEffects() {
    // Power mode visual effect
    if (powerMode) {
        ctx.fillStyle = `rgba(255, 255, 0, ${powerModeTimer / 1000})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

// Game loop
function update() {
    gameTime++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!gameOver) {
        // Update power mode timer
        if (powerMode) {
            powerModeTimer--;
            if (powerModeTimer <= 0) {
                powerMode = false;
            }
        }

        movePacMan();
        pacMan.animate();
        ghosts.forEach(ghost => ghost.update());
        checkCollisions();
    }

    // Draw everything
    drawDots();
    drawEffects();
    pacMan.draw();
    ghosts.forEach(ghost => ghost.draw());

    if (gameOver) {
        drawGameOver();
    }

    requestAnimationFrame(update);
}

// Start the game
update();