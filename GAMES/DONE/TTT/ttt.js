const board = document.getElementById('board');
const statusDisplay = document.getElementById('status');
const resetButton = document.getElementById('reset');
const resetScoreButton = document.getElementById('reset-score');
const currentTurnDisplay = document.getElementById('current-turn');
const difficultySelect = document.getElementById('difficulty-select');
const historyContainer = document.getElementById('history-container');

let currentPlayer = 'X';
let gameActive = true;
let boardState = Array(9).fill(null);
let playerScore = 0;
let computerScore = 0;
let draws = 0;
let gameHistory = [];
let moveHistory = [];
let winningCombination = null;
let difficulty = 'medium';

// Create the board
function createBoard() {
    board.innerHTML = '';
    boardState.forEach((cell, index) => {
        const cellElement = document.createElement('div');
        cellElement.classList.add('cell');
        cellElement.dataset.index = index;
        
        const cellContent = document.createElement('span');
        cellContent.classList.add('cell-content');
        cellElement.appendChild(cellContent);
        
        cellElement.addEventListener('click', handlePlayerClick);
        board.appendChild(cellElement);
    });
}

// Handle player's move
function handlePlayerClick(event) {
    const cell = event.target.closest('.cell');
    if (!cell) return;
    
    const cellIndex = cell.dataset.index;
    if (boardState[cellIndex] || !gameActive) return;
    
    makeMove(cellIndex, 'X');
    moveHistory.push({ player: 'X', position: cellIndex });
    
    if (checkWinner()) {
        updateGameHistory('You won!', 'win');
        return;
    }
    if (boardState.every(cell => cell)) {
        updateGameHistory('Game ended in a draw!', 'draw');
        return;
    }
    
    // Update turn indicator
    currentTurnDisplay.textContent = 'Computer (O)';
    currentTurnDisplay.className = 'turn-o';
    
    setTimeout(computerMove, 700); // Delay for computer's move
}

// Make a move
function makeMove(index, player) {
    boardState[index] = player;
    const cell = document.querySelector(`.cell[data-index="${index}"]`);
    cell.classList.add('taken');
    cell.classList.add(player.toLowerCase());
    
    const cellContent = cell.querySelector('.cell-content');
    cellContent.textContent = player;
    
    // Add highlight effect
    cell.classList.add('highlight');
    setTimeout(() => cell.classList.remove('highlight'), 1000);
    
    if (checkWinner()) {
        winningCombination.forEach(index => {
            const winCell = document.querySelector(`.cell[data-index="${index}"]`);
            winCell.classList.add('winning');
        });
        
        statusDisplay.textContent = `${player === 'X' ? 'You' : 'Computer'} won!`;
        statusDisplay.style.color = player === 'X' ? 'var(--x-color)' : 'var(--o-color)';
        gameActive = false;
        
        // Update score
        if (player === 'X') {
            playerScore++;
            document.getElementById('player-score').textContent = playerScore;
        } else {
            computerScore++;
            document.getElementById('computer-score').textContent = computerScore;
        }
    } else if (boardState.every(cell => cell)) {
        statusDisplay.textContent = 'Game ended in a draw!';
        statusDisplay.style.color = 'var(--text-color)';
        gameActive = false;
        draws++;
        document.getElementById('draws').textContent = draws;
    }
}

// Computer's move based on difficulty
function computerMove() {
    if (!gameActive) return;
    
    let moveIndex;
    
    switch (difficulty) {
        case 'easy':
            moveIndex = getRandomMove();
            break;
        case 'medium':
            // 50% chance of making a smart move
            moveIndex = Math.random() > 0.5 ? getBestMove(2) : getRandomMove();
            break;
        case 'hard':
            // 80% chance of making a smart move
            moveIndex = Math.random() > 0.2 ? getBestMove(3) : getRandomMove();
            break;
        case 'impossible':
            moveIndex = getBestMove(5);
            break;
        default:
            moveIndex = getRandomMove();
    }
    
    makeMove(moveIndex, 'O');
    moveHistory.push({ player: 'O', position: moveIndex });
    
    // Update turn indicator
    currentTurnDisplay.textContent = 'You (X)';
    currentTurnDisplay.className = 'turn-x';
    
    // Check if computer wins or draws
    if (checkWinner()) {
        updateGameHistory('Computer won!', 'loss');
    } else if (boardState.every(cell => cell)) {
        updateGameHistory('Game ended in a draw!', 'draw');
    }
}

// Get a random valid move
function getRandomMove() {
    let emptyCells = boardState.map((cell, index) => cell === null ? index : null).filter(index => index !== null);
    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
}

// Use minimax algorithm to determine best move
function getBestMove(depth) {
    // Check if we can win in the next move
    for (let i = 0; i < 9; i++) {
        if (boardState[i] === null) {
            boardState[i] = 'O';
            if (checkWinningCondition()) {
                boardState[i] = null;
                return i;
            }
            boardState[i] = null;
        }
    }
    
    // Check if player can win in the next move and block it
    for (let i = 0; i < 9; i++) {
        if (boardState[i] === null) {
            boardState[i] = 'X';
            if (checkWinningCondition()) {
                boardState[i] = null;
                return i;
            }
            boardState[i] = null;
        }
    }
    
    // Try to take the center if it's free
    if (boardState[4] === null) {
        return 4;
    }
    
    // If depth > 2, use more advanced strategy
    if (depth > 2) {
        // Try to take corners
        const corners = [0, 2, 6, 8];
        const emptyCorners = corners.filter(corner => boardState[corner] === null);
        if (emptyCorners.length > 0) {
            return emptyCorners[Math.floor(Math.random() * emptyCorners.length)];
        }
        
        // Try to take edges if no corners are available
        const edges = [1, 3, 5, 7];
        const emptyEdges = edges.filter(edge => boardState[edge] === null);
        if (emptyEdges.length > 0) {
            return emptyEdges[Math.floor(Math.random() * emptyEdges.length)];
        }
    }
    
    // If no strategic move is found, make a random move
    return getRandomMove();
}

// Check for a winner
function checkWinner() {
    const winningCombinations = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6],
    ];
    
    for (let i = 0; i < winningCombinations.length; i++) {
        const [a, b, c] = winningCombinations[i];
        if (boardState[a] && boardState[a] === boardState[b] && boardState[a] === boardState[c]) {
            winningCombination = [a, b, c];
            return true;
        }
    }
    return false;
}

// Check winning condition without side effects
function checkWinningCondition() {
    const winningCombinations = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6],
    ];
    
    for (let i = 0; i < winningCombinations.length; i++) {
        const [a, b, c] = winningCombinations[i];
        if (boardState[a] && boardState[a] === boardState[b] && boardState[a] === boardState[c]) {
            return true;
        }
    }
    return false;
}

// Update game history
function updateGameHistory(result, outcome) {
    const historyEntry = {
        result: result,
        moves: [...moveHistory],
        date: new Date(),
        outcome: outcome // win, loss, or draw
    };
    
    gameHistory.push(historyEntry);
    displayGameHistory();
    moveHistory = [];
}

// Display game history
function displayGameHistory() {
    historyContainer.innerHTML = '';
    
    gameHistory.slice().reverse().forEach((entry, index) => {
        const historyEntry = document.createElement('div');
        historyEntry.classList.add('history-entry');
        
        // Add appropriate class based on game outcome
        if (entry.outcome) {
            historyEntry.classList.add(`history-${entry.outcome}`);
        }
        
        const gameNumber = gameHistory.length - index;
        const time = entry.date.toLocaleTimeString();
        historyEntry.textContent = `Game ${gameNumber} (${time}): ${entry.result}`;
        
        historyContainer.appendChild(historyEntry);
    });
}

// Reset the game
function resetGame() {
    boardState = Array(9).fill(null);
    currentPlayer = 'X';
    gameActive = true;
    winningCombination = null;
    moveHistory = [];
    
    statusDisplay.textContent = '';
    currentTurnDisplay.textContent = 'You (X)';
    currentTurnDisplay.className = 'turn-x';
    
    createBoard();
}

// Reset scores
function resetScores() {
    playerScore = 0;
    computerScore = 0;
    draws = 0;
    gameHistory = [];
    
    document.getElementById('player-score').textContent = '0';
    document.getElementById('computer-score').textContent = '0';
    document.getElementById('draws').textContent = '0';
    
    historyContainer.innerHTML = '';
    resetGame();
}

// Event listeners
resetButton.addEventListener('click', resetGame);
resetScoreButton.addEventListener('click', resetScores);
difficultySelect.addEventListener('change', (e) => {
    difficulty = e.target.value;
});

// Initialize the game
createBoard();