// Game canvas setup
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Game UI elements
const scoreDisplay = document.getElementById("scoreDisplay");
const gameOverScreen = document.getElementById("gameOver");
const finalScoreDisplay = document.getElementById("finalScore");
const restartButton = document.getElementById("restartButton");
const touchControls = document.getElementById("touchControls");

// Set canvas size with responsive design
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Adjust grid size for responsiveness
    gridSize = Math.min(canvas.width, canvas.height) / 60;

    // Recalculate game board dimensions
    boardWidth = Math.floor(canvas.width / gridSize);
    boardHeight = Math.floor(canvas.height / gridSize);

    // Adjust game world size
    worldWidth = boardWidth * 2;
    worldHeight = boardHeight * 2;

    // Adjust camera
    if (playerSnake && playerSnake.segments.length > 0) {
        camera.x = playerSnake.segments[0].x - canvas.width / 2;
        camera.y = playerSnake.segments[0].y - canvas.height / 2;
    }
}

// Show touch controls on mobile devices
function setupTouchControls() {
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        touchControls.style.display = "block";

        document.getElementById("upBtn").addEventListener("touchstart", () => {
            if (playerSnake.dy === 0) {
                playerSnake.dx = 0;
                playerSnake.dy = -1;
            }
        });

        document.getElementById("downBtn").addEventListener("touchstart", () => {
            if (playerSnake.dy === 0) {
                playerSnake.dx = 0;
                playerSnake.dy = 1;
            }
        });

        document.getElementById("leftBtn").addEventListener("touchstart", () => {
            if (playerSnake.dx === 0) {
                playerSnake.dx = -1;
                playerSnake.dy = 0;
            }
        });

        document.getElementById("rightBtn").addEventListener("touchstart", () => {
            if (playerSnake.dx === 0) {
                playerSnake.dx = 1;
                playerSnake.dy = 0;
            }
        });
    }
}

// Mouse/touch position tracking
const mouse = {
    x: 0,
    y: 0,
    isTracking: false
};

canvas.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.isTracking = true;
});

canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    mouse.x = e.touches[0].clientX;
    mouse.y = e.touches[0].clientY;
    mouse.isTracking = true;
});

// Initialize game variables
let gridSize = 10;
let boardWidth, boardHeight;
let worldWidth, worldHeight;

// Camera for following the snake
const camera = {
    x: 0,
    y: 0
};

// Game state
let gameActive = true;
let score = 0;

// Food items
const foodItems = [];
const maxFood = 100;
const foodColors = ["#FF5733", "#FFC300", "#DAF7A6", "#FF33FF", "#33FFFF"];

// AI snakes
const aiSnakes = [];
const maxAISnakes = 5;

// Player snake class
class Snake {
    constructor(x, y, color, isAI = false) {
        this.segments = [{ x, y }];
        this.dx = 1;
        this.dy = 0;
        this.targetDx = 1;
        this.targetDy = 0;
        this.speed = 3;
        this.size = gridSize;
        this.color = color;
        this.growing = 0;
        this.isAI = isAI;
        this.turnCounter = 0;
        this.segmentSpacing = 5;
        this.lastTailPos = { x, y };
        this.score = isAI ? Math.floor(Math.random() * 5) + 1 : 0;

        // Generate a random length for AI snakes
        if (isAI) {
            const initialLength = this.score + 5;
            for (let i = 1; i < initialLength; i++) {
                this.segments.push({
                    x: x - i * this.segmentSpacing,
                    y: y
                });
            }
        }
    }

    update() {
        // AI movement logic
        if (this.isAI) {
            this.updateAI();
        } else {
            // Handle smooth turning for player
            if (Math.abs(this.dx) !== Math.abs(this.targetDx) ||
                Math.abs(this.dy) !== Math.abs(this.targetDy)) {
                this.dx = this.targetDx;
                this.dy = this.targetDy;
            }
        }

        // Store the last tail position before movement
        if (this.segments.length > 0) {
            const tail = this.segments[this.segments.length - 1];
            this.lastTailPos = { x: tail.x, y: tail.y };
        }

        // Move head
        const head = this.segments[0];
        const newHead = {
            x: head.x + this.dx * this.speed,
            y: head.y + this.dy * this.speed
        };

        // Wrap around world edges
        if (newHead.x < 0) newHead.x = worldWidth * gridSize;
        if (newHead.x > worldWidth * gridSize) newHead.x = 0;
        if (newHead.y < 0) newHead.y = worldHeight * gridSize;
        if (newHead.y > worldHeight * gridSize) newHead.y = 0;

        this.segments.unshift(newHead);

        // Remove tail segment if not growing
        if (this.growing > 0) {
            this.growing--;
        } else {
            this.segments.pop();
        }

        // Check for collisions with food
        this.checkFoodCollisions();

        // Check for collisions with other snakes
        if (!this.isAI) {
            this.checkSnakeCollisions();
        }
    }

    updateAI() {
        // Simple AI: Change direction occasionally and avoid walls
        this.turnCounter++;

        if (this.turnCounter > 30) {
            if (Math.random() < 0.3) {
                // Random direction change
                const directions = [
                    { dx: 1, dy: 0 },
                    { dx: -1, dy: 0 },
                    { dx: 0, dy: 1 },
                    { dx: 0, dy: -1 }
                ];

                // Filter out impossible turns (180 degrees)
                const possibleDirections = directions.filter(dir =>
                    !(dir.dx === -this.dx && dir.dy === -this.dy)
                );

                const newDir = possibleDirections[Math.floor(Math.random() * possibleDirections.length)];
                this.dx = newDir.dx;
                this.dy = newDir.dy;
            }

            this.turnCounter = 0;
        }

        // Look for nearby food
        let closestFood = null;
        let closestDist = Infinity;

        const head = this.segments[0];

        for (const food of foodItems) {
            const dist = Math.hypot(food.x - head.x, food.y - head.y);
            if (dist < closestDist && dist < 200) {
                closestDist = dist;
                closestFood = food;
            }
        }

        // Move towards food if found
        if (closestFood) {
            const dx = closestFood.x - head.x;
            const dy = closestFood.y - head.y;

            // Choose horizontal or vertical movement based on distance
            if (Math.abs(dx) > Math.abs(dy)) {
                this.dx = dx > 0 ? 1 : -1;
                this.dy = 0;
            } else {
                this.dx = 0;
                this.dy = dy > 0 ? 1 : -1;
            }
        }

        // Avoid edges with some randomness
        const edgeBuffer = 50;
        if (head.x < edgeBuffer || head.x > worldWidth * gridSize - edgeBuffer ||
            head.y < edgeBuffer || head.y > worldHeight * gridSize - edgeBuffer) {
            if (Math.random() < 0.5) {
                if (head.x < edgeBuffer || head.x > worldWidth * gridSize - edgeBuffer) {
                    this.dx = 0;
                    this.dy = Math.random() < 0.5 ? 1 : -1;
                } else {
                    this.dx = Math.random() < 0.5 ? 1 : -1;
                    this.dy = 0;
                }
            }
        }
    }

    grow(amount) {
        this.growing += amount;
        this.score += amount;
    }

    checkFoodCollisions() {
        const head = this.segments[0];
        const eatDistance = this.size / 2;

        for (let i = 0; i < foodItems.length; i++) {
            const food = foodItems[i];
            const dx = head.x - food.x;
            const dy = head.y - food.y;
            const distance = Math.hypot(dx, dy);

            if (distance < eatDistance + food.size) {
                // Snake eats the food
                this.grow(food.value);

                // Update score if it's the player
                if (!this.isAI) {
                    score += food.value;
                    scoreDisplay.textContent = `Score: ${score}`;
                }

                // Remove the eaten food
                foodItems.splice(i, 1);
                i--;

                // Add new food to maintain food count
                spawnFood();
            }
        }
    }

    checkSnakeCollisions() {
        const head = this.segments[0];

        // Check collision with AI snakes
        for (const aiSnake of aiSnakes) {
            for (let i = 0; i < aiSnake.segments.length; i++) {
                const segment = aiSnake.segments[i];
                const dx = head.x - segment.x;
                const dy = head.y - segment.y;
                const distance = Math.hypot(dx, dy);

                if (distance < gridSize * 0.8) {
                    gameOver();
                    return;
                }
            }
        }

        // Check self-collision (skip the first few segments)
        for (let i = 5; i < this.segments.length; i++) {
            const segment = this.segments[i];
            const dx = head.x - segment.x;
            const dy = head.y - segment.y;
            const distance = Math.hypot(dx, dy);

            if (distance < gridSize * 0.5) {
                gameOver();
                return;
            }
        }
    }

    draw() {
        ctx.save();
        ctx.translate(-camera.x, -camera.y);

        // Draw snake segments
        for (let i = 0; i < this.segments.length; i++) {
            const segment = this.segments[i];

            // Skip some segments for performance on very long snakes
            if (this.segments.length > 100 && i % 2 !== 0 && i !== 0 && i !== this.segments.length - 1) {
                continue;
            }

            // Head is larger than body segments
            const size = i === 0 ? this.size * 1.2 : this.size * (0.9 - i * 0.001);

            // Gradient colors for the snake
            const hue = (parseInt(this.color.substring(1), 16) + i * 500) % 16777215;
            const segmentColor = i === 0 ? this.color : `hsl(${(hue % 360)}, 80%, 50%)`;

            ctx.fillStyle = segmentColor;
            ctx.beginPath();
            ctx.arc(segment.x, segment.y, size, 0, Math.PI * 2);
            ctx.fill();

            // Draw eyes on the head
            if (i === 0) {
                // Determine eye position based on direction
                const eyeOffset = this.size * 0.3;
                const eyeSize = this.size * 0.3;

                // Left eye
                let leftEyeX = segment.x;
                let leftEyeY = segment.y;

                // Right eye
                let rightEyeX = segment.x;
                let rightEyeY = segment.y;

                if (this.dx === 1) {
                    // Moving right
                    leftEyeX += eyeOffset;
                    leftEyeY -= eyeOffset;
                    rightEyeX += eyeOffset;
                    rightEyeY += eyeOffset;
                } else if (this.dx === -1) {
                    // Moving left
                    leftEyeX -= eyeOffset;
                    leftEyeY -= eyeOffset;
                    rightEyeX -= eyeOffset;
                    rightEyeY += eyeOffset;
                } else if (this.dy === 1) {
                    // Moving down
                    leftEyeX -= eyeOffset;
                    leftEyeY += eyeOffset;
                    rightEyeX += eyeOffset;
                    rightEyeY += eyeOffset;
                } else if (this.dy === -1) {
                    // Moving up
                    leftEyeX -= eyeOffset;
                    leftEyeY -= eyeOffset;
                    rightEyeX += eyeOffset;
                    rightEyeY -= eyeOffset;
                }

                // Draw the eyes
                ctx.fillStyle = "white";
                ctx.beginPath();
                ctx.arc(leftEyeX, leftEyeY, eyeSize, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(rightEyeX, rightEyeY, eyeSize, 0, Math.PI * 2);
                ctx.fill();

                // Draw pupils
                ctx.fillStyle = "black";
                ctx.beginPath();
                ctx.arc(leftEyeX, leftEyeY, eyeSize * 0.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(rightEyeX, rightEyeY, eyeSize * 0.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }
}

// Food class
class Food {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.color = foodColors[Math.floor(Math.random() * foodColors.length)];
        this.size = Math.random() * 3 + 3;
        this.value = Math.ceil(this.size / 2);
        this.angle = 0;
        this.pulseSpeed = 0.05;
        this.pulseAmount = 0.2;
    }

    update() {
        // Make food glow/pulse
        this.angle += this.pulseSpeed;
    }

    draw() {
        ctx.save();
        ctx.translate(-camera.x, -camera.y);

        // Pulsing effect
        const pulseFactor = 1 + Math.sin(this.angle) * this.pulseAmount;
        const currentSize = this.size * pulseFactor;

        // Glow effect
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;

        // Draw food
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, currentSize, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

// Initialize the game
let playerSnake;

function initGame() {
    resizeCanvas();

    // Create player snake
    playerSnake = new Snake(canvas.width / 2, canvas.height / 2, "#00FF00");

    // Initialize AI snakes
    aiSnakes.length = 0;
    for (let i = 0; i < maxAISnakes; i++) {
        const x = Math.random() * worldWidth * gridSize;
        const y = Math.random() * worldHeight * gridSize;
        const color = `hsl(${Math.random() * 360}, 80%, 50%)`;
        aiSnakes.push(new Snake(x, y, color, true));
    }

    // Initialize food
    foodItems.length = 0;
    for (let i = 0; i < maxFood; i++) {
        spawnFood();
    }

    // Reset score
    score = 0;
    scoreDisplay.textContent = `Score: ${score}`;

    // Set game state
    gameActive = true;
    gameOverScreen.style.display = "none";

    // Setup controls
    setupTouchControls();

    // Start game loop
    requestAnimationFrame(gameLoop);
}

function spawnFood() {
    const x = Math.random() * worldWidth * gridSize;
    const y = Math.random() * worldHeight * gridSize;
    foodItems.push(new Food(x, y));
}

function gameOver() {
    gameActive = false;
    finalScoreDisplay.textContent = score;
    gameOverScreen.style.display = "block";
}

// Handle key presses for player movement
document.addEventListener("keydown", (e) => {
    if (!gameActive) return;

    // Prevent default behavior for arrow keys
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
        e.preventDefault();
    }

    if (e.code === "ArrowLeft" && playerSnake.dx === 0) {
        playerSnake.targetDx = -1;
        playerSnake.targetDy = 0;
    } else if (e.code === "ArrowRight" && playerSnake.dx === 0) {
        playerSnake.targetDx = 1;
        playerSnake.targetDy = 0;
    } else if (e.code === "ArrowUp" && playerSnake.dy === 0) {
        playerSnake.targetDx = 0;
        playerSnake.targetDy = -1;
    } else if (e.code === "ArrowDown" && playerSnake.dy === 0) {
        playerSnake.targetDx = 0;
        playerSnake.targetDy = 1;
    }
});

// Handle mouse control
canvas.addEventListener("mousemove", (e) => {
    if (!gameActive || !mouse.isTracking) return;

    // Calculate direction from snake head to mouse
    const head = playerSnake.segments[0];
    const screenX = head.x - camera.x;
    const screenY = head.y - camera.y;

    const dx = e.clientX - screenX;
    const dy = e.clientY - screenY;

    // Only change direction if the mouse is far enough from the head
    if (Math.abs(dx) > 30 || Math.abs(dy) > 30) {
        // Determine the dominant direction (horizontal or vertical)
        if (Math.abs(dx) > Math.abs(dy)) {
            if (playerSnake.dy !== 0) { // Only change if moving vertically
                playerSnake.targetDx = dx > 0 ? 1 : -1;
                playerSnake.targetDy = 0;
            }
        } else {
            if (playerSnake.dx !== 0) { // Only change if moving horizontally
                playerSnake.targetDx = 0;
                playerSnake.targetDy = dy > 0 ? 1 : -1;
            }
        }
    }
});

// Handle window resize
window.addEventListener("resize", resizeCanvas);

// Handle restart button
restartButton.addEventListener("click", initGame);

// Draw background grid
function drawGrid() {
    ctx.save();
    ctx.translate(-camera.x % gridSize, -camera.y % gridSize);

    ctx.strokeStyle = "#333333";
    ctx.lineWidth = 0.5;

    // Draw vertical lines
    for (let x = 0; x <= canvas.width + gridSize; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    // Draw horizontal lines
    for (let y = 0; y <= canvas.height + gridSize; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    ctx.restore();
}

// Draw world boundaries
function drawBoundary() {
    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    ctx.strokeStyle = "#FF0000";
    ctx.lineWidth = 5;
    ctx.strokeRect(0, 0, worldWidth * gridSize, worldHeight * gridSize);

    ctx.restore();
}

// Game loop
function gameLoop() {
    if (!gameActive) return;

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update camera to follow player
    if (playerSnake.segments.length > 0) {
        const head = playerSnake.segments[0];
        camera.x = head.x - canvas.width / 2;
        camera.y = head.y - canvas.height / 2;
    }

    // Draw background grid
    drawGrid();

    // Draw world boundary
    drawBoundary();

    // Update and draw food
    for (const food of foodItems) {
        food.update();
        food.draw();
    }

    // Update and draw AI snakes
    for (const aiSnake of aiSnakes) {
        aiSnake.update();
        aiSnake.draw();
    }

    // Update and draw player snake
    playerSnake.update();
    playerSnake.draw();

    // Request next frame
    requestAnimationFrame(gameLoop);
}

// Start the game
initGame();