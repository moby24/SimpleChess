const boardElement = document.getElementById("board");
const statusElement = document.getElementById("status");
const turnIndicatorElement = document.getElementById("turn-indicator");
const moveListElement = document.getElementById("move-list");
const resetButton = document.getElementById("reset-button");
const clearSelectionButton = document.getElementById("clear-selection-button");
const promotionModal = document.getElementById("promotion-modal");
const promotionOptionsElement = document.getElementById("promotion-options");
const topFilesElement = document.getElementById("file-labels-top");
const bottomFilesElement = document.getElementById("file-labels-bottom");
const leftRanksElement = document.getElementById("rank-labels-left");
const rightRanksElement = document.getElementById("rank-labels-right");

const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"];

const pieceImages = {
  wp: "./assets/pieces/wp.svg",
  wr: "./assets/pieces/wr.svg",
  wn: "./assets/pieces/wn.svg",
  wb: "./assets/pieces/wb.svg",
  wq: "./assets/pieces/wq.svg",
  wk: "./assets/pieces/wk.svg",
  bp: "./assets/pieces/bp.svg",
  br: "./assets/pieces/br.svg",
  bn: "./assets/pieces/bn.svg",
  bb: "./assets/pieces/bb.svg",
  bq: "./assets/pieces/bq.svg",
  bk: "./assets/pieces/bk.svg",
};

let game = null;

let selectedSquare = null;
let legalMoves = [];
let pendingPromotion = null;

function buildLabels() {
  files.forEach((file) => {
    const topLabel = document.createElement("span");
    topLabel.textContent = file;
    topFilesElement.appendChild(topLabel);

    const bottomLabel = document.createElement("span");
    bottomLabel.textContent = file;
    bottomFilesElement.appendChild(bottomLabel);
  });

  ranks.forEach((rank) => {
    const leftLabel = document.createElement("span");
    leftLabel.textContent = rank;
    leftRanksElement.appendChild(leftLabel);

    const rightLabel = document.createElement("span");
    rightLabel.textContent = rank;
    rightRanksElement.appendChild(rightLabel);
  });
}

function createBoardSquares() {
  ranks.forEach((rank, rankIndex) => {
    files.forEach((file, fileIndex) => {
      const square = document.createElement("button");
      const squareName = `${file}${rank}`;
      const isLightSquare = (rankIndex + fileIndex) % 2 === 0;

      square.type = "button";
      square.className = `square ${isLightSquare ? "light" : "dark"}`;
      square.dataset.square = squareName;
      square.setAttribute("role", "gridcell");
      square.setAttribute("aria-label", `Square ${squareName}`);
      square.addEventListener("click", () => handleSquareClick(squareName));

      boardElement.appendChild(square);
    });
  });
}

function handleSquareClick(square) {
  if (!game || pendingPromotion || game.isGameOver()) {
    return;
  }

  const piece = game.get(square);
  const currentTurn = game.turn();

  if (selectedSquare && legalMoves.some((move) => move.to === square)) {
    const targetMove = legalMoves.find((move) => move.to === square);
    if (targetMove && targetMove.flags.includes("p")) {
      openPromotionChooser(selectedSquare, square);
      return;
    }

    makeMove(selectedSquare, square);
    return;
  }

  if (piece && piece.color === currentTurn) {
    selectedSquare = square;
    legalMoves = game.moves({ square, verbose: true });
    renderBoard();
    return;
  }

  clearSelection();
}

function makeMove(from, to, promotion = undefined) {
  if (!game) {
    return false;
  }

  const move = game.move({ from, to, promotion });
  if (!move) {
    return false;
  }

  clearSelection();
  pendingPromotion = null;
  closePromotionChooser();
  render();
  return true;
}

function openPromotionChooser(from, to) {
  pendingPromotion = { from, to, color: game.turn() };
  promotionOptionsElement.innerHTML = "";

  ["q", "r", "b", "n"].forEach((pieceType) => {
    const optionButton = document.createElement("button");
    const key = `${pendingPromotion.color}${pieceType}`;

    optionButton.type = "button";
    optionButton.className = "promotion-button";
    optionButton.innerHTML = `
      <img class="promotion-image" src="${pieceImages[key]}" alt="${pendingPromotion.color === "w" ? "White" : "Black"} ${pieceName(pieceType)}">
      <span>${pieceName(pieceType)}</span>
    `;
    optionButton.addEventListener("click", () => {
      makeMove(from, to, pieceType);
    });

    promotionOptionsElement.appendChild(optionButton);
  });

  promotionModal.classList.remove("hidden");
}

function closePromotionChooser() {
  promotionModal.classList.add("hidden");
}

function clearSelection() {
  selectedSquare = null;
  legalMoves = [];
  renderBoard();
}

function pieceName(pieceType) {
  const names = {
    p: "Pawn",
    q: "Queen",
    r: "Rook",
    b: "Bishop",
    n: "Knight",
    k: "King",
  };
  return names[pieceType];
}

function renderBoard() {
  if (!game) {
    return;
  }

  document.querySelectorAll(".square").forEach((squareElement) => {
    const squareName = squareElement.dataset.square;
    const piece = game.get(squareName);
    const legalMove = legalMoves.find((move) => move.to === squareName);

    squareElement.classList.toggle("selected", squareName === selectedSquare);
    squareElement.classList.toggle("legal", Boolean(legalMove && !legalMove.captured));
    squareElement.classList.toggle("capture", Boolean(legalMove && legalMove.captured));

    if (!piece) {
      squareElement.innerHTML = "";
      squareElement.classList.remove("piece-light", "piece-dark");
      return;
    }

    const pieceCode = `${piece.color}${piece.type}`;
    squareElement.innerHTML = `<img class="piece-image" src="${pieceImages[pieceCode]}" alt="${piece.color === "w" ? "White" : "Black"} ${pieceName(piece.type)}">`;
    squareElement.classList.toggle("piece-light", piece.color === "w");
    squareElement.classList.toggle("piece-dark", piece.color === "b");
  });
}

function renderMoveList() {
  if (!game) {
    moveListElement.innerHTML = "";
    return;
  }

  const history = game.history();
  moveListElement.innerHTML = "";

  for (let i = 0; i < history.length; i += 2) {
    const listItem = document.createElement("li");
    const whiteMove = history[i];
    const blackMove = history[i + 1];
    listItem.textContent = blackMove ? `${whiteMove}  ${blackMove}` : whiteMove;
    moveListElement.appendChild(listItem);
  }
}

function statusMessage() {
  if (!game) {
    return "Unable to load chess rules. Check your internet connection and reload.";
  }

  if (game.isCheckmate()) {
    return `${game.turn() === "w" ? "Black" : "White"} wins by checkmate.`;
  }

  if (game.isStalemate()) {
    return "Draw by stalemate.";
  }

  if (game.isThreefoldRepetition()) {
    return "Draw by threefold repetition.";
  }

  if (game.isInsufficientMaterial()) {
    return "Draw by insufficient material.";
  }

  if (game.isDraw()) {
    return "Draw.";
  }

  if (game.isCheck()) {
    return `${game.turn() === "w" ? "White" : "Black"} is in check.`;
  }

  return `${game.turn() === "w" ? "White" : "Black"} to move.`;
}

function renderStatus() {
  if (!game) {
    statusElement.textContent = statusMessage();
    turnIndicatorElement.textContent = "Rules unavailable";
    return;
  }

  statusElement.textContent = statusMessage();
  turnIndicatorElement.textContent = game.turn() === "w" ? "White to move" : "Black to move";
}

function resetGame() {
  if (!game) {
    return;
  }

  game.reset();
  pendingPromotion = null;
  closePromotionChooser();
  clearSelection();
  render();
}

function render() {
  renderBoard();
  renderMoveList();
  renderStatus();
}

resetButton.addEventListener("click", resetGame);
clearSelectionButton.addEventListener("click", clearSelection);
promotionModal.addEventListener("click", (event) => {
  if (event.target === promotionModal) {
    closePromotionChooser();
    pendingPromotion = null;
  }
});

async function init() {
  try {
    const chessModule = await import("./vendor-chess.js");
    game = new chessModule.Chess();
    render();
  } catch (error) {
    console.error("Chess.js failed to load.", error);
    renderStatus();
  }
}

buildLabels();
createBoardSquares();
init();
