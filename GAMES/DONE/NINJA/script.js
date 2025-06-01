const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const keys = {};
const keysPressed = {};

// Input handling
document.addEventListener("keydown", e => {
    const key = e.key.toLowerCase();
    if (!keys[key]) keysPressed[key] = true;
    keys[key] = true;
    
    if (gameState === 'message' && (key === ' ' || key === 'enter')) {
        hideMessage();
    }
});
document.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// Game state
let gameState = 'playing';
let gameTime = 0;
let lives = 3;
let attempts = 1;
let particles = [];
let cameraShake = 0;
let moonPhase = 0;
let windParticles = [];
let cherryBlossoms = [];

// Initialize environmental effects
for (let i = 0; i < 15; i++) {
    windParticles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: 0.5 + Math.random() * 1,
        vy: 0.2 + Math.random() * 0.3,
        size: 1 + Math.random() * 2,
        alpha: 0.3 + Math.random() * 0.4
    });
}

for (let i = 0; i < 8; i++) {
    cherryBlossoms.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: 0.3 + Math.random() * 0.6,
        vy: 0.5 + Math.random() * 0.8,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.1,
        size: 3 + Math.random() * 4,
        alpha: 0.6 + Math.random() * 0.4
    });
}

// Game constants
const gravity = 0.6;
const wallJumpCooldown = 8;

// Enhanced ninja player
const player = {
    x: 100, y: 600, w: 24, h: 32,
    vx: 0, vy: 0,
    speed: 4.5,
    jumpPower: -14,
    onGround: false,
    touchingWallLeft: false,
    touchingWallRight: false,
    canWallJump: true,
    wallJumpTimer: 0,
    trail: [],
    facing: 1, // 1 for right, -1 for left
    animFrame: 0,
    isWallSliding: false,
    dashCooldown: 0,
    kunaiTrail: []
};

// Japanese-themed level design
const walls = [
    // Temple boundaries (wooden walls)
    { x: 0, y: 0, w: 25, h: 700, type: 'temple_wall' },
    { x: 875, y: 0, w: 25, h: 700, type: 'temple_wall' },
    
    // Ground (tatami mat floor)
    { x: 25, y: 680, w: 850, h: 20, type: 'tatami' },
    
    // Traditional wooden platforms (increasing difficulty)
    // First level - Engawa (veranda)
    { x: 150, y: 580, w: 140, h: 18, type: 'wood_platform' },
    { x: 500, y: 550, w: 120, h: 18, type: 'wood_platform' },
    { x: 720, y: 520, w: 100, h: 18, type: 'wood_platform' },
    
    // Second level - Interior floors
    { x: 80, y: 460, w: 110, h: 18, type: 'wood_platform' },
    { x: 300, y: 430, w: 130, h: 18, type: 'wood_platform' },
    { x: 550, y: 400, w: 100, h: 18, type: 'wood_platform' },
    { x: 750, y: 380, w: 90, h: 18, type: 'wood_platform' },
    
    // Third level - Upper chambers
    { x: 50, y: 320, w: 100, h: 18, type: 'wood_platform' },
    { x: 250, y: 290, w: 120, h: 18, type: 'wood_platform' },
    { x: 480, y: 260, w: 110, h: 18, type: 'wood_platform' },
    { x: 680, y: 230, w: 100, h: 18, type: 'wood_platform' },
    
    // Fourth level - Dojo level
    { x: 120, y: 180, w: 100, h: 18, type: 'wood_platform' },
    { x: 350, y: 150, w: 140, h: 18, type: 'wood_platform' },
    { x: 600, y: 120, w: 110, h: 18, type: 'wood_platform' },
    
    // Pagoda top (golden goal)
    { x: 380, y: 50, w: 140, h: 25, type: 'pagoda_top' }
];

// Utility functions
function rectsCollide(r1, r2) {
    return r1.x < r2.x + r2.w && r1.x + r1.w > r2.x &&
           r1.y < r2.y + r2.h && r1.y + r1.h > r2.y;
}

// Enhanced particle system
function createParticles(x, y, count, type) {
    for (let i = 0; i < count; i++) {
        let particle = {
            x: x + Math.random() * 20 - 10,
            y: y + Math.random() * 20 - 10,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 1,
            decay: 0.02 + Math.random() * 0.02,
            size: 2 + Math.random() * 3,
            type: type
        };
        
        switch(type) {
            case 'ninja_dust':
                particle.color = '#4a4a4a';
                break;
            case 'wall_sparks':
                particle.color = '#ff6b35';
                break;
            case 'victory':
                particle.color = '#ffd700';
                particle.vx *= 1.5;
                particle.vy *= 1.5;
                break;
            case 'death':
                particle.color = '#ff4444';
                break;
        }
        particles.push(particle);
    }
}

function updateParticles() {
    particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2;
        p.life -= p.decay;
        p.size *= 0.98;
        return p.life > 0;
    });
}

function drawParticles() {
    particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        if (p.type === 'victory') {
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 5;
        }
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.restore();
    });
}

// Environmental effects
function updateEnvironment() {
    moonPhase += 0.01;
    
    // Update wind particles
    windParticles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x > canvas.width) p.x = -10;
        if (p.y > canvas.height) p.y = -10;
    });
    
    // Update cherry blossoms
    cherryBlossoms.forEach(b => {
        b.x += b.vx;
        b.y += b.vy;
        b.rotation += b.rotSpeed;
        if (b.x > canvas.width) b.x = -10;
        if (b.y > canvas.height) b.y = -10;
    });
}

function drawEnvironment() {
    // Draw night sky with moon
    const gradient = ctx.createRadialGradient(canvas.width * 0.8, 80, 0, canvas.width * 0.8, 80, 200);
    gradient.addColorStop(0, 'rgba(255, 255, 200, 0.3)');
    gradient.addColorStop(1, 'rgba(45, 27, 105, 0.1)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw moon
    ctx.save();
    ctx.fillStyle = '#f0f0b0';
    ctx.shadowColor = '#f0f0b0';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(canvas.width * 0.8, 80, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // Draw distant mountains
    ctx.fillStyle = 'rgba(50, 50, 80, 0.6)';
    ctx.beginPath();
    ctx.moveTo(0, canvas.height * 0.4);
    ctx.lineTo(200, canvas.height * 0.3);
    ctx.lineTo(400, canvas.height * 0.35);
    ctx.lineTo(600, canvas.height * 0.25);
    ctx.lineTo(800, canvas.height * 0.3);
    ctx.lineTo(canvas.width, canvas.height * 0.4);
    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.fill();
    
    // Draw wind particles
    ctx.save();
    windParticles.forEach(p => {
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = '#e6e6fa';
        ctx.fillRect(p.x, p.y, p.size, 1);
    });
    ctx.restore();
    
    // Draw cherry blossoms
    ctx.save();
    cherryBlossoms.forEach(b => {
        ctx.globalAlpha = b.alpha;
        ctx.translate(b.x, b.y);
        ctx.rotate(b.rotation);
        ctx.fillStyle = '#ffb6c1';
        // Draw petal shape
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.ellipse(0, -b.size/2, b.size/3, b.size, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.rotate(Math.PI * 2 / 5);
        }
        ctx.resetTransform();
    });
    ctx.restore();
}

// Enhanced ninja drawing
function drawNinja() {
    ctx.save();
    
    if (cameraShake > 0) {
        ctx.translate(
            (Math.random() - 0.5) * cameraShake,
            (Math.random() - 0.5) * cameraShake
        );
        cameraShake--;
    }
    
    // Draw ninja trail
    ctx.globalAlpha = 0.4;
    for (let i = 0; i < player.trail.length; i++) {
        const trail = player.trail[i];
        const alpha = (i / player.trail.length) * 0.4;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(trail.x - 3, trail.y - 3, 6, 6);
    }
    ctx.globalAlpha = 1;
    
    // Ninja body (dark blue/black outfit)
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(player.x + 2, player.y + 8, player.w - 4, player.h - 8);
    
    // Ninja head/mask
    ctx.fillStyle = '#2d2d4a';
    ctx.fillRect(player.x + 4, player.y, player.w - 8, 12);
    
    // Eye slit (glowing)
    ctx.fillStyle = '#ff4444';
    ctx.shadowColor = '#ff4444';
    ctx.shadowBlur = 3;
    const eyeY = player.y + 4;
    if (player.facing === 1) {
        ctx.fillRect(player.x + 14, eyeY, 6, 2);
    } else {
        ctx.fillRect(player.x + 4, eyeY, 6, 2);
    }
    ctx.shadowBlur = 0;
    
    // Ninja belt
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(player.x + 1, player.y + 18, player.w - 2, 3);
    
    // Arms (showing motion)
    ctx.fillStyle = '#1a1a2e';
    if (player.isWallSliding) {
        // Extended arm when wall sliding
        if (player.touchingWallLeft) {
            ctx.fillRect(player.x - 8, player.y + 10, 12, 4);
        } else if (player.touchingWallRight) {
            ctx.fillRect(player.x + player.w - 4, player.y + 10, 12, 4);
        }
    } else {
        // Normal arms
        ctx.fillRect(player.x - 2, player.y + 12, 6, 3);
        ctx.fillRect(player.x + player.w - 4, player.y + 12, 6, 3);
    }
    
    // Legs
    ctx.fillRect(player.x + 4, player.y + player.h - 8, 4, 8);
    ctx.fillRect(player.x + player.w - 8, player.y + player.h - 8, 4, 8);
    
    // Ninja weapon (kunai) - only show when wall jumping
    if (player.wallJumpTimer > 0) {
        ctx.fillStyle = '#c0c0c0';
        ctx.shadowColor = '#c0c0c0';
        ctx.shadowBlur = 2;
        const kunaiX = player.facing === 1 ? player.x + player.w + 2 : player.x - 8;
        ctx.fillRect(kunaiX, player.y + 8, 6, 2);
        ctx.fillRect(kunaiX + 2, player.y + 6, 2, 6);
        ctx.shadowBlur = 0;
    }
    
    ctx.restore();
}

// Enhanced platform drawing
function drawWalls() {
    walls.forEach(w => {
        ctx.save();
        
        switch(w.type) {
            case 'pagoda_top':
                // Golden pagoda roof
                const goldGradient = ctx.createLinearGradient(w.x, w.y, w.x, w.y + w.h);
                goldGradient.addColorStop(0, '#ffd700');
                goldGradient.addColorStop(0.5, '#ffed4a');
                goldGradient.addColorStop(1, '#f39c12');
                ctx.fillStyle = goldGradient;
                ctx.shadowColor = '#ffd700';
                ctx.shadowBlur = 20;
                ctx.fillRect(w.x, w.y, w.w, w.h);
                
                // Decorative roof edge
                ctx.fillStyle = '#ff6b35';
                ctx.fillRect(w.x - 5, w.y + w.h - 3, w.w + 10, 3);
                break;
                
            case 'temple_wall':
                // Traditional wooden temple wall
                const wallGradient = ctx.createLinearGradient(w.x, 0, w.x + w.w, 0);
                wallGradient.addColorStop(0, '#8b4513');
                wallGradient.addColorStop(0.5, '#a0522d');
                wallGradient.addColorStop(1, '#654321');
                ctx.fillStyle = wallGradient;
                ctx.fillRect(w.x, w.y, w.w, w.h);
                
                // Wood grain lines
                ctx.strokeStyle = '#654321';
                ctx.lineWidth = 1;
                for (let i = 0; i < w.h; i += 40) {
                    ctx.beginPath();
                    ctx.moveTo(w.x, w.y + i);
                    ctx.lineTo(w.x + w.w, w.y + i);
                    ctx.stroke();
                }
                break;
                
            case 'tatami':
                // Tatami mat floor
                ctx.fillStyle = '#8fbc8f';
                ctx.fillRect(w.x, w.y, w.w, w.h);
                // Tatami pattern
                ctx.strokeStyle = '#556b2f';
                ctx.lineWidth = 2;
                for (let i = 0; i < w.w; i += 60) {
                    ctx.beginPath();
                    ctx.moveTo(w.x + i, w.y);
                    ctx.lineTo(w.x + i, w.y + w.h);
                    ctx.stroke();
                }
                break;
                
            case 'wood_platform':
                // Traditional wooden platform
                const woodGradient = ctx.createLinearGradient(w.x, w.y, w.x, w.y + w.h);
                woodGradient.addColorStop(0, '#deb887');
                woodGradient.addColorStop(0.5, '#cd853f');
                woodGradient.addColorStop(1, '#8b4513');
                ctx.fillStyle = woodGradient;
                ctx.fillRect(w.x, w.y, w.w, w.h);
                
                // Wood planks
                ctx.strokeStyle = '#8b4513';
                ctx.lineWidth = 1;
                for (let i = 0; i < w.w; i += 25) {
                    ctx.beginPath();
                    ctx.moveTo(w.x + i, w.y);
                    ctx.lineTo(w.x + i, w.y + w.h);
                    ctx.stroke();
                }
                
                // Platform highlight
                ctx.fillStyle = '#f4e4bc';
                ctx.fillRect(w.x, w.y, w.w, 2);
                break;
        }
        
        ctx.restore();
    });
}

// Enhanced player movement
function updatePlayer() {
    if (gameState !== 'playing') return;
    
    player.animFrame++;
    
    // Horizontal movement
    if (keys["a"] || keys["arrowleft"]) {
        player.vx = -player.speed;
        player.facing = -1;
    } else if (keys["d"] || keys["arrowright"]) {
        player.vx = player.speed;
        player.facing = 1;
    } else {
        player.vx *= 0.85;
    }
    
    // Wall sliding effect
    player.isWallSliding = (player.touchingWallLeft || player.touchingWallRight) && !player.onGround && player.vy > 0;
    if (player.isWallSliding) {
        player.vy *= 0.9; // Slow fall when wall sliding
        if (Math.random() < 0.3) {
            createParticles(
                player.touchingWallLeft ? player.x : player.x + player.w,
                player.y + player.h/2, 1, 'wall_sparks'
            );
        }
    }
    
    // Enhanced jump mechanics
    const jumpPressed = keysPressed["w"] || keysPressed["arrowup"] || keysPressed[" "];
    if (jumpPressed) {
        if (player.onGround) {
            player.vy = player.jumpPower;
            createParticles(player.x + player.w/2, player.y + player.h, 6, 'ninja_dust');
        } else if (player.touchingWallLeft && player.canWallJump) {
            player.vy = player.jumpPower * 0.95;
            player.vx = 8;
            player.canWallJump = false;
            player.wallJumpTimer = wallJumpCooldown;
            player.facing = 1;
            createParticles(player.x, player.y + player.h/2, 10, 'wall_sparks');
            cameraShake = 4;
        } else if (player.touchingWallRight && player.canWallJump) {
            player.vy = player.jumpPower * 0.95;
            player.vx = -8;
            player.canWallJump = false;
            player.wallJumpTimer = wallJumpCooldown;
            player.facing = -1;
            createParticles(player.x + player.w, player.y + player.h/2, 10, 'wall_sparks');
            cameraShake = 4;
        }
    }
    
    Object.keys(keysPressed).forEach(key => keysPressed[key] = false);
    
    if (player.wallJumpTimer > 0) {
        player.wallJumpTimer--;
    }
    
    player.vy += gravity;
    if (player.vy > 16) player.vy = 16;
    
    player.x += player.vx;
    player.y += player.vy;
    
    // Enhanced trail
    if (player.vx !== 0 || player.vy !== 0) {
        player.trail.push({ x: player.x + player.w/2, y: player.y + player.h/2 });
        if (player.trail.length > 12) player.trail.shift();
    }
    
    // Reset collision flags
    player.onGround = false;
    player.touchingWallLeft = false;
    player.touchingWallRight = false;
    
    // Enhanced collision detection
    walls.forEach(w => {
        if (rectsCollide(player, w)) {
            if (w.type === 'pagoda_top') {
                showMessage('🎌 Master Ninja!', `You have reached the sacred pagoda! Time: ${Math.floor(gameTime/60)}s | Attempts: ${attempts}`);
                createParticles(player.x + player.w/2, player.y + player.h/2, 25, 'victory');
                return;
            }
            
            const overlapX = Math.min(player.x + player.w - w.x, w.x + w.w - player.x);
            const overlapY = Math.min(player.y + player.h - w.y, w.y + w.h - player.y);
            
            if (overlapX < overlapY) {
                if (player.x + player.w/2 < w.x + w.w/2) {
                    player.x = w.x - player.w;
                    player.touchingWallRight = true;
                } else {
                    player.x = w.x + w.w;
                    player.touchingWallLeft = true;
                }
                player.vx = 0;
            } else {
                if (player.y + player.h/2 < w.y + w.h/2) {
                    player.y = w.y - player.h;
                    player.vy = 0;
                    player.onGround = true;
                    player.canWallJump = true;
                    player.wallJumpTimer = 0;
                } else {
                    player.y = w.y + w.h;
                    player.vy = 0;
                }
            }
        }
    });
    
    // Death condition
    if (player.y > canvas.height + 50) {
        lives--;
        if (lives <= 0) {
            showMessage('⚰️ The Ninja Falls', `The shadows have claimed you... Final attempts: ${attempts}`);
        } else {
            resetPlayer();
            createParticles(player.x + player.w/2, player.y + player.h/2, 15, 'death');
            cameraShake = 8;
        }
    }
}

function resetPlayer() {
    player.x = 100;
    player.y = 600;
    player.vx = 0;
    player.vy = 0;
    player.trail = [];
    player.facing = 1;
    attempts++;
}

function updateUI() {
    if (gameState === 'playing') {
        gameTime++;
    }
    
    document.getElementById('lives').textContent = lives;
    document.getElementById('timer').textContent = Math.floor(gameTime / 60);
    document.getElementById('attempts').textContent = attempts;
}

function showMessage(title, subtitle) {
    gameState = 'message';
    const messageEl = document.getElementById('message');
    const textEl = document.getElementById('messageText');
    textEl.innerHTML = `<div style="font-size: 28px; margin-bottom: 15px;">${title}</div><div style="font-size: 16px;">${subtitle}</div>`;
    messageEl.style.display = 'block';
}

function hideMessage() {
    gameState = 'playing';
    document.getElementById('message').style.display = 'none';
    
    if (lives <= 0 || document.getElementById('messageText').textContent.includes('Master Ninja')) {
        resetGame();
    }
}

function resetGame() {
    lives = 3;
    attempts = 1;
    gameTime = 0;
    particles = [];
    resetPlayer();
}

function gameLoop() {
    // Draw background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGradient.addColorStop(0, '#2d1b69');
    bgGradient.addColorStop(0.7, '#1a1a2e');
    bgGradient.addColorStop(1, '#0f0f23');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    updateEnvironment();
    drawEnvironment();
    
    updatePlayer();
    updateParticles();
    
    drawWalls();
    drawNinja();
    drawParticles();
    
    updateUI();
    
    requestAnimationFrame(gameLoop);
}

// Start the game
gameLoop();