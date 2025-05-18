// Game state
const board = document.getElementById("board");
const statusElement = document.getElementById("status");
const turnElement = document.getElementById("turn-color");
const moveHistoryElement = document.getElementById("move-history");
const whiteCapturedElement = document.getElementById("white-captured");
const blackCapturedElement = document.getElementById("black-captured");
const resetButton = document.getElementById("reset-btn");
const undoButton = document.getElementById("undo-btn");

const pieceSymbols = {
    "K": "♔", "Q": "♕", "R": "♖", "B": "♗", "N": "♘", "P": "♙",
    "k": "♚", "q": "♛", "r": "♜", "b": "♝", "n": "♞", "p": "♟"
};

const pieceNames = {
    "K": "King", "Q": "Queen", "R": "Rook", "B": "Bishop", "N": "Knight", "P": "Pawn",
    "k": "King", "q": "Queen", "r": "Rook", "b": "Bishop", "n": "Knight", "p": "Pawn"
};

const files = ["a", "b", "c", "d", "e", "f", "g", "h"];

let gameState = {
    board: [
        ["r", "n", "b", "q", "k", "b", "n", "r"],
        ["p", "p", "p", "p", "p", "p", "p", "p"],
        ["", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", ""],
        ["P", "P", "P", "P", "P", "P", "P", "P"],
        ["R", "N", "B", "Q", "K", "B", "N", "R"]
    ],
    turn: "white", // white or black
    selectedSquare: null,
    moveOptions: [],
    captureOptions: [],
    isCheck: false,
    isCheckmate: false,
    isStalemate: false,
    moveHistory: [],
    capturedPieces: {
        white: [],
        black: []
    },
    kingPositions: {
        white: { row: 7, col: 4 },
        black: { row: 0, col: 4 }
    },
    castlingRights: {
        white: { kingSide: true, queenSide: true },
        black: { kingSide: true, queenSide: true }
    },
    enPassantTarget: null,
    lastMove: { from: null, to: null },
    movesWithoutCapture: 0
};

// Create and render the initial board
function createBoard() {
    // Clear the board first
    board.innerHTML = "";

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement("div");
            square.classList.add("square");
            square.classList.add((row + col) % 2 === 0 ? "white" : "black");

            const piece = gameState.board[row][col];
            if (piece) {
                addPieceToSquare(square, piece);
            }

            square.dataset.row = row;
            square.dataset.col = col;
            square.addEventListener("click", onSquareClick);
            board.appendChild(square);
        }
    }

    updateUI();
}

// Add a piece to a square
function addPieceToSquare(square, pieceCode) {
    const piece = document.createElement("span");
    piece.classList.add("piece");
    piece.textContent = pieceSymbols[pieceCode];

    // Add appropriate color class
    if (pieceCode === pieceCode.toUpperCase()) {
        piece.classList.add("white-piece");
    } else {
        piece.classList.add("black-piece");
    }

    square.appendChild(piece);
}

// Handle square click events
function onSquareClick(event) {
    // If game is over, don't allow moves
    if (gameState.isCheckmate || gameState.isStalemate) return;

    const square = event.currentTarget; // Use currentTarget to ensure we get the square div
    const row = parseInt(square.dataset.row);
    const col = parseInt(square.dataset.col);

    // If a move option is clicked, make the move
    if (isSquareInMoveOptions(row, col)) {
        makeMove(row, col);
        return;
    }

    // Clear previous selection
    clearHighlights();

    // Check if the clicked square has a piece of the current player's color
    const piece = gameState.board[row][col];
    if (piece && isPieceOfCurrentTurn(piece)) {
        // Highlight the selected square
        square.classList.add("highlight");
        gameState.selectedSquare = { row, col, piece };

        // Show possible moves
        showMoveOptions(row, col, piece);
    }
}

// Check if a piece belongs to the current player
function isPieceOfCurrentTurn(piece) {
    return (gameState.turn === "white" && piece === piece.toUpperCase()) ||
        (gameState.turn === "black" && piece === piece.toLowerCase());
}

// Show possible moves for a selected piece
function showMoveOptions(row, col, piece) {
    const moves = getValidMoves(row, col, piece);
    gameState.moveOptions = moves.filter(move => !move.capture);
    gameState.captureOptions = moves.filter(move => move.capture);

    // Display move options
    gameState.moveOptions.forEach(move => {
        const square = getSquareElement(move.row, move.col);
        const moveOption = document.createElement("div");
        moveOption.classList.add("move-option");
        square.appendChild(moveOption);
    });

    // Display capture options
    gameState.captureOptions.forEach(move => {
        const square = getSquareElement(move.row, move.col);
        const captureOption = document.createElement("div");
        captureOption.classList.add("capture-option");
        square.appendChild(captureOption);
    });
}

// Get valid moves for a piece
function getValidMoves(row, col, piece) {
    let moves = [];
    const pieceType = piece.toUpperCase();

    switch (pieceType) {
        case 'P':
            moves = getPawnMoves(row, col, piece);
            break;
        case 'R':
            moves = getRookMoves(row, col, piece);
            break;
        case 'N':
            moves = getKnightMoves(row, col, piece);
            break;
        case 'B':
            moves = getBishopMoves(row, col, piece);
            break;
        case 'Q':
            moves = getQueenMoves(row, col, piece);
            break;
        case 'K':
            moves = getKingMoves(row, col, piece);
            break;
    }

    // Filter out moves that would put the king in check
    return moves.filter(move => !wouldBeInCheckAfterMove(row, col, move.row, move.col, piece));
}

// Check if a move would leave the king in check
function wouldBeInCheckAfterMove(fromRow, fromCol, toRow, toCol, piece) {
    // Create a copy of the board to simulate the move
    const tempBoard = gameState.board.map(row => [...row]);
    const isWhite = piece === piece.toUpperCase();

    // Update king position if moving the king
    let kingPos = { ...gameState.kingPositions[isWhite ? "white" : "black"] };
    if (piece.toUpperCase() === 'K') {
        kingPos = { row: toRow, col: toCol };
    }

    // Simulate the move
    tempBoard[toRow][toCol] = tempBoard[fromRow][fromCol];
    tempBoard[fromRow][fromCol] = "";

    // Check if the king would be in check after this move
    return isPositionAttacked(kingPos.row, kingPos.col, !isWhite, tempBoard);
}

// Check if a position is under attack
function isPositionAttacked(row, col, byWhite, boardState = gameState.board) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const attackerPiece = boardState[r][c];
            if (!attackerPiece) continue;

            const isAttackerWhite = attackerPiece === attackerPiece.toUpperCase();
            if (isAttackerWhite !== byWhite) continue;

            // Check if this piece can attack the position
            const attackMoves = getAttackMoves(r, c, attackerPiece, boardState);
            if (attackMoves.some(move => move.row === row && move.col === col)) {
                return true;
            }
        }
    }
    return false;
}

// Get all possible attack moves for a piece (ignoring check conditions)
function getAttackMoves(row, col, piece, boardState = gameState.board) {
    const pieceType = piece.toUpperCase();

    switch (pieceType) {
        case 'P':
            return getPawnAttacks(row, col, piece, boardState);
        case 'R':
            return getRookAttacks(row, col, piece, boardState);
        case 'N':
            return getKnightAttacks(row, col, piece, boardState);
        case 'B':
            return getBishopAttacks(row, col, piece, boardState);
        case 'Q':
            return [
                ...getRookAttacks(row, col, piece, boardState),
                ...getBishopAttacks(row, col, piece, boardState)
            ];
        case 'K':
            return getKingAttacks(row, col, piece, boardState);
    }
    return [];
}

// Get pawn moves
function getPawnMoves(row, col, piece) {
    const moves = [];
    const isWhite = piece === piece.toUpperCase();
    const direction = isWhite ? -1 : 1;
    const startingRow = isWhite ? 6 : 1;

    // Forward move
    if (isInBounds(row + direction, col) && !gameState.board[row + direction][col]) {
        moves.push({ row: row + direction, col: col, capture: false });

        // Double forward move from starting position
        if (row === startingRow && !gameState.board[row + 2 * direction][col]) {
            moves.push({ row: row + 2 * direction, col: col, capture: false });
        }
    }

    // Captures (diagonally)
    for (const colOffset of [-1, 1]) {
        const newCol = col + colOffset;
        const newRow = row + direction;

        if (isInBounds(newRow, newCol)) {
            const targetPiece = gameState.board[newRow][newCol];

            // Regular capture
            if (targetPiece && isPieceOpponent(piece, targetPiece)) {
                moves.push({ row: newRow, col: newCol, capture: true });
            }

            // En passant capture
            if (gameState.enPassantTarget &&
                newRow === gameState.enPassantTarget.row &&
                newCol === gameState.enPassantTarget.col) {
                moves.push({
                    row: newRow,
                    col: newCol,
                    capture: true,
                    enPassant: true
                });
            }
        }
    }

    return moves;
}

// Get pawn attack squares (used for check detection)
function getPawnAttacks(row, col, piece, boardState) {
    const attacks = [];
    const isWhite = piece === piece.toUpperCase();
    const direction = isWhite ? -1 : 1;

    // Diagonal attack squares
    for (const colOffset of [-1, 1]) {
        const newCol = col + colOffset;
        const newRow = row + direction;

        if (isInBounds(newRow, newCol)) {
            attacks.push({ row: newRow, col: newCol });
        }
    }

    return attacks;
}

// Get rook moves
function getRookMoves(row, col, piece) {
    return getRookAttacks(row, col, piece);
}

// Get rook attack squares
function getRookAttacks(row, col, piece, boardState = gameState.board) {
    const moves = [];
    const directions = [
        [-1, 0], // up
        [1, 0],  // down
        [0, -1], // left
        [0, 1]   // right
    ];

    for (const [rowDir, colDir] of directions) {
        let newRow = row + rowDir;
        let newCol = col + colDir;

        while (isInBounds(newRow, newCol)) {
            const targetPiece = boardState[newRow][newCol];

            if (!targetPiece) {
                // Empty square
                moves.push({ row: newRow, col: newCol, capture: false });
            } else {
                // Square with a piece
                if (isPieceOpponent(piece, targetPiece)) {
                    moves.push({ row: newRow, col: newCol, capture: true });
                }
                break; // Stop in this direction after hitting a piece
            }

            newRow += rowDir;
            newCol += colDir;
        }
    }

    return moves;
}

// Get knight moves
function getKnightMoves(row, col, piece) {
    return getKnightAttacks(row, col, piece);
}

// Get knight attack squares
function getKnightAttacks(row, col, piece, boardState = gameState.board) {
    const moves = [];
    const jumps = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
    ];

    for (const [rowOffset, colOffset] of jumps) {
        const newRow = row + rowOffset;
        const newCol = col + colOffset;

        if (isInBounds(newRow, newCol)) {
            const targetPiece = boardState[newRow][newCol];

            if (!targetPiece) {
                // Empty square
                moves.push({ row: newRow, col: newCol, capture: false });
            } else if (isPieceOpponent(piece, targetPiece)) {
                // Opponent's piece
                moves.push({ row: newRow, col: newCol, capture: true });
            }
        }
    }

    return moves;
}

// Get bishop moves
function getBishopMoves(row, col, piece) {
    return getBishopAttacks(row, col, piece);
}

// Get bishop attack squares
function getBishopAttacks(row, col, piece, boardState = gameState.board) {
    const moves = [];
    const directions = [
        [-1, -1], // up-left
        [-1, 1],  // up-right
        [1, -1],  // down-left
        [1, 1]    // down-right
    ];

    for (const [rowDir, colDir] of directions) {
        let newRow = row + rowDir;
        let newCol = col + colDir;

        while (isInBounds(newRow, newCol)) {
            const targetPiece = boardState[newRow][newCol];

            if (!targetPiece) {
                // Empty square
                moves.push({ row: newRow, col: newCol, capture: false });
            } else {
                // Square with a piece
                if (isPieceOpponent(piece, targetPiece)) {
                    moves.push({ row: newRow, col: newCol, capture: true });
                }
                break; // Stop in this direction after hitting a piece
            }

            newRow += rowDir;
            newCol += colDir;
        }
    }

    return moves;
}

// Get queen moves
function getQueenMoves(row, col, piece) {
    return [
        ...getRookMoves(row, col, piece),
        ...getBishopMoves(row, col, piece)
    ];
}

// Get king moves
function getKingMoves(row, col, piece) {
    const moves = getKingAttacks(row, col, piece);

    // Add castling moves
    const isWhite = piece === piece.toUpperCase();

    // Castling
    if ((isWhite && gameState.castlingRights.white.kingSide) ||
        (!isWhite && gameState.castlingRights.black.kingSide)) {
        // Check if path is clear for kingside castling
        if (!gameState.board[row][col + 1] && !gameState.board[row][col + 2]) {
            // Check if king's path is not under attack
            if (!isPositionAttacked(row, col, !isWhite) &&
                !isPositionAttacked(row, col + 1, !isWhite) &&
                !isPositionAttacked(row, col + 2, !isWhite)) {
                moves.push({
                    row: row,
                    col: col + 2,
                    capture: false,
                    castling: 'kingside'
                });
            }
        }
    }

    if ((isWhite && gameState.castlingRights.white.queenSide) ||
        (!isWhite && gameState.castlingRights.black.queenSide)) {
        // Check if path is clear for queenside castling
        if (!gameState.board[row][col - 1] && !gameState.board[row][col - 2] && !gameState.board[row][col - 3]) {
            // Check if king's path is not under attack
            if (!isPositionAttacked(row, col, !isWhite) &&
                !isPositionAttacked(row, col - 1, !isWhite) &&
                !isPositionAttacked(row, col - 2, !isWhite)) {
                moves.push({
                    row: row,
                    col: col - 2,
                    capture: false,
                    castling: 'queenside'
                });
            }
        }
    }

    return moves;
}

// Get king attack squares
function getKingAttacks(row, col, piece, boardState = gameState.board) {
    const moves = [];
    const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1], [0, 1],
        [1, -1], [1, 0], [1, 1]
    ];

    for (const [rowOffset, colOffset] of directions) {
        const newRow = row + rowOffset;
        const newCol = col + colOffset;

        if (isInBounds(newRow, newCol)) {
            const targetPiece = boardState[newRow][newCol];

            if (!targetPiece) {
                // Empty square
                moves.push({ row: newRow, col: newCol, capture: false });
            } else if (isPieceOpponent(piece, targetPiece)) {
                // Opponent's piece
                moves.push({ row: newRow, col: newCol, capture: true });
            }
        }
    }

    return moves;
}

// Execute a move
function makeMove(toRow, toCol) {
    if (!gameState.selectedSquare) return;

    const { row: fromRow, col: fromCol, piece } = gameState.selectedSquare;
    const moveDetails = {};

    // Get move details (if capture, castling, etc.)
    const moveOption = [...gameState.moveOptions, ...gameState.captureOptions].find(
        move => move.row === toRow && move.col === toCol
    );

    if (!moveOption) return;

    // Store move details for notation
    moveDetails.piece = piece;
    moveDetails.from = { row: fromRow, col: fromCol };
    moveDetails.to = { row: toRow, col: toCol };

    // Handle piece capture
    const targetPiece = gameState.board[toRow][toCol];
    if (targetPiece) {
        moveDetails.capturedPiece = targetPiece;

        // Add to captured pieces
        const captureColor = piece === piece.toUpperCase() ? "black" : "white";
        gameState.capturedPieces[captureColor].push(targetPiece);
    }

    // Handle en passant capture
    if (moveOption.enPassant) {
        moveDetails.enPassant = true;
        const direction = piece === piece.toUpperCase() ? 1 : -1;
        const capturedPawnRow = toRow - direction;
        const capturedPawn = gameState.board[capturedPawnRow][toCol];

        // Remove the pawn being captured en passant
        gameState.board[capturedPawnRow][toCol] = "";

        // Add to captured pieces
        const captureColor = piece === piece.toUpperCase() ? "black" : "white";
        gameState.capturedPieces[captureColor].push(capturedPawn);
        moveDetails.capturedPiece = capturedPawn;
    }

    // Handle castling
    if (moveOption.castling) {
        moveDetails.castling = moveOption.castling;

        // Move the rook too
        if (moveOption.castling === 'kingside') {
            gameState.board[fromRow][fromCol + 1] = gameState.board[fromRow][fromCol + 3];
            gameState.board[fromRow][fromCol + 3] = "";
        } else {
            gameState.board[fromRow][fromCol - 1] = gameState.board[fromRow][fromCol - 4];
            gameState.board[fromRow][fromCol - 4] = "";
        }
    }

    // Update castling rights
    updateCastlingRights(fromRow, fromCol, piece);

    // Set en passant target for next move
    gameState.enPassantTarget = null;
    if (piece.toUpperCase() === 'P' && Math.abs(fromRow - toRow) === 2) {
        // Pawn moved two squares - set en passant target
        const direction = piece === piece.toUpperCase() ? -1 : 1;
        gameState.enPassantTarget = { row: fromRow + direction, col: fromCol };
    }

    // Handle pawn promotion
    if (piece.toUpperCase() === 'P' && (toRow === 0 || toRow === 7)) {
        moveDetails.promotion = true;

        // Promote to queen by default
        gameState.board[toRow][toCol] = piece === piece.toUpperCase() ? 'Q' : 'q';
    } else {
        // Regular move
        gameState.board[toRow][toCol] = piece;
    }

    // Clear the original position
    gameState.board[fromRow][fromCol] = "";

    // Track king position
    if (piece.toUpperCase() === 'K') {
        const color = piece === piece.toUpperCase() ? "white" : "black";
        gameState.kingPositions[color] = { row: toRow, col: toCol };
    }

    // Record the move for highlighting
    gameState.lastMove = { from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol } };

    // Reset counters for draw conditions
    if (piece.toUpperCase() === 'P' || targetPiece) {
        gameState.movesWithoutCapture = 0;
    } else {
        gameState.movesWithoutCapture++;
    }

    // Add move to history
    addMoveToHistory(moveDetails);

    // Change turn
    gameState.turn = gameState.turn === "white" ? "black" : "white";

    // Check for check, checkmate, stalemate
    checkGameStatus();

    // Clear selection and update board
    clearHighlights();
    gameState.selectedSquare = null;

    // Update the UI
    updateBoard();
    updateUI();
}

// Update castling rights when a king or rook moves
function updateCastlingRights(row, col, piece) {
    const pieceType = piece.toUpperCase();
    const isWhite = piece === piece.toUpperCase();

    if (pieceType === 'K') {
        // King moved, lose both castling rights
        if (isWhite) {
            gameState.castlingRights.white.kingSide = false;
            gameState.castlingRights.white.queenSide = false;
        } else {
            gameState.castlingRights.black.kingSide = false;
            gameState.castlingRights.black.queenSide = false;
        }
    } else if (pieceType === 'R') {
        // Rook moved, check which one
        if (isWhite) {
            if (row === 7 && col === 0) {
                gameState.castlingRights.white.queenSide = false;
            } else if (row === 7 && col === 7) {
                gameState.castlingRights.white.kingSide = false;
            }
        } else {
            if (row === 0 && col === 0) {
                gameState.castlingRights.black.queenSide = false;
            } else if (row === 0 && col === 7) {
                gameState.castlingRights.black.kingSide = false;
            }
        }
    }
}

// Check game status (check, checkmate, stalemate)
function checkGameStatus() {
    const currentColor = gameState.turn;
    const kingPos = gameState.kingPositions[currentColor];
    const isWhiteToMove = currentColor === "white";

    // Check if the king is in check
    gameState.isCheck = isPositionAttacked(
        kingPos.row,
        kingPos.col,
        !isWhiteToMove
    );

    // Check if there are any legal moves available
    const hasLegalMoves = checkForLegalMoves(isWhiteToMove);

    if (!hasLegalMoves) {
        if (gameState.isCheck) {
            gameState.isCheckmate = true;
        } else {
            gameState.isStalemate = true;
        }
    }
}

// Check if any legal moves are available for a player
function checkForLegalMoves(isWhite) {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = gameState.board[row][col];
            if (!piece) continue;

            const isPieceWhite = piece === piece.toUpperCase();
            if (isPieceWhite !== isWhite) continue;

            const validMoves = getValidMoves(row, col, piece);
            if (validMoves.length > 0) {
                return true;
            }
        }
    }
    return false;
}

// Add move to the history with proper chess notation
function addMoveToHistory(moveDetails) {
    const from = moveDetails.from;
    const to = moveDetails.to;
    const piece = moveDetails.piece;

    // Basic information for notation
    const pieceSymbol = piece.toUpperCase() === 'P' ? '' : piece.toUpperCase();
    const fromSquare = `${files[from.col]}${8 - from.row}`;
    const toSquare = `${files[to.col]}${8 - to.row}`;
    const isCapture = moveDetails.capturedPiece || moveDetails.enPassant;

    // Build notation
    let notation = '';

    // Special cases: castling
    if (moveDetails.castling) {
        notation = moveDetails.castling === 'kingside' ? 'O-O' : 'O-O-O';
    } else {
        notation = pieceSymbol;

        // Add from square for disambiguation if needed
        // (simplified - in a real implementation we'd check for ambiguity)
        if (piece.toUpperCase() !== 'P' && piece.toUpperCase() !== 'K') {
            notation += fromSquare;
        } else if (piece.toUpperCase() === 'P' && isCapture) {
            notation += files[from.col];
        }

        // Add capture symbol
        if (isCapture) {
            notation += 'x';
        }

        // Add destination square
        notation += toSquare;

        // Add promotion
        if (moveDetails.promotion) {
            notation += '=Q'; // Always queen in this implementation
        }
    }

    // Add check/checkmate
    if (gameState.isCheckmate) {
        notation += '#';
    } else if (gameState.isCheck) {
        notation += '+';
    }

    // Add to move history
    gameState.moveHistory.push({
        piece: piece,
        from: fromSquare,
        to: toSquare,
        notation: notation,
        isWhite: piece === piece.toUpperCase()
    });
}

// Helper to check if a coordinate is valid
function isInBounds(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
}

// Helper to check if a piece is an opponent's piece
function isPieceOpponent(piece1, piece2) {
    return (piece1 === piece1.toUpperCase()) !== (piece2 === piece2.toUpperCase());
}

// Check if a square is in the current move options
function isSquareInMoveOptions(row, col) {
    return [...gameState.moveOptions, ...gameState.captureOptions].some(
        move => move.row === row && move.col === col
    );
}

// Get a square element by coordinates
function getSquareElement(row, col) {
    return document.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
}

// Clear all highlights and selected squares
function clearHighlights() {
    // Remove highlight classes
    document.querySelectorAll('.square').forEach(square => {
        square.classList.remove('highlight');
    });

    // Remove move options
    document.querySelectorAll('.move-option, .capture-option').forEach(option => {
        option.remove();
    });

    // Clear move options arrays
    gameState.moveOptions = [];
    gameState.captureOptions = [];
}

// Update the visual board to match the game state
function updateBoard() {
    // Clear previous last move highlights
    document.querySelectorAll('.last-move').forEach(square => {
        square.classList.remove('last-move');
    });

    // Update all squares
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = getSquareElement(row, col);
            const piece = gameState.board[row][col];

            // Clear existing pieces
            square.innerHTML = '';

            // Add piece if present
            if (piece) {
                addPieceToSquare(square, piece);
            }

            // Highlight last move
            if (gameState.lastMove &&
                ((gameState.lastMove.from.row === row && gameState.lastMove.from.col === col) ||
                    (gameState.lastMove.to.row === row && gameState.lastMove.to.col === col))) {
                square.classList.add('last-move');
            }
        }
    }
}

// Update UI elements (status, turn indicator, captured pieces, etc.)
function updateUI() {
    // Update turn indicator
    turnElement.textContent = gameState.turn.charAt(0).toUpperCase() + gameState.turn.slice(1);

    // Update status
    if (gameState.isCheckmate) {
        const winner = gameState.turn === "white" ? "Black" : "White";
        statusElement.textContent = `Checkmate! ${winner} wins`;
        statusElement.style.backgroundColor = "#ffcccc";
    } else if (gameState.isStalemate) {
        statusElement.textContent = "Stalemate! The game is a draw";
        statusElement.style.backgroundColor = "#ffffcc";
    } else if (gameState.isCheck) {
        statusElement.textContent = `${gameState.turn.charAt(0).toUpperCase() + gameState.turn.slice(1)} is in check!`;
        statusElement.style.backgroundColor = "#ffdddd";
        statusElement.classList.add('check-indicator');
    } else {
        statusElement.textContent = "Game in progress";
        statusElement.style.backgroundColor = "#e9e9e9";
        statusElement.classList.remove('check-indicator');
    }

    // Update move history
    updateMoveHistory();

    // Update captured pieces
    updateCapturedPieces();
}

// Update move history display
function updateMoveHistory() {
    moveHistoryElement.innerHTML = "";

    for (let i = 0; i < gameState.moveHistory.length; i += 2) {
        const moveNumber = Math.floor(i / 2) + 1;
        const whiteMove = gameState.moveHistory[i];
        const blackMove = gameState.moveHistory[i + 1];

        const moveEntry = document.createElement("div");
        moveEntry.classList.add("move-entry");

        const moveNumberSpan = document.createElement("span");
        moveNumberSpan.classList.add("move-number");
        moveNumberSpan.textContent = `${moveNumber}.`;

        const whiteMoveSpan = document.createElement("span");
        whiteMoveSpan.textContent = whiteMove.notation;

        moveEntry.appendChild(moveNumberSpan);
        moveEntry.appendChild(whiteMoveSpan);

        if (blackMove) {
            const blackMoveSpan = document.createElement("span");
            blackMoveSpan.textContent = blackMove.notation;
            moveEntry.appendChild(blackMoveSpan);
        }

        moveHistoryElement.appendChild(moveEntry);
    }

    // Scroll to bottom
    moveHistoryElement.scrollTop = moveHistoryElement.scrollHeight;
}

// Update captured pieces display
function updateCapturedPieces() {
    whiteCapturedElement.innerHTML = "";
    blackCapturedElement.innerHTML = "";

    // Sort captured pieces by value
    const pieceValues = {
        'P': 1, 'p': 1, 'N': 3, 'n': 3, 'B': 3, 'b': 3,
        'R': 5, 'r': 5, 'Q': 9, 'q': 9
    };

    const sortedWhiteCaptured = [...gameState.capturedPieces.white].sort((a, b) =>
        pieceValues[b] - pieceValues[a]
    );

    const sortedBlackCaptured = [...gameState.capturedPieces.black].sort((a, b) =>
        pieceValues[b] - pieceValues[a]
    );

    // Add white captured pieces
    sortedWhiteCaptured.forEach(piece => {
        const pieceElement = document.createElement("span");
        pieceElement.classList.add("captured-piece");
        pieceElement.textContent = pieceSymbols[piece];
        whiteCapturedElement.appendChild(pieceElement);
    });

    // Add black captured pieces
    sortedBlackCaptured.forEach(piece => {
        const pieceElement = document.createElement("span");
        pieceElement.classList.add("captured-piece");
        pieceElement.textContent = pieceSymbols[piece];
        blackCapturedElement.appendChild(pieceElement);
    });
}

// Reset the game
function resetGame() {
    gameState = {
        board: [
            ["r", "n", "b", "q", "k", "b", "n", "r"],
            ["p", "p", "p", "p", "p", "p", "p", "p"],
            ["", "", "", "", "", "", "", ""],
            ["", "", "", "", "", "", "", ""],
            ["", "", "", "", "", "", "", ""],
            ["", "", "", "", "", "", "", ""],
            ["P", "P", "P", "P", "P", "P", "P", "P"],
            ["R", "N", "B", "Q", "K", "B", "N", "R"]
        ],
        turn: "white",
        selectedSquare: null,
        moveOptions: [],
        captureOptions: [],
        isCheck: false,
        isCheckmate: false,
        isStalemate: false,
        moveHistory: [],
        capturedPieces: {
            white: [],
            black: []
        },
        kingPositions: {
            white: { row: 7, col: 4 },
            black: { row: 0, col: 4 }
        },
        castlingRights: {
            white: { kingSide: true, queenSide: true },
            black: { kingSide: true, queenSide: true }
        },
        enPassantTarget: null,
        lastMove: { from: null, to: null },
        movesWithoutCapture: 0
    };

    createBoard();
}

function undoMove() {
    if (gameState.moveHistory.length === 0) return;

    const movesToReplay = gameState.moveHistory.slice(0, -1);
    resetGame();
}

// Initialize the game
function initGame() {
    createBoard();

    // Set up event listeners
    resetButton.addEventListener("click", resetGame);
    undoButton.addEventListener("click", undoMove);
}

// Start the game
initGame();