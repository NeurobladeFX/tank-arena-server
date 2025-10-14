const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const startButton = document.getElementById('startButton');
const healthDisplay = document.getElementById('health');
const killsDisplay = document.getElementById('kills');
const scoreDisplay = document.getElementById('score');
const roomDisplay = document.getElementById('room');
const leaderboardEntries = document.getElementById('leaderboard-entries');

// Set canvas size
canvas.width = 800;
canvas.height = 600;

// Socket.io connection - Use relative path for same domain
const socket = io();

// Game variables
let gameRunning = false;
let player = null;
let playerId = null;
let playerName = '';
let tanks = [];
let bullets = [];
let obstacles = [];
let explosions = [];
let kills = 0;
let score = 0;
let lastTime = 0;
let leaderboard = [];

// Input handling
const keys = {};
const mouse = { x: 0, y: 0, clicked: false };

document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    keys[e.code] = true;
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
    keys[e.code] = false;
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
});

canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
        mouse.clicked = true;
    }
});

// Classes
class Tank {
    constructor(x, y, isPlayer = false, id = null, color = null, name = '') {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 40;
        this.angle = 0;
        this.turretAngle = 0;
        this.speed = 2;
        this.health = 100;
        this.isPlayer = isPlayer;
        this.color = color || (isPlayer ? '#4CAF50' : getRandomColor());
        this.cooldown = 0;
        this.maxCooldown = 30;
        this.id = id || Math.random().toString(36).substr(2, 9);
        this.name = name;
    }

    update(keys, mouse) {
        if (this.isPlayer) {
            let moved = false;
            
            if (keys['w'] || keys['ArrowUp']) {
                this.x += Math.sin(this.angle) * this.speed;
                this.y -= Math.cos(this.angle) * this.speed;
                moved = true;
            }
            if (keys['s'] || keys['ArrowDown']) {
                this.x -= Math.sin(this.angle) * this.speed;
                this.y += Math.cos(this.angle) * this.speed;
                moved = true;
            }
            if (keys['a'] || keys['ArrowLeft']) {
                this.angle -= 0.05;
                moved = true;
            }
            if (keys['d'] || keys['ArrowRight']) {
                this.angle += 0.05;
                moved = true;
            }

            // Turret aiming
            if (mouse.x && mouse.y) {
                const dx = mouse.x - this.x;
                const dy = mouse.y - this.y;
                this.turretAngle = Math.atan2(dx, -dy);
            }

            // Shooting
            if (mouse.clicked && this.cooldown <= 0) {
                this.shoot();
                this.cooldown = this.maxCooldown;
                mouse.clicked = false;
            }
            
            // Send update to server
            if (moved) {
                socket.emit('player-update', {
                    id: this.id,
                    x: this.x,
                    y: this.y,
                    angle: this.angle,
                    turretAngle: this.turretAngle
                });
            }
        }

        // Keep tank on canvas
        this.x = Math.max(this.width/2, Math.min(canvas.width - this.width/2, this.x));
        this.y = Math.max(this.height/2, Math.min(canvas.height - this.height/2, this.y));

        // Cooldown
        if (this.cooldown > 0) {
            this.cooldown--;
        }
    }

    shoot() {
        const bulletX = this.x + Math.sin(this.turretAngle) * 25;
        const bulletY = this.y - Math.cos(this.turretAngle) * 25;
        socket.emit('bullet-fired', {
            x: bulletX,
            y: bulletY,
            angle: this.turretAngle,
            ownerId: this.id
        });
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
        
        // Draw turret
        ctx.rotate(this.turretAngle - this.angle);
        ctx.fillStyle = '#888';
        ctx.fillRect(-8, -15, 16, 30);
        
        ctx.restore();

        // Draw name
        if (this.name) {
            ctx.fillStyle = 'white';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(this.name, this.x, this.y - 30);
        }

        // Draw health bar
        if (!this.isPlayer) {
            const barWidth = 40;
            const barHeight = 4;
            const healthPercent = this.health / 100;
            
            ctx.fillStyle = 'red';
            ctx.fillRect(this.x - barWidth/2, this.y - 35, barWidth, barHeight);
            ctx.fillStyle = 'green';
            ctx.fillRect(this.x - barWidth/2, this.y - 35, barWidth * healthPercent, barHeight);
        }
    }
}

class Bullet {
    constructor(x, y, angle, ownerId) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = 5;
        this.size = 5;
        this.ownerId = ownerId;
    }

    draw() {
        ctx.fillStyle = '#FFEB3B';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Obstacle {
    constructor(x, y, width, height, destructible = false) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.destructible = destructible;
    }

    draw() {
        ctx.fillStyle = this.destructible ? '#795548' : '#607D8B';
        ctx.fillRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);
    }
}

class Explosion {
    constructor(x, y, size) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.maxSize = size * 2;
        this.currentSize = size;
        this.growing = true;
    }

    update() {
        if (this.growing) {
            this.currentSize += 2;
            if (this.currentSize >= this.maxSize) {
                this.growing = false;
            }
        } else {
            this.currentSize -= 2;
        }
    }

    draw() {
        const gradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.currentSize
        );
        gradient.addColorStop(0, 'rgba(255, 100, 0, 0.8)');
        gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.currentSize, 0, Math.PI * 2);
        ctx.fill();
    }

    isDone() {
        return !this.growing && this.currentSize <= 0;
    }
}

// Socket events
socket.on('connect', () => {
    playerId = socket.id;
    console.log('Connected to server with ID:', playerId);
});

socket.on('room-assigned', (roomId) => {
    roomDisplay.textContent = roomId;
});

socket.on('game-state', (gameState) => {
    if (!gameRunning) return;
    
    // Update tanks
    tanks = Object.values(gameState.tanks).map(tankData => {
        if (tankData.id === playerId) {
            if (player) {
                // Update player health from server
                player.health = tankData.health;
                healthDisplay.textContent = player.health;
            }
            return player;
        }
        const tank = new Tank(tankData.x, tankData.y, false, tankData.id, tankData.color, tankData.name);
        tank.health = tankData.health;
        tank.angle = tankData.angle;
        tank.turretAngle = tankData.turretAngle;
        return tank;
    });
    
    // Update bullets
    bullets = gameState.bullets.map(bulletData => {
        return new Bullet(bulletData.x, bulletData.y, bulletData.angle, bulletData.ownerId);
    });
    
    // Update obstacles
    obstacles = gameState.obstacles.map(obstacleData => {
        return new Obstacle(
            obstacleData.x, 
            obstacleData.y, 
            obstacleData.width, 
            obstacleData.height, 
            obstacleData.destructible
        );
    });
});

socket.on('leaderboard-update', (updatedLeaderboard) => {
    leaderboard = updatedLeaderboard;
    updateLeaderboard();
});

socket.on('player-hit', (data) => {
    if (data.playerId === playerId) {
        player.health = data.newHealth;
        healthDisplay.textContent = player.health;
        explosions.push(new Explosion(data.x, data.y, 20));
        
        if (player.health <= 0) {
            setTimeout(() => {
                player.health = 100;
                player.x = Math.random() * 700 + 50;
                player.y = Math.random() * 500 + 50;
                healthDisplay.textContent = player.health;
                socket.emit('player-respawn', {
                    id: playerId,
                    x: player.x,
                    y: player.y,
                    health: player.health
                });
            }, 2000);
        }
    }
});

socket.on('player-killed', (killerId) => {
    if (killerId === playerId) {
        kills++;
        score += 100;
        killsDisplay.textContent = kills;
        scoreDisplay.textContent = score;
        socket.emit('score-update', { id: playerId, score });
    }
});

// Game functions
function initGame() {
    const nameInput = document.getElementById('playerNameInput');
    playerName = nameInput.value.trim() || "Player" + Math.floor(Math.random() * 1000);
    
    player = new Tank(
        canvas.width / 2, 
        canvas.height / 2, 
        true, 
        playerId,
        getRandomColor(),
        playerName
    );
    
    socket.emit('join-game', {
        id: playerId,
        name: playerName,
        color: player.color,
        health: player.health
    });
    
    bullets = [];
    explosions = [];
    kills = 0;
    score = 0;
    lastTime = Date.now();
    
    healthDisplay.textContent = player.health;
    killsDisplay.textContent = kills;
    scoreDisplay.textContent = score;
}

function getRandomColor() {
    const colors = ['#FF5733', '#33FF57', '#3357FF', '#F3FF33', '#FF33F3', '#33FFF3'];
    return colors[Math.floor(Math.random() * colors.length)];
}

function updateLeaderboard() {
    leaderboardEntries.innerHTML = '';
    
    const sorted = [...leaderboard].sort((a, b) => b.score - a.score);
    const displayCount = Math.min(10, sorted.length);
    let playerInTop10 = false;
    
    for (let i = 0; i < displayCount; i++) {
        const entry = sorted[i];
        const isYou = entry.id === playerId;
        if (isYou) playerInTop10 = true;
        
        const entryEl = document.createElement('div');
        entryEl.className = `leaderboard-entry ${isYou ? 'leaderboard-you' : ''}`;
        entryEl.innerHTML = `
            <span>${i + 1}. ${entry.name}</span>
            <span>${entry.score}</span>
        `;
        leaderboardEntries.appendChild(entryEl);
    }
    
    if (!playerInTop10) {
        const playerIndex = sorted.findIndex(entry => entry.id === playerId);
        if (playerIndex !== -1) {
            const entry = sorted[playerIndex];
            const entryEl = document.createElement('div');
            entryEl.className = 'leaderboard-entry leaderboard-you';
            entryEl.innerHTML = `
                <span>${playerIndex + 1}. ${entry.name}</span>
                <span>${entry.score}</span>
            `;
            leaderboardEntries.appendChild(entryEl);
        }
    }
}

function gameLoop(timestamp) {
    if (!gameRunning) return;
    
    const deltaTime = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw obstacles
    obstacles.forEach(obstacle => obstacle.draw());
    
    // Update and draw tanks
    tanks.forEach(tank => {
        if (tank.isPlayer) {
            tank.update(keys, mouse);
        }
        tank.draw();
    });
    
    // Draw bullets
    bullets.forEach(bullet => bullet.draw());
    
    // Update and draw explosions
    for (let i = explosions.length - 1; i >= 0; i--) {
        const explosion = explosions[i];
        explosion.update();
        explosion.draw();
        
        if (explosion.isDone()) {
            explosions.splice(i, 1);
        }
    }
    
    requestAnimationFrame(gameLoop);
}

// Start game
startButton.addEventListener('click', () => {
    startScreen.style.display = 'none';
    initGame();
    gameRunning = true;
    lastTime = Date.now();
    requestAnimationFrame(gameLoop);
});

// Handle window close
window.addEventListener('beforeunload', () => {
    if (gameRunning) {
        socket.emit('leave-game', playerId);
    }
});