const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const miniMapCanvas = document.getElementById('miniMap');
const miniMapCtx = miniMapCanvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
miniMapCanvas.width = 200;
miniMapCanvas.height = 100;

// Enhanced physics constants
const PHYSICS = {
    GRAVITY: 0.6,
    AIR_RESISTANCE: 0.99,
    GROUND_FRICTION: 0.95,
    SUSPENSION_STIFFNESS: 0.3,
    SUSPENSION_DAMPING: 0.7,
    ENGINE_POWER: [0, 0.15, 0.25, 0.35, 0.45, 0.55],
    GEAR_THRESHOLDS: [0, 5, 10, 15, 20, 25],
    FUEL_CONSUMPTION: 0.02,
    WEATHER_EFFECTS: {
        clear: { friction: 1.0, visibility: 1.0 },
        rain: { friction: 0.7, visibility: 0.6 },
        fog: { friction: 0.9, visibility: 0.3 },
        snow: { friction: 0.5, visibility: 0.4 }
    }
};

// Enhanced game state
let distance = 0;
let score = 0;
let money = 100;
let gameOver = false;
let gamePaused = false;
let cameraPosX = 0;
let currentGear = 1;
let gameStartTime = Date.now();
let fuel = 100;
let health = 100;
let currentWeather = 'clear';
let weatherTimer = 0;
let checkpointsPassed = 0;
let particles = [];

// Upgrade system
const upgrades = {
    engine: { level: 0, cost: 500, effect: 'power' },
    suspension: { level: 0, cost: 300, effect: 'stability' },
    fuel: { level: 0, cost: 200, effect: 'efficiency' },
    tires: { level: 0, cost: 150, effect: 'grip' }
};

// Enhanced bike properties
const bike = {
    x: 100,
    y: canvas.height - 150,
    width: 100,
    height: 60,
    wheelBase: 80,
    wheelRadius: 25,
    speed: 0,
    maxSpeed: 35,
    velocityY: 0,
    rotation: 0,
    wheelRotation: 0,
    frontSuspension: { height: 0, velocity: 0, restHeight: 0 },
    rearSuspension: { height: 0, velocity: 0, restHeight: 0 },
    lean: 0,
    maxLean: Math.PI / 4,
    isGrounded: false,
    wheelieBalance: 0,
    engineRPM: 0,
    engineHeat: 0,
    damage: 0
};

// Particle system for effects
class Particle {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = Math.random() * -3 - 1;
        this.life = 1.0;
        this.decay = 0.02;
        this.type = type;
        this.size = Math.random() * 3 + 1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.1; // gravity
        this.life -= this.decay;
        return this.life > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        
        switch(this.type) {
            case 'dirt':
                ctx.fillStyle = '#8B4513';
                break;
            case 'spark':
                ctx.fillStyle = '#FFD700';
                break;
            case 'smoke':
                ctx.fillStyle = '#666';
                break;
            case 'rain':
                ctx.fillStyle = '#4A90E2';
                break;
        }
        
        ctx.beginPath();
        ctx.arc(this.x - cameraPosX, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// Weather system
function updateWeather() {
    weatherTimer++;
    if (weatherTimer > 1800) { // Change weather every 30 seconds
        const weathers = ['clear', 'rain', 'fog', 'snow'];
        currentWeather = weathers[Math.floor(Math.random() * weathers.length)];
        weatherTimer = 0;
    }

    document.getElementById('weatherCondition').textContent = 
        currentWeather.charAt(0).toUpperCase() + currentWeather.slice(1);
    document.getElementById('visibility').textContent = 
        Math.floor(PHYSICS.WEATHER_EFFECTS[currentWeather].visibility * 100) + '%';

    // Add weather particles
    if (currentWeather === 'rain' || currentWeather === 'snow') {
        for (let i = 0; i < 3; i++) {
            particles.push(new Particle(
                cameraPosX + Math.random() * canvas.width,
                -10,
                currentWeather === 'rain' ? 'rain' : 'snow'
            ));
        }
    }
}

// Achievement system
const achievements = [
    { id: 'speed_demon', name: 'Speed Demon', condition: () => Math.abs(bike.speed * 10) > 200, triggered: false },
    { id: 'distance_runner', name: 'Distance Runner', condition: () => distance > 5000, triggered: false },
    { id: 'airtime_king', name: 'Airtime King', condition: () => !bike.isGrounded && bike.y < canvas.height - 250, triggered: false },
    { id: 'checkpoint_master', name: 'Checkpoint Master', condition: () => checkpointsPassed >= 10, triggered: false }
];

function checkAchievements() {
    achievements.forEach(achievement => {
        if (!achievement.triggered && achievement.condition()) {
            achievement.triggered = true;
            showAchievement(achievement.name);
            money += 50;
        }
    });
}

function showAchievement(name) {
    const achievementDiv = document.createElement('div');
    achievementDiv.className = 'achievement';
    achievementDiv.textContent = `Achievement: ${name}`;
    document.body.appendChild(achievementDiv);
    
    setTimeout(() => achievementDiv.classList.add('show'), 100);
    setTimeout(() => {
        achievementDiv.classList.remove('show');
        setTimeout(() => document.body.removeChild(achievementDiv), 500);
    }, 3000);
}

// Enhanced terrain generation
function noise(x) {
    return Math.sin(x / 50) * 30 +
        Math.sin(x / 25) * 15 +
        Math.sin(x / 12.5) * 7.5;
}

class TerrainSegment {
    constructor(x, y, width, type = 'ground') {
        this.x = x;
        this.y = y;
        this.width = width;
        this.type = type;
        this.friction = type === 'mud' ? 0.7 : 1.0;
        this.detail = [];

        const detailPoints = 5;
        for (let i = 0; i < detailPoints; i++) {
            this.detail.push({
                x: x + (width * (i / detailPoints)),
                y: y + noise(x + (width * (i / detailPoints))) * 0.3
            });
        }
    }
}

// Checkpoint system
class Checkpoint {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 100;
        this.collected = false;
        this.animation = 0;
    }

    update() {
        this.animation += 0.1;
    }

    draw(ctx) {
        if (this.collected) return;
        
        ctx.save();
        ctx.translate(this.x - cameraPosX, this.y);
        
        // Animated checkpoint
        const pulse = Math.sin(this.animation) * 0.2 + 1;
        ctx.scale(pulse, pulse);
        
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(-this.width/2, 0, this.width, this.height);
        
        ctx.fillStyle = '#FFA500';
        ctx.fillRect(-this.width/2 + 5, 5, this.width - 10, this.height - 10);
        
        ctx.restore();
    }

    checkCollision(bikeX, bikeY) {
        if (!this.collected && 
            bikeX > this.x - this.width/2 && 
            bikeX < this.x + this.width/2 &&
            bikeY > this.y && bikeY < this.y + this.height + 50) {
            this.collected = true;
            checkpointsPassed++;
            money += 25;
            fuel = Math.min(100, fuel + 20);
            return true;
        }
        return false;
    }
}

// Enhanced obstacle system
class Obstacle {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;

        switch (type) {
            case 'rock':
                this.width = 30 + Math.random() * 40;
                this.height = 20 + Math.random() * 30;
                this.points = this.generateRockPoints();
                this.damage = 15;
                break;
            case 'log':
                this.width = 100 + Math.random() * 50;
                this.height = 20;
                this.rotation = Math.random() * 0.2 - 0.1;
                this.damage = 10;
                break;
            case 'mudpit':
                this.width = 150 + Math.random() * 100;
                this.height = 10;
                this.depth = 20;
                this.damage = 5;
                break;
            case 'ramp':
                this.width = 80;
                this.height = 40;
                this.damage = 0;
                break;
        }
    }

    generateRockPoints() {
        const points = [];
        const segments = 8;
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const radius = this.width / 2 * (0.8 + Math.random() * 0.4);
            points.push({
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius
            });
        }
        return points;
    }

    checkCollision(bikeX, bikeY, bikeWidth, bikeHeight) {
        return bikeX < this.x + this.width/2 &&
               bikeX + bikeWidth > this.x - this.width/2 &&
               bikeY < this.y + this.height &&
               bikeY + bikeHeight > this.y - this.height;
    }

    draw(ctx, cameraPosX) {
        ctx.save();
        ctx.translate(this.x - cameraPosX, this.y);

        switch (this.type) {
            case 'rock':
                ctx.beginPath();
                ctx.moveTo(this.points[0].x, this.points[0].y);
                for (let point of this.points) {
                    ctx.lineTo(point.x, point.y);
                }
                ctx.closePath();
                ctx.fillStyle = '#696969';
                ctx.fill();
                ctx.strokeStyle = '#404040';
                ctx.lineWidth = 2;
                ctx.stroke();
                break;

            case 'log':
                ctx.rotate(this.rotation);
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
                ctx.strokeStyle = '#73370D';
                for (let i = 0; i < 5; i++) {
                    ctx.beginPath();
                    ctx.moveTo(-this.width / 2, -this.height / 2 + i * this.height / 4);
                    ctx.lineTo(this.width / 2, -this.height / 2 + i * this.height / 4);
                    ctx.stroke();
                }
                break;

            case 'mudpit':
                ctx.fillStyle = '#483C32';
                ctx.fillRect(0, 0, this.width, this.height);
                ctx.fillStyle = '#362F28';
                for (let i = 0; i < 10; i++) {
                    ctx.beginPath();
                    ctx.arc(Math.random() * this.width, Math.random() * this.height, 5, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;

            case 'ramp':
                ctx.fillStyle = '#8B4513';
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(this.width, 0);
                ctx.lineTo(this.width, -this.height);
                ctx.closePath();
                ctx.fill();
                break;
        }
        ctx.restore();
    }
}

const terrain = {
    segments: [],
    obstacles: [],
    checkpoints: [],
    segmentWidth: 30,
    
    generateTerrain(startX, count) {
        let currentX = startX;
        let currentY = canvas.height - 100;

        for (let i = 0; i < count; i++) {
            currentY = canvas.height - 150 + noise(currentX);
            currentY = Math.min(Math.max(currentY, canvas.height - 400), canvas.height - 50);

            // Add checkpoints every 1000 units
            if (currentX % 1000 < this.segmentWidth && currentX > 500) {
                this.checkpoints.push(new Checkpoint(currentX, currentY - 150));
            }

            if (Math.random() < 0.05) {
                let jumpHeight = 80 + Math.random() * 120;
                let jumpLength = 150 + Math.random() * 100;
                this.segments.push(new TerrainSegment(currentX, currentY - jumpHeight, jumpLength, 'jump'));
                currentX += jumpLength;

                if (Math.random() < 0.7) {
                    this.addObstacle(currentX + 50, currentY);
                }
            } else {
                this.segments.push(new TerrainSegment(currentX, currentY, this.segmentWidth));
                currentX += this.segmentWidth;

                if (Math.random() < 0.04) {
                    this.addObstacle(currentX, currentY);
                }
            }
        }
    },

    addObstacle(x, y) {
        const types = ['rock', 'log', 'mudpit', 'ramp'];
        const type = types[Math.floor(Math.random() * types.length)];
        this.obstacles.push(new Obstacle(x, y - 40, type));
    }
};

function drawBike() {
    ctx.save();
    ctx.translate(bike.x - cameraPosX, bike.y);
    ctx.rotate(bike.rotation);

    // Engine heat glow effect
    if (bike.engineHeat > 0.5) {
        ctx.shadowColor = '#FF6600';
        ctx.shadowBlur = bike.engineHeat * 20;
    }

    // Draw suspension springs
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bike.wheelBase / 2, -bike.height / 2);
    ctx.lineTo(bike.wheelBase / 2, bike.frontSuspension.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-bike.wheelBase / 2, -bike.height / 2);
    ctx.lineTo(-bike.wheelBase / 2, bike.rearSuspension.height);
    ctx.stroke();

    // Draw bike frame with damage effects
    ctx.beginPath();
    ctx.moveTo(-bike.width / 2, -bike.height / 2);
    ctx.lineTo(bike.width / 2, -bike.height / 2);
    ctx.lineTo(bike.width / 3, -bike.height);
    ctx.lineTo(-bike.width / 3, -bike.height);
    ctx.closePath();
    ctx.moveTo(0, -bike.height);
    ctx.lineTo(0, -bike.height - 10);
    ctx.moveTo(-bike.width / 4, -bike.height / 2);
    ctx.lineTo(-bike.width / 4, -bike.height * 0.8);

    // Color based on damage
    const damageLevel = bike.damage / 100;
    const red = Math.floor(255 * (1 - damageLevel * 0.5));
    ctx.fillStyle = `rgb(${red}, 0, 0)`;
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Enhanced wheel drawing
    const drawWheel = (x, y) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(bike.wheelRotation);

        // Tire with enhanced details
        ctx.beginPath();
        ctx.arc(0, 0, bike.wheelRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a1a';
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Enhanced tread pattern
        for (let i = 0; i < 16; i++) {
            ctx.save();
            ctx.rotate(i * Math.PI / 8);
            ctx.beginPath();
            ctx.moveTo(bike.wheelRadius - 6, -1);
            ctx.lineTo(bike.wheelRadius - 6, 1);
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#444';
            ctx.stroke();
            ctx.restore();
        }

        // Hub and spokes
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#666';
        ctx.fill();

        for (let i = 0; i < 6; i++) {
            ctx.save();
            ctx.rotate(i * Math.PI / 3);
            ctx.beginPath();
            ctx.moveTo(8, 0);
            ctx.lineTo(bike.wheelRadius - 6, 0);
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#888';
            ctx.stroke();
            ctx.restore();
        }

        ctx.restore();
    };

    drawWheel(-bike.wheelBase / 2, bike.rearSuspension.height);
    drawWheel(bike.wheelBase / 2, bike.frontSuspension.height);

    ctx.restore();

    // Add dirt particles when moving fast
    if (Math.abs(bike.speed) > 5 && bike.isGrounded) {
        particles.push(new Particle(
            bike.x - bike.wheelBase / 2,
            bike.y + bike.rearSuspension.height + bike.wheelRadius,
            'dirt'
        ));
    }
}

function drawTerrain() {
    // Dynamic sky based on weather
    let skyColor1, skyColor2;
    switch(currentWeather) {
        case 'rain':
            skyColor1 = '#4A4A4A';
            skyColor2 = '#666666';
            break;
        case 'fog':
            skyColor1 = '#B0B0B0';
            skyColor2 = '#D0D0D0';
            break;
        case 'snow':
            skyColor1 = '#E0E0E0';
            skyColor2 = '#F0F0F0';
            break;
        default:
            skyColor1 = '#87CEEB';
            skyColor2 = '#E0F6FF';
    }

    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGradient.addColorStop(0, skyColor1);
    skyGradient.addColorStop(1, skyColor2);
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Weather visibility effect
    if (currentWeather === 'fog') {
        ctx.fillStyle = 'rgba(200, 200, 200, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw distant mountains
    ctx.fillStyle = '#9CB4B4';
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(0, canvas.height - 200 + i * 50);
        for (let x = 0; x < canvas.width; x += 50) {
            ctx.lineTo(x, canvas.height - 200 + i * 50 +
                noise(x + cameraPosX * (0.5 - i * 0.2)) * (1 + i * 0.5));
        }
        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.fill();
    }

    // Draw main terrain
    ctx.beginPath();
    terrain.segments.forEach((segment, index) => {
        if (index === 0) {
            ctx.moveTo(segment.x - cameraPosX, segment.y);
        }
        segment.detail.forEach(point => {
            ctx.lineTo(point.x - cameraPosX, point.y);
        });
    });

    ctx.lineTo(terrain.segments[terrain.segments.length - 1].x - cameraPosX, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.closePath();

    const groundGradient = ctx.createLinearGradient(0, canvas.height - 300, 0, canvas.height);
    groundGradient.addColorStop(0, '#4a7023');
    groundGradient.addColorStop(0.2, '#5c8a2f');
    groundGradient.addColorStop(0.4, '#6fa23a');
    groundGradient.addColorStop(0.8, '#5d4037');
    groundGradient.addColorStop(1, '#3e2723');

    ctx.fillStyle = groundGradient;
    ctx.fill();

    // Draw obstacles and checkpoints
    terrain.obstacles.forEach(obstacle => obstacle.draw(ctx, cameraPosX));
    terrain.checkpoints.forEach(checkpoint => {
        checkpoint.update();
        checkpoint.draw(ctx);
    });
}

function drawMiniMap() {
    miniMapCtx.clearRect(0, 0, 200, 100);
    miniMapCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    miniMapCtx.fillRect(0, 0, 200, 100);

    // Draw terrain on minimap
    const scale = 0.05;
    const offsetX = -bike.x * scale + 100;
    
    miniMapCtx.strokeStyle = '#4a7023';
    miniMapCtx.lineWidth = 2;
    miniMapCtx.beginPath();
    
    for (let i = 0; i < terrain.segments.length; i++) {
        const segment = terrain.segments[i];
        const x = segment.x * scale + offsetX;
        const y = 80 - (segment.y - canvas.height + 150) * scale;
        
        if (i === 0) miniMapCtx.moveTo(x, y);
        else miniMapCtx.lineTo(x, y);
    }
    miniMapCtx.stroke();

    // Draw bike position
    miniMapCtx.fillStyle = '#FF0000';
    miniMapCtx.fillRect(98, 48, 4, 4);

    // Draw checkpoints
    terrain.checkpoints.forEach(checkpoint => {
        if (!checkpoint.collected) {
            const x = checkpoint.x * scale + offsetX;
            miniMapCtx.fillStyle = '#FFD700';
            miniMapCtx.fillRect(x - 1, 40, 2, 8);
        }
    });
}

function updateBikePhysics() {
    if (gameOver || gamePaused) return;

    // Fuel consumption
    if (keys.ArrowRight) {
        const baseFuelConsumption = PHYSICS.FUEL_CONSUMPTION * (1 - upgrades.fuel.level * 0.2);
        fuel -= baseFuelConsumption * currentGear;
        bike.engineHeat = Math.min(1.0, bike.engineHeat + 0.02);
    } else {
        bike.engineHeat = Math.max(0, bike.engineHeat - 0.01);
    }

    // Check fuel
    if (fuel <= 0) {
        fuel = 0;
        bike.speed *= 0.95; // Lose power gradually
    }

    // Weather effects on physics
    const weatherEffect = PHYSICS.WEATHER_EFFECTS[currentWeather];
    const effectiveFriction = PHYSICS.GROUND_FRICTION * weatherEffect.friction * (1 + upgrades.tires.level * 0.1);

    // Enhanced engine and gear management
    if (keys.ArrowRight && fuel > 0) {
        const basePower = PHYSICS.ENGINE_POWER[currentGear];
        const engineMultiplier = 1 + upgrades.engine.level * 0.3;
        const currentPower = basePower * engineMultiplier;
        bike.speed += currentPower;
        bike.engineRPM = Math.min(1.0, bike.engineRPM + 0.1);

        // Add engine sparks when overheating
        if (bike.engineHeat > 0.7) {
            particles.push(new Particle(bike.x, bike.y - 20, 'spark'));
        }
    } else if (keys.ArrowLeft) {
        bike.speed -= PHYSICS.ENGINE_POWER[currentGear] * 0.7;
    } else {
        bike.speed *= effectiveFriction;
        bike.engineRPM = Math.max(0, bike.engineRPM - 0.1);
    }

    // Automatic gear shifting with upgrades
    const currentSpeed = Math.abs(bike.speed);
    const gearEfficiency = 1 + upgrades.engine.level * 0.1;
    
    if (currentSpeed > PHYSICS.GEAR_THRESHOLDS[currentGear] * gearEfficiency && currentGear < 5) {
        currentGear++;
    } else if (currentGear > 1 && currentSpeed < PHYSICS.GEAR_THRESHOLDS[currentGear - 1] * gearEfficiency) {
        currentGear--;
    }

    // Enhanced speed limits and air resistance
    const maxSpeedMultiplier = 1 + upgrades.engine.level * 0.2;
    bike.speed = Math.max(-bike.maxSpeed / 2, Math.min(bike.maxSpeed * maxSpeedMultiplier, bike.speed));
    bike.speed *= PHYSICS.AIR_RESISTANCE;

    // Position update
    bike.x += bike.speed;
    bike.wheelRotation += bike.speed * 0.2;
    distance = Math.floor(bike.x / 10);

    // Enhanced terrain interaction
    const segmentIndex = Math.floor(bike.x / terrain.segmentWidth);
    if (segmentIndex >= 0 && segmentIndex < terrain.segments.length) {
        const segment = terrain.segments[segmentIndex];
        const nextSegment = terrain.segments[Math.min(segmentIndex + 1, terrain.segments.length - 1)];

        const dx = nextSegment.x - segment.x;
        const dy = nextSegment.y - segment.y;
        const slopeAngle = Math.atan2(dy, dx);
        const targetY = segment.y - (bike.height + bike.wheelRadius);

        // Enhanced suspension physics
        const suspensionMultiplier = 1 + upgrades.suspension.level * 0.3;
        const updateSuspension = (suspension, compression) => {
            const springForce = -PHYSICS.SUSPENSION_STIFFNESS * suspensionMultiplier * compression;
            const dampingForce = -PHYSICS.SUSPENSION_DAMPING * suspensionMultiplier * suspension.velocity;
            const totalForce = springForce + dampingForce;

            suspension.velocity += totalForce;
            suspension.height += suspension.velocity;
            suspension.height = Math.max(-25, Math.min(25, suspension.height));
        };

        updateSuspension(bike.frontSuspension, bike.y - targetY);
        updateSuspension(bike.rearSuspension, bike.y - targetY);

        // Gravity and collision
        bike.velocityY += PHYSICS.GRAVITY;
        bike.y += bike.velocityY;

        if (bike.y > targetY) {
            bike.y = targetY;
            bike.velocityY = 0;
            bike.isGrounded = true;

            // Slope physics
            bike.speed += Math.sin(slopeAngle) * PHYSICS.GRAVITY * 0.5;

            // Enhanced jump control
            if ((keys.ArrowUp || keys.Space) && bike.isGrounded) {
                const jumpPower = 15 + upgrades.suspension.level * 3;
                bike.velocityY = -jumpPower;
                bike.isGrounded = false;
            }
        } else {
            bike.isGrounded = false;
        }

        // Enhanced bike lean physics
        const leanSpeed = 0.1 + upgrades.suspension.level * 0.02;
        if (keys.ArrowRight) {
            bike.lean = Math.min(bike.lean + leanSpeed, bike.maxLean);
        } else if (keys.ArrowLeft) {
            bike.lean = Math.max(bike.lean - leanSpeed, -bike.maxLean);
        } else {
            bike.lean *= 0.95;
        }

        bike.rotation = slopeAngle + bike.lean;
    }

    // Collision detection with obstacles
    terrain.obstacles.forEach(obstacle => {
        if (obstacle.checkCollision(bike.x, bike.y, bike.width, bike.height)) {
            health -= obstacle.damage;
            bike.speed *= 0.5; // Slow down on collision
            
            // Add impact particles
            for (let i = 0; i < 5; i++) {
                particles.push(new Particle(bike.x, bike.y, 'spark'));
            }
        }
    });

    // Checkpoint collection
    terrain.checkpoints.forEach(checkpoint => {
        if (checkpoint.checkCollision(bike.x, bike.y)) {
            score += 100;
        }
    });

    // Camera follow with smoothing
    const targetCameraX = bike.x - canvas.width / 3;
    cameraPosX += (targetCameraX - cameraPosX) * 0.1;

    // Generate more terrain if needed
    if (bike.x > terrain.segments.length * terrain.segmentWidth - 1000) {
        terrain.generateTerrain(terrain.segments.length * terrain.segmentWidth, 100);
    }

    // Update particles
    particles = particles.filter(particle => particle.update());

    // Check game over conditions
    if (health <= 0) {
        gameOver = true;
        showGameMenu();
    }

    // Update score based on distance and speed
    score += Math.floor(Math.abs(bike.speed)) + 1;
    money += Math.floor(Math.abs(bike.speed) / 10);

    // Update UI
    updateUI();
    checkAchievements();
}

function updateUI() {
    const gameTime = Math.floor((Date.now() - gameStartTime) / 1000);
    const minutes = Math.floor(gameTime / 60);
    const seconds = gameTime % 60;
    
    document.getElementById('speedometer').textContent = Math.abs(Math.floor(bike.speed * 10));
    document.getElementById('distance').textContent = distance;
    document.getElementById('score').textContent = score;
    document.getElementById('gear').textContent = currentGear;
    document.getElementById('gameTime').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('money').textContent = money;

    // Update fuel and health bars
    document.getElementById('fuelFill').style.width = fuel + '%';
    document.getElementById('healthFill').style.width = health + '%';
}

function gameLoop() {
    if (!gamePaused) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        updateWeather();
        drawTerrain();
        drawBike();
        updateBikePhysics();
        drawMiniMap();
        
        // Draw particles
        particles.forEach(particle => particle.draw(ctx));
    }
    requestAnimationFrame(gameLoop);
}

// Menu functions
function showGameMenu() {
    gamePaused = true;
    document.getElementById('gameMenu').style.display = 'block';
}

function resumeGame() {
    if (!gameOver) {
        gamePaused = false;
        document.getElementById('gameMenu').style.display = 'none';
    }
}

function restartGame() {
    // Reset all game variables
    bike.x = 100;
    bike.y = canvas.height - 150;
    bike.speed = 0;
    bike.velocityY = 0;
    bike.rotation = 0;
    bike.lean = 0;
    bike.damage = 0;
    bike.engineHeat = 0;
    
    distance = 0;
    score = 0;
    fuel = 100;
    health = 100;
    cameraPosX = 0;
    currentGear = 1;
    gameOver = false;
    gamePaused = false;
    gameStartTime = Date.now();
    checkpointsPassed = 0;
    particles = [];
    
    // Reset achievements
    achievements.forEach(achievement => achievement.triggered = false);
    
    // Clear and regenerate terrain
    terrain.segments = [];
    terrain.obstacles = [];
    terrain.checkpoints = [];
    terrain.generateTerrain(0, 200);
    
    document.getElementById('gameMenu').style.display = 'none';
}

function buyUpgrade(type) {
    const upgrade = upgrades[type];
    const cost = upgrade.cost * (upgrade.level + 1);
    
    if (money >= cost && upgrade.level < 5) {
        money -= cost;
        upgrade.level++;
        
        // Show purchase feedback
        showAchievement(`${type.charAt(0).toUpperCase() + type.slice(1)} Upgraded!`);
    }
}

// Generate initial terrain
terrain.generateTerrain(0, 200);

// Enhanced control setup
const keys = {
    ArrowUp: false,
    ArrowRight: false,
    ArrowLeft: false,
    Space: false,
    Escape: false
};

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        keys.Space = true;
    }
    if (e.key === 'Escape') {
        e.preventDefault();
        if (gamePaused) {
            resumeGame();
        } else {
            showGameMenu();
        }
    }
    if (keys.hasOwnProperty(e.key)) {
        e.preventDefault();
        keys[e.key] = true;
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        keys.Space = false;
    }
    if (keys.hasOwnProperty(e.key)) {
        e.preventDefault();
        keys[e.key] = false;
    }
});

// Handle window resize
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// Touch controls for mobile
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    const deltaX = touchX - touchStartX;
    const deltaY = touchY - touchStartY;

    // Swipe controls
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        keys.ArrowRight = deltaX > 50;
        keys.ArrowLeft = deltaX < -50;
    } else {
        keys.ArrowUp = deltaY < -50;
    }
});

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    keys.ArrowRight = false;
    keys.ArrowLeft = false;
    keys.ArrowUp = false;
});

// Start the game
gameLoop();