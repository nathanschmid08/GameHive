const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Game state
let gameState = {
    score: 0,
    coins: 0,
    lives: 3,
    speed: 0,
    distance: 0,
    gameOver: false,
    scrollOffset: 0,
    combo: 1,
    comboTimer: 0,
    fuel: 100,
    turboReady: true,
    difficulty: 1
};

// Enhanced bike properties
const bike = {
    x: 150,
    y: canvas.height - 250,
    width: 90,
    height: 45,
    velocityX: 0,
    velocityY: 0,
    rotation: 0,
    wheelRotation: 0,
    onGround: false,
    acceleration: 0,
    maxSpeed: 15,
    jumpPower: 0,
    maxJumpPower: 25,
    invulnerable: 0,
    exhaustTimer: 0,
    lean: 0,
    bouncing: false,
    turboActive: false,
    turboTimer: 0
};

// Advanced physics
const physics = {
    gravity: 0.8,
    friction: 0.92,
    airResistance: 0.98,
    jumpLift: -18,
    maxLean: 0.3,
    groundFriction: 0.95
};

// Game objects
const terrain = [];
const obstacles = [];
const coins = [];
const particles = [];
const clouds = [];
const powerUps = [];
const stars = [];

// Terrain generation
let terrainSeed = 0;

// Initialize stars
function initStars() {
    for (let i = 0; i < 100; i++) {
        stars.push({
            x: Math.random() * canvas.width * 4,
            y: Math.random() * canvas.height * 0.6,
            size: Math.random() * 2 + 0.5,
            twinkle: Math.random() * Math.PI * 2,
            speed: Math.random() * 0.3 + 0.1
        });
    }
}

// Initialize clouds with more variety
function initClouds() {
    for (let i = 0; i < 12; i++) {
        clouds.push({
            x: Math.random() * canvas.width * 3,
            y: Math.random() * canvas.height * 0.4 + 30,
            size: Math.random() * 60 + 30,
            speed: Math.random() * 0.8 + 0.3,
            opacity: Math.random() * 0.4 + 0.3,
            type: Math.floor(Math.random() * 3)
        });
    }
}

// Generate realistic terrain
function generateTerrain() {
    let terrainHeight = 150;
    for (let x = 0; x < canvas.width * 5; x += 15) {
        const noise = Math.sin(x * 0.01 + terrainSeed) * 30 + Math.sin(x * 0.005) * 60;
        terrainHeight = 120 + noise;
        terrainHeight = Math.max(80, Math.min(250, terrainHeight));
        
        terrain.push({
            x: x,
            height: terrainHeight,
            width: 15,
            grass: Math.random() > 0.7
        });
    }
}

// Generate diverse obstacles and collectibles
function generateObstacles() {
    for (let i = 300; i < canvas.width * 5; i += Math.random() * 200 + 150) {
        const obstacleType = Math.random();
        
        if (obstacleType < 0.3) {
            obstacles.push({
                x: i,
                y: canvas.height - 180,
                width: 40,
                height: 50,
                type: 'rock',
                variant: Math.floor(Math.random() * 3)
            });
        } else if (obstacleType < 0.5) {
            obstacles.push({
                x: i,
                y: canvas.height - 200,
                width: 25,
                height: 70,
                type: 'tree'
            });
        } else if (obstacleType < 0.7) {
            obstacles.push({
                x: i,
                y: canvas.height - 160,
                width: 60,
                height: 30,
                type: 'log'
            });
        }
        
        // Add coins in clusters
        if (Math.random() < 0.6) {
            const coinCount = Math.floor(Math.random() * 4) + 2;
            for (let j = 0; j < coinCount; j++) {
                coins.push({
                    x: i + Math.random() * 200 + 50,
                    y: canvas.height - 180 - Math.random() * 120,
                    size: 12,
                    collected: false,
                    rotation: 0,
                    bounce: Math.random() * Math.PI * 2,
                    type: Math.random() > 0.9 ? 'gold' : 'normal'
                });
            }
        }
        
        // Power-ups
        if (Math.random() < 0.2) {
            const powerUpTypes = ['fuel', 'life', 'turbo', 'shield'];
            powerUps.push({
                x: i + Math.random() * 100,
                y: canvas.height - 200 - Math.random() * 80,
                type: powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)],
                collected: false,
                rotation: 0,
                pulse: 0
            });
        }
    }
}

// Enhanced controls
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowRight: false,
    ArrowLeft: false,
    Space: false
};

window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key) || e.key === ' ') {
        if (e.key === ' ') keys.Space = true;
        else keys[e.key] = true;
        e.preventDefault();
    }
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key) || e.key === ' ') {
        if (e.key === ' ') keys.Space = false;
        else keys[e.key] = false;
        e.preventDefault();
    }
});

// Advanced particle system
function createParticle(x, y, color, type = 'normal', velocity = null) {
    const count = type === 'explosion' ? 12 : (type === 'coin' ? 8 : 1);
    
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x + (Math.random() - 0.5) * 10,
            y: y + (Math.random() - 0.5) * 10,
            vx: velocity ? velocity.x + (Math.random() - 0.5) * 6 : (Math.random() - 0.5) * 8,
            vy: velocity ? velocity.y + Math.random() * -8 - 2 : Math.random() * -8 - 2,
            life: 1,
            decay: Math.random() * 0.02 + 0.01,
            color: color,
            size: type === 'explosion' ? Math.random() * 6 + 3 : Math.random() * 4 + 2,
            type: type,
            gravity: type === 'smoke' ? -0.1 : 0.3,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.2
        });
    }
}

// Draw enhanced sky with time of day
function drawSky() {
    const timeOfDay = (gameState.distance / 1000) % 24;
    let skyColors;
    
    if (timeOfDay < 6 || timeOfDay > 20) {
        // Night
        skyColors = ['#001122', '#003366', '#004488'];
    } else if (timeOfDay < 8 || timeOfDay > 18) {
        // Dawn/Dusk
        skyColors = ['#FF6B35', '#F7931E', '#FFD23F'];
    } else {
        // Day
        skyColors = ['#87CEEB', '#98D8E8', '#B0E0E6'];
    }
    
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, skyColors[0]);
    gradient.addColorStop(0.5, skyColors[1]);
    gradient.addColorStop(1, skyColors[2]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw stars at night
    if (timeOfDay < 6 || timeOfDay > 20) {
        drawStars();
    }
}

function drawStars() {
    stars.forEach(star => {
        const screenX = star.x - gameState.scrollOffset * star.speed;
        if (screenX > -10 && screenX < canvas.width + 10) {
            ctx.fillStyle = `rgba(255, 255, 255, ${0.8 + Math.sin(star.twinkle + Date.now() * 0.01) * 0.3})`;
            ctx.beginPath();
            ctx.arc(screenX, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

// Draw realistic clouds
function drawClouds() {
    clouds.forEach(cloud => {
        const screenX = cloud.x - gameState.scrollOffset * cloud.speed;
        if (screenX > -cloud.size * 2 && screenX < canvas.width + cloud.size * 2) {
            ctx.fillStyle = `rgba(255, 255, 255, ${cloud.opacity})`;
            
            // Different cloud shapes
            if (cloud.type === 0) {
                // Fluffy cloud
                ctx.beginPath();
                ctx.arc(screenX, cloud.y, cloud.size, 0, Math.PI * 2);
                ctx.arc(screenX + cloud.size * 0.7, cloud.y, cloud.size * 0.8, 0, Math.PI * 2);
                ctx.arc(screenX - cloud.size * 0.7, cloud.y, cloud.size * 0.6, 0, Math.PI * 2);
                ctx.arc(screenX, cloud.y - cloud.size * 0.4, cloud.size * 0.7, 0, Math.PI * 2);
                ctx.fill();
            } else if (cloud.type === 1) {
                // Streaky cloud
                ctx.fillRect(screenX - cloud.size, cloud.y - cloud.size * 0.2, cloud.size * 2, cloud.size * 0.4);
            } else {
                // Cumulus cloud
                for (let i = 0; i < 5; i++) {
                    ctx.beginPath();
                    ctx.arc(screenX - cloud.size + i * cloud.size * 0.5, cloud.y, cloud.size * (0.6 + i * 0.1), 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    });
}

// Draw detailed terrain
function drawTerrain() {
    ctx.fillStyle = '#2E7D32';
    ctx.beginPath();
    ctx.moveTo(-gameState.scrollOffset, canvas.height);
    
    terrain.forEach(segment => {
        ctx.lineTo(segment.x - gameState.scrollOffset, canvas.height - segment.height);
    });
    
    ctx.lineTo(canvas.width + 100, canvas.height);
    ctx.closePath();
    ctx.fill();
    
    // Add terrain details
    terrain.forEach(segment => {
        const screenX = segment.x - gameState.scrollOffset;
        if (screenX > -segment.width && screenX < canvas.width + segment.width) {
            // Grass texture
            if (segment.grass) {
                ctx.fillStyle = '#4CAF50';
                for (let i = 0; i < 5; i++) {
                    const grassX = screenX + Math.random() * segment.width;
                    const grassY = canvas.height - segment.height;
                    ctx.fillRect(grassX, grassY - 8, 2, 12);
                }
            }
            
            // Dirt patches
            if (Math.random() > 0.95) {
                ctx.fillStyle = '#8D6E63';
                ctx.fillRect(screenX, canvas.height - segment.height, segment.width, 5);
            }
        }
    });
}

// Draw realistic motorcycle
function drawBike() {
    ctx.save();
    ctx.translate(bike.x + bike.width/2, bike.y + bike.height/2);
    ctx.rotate(bike.rotation + bike.lean);
    
    // Main body frame
    ctx.fillStyle = '#C62828';
    ctx.fillRect(-bike.width/2 + 10, -bike.height/2 + 5, bike.width - 20, bike.height - 10);
    
    // Gas tank
    ctx.fillStyle = '#D32F2F';
    ctx.beginPath();
    ctx.ellipse(-5, -bike.height/2 + 8, 25, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Seat
    ctx.fillStyle = '#424242';
    ctx.beginPath();
    ctx.ellipse(15, -bike.height/2 + 3, 20, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Handlebars
    ctx.strokeStyle = '#616161';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-bike.width/2 + 5, -bike.height/2);
    ctx.lineTo(-bike.width/2 - 10, -bike.height/2 - 15);
    ctx.stroke();
    
    // Engine
    ctx.fillStyle = '#37474F';
    ctx.fillRect(-bike.width/2 + 15, bike.height/2 - 15, 30, 15);
    
    // Exhaust pipe
    ctx.fillStyle = '#90A4AE';
    ctx.fillRect(bike.width/2 - 30, bike.height/2 - 5, 35, 8);
    
    // Headlight
    ctx.fillStyle = '#FFEB3B';
    ctx.beginPath();
    ctx.arc(-bike.width/2 + 2, -bike.height/2 + 10, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Rider silhouette
    ctx.fillStyle = '#1A1A1A';
    ctx.beginPath();
    ctx.arc(5, -bike.height/2 - 20, 8, 0, Math.PI * 2); // Head
    ctx.fill();
    ctx.fillRect(0, -bike.height/2 - 15, 10, 25); // Body
    
    ctx.restore();
    
    // Wheels with detailed spokes and suspension
    drawDetailedWheel(bike.x + 15, bike.y + bike.height + 8, 18, bike.wheelRotation);
    drawDetailedWheel(bike.x + bike.width - 15, bike.y + bike.height + 8, 18, bike.wheelRotation);
    
    // Turbo effects
    if (bike.turboActive) {
        for (let i = 0; i < 3; i++) {
            createParticle(
                bike.x - 20 - i * 10, 
                bike.y + bike.height/2 + Math.random() * 10 - 5, 
                '#00BFFF', 
                'turbo'
            );
        }
    }
    
    // Exhaust effects
    if (gameState.speed > 5) {
        bike.exhaustTimer++;
        if (bike.exhaustTimer % 3 === 0) {
            createParticle(bike.x + bike.width + 10, bike.y + bike.height - 5, '#666', 'smoke');
        }
    }
    
    // Invulnerability shield
    if (bike.invulnerable > 0) {
        ctx.strokeStyle = `rgba(0, 255, 255, ${0.7 * Math.sin(Date.now() * 0.05)})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(bike.x + bike.width/2, bike.y + bike.height/2, 50, 0, Math.PI * 2);
        ctx.stroke();
    }
}

function drawDetailedWheel(x, y, radius, rotation) {
    // Tire
    ctx.fillStyle = '#212121';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Tire tread
    ctx.strokeStyle = '#424242';
    ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 + rotation;
        ctx.beginPath();
        ctx.arc(x + Math.cos(angle) * (radius - 3), y + Math.sin(angle) * (radius - 3), 2, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Rim
    ctx.fillStyle = '#757575';
    ctx.beginPath();
    ctx.arc(x, y, radius - 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Spokes
    ctx.strokeStyle = '#BDBDBD';
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + rotation;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle) * (radius - 6), y + Math.sin(angle) * (radius - 6));
        ctx.stroke();
    }
    
    // Center hub
    ctx.fillStyle = '#9E9E9E';
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
}

// Draw enhanced obstacles
function drawObstacles() {
    obstacles.forEach(obstacle => {
        const screenX = obstacle.x - gameState.scrollOffset;
        if (screenX > -obstacle.width && screenX < canvas.width + obstacle.width) {
            if (obstacle.type === 'rock') {
                drawRock(screenX, obstacle.y, obstacle.width, obstacle.height, obstacle.variant);
            } else if (obstacle.type === 'tree') {
                drawTree(screenX, obstacle.y, obstacle.width, obstacle.height);
            } else if (obstacle.type === 'log') {
                drawLog(screenX, obstacle.y, obstacle.width, obstacle.height);
            }
        }
    });
}

function drawRock(x, y, width, height, variant) {
    ctx.fillStyle = variant === 0 ? '#616161' : variant === 1 ? '#757575' : '#424242';
    ctx.beginPath();
    ctx.moveTo(x, y + height);
    ctx.lineTo(x + width * 0.2, y);
    ctx.lineTo(x + width * 0.8, y + height * 0.3);
    ctx.lineTo(x + width, y + height * 0.7);
    ctx.lineTo(x + width * 0.6, y + height);
    ctx.closePath();
    ctx.fill();
    
    // Rock highlights
    ctx.fillStyle = '#9E9E9E';
    ctx.fillRect(x + width * 0.1, y + height * 0.2, width * 0.3, height * 0.2);
}

function drawTree(x, y, width, height) {
    // Trunk
    ctx.fillStyle = '#5D4037';
    ctx.fillRect(x + width * 0.3, y + height * 0.4, width * 0.4, height * 0.6);
    
    // Leaves
    ctx.fillStyle = '#2E7D32';
    ctx.beginPath();
    ctx.arc(x + width/2, y + height * 0.3, width * 0.7, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#388E3C';
    ctx.beginPath();
    ctx.arc(x + width/2, y + height * 0.2, width * 0.5, 0, Math.PI * 2);
    ctx.fill();
}

function drawLog(x, y, width, height) {
    ctx.fillStyle = '#6D4C41';
    ctx.fillRect(x, y, width, height);
    
    // Wood rings
    ctx.strokeStyle = '#5D4037';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y + height/2, height/2, 0, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + width, y + height/2, height/2, Math.PI, 0);
    ctx.stroke();
}

// Draw enhanced coins and power-ups
function drawCoins() {
    coins.forEach(coin => {
        if (!coin.collected) {
            const screenX = coin.x - gameState.scrollOffset;
            if (screenX > -coin.size && screenX < canvas.width + coin.size) {
                ctx.save();
                ctx.translate(screenX, coin.y + Math.sin(coin.bounce) * 5);
                ctx.rotate(coin.rotation);
                
                // Coin glow
                ctx.shadowColor = coin.type === 'gold' ? '#FFD700' : '#FFA500';
                ctx.shadowBlur = 15;
                
                // Coin body
                ctx.fillStyle = coin.type === 'gold' ? '#FFD700' : '#FFA500';
                ctx.beginPath();
                ctx.arc(0, 0, coin.size, 0, Math.PI * 2);
                ctx.fill();
                
                // Inner circle
                ctx.shadowBlur = 0;
                ctx.fillStyle = coin.type === 'gold' ? '#FFC107' : '#FF8F00';
                ctx.beginPath();
                ctx.arc(0, 0, coin.size - 3, 0, Math.PI * 2);
                ctx.fill();
                
                // Dollar/Star symbol
                ctx.fillStyle = coin.type === 'gold' ? '#FFD700' : '#FFA500';
                ctx.font = `${coin.size * 1.2}px Arial`;
                ctx.textAlign = 'center';
                ctx.fillText(coin.type === 'gold' ? '★' : '$', 0, coin.size/3);
                
                ctx.restore();
                
                coin.rotation += 0.1;
                coin.bounce += 0.1;
            }
        }
    });
}

function drawPowerUps() {
    powerUps.forEach(powerUp => {
        if (!powerUp.collected) {
            const screenX = powerUp.x - gameState.scrollOffset;
            if (screenX > -30 && screenX < canvas.width + 30) {
                ctx.save();
                ctx.translate(screenX, powerUp.y + Math.sin(powerUp.pulse) * 3);
                
                const pulseScale = 1 + Math.sin(powerUp.pulse * 2) * 0.1;
                ctx.scale(pulseScale, pulseScale);
                
                // Power-up glow
                ctx.shadowBlur = 20;
                
                if (powerUp.type === 'fuel') {
                    ctx.shadowColor = '#4CAF50';
                    ctx.fillStyle = '#4CAF50';
                    ctx.fillRect(-12, -12, 24, 24);
                    ctx.fillStyle = '#2E7D32';
                    ctx.fillRect(-8, -8, 16, 16);
                    ctx.fillStyle = 'white';
                    ctx.font = '16px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('⛽', 0, 5);
                } else if (powerUp.type === 'life') {
                    ctx.shadowColor = '#E91E63';
                    ctx.fillStyle = '#E91E63';
                    ctx.beginPath();
                    ctx.arc(0, 0, 15, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = 'white';
                    ctx.font = '20px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('❤️', 0, 5);
                } else if (powerUp.type === 'turbo') {
                    ctx.shadowColor = '#FF5722';
                    ctx.fillStyle = '#FF5722';
                    ctx.fillRect(-12, -12, 24, 24);
                    ctx.fillStyle = 'white';
                    ctx.font = '16px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('🚀', 0, 5);
                } else if (powerUp.type === 'shield') {
                    ctx.shadowColor = '#2196F3';
                    ctx.fillStyle = '#2196F3';
                    ctx.beginPath();
                    ctx.arc(0, 0, 15, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = 'white';
                    ctx.font = '16px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('🛡️', 0, 5);
                }
                
                ctx.restore();
                powerUp.rotation += 0.05;
                powerUp.pulse += 0.15;
            }
        }
    });
}

// Enhanced particle system
function drawParticles() {
    particles.forEach((particle, index) => {
        ctx.save();
        ctx.globalAlpha = particle.life;
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        
        if (particle.type === 'turbo') {
            ctx.fillStyle = particle.color;
            ctx.beginPath();
            ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(0, 0, particle.size * 0.5, 0, Math.PI * 2);
            ctx.fill();
        } else if (particle.type === 'explosion') {
            ctx.fillStyle = particle.color;
            ctx.fillRect(-particle.size/2, -particle.size/2, particle.size, particle.size);
        } else if (particle.type === 'coin') {
            ctx.fillStyle = particle.color;
            ctx.beginPath();
            ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillStyle = particle.color;
            ctx.fillRect(-particle.size/2, -particle.size/2, particle.size, particle.size);
        }
        
        ctx.restore();
        
        // Update particle physics
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += particle.gravity;
        particle.vx *= 0.99;
        particle.life -= particle.decay;
        particle.rotation += particle.rotationSpeed;
        
        if (particle.life <= 0) {
            particles.splice(index, 1);
        }
    });
}

// Advanced bike physics and controls
function updateBike() {
    if (gameState.gameOver) return;
    
    // Handle acceleration
    if (keys.ArrowUp) {
        bike.acceleration += 0.3;
        bike.acceleration = Math.min(bike.acceleration, 1.5);
        
        // Turbo boost
        if (keys.Space && gameState.turboReady && gameState.fuel > 10) {
            bike.turboActive = true;
            bike.turboTimer = 60;
            gameState.fuel -= 0.5;
            bike.acceleration *= 2;
            gameState.turboReady = false;
            setTimeout(() => gameState.turboReady = true, 3000);
        }
    } else if (keys.ArrowDown) {
        bike.acceleration -= 0.4;
        bike.acceleration = Math.max(bike.acceleration, -0.8);
    } else {
        bike.acceleration *= 0.9;
    }
    
    // Handle steering and leaning
    if (keys.ArrowLeft) {
        bike.velocityX -= 0.3;
        bike.lean = Math.max(bike.lean - 0.02, -physics.maxLean);
    } else if (keys.ArrowRight) {
        bike.velocityX += 0.3;
        bike.lean = Math.min(bike.lean + 0.02, physics.maxLean);
    } else {
        bike.lean *= 0.95;
    }
    
    // Update turbo
    if (bike.turboTimer > 0) {
        bike.turboTimer--;
        if (bike.turboTimer <= 0) {
            bike.turboActive = false;
        }
    }
    
    // Apply forces
    gameState.speed += bike.acceleration;
    gameState.speed = Math.max(0, Math.min(gameState.speed, bike.maxSpeed + (bike.turboActive ? 8 : 0)));
    gameState.speed *= bike.onGround ? physics.groundFriction : physics.airResistance;
    
    bike.velocityX *= physics.friction;
    bike.velocityY += physics.gravity;
    
    // Super jump
    if (keys.ArrowUp && keys.Space && bike.onGround && gameState.fuel > 20) {
        bike.velocityY = physics.jumpLift * 1.5;
        bike.onGround = false;
        gameState.fuel -= 20;
        createParticle(bike.x + bike.width/2, bike.y + bike.height, '#FFD700', 'explosion');
    } else if (keys.Space && bike.onGround) {
        bike.velocityY = physics.jumpLift;
        bike.onGround = false;
    }
    
    // Update position
    bike.x += bike.velocityX;
    bike.y += bike.velocityY;
    
    // Wheel rotation
    bike.wheelRotation += gameState.speed * 0.1;
    
    // Ground collision with realistic terrain following
    bike.onGround = false;
    const bikeCenter = bike.x + bike.width/2 + gameState.scrollOffset;
    
    for (let i = 0; i < terrain.length - 1; i++) {
        const segment = terrain[i];
        const nextSegment = terrain[i + 1];
        
        if (bikeCenter >= segment.x && bikeCenter <= nextSegment.x) {
            const ratio = (bikeCenter - segment.x) / (nextSegment.x - segment.x);
            const interpolatedHeight = segment.height + (nextSegment.height - segment.height) * ratio;
            const groundY = canvas.height - interpolatedHeight;
            
            if (bike.y + bike.height >= groundY) {
                bike.y = groundY - bike.height;
                
                // Calculate terrain angle for bike rotation
                const terrainAngle = Math.atan2(nextSegment.height - segment.height, nextSegment.x - segment.x);
                bike.rotation = terrainAngle * 0.3;
                
                if (bike.velocityY > 5) {
                    // Hard landing effects
                    createParticle(bike.x + bike.width/2, bike.y + bike.height, '#8D6E63', 'explosion');
                    bike.bouncing = true;
                    setTimeout(() => bike.bouncing = false, 200);
                }
                
                bike.velocityY = 0;
                bike.onGround = true;
                break;
            }
        }
    }
    
    // Screen boundaries
    bike.x = Math.max(50, Math.min(bike.x, canvas.width - bike.width - 50));
    
    // Update scroll based on bike position and speed
    const targetScroll = gameState.scrollOffset + gameState.speed;
    gameState.scrollOffset = targetScroll;
    
    // Update distance and difficulty
    gameState.distance = Math.floor(gameState.scrollOffset / 10);
    gameState.difficulty = 1 + Math.floor(gameState.distance / 500);
    
    // Consume fuel
    gameState.fuel -= gameState.speed * 0.01;
    gameState.fuel = Math.max(0, gameState.fuel);
    
    if (gameState.fuel <= 0 && gameState.speed > 0) {
        gameState.speed *= 0.95; // Slow down when out of fuel
    }
    
    // Update invulnerability
    if (bike.invulnerable > 0) bike.invulnerable--;
    
    // Update combo timer
    if (gameState.comboTimer > 0) {
        gameState.comboTimer--;
        if (gameState.comboTimer <= 0) {
            gameState.combo = 1;
            document.getElementById('comboDisplay').style.opacity = '0';
        }
    }
    
    // Update score based on speed and combo
    gameState.score += Math.floor(gameState.speed * gameState.combo);
}

// Enhanced collision detection
function checkCollisions() {
    if (bike.invulnerable > 0) return;
    
    // Obstacle collisions
    obstacles.forEach(obstacle => {
        const screenX = obstacle.x - gameState.scrollOffset;
        if (bike.x < screenX + obstacle.width &&
            bike.x + bike.width > screenX &&
            bike.y < obstacle.y + obstacle.height &&
            bike.y + bike.height > obstacle.y) {
            
            // Collision detected
            gameState.lives--;
            bike.invulnerable = 180; // 3 seconds
            gameState.combo = 1;
            gameState.comboTimer = 0;
            
            // Dramatic explosion
            createParticle(bike.x + bike.width/2, bike.y + bike.height/2, '#FF4444', 'explosion');
            createParticle(bike.x + bike.width/2, bike.y + bike.height/2, '#FF8800', 'explosion');
            
            // Screen shake effect
            canvas.style.transform = 'translate(' + (Math.random() * 10 - 5) + 'px, ' + (Math.random() * 10 - 5) + 'px)';
            setTimeout(() => canvas.style.transform = '', 100);
            
            if (gameState.lives <= 0) {
                gameState.gameOver = true;
                document.getElementById('gameOver').style.display = 'block';
                updateFinalStats();
            }
        }
    });
    
    // Coin collection
    coins.forEach(coin => {
        if (!coin.collected) {
            const screenX = coin.x - gameState.scrollOffset;
            const distance = Math.sqrt(
                Math.pow(bike.x + bike.width/2 - screenX, 2) + 
                Math.pow(bike.y + bike.height/2 - coin.y, 2)
            );
            
            if (distance < coin.size + 20) {
                coin.collected = true;
                gameState.coins++;
                
                const coinValue = coin.type === 'gold' ? 200 : 50;
                gameState.score += coinValue * gameState.combo;
                
                // Increase combo
                gameState.combo = Math.min(gameState.combo + 1, 10);
                gameState.comboTimer = 300; // 5 seconds at 60fps
                
                if (gameState.combo > 1) {
                    const comboDisplay = document.getElementById('comboDisplay');
                    comboDisplay.textContent = `COMBO x${gameState.combo}!`;
                    comboDisplay.style.opacity = '1';
                    setTimeout(() => comboDisplay.style.opacity = '0', 1000);
                }
                
                // Coin collection particles
                createParticle(screenX, coin.y, coin.type === 'gold' ? '#FFD700' : '#FFA500', 'coin');
            }
        }
    });
    
    // Power-up collection
    powerUps.forEach(powerUp => {
        if (!powerUp.collected) {
            const screenX = powerUp.x - gameState.scrollOffset;
            const distance = Math.sqrt(
                Math.pow(bike.x + bike.width/2 - screenX, 2) + 
                Math.pow(bike.y + bike.height/2 - powerUp.y, 2)
            );
            
            if (distance < 30) {
                powerUp.collected = true;
                
                if (powerUp.type === 'fuel') {
                    gameState.fuel = Math.min(gameState.fuel + 50, 100);
                } else if (powerUp.type === 'life') {
                    gameState.lives = Math.min(gameState.lives + 1, 5);
                } else if (powerUp.type === 'turbo') {
                    bike.turboActive = true;
                    bike.turboTimer = 120;
                } else if (powerUp.type === 'shield') {
                    bike.invulnerable = 300;
                }
                
                gameState.score += 100;
                createParticle(screenX, powerUp.y, '#00FF00', 'explosion');
            }
        }
    });
}

// Update UI elements
function updateUI() {
    document.getElementById('score').textContent = gameState.score.toLocaleString();
    document.getElementById('coins').textContent = gameState.coins;
    document.getElementById('combo').textContent = gameState.combo;
    document.getElementById('lives').textContent = gameState.lives;
    document.getElementById('speed').textContent = Math.floor(gameState.speed * 10);
    document.getElementById('distance').textContent = gameState.distance.toLocaleString();
    
    // Update speed bar
    const speedPercentage = (gameState.speed / bike.maxSpeed) * 100;
    document.getElementById('speedBar').style.width = speedPercentage + '%';
}

function updateFinalStats() {
    document.getElementById('finalScore').textContent = gameState.score.toLocaleString();
    document.getElementById('finalDistance').textContent = gameState.distance.toLocaleString();
    document.getElementById('finalCoins').textContent = gameState.coins;
}

function restartGame() {
    // Reset game state
    gameState = {
        score: 0,
        coins: 0,
        lives: 3,
        speed: 0,
        distance: 0,
        gameOver: false,
        scrollOffset: 0,
        combo: 1,
        comboTimer: 0,
        fuel: 100,
        turboReady: true,
        difficulty: 1
    };
    
    // Reset bike
    bike.x = 150;
    bike.y = canvas.height - 250;
    bike.velocityX = 0;
    bike.velocityY = 0;
    bike.rotation = 0;
    bike.wheelRotation = 0;
    bike.onGround = false;
    bike.acceleration = 0;
    bike.jumpPower = 0;
    bike.invulnerable = 0;
    bike.exhaustTimer = 0;
    bike.lean = 0;
    bike.bouncing = false;
    bike.turboActive = false;
    bike.turboTimer = 0;
    
    // Reset collectibles
    coins.forEach(coin => coin.collected = false);
    powerUps.forEach(powerUp => powerUp.collected = false);
    
    // Clear particles
    particles.length = 0;
    
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('comboDisplay').style.opacity = '0';
}

// Main game loop
function gameLoop() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw everything in order
    drawSky();
    drawClouds();
    drawTerrain();
    drawObstacles();
    drawCoins();
    drawPowerUps();
    drawBike();
    drawParticles();
    
    // Update game logic
    updateBike();
    checkCollisions();
    updateUI();
    
    requestAnimationFrame(gameLoop);
}

// Initialize game
initStars();
initClouds();
generateTerrain();
generateObstacles();
gameLoop();

// Handle window resize
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// Prevent context menu on right click
canvas.addEventListener('contextmenu', e => e.preventDefault());