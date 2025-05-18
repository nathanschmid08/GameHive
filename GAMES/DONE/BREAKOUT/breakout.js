const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.querySelector('.score');
const livesDisplay = document.querySelector('.heart');
const gameOverScreen = document.querySelector('.game-over');
const levelCompleteScreen = document.querySelector('.level-complete');
const finalScoreDisplay = document.querySelector('.final-score');
const winScoreDisplay = document.querySelector('.win-score');
const restartButtons = document.querySelectorAll('.restart-btn');
const pauseButton = document.querySelector('.pause-btn');

// Game state
let gamePaused = false;
let gameActive = true;

// Game variables
const paddle = {
    width: 100,
    height: 15,
    x: canvas.width / 2 - 50,
    y: canvas.height - 30,
    dx: 8,
    color: '#3498db'
};

const ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 10,
    speed: 5,
    dx: 5,
    dy: -5,
    color: '#e74c3c'
};

const brick = {
    rowCount: 5,
    columnCount: 8,
    width: 80,
    height: 25,
    padding: 10,
    offsetTop: 60,
    offsetLeft: 35,
    colors: ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db']
};

let bricks = [];
let score = 0;
let lives = 3;
let particles = [];

// Initialize bricks
function createBricks() {
    for (let r = 0; r < brick.rowCount; r++) {
        bricks[r] = [];
        for (let c = 0; c < brick.columnCount; c++) {
            bricks[r][c] = { 
                x: 0, 
                y: 0, 
                status: 1,
                color: brick.colors[r]
            };
        }
    }
}
createBricks();

// Create particles
function createParticles(x, y, color) {
    const particleCount = 8;
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: x,
            y: y,
            size: Math.random() * 3 + 1,
            color: color,
            speedX: (Math.random() - 0.5) * 5,
            speedY: (Math.random() - 0.5) * 5,
            lifetime: 30
        });
    }
}

// Update particles
function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.speedX;
        p.y += p.speedY;
        p.lifetime--;
        
        if (p.lifetime <= 0) {
            particles.splice(i, 1);
        }
    }
}

// Draw particles
function drawParticles() {
    particles.forEach(p => {
        ctx.globalAlpha = p.lifetime / 30;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.closePath();
        ctx.globalAlpha = 1;
    });
}

// Draw paddle
function drawPaddle() {
    ctx.beginPath();
    ctx.roundRect(paddle.x, paddle.y, paddle.width, paddle.height, 5);
    ctx.fillStyle = paddle.color;
    ctx.fill();
    ctx.closePath();
    
    // Add paddle shine effect
    ctx.beginPath();
    ctx.roundRect(paddle.x + 10, paddle.y + 3, paddle.width - 20, 4, 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fill();
    ctx.closePath();
}

// Draw ball
function drawBall() {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = ball.color;
    ctx.fill();
    ctx.closePath();
    
    // Add ball shine effect
    ctx.beginPath();
    ctx.arc(ball.x - ball.radius/3, ball.y - ball.radius/3, ball.radius/3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fill();
    ctx.closePath();
}

// Draw bricks
function drawBricks() {
    for (let r = 0; r < brick.rowCount; r++) {
        for (let c = 0; c < brick.columnCount; c++) {
            if (bricks[r][c].status === 1) {
                const brickX = c * (brick.width + brick.padding) + brick.offsetLeft;
                const brickY = r * (brick.height + brick.padding) + brick.offsetTop;
                bricks[r][c].x = brickX;
                bricks[r][c].y = brickY;
                
                // Draw brick with rounded corners
                ctx.beginPath();
                ctx.roundRect(brickX, brickY, brick.width, brick.height, 5);
                ctx.fillStyle = bricks[r][c].color;
                ctx.fill();
                ctx.closePath();
                
                // Add brick shine effect
                ctx.beginPath();
                ctx.roundRect(brickX + 10, brickY + 5, brick.width - 20, 5, 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.fill();
                ctx.closePath();
            }
        }
    }
}

// Update score display
function updateScore() {
    scoreDisplay.textContent = `Score: ${score}`;
}

// Update lives display
function updateLives() {
    livesDisplay.textContent = '❤️'.repeat(lives);
}

// Move paddle
function movePaddle() {
    if (rightPressed && paddle.x + paddle.width < canvas.width) {
        paddle.x += paddle.dx;
    } else if (leftPressed && paddle.x > 0) {
        paddle.x -= paddle.dx;
    }
}

// Move ball
function moveBall() {
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Wall collision
    if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
        ball.dx = -ball.dx;
        playSound('wall');
    }

    if (ball.y - ball.radius < 0) {
        ball.dy = -ball.dy;
        playSound('wall');
    } else if (ball.y + ball.radius > canvas.height) {
        lives--;
        updateLives();
        playSound('lose-life');
        
        if (lives <= 0) {
            gameOver();
        } else {
            resetBall();
        }
    }

    // Paddle collision
    if (
        ball.x > paddle.x &&
        ball.x < paddle.x + paddle.width &&
        ball.y + ball.radius > paddle.y &&
        ball.y + ball.radius < paddle.y + paddle.height
    ) {
        // Calculate bounce angle based on where ball hits paddle
        const hitPosition = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
        ball.dx = hitPosition * (ball.speed + 1);
        ball.dy = -ball.dy;
        playSound('paddle');
        
        // Create paddle hit particles
        createParticles(ball.x, ball.y, '#fff');
    }

    // Brick collision
    brickCollisionDetection();
}

// Detect brick collisions
function brickCollisionDetection() {
    for (let r = 0; r < brick.rowCount; r++) {
        for (let c = 0; c < brick.columnCount; c++) {
            const b = bricks[r][c];
            if (b.status === 1) {
                if (
                    ball.x > b.x &&
                    ball.x < b.x + brick.width &&
                    ball.y > b.y &&
                    ball.y < b.y + brick.height
                ) {
                    ball.dy = -ball.dy;
                    b.status = 0;
                    score += 10;
                    updateScore();
                    playSound('brick');
                    
                    // Create brick break particles
                    createParticles(ball.x, ball.y, b.color);
                    
                    // Check for win
                    checkWin();
                }
            }
        }
    }
}

// Check if player won
function checkWin() {
    let bricksRemaining = 0;
    for (let r = 0; r < brick.rowCount; r++) {
        for (let c = 0; c < brick.columnCount; c++) {
            if (bricks[r][c].status === 1) {
                bricksRemaining++;
            }
        }
    }
    
    if (bricksRemaining === 0) {
        levelComplete();
    }
}

// Level complete
function levelComplete() {
    gameActive = false;
    winScoreDisplay.textContent = score;
    levelCompleteScreen.style.display = 'block';
    playSound('win');
}

// Game over
function gameOver() {
    gameActive = false;
    finalScoreDisplay.textContent = score;
    gameOverScreen.style.display = 'block';
    playSound('game-over');
}

// Reset ball after losing a life
function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height - 60;
    
    // Random horizontal direction
    ball.dx = (Math.random() > 0.5 ? 1 : -1) * ball.speed;
    ball.dy = -ball.speed;
}

// Draw the grid background
function drawBackground() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    
    // Vertical lines
    for (let x = 0; x <= canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = 0; y <= canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

// Play sound effects (using audio API)
function playSound(type) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    switch(type) {
        case 'paddle':
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.1);
            break;
        case 'brick':
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(500, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.1);
            break;
        case 'wall':
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.1);
            break;
        case 'lose-life':
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(100, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            oscillator.frequency.linearRampToValueAtTime(50, audioContext.currentTime + 0.3);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.3);
            break;
        case 'game-over':
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
            oscillator.frequency.linearRampToValueAtTime(50, audioContext.currentTime + 0.5);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.5);
            break;
        case 'win':
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            oscillator.start();
            oscillator.frequency.linearRampToValueAtTime(600, audioContext.currentTime + 0.2);
            oscillator.frequency.linearRampToValueAtTime(800, audioContext.currentTime + 0.4);
            oscillator.stop(audioContext.currentTime + 0.6);
            break;
    }
}

// Restart game
function restartGame() {
    score = 0;
    lives = 3;
    createBricks();
    resetBall();
    updateScore();
    updateLives();
    gameActive = true;
    gameOverScreen.style.display = 'none';
    levelCompleteScreen.style.display = 'none';
}

// Toggle pause
function togglePause() {
    gamePaused = !gamePaused;
    pauseButton.textContent = gamePaused ? '▶️' : '⏸️';
}

// Event listeners
let rightPressed = false;
let leftPressed = false;

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') rightPressed = true;
    if (e.key === 'ArrowLeft') leftPressed = true;
    if (e.key === 'p' || e.key === 'P') togglePause();
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowRight') rightPressed = false;
    if (e.key === 'ArrowLeft') leftPressed = false;
});

// Touch/mouse controls for mobile
canvas.addEventListener('mousemove', (e) => {
    const relativeX = e.clientX - canvas.getBoundingClientRect().left;
    if (relativeX > 0 && relativeX < canvas.width) {
        paddle.x = relativeX - paddle.width / 2;
    }
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const relativeX = e.touches[0].clientX - canvas.getBoundingClientRect().left;
    if (relativeX > 0 && relativeX < canvas.width) {
        paddle.x = relativeX - paddle.width / 2;
    }
}, { passive: false });

// Restart button event listeners
restartButtons.forEach(button => {
    button.addEventListener('click', restartGame);
});

// Pause button event listener
pauseButton.addEventListener('click', togglePause);

// Game loop
function gameLoop() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw game elements
    drawBackground();
    drawBricks();
    drawPaddle();
    drawBall();
    drawParticles();
    
    // Update game state if not paused and game is active
    if (!gamePaused && gameActive) {
        movePaddle();
        moveBall();
        updateParticles();
    }
    
    requestAnimationFrame(gameLoop);
}

// Initialize game
updateScore();
updateLives();

// Add polyfill for roundRect if not supported
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius) {
        if (width < 2 * radius) radius = width / 2;
        if (height < 2 * radius) radius = height / 2;
        this.beginPath();
        this.moveTo(x + radius, y);
        this.arcTo(x + width, y, x + width, y + height, radius);
        this.arcTo(x + width, y + height, x, y + height, radius);
        this.arcTo(x, y + height, x, y, radius);
        this.arcTo(x, y, x + width, y, radius);
        this.closePath();
        return this;
    };
}

// Start the game
gameLoop();