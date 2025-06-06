const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const coinCountElement = document.getElementById('coinCount');
const scoreElement = document.getElementById('score');
const healthFill = document.getElementById('healthFill');

// Game variables
let coins = [];
let enemies = [];
let powerups = [];
let particles = [];
let coinCount = 0;
let score = 0;
let gameTime = 0;

// Power-up types
const POWERUP_TYPES = {
    SPEED: { color: '#3498db', effect: 'speed' },
    JUMP: { color: '#2ecc71', effect: 'jump' },
    SHIELD: { color: '#9b59b6', effect: 'shield' }
};

const player = {
    x: 50,
    y: 300,
    width: 30,
    height: 30,
    color: "#FF4500",
    velocityX: 0,
    velocityY: 0,
    baseSpeed: 5,
    speed: 5,
    baseJumpPower: -13,
    jumpPower: -13,
    grounded: false,
    jumping: false,
    facingRight: true,
    health: 100,
    maxHealth: 100,
    shield: false,
    powerupTimer: 0,
    currentPowerup: null,
    reset() {
        this.x = 50;
        this.y = 300;
        this.velocityX = 0;
        this.velocityY = 0;
        this.grounded = false;
        this.jumping = false;
        this.health = this.maxHealth;
        this.speed = this.baseSpeed;
        this.jumpPower = this.baseJumpPower;
        this.shield = false;
        this.powerupTimer = 0;
        this.currentPowerup = null;
        updateHealthBar();
    }
};

const platforms = [
    { x: 0, y: 370, width: 800, height: 30, color: "#3A7D44" }, // Ground
    { x: 150, y: 300, width: 100, height: 20, color: "#2E6339" },
    { x: 300, y: 250, width: 100, height: 20, color: "#2E6339" },
    { x: 500, y: 200, width: 100, height: 20, color: "#2E6339" },
    { x: 650, y: 150, width: 100, height: 20, color: "#2E6339" },
    { x: 400, y: 150, width: 60, height: 20, color: "#FFD700" }, // Special platform
];

class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 25;
        this.height = 25;
        this.speed = 2;
        this.direction = 1;
        this.patrolDistance = 100;
        this.startX = x;
    }

    update() {
        this.x += this.speed * this.direction;
        
        if (this.x > this.startX + this.patrolDistance || 
            this.x < this.startX - this.patrolDistance) {
            this.direction *= -1;
        }
    }

    draw() {
        ctx.fillStyle = "#e74c3c";
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Eyes
        ctx.fillStyle = "white";
        const eyeX = this.direction > 0 ? this.x + 15 : this.x + 5;
        ctx.fillRect(eyeX, this.y + 8, 5, 5);
        
        // Angry eyebrows
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x + 5, this.y + 5);
        ctx.lineTo(this.x + 15, this.y + 8);
        ctx.stroke();
    }
}

function updateHealthBar() {
    healthFill.style.width = (player.health / player.maxHealth * 100) + '%';
}

function spawnPowerup() {
    const types = Object.values(POWERUP_TYPES);
    const type = types[Math.floor(Math.random() * types.length)];
    const platform = platforms[Math.floor(Math.random() * (platforms.length - 1)) + 1];
    
    powerups.push({
        x: platform.x + platform.width/2,
        y: platform.y - 30,
        size: 15,
        type: type,
        collected: false
    });
}

function applyPowerup(type) {
    player.powerupTimer = 300; // 5 seconds
    player.currentPowerup = type;

    switch(type.effect) {
        case 'speed':
            player.speed = player.baseSpeed * 1.5;
            break;
        case 'jump':
            player.jumpPower = player.baseJumpPower * 1.3;
            break;
        case 'shield':
            player.shield = true;
            break;
    }

    createParticles(player.x + player.width/2, player.y + player.height/2, type.color, 15);
}

function updatePowerups() {
    if (player.powerupTimer > 0) {
        player.powerupTimer--;
        if (player.powerupTimer === 0) {
            // Reset powerup effects
            player.speed = player.baseSpeed;
            player.jumpPower = player.baseJumpPower;
            player.shield = false;
            player.currentPowerup = null;
        }
    }
}

function initLevel() {
    enemies = [
        new Enemy(200, 270),
        new Enemy(400, 220),
        new Enemy(600, 120)
    ];

    coins = platforms.slice(1).map(platform => ({
        x: platform.x + platform.width/2,
        y: platform.y - 30,
        size: 15,
        collected: false
    }));

    // Initial powerup
    spawnPowerup();
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 4 + 2;
        this.speedX = (Math.random() - 0.5) * 6;
        this.speedY = (Math.random() - 0.5) * 6;
        this.gravity = 0.1;
        this.life = 1;
        this.decay = Math.random() * 0.02 + 0.02;
    }

    update() {
        this.speedY += this.gravity;
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= this.decay;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

function createParticles(x, y, color, amount) {
    for (let i = 0; i < amount; i++) {
        particles.push(new Particle(x, y, color));
    }
}

let keys = {};

function drawPlatforms() {
    platforms.forEach(platform => {
        // Platform shadow
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        ctx.fillRect(platform.x + 4, platform.y + 4, platform.width, platform.height);
        
        // Platform
        ctx.fillStyle = platform.color;
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        
        // Platform top highlight
        ctx.fillStyle = "rgba(255,255,255,0.1)";
        ctx.fillRect(platform.x, platform.y, platform.width, 4);
    });
}

function drawPlayer() {
    // Shield effect
    if (player.shield) {
        ctx.strokeStyle = "#9b59b6";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.x + player.width/2, player.y + player.height/2, 
               player.width * 0.8, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Player shadow
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fillRect(player.x + 4, player.y + 4, player.width, player.height);
    
    // Player body
    ctx.fillStyle = player.currentPowerup ? player.currentPowerup.color : player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    // Eyes
    ctx.fillStyle = "white";
    const eyeX = player.facingRight ? player.x + 20 : player.x + 5;
    ctx.fillRect(eyeX, player.y + 8, 5, 5);
    
    // Running animation
    if (player.velocityX !== 0 && player.grounded) {
        const legOffset = Math.sin(Date.now() * 0.01) * 5;
        ctx.fillStyle = player.color;
        ctx.fillRect(player.x + 5, player.y + player.height, 5, legOffset);
        ctx.fillRect(player.x + player.width - 10, player.y + player.height, 5, -legOffset);
    }
}

function drawCoins() {
    coins.forEach(coin => {
        if (!coin.collected) {
            // Coin animation
            const bounce = Math.sin(Date.now() * 0.005) * 3;
            
            // Coin shadow
            ctx.fillStyle = "rgba(0,0,0,0.2)";
            ctx.beginPath();
            ctx.arc(coin.x + 2, coin.y + bounce + 2, coin.size, 0, Math.PI * 2);
            ctx.fill();
            
            // Coin body
            ctx.fillStyle = "#FFD700";
            ctx.beginPath();
            ctx.arc(coin.x, coin.y + bounce, coin.size, 0, Math.PI * 2);
            ctx.fill();
            
            // Coin shine
            ctx.fillStyle = "#FFF";
            ctx.beginPath();
            ctx.arc(coin.x - 5, coin.y + bounce - 5, coin.size/3, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

function drawPowerups() {
    powerups.forEach(powerup => {
        if (!powerup.collected) {
            const bounce = Math.sin(Date.now() * 0.005) * 3;
            
            // Powerup glow
            ctx.fillStyle = powerup.type.color;
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.arc(powerup.x, powerup.y + bounce, powerup.size * 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;

            // Powerup body
            ctx.fillStyle = powerup.type.color;
            ctx.beginPath();
            ctx.arc(powerup.x, powerup.y + bounce, powerup.size, 0, Math.PI * 2);
            ctx.fill();

            // Powerup shine
            ctx.fillStyle = "#FFF";
            ctx.beginPath();
            ctx.arc(powerup.x - 5, powerup.y + bounce - 5, powerup.size/3, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

function checkCollisions() {
    player.grounded = false;
    
    // Platform collisions
    platforms.forEach(platform => {
        if (
            player.x < platform.x + platform.width &&
            player.x + player.width > platform.x &&
            player.y + player.height > platform.y &&
            player.y + player.height < platform.y + platform.height + player.velocityY
        ) {
            player.grounded = true;
            player.y = platform.y - player.height;
            player.velocityY = 0;
        }
    });

    // Coin collisions
    coins.forEach(coin => {
        if (!coin.collected &&
            player.x < coin.x + coin.size &&
            player.x + player.width > coin.x - coin.size &&
            player.y < coin.y + coin.size &&
            player.y + player.height > coin.y - coin.size) {
            coin.collected = true;
            coinCount++;
            score += 100;
            createParticles(coin.x, coin.y, "#FFD700", 10);
            coinCountElement.textContent = coinCount;
            scoreElement.textContent = score;
        }
    });

    // Powerup collisions
    powerups.forEach(powerup => {
        if (!powerup.collected &&
            player.x < powerup.x + powerup.size &&
            player.x + player.width > powerup.x - powerup.size &&
            player.y < powerup.y + powerup.size &&
            player.y + player.height > powerup.y - powerup.size) {
            powerup.collected = true;
            applyPowerup(powerup.type);
            score += 200;
            scoreElement.textContent = score;
        }
    });

    // Enemy collisions
    enemies.forEach(enemy => {
        if (player.x < enemy.x + enemy.width &&
            player.x + player.width > enemy.x &&
            player.y < enemy.y + enemy.height &&
            player.y + player.height > enemy.y) {
            if (!player.shield) {
                player.health -= 20;
                updateHealthBar();
                player.velocityY = -10;
                createParticles(player.x + player.width/2, player.y + player.height/2, "#e74c3c", 15);
                
                if (player.health <= 0) {
                    player.reset();
                    coinCount = 0;
                    score = 0;
                    coinCountElement.textContent = coinCount;
                    scoreElement.textContent = score;
                    initLevel();
                }
            }
        }
    });
}

function updateParticles() {
    particles = particles.filter(particle => {
        particle.update();
        return particle.life > 0;
    });
}

function drawParticles() {
    particles.forEach(particle => particle.draw());
}

function update() {
    // Player movement
    if (keys['ArrowLeft']) {
        player.velocityX = -player.speed;
        player.facingRight = false;
    } else if (keys['ArrowRight']) {
        player.velocityX = player.speed;
        player.facingRight = true;
    } else {
        player.velocityX = 0;
    }

    // Sprinting
    if (keys['Shift']) {
        player.speed = player.baseSpeed * 1.5;
    } else {
        player.speed = player.baseSpeed;
    }

    // Jumping
    if (keys[' '] && player.grounded && !player.jumping) {
        player.velocityY = player.jumpPower;
        player.jumping = true;
        player.grounded = false;
    }

    // Apply gravity
    if (!player.grounded) {
        player.velocityY += 0.8;
    }

    // Update position
    player.x += player.velocityX;
    player.y += player.velocityY;

    // Screen boundaries
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
    if (player.y + player.height > canvas.height) player.y = canvas.height - player.height;

    // Reset jumping state when landed
    if (player.grounded) {
        player.jumping = false;
    }

    // Update enemies
    enemies.forEach(enemy => enemy.update());

    // Update powerup effects
    updatePowerups();

    // Spawn new powerup occasionally
    if (Math.random() < 0.001) {
        spawnPowerup();
    }

    // Update particles
    updateParticles();

    // Check all collisions
    checkCollisions();

    // Update game time
    gameTime++;
}

function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw game elements
    drawPlatforms();
    drawCoins();
    drawPowerups();
    drawParticles();
    enemies.forEach(enemy => enemy.draw());
    drawPlayer();
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Event listeners
window.addEventListener('keydown', e => {
    keys[e.key] = true;
    if (e.key === 'r') {
        player.reset();
        coinCount = 0;
        score = 0;
        coinCountElement.textContent = coinCount;
        scoreElement.textContent = score;
        initLevel();
    }
});

window.addEventListener('keyup', e => {
    keys[e.key] = false;
});

// Start game
initLevel();
gameLoop();