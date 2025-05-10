const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreElement = document.getElementById('finalScore');
const restartButton = document.getElementById('restartButton');

// Game constants
const FLAP_SPEED = -8;
const BIRD_WIDTH = 34;
const BIRD_HEIGHT = 24;
const PIPE_WIDTH = 52;
const PIPE_GAP = 120;
const GROUND_HEIGHT = 112;

// Game state
let score = 0;
let frames = 0;
let gameOver = false;

// Bird object
const bird = {
    x: 50,
    y: 150,
    velocity: 0,
    gravity: 0.5,
    jump: FLAP_SPEED,
    reset: function() {
        this.y = 150;
        this.velocity = 0;
    },
    draw: function() {
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(this.x, this.y, BIRD_HEIGHT/2, 0, Math.PI * 2);
        ctx.fill();
        
        // Wing
        ctx.fillStyle = '#FF6B6B';
        ctx.beginPath();
        ctx.ellipse(this.x - 5, this.y, 8, 12, Math.PI/4, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(this.x + 8, this.y - 5, 5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(this.x + 10, this.y - 5, 2, 0, Math.PI * 2);
        ctx.fill();
    },
    update: function() {
        if (gameOver) return;
        
        this.velocity += this.gravity;
        this.y += this.velocity;

        // Ground collision
        if (this.y + BIRD_HEIGHT/2 >= canvas.height - GROUND_HEIGHT) {
            this.y = canvas.height - GROUND_HEIGHT - BIRD_HEIGHT/2;
            endGame();
        }

        // Ceiling collision
        if (this.y - BIRD_HEIGHT/2 <= 0) {
            this.y = BIRD_HEIGHT/2;
            this.velocity = 0;
        }
    },
    flap: function() {
        if (!gameOver) {
            this.velocity = this.jump;
        }
    }
};

// Pipes array
let pipes = [];

class Pipe {
    constructor() {
        this.x = canvas.width;
        this.gapTop = Math.random() * (canvas.height - PIPE_GAP - GROUND_HEIGHT - 100) + 50;
        this.passed = false;
    }

    draw() {
        // Top pipe
        ctx.fillStyle = '#74BF2E';
        ctx.fillRect(this.x, 0, PIPE_WIDTH, this.gapTop);
        
        // Pipe cap (top)
        ctx.fillStyle = '#8B7355';
        ctx.fillRect(this.x - 2, this.gapTop - 20, PIPE_WIDTH + 4, 20);

        // Bottom pipe
        ctx.fillStyle = '#74BF2E';
        ctx.fillRect(this.x, this.gapTop + PIPE_GAP, PIPE_WIDTH, 
            canvas.height - (this.gapTop + PIPE_GAP) - GROUND_HEIGHT);
        
        // Pipe cap (bottom)
        ctx.fillStyle = '#8B7355';
        ctx.fillRect(this.x - 2, this.gapTop + PIPE_GAP, PIPE_WIDTH + 4, 20);
    }

    update() {
        if (!gameOver) {
            this.x -= 2;
        }

        // Score when passing pipe
        if (!this.passed && this.x + PIPE_WIDTH < bird.x) {
            score++;
            scoreElement.textContent = score;
            this.passed = true;
        }
    }
}

// Ground
function drawGround() {
    ctx.fillStyle = '#DED895';
    ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, GROUND_HEIGHT);
    
    // Ground detail
    ctx.fillStyle = '#BAA333';
    ctx.fillRect(0, canvas.height - GROUND_HEIGHT/2, canvas.width, GROUND_HEIGHT/2);
}

function endGame() {
    gameOver = true;
    gameOverScreen.style.display = 'block';
    finalScoreElement.textContent = score;
}

function restartGame() {
    gameOver = false;
    score = 0;
    frames = 0;
    pipes = [];
    bird.reset();
    scoreElement.textContent = '0';
    gameOverScreen.style.display = 'none';
}

// Game loop
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = '#70C5CE';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update and draw pipes
    if (frames % 100 === 0 && !gameOver) {
        pipes.push(new Pipe());
    }

    pipes.forEach((pipe, index) => {
        pipe.update();
        pipe.draw();

        // Collision detection
        if (bird.x + BIRD_WIDTH/2 > pipe.x && 
            bird.x - BIRD_WIDTH/2 < pipe.x + PIPE_WIDTH && 
            (bird.y - BIRD_HEIGHT/2 < pipe.gapTop || 
             bird.y + BIRD_HEIGHT/2 > pipe.gapTop + PIPE_GAP)) {
            endGame();
        }
    });

    // Remove off-screen pipes
    pipes = pipes.filter(pipe => pipe.x + PIPE_WIDTH > 0);

    drawGround();
    bird.update();
    bird.draw();

    frames++;
    requestAnimationFrame(gameLoop);
}

// Controls
document.addEventListener('keydown', function(e) {
    if (e.code === 'Space') {
        e.preventDefault();
        if (gameOver) {
            restartGame();
        } else {
            bird.flap();
        }
    }
});

canvas.addEventListener('touchstart', function(e) {
    e.preventDefault();
    if (gameOver) {
        restartGame();
    } else {
        bird.flap();
    }
});

restartButton.addEventListener('click', restartGame);

// Start game
gameLoop();