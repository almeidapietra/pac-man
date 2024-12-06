// Configuração do canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = 480;
canvas.height = 480;

// Game constants
const CELL_SIZE = 24;
const ROWS = 20;
const COLS = 20;

// Initial game map (0: wall, 1: dot, 2: empty, 3: power pellet)
const INITIAL_MAP = [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,0],
    [0,1,0,0,1,0,0,0,1,0,0,1,0,0,0,1,0,0,1,0],
    [0,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,0],
    [0,1,0,0,1,0,1,0,0,0,0,0,0,1,0,1,0,0,1,0],
    [0,1,1,1,1,0,1,1,1,0,0,1,1,1,0,1,1,1,1,0],
    [0,1,0,0,1,0,0,0,1,0,0,1,0,0,0,1,0,0,1,0],
    [0,1,0,0,1,0,1,1,1,1,1,1,1,1,0,1,0,0,1,0],
    [0,1,1,1,1,1,1,0,0,0,0,0,0,1,1,1,1,1,1,0],
    [0,0,0,0,1,0,1,1,1,1,1,1,1,1,0,1,0,0,0,0],
    [0,0,0,0,1,0,1,0,0,2,2,0,0,1,0,1,0,0,0,0],
    [0,1,1,1,1,1,1,1,1,2,2,1,1,1,1,1,1,1,1,0],
    [0,1,0,0,1,0,1,0,0,0,0,0,0,1,0,1,0,0,1,0],
    [0,1,1,0,1,0,1,1,1,0,0,1,1,1,0,1,0,1,1,0],
    [0,0,1,0,1,0,1,0,1,1,1,1,0,1,0,1,0,1,0,0],
    [0,1,1,1,1,1,1,0,1,0,0,1,0,1,1,1,1,1,1,0],
    [0,1,0,0,0,0,1,0,1,0,0,1,0,1,0,0,0,0,1,0],
    [0,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,0],
    [0,1,0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0,1,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
];

// Game variables
let score = 0;
let lives = 3;
let gameLoop = null;
let powerMode = false;
let powerModeTimer = null;
let isGameRunning = false;
let gameMap = null;

// Game objects
const pacman = {
    x: 9 * CELL_SIZE,
    y: 11 * CELL_SIZE,
    direction: 0,
    nextDirection: 0,
    speed: 3
};

const ghosts = [
    { x: 1 * CELL_SIZE, y: 1 * CELL_SIZE, color: '#ff0000', direction: 0, speed: 2 },
    { x: 18 * CELL_SIZE, y: 1 * CELL_SIZE, color: '#00ffff', direction: 0, speed: 2 },
    { x: 1 * CELL_SIZE, y: 18 * CELL_SIZE, color: '#ffb8ff', direction: 0, speed: 2 },
    { x: 18 * CELL_SIZE, y: 18 * CELL_SIZE, color: '#ffb852', direction: 0, speed: 2 }
];

// Sound effects
const eatDotSound = document.getElementById('eatDotSound');
const eatGhostSound = document.getElementById('eatGhostSound');
const deathSound = document.getElementById('deathSound');
const powerUpSound = document.getElementById('powerUpSound');

// Função para tocar sons
function playSound(sound) {
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(error => {
            console.log("Error playing sound:", error);
        });
    }
}

// Event listeners
window.addEventListener('click', () => {
    document.getElementById("eatDotSound").play();
}, { once: true });

document.addEventListener('keydown', function(e) {
    if (!isGameRunning) return;
    
    switch(e.key) {
        case 'ArrowLeft':
            pacman.nextDirection = 2;
            break;
        case 'ArrowRight':
            pacman.nextDirection = 0;
            break;
        case 'ArrowUp':
            pacman.nextDirection = 3;
            break;
        case 'ArrowDown':
            pacman.nextDirection = 1;
            break;
    }
});

// Prevent arrow keys from scrolling
window.addEventListener("keydown", function(e) {
    if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].indexOf(e.code) > -1) {
        e.preventDefault();
    }
});

function canMove(x, y) {
    // Verifica os limites do canvas
    if (x < 0 || x > (COLS - 1) * CELL_SIZE || 
        y < 0 || y > (ROWS - 1) * CELL_SIZE) {
        return false;
    }

    // Verifica a posição atual e a próxima posição
    const currentGridX = Math.floor(x / CELL_SIZE);
    const currentGridY = Math.floor(y / CELL_SIZE);
    const nextGridX = Math.floor((x + CELL_SIZE - 1) / CELL_SIZE);
    const nextGridY = Math.floor((y + CELL_SIZE - 1) / CELL_SIZE);

    // Garante que todas as posições estão dentro dos limites
    if (currentGridX < 0 || currentGridX >= COLS || currentGridY < 0 || currentGridY >= ROWS ||
        nextGridX < 0 || nextGridX >= COLS || nextGridY < 0 || nextGridY >= ROWS) {
        return false;
    }

    // Verifica se alguma das posições é parede
    return gameMap[currentGridY][currentGridX] !== 0 && 
           gameMap[nextGridY][nextGridX] !== 0;
}

function moveGhosts() {
    ghosts.forEach((ghost, index) => {
        // No modo power, os fantasmas tentam fugir do Pac-Man
        const shouldFlee = powerMode;
        
        // Calcula a direção para o Pac-Man
        const dx = pacman.x - ghost.x;
        const dy = pacman.y - ghost.y;
        
        // Lista de possíveis direções
        let possibleDirections = [];
        
        // Verifica cada direção possível
        if (canMove(ghost.x + ghost.speed, ghost.y)) possibleDirections.push({dir: 0, dx: ghost.speed, dy: 0});
        if (canMove(ghost.x, ghost.y + ghost.speed)) possibleDirections.push({dir: 1, dx: 0, dy: ghost.speed});
        if (canMove(ghost.x - ghost.speed, ghost.y)) possibleDirections.push({dir: 2, dx: -ghost.speed, dy: 0});
        if (canMove(ghost.x, ghost.y - ghost.speed)) possibleDirections.push({dir: 3, dx: 0, dy: -ghost.speed});
        
        if (possibleDirections.length > 0) {
            // Personalidade diferente para cada fantasma
            let chosenDirection;
            
            if (index === 0) { // Vermelho - persegue diretamente
                // Escolhe a direção que leva mais perto do Pac-Man
                chosenDirection = possibleDirections.reduce((best, current) => {
                    const currentDist = Math.abs((ghost.x + current.dx) - pacman.x) + 
                                      Math.abs((ghost.y + current.dy) - pacman.y);
                    const bestDist = Math.abs((ghost.x + best.dx) - pacman.x) + 
                                   Math.abs((ghost.y + best.dy) - pacman.y);
                    return shouldFlee ? (currentDist > bestDist ? current : best) 
                                    : (currentDist < bestDist ? current : best);
                });
            } 
            else if (index === 1) { // Ciano - tenta emboscar
                // Tenta ir para onde o Pac-Man está indo
                const targetX = pacman.x + (dx > 0 ? CELL_SIZE * 4 : -CELL_SIZE * 4);
                const targetY = pacman.y + (dy > 0 ? CELL_SIZE * 4 : -CELL_SIZE * 4);
                
                chosenDirection = possibleDirections.reduce((best, current) => {
                    const currentDist = Math.abs((ghost.x + current.dx) - targetX) + 
                                      Math.abs((ghost.y + current.dy) - targetY);
                    const bestDist = Math.abs((ghost.x + best.dx) - targetX) + 
                                   Math.abs((ghost.y + best.dy) - targetY);
                    return shouldFlee ? (currentDist > bestDist ? current : best) 
                                    : (currentDist < bestDist ? current : best);
                });
            }
            else if (index === 2) { // Rosa - tenta interceptar
                // Tenta prever onde o Pac-Man vai estar
                let targetX = pacman.x;
                let targetY = pacman.y;
                
                switch(pacman.direction) {
                    case 0: targetX += CELL_SIZE * 2; break;
                    case 1: targetY += CELL_SIZE * 2; break;
                    case 2: targetX -= CELL_SIZE * 2; break;
                    case 3: targetY -= CELL_SIZE * 2; break;
                }
                
                chosenDirection = possibleDirections.reduce((best, current) => {
                    const currentDist = Math.abs((ghost.x + current.dx) - targetX) + 
                                      Math.abs((ghost.y + current.dy) - targetY);
                    const bestDist = Math.abs((ghost.x + best.dx) - targetX) + 
                                   Math.abs((ghost.y + best.dy) - targetY);
                    return shouldFlee ? (currentDist > bestDist ? current : best) 
                                    : (currentDist < bestDist ? current : best);
                });
            }
            else { // Laranja - alterna entre perseguir e patrulhar
                const distToPacman = Math.abs(dx) + Math.abs(dy);
                if (distToPacman < CELL_SIZE * 8) { // Se estiver perto, foge
                    chosenDirection = possibleDirections.reduce((best, current) => {
                        const currentDist = Math.abs((ghost.x + current.dx) - pacman.x) + 
                                          Math.abs((ghost.y + current.dy) - pacman.y);
                        const bestDist = Math.abs((ghost.x + best.dx) - pacman.x) + 
                                       Math.abs((ghost.y + best.dy) - pacman.y);
                        return currentDist > bestDist ? current : best;
                    });
                } else { // Se estiver longe, move aleatoriamente
                    chosenDirection = possibleDirections[Math.floor(Math.random() * possibleDirections.length)];
                }
            }
            
            // Aplica a direção escolhida
            ghost.direction = chosenDirection.dir;
            ghost.x += chosenDirection.dx;
            ghost.y += chosenDirection.dy;
        }
    });
}

function checkCollisions() {
    const pacmanGridX = Math.floor(pacman.x / CELL_SIZE);
    const pacmanGridY = Math.floor(pacman.y / CELL_SIZE);
    
    if (!gameMap || !gameMap[pacmanGridY]) return;
    
    // Coleta de pontos
    if (gameMap[pacmanGridY][pacmanGridX] === 1) {
        gameMap[pacmanGridY][pacmanGridX] = 2;
        score += 10;
        playSound(eatDotSound);
    }
    
    // Power pellet
    if (gameMap[pacmanGridY][pacmanGridX] === 3) {
        gameMap[pacmanGridY][pacmanGridX] = 2;
        score += 50;
        powerMode = true;
        playSound(powerUpSound);
        if (powerModeTimer) clearTimeout(powerModeTimer);
        powerModeTimer = setTimeout(() => {
            powerMode = false;
        }, 10000);
    }
    
    // Colisão com fantasmas - mais precisa
    ghosts.forEach((ghost, index) => {
        const dx = Math.abs((pacman.x + CELL_SIZE/2) - (ghost.x + CELL_SIZE/2));
        const dy = Math.abs((pacman.y + CELL_SIZE/2) - (ghost.y + CELL_SIZE/2));
        
        if (dx < CELL_SIZE/3 && dy < CELL_SIZE/3) {
            if (powerMode) {
                score += 200;
                playSound(eatGhostSound);
                // Retorna o fantasma para o canto
                if (index === 0) {
                    ghost.x = 1 * CELL_SIZE;
                    ghost.y = 1 * CELL_SIZE;
                } else if (index === 1) {
                    ghost.x = 18 * CELL_SIZE;
                    ghost.y = 1 * CELL_SIZE;
                } else if (index === 2) {
                    ghost.x = 1 * CELL_SIZE;
                    ghost.y = 18 * CELL_SIZE;
                } else {
                    ghost.x = 18 * CELL_SIZE;
                    ghost.y = 18 * CELL_SIZE;
                }
            } else {
                lives--;
                playSound(deathSound);
                if (lives <= 0) {
                    gameOver();
                } else {
                    resetPositions();
                }
            }
        }
    });
}

function resetPositions() {
    pacman.x = 9 * CELL_SIZE;
    pacman.y = 11 * CELL_SIZE;
    pacman.direction = 0;
    pacman.nextDirection = 0;
    
    ghosts.forEach((ghost, index) => {
        if (index === 0) {
            ghost.x = 1 * CELL_SIZE;
            ghost.y = 1 * CELL_SIZE;
        } else if (index === 1) {
            ghost.x = 18 * CELL_SIZE;
            ghost.y = 1 * CELL_SIZE;
        } else if (index === 2) {
            ghost.x = 1 * CELL_SIZE;
            ghost.y = 18 * CELL_SIZE;
        } else {
            ghost.x = 18 * CELL_SIZE;
            ghost.y = 18 * CELL_SIZE;
        }
        ghost.direction = 0;
    });
}

function gameOver() {
    isGameRunning = false;
    document.getElementById('gameOver').classList.remove('hidden');
    document.getElementById('finalScore').textContent = score;
}

function checkWin() {
    if (!gameMap) return false;
    
    for (let y = 0; y < ROWS; y++) {
        if (!gameMap[y]) continue;
        for (let x = 0; x < COLS; x++) {
            if (gameMap[y][x] === 1 || gameMap[y][x] === 3) {
                return false;
            }
        }
    }
    return true;
}

function draw() {
    if (!gameMap) return;

    // Limpa o canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Desenha o labirinto
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            const cellX = x * CELL_SIZE;
            const cellY = y * CELL_SIZE;
            
            switch(gameMap[y][x]) {
                case 0: // Parede
                    ctx.fillStyle = '#00f';
                    ctx.fillRect(cellX, cellY, CELL_SIZE, CELL_SIZE);
                    break;
                case 1: // Ponto
                    ctx.fillStyle = '#fff';
                    ctx.beginPath();
                    ctx.arc(cellX + CELL_SIZE/2, cellY + CELL_SIZE/2, 4, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                case 3: // Power pellet
                    ctx.fillStyle = '#fff';
                    ctx.beginPath();
                    ctx.arc(cellX + CELL_SIZE/2, cellY + CELL_SIZE/2, 8, 0, Math.PI * 2);
                    ctx.fill();
                    break;
            }
        }
    }
    
    // Desenha Pac-Man
    ctx.fillStyle = '#ff0';
    ctx.beginPath();
    const mouthAngle = 0.2 * Math.PI * Math.sin(Date.now() / 100);
    ctx.arc(
        pacman.x + CELL_SIZE/2,
        pacman.y + CELL_SIZE/2,
        CELL_SIZE/2 - 2,
        pacman.direction * Math.PI/2 + mouthAngle,
        pacman.direction * Math.PI/2 + 2 * Math.PI - mouthAngle
    );
    ctx.lineTo(pacman.x + CELL_SIZE/2, pacman.y + CELL_SIZE/2);
    ctx.fill();
    
    // Desenha fantasmas
    ghosts.forEach(ghost => {
        ctx.fillStyle = powerMode ? '#00f' : ghost.color;
        ctx.beginPath();
        ctx.arc(ghost.x + CELL_SIZE/2, ghost.y + CELL_SIZE/2, CELL_SIZE/2 - 2, Math.PI, 0);
        ctx.lineTo(ghost.x + CELL_SIZE, ghost.y + CELL_SIZE);
        ctx.lineTo(ghost.x, ghost.y + CELL_SIZE);
        ctx.fill();
    });
    
    // Atualiza placar
    document.getElementById('score').textContent = score;
    document.getElementById('lives').textContent = lives;
}

function update() {
    if (!isGameRunning) return;

    // Update Pac-Man position
    let nextX = pacman.x;
    let nextY = pacman.y;
    
    const speed = 4; // Velocidade fixa para movimento mais suave
    
    // Tenta mover na direção desejada
    switch(pacman.nextDirection) {
        case 0: // direita
            nextX = Math.min(pacman.x + speed, (COLS - 1) * CELL_SIZE);
            break;
        case 1: // baixo
            nextY = Math.min(pacman.y + speed, (ROWS - 1) * CELL_SIZE);
            break;
        case 2: // esquerda
            nextX = Math.max(pacman.x - speed, 0);
            break;
        case 3: // cima
            nextY = Math.max(pacman.y - speed, 0);
            break;
    }

    // Verifica se pode mover para a próxima posição
    if (canMove(nextX, nextY)) {
        pacman.x = nextX;
        pacman.y = nextY;
        pacman.direction = pacman.nextDirection;
    } else {
        // Se não pode mover na direção desejada, tenta continuar na direção atual
        nextX = pacman.x;
        nextY = pacman.y;
        
        switch(pacman.direction) {
            case 0: // direita
                nextX = Math.min(pacman.x + speed, (COLS - 1) * CELL_SIZE);
                break;
            case 1: // baixo
                nextY = Math.min(pacman.y + speed, (ROWS - 1) * CELL_SIZE);
                break;
            case 2: // esquerda
                nextX = Math.max(pacman.x - speed, 0);
                break;
            case 3: // cima
                nextY = Math.max(pacman.y - speed, 0);
                break;
        }
        
        if (canMove(nextX, nextY)) {
            pacman.x = nextX;
            pacman.y = nextY;
        }
    }

    // Move fantasmas
    moveGhosts();
    
    // Verifica colisões
    checkCollisions();
    
    // Verifica vitória
    if (checkWin()) {
        isGameRunning = false;
        document.getElementById('gameWin').classList.remove('hidden');
        document.getElementById('winScore').textContent = score;
        return;
    }
    
    // Desenha o jogo
    draw();
    
    // Continua o loop
    gameLoop = requestAnimationFrame(update);
}

function initGame() {
    try {
        gameMap = INITIAL_MAP.map(row => [...row]);
        console.log('Mapa inicializado:', gameMap);
        return true;
    } catch (error) {
        console.error('Erro ao inicializar o mapa:', error);
        return false;
    }
}

function startGame() {
    console.log('Iniciando jogo...');
    
    // Limpa qualquer estado anterior
    if (gameLoop) {
        cancelAnimationFrame(gameLoop);
        gameLoop = null;
    }
    
    // Reset game state
    score = 0;
    lives = 3;
    powerMode = false;
    if (powerModeTimer) clearTimeout(powerModeTimer);
    
    // Esconde mensagens
    document.getElementById('gameOver').classList.add('hidden');
    document.getElementById('gameWin').classList.add('hidden');
    
    // Inicializa o mapa
    if (!initGame()) {
        console.error('Falha ao inicializar o jogo');
        return;
    }
    
    // Reset positions
    resetPositions();
    
    // Inicia o jogo após um pequeno delay
    setTimeout(() => {
        isGameRunning = true;
        gameLoop = requestAnimationFrame(update);
    }, 1000);
}

function restartGame() {
    document.getElementById('gameOver').classList.add('hidden');
    document.getElementById('gameWin').classList.add('hidden');
    startGame();
}

// Start the game when the page loads
window.addEventListener('load', function() {
    console.log('Página carregada!');
    startGame();
});
