const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const minimap = document.getElementById('minimap');
const minimapCtx = minimap.getContext('2d');

// UI Elements
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startButton = document.getElementById('startButton');
const playAgainButton = document.getElementById('playAgainButton');
const healthDisplay = document.getElementById('health');
const scoreDisplay = document.getElementById('score');
const killsDisplay = document.getElementById('kills');
const levelDisplay = document.getElementById('level');
const vehicleNameDisplay = document.getElementById('vehicleName');
const leaderboardEntries = document.getElementById('leaderboard-entries');
const finalScoreDisplay = document.getElementById('finalScore');
const finalKillsDisplay = document.getElementById('finalKills');
const finalLevelDisplay = document.getElementById('finalLevel');
const survivalTimeDisplay = document.getElementById('survivalTime');

// Mobile controls
const mobileControls = document.getElementById('mobileControls');
const touchArea = document.getElementById('touchArea');
const fireButton = document.getElementById('fireButton');

// Vehicle selection
const vehicleOptions = document.querySelectorAll('.vehicle-option');

// Set canvas sizes
function setCanvasSizes() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    minimap.width = 150;
    minimap.height = 150;
}

setCanvasSizes();
window.addEventListener('resize', setCanvasSizes);

// Socket.io connection
const socket = io();

socket.on('connect_error', (error) => {
    console.error('Connection failed:', error);
    alert('Failed to connect to game server. Please refresh and try again.');
});

// Game variables
let gameRunning = false;
let player = null;
let playerId = null;
let playerName = '';
let selectedVehicle = 'tank';
let players = [];
let bullets = [];
let obstacles = [];
let resources = [];
let explosions = [];
let leaderboard = [];
let gameTime = 600;
let camera = { x: 0, y: 0 };
let mapSize = 3000;
let vehicleSystem = {};

// Input handling - Simplified for mobile
const keys = {};
const mouse = { x: 0, y: 0, clicked: false };
const touch = {
    active: false,
    x: 0,
    y: 0,
    startX: 0,
    startY: 0
};

// Detect mobile device
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Event listeners for desktop
document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left + camera.x;
    mouse.y = e.clientY - rect.top + camera.y;
});

canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
        mouse.clicked = true;
    }
});

// Simplified touch events for mobile :cite[6]
if (isMobile) {
    mobileControls.style.display = 'block';
    
    touchArea.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        touch.active = true;
        touch.startX = touch.clientX - rect.left;
        touch.startY = touch.clientY - rect.top;
        touch.x = touch.startX;
        touch.y = touch.startY;
    });
    
    touchArea.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!touch.active) return;
        
        const touchEvent = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        touch.x = touchEvent.clientX - rect.left;
        touch.y = touchEvent.clientY - rect.top;
    });
    
    touchArea.addEventListener('touchend', (e) => {
        e.preventDefault();
        touch.active = false;
    });
    
    fireButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        mouse.clicked = true;
    });
    
    fireButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        mouse.clicked = false;
    });
} else {
    // Desktop mouse controls
    canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
            mouse.clicked = true;
        }
    });
    
    canvas.addEventListener('mouseup', (e) => {
        if (e.button === 0) {
            mouse.clicked = false;
        }
    });
}

// Vehicle selection
vehicleOptions.forEach(option => {
    option.addEventListener('click', () => {
        vehicleOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        selectedVehicle = option.dataset.vehicle;
    });
});

// Vehicle class with image support
class Vehicle {
    constructor(x, y, isPlayer = false, id = null, vehicleType = 'tank', color = null, name = '') {
        this.x = x;
        this.y = y;
        this.vehicleType = vehicleType;
        this.level = 1;
        
        this.updateStats();
        
        this.angle = 0;
        this.isPlayer = isPlayer;
        this.color = color || '#4CAF50';
        this.cooldown = 0;
        this.maxCooldown = vehicleType === 'artillery' ? 60 : 30;
        this.id = id;
        this.name = name;
        this.kills = 0;
        this.score = 0;
        this.experience = 0;
        
        // Load vehicle image
        this.image = new Image();
        this.image.src = `assets/${vehicleType}.png`;
        this.imageLoaded = false;
        this.image.onload = () => {
            this.imageLoaded = true;
        };
    }
    
    updateStats() {
        const vehicleData = vehicleSystem[this.vehicleType];
        if (!vehicleData) return;
        
        let stats;
        if (this.level > 1 && vehicleData.upgrades[this.level]) {
            stats = vehicleData.upgrades[this.level];
            this.displayName = stats.name;
        } else {
            stats = vehicleData.base;
            this.displayName = this.getBaseVehicleName();
        }
        
        this.width = stats.size;
        this.height = stats.size;
        this.speed = stats.speed;
        this.maxHealth = stats.health;
        this.damage = stats.damage;
        
        if (!this.health) {
            this.health = this.maxHealth;
        }
    }
    
    getBaseVehicleName() {
        const names = {
            tank: 'Main Battle Tank',
            jeep: 'Combat Jeep', 
            apc: 'Armored APC',
            artillery: 'Field Artillery'
        };
        return names[this.vehicleType] || this.vehicleType;
    }
    
    levelUp() {
        if (this.level < 3) {
            this.level++;
            const oldHealth = this.health;
            const healthPercent = oldHealth / this.maxHealth;
            this.updateStats();
            this.health = this.maxHealth * healthPercent;
            return true;
        }
        return false;
    }

    update() {
        if (this.isPlayer) {
            let moved = false;
            let moveX = 0, moveY = 0;

            if (!isMobile) {
                // Desktop controls
                if (keys['w'] || keys['arrowup']) {
                    moveY -= 1;
                    moved = true;
                }
                if (keys['s'] || keys['arrowdown']) {
                    moveY += 1;
                    moved = true;
                }
                if (keys['a'] || keys['arrowleft']) {
                    moveX -= 1;
                    moved = true;
                }
                if (keys['d'] || keys['arrowright']) {
                    moveX += 1;
                    moved = true;
                }

                // Mouse aiming
                if (mouse.x && mouse.y) {
                    const dx = mouse.x - this.x;
                    const dy = mouse.y - this.y;
                    this.angle = Math.atan2(dy, dx);
                }
            } else {
                // Mobile touch controls
                if (touch.active) {
                    const dx = (touch.x - touch.startX) * 0.1;
                    const dy = (touch.y - touch.startY) * 0.1;
                    
                    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                        moveX = dx;
                        moveY = dy;
                        this.angle = Math.atan2(dy, dx);
                        moved = true;
                    }
                }
            }

            // Apply movement
            if (moved) {
                const length = Math.sqrt(moveX * moveX + moveY * moveY);
                if (length > 0) {
                    moveX /= length;
                    moveY /= length;
                    
                    this.x += moveX * this.speed;
                    this.y += moveY * this.speed;
                }

                socket.emit('player-update', {
                    id: this.id,
                    x: this.x,
                    y: this.y,
                    angle: this.angle
                });
            }

            // Shooting
            if (mouse.clicked && this.cooldown <= 0) {
                this.shoot();
                this.cooldown = this.maxCooldown;
                mouse.clicked = false;
            }
        }

        // Keep vehicle in bounds
        this.x = Math.max(this.width/2, Math.min(mapSize - this.width/2, this.x));
        this.y = Math.max(this.height/2, Math.min(mapSize - this.height/2, this.y));

        // Cooldown
        if (this.cooldown > 0) {
            this.cooldown--;
        }
    }

    shoot() {
        const bulletX = this.x + Math.cos(this.angle) * (this.width / 2 + 15);
        const bulletY = this.y + Math.sin(this.angle) * (this.height / 2 + 15);
        
        socket.emit('bullet-fired', {
            x: bulletX,
            y: bulletY,
            angle: this.angle,
            ownerId: this.id
        });
    }

    draw() {
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;

        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(this.angle);
        
        // Draw vehicle image or fallback rectangle
        if (this.imageLoaded) {
            ctx.drawImage(this.image, -this.width/2, -this.height/2, this.width, this.height);
        } else {
            // Fallback colored rectangle
            ctx.fillStyle = this.color;
            ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
            ctx.fillStyle = '#333';
            ctx.fillRect(-8, -this.height/2, 16, this.height);
        }
        
        ctx.restore();

        // Draw UI elements
        this.drawUI(screenX, screenY);
    }

    drawUI(screenX, screenY) {
        // Draw name and level
        if (this.name) {
            ctx.fillStyle = 'white';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(this.name, screenX, screenY - this.height/2 - 25);
            
            // Draw level badge
            if (this.level > 1) {
                ctx.fillStyle = '#ffd700';
                ctx.font = '10px Arial';
                ctx.fillText(`Lvl ${this.level}`, screenX, screenY - this.height/2 - 10);
            }
        }

        // Draw health bar
        if (!this.isPlayer || this.health < this.maxHealth) {
            const barWidth = 50;
            const barHeight = 5;
            const healthPercent = this.health / this.maxHealth;
            
            ctx.fillStyle = 'red';
            ctx.fillRect(screenX - barWidth/2, screenY - this.height/2 - 35, barWidth, barHeight);
            ctx.fillStyle = healthPercent > 0.3 ? 'green' : 'yellow';
            ctx.fillRect(screenX - barWidth/2, screenY - this.height/2 - 35, barWidth * healthPercent, barHeight);
        }
    }
}

// Bullet class
class Bullet {
    constructor(x, y, angle, ownerId, damage) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = 8;
        this.size = 6;
        this.ownerId = ownerId;
        this.damage = damage;
    }

    draw() {
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;
        
        // Bullet glow
        ctx.fillStyle = 'rgba(255, 235, 59, 0.8)';
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Bullet core
        ctx.fillStyle = '#FF5722';
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
        
        // Trail effect
        ctx.strokeStyle = 'rgba(255, 100, 0, 0.4)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(screenX, screenY);
        ctx.lineTo(
            screenX - Math.cos(this.angle) * 15,
            screenY - Math.sin(this.angle) * 15
        );
        ctx.stroke();
    }
}

// Resource and Explosion classes remain similar but enhanced
class Resource {
    constructor(x, y, type, value) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.value = value;
        this.size = 20;
        this.pulse = 0;
    }

    update() {
        this.pulse = (this.pulse + 0.1) % (Math.PI * 2);
    }

    draw() {
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;
        const pulseSize = this.size + Math.sin(this.pulse) * 5;

        ctx.save();
        ctx.globalAlpha = 0.8 + Math.sin(this.pulse) * 0.2;
        
        if (this.type === 'health') {
            // Health pack with cross symbol
            ctx.fillStyle = '#4CAF50';
            ctx.beginPath();
            ctx.arc(screenX, screenY, pulseSize, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = 'white';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('+', screenX, screenY);
        } else {
            // Ammo crate
            ctx.fillStyle = '#FF9800';
            ctx.fillRect(screenX - pulseSize/2, screenY - pulseSize/2, pulseSize, pulseSize);
            
            ctx.fillStyle = 'white';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('A', screenX, screenY);
        }
        
        ctx.restore();
    }
}

class Explosion {
    constructor(x, y, size) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.maxSize = size * 4;
        this.currentSize = size;
        this.growing = true;
        this.particles = [];
        this.createParticles();
    }

    createParticles() {
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x: this.x,
                y: this.y,
                angle: Math.random() * Math.PI * 2,
                speed: Math.random() * 8 + 3,
                size: Math.random() * 4 + 2,
                life: 1
            });
        }
    }

    update() {
        if (this.growing) {
            this.currentSize += 3;
            if (this.currentSize >= this.maxSize) {
                this.growing = false;
            }
        } else {
            this.currentSize -= 2;
        }

        this.particles.forEach(particle => {
            particle.x += Math.cos(particle.angle) * particle.speed;
            particle.y += Math.sin(particle.angle) * particle.speed;
            particle.life -= 0.03;
            particle.size -= 0.15;
        });

        this.particles = this.particles.filter(p => p.life > 0 && p.size > 0);
    }

    draw() {
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;

        // Main explosion with gradient
        const gradient = ctx.createRadialGradient(
            screenX, screenY, 0,
            screenX, screenY, this.currentSize
        );
        gradient.addColorStop(0, 'rgba(255, 150, 0, 0.9)');
        gradient.addColorStop(0.7, 'rgba(255, 50, 0, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.currentSize, 0, Math.PI * 2);
        ctx.fill();

        // Particles
        this.particles.forEach(particle => {
            const particleX = particle.x - camera.x;
            const particleY = particle.y - camera.y;
            
            ctx.save();
            ctx.globalAlpha = particle.life;
            ctx.fillStyle = `rgb(255, ${Math.random() * 100 + 100}, 0)`;
            ctx.beginPath();
            ctx.arc(particleX, particleY, particle.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }

    isDone() {
        return !this.growing && this.currentSize <= 0 && this.particles.length === 0;
    }
}

// Socket events
socket.on('connect', () => {
    playerId = socket.id;
    console.log('Connected to server with ID:', playerId);
});

socket.on('game-config', (config) => {
    vehicleSystem = config.vehicleSystem;
    mapSize = config.mapSize;
    document.getElementById('startButton').disabled = false;
});

socket.on('game-state', (gameState) => {
    if (!gameRunning) return;
    
    players = Object.values(gameState.players).map(playerData => {
        if (playerData.id === playerId) {
            if (player) {
                const oldLevel = player.level;
                player.health = playerData.health;
                player.kills = playerData.kills;
                player.score = playerData.score;
                player.experience = playerData.experience;
                player.level = playerData.level;
                
                // Update UI
                healthDisplay.textContent = Math.ceil(player.health);
                killsDisplay.textContent = player.kills;
                scoreDisplay.textContent = player.score;
                levelDisplay.textContent = player.level;
                
                // Update vehicle stats if level changed
                if (oldLevel !== player.level) {
                    player.updateStats();
                    vehicleNameDisplay.textContent = player.displayName;
                }
            }
            return player;
        }
        const vehicle = new Vehicle(
            playerData.x, 
            playerData.y, 
            false, 
            playerData.id, 
            playerData.vehicleType, 
            playerData.color, 
            playerData.name
        );
        vehicle.health = playerData.health;
        vehicle.kills = playerData.kills;
        vehicle.score = playerData.score;
        vehicle.experience = playerData.experience;
        vehicle.level = playerData.level;
        vehicle.updateStats();
        return vehicle;
    });
    
    bullets = gameState.bullets.map(bulletData => {
        return new Bullet(
            bulletData.x, 
            bulletData.y, 
            bulletData.angle, 
            bulletData.ownerId,
            bulletData.damage
        );
    });
    
    obstacles = gameState.obstacles;
    resources = gameState.resources.map(resourceData => 
        new Resource(resourceData.x, resourceData.y, resourceData.type, resourceData.value)
    );
    
    gameTime = gameState.gameTime;
});

socket.on('leaderboard-update', (updatedLeaderboard) => {
    leaderboard = updatedLeaderboard;
    updateLeaderboard();
});

socket.on('player-hit', (data) => {
    if (data.playerId === playerId) {
        player.health = data.newHealth;
        healthDisplay.textContent = Math.ceil(player.health);
        explosions.push(new Explosion(data.x, data.y, 25));
        
        if (player.health <= 0) {
            setTimeout(() => {
                showGameOver();
            }, 1000);
        }
    } else {
        explosions.push(new Explosion(data.x, data.y, 20));
    }
});

socket.on('player-killed', (data) => {
    if (data.killerId === playerId) {
        player.kills++;
        player.score += 100;
        player.experience += 50;
        killsDisplay.textContent = player.kills;
        scoreDisplay.textContent = player.score;
        
        // Check for level up
        const newLevel = Math.floor(player.experience / 300) + 1;
        if (newLevel > player.level && player.levelUp()) {
            levelDisplay.textContent = player.level;
            vehicleNameDisplay.textContent = player.displayName;
            
            // Level up effect
            for (let i = 0; i < 10; i++) {
                explosions.push(new Explosion(player.x + Math.random() * 50 - 25, player.y + Math.random() * 50 - 25, 15));
            }
        }
    }
    
    explosions.push(new Explosion(
        players.find(p => p.id === data.victimId)?.x || 0,
        players.find(p => p.id === data.victimId)?.y || 0,
        35
    ));
});

// Game functions
function initGame() {
    const nameInput = document.getElementById('playerNameInput');
    playerName = nameInput.value.trim() || "Soldier" + Math.floor(Math.random() * 1000);
    
    player = new Vehicle(
        mapSize / 2, 
        mapSize / 2, 
        true, 
        playerId,
        selectedVehicle,
        getRandomColor(),
        playerName
    );
    
    socket.emit('join-game', {
        id: playerId,
        name: playerName,
        vehicleType: selectedVehicle,
        color: player.color
    });
    
    bullets = [];
    explosions = [];
    
    healthDisplay.textContent = Math.ceil(player.health);
    killsDisplay.textContent = player.kills;
    scoreDisplay.textContent = player.score;
    levelDisplay.textContent = player.level;
    vehicleNameDisplay.textContent = player.displayName;
    
    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;
}

function getRandomColor() {
    const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4'];
    return colors[Math.floor(Math.random() * colors.length)];
}

function updateLeaderboard() {
    leaderboardEntries.innerHTML = '';
    
    const sorted = [...leaderboard].sort((a, b) => b.score - a.score);
    const displayCount = Math.min(10, sorted.length);
    
    for (let i = 0; i < displayCount; i++) {
        const entry = sorted[i];
        const isYou = entry.id === playerId;
        
        const entryEl = document.createElement('div');
        entryEl.className = `leaderboard-entry ${isYou ? 'leaderboard-you' : ''}`;
        entryEl.innerHTML = `
            <div>
                <span class="leaderboard-rank">${i + 1}.</span>
                <span>${entry.name}</span>
                ${entry.level > 1 ? `<span class="level-badge">Lvl ${entry.level}</span>` : ''}
            </div>
            <div>${entry.score}</div>
        `;
        leaderboardEntries.appendChild(entryEl);
    }
}

function updateCamera() {
    if (player) {
        camera.x += (player.x - canvas.width / 2 - camera.x) * 0.1;
        camera.y += (player.y - canvas.height / 2 - camera.y) * 0.1;
        
        camera.x = Math.max(0, Math.min(mapSize - canvas.width, camera.x));
        camera.y = Math.max(0, Math.min(mapSize - canvas.height, camera.y));
    }
}

function drawMiniMap() {
    minimapCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    minimapCtx.fillRect(0, 0, minimap.width, minimap.height);
    
    const scale = minimap.width / mapSize;
    
    minimapCtx.fillStyle = '#666';
    obstacles.forEach(obstacle => {
        minimapCtx.fillRect(
            obstacle.x * scale - obstacle.width * scale / 2,
            obstacle.y * scale - obstacle.height * scale / 2,
            obstacle.width * scale,
            obstacle.height * scale
        );
    });
    
    resources.forEach(resource => {
        minimapCtx.fillStyle = resource.type === 'health' ? '#4CAF50' : '#FF9800';
        minimapCtx.beginPath();
        minimapCtx.arc(resource.x * scale, resource.y * scale, 2, 0, Math.PI * 2);
        minimapCtx.fill();
    });
    
    players.forEach(p => {
        minimapCtx.fillStyle = p.id === playerId ? '#ffd700' : 
                              p.vehicleType === 'tank' ? '#4CAF50' : 
                              p.vehicleType === 'jeep' ? '#FF9800' : 
                              p.vehicleType === 'apc' ? '#795548' : '#607D8B';
        minimapCtx.beginPath();
        minimapCtx.arc(p.x * scale, p.y * scale, 3, 0, Math.PI * 2);
        minimapCtx.fill();
        
        // Draw direction indicator
        minimapCtx.strokeStyle = 'white';
        minimapCtx.lineWidth = 1;
        minimapCtx.beginPath();
        minimapCtx.moveTo(p.x * scale, p.y * scale);
        minimapCtx.lineTo(
            p.x * scale + Math.cos(p.angle) * 8,
            p.y * scale + Math.sin(p.angle) * 8
        );
        minimapCtx.stroke();
    });
    
    minimapCtx.strokeStyle = '#ffd700';
    minimapCtx.lineWidth = 2;
    minimapCtx.strokeRect(
        camera.x * scale,
        camera.y * scale,
        canvas.width * scale,
        canvas.height * scale
    );
}

function showGameOver() {
    gameRunning = false;
    finalScoreDisplay.textContent = player.score;
    finalKillsDisplay.textContent = player.kills;
    finalLevelDisplay.textContent = player.level;
    survivalTimeDisplay.textContent = Math.floor((600 - gameTime) / 60) + 'm ' + ((600 - gameTime) % 60) + 's';
    gameOverScreen.classList.remove('hidden');
}

// Game loop
function gameLoop(timestamp) {
    if (!gameRunning) return;
    
    updateCamera();
    
    // Clear canvas with battlefield background
    ctx.fillStyle = '#2d5016';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    drawGrid();
    
    resources.forEach(resource => {
        resource.update();
        resource.draw();
    });
    
    ctx.fillStyle = '#5d4037';
    obstacles.forEach(obstacle => {
        const screenX = obstacle.x - camera.x;
        const screenY = obstacle.y - camera.y;
        
        if (screenX > -obstacle.width && screenX < canvas.width + obstacle.width &&
            screenY > -obstacle.height && screenY < canvas.height + obstacle.height) {
            ctx.fillRect(
                screenX - obstacle.width / 2,
                screenY - obstacle.height / 2,
                obstacle.width,
                obstacle.height
            );
            
            ctx.strokeStyle = '#3e2723';
            ctx.lineWidth = 2;
            ctx.strokeRect(
                screenX - obstacle.width / 2,
                screenY - obstacle.height / 2,
                obstacle.width,
                obstacle.height
            );
        }
    });
    
    players.forEach(p => {
        if (p.isPlayer) {
            p.update();
        }
        p.draw();
    });
    
    bullets.forEach(bullet => bullet.draw());
    
    for (let i = explosions.length - 1; i >= 0; i--) {
        const explosion = explosions[i];
        explosion.update();
        explosion.draw();
        
        if (explosion.isDone()) {
            explosions.splice(i, 1);
        }
    }
    
    drawMiniMap();
    
    requestAnimationFrame(gameLoop);
}

function drawGrid() {
    const gridSize = 100;
    const startX = Math.floor(camera.x / gridSize) * gridSize;
    const startY = Math.floor(camera.y / gridSize) * gridSize;
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    for (let x = startX; x < camera.x + canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x - camera.x, 0);
        ctx.lineTo(x - camera.x, canvas.height);
        ctx.stroke();
    }
    
    for (let y = startY; y < camera.y + canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y - camera.y);
        ctx.lineTo(canvas.width, y - camera.y);
        ctx.stroke();
    }
}

// Start game
startButton.addEventListener('click', () => {
    if (!selectedVehicle) {
        alert('Please select a vehicle!');
        return;
    }
    
    startScreen.style.display = 'none';
    initGame();
    gameRunning = true;
    requestAnimationFrame(gameLoop);
});

// Play again
playAgainButton.addEventListener('click', () => {
    gameOverScreen.classList.add('hidden');
    startScreen.style.display = 'flex';
});

window.addEventListener('beforeunload', () => {
    if (gameRunning) {
        socket.emit('leave-game', playerId);
    }
});

// Auto-select first vehicle
vehicleOptions[0].classList.add('selected');

// Enable start button after 3 seconds if no config received
setTimeout(() => {
    if (document.getElementById('startButton').disabled) {
        console.warn('Server config not received, using defaults');
        document.getElementById('startButton').disabled = false;
    }
}, 3000);