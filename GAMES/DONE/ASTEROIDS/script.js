// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Starfield canvas
const starCanvas = document.getElementById('starfieldCanvas');
starCanvas.width = canvas.width;
starCanvas.height = canvas.height;
const starCtx = starCanvas.getContext('2d');

// Game state
let gameOver = false;
let score = 0;
let level = 1;
let lives = 3;
let highScore = localStorage.getItem('asteroidsHighScore') || 0;
let invincibilityTime = 0;
let gameActive = false;

// Ship properties with improved physics
const ship = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    size: 15,
    angle: -Math.PI / 2,  // Start pointing up
    rotation: 0,
    thrusting: false,
    thrustPower: 0.08,
    velocity: { x: 0, y: 0 },
    drag: 0.99,  // Realistic space friction (very low)
    maxSpeed: 8,
    blinkTime: 0,
    blinkDuration: 100,
    visible: true
};

// Game object arrays
const asteroids = [];
const bullets = [];
const particles = [];
const stars = [];

// Constants
const ASTEROID_POINTS = [10, 20, 50]; // Small, medium, large
const ASTEROID_SPEED_MULTIPLIER = 1.1; // Speed increases with level
const ASTEROID_VERTEX_COUNT = 10;
const ASTEROID_IRREGULARITY = 0.4;
const MAX_BULLETS = 5;
const BULLET_SPEED = 7;
const BULLET_LIFE = 50;  // Frames
const PARTICLE_LIFE = 50;  // Frames
const STAR_COUNT = 100;
const INVINCIBILITY_DURATION = 180;  // 3 seconds at 60fps
const HYPERSPACE_COOLDOWN = 180;  // 3 seconds at 60fps

// Game timers
let bulletTimer = 0;
let hyperspaceTimer = 0;

// Control states
const keys = {
    left: false,
    right: false,
    up: false,
    space: false,
    z: false
};

// Initialize starfield
function initStars() {
    for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 1.5 + 0.5,
            speed: Math.random() * 0.5 + 0.1
        });
    }
}

// Draw starfield
function drawStars() {
    starCtx.clearRect(0, 0, starCanvas.width, starCanvas.height);

    stars.forEach(star => {
        starCtx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.3 + 0.7})`;
        starCtx.beginPath();
        starCtx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        starCtx.fill();

        // Move stars slightly for parallax effect
        star.y += star.speed * (ship.thrusting ? 2 : 1);

        // Wrap stars around screen
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
    });
}

// Generate a random asteroid
function createAsteroidShape(size) {
    const vertices = [];
    const angleStep = (Math.PI * 2) / ASTEROID_VERTEX_COUNT;

    for (let i = 0; i < ASTEROID_VERTEX_COUNT; i++) {
        const angle = i * angleStep;
        const radialDist = size * (1 - ASTEROID_IRREGULARITY + Math.random() * ASTEROID_IRREGULARITY * 2);
        vertices.push({
            x: radialDist * Math.cos(angle),
            y: radialDist * Math.sin(angle)
        });
    }

    return vertices;
}

// Create an asteroid at the start of a level
function createAsteroid(x, y, size) {
    const speedMultiplier = 0.5 + (level * 0.1);

    // Ensure asteroids don't spawn too close to the ship
    let asteroidX = x;
    let asteroidY = y;

    if (x === undefined && y === undefined) {
        do {
            asteroidX = Math.random() * canvas.width;
            asteroidY = Math.random() * canvas.height;
        } while (Math.hypot(asteroidX - ship.x, asteroidY - ship.y) < 200);
    }

    const asteroid = {
        x: asteroidX,
        y: asteroidY,
        size: size || 3,  // 3 = large, 2 = medium, 1 = small
        radius: size === 1 ? 15 : size === 2 ? 30 : 50,
        velocity: {
            x: (Math.random() * 2 - 1) * speedMultiplier,
            y: (Math.random() * 2 - 1) * speedMultiplier
        },
        angle: Math.random() * Math.PI * 2,
        rotation: (Math.random() * 0.02 - 0.01) * speedMultiplier,
        vertices: createAsteroidShape(size === 1 ? 15 : size === 2 ? 30 : 50)
    };

    asteroids.push(asteroid);
}

// Initialize level with asteroids
function initLevel() {
    // Clear existing asteroids and bullets
    asteroids.length = 0;
    bullets.length = 0;

    // Reset ship position
    ship.x = canvas.width / 2;
    ship.y = canvas.height / 2;
    ship.velocity.x = 0;
    ship.velocity.y = 0;
    ship.angle = -Math.PI / 2;
    invincibilityTime = INVINCIBILITY_DURATION;

    // Create asteroids based on level
    const numAsteroids = 3 + Math.min(level - 1, 7);
    for (let i = 0; i < numAsteroids; i++) {
        createAsteroid();
    }
}

// Draw the ship
function drawShip() {
    if (!ship.visible && invincibilityTime > 0 && Math.floor(invincibilityTime / 5) % 2 === 0) {
        return;  // Ship blinks when invincible
    }

    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);

    // Draw ship
    ctx.strokeStyle = '#0f0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ship.size, 0);
    ctx.lineTo(-ship.size, ship.size / 2);
    ctx.lineTo(-ship.size / 2, 0);
    ctx.lineTo(-ship.size, -ship.size / 2);
    ctx.lineTo(ship.size, 0);
    ctx.stroke();

    // Draw thruster flame
    if (ship.thrusting) {
        ctx.beginPath();
        ctx.moveTo(-ship.size, 0);
        ctx.lineTo(-ship.size - (Math.random() * 10 + 5), 0);
        ctx.lineTo(-ship.size, ship.size / 4);
        ctx.lineTo(-ship.size, -ship.size / 4);
        ctx.closePath();
        ctx.fillStyle = Math.random() > 0.5 ? '#f73' : '#ff5';
        ctx.fill();
    }

    ctx.restore();
}

// Update ship physics
function updateShip() {
    // Handle rotation
    if (keys.left) {
        ship.angle -= 0.08;
    }
    if (keys.right) {
        ship.angle += 0.08;
    }

    // Handle thrust
    ship.thrusting = keys.up;
    if (ship.thrusting) {
        // Apply thrust in direction of ship's angle
        ship.velocity.x += ship.thrustPower * Math.cos(ship.angle);
        ship.velocity.y += ship.thrustPower * Math.sin(ship.angle);

        // Create thruster particles
        if (Math.random() > 0.7) {
            createParticle(
                ship.x - ship.size * Math.cos(ship.angle),
                ship.y - ship.size * Math.sin(ship.angle),
                -ship.velocity.x * 0.5 + Math.random() * 1 - 0.5,
                -ship.velocity.y * 0.5 + Math.random() * 1 - 0.5,
                Math.random() * 3 + 1,
                '#f73'
            );
        }
    }

    // Apply drag (minimal in space)
    ship.velocity.x *= ship.drag;
    ship.velocity.y *= ship.drag;

    // Speed limiting
    const speed = Math.hypot(ship.velocity.x, ship.velocity.y);
    if (speed > ship.maxSpeed) {
        const ratio = ship.maxSpeed / speed;
        ship.velocity.x *= ratio;
        ship.velocity.y *= ratio;
    }

    // Update position
    ship.x += ship.velocity.x;
    ship.y += ship.velocity.y;

    // Wrap around screen edges
    if (ship.x > canvas.width + ship.size) ship.x = -ship.size;
    else if (ship.x < -ship.size) ship.x = canvas.width + ship.size;
    if (ship.y > canvas.height + ship.size) ship.y = -ship.size;
    else if (ship.y < -ship.size) ship.y = canvas.height + ship.size;

    // Handle hyperspace (teleport)
    if (keys.z && hyperspaceTimer <= 0) {
        // Create hyperspace effect particles
        for (let i = 0; i < 20; i++) {
            createParticle(
                ship.x,
                ship.y,
                Math.random() * 6 - 3,
                Math.random() * 6 - 3,
                Math.random() * 3 + 2,
                '#0ff'
            );
        }

        // Teleport to random location
        ship.x = Math.random() * canvas.width;
        ship.y = Math.random() * canvas.height;
        ship.velocity.x = 0;
        ship.velocity.y = 0;

        // Create arrival effect
        for (let i = 0; i < 20; i++) {
            createParticle(
                ship.x,
                ship.y,
                Math.random() * 6 - 3,
                Math.random() * 6 - 3,
                Math.random() * 3 + 2,
                '#0ff'
            );
        }

        hyperspaceTimer = HYPERSPACE_COOLDOWN;
        // 5% chance of ship destruction when using hyperspace
        if (Math.random() < 0.05) {
            destroyShip();
        }
    }

    // Update hyperspace cooldown
    if (hyperspaceTimer > 0) {
        hyperspaceTimer--;
    }

    // Update invincibility timer
    if (invincibilityTime > 0) {
        invincibilityTime--;
        ship.visible = Math.floor(invincibilityTime / 5) % 2 === 0;
    } else {
        ship.visible = true;
    }
}

// Create a bullet
function fireBullet() {
    if (bulletTimer > 0 || bullets.length >= MAX_BULLETS) return;

    const bullet = {
        x: ship.x + Math.cos(ship.angle) * ship.size,
        y: ship.y + Math.sin(ship.angle) * ship.size,
        velocity: {
            x: BULLET_SPEED * Math.cos(ship.angle) + ship.velocity.x * 0.5,
            y: BULLET_SPEED * Math.sin(ship.angle) + ship.velocity.y * 0.5
        },
        size: 2,
        life: BULLET_LIFE
    };

    bullets.push(bullet);
    bulletTimer = 10; // Rate limiting
}

// Update and draw bullets
function updateBullets() {
    if (bulletTimer > 0) bulletTimer--;

    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];

        // Move bullet
        bullet.x += bullet.velocity.x;
        bullet.y += bullet.velocity.y;

        // Wrap around screen
        if (bullet.x > canvas.width) bullet.x = 0;
        else if (bullet.x < 0) bullet.x = canvas.width;
        if (bullet.y > canvas.height) bullet.y = 0;
        else if (bullet.y < 0) bullet.y = canvas.height;

        // Decrease life and remove if expired
        bullet.life--;
        if (bullet.life <= 0) {
            bullets.splice(i, 1);
        }
    }
}

// Draw bullets
function drawBullets() {
    ctx.fillStyle = '#f00';

    bullets.forEach(bullet => {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Create a particle effect
function createParticle(x, y, dx, dy, size, color) {
    particles.push({
        x: x,
        y: y,
        velocity: { x: dx, y: dy },
        size: size,
        color: color,
        life: PARTICLE_LIFE
    });
}

// Update and draw particles
function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];

        // Move particle
        particle.x += particle.velocity.x;
        particle.y += particle.velocity.y;

        // Decrease size and life
        particle.size *= 0.96;
        particle.life--;

        // Remove if expired
        if (particle.life <= 0 || particle.size < 0.5) {
            particles.splice(i, 1);
        }
    }
}

// Draw particles
function drawParticles() {
    particles.forEach(particle => {
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Update and draw asteroids
function updateAsteroids() {
    for (let i = asteroids.length - 1; i >= 0; i--) {
        const asteroid = asteroids[i];

        // Move asteroid
        asteroid.x += asteroid.velocity.x;
        asteroid.y += asteroid.velocity.y;
        asteroid.angle += asteroid.rotation;

        // Wrap around screen
        if (asteroid.x > canvas.width + asteroid.radius) asteroid.x = -asteroid.radius;
        else if (asteroid.x < -asteroid.radius) asteroid.x = canvas.width + asteroid.radius;
        if (asteroid.y > canvas.height + asteroid.radius) asteroid.y = -asteroid.radius;
        else if (asteroid.y < -asteroid.radius) asteroid.y = canvas.height + asteroid.radius;
    }
}

// Draw asteroids
function drawAsteroids() {
    asteroids.forEach(asteroid => {
        ctx.save();
        ctx.translate(asteroid.x, asteroid.y);
        ctx.rotate(asteroid.angle);

        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 2;
        ctx.beginPath();

        // Draw asteroid shape using vertices
        ctx.moveTo(
            asteroid.vertices[0].x,
            asteroid.vertices[0].y
        );

        for (let j = 1; j < asteroid.vertices.length; j++) {
            ctx.lineTo(
                asteroid.vertices[j].x,
                asteroid.vertices[j].y
            );
        }

        ctx.closePath();
        ctx.stroke();

        // Add some detail to larger asteroids
        if (asteroid.size > 1) {
            ctx.beginPath();
            ctx.arc(
                asteroid.radius * 0.2,
                asteroid.radius * -0.3,
                asteroid.radius * 0.15,
                0, Math.PI * 2
            );
            ctx.stroke();

            if (asteroid.size > 2) {
                ctx.beginPath();
                ctx.arc(
                    asteroid.radius * -0.3,
                    asteroid.radius * 0.2,
                    asteroid.radius * 0.2,
                    0, Math.PI * 2
                );
                ctx.stroke();
            }
        }

        ctx.restore();
    });
}

// Check for collisions between game objects
function checkCollisions() {
    if (gameOver) return;

    // Ship and asteroid collision
    if (invincibilityTime <= 0) {
        for (let i = 0; i < asteroids.length; i++) {
            const asteroid = asteroids[i];
            const distance = Math.hypot(ship.x - asteroid.x, ship.y - asteroid.y);

            if (distance < ship.size + asteroid.radius * 0.8) {
                destroyShip();
                break;
            }
        }
    }

    // Bullet and asteroid collision
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];

        for (let j = asteroids.length - 1; j >= 0; j--) {
            const asteroid = asteroids[j];
            const distance = Math.hypot(bullet.x - asteroid.x, bullet.y - asteroid.y);

            if (distance < bullet.size + asteroid.radius) {
                // Split asteroid if not smallest size
                if (asteroid.size > 1) {
                    // Create two smaller asteroids
                    for (let k = 0; k < 2; k++) {
                        const smallerSize = asteroid.size - 1;
                        const angle = Math.random() * Math.PI * 2;
                        const speed = Math.sqrt(
                            asteroid.velocity.x * asteroid.velocity.x +
                            asteroid.velocity.y * asteroid.velocity.y
                        ) * 1.3;

                        const newAsteroid = {
                            x: asteroid.x,
                            y: asteroid.y,
                            size: smallerSize,
                            radius: smallerSize === 1 ? 15 : 30,
                            velocity: {
                                x: Math.cos(angle) * speed,
                                y: Math.sin(angle) * speed
                            },
                            angle: Math.random() * Math.PI * 2,
                            rotation: (Math.random() * 0.04 - 0.02) * level * 0.5,
                            vertices: createAsteroidShape(smallerSize === 1 ? 15 : 30)
                        };

                        asteroids.push(newAsteroid);
                    }
                }

                // Create explosion particles
                const particleCount = asteroid.size * 5;
                for (let k = 0; k < particleCount; k++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = Math.random() * 3 + 1;

                    createParticle(
                        asteroid.x,
                        asteroid.y,
                        Math.cos(angle) * speed,
                        Math.sin(angle) * speed,
                        Math.random() * asteroid.size * 2 + 1,
                        `hsl(${Math.random() * 40 + 15}, 100%, ${Math.random() * 30 + 50}%)`
                    );
                }

                // Award points based on asteroid size
                score += ASTEROID_POINTS[asteroid.size - 1];

                // Remove asteroid and bullet
                asteroids.splice(j, 1);
                bullets.splice(i, 1);

                // Check if level complete
                if (asteroids.length === 0) {
                    level++;
                    setTimeout(initLevel, 1000);
                }

                break;
            }
        }
    }
}

// Ship explosion and life loss
function destroyShip() {
    // Create explosion effect
    for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2;

        createParticle(
            ship.x,
            ship.y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            Math.random() * 4 + 2,
            Math.random() > 0.5 ? '#f73' : '#ff5'
        );
    }

    // Decrease lives
    lives--;

    if (lives <= 0) {
        // Game over
        endGame();
    } else {
        // Reset ship with invincibility
        ship.x = canvas.width / 2;
        ship.y = canvas.height / 2;
        ship.velocity.x = 0;
        ship.velocity.y = 0;
        ship.angle = -Math.PI / 2;
        invincibilityTime = INVINCIBILITY_DURATION;
    }
}

// End the game
function endGame() {
    gameOver = true;
    gameActive = false;

    // Update high score if needed
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('asteroidsHighScore', highScore);
    }

    // Show game over screen
    document.getElementById('gameOverScreen').style.display = 'block';
    document.getElementById('finalScore').textContent = `SCORE: ${score}`;
    document.getElementById('highScore').textContent = `HIGH SCORE: ${highScore}`;
}

// Update UI elements
function updateUI() {
    document.getElementById('score').textContent = `SCORE: ${score}`;
    document.getElementById('level').textContent = `LEVEL: ${level}`;

    // Update lives display
    const livesContainer = document.getElementById('livesIndicator');
    livesContainer.innerHTML = 'SHIPS: ';

    for (let i = 0; i < lives; i++) {
        const shipIcon = document.createElement('span');
        shipIcon.innerHTML = '▲';
        shipIcon.style.color = '#0f0';
        livesContainer.appendChild(shipIcon);
    }
}

// Main game loop
function gameLoop() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw starfield background
    drawStars();

    if (!gameOver && gameActive) {
        // Update game objects
        updateShip();
        updateAsteroids();
        updateBullets();
        updateParticles();
        checkCollisions();

        // Fire bullet if space pressed
        if (keys.space) {
            fireBullet();
        }
    }

    // Draw game objects
    drawAsteroids();
    drawBullets();
    drawParticles();
    if (gameActive) {
        drawShip();
    }

    // Update UI
    updateUI();

    // Continue game loop
    requestAnimationFrame(gameLoop);
}

// Event listeners for controls
document.addEventListener('keydown', (e) => {
    if (!gameActive && !gameOver && e.key === ' ') {
        startGame();
        return;
    }

    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd') keys.right = true;
    if (e.key === 'ArrowUp' || e.key === 'w') keys.up = true;
    if (e.key === ' ') keys.space = true;
    if (e.key === 'z') keys.z = true;

    // Prevent default space action (page scroll)
    if (e.key === ' ') {
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
    if (e.key === 'ArrowUp' || e.key === 'w') keys.up = false;
    if (e.key === ' ') keys.space = false;
    if (e.key === 'z') keys.z = false;
});

// Start button listener
document.getElementById('restartButton').addEventListener('click', () => {
    document.getElementById('gameOverScreen').style.display = 'none';
    startGame();
});

// Initialize game
function startGame() {
    // Reset game state
    score = 0;
    level = 1;
    lives = 3;
    gameOver = false;
    gameActive = true;

    initLevel();
}

// Initialize stars and start game loop
initStars();
gameLoop();

// Show start message
ctx.fillStyle = '#0f0';
ctx.font = '30px Courier New';
ctx.textAlign = 'center';
ctx.fillText('ASTEROIDS', canvas.width / 2, canvas.height / 2 - 50);
ctx.font = '16px Courier New';
ctx.fillText('Press SPACE to start', canvas.width / 2, canvas.height / 2);
ctx.fillText('← → : ROTATE | ↑ : THRUST | SPACE : FIRE | Z : HYPERSPACE', canvas.width / 2, canvas.height / 2 + 30);