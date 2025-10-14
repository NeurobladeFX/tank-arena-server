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
const leaderboardEntries = document.getElementById('leaderboard-entries');
const finalScoreDisplay = document.getElementById('finalScore');
const finalKillsDisplay = document.getElementById('finalKills');
const survivalTimeDisplay = document.getElementById('survivalTime');

window.vehicleTypes = {
    tank: { health: 150, speed: 2, damage: 35, size: 45, color: '#4CAF50' },
    jeep: { health: 100, speed: 4, damage: 20, size: 35, color: '#FF9800' },
    apc: { health: 200, speed: 1.5, damage: 25, size: 50, color: '#795548' },
    artillery: { health: 120, speed: 1, damage: 50, size: 40, color: '#607D8B' }
};

// Mobile controls
const mobileControls = document.getElementById('mobileControls');
const movementJoystick = document.getElementById('movementJoystick');
const shootingJoystick = document.getElementById('shootingJoystick');
const shootButton = document.getElementById('shootButton');

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

// Input handling
const keys = {};
const mouse = { x: 0, y: 0, clicked: false };
const touch = {
    movement: { x: 0, y: 0, active: false },
    shooting: { x: 0, y: 0, active: false, angle: 0 }
};

// Detect mobile device
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Event listeners
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

// Touch events for mobile
if (isMobile) {
    mobileControls.style.display = 'flex';
    
    // Movement joystick
    movementJoystick.addEventListener('touchstart', handleJoystickStart);
    movementJoystick.addEventListener('touchmove', handleMovementJoystick);
    movementJoystick.addEventListener('touchend', handleJoystickEnd);
    
    // Shooting joystick
    shootingJoystick.addEventListener('touchstart', handleJoystickStart);
    shootingJoystick.addEventListener('touchmove', handleShootingJoystick);
    shootingJoystick.addEventListener('touchend', handleJoystickEnd);
    
    shootButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        mouse.clicked = true;
    });
    
    shootButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        mouse.clicked = false;
    });
}

function handleJoystickStart(e) {
    e.preventDefault();
}

function handleJoystickEnd(e) {
    e.preventDefault();
    if (e.target === movementJoystick) {
        touch.movement.active = false;
        touch.movement.x = 0;
        touch.movement.y = 0;
    } else {
        touch.shooting.active = false;
        touch.shooting.x = 0;
        touch.shooting.y = 0;
    }
}

function handleMovementJoystick(e) {
    e.preventDefault();
    const touchEvent = e.touches[0];
    const rect = movementJoystick.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const deltaX = touchEvent.clientX - centerX;
    const deltaY = touchEvent.clientY - centerY;
    const distance = Math.min(Math.sqrt(deltaX * deltaX + deltaY * deltaY), rect.width / 2);
    const angle = Math.atan2(deltaY, deltaX);
    
    touch.movement.active = true;
    touch.movement.x = Math.cos(angle) * (distance / (rect.width / 2));
    touch.movement.y = Math.sin(angle) * (distance / (rect.height / 2));
}

function handleShootingJoystick(e) {
    e.preventDefault();
    const touchEvent = e.touches[0];
    const rect = shootingJoystick.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const deltaX = touchEvent.clientX - centerX;
    const deltaY = touchEvent.clientY - centerY;
    
    touch.shooting.active = true;
    touch.shooting.angle = Math.atan2(deltaY, deltaX);
}

function handleShootingJoystick(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = shootingJoystick.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const deltaX = touch.clientX - centerX;
    const deltaY = touch.clientY - centerY;
    
    touch.shooting.active = true;
    touch.shooting.angle = Math.atan2(deltaY, deltaX);
}

// Vehicle selection
vehicleOptions.forEach(option => {
    option.addEventListener('click', () => {
        vehicleOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        selectedVehicle = option.dataset.vehicle;
    });
});

// Classes
class Vehicle {
    constructor(x, y, isPlayer = false, id = null, vehicleType = 'tank', color = null, name = '') {
        this.x = x;
        this.y = y;
        this.vehicleType = vehicleType;
        
        // Use default stats if vehicleTypes hasn't been received yet
        const defaultStats = {
            tank: { health: 150, speed: 2, damage: 35, size: 45, color: '#4CAF50' },
            jeep: { health: 100, speed: 4, damage: 20, size: 35, color: '#FF9800' },
            apc: { health: 200, speed: 1.5, damage: 25, size: 50, color: '#795548' },
            artillery: { health: 120, speed: 1, damage: 50, size: 40, color: '#607D8B' }
        };
        
        const stats = (window.vehicleTypes && window.vehicleTypes[vehicleType]) || defaultStats[vehicleType] || defaultStats.tank;
        
        this.width = stats.size;
        this.height = stats.size;
        this.angle = 0;
        this.speed = stats.speed;
        this.health = stats.health;
        this.maxHealth = stats.health;
        this.damage = stats.damage;
        this.isPlayer = isPlayer;
        this.color = color || stats.color;
        this.cooldown = 0;
        this.maxCooldown = vehicleType === 'artillery' ? 60 : 30;
        this.id = id;
        this.name = name;
        this.kills = 0;
        this.score = 0;
        this.experience = 0;
        this.level = 1;
    }
    update() {
        if (this.isPlayer) {
            let moved = false;
            let moveX = 0, moveY = 0;

            // Keyboard controls
            if (keys['w'] || keys['arrowup']) {
                moveY -= 1;
            }
            if (keys['s'] || keys['arrowdown']) {
                moveY += 1;
            }
            if (keys['a'] || keys['arrowleft']) {
                moveX -= 1;
            }
            if (keys['d'] || keys['arrowright']) {
                moveX += 1;
            }

            // Mobile controls
            if (touch.movement.active) {
                moveX += touch.movement.x;
                moveY += touch.movement.y;
            }

            // Normalize movement vector
            const length = Math.sqrt(moveX * moveX + moveY * moveY);
            if (length > 0) {
                moveX /= length;
                moveY /= length;
                
                this.x += moveX * this.speed;
                this.y += moveY * this.speed;
                this.angle = Math.atan2(moveY, moveX);
                moved = true;
            }

            // Aiming
            if (touch.shooting.active) {
                this.angle = touch.shooting.angle;
            } else if (mouse.x && mouse.y) {
                const dx = mouse.x - this.x;
                const dy = mouse.y - this.y;
                this.angle = Math.atan2(dy, dx);
            }

            // Shooting
            if ((mouse.clicked || touch.shooting.active) && this.cooldown <= 0) {
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
                    angle: this.angle
                });
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
        const bulletX = this.x + Math.cos(this.angle) * (this.width / 2 + 10);
        const bulletY = this.y + Math.sin(this.angle) * (this.height / 2 + 10);
        
        socket.emit('bullet-fired', {
            x: bulletX,
            y: bulletY,
            angle: this.angle,
            ownerId: this.id
        });
    }

    draw() {
        ctx.save();
        ctx.translate(this.x - camera.x, this.y - camera.y);
        ctx.rotate(this.angle);
        
        // Draw vehicle body based on type
        switch (this.vehicleType) {
            case 'tank':
                this.drawTank();
                break;
            case 'jeep':
                this.drawJeep();
                break;
            case 'apc':
                this.drawAPC();
                break;
            case 'artillery':
                this.drawArtillery();
                break;
        }
        
        ctx.restore();

        // Draw name and health bar
        this.drawUI();
    }

    drawTank() {
        // Tank body
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
        
        // Tank turret
        ctx.fillStyle = '#333';
        ctx.fillRect(-8, -20, 16, 40);
        
        // Tank barrel
        ctx.fillStyle = '#666';
        ctx.fillRect(0, -5, 30, 10);
    }

    drawJeep() {
        // Jeep body
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
        
        // Jeep details
        ctx.fillStyle = '#333';
        ctx.fillRect(-this.width/2, -this.height/2, this.width, 10); // Roof
        ctx.fillRect(-this.width/2 + 5, this.height/2 - 15, this.width - 10, 5); // Bumper
    }

    drawAPC() {
        // APC body
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
        
        // APC turret
        ctx.fillStyle = '#555';
        ctx.fillRect(-10, -15, 20, 30);
        
        // APC details
        ctx.fillStyle = '#333';
        ctx.fillRect(-this.width/2 + 5, -this.height/2 + 5, this.width - 10, 8); // Armor
    }

    drawArtillery() {
        // Artillery body
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
        
        // Artillery barrel
        ctx.fillStyle = '#666';
        ctx.fillRect(0, -3, 40, 6);
        
        // Artillery base
        ctx.fillStyle = '#555';
        ctx.fillRect(-15, 5, 30, 10);
    }

    drawUI() {
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;

        // Draw name
        if (this.name) {
            ctx.fillStyle = 'white';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(this.name, screenX, screenY - this.height/2 - 20);
        }

        // Draw health bar for enemies or if player is damaged
        if (!this.isPlayer || this.health < this.maxHealth) {
            const barWidth = 40;
            const barHeight = 4;
            const healthPercent = this.health / this.maxHealth;
            
            ctx.fillStyle = 'red';
            ctx.fillRect(screenX - barWidth/2, screenY - this.height/2 - 10, barWidth, barHeight);
            ctx.fillStyle = 'green';
            ctx.fillRect(screenX - barWidth/2, screenY - this.height/2 - 10, barWidth * healthPercent, barHeight);
        }

        // Draw level for high-level players
        if (this.level > 1) {
            ctx.fillStyle = '#ffd700';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`Lvl ${this.level}`, screenX, screenY - this.height/2 - 30);
        }
    }
}

class Bullet {
    constructor(x, y, angle, ownerId, damage) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = 8;
        this.size = 4;
        this.ownerId = ownerId;
        this.damage = damage;
    }

    draw() {
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;
        
        ctx.fillStyle = '#FFEB3B';
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Bullet trail
        ctx.strokeStyle = 'rgba(255, 100, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(screenX, screenY);
        ctx.lineTo(
            screenX - Math.cos(this.angle) * 10,
            screenY - Math.sin(this.angle) * 10
        );
        ctx.stroke();
    }
}

class Resource {
    constructor(x, y, type, value) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.value = value;
        this.size = 15;
        this.pulse = 0;
    }

    update() {
        this.pulse = (this.pulse + 0.1) % (Math.PI * 2);
    }

    draw() {
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;
        const pulseSize = this.size + Math.sin(this.pulse) * 3;

        if (this.type === 'health') {
            // Health pack
            ctx.fillStyle = '#4CAF50';
            ctx.beginPath();
            ctx.moveTo(screenX, screenY - pulseSize);
            ctx.lineTo(screenX + pulseSize, screenY);
            ctx.lineTo(screenX, screenY + pulseSize);
            ctx.lineTo(screenX - pulseSize, screenY);
            ctx.closePath();
            ctx.fill();
            
            ctx.fillStyle = 'white';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('+', screenX, screenY + 4);
        } else {
            // Ammo crate
            ctx.fillStyle = '#FF9800';
            ctx.fillRect(screenX - pulseSize/2, screenY - pulseSize/2, pulseSize, pulseSize);
            
            ctx.fillStyle = 'white';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('A', screenX, screenY + 3);
        }
    }
}

class Explosion {
    constructor(x, y, size) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.maxSize = size * 3;
        this.currentSize = size;
        this.growing = true;
        this.particles = [];
        this.createParticles();
    }

    createParticles() {
        for (let i = 0; i < 15; i++) {
            this.particles.push({
                x: this.x,
                y: this.y,
                angle: Math.random() * Math.PI * 2,
                speed: Math.random() * 5 + 2,
                size: Math.random() * 3 + 1,
                life: 1
            });
        }
    }

    update() {
        if (this.growing) {
            this.currentSize += 2;
            if (this.currentSize >= this.maxSize) {
                this.growing = false;
            }
        } else {
            this.currentSize -= 1;
        }

        // Update particles
        this.particles.forEach(particle => {
            particle.x += Math.cos(particle.angle) * particle.speed;
            particle.y += Math.sin(particle.angle) * particle.speed;
            particle.life -= 0.02;
            particle.size -= 0.1;
        });

        this.particles = this.particles.filter(p => p.life > 0 && p.size > 0);
    }

    draw() {
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;

        // Main explosion
        const gradient = ctx.createRadialGradient(
            screenX, screenY, 0,
            screenX, screenY, this.currentSize
        );
        gradient.addColorStop(0, 'rgba(255, 100, 0, 0.8)');
        gradient.addColorStop(0.7, 'rgba(255, 50, 0, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.currentSize, 0, Math.PI * 2);
        ctx.fill();

        // Particles
        this.particles.forEach(particle => {
            const particleX = particle.x - camera.x;
            const particleY = particle.y - camera.y;
            
            ctx.fillStyle = `rgba(255, ${Math.random() * 100 + 155}, 0, ${particle.life})`;
            ctx.beginPath();
            ctx.arc(particleX, particleY, particle.size, 0, Math.PI * 2);
            ctx.fill();
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
    window.vehicleTypes = { ...window.vehicleTypes, ...config.vehicleTypes };
    mapSize = config.mapSize;

    document.getElementById('startButton').disabled = false;
});

socket.on('game-state', (gameState) => {
    if (!gameRunning) return;
    
    // Update players
    players = Object.values(gameState.players).map(playerData => {
        if (playerData.id === playerId) {
            if (player) {
                // Update player stats from server
                player.health = playerData.health;
                player.kills = playerData.kills;
                player.score = playerData.score;
                player.experience = playerData.experience;
                player.level = playerData.level;
                
                healthDisplay.textContent = player.health;
                killsDisplay.textContent = player.kills;
                scoreDisplay.textContent = player.score;
                levelDisplay.textContent = player.level;
            }
            return player;
        }
        return new Vehicle(
            playerData.x, 
            playerData.y, 
            false, 
            playerData.id, 
            playerData.vehicleType, 
            playerData.color, 
            playerData.name
        );
    });
    
    // Update bullets
    bullets = gameState.bullets.map(bulletData => {
        return new Bullet(
            bulletData.x, 
            bulletData.y, 
            bulletData.angle, 
            bulletData.ownerId,
            bulletData.damage
        );
    });
    
    // Update obstacles and resources
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
        healthDisplay.textContent = player.health;
        explosions.push(new Explosion(data.x, data.y, 20));
        
        if (player.health <= 0) {
            setTimeout(() => {
                showGameOver();
            }, 1000);
        }
    } else {
        explosions.push(new Explosion(data.x, data.y, 15));
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
        const newLevel = Math.floor(player.experience / 100) + 1;
        if (newLevel > player.level) {
            player.level = newLevel;
            levelDisplay.textContent = player.level;
            // You could add level-up effects here
        }
        
        socket.emit('score-update', { 
            id: playerId, 
            score: player.score,
            kills: player.kills,
            experience: player.experience,
            level: player.level
        });
    }
    
    explosions.push(new Explosion(
        players.find(p => p.id === data.victimId)?.x || 0,
        players.find(p => p.id === data.victimId)?.y || 0,
        30
    ));
});

socket.on('game-full', () => {
    alert('Game is full! Please try again later.');
    startScreen.style.display = 'flex';
    gameRunning = false;
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
    
    healthDisplay.textContent = player.health;
    killsDisplay.textContent = player.kills;
    scoreDisplay.textContent = player.score;
    levelDisplay.textContent = player.level;
    
    // Center camera on player
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
            </div>
            <div>${entry.score}</div>
        `;
        leaderboardEntries.appendChild(entryEl);
    }
}

function updateCamera() {
    if (player) {
        // Smooth camera follow
        camera.x += (player.x - canvas.width / 2 - camera.x) * 0.1;
        camera.y += (player.y - canvas.height / 2 - camera.y) * 0.1;
        
        // Keep camera within map bounds
        camera.x = Math.max(0, Math.min(mapSize - canvas.width, camera.x));
        camera.y = Math.max(0, Math.min(mapSize - canvas.height, camera.y));
    }
}

function drawMiniMap() {
    // Clear minimap
    minimapCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    minimapCtx.fillRect(0, 0, minimap.width, minimap.height);
    
    const scale = minimap.width / mapSize;
    
    // Draw obstacles
    minimapCtx.fillStyle = '#666';
    obstacles.forEach(obstacle => {
        minimapCtx.fillRect(
            obstacle.x * scale - obstacle.width * scale / 2,
            obstacle.y * scale - obstacle.height * scale / 2,
            obstacle.width * scale,
            obstacle.height * scale
        );
    });
    
    // Draw resources
    resources.forEach(resource => {
        minimapCtx.fillStyle = resource.type === 'health' ? '#4CAF50' : '#FF9800';
        minimapCtx.beginPath();
        minimapCtx.arc(resource.x * scale, resource.y * scale, 3, 0, Math.PI * 2);
        minimapCtx.fill();
    });
    
    // Draw players
    players.forEach(p => {
        minimapCtx.fillStyle = p.id === playerId ? '#ffd700' : (p.vehicleType === 'tank' ? '#4CAF50' : 
                           p.vehicleType === 'jeep' ? '#FF9800' : 
                           p.vehicleType === 'apc' ? '#795548' : '#607D8B');
        minimapCtx.beginPath();
        minimapCtx.arc(p.x * scale, p.y * scale, 3, 0, Math.PI * 2);
        minimapCtx.fill();
    });
    
    // Draw viewport rectangle
    minimapCtx.strokeStyle = '#ffd700';
    minimapCtx.lineWidth = 2;
    minimapCtx.strokeRect(
        camera.x * scale,
        camera.y * scale,
        canvas.width * scale,
        canvas.height * scale
    );
}

function checkResourceCollection() {
    if (!player) return;
    
    resources.forEach((resource, index) => {
        const dx = resource.x - player.x;
        const dy = resource.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < player.width + resource.size) {
            socket.emit('collect-resource', {
                playerId: player.id,
                resource: resource
            });
            explosions.push(new Explosion(resource.x, resource.y, 10));
            resources.splice(index, 1);
        }
    });
}

function showGameOver() {
    gameRunning = false;
    finalScoreDisplay.textContent = player.score;
    finalKillsDisplay.textContent = player.kills;
    survivalTimeDisplay.textContent = Math.floor((600 - gameTime) / 60) + 'm ' + ((600 - gameTime) % 60) + 's';
    gameOverScreen.classList.remove('hidden');
}

// Game loop
function gameLoop(timestamp) {
    if (!gameRunning) return;
    
    // Update camera
    updateCamera();
    
    // Clear canvas with gradient background
    ctx.fillStyle = '#2d5016';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid for perspective
    drawGrid();
    
    // Update and draw resources
    resources.forEach(resource => {
        resource.update();
        resource.draw();
    });
    
    // Draw obstacles
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
            
            // Add texture to obstacles
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
    
    // Update and draw players
    players.forEach(p => {
        if (p.isPlayer) {
            p.update();
        }
        p.draw();
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
    
    // Check resource collection
    checkResourceCollection();
    
    // Draw minimap
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

// Handle window close
window.addEventListener('beforeunload', () => {
    if (gameRunning) {
        socket.emit('leave-game', playerId);
    }
});

// Auto-select first vehicle
vehicleOptions[0].classList.add('selected');
