const rows = 10;
const cols = 10;
const mineCount = 15;
const game = document.getElementById("game");

let board = [];

function initBoard() {
  board = [];
  game.innerHTML = "";
  game.style.gridTemplateColumns = `repeat(${cols}, 30px)`;

  // Initialisiere Board mit leeren Zellen
  for (let i = 0; i < rows; i++) {
    board[i] = [];
    for (let j = 0; j < cols; j++) {
      const cell = document.createElement("div");
      cell.classList.add("cell");
      cell.dataset.row = i;
      cell.dataset.col = j;
      cell.addEventListener("click", revealCell);
      game.appendChild(cell);
      board[i][j] = {
        mine: false,
        revealed: false,
        element: cell,
        neighborMines: 0
      };
    }
  }

  // Platziere zufaellig Minen
  let minesPlaced = 0;
  while (minesPlaced < mineCount) {
    let r = Math.floor(Math.random() * rows);
    let c = Math.floor(Math.random() * cols);
    if (!board[r][c].mine) {
      board[r][c].mine = true;
      minesPlaced++;
    }
  }

  // Zähle benachbarte Minen
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (!board[i][j].mine) {
        let count = 0;
        for (let x = -1; x <= 1; x++) {
          for (let y = -1; y <= 1; y++) {
            const ni = i + x;
            const nj = j + y;
            if (ni >= 0 && ni < rows && nj >= 0 && nj < cols && board[ni][nj].mine) {
              count++;
            }
          }
        }
        board[i][j].neighborMines = count;
      }
    }
  }
}

function revealCell(e) {
  const cell = e.target;
  const row = parseInt(cell.dataset.row);
  const col = parseInt(cell.dataset.col);
  const tile = board[row][col];

  if (tile.revealed) return;
  tile.revealed = true;
  tile.element.classList.add("revealed");

  if (tile.mine) {
    tile.element.classList.add("bomb");
    tile.element.textContent = "💣";
    alert("Game Over!");
    revealAll();
    return;
  }

  if (tile.neighborMines > 0) {
    tile.element.textContent = tile.neighborMines;
  } else {
    // Rekursiv leere Felder aufdecken
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        const ni = row + x;
        const nj = col + y;
        if (ni >= 0 && ni < rows && nj >= 0 && nj < cols) {
          revealCell({ target: board[ni][nj].element });
        }
      }
    }
  }
}

function revealAll() {
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const tile = board[i][j];
      if (tile.mine) {
        tile.element.classList.add("bomb");
        tile.element.textContent = "💣";
      } else if (tile.neighborMines > 0) {
        tile.element.textContent = tile.neighborMines;
      }
      tile.element.classList.add("revealed");
    }
  }
}

initBoard();