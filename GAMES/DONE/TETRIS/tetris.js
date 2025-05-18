const canvas = document.getElementById("tetrisCanvas");
const ctx = canvas.getContext("2d");
const nextPieceCanvas = document.getElementById("nextPieceCanvas");
const nextPieceCtx = nextPieceCanvas.getContext("2d");
const scoreDisplay = document.getElementById("score");
const levelDisplay = document.getElementById("level");
const linesDisplay = document.getElementById("lines");
const finalScoreDisplay = document.getElementById("finalScore");
const gameOverOverlay = document.getElementById("gameOverOverlay");
const pauseBtn = document.getElementById("pauseBtn");
const restartBtn = document.getElementById("restartBtn");
const playAgainBtn = document.getElementById("playAgainBtn");

const ROWS = 20;
const COLUMNS = 10;
const BLOCK_SIZE = 30;
const PREVIEW_BLOCK_SIZE = 25;

let score = 0;
let level = 1;
let lines = 0;
let isPaused = false;
let gameSpeed = 500; // milliseconds
let gameTimer;

// Tetromino shapes and colors
const TETROMINOES = [
    { shape: [[1, 1, 1, 1]], color: "#00f0f0", name: "I" },                // I - Cyan
    { shape: [[1, 1], [1, 1]], color: "#f0f000", name: "O" },              // O - Yellow
    { shape: [[0, 1, 0], [1, 1, 1]], color: "#a000f0", name: "T" },        // T - Purple
    { shape: [[1, 1, 0], [0, 1, 1]], color: "#00f000", name: "S" },        // S - Green
    { shape: [[0, 1, 1], [1, 1, 0]], color: "#f00000", name: "Z" },        // Z - Red
    { shape: [[1, 0, 0], [1, 1, 1]], color: "#f0a000", name: "L" },        // L - Orange
    { shape: [[0, 0, 1], [1, 1, 1]], color: "#0000f0", name: "J" }         // J - Blue
];

let grid = Array.from({ length: ROWS }, () => Array(COLUMNS).fill(0));
let currentPiece = null;
let nextPiece = null;
let currentX = 0;
let currentY = 0;
let isGameOver = false;

function drawBlock(ctx, x, y, color, size) {
    const gradient = ctx.createLinearGradient(x, y, x + size, y + size);
    gradient.addColorStop(0, lightenColor(color, 30));
    gradient.addColorStop(1, darkenColor(color, 20));
    
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, size, size);
    
    // Inner border
    ctx.strokeStyle = lightenColor(color, 50);
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 2, y + 2, size - 4, size - 4);
    
    // Outer border
    ctx.strokeStyle = darkenColor(color, 30);
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, size, size);
}

function lightenColor(color, amount) {
    return adjustColor(color, amount);
}

function darkenColor(color, amount) {
    return adjustColor(color, -amount);
}

function adjustColor(color, amount) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    const newR = Math.max(0, Math.min(255, r + amount));
    const newG = Math.max(0, Math.min(255, g + amount));
    const newB = Math.max(0, Math.min(255, b + amount));
    
    const newHex = ((1 << 24) + (newR << 16) + (newG << 8) + newB).toString(16).slice(1);
    return '#' + newHex;
}

function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background grid
    ctx.fillStyle = "var(--grid-color)";
    ctx.fillRect(0, 0, COLUMNS * BLOCK_SIZE, ROWS * BLOCK_SIZE);
    
    // Draw grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    
    for (let row = 0; row <= ROWS; row++) {
        ctx.beginPath();
        ctx.moveTo(0, row * BLOCK_SIZE);
        ctx.lineTo(COLUMNS * BLOCK_SIZE, row * BLOCK_SIZE);
        ctx.stroke();
    }
    
    for (let col = 0; col <= COLUMNS; col++) {
        ctx.beginPath();
        ctx.moveTo(col * BLOCK_SIZE, 0);
        ctx.lineTo(col * BLOCK_SIZE, ROWS * BLOCK_SIZE);
        ctx.stroke();
    }
    
    // Draw placed blocks
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLUMNS; col++) {
            if (grid[row][col]) {
                drawBlock(
                    ctx, 
                    col * BLOCK_SIZE, 
                    row * BLOCK_SIZE, 
                    grid[row][col], 
                    BLOCK_SIZE
                );
            }
        }
    }
}

function drawGhostPiece() {
    if (!currentPiece) return;
    
    let ghostY = currentY;
    
    // Find the lowest valid position
    while (!checkCollision(currentX, ghostY + 1, currentPiece.shape)) {
        ghostY++;
    }
    
    // Don't draw ghost if it overlaps with the current piece
    if (ghostY === currentY) return;
    
    ctx.globalAlpha = 0.3;
    currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                drawBlock(
                    ctx,
                    (currentX + x) * BLOCK_SIZE,
                    (ghostY + y) * BLOCK_SIZE,
                    currentPiece.color,
                    BLOCK_SIZE
                );
            }
        });
    });
    ctx.globalAlpha = 1.0;
}

function drawCurrentPiece() {
    if (!currentPiece) return;
    
    currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                drawBlock(
                    ctx,
                    (currentX + x) * BLOCK_SIZE,
                    (currentY + y) * BLOCK_SIZE,
                    currentPiece.color,
                    BLOCK_SIZE
                );
            }
        });
    });
}

function drawNextPiece() {
    if (!nextPiece) return;
    
    nextPieceCtx.clearRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);
    nextPieceCtx.fillStyle = "var(--grid-color)";
    nextPieceCtx.fillRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);
    
    const shape = nextPiece.shape;
    const width = shape[0].length;
    const height = shape.length;
    
    const offsetX = (nextPieceCanvas.width - width * PREVIEW_BLOCK_SIZE) / 2;
    const offsetY = (nextPieceCanvas.height - height * PREVIEW_BLOCK_SIZE) / 2;
    
    shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                drawBlock(
                    nextPieceCtx,
                    offsetX + x * PREVIEW_BLOCK_SIZE,
                    offsetY + y * PREVIEW_BLOCK_SIZE,
                    nextPiece.color,
                    PREVIEW_BLOCK_SIZE
                );
            }
        });
    });
}

function getRandomTetromino() {
    return JSON.parse(JSON.stringify(TETROMINOES[Math.floor(Math.random() * TETROMINOES.length)]));
}

function checkCollision(x, y, shape) {
    return shape.some((row, dy) => {
        return row.some((value, dx) => {
            if (!value) return false;
            
            const newX = x + dx;
            const newY = y + dy;
            
            return (
                newX < 0 ||
                newX >= COLUMNS ||
                newY >= ROWS ||
                (newY >= 0 && grid[newY][newX])
            );
        });
    });
}

function movePiece(dx, dy) {
    if (isPaused || isGameOver) return false;
    
    const newX = currentX + dx;
    const newY = currentY + dy;
    
    if (!checkCollision(newX, newY, currentPiece.shape)) {
        currentX = newX;
        currentY = newY;
        render();
        return true;
    }
    
    return false;
}

function rotatePiece() {
    if (isPaused || isGameOver) return;
    
    const oldShape = currentPiece.shape;
    const newShape = oldShape[0].map((_, i) => 
        oldShape.map(row => row[row.length - 1 - i])
    );
    
    // Wall kick - try different positions if rotation causes collision
    const wallKickTests = [
        { x: 0, y: 0 },   // Original position
        { x: 1, y: 0 },   // Move right
        { x: -1, y: 0 },  // Move left
        { x: 0, y: -1 },  // Move up
        { x: 2, y: 0 },   // Move right twice (for I piece)
        { x: -2, y: 0 }   // Move left twice (for I piece)
    ];
    
    currentPiece.shape = newShape;
    
    for (const test of wallKickTests) {
        const testX = currentX + test.x;
        const testY = currentY + test.y;
        
        if (!checkCollision(testX, testY, newShape)) {
            currentX = testX;
            currentY = testY;
            render();
            return;
        }
    }
    
    // If all wall kick tests fail, revert to the old shape
    currentPiece.shape = oldShape;
}

function hardDrop() {
    if (isPaused || isGameOver) return;
    
    while (movePiece(0, 1)) {
        // Move piece down until collision
        score += 1;
    }
    
    lockPiece();
    updateScore();
}

function lockPiece() {
    currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                if (currentY + y >= 0) {
                    grid[currentY + y][currentX + x] = currentPiece.color;
                }
            }
        });
    });
    
    clearLines();
    spawnPiece();
}

function clearLines() {
    let linesCleared = 0;
    
    for (let row = ROWS - 1; row >= 0; row--) {
        if (grid[row].every(cell => cell)) {
            // Create a flash effect for the cleared line
            createClearAnimation(row);
            
            // Remove the line
            grid.splice(row, 1);
            grid.unshift(Array(COLUMNS).fill(0));
            linesCleared++;
            row++; // Check the same row again since we moved everything down
        }
    }
    
    if (linesCleared > 0) {
        // Calculate score based on number of lines cleared
        const pointsPerLine = [0, 100, 300, 500, 800]; // 0, 1, 2, 3, 4 lines
        let linePoints = pointsPerLine[linesCleared] * level;
        
        score += linePoints;
        lines += linesCleared;
        
        // Update level every 10 lines
        level = Math.floor(lines / 10) + 1;
        
        // Speed up the game as level increases
        gameSpeed = Math.max(100, 500 - (level - 1) * 40);
        
        updateScore();
    }
}

function createClearAnimation(row) {
    // Flash effect - fill the row with white
    const originalColors = [...grid[row]];
    
    // Save and restore the context to isolate changes
    ctx.save();
    
    // Flash white
    for (let col = 0; col < COLUMNS; col++) {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(col * BLOCK_SIZE, row * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    }
    
    // Restore context
    ctx.restore();
}

function updateScore() {
    scoreDisplay.textContent = score;
    levelDisplay.textContent = level;
    linesDisplay.textContent = lines;
}

function spawnPiece() {
    if (nextPiece === null) {
        nextPiece = getRandomTetromino();
    }
    
    currentPiece = nextPiece;
    nextPiece = getRandomTetromino();
    
    currentX = Math.floor(COLUMNS / 2) - Math.floor(currentPiece.shape[0].length / 2);
    currentY = -currentPiece.shape.length;
    
    drawNextPiece();
    
    if (checkCollision(currentX, currentY, currentPiece.shape)) {
        gameOver();
    }
}

function gameOver() {
    isGameOver = true;
    clearInterval(gameTimer);
    finalScoreDisplay.textContent = score;
    gameOverOverlay.style.display = "flex";
}

function resetGame() {
    grid = Array.from({ length: ROWS }, () => Array(COLUMNS).fill(0));
    score = 0;
    level = 1;
    lines = 0;
    gameSpeed = 500;
    isGameOver = false;
    isPaused = false;
    gameOverOverlay.style.display = "none";
    pauseBtn.textContent = "Pause";
    
    updateScore();
    nextPiece = null;
    spawnPiece();
    
    clearInterval(gameTimer);
    gameTimer = setInterval(gameLoop, gameSpeed);
}

function togglePause() {
    isPaused = !isPaused;
    
    if (isPaused) {
        clearInterval(gameTimer);
        pauseBtn.textContent = "Resume";
    } else {
        gameTimer = setInterval(gameLoop, gameSpeed);
        pauseBtn.textContent = "Pause";
    }
}

function render() {
    drawGrid();
    drawGhostPiece();
    drawCurrentPiece();
}

function gameLoop() {
    if (!movePiece(0, 1)) {
        lockPiece();
    }
    render();
}

// Event listeners
document.addEventListener("keydown", e => {
    if (isGameOver) return;
    
    if (e.key === "ArrowLeft") {
        movePiece(-1, 0);
        e.preventDefault();
    } else if (e.key === "ArrowRight") {
        movePiece(1, 0);
        e.preventDefault();
    } else if (e.key === "ArrowDown") {
        if (movePiece(0, 1)) {
            score += 1;
            updateScore();
        }
        e.preventDefault();
    } else if (e.key === "ArrowUp") {
        rotatePiece();
        e.preventDefault();
    } else if (e.key === " ") {
        hardDrop();
        e.preventDefault();
    } else if (e.key === "p" || e.key === "P") {
        togglePause();
    }
});

pauseBtn.addEventListener("click", togglePause);
restartBtn.addEventListener("click", resetGame);
playAgainBtn.addEventListener("click", resetGame);

// Initialize game
resetGame();