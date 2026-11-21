
const SIZE = 10;

const COLORS = [
  '#45c9e5',
  '#4c8df5',
  '#f06bb5',
  '#f4a340',
  '#9c83f5',
  '#4ed1a0'
];

const SHAPES = [
  [[1]],
  [[1,1]],
  [[1,1,1]],
  [[1,1,1,1]],
  [[1,1,1,1,1]],
  [[1],[1]],
  [[1],[1],[1]],
  [[1],[1],[1],[1]],
  [[1,1],[1,1]],
  [[1,1,1],[1,1,1]],
  [[1,0],[1,1]],
  [[0,1],[1,1]],
  [[1,0,0],[1,1,1]],
  [[0,0,1],[1,1,1]],
  [[1,1,0],[0,1,1]],
  [[0,1,1],[1,1,0]],
  [[1,1,1],[0,1,0]],
  [[0,1,0],[1,1,1]],
  [[1,1,1],[1,0,0]],
  [[1,1,1],[0,0,1]]
];

let grid;
let score;
let best;
let level;
let pieces;
let selected = -1;
let paused = false;
let gameOver = false;
let soundOn = true;

const $ = id => document.getElementById(id);

const boardEl = $('board');
const trayEl = $('tray');

best = Number(localStorage.getItem('blockCrushBest') || 0);

// Create an empty board
function freshGrid() {
  return Array.from(
    { length: SIZE },
    () => Array(SIZE).fill(null)
  );
}

// Generate a random block
function randomPiece() {
  const shape = SHAPES[
    Math.floor(Math.random() * SHAPES.length)
  ];

  return {
    shape: shape.map(row => row.slice()),
    color: COLORS[
      Math.floor(Math.random() * COLORS.length)
    ]
  };
}

// Start a new game
function newGame() {
  grid = freshGrid();
  score = 0;
  level = 1;

  pieces = [
    randomPiece(),
    randomPiece(),
    randomPiece()
  ];

  selected = -1;
  paused = false;
  gameOver = false;

  hideOverlay();
  render();

  setHint('Choose a block below, then tap the board to place it.');
}

// Display the game
function render() {
  $('score').textContent = score;
  $('best').textContent = best;
  $('level').textContent = level;

  boardEl.innerHTML = '';

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {

      const cell = document.createElement('div');

      cell.className = 'cell';
      cell.dataset.r = r;
      cell.dataset.c = c;

      if (grid[r][c]) {
        cell.classList.add('filled');

        cell.style.setProperty(
          '--tile',
          grid[r][c]
        );
      }

      cell.addEventListener('click', () => {
        placeAt(r, c);
      });

      boardEl.appendChild(cell);
    }
  }

  // Display available blocks
  trayEl.innerHTML = '';

  pieces.forEach((piece, i) => {

    const slot = document.createElement('div');

    slot.className =
      'piece-slot' +
      (i === selected ? ' selected' : '') +
      (!piece ? ' used' : '');

    if (piece) {

      const sh = document.createElement('div');

      sh.className = 'shape';

      sh.style.gridTemplateColumns =
        `repeat(${piece.shape[0].length},17px)`;

      piece.shape.forEach(row => {

        row.forEach(v => {

          const d = document.createElement('div');

          d.className =
            'mini-cell' + (!v ? ' empty' : '');

          if (v) {
            d.style.setProperty(
              '--tile',
              piece.color
            );
          }

          sh.appendChild(d);
        });
      });

      slot.appendChild(sh);

      slot.addEventListener('click', () => {

        selected = selected === i ? -1 : i;

        render();

        setHint(
          selected < 0
            ? 'Choose a block below.'
            : 'Tap an open area on the board to place your block.'
        );
      });
    }

    trayEl.appendChild(slot);
  });

  $('piecesLeft').textContent =
    `${pieces.filter(p => p).length} AVAILABLE`;
}

// Check whether a block can fit
function canPlace(shape, r, c) {

  for (let y = 0; y < shape.length; y++) {

    for (let x = 0; x < shape[y].length; x++) {

      if (
        shape[y][x] &&
        (
          r + y >= SIZE ||
          c + x >= SIZE ||
          grid[r + y][c + x]
        )
      ) {
        return false;
      }
    }
  }

  return true;
}

// Place a block on the board
function placeAt(r, c) {

  if (
    paused ||
    gameOver ||
    selected < 0 ||
    !pieces[selected]
  ) {
    return;
  }

  const p = pieces[selected];

  if (!canPlace(p.shape, r, c)) {

    setHint('That block does not fit there. Try another space.');

    return;
  }

  let placed = 0;

  p.shape.forEach((row, y) => {

    row.forEach((v, x) => {

      if (v) {

        grid[r + y][c + x] = p.color;

        placed++;
      }
    });
  });

  score += placed;

  pieces[selected] = null;
  selected = -1;

  // Find completed rows and columns
  let rows = [];
  let cols = [];

  for (let y = 0; y < SIZE; y++) {

    if (grid[y].every(Boolean)) {
      rows.push(y);
    }
  }

  for (let x = 0; x < SIZE; x++) {

    if (grid.every(row => row[x])) {
      cols.push(x);
    }
  }

  // Clear completed lines
  if (rows.length || cols.length) {

    const cleared = new Set();

    rows.forEach(y => {

      for (let x = 0; x < SIZE; x++) {
        cleared.add(`${y},${x}`);
      }
    });

    cols.forEach(x => {

      for (let y = 0; y < SIZE; y++) {
        cleared.add(`${y},${x}`);
      }
    });

    cleared.forEach(key => {

      const [y, x] = key.split(',').map(Number);

      grid[y][x] = null;
    });

    score +=
      cleared.size * 2 +
      rows.length * 10 +
      cols.length * 10;

    setHint(
      `CRUSH! ${rows.length + cols.length} lines cleared!`
    );

  } else {

    setHint('Nice move! Keep fitting those blocks.');
  }

  // Save best score
  if (score > best) {

    best = score;

    localStorage.setItem(
      'blockCrushBest',
      best
    );
  }

  // Generate new blocks when all three are used
  if (pieces.every(p => !p)) {

    pieces = [
      randomPiece(),
      randomPiece(),
      randomPiece()
    ];

    level = Math.floor(score / 250) + 1;
  }

  render();

  // Check if any move remains
  if (!hasAnyMove()) {
    endGame();
  }
}

// Check whether any available block can fit
function hasAnyMove() {

  for (const p of pieces) {

    if (!p) continue;

    for (let r = 0; r < SIZE; r++) {

      for (let c = 0; c < SIZE; c++) {

        if (canPlace(p.shape, r, c)) {
          return true;
        }
      }
    }
  }

  return false;
}

// Update instruction text
function setHint(text) {
  $('hint').textContent = text;
}

// Show game popup
function showOverlay(
  title,
  txt,
  icon = 'Ⅱ',
  button = 'CONTINUE'
) {

  $('dialogTitle').textContent = title;
  $('dialogText').textContent = txt;
  $('dialogIcon').textContent = icon;
  $('resumeBtn').textContent = button;

  $('overlay').classList.remove('hidden');
}

// Hide game popup
function hideOverlay() {
  $('overlay').classList.add('hidden');
}

// Game over
function endGame() {

  gameOver = true;

  showOverlay(
    'GAME OVER',
    `Final score: ${score}. Best score: ${best}. Ready for another round?`,
    '✦',
    'PLAY AGAIN'
  );
}

// Pause game
$('pauseBtn').onclick = () => {

  if (gameOver) return;

  paused = true;

  showOverlay(
    'PAUSED',
    'Take a breath. Your game is waiting.',
    'Ⅱ',
    'CONTINUE'
  );
};

// Resume game
$('resumeBtn').onclick = () => {

  if (gameOver) {

    newGame();

    return;
  }

  paused = false;

  hideOverlay();
};

// Restart game
$('restartBtn').onclick = () => {

  showOverlay(
    'NEW GAME?',
    'Start a fresh round? Your current score will be lost.',
    '↻',
    'START NEW GAME'
  );

  gameOver = true;
};

// Confirm new game
$('overlayNewBtn').onclick = () => {
  newGame();
};

// Sound indicator
$('soundBtn').onclick = () => {

  soundOn = !soundOn;

  $('soundBtn').textContent =
    soundOn ? '♫' : '♪';

  setHint(
    soundOn
      ? 'Sound indicator on.'
      : 'Sound indicator off.'
  );
};

// Initialize the application
newGame();
