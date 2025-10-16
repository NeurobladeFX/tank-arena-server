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

// Socket.io connection with better error handling
const socket = io({
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 10000
});

socket.on('connect_error', (error) => {
    console.error('Connection failed:', error);
    alert('Failed to connect to game server. Please refresh and try again.');
});

socket.on('disconnect', (reason) => {
    console.log('Disconnected from server:', reason);
    if (gameRunning) {
        alert('Disconnected from server. Game paused.');
        gameRunning = false;
    }
});

socket.on('reconnect', (attemptNumber) => {
    console.log('Reconnected to server after', attemptNumber, 'attempts');
    if (!gameRunning && player) {
        gameRunning = true;
        requestAnimationFrame(gameLoop);
    }
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
let mapSize = 4000;
let startTime = Date.now();
let lastUpdateTime = Date.now();
let fps = 0;
let frameCount = 0;

// Image cache with better management
const imageCache = new Map();

// Enhanced Vehicle System with better balancing
const vehicleSystem = {
    tank: {
        base: { name: "Light Tank", health: 150, damage: 35, speed: 2, rotationSpeed: 0.03, size: 70, fireRate: 1.0 },
        upgrades: {
            2: { name: "Medium Tank", health: 200, damage: 45, speed: 2.2, rotationSpeed: 0.035, size: 75, fireRate: 1.1 },
            3: { name: "Heavy Tank", health: 280, damage: 55, speed: 2.3, rotationSpeed: 0.04, size: 80, fireRate: 1.2 },
            4: { name: "Battle Tank", health: 350, damage: 65, speed: 2.4, rotationSpeed: 0.045, size: 85, fireRate: 1.3 },
            5: { name: "Elite Tank", health: 450, damage: 80, speed: 2.5, rotationSpeed: 0.05, size: 90, fireRate: 1.5 }
        }
    },
    jeep: {
        base: { name: "Scout Jeep", health: 100, damage: 20, speed: 4, rotationSpeed: 0.05, size: 55, fireRate: 1.2 },
        upgrades: {
            2: { name: "Combat Jeep", health: 130, damage: 25, speed: 4.5, rotationSpeed: 0.055, size: 58, fireRate: 1.3 },
            3: { name: "Assault Jeep", health: 170, damage: 30, speed: 5.0, rotationSpeed: 0.06, size: 62, fireRate: 1.4 },
            4: { name: "Raider Jeep", health: 220, damage: 35, speed: 5.5, rotationSpeed: 0.065, size: 65, fireRate: 1.5 },
            5: { name: "Commando Jeep", health: 280, damage: 40, speed: 6.0, rotationSpeed: 0.07, size: 70, fireRate: 1.7 }
        }
    },
    apc: {
        base: { name: "Armored APC", health: 200, damage: 25, speed: 1.5, rotationSpeed: 0.025, size: 80, fireRate: 0.8 },
        upgrades: {
            2: { name: "Heavy APC", health: 280, damage: 30, speed: 1.7, rotationSpeed: 0.03, size: 85, fireRate: 0.9 },
            3: { name: "Battle APC", health: 350, damage: 35, speed: 1.9, rotationSpeed: 0.035, size: 90, fireRate: 1.0 },
            4: { name: "Assault APC", health: 450, damage: 40, speed: 2.1, rotationSpeed: 0.04, size: 95, fireRate: 1.1 },
            5: { name: "Titan APC", health: 550, damage: 50, speed: 2.3, rotationSpeed: 0.045, size: 100, fireRate: 1.2 }
        }
    },
    artillery: {
        base: { name: "Field Artillery", health: 120, damage: 50, speed: 1, rotationSpeed: 0.02, size: 70, fireRate: 0.5 },
        upgrades: {
            2: { name: "Heavy Artillery", health: 160, damage: 65, speed: 1.1, rotationSpeed: 0.025, size: 75, fireRate: 0.6 },
            3: { name: "Siege Artillery", health: 210, damage: 80, speed: 1.2, rotationSpeed: 0.03, size: 80, fireRate: 0.7 },
            4: { name: "Mobile Artillery", health: 270, damage: 95, speed: 1.3, rotationSpeed: 0.035, size: 85, fireRate: 0.8 },
            5: { name: "Super Artillery", health: 340, damage: 120, speed: 1.4, rotationSpeed: 0.04, size: 90, fireRate: 0.9 }
        }
    },
    helicopter: {
        base: { name: "Scout Helicopter", health: 80, damage: 15, speed: 3.5, rotationSpeed: 0.06, size: 60, fireRate: 2.0 },
        upgrades: {
            2: { name: "Attack Helicopter", health: 110, damage: 20, speed: 3.8, rotationSpeed: 0.065, size: 65, fireRate: 2.2 },
            3: { name: "Gunship Helicopter", health: 150, damage: 25, speed: 4.0, rotationSpeed: 0.07, size: 70, fireRate: 2.4 },
            4: { name: "Heavy Gunship", health: 200, damage: 30, speed: 4.2, rotationSpeed: 0.075, size: 75, fireRate: 2.6 },
            5: { name: "Elite Helicopter", health: 260, damage: 35, speed: 4.5, rotationSpeed: 0.08, size: 80, fireRate: 2.8 }
        }
    },
    mech: {
        base: { name: "Combat Mech", health: 180, damage: 40, speed: 1.8, rotationSpeed: 0.04, size: 65, fireRate: 0.9 },
        upgrades: {
            2: { name: "Assault Mech", health: 240, damage: 50, speed: 1.9, rotationSpeed: 0.045, size: 70, fireRate: 1.0 },
            3: { name: "Heavy Mech", health: 320, damage: 60, speed: 2.0, rotationSpeed: 0.05, size: 75, fireRate: 1.1 },
            4: { name: "Battle Mech", health: 400, damage: 70, speed: 2.1, rotationSpeed: 0.055, size: 80, fireRate: 1.2 },
            5: { name: "Titan Mech", health: 500, damage: 85, speed: 2.2, rotationSpeed: 0.06, size: 85, fireRate: 1.3 }
        }
    }
};

// Input handling with better key management
const keys = {};
const mouse = { x: 0, y: 0, clicked: false };
const touch = {
    active: false,
    x: 0,
    y: 0,
    startX: 0,
    startY: 0,
    moveX: 0,
    moveY: 0
};

// Detect mobile device
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Enhanced event listeners
document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (!keys[key]) {
        keys[key] = true;
        handleSpecialInput(key);
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left + camera.x;
    mouse.y = e.clientY - rect.top + camera.y;
});

// Enhanced mobile controls
if (isMobile) {
    mobileControls.style.display = 'block';
    
    let touchStartTime = 0;
    
    touchArea.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touchEvent = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        touch.active = true;
        touch.startX = touchEvent.clientX - rect.left;
        touch.startY = touchEvent.clientY - rect.top;
        touch.x = touch.startX;
        touch.y = touch.startY;
        touchStartTime = Date.now();
    });
    
    touchArea.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!touch.active) return;
        
        const touchEvent = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        touch.x = touchEvent.clientX - rect.left;
        touch.y = touchEvent.clientY - rect.top;
        
        touch.moveX = (touch.x - touch.startX) * 0.015;
        touch.moveY = (touch.y - touch.startY) * 0.015;
    });
    
    touchArea.addEventListener('touchend', (e) => {
        e.preventDefault();
        touch.active = false;
        touch.moveX = 0;
        touch.moveY = 0;
    });
    
    fireButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        mouse.clicked = true;
        fireButton.style.transform = 'scale(0.9)';
        fireButton.style.boxShadow = '0 0 40px rgba(255, 0, 0, 0.8)';
    });
    
    fireButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        mouse.clicked = false;
        fireButton.style.transform = 'scale(1)';
        fireButton.style.boxShadow = '0 0 30px rgba(255, 0, 0, 0.6)';
    });
    
    // Prevent context menu
    touchArea.addEventListener('contextmenu', (e) => e.preventDefault());
    fireButton.addEventListener('contextmenu', (e) => e.preventDefault());
} else {
    canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0) mouse.clicked = true;
    });
    
    canvas.addEventListener('mouseup', (e) => {
        if (e.button === 0) mouse.clicked = false;
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

// Enhanced Vehicle class
class Vehicle {
    constructor(x, y, isPlayer = false, id = null, vehicleType = 'tank', color = null, name = '') {
        this.x = x;
        this.y = y;
        this.vehicleType = vehicleType;
        this.level = 1;
        
        this.updateStats();
        
        this.angle = 0;
        this.turretAngle = 0;
        this.isPlayer = isPlayer;
        this.color = color || this.getDefaultColor();
        this.cooldown = 0;
        this.id = id;
        this.name = name;
        this.kills = 0;
        this.score = 0;
        this.experience = 0;
        this.specialAbilityCooldown = 0;
        this.specialAbilityActive = false;
        this.specialAbilityDuration = 0;
        
        // Movement state
        this.movingForward = false;
        this.movingBackward = false;
        this.turningLeft = false;
        this.turningRight = false;
        
        // Image loading
        this.bodyImageLoaded = false;
        this.turretImageLoaded = false;
        this.loadVehicleImages();
    }
    
    getDefaultColor() {
        const colors = {
            tank: '#4CAF50',
            jeep: '#2196F3', 
            apc: '#FF9800',
            artillery: '#9C27B0',
            helicopter: '#00BCD4',
            mech: '#F44336'
        };
        return colors[this.vehicleType] || '#4CAF50';
    }
    
    loadVehicleImages() {
        const imagePath = this.getImagePath();
        
        if (imageCache.has(imagePath)) {
            const cached = imageCache.get(imagePath);
            this.bodyImage = cached.body;
            this.turretImage = cached.turret;
            this.bodyImageLoaded = cached.bodyLoaded;
            this.turretImageLoaded = cached.turretLoaded;
            return;
        }
        
        this.bodyImage = new Image();
        this.turretImage = new Image();
        
        this.bodyImage.onload = () => {
            this.bodyImageLoaded = true;
            if (imageCache.has(imagePath)) {
                imageCache.get(imagePath).bodyLoaded = true;
            }
        };
        
        this.bodyImage.onerror = () => {
            this.bodyImageLoaded = false;
        };
        
        this.turretImage.onload = () => {
            this.turretImageLoaded = true;
        };
        
        this.turretImage.onerror = () => {
            this.turretImageLoaded = false;
        };
        
        imageCache.set(imagePath, {
            body: this.bodyImage,
            turret: this.turretImage,
            bodyLoaded: false,
            turretLoaded: false
        });
        
        // Try to load images (they won't exist, so we'll use colored shapes)
        this.bodyImage.src = `assets/${imagePath}_body.png`;
        this.turretImage.src = `assets/${imagePath}_turret.png`;
    }
    
    getImagePath() {
        const baseTypes = {
            tank: ['tank_basic', 'tank_medium', 'tank_heavy', 'tank_battle', 'tank_elite'],
            jeep: ['jeep_basic', 'jeep_combat', 'jeep_assault', 'jeep_raider', 'jeep_commando'],
            apc: ['apc_basic', 'apc_heavy', 'apc_battle', 'apc_assault', 'apc_titan'],
            artillery: ['artillery_basic', 'artillery_heavy', 'artillery_siege', 'artillery_mobile', 'artillery_super'],
            helicopter: ['helicopter_basic', 'helicopter_attack', 'helicopter_gunship', 'helicopter_heavy', 'helicopter_elite'],
            mech: ['mech_basic', 'mech_assault', 'mech_heavy', 'mech_battle', 'mech_titan']
        };
        
        const typeArray = baseTypes[this.vehicleType] || baseTypes.tank;
        const levelIndex = Math.min(this.level - 1, typeArray.length - 1);
        return typeArray[levelIndex];
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
            this.displayName = stats.name;
        }
        
        this.width = stats.size;
        this.height = stats.size;
        this.speed = stats.speed;
        this.rotationSpeed = stats.rotationSpeed;
        this.maxHealth = stats.health;
        this.damage = stats.damage;
        this.fireRate = stats.fireRate;
        this.maxCooldown = 60 / this.fireRate;
        
        if (!this.health || this.health < 0) {
            this.health = this.maxHealth;
        }
    }
    
    levelUp() {
        if (this.level < 5) {
            this.level++;
            const oldHealth = this.health;
            const healthPercent = oldHealth / this.maxHealth;
            this.updateStats();
            this.health = this.maxHealth * healthPercent;
            
            const imagePath = this.getImagePath();
            if (!imageCache.has(imagePath)) {
                this.loadVehicleImages();
            } else {
                const cached = imageCache.get(imagePath);
                this.bodyImage = cached.body;
                this.turretImage = cached.turret;
                this.bodyImageLoaded = cached.bodyLoaded;
                this.turretImageLoaded = cached.turretLoaded;
            }
            
            if (this.isPlayer) {
                this.createLevelUpEffect();
            }
            return true;
        }
        return false;
    }
    
    createLevelUpEffect() {
        for (let i = 0; i < 15; i++) {
            explosions.push(new Explosion(
                this.x + Math.random() * 80 - 40, 
                this.y + Math.random() * 80 - 40, 
                20,
                '#4CAF50'
            ));
        }
    }
    
    activateSpecialAbility() {
        if (this.specialAbilityCooldown <= 0) {
            this.specialAbilityActive = true;
            this.specialAbilityDuration = 180;
            this.specialAbilityCooldown = 600;
            
            switch(this.vehicleType) {
                case 'tank':
                    this.damage *= 1.5;
                    break;
                case 'jeep':
                    this.speed *= 1.5;
                    break;
                case 'apc':
                    this.tempShield = this.maxHealth * 0.5;
                    break;
                case 'artillery':
                    this.fireRate *= 2;
                    this.maxCooldown = 60 / this.fireRate;
                    break;
                case 'helicopter':
                    this.stealth = true;
                    break;
                case 'mech':
                    this.areaDamage = true;
                    break;
            }
            
            socket.emit('special-ability-used', {
                playerId: this.id,
                vehicleType: this.vehicleType
            });
            
            return true;
        }
        return false;
    }
    
    deactivateSpecialAbility() {
        this.specialAbilityActive = false;
        
        switch(this.vehicleType) {
            case 'tank':
                this.damage = vehicleSystem[this.vehicleType].upgrades[this.level]?.damage || 
                             vehicleSystem[this.vehicleType].base.damage;
                break;
            case 'jeep':
                this.speed = vehicleSystem[this.vehicleType].upgrades[this.level]?.speed || 
                            vehicleSystem[this.vehicleType].base.speed;
                break;
            case 'apc':
                this.tempShield = 0;
                break;
            case 'artillery':
                this.fireRate = vehicleSystem[this.vehicleType].upgrades[this.level]?.fireRate || 
                              vehicleSystem[this.vehicleType].base.fireRate;
                this.maxCooldown = 60 / this.fireRate;
                break;
            case 'helicopter':
                this.stealth = false;
                break;
            case 'mech':
                this.areaDamage = false;
                break;
        }
    }

    update() {
        if (this.isPlayer) {
            this.handlePlayerInput();
        }

        // Keep vehicle in bounds
        this.x = Math.max(this.width/2, Math.min(mapSize - this.width/2, this.x));
        this.y = Math.max(this.height/2, Math.min(mapSize - this.height/2, this.y));

        // Update cooldowns
        this.updateCooldowns();
    }
    
    handlePlayerInput() {
        let moved = false;

        if (!isMobile) {
            // Desktop controls
            this.movingForward = keys['w'] || keys['arrowup'];
            this.movingBackward = keys['s'] || keys['arrowdown'];
            this.turningLeft = keys['a'] || keys['arrowleft'];
            this.turningRight = keys['d'] || keys['arrowright'];
            
            if (this.turningLeft) {
                this.angle -= this.rotationSpeed;
                moved = true;
            }
            if (this.turningRight) {
                this.angle += this.rotationSpeed;
                moved = true;
            }
            
            if (this.movingForward) {
                this.x += Math.cos(this.angle) * this.speed;
                this.y += Math.sin(this.angle) * this.speed;
                moved = true;
            }
            if (this.movingBackward) {
                this.x -= Math.cos(this.angle) * this.speed * 0.7;
                this.y -= Math.sin(this.angle) * this.speed * 0.7;
                moved = true;
            }

            // Mouse aiming
            if (mouse.x && mouse.y) {
                const dx = mouse.x - this.x;
                const dy = mouse.y - this.y;
                this.turretAngle = Math.atan2(dy, dx);
            }
        } else {
            // Mobile controls
            if (touch.active) {
                const dx = touch.moveX;
                const dy = touch.moveY;
                
                if (Math.abs(dx) > 0.05) {
                    this.angle += dx * this.rotationSpeed * 8;
                    moved = true;
                }
                
                if (Math.abs(dy) > 0.05) {
                    this.x += Math.cos(this.angle) * dy * this.speed * 8;
                    this.y += Math.sin(this.angle) * dy * this.speed * 8;
                    moved = true;
                }
                
                this.turretAngle = this.angle;
            }
        }

        // Send update to server if moved
        if (moved) {
            socket.emit('player-update', {
                id: this.id,
                x: this.x,
                y: this.y,
                angle: this.angle,
                turretAngle: this.turretAngle,
                level: this.level
            });
        }

        // Shooting
        if (mouse.clicked && this.cooldown <= 0) {
            this.shoot();
            this.cooldown = this.maxCooldown;
            mouse.clicked = false;
        }
    }
    
    updateCooldowns() {
        if (this.cooldown > 0) {
            this.cooldown--;
        }
        
        if (this.specialAbilityCooldown > 0) {
            this.specialAbilityCooldown--;
        }
        
        if (this.specialAbilityActive) {
            this.specialAbilityDuration--;
            if (this.specialAbilityDuration <= 0) {
                this.deactivateSpecialAbility();
            }
        }
    }

    shoot() {
        const bulletX = this.x + Math.cos(this.turretAngle) * (this.width / 2 + 15);
        const bulletY = this.y + Math.sin(this.turretAngle) * (this.height / 2 + 15);
        
        socket.emit('bullet-fired', {
            x: bulletX,
            y: bulletY,
            angle: this.turretAngle,
            ownerId: this.id,
            damage: this.damage
        });
        
        // Visual muzzle flash
        explosions.push(new Explosion(
            bulletX - Math.cos(this.turretAngle) * 10,
            bulletY - Math.sin(this.turretAngle) * 10,
            8,
            '#FF9800'
        ));
    }

    draw() {
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;

        if (this.stealth && this.isPlayer) {
            ctx.save();
            ctx.globalAlpha = 0.3;
        }

        ctx.save();
        ctx.translate(screenX, screenY);
        
        // Draw vehicle body
        ctx.save();
        ctx.rotate(this.angle);
        if (this.bodyImageLoaded) {
            ctx.drawImage(this.bodyImage, -this.width/2, -this.height/2, this.width, this.height);
        } else {
            ctx.fillStyle = this.color;
            ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
            
            ctx.fillStyle = '#333';
            ctx.fillRect(-this.width/4, -this.height/4, this.width/2, this.height/2);
        }
        ctx.restore();
        
        // Draw turret
        ctx.save();
        ctx.rotate(this.turretAngle);
        if (this.turretImageLoaded) {
            const turretSize = this.width * 0.7;
            ctx.drawImage(this.turretImage, -turretSize/2, -turretSize/2, turretSize, turretSize);
        } else {
            ctx.fillStyle = '#333';
            ctx.fillRect(0, -3, this.width/2 + 10, 6);
            
            ctx.fillStyle = '#555';
            ctx.beginPath();
            ctx.arc(0, 0, 8, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
        
        ctx.restore();

        if (this.specialAbilityActive) {
            this.drawSpecialAbilityEffect(screenX, screenY);
        }

        this.drawUI(screenX, screenY);
        
        if (this.stealth) {
            ctx.restore();
        }
    }
    
    drawSpecialAbilityEffect(screenX, screenY) {
        ctx.save();
        ctx.globalAlpha = 0.6;
        
        switch(this.vehicleType) {
            case 'tank':
                ctx.strokeStyle = '#FF4444';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(screenX, screenY, this.width, 0, Math.PI * 2);
                ctx.stroke();
                break;
            case 'jeep':
                ctx.strokeStyle = '#44FF44';
                for (let i = 0; i < 8; i++) {
                    const angle = (Math.PI * 2 / 8) * i;
                    ctx.beginPath();
                    ctx.moveTo(screenX, screenY);
                    ctx.lineTo(
                        screenX + Math.cos(angle) * (this.width + 20),
                        screenY + Math.sin(angle) * (this.width + 20)
                    );
                    ctx.stroke();
                }
                break;
            case 'apc':
                ctx.strokeStyle = '#4444FF';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(screenX, screenY, this.width * 0.8, 0, Math.PI * 2);
                ctx.stroke();
                break;
            case 'artillery':
                for (let i = 0; i < 5; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = Math.random() * this.width;
                    ctx.fillStyle = '#FFAA00';
                    ctx.beginPath();
                    ctx.arc(
                        screenX + Math.cos(angle) * dist,
                        screenY + Math.sin(angle) * dist,
                        3, 0, Math.PI * 2
                    );
                    ctx.fill();
                }
                break;
            case 'helicopter':
                ctx.strokeStyle = '#AAAAAA';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.arc(screenX, screenY, this.width, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
                break;
            case 'mech':
                const gradient = ctx.createRadialGradient(
                    screenX, screenY, this.width * 0.5,
                    screenX, screenY, this.width * 1.5
                );
                gradient.addColorStop(0, 'rgba(255, 100, 100, 0.8)');
                gradient.addColorStop(1, 'rgba(255, 100, 100, 0)');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(screenX, screenY, this.width * 1.5, 0, Math.PI * 2);
                ctx.fill();
                break;
        }
        
        ctx.restore();
    }

    drawUI(screenX, screenY) {
        // Draw name and level
        if (this.name) {
            ctx.fillStyle = 'white';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(this.name, screenX, screenY - this.height/2 - 25);
            
            if (this.level > 1) {
                ctx.fillStyle = '#ffd700';
                ctx.font = '10px Arial';
                ctx.fillText(`Lvl ${this.level}`, screenX, screenY - this.height/2 - 10);
            }
        }

        // Draw health bar
        const barWidth = 50;
        const barHeight = 5;
        const healthPercent = Math.max(0, this.health / this.maxHealth);
        
        ctx.fillStyle = 'red';
        ctx.fillRect(screenX - barWidth/2, screenY - this.height/2 - 35, barWidth, barHeight);
        ctx.fillStyle = healthPercent > 0.3 ? 'green' : 'yellow';
        ctx.fillRect(screenX - barWidth/2, screenY - this.height/2 - 35, barWidth * healthPercent, barHeight);
        
        // Draw shield bar if active
        if (this.tempShield > 0) {
            const shieldPercent = this.tempShield / (this.maxHealth * 0.5);
            ctx.fillStyle = 'rgba(0, 100, 255, 0.5)';
            ctx.fillRect(screenX - barWidth/2, screenY - this.height/2 - 40, barWidth * shieldPercent, 3);
        }
        
        // Draw special ability cooldown
        if (this.specialAbilityCooldown > 0 && this.isPlayer) {
            const cooldownPercent = this.specialAbilityCooldown / 600;
            ctx.fillStyle = 'rgba(255, 215, 0, 0.7)';
            ctx.fillRect(screenX - barWidth/2, screenY + this.height/2 + 10, barWidth * (1 - cooldownPercent), 4);
        }
    }
}

// Enhanced Bullet class
class Bullet {
    constructor(x, y, angle, ownerId, damage, bulletType = 'normal') {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = 8;
        this.size = 6;
        this.ownerId = ownerId;
        this.damage = damage;
        this.bulletType = bulletType;
        this.trail = [];
        this.maxTrail = 5;
        this.lifeTime = 120; // bullets disappear after 2 seconds
    }
    
    update() {
        this.lifeTime--;
        this.trail.push({x: this.x, y: this.y});
        if (this.trail.length > this.maxTrail) {
            this.trail.shift();
        }
        
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        
        // Remove if out of bounds or lifetime expired
        return this.x > 0 && this.x < mapSize && this.y > 0 && this.y < mapSize && this.lifeTime > 0;
    }

    draw() {
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;
        
        // Draw trail
        for (let i = 0; i < this.trail.length; i++) {
            const point = this.trail[i];
            const trailX = point.x - camera.x;
            const trailY = point.y - camera.y;
            const alpha = i / this.trail.length * 0.3;
            
            ctx.fillStyle = `rgba(255, 200, 50, ${alpha})`;
            ctx.beginPath();
            ctx.arc(trailX, trailY, this.size * (i / this.trail.length), 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Bullet glow
        ctx.fillStyle = 'rgba(255, 235, 59, 0.8)';
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Bullet core
        ctx.fillStyle = this.bulletType === 'special' ? '#FF00FF' : '#FF5722';
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Enhanced Resource class
class Resource {
    constructor(x, y, type, value) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.value = value;
        this.size = 20;
        this.pulse = 0;
        this.collected = false;
        this.collectionTimer = 0;
    }

    update() {
        this.pulse = (this.pulse + 0.1) % (Math.PI * 2);
        if (this.collected) {
            this.collectionTimer++;
        }
    }

    draw() {
        if (this.collected && this.collectionTimer > 30) return;
        
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;
        const pulseSize = this.size + Math.sin(this.pulse) * 5;

        ctx.save();
        ctx.globalAlpha = this.collected ? 0.3 : 0.8 + Math.sin(this.pulse) * 0.2;
        
        if (this.type === 'health') {
            ctx.fillStyle = '#4CAF50';
            ctx.beginPath();
            ctx.arc(screenX, screenY, pulseSize, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = 'white';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('+', screenX, screenY);
        } else if (this.type === 'ammo') {
            ctx.fillStyle = '#FF9800';
            ctx.fillRect(screenX - pulseSize/2, screenY - pulseSize/2, pulseSize, pulseSize);
            
            ctx.fillStyle = 'white';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('A', screenX, screenY);
        } else if (this.type === 'experience') {
            ctx.fillStyle = '#9C27B0';
            ctx.beginPath();
            ctx.arc(screenX, screenY, pulseSize, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = 'white';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('XP', screenX, screenY);
        }
        
        ctx.restore();
    }
}

// Enhanced Explosion class
class Explosion {
    constructor(x, y, size, color = null) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.maxSize = size * 4;
        this.currentSize = size;
        this.growing = true;
        this.particles = [];
        this.color = color || '#FF9800';
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
            if (this.currentSize < 0) {
                this.currentSize = 0;
            }
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

        if (this.currentSize > 0) {
            const gradient = ctx.createRadialGradient(
                screenX, screenY, 0,
                screenX, screenY, this.currentSize
            );
            gradient.addColorStop(0, `rgba(255, 150, 0, 0.9)`);
            gradient.addColorStop(0.7, `rgba(255, 50, 0, 0.5)`);
            gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(screenX, screenY, this.currentSize, 0, Math.PI * 2);
            ctx.fill();
        }

        this.particles.forEach(particle => {
            const particleX = particle.x - camera.x;
            const particleY = particle.y - camera.y;
            
            ctx.save();
            ctx.globalAlpha = particle.life;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(particleX, particleY, particle.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }

    isDone() {
        return this.currentSize <= 0 && this.particles.length === 0;
    }
}

// Enhanced Socket Event Handlers
socket.on('connect', () => {
    playerId = socket.id;
    console.log('Connected to server with ID:', playerId);
});

socket.on('game-config', (config) => {
    mapSize = config.mapSize || mapSize;
    document.getElementById('startButton').disabled = false;
});

socket.on('game-state', (gameState) => {
    if (!gameRunning) return;
    
    // Update players
    const newPlayers = [];
    Object.values(gameState.players).forEach(playerData => {
        if (playerData.id === playerId) {
            if (player) {
                updatePlayerFromData(player, playerData);
            }
            newPlayers.push(player);
        } else {
            let vehicle = players.find(p => p.id === playerData.id);
            if (!vehicle) {
                vehicle = createNewVehicle(playerData);
            }
            updateVehicleFromData(vehicle, playerData);
            newPlayers.push(vehicle);
        }
    });
    players = newPlayers.filter(Boolean);
    
    // Update bullets
    bullets = gameState.bullets.map(bulletData => 
        new Bullet(bulletData.x, bulletData.y, bulletData.angle, bulletData.ownerId, bulletData.damage)
    );
    
    // Update resources
    updateResources(gameState.resources);
    
    obstacles = gameState.obstacles || obstacles;
    gameTime = gameState.gameTime || gameTime;
});

function updatePlayerFromData(player, playerData) {
    const oldLevel = player.level;
    player.health = playerData.health;
    player.kills = playerData.kills;
    player.score = playerData.score;
    player.experience = playerData.experience;
    player.level = playerData.level;
    player.turretAngle = playerData.turretAngle || player.turretAngle;
    
    healthDisplay.textContent = Math.ceil(player.health);
    killsDisplay.textContent = player.kills;
    scoreDisplay.textContent = player.score;
    levelDisplay.textContent = player.level;
    
    if (oldLevel !== player.level) {
        player.updateStats();
        vehicleNameDisplay.textContent = player.displayName;
    }
}

function createNewVehicle(playerData) {
    return new Vehicle(
        playerData.x, 
        playerData.y, 
        false, 
        playerData.id, 
        playerData.vehicleType, 
        playerData.color, 
        playerData.name
    );
}

function updateVehicleFromData(vehicle, playerData) {
    vehicle.x = playerData.x;
    vehicle.y = playerData.y;
    vehicle.health = playerData.health;
    vehicle.kills = playerData.kills;
    vehicle.score = playerData.score;
    vehicle.experience = playerData.experience;
    vehicle.angle = playerData.angle;
    vehicle.turretAngle = playerData.turretAngle || playerData.angle;
    
    if (vehicle.level !== playerData.level) {
        vehicle.level = playerData.level;
        vehicle.updateStats();
        const imagePath = vehicle.getImagePath();
        if (imageCache.has(imagePath)) {
            const cached = imageCache.get(imagePath);
            vehicle.bodyImage = cached.body;
            vehicle.turretImage = cached.turret;
            vehicle.bodyImageLoaded = cached.bodyLoaded;
            vehicle.turretImageLoaded = cached.turretLoaded;
        }
    }
}

function updateResources(serverResources) {
    const existingResources = new Map();
    resources.forEach(r => {
        existingResources.set(`${r.x}-${r.y}-${r.type}`, r);
    });
    
    resources = serverResources.map(resourceData => {
        const key = `${resourceData.x}-${resourceData.y}-${resourceData.type}`;
        let resource = existingResources.get(key);
        if (!resource) {
            resource = new Resource(resourceData.x, resourceData.y, resourceData.type, resourceData.value);
        }
        resource.collected = resourceData.collected || false;
        return resource;
    });
}

// Other socket events remain similar but with better error handling
socket.on('leaderboard-update', (updatedLeaderboard) => {
    leaderboard = updatedLeaderboard;
    updateLeaderboard();
});

socket.on('player-hit', (data) => {
    if (data.playerId === playerId && player) {
        player.health = Math.max(0, data.newHealth);
        healthDisplay.textContent = Math.ceil(player.health);
        
        if (data.newHealth <= 0) {
            setTimeout(showGameOver, 1000);
        }
    }
    explosions.push(new Explosion(data.x, data.y, data.playerId === playerId ? 25 : 20));
});

socket.on('player-killed', (data) => {
    if (data.killerId === playerId && player) {
        player.kills++;
        player.score += 100;
        player.experience += 50;
        killsDisplay.textContent = player.kills;
        scoreDisplay.textContent = player.score;
        
        const newLevel = Math.floor(player.experience / 300) + 1;
        if (newLevel > player.level && player.levelUp()) {
            levelDisplay.textContent = player.level;
            vehicleNameDisplay.textContent = player.displayName;
            
            socket.emit('player-upgraded', {
                id: playerId,
                level: player.level,
                vehicleType: player.vehicleType
            });
        }
    }
    
    const victim = players.find(p => p.id === data.victimId);
    if (victim) {
        explosions.push(new Explosion(victim.x, victim.y, 35));
    }
});

socket.on('player-joined', (playerData) => {
    console.log('Player joined:', playerData.name);
    
    if (playerData.id !== playerId) {
        const vehicle = createNewVehicle(playerData);
        vehicle.level = playerData.level || 1;
        vehicle.updateStats();
        players.push(vehicle);
    }
});

socket.on('player-left', (playerId) => {
    console.log('Player left:', playerId);
    players = players.filter(p => p.id !== playerId);
});

socket.on('bullet-created', (bulletData) => {
    bullets.push(new Bullet(
        bulletData.x,
        bulletData.y,
        bulletData.angle,
        bulletData.ownerId,
        bulletData.damage
    ));
});

socket.on('resource-collected', (data) => {
    resources = resources.filter(r => 
        !(Math.abs(r.x - data.resource.x) < 5 && 
          Math.abs(r.y - data.resource.y) < 5 && 
          r.type === data.resource.type)
    );
    
    if (data.playerId === playerId && player) {
        handleResourceCollection(data.resource);
        explosions.push(new Explosion(data.resource.x, data.resource.y, 15, '#4CAF50'));
    }
});

function handleResourceCollection(resource) {
    if (resource.type === 'health') {
        player.health = Math.min(player.maxHealth, player.health + resource.value);
        healthDisplay.textContent = Math.ceil(player.health);
    } else if (resource.type === 'experience') {
        player.experience += resource.value;
        player.score += 20;
        scoreDisplay.textContent = player.score;
        
        const newLevel = Math.floor(player.experience / 300) + 1;
        if (newLevel > player.level && player.levelUp()) {
            levelDisplay.textContent = player.level;
            vehicleNameDisplay.textContent = player.displayName;
            
            socket.emit('player-upgraded', {
                id: playerId,
                level: player.level,
                vehicleType: player.vehicleType
            });
        }
    }
}

socket.on('resource-spawned', (resourceData) => {
    resources.push(new Resource(
        resourceData.x,
        resourceData.y,
        resourceData.type,
        resourceData.value
    ));
});

socket.on('player-upgraded', (data) => {
    const upgradedPlayer = players.find(p => p.id === data.playerId);
    if (upgradedPlayer) {
        upgradedPlayer.level = data.level;
        upgradedPlayer.updateStats();
        const imagePath = upgradedPlayer.getImagePath();
        if (imageCache.has(imagePath)) {
            const cached = imageCache.get(imagePath);
            upgradedPlayer.bodyImage = cached.body;
            upgradedPlayer.turretImage = cached.turret;
            upgradedPlayer.bodyImageLoaded = cached.bodyLoaded;
            upgradedPlayer.turretImageLoaded = cached.turretLoaded;
        }
    }
});

// Enhanced input handling
function handleSpecialInput(key) {
    if (!player || !gameRunning) return;
    
    switch(key) {
        case ' ':
            if (player.specialAbilityCooldown <= 0 && !player.specialAbilityActive) {
                player.activateSpecialAbility();
            }
            break;
        case 'r':
            // Quick respawn if dead
            if (player.health <= 0) {
                socket.emit('request-respawn', playerId);
            }
            break;
        case 'p':
            // Toggle pause (client-side)
            gameRunning = !gameRunning;
            if (gameRunning) {
                requestAnimationFrame(gameLoop);
            }
            break;
    }
}

// Enhanced game functions
function initGame() {
    const nameInput = document.getElementById('playerNameInput');
    playerName = nameInput.value.trim() || "Soldier" + Math.floor(Math.random() * 1000);
    
    player = new Vehicle(
        mapSize / 2, 
        mapSize / 2, 
        true, 
        playerId,
        selectedVehicle,
        null,
        playerName
    );
    
    socket.emit('join-game', {
        id: playerId,
        name: playerName,
        vehicleType: selectedVehicle,
        color: player.color,
        level: player.level
    });
    
    bullets = [];
    explosions = [];
    startTime = Date.now();
    lastUpdateTime = Date.now();
    frameCount = 0;
    
    healthDisplay.textContent = Math.ceil(player.health);
    killsDisplay.textContent = player.kills;
    scoreDisplay.textContent = player.score;
    levelDisplay.textContent = player.level;
    vehicleNameDisplay.textContent = player.displayName;
    
    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;
    
    generateObstacles();
    generateResources();
}

function generateObstacles() {
    obstacles = [];
    
    // Small obstacles
    for (let i = 0; i < 50; i++) {
        obstacles.push({
            x: Math.random() * mapSize,
            y: Math.random() * mapSize,
            width: 40 + Math.random() * 80,
            height: 40 + Math.random() * 80
        });
    }
    
    // Large obstacles
    for (let i = 0; i < 8; i++) {
        obstacles.push({
            x: Math.random() * mapSize,
            y: Math.random() * mapSize,
            width: 150 + Math.random() * 150,
            height: 150 + Math.random() * 150
        });
    }
    
    // Wall-like obstacles
    for (let i = 0; i < 10; i++) {
        const isHorizontal = Math.random() > 0.5;
        if (isHorizontal) {
            obstacles.push({
                x: Math.random() * mapSize,
                y: Math.random() * mapSize,
                width: 200 + Math.random() * 300,
                height: 30
            });
        } else {
            obstacles.push({
                x: Math.random() * mapSize,
                y: Math.random() * mapSize,
                width: 30,
                height: 200 + Math.random() * 300
            });
        }
    }
}

function generateResources() {
    resources = [];
    
    for (let i = 0; i < 20; i++) {
        resources.push(new Resource(
            Math.random() * mapSize,
            Math.random() * mapSize,
            'health',
            25
        ));
    }
    
    for (let i = 0; i < 15; i++) {
        resources.push(new Resource(
            Math.random() * mapSize,
            Math.random() * mapSize,
            'ammo',
            50
        ));
    }
    
    for (let i = 0; i < 25; i++) {
        resources.push(new Resource(
            Math.random() * mapSize,
            Math.random() * mapSize,
            'experience',
            25
        ));
    }
}

function checkResourceCollection() {
    if (!player) return;
    
    resources.forEach((resource) => {
        if (resource.collected) return;
        
        const dx = resource.x - player.x;
        const dy = resource.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < player.width/2 + resource.size) {
            resource.collected = true;
            
            socket.emit('collect-resource', {
                playerId: player.id,
                resource: {
                    x: resource.x,
                    y: resource.y,
                    type: resource.type,
                    value: resource.value
                }
            });
        }
    });
}

function updateCamera() {
    if (player) {
        camera.x += (player.x - canvas.width / 2 - camera.x) * 0.1;
        camera.y += (player.y - canvas.height / 2 - camera.y) * 0.1;
        
        camera.x = Math.max(0, Math.min(mapSize - canvas.width, camera.x));
        camera.y = Math.max(0, Math.min(mapSize - canvas.height, camera.y));
    }
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

function drawMiniMap() {
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
        if (resource.collected) return;
        
        if (resource.type === 'health') {
            minimapCtx.fillStyle = '#4CAF50';
        } else if (resource.type === 'ammo') {
            minimapCtx.fillStyle = '#FF9800';
        } else {
            minimapCtx.fillStyle = '#9C27B0';
        }
        minimapCtx.beginPath();
        minimapCtx.arc(resource.x * scale, resource.y * scale, 2, 0, Math.PI * 2);
        minimapCtx.fill();
    });
    
    // Draw players
    players.forEach(p => {
        minimapCtx.fillStyle = p.id === playerId ? '#ffd700' : p.color;
        minimapCtx.beginPath();
        minimapCtx.arc(p.x * scale, p.y * scale, 3, 0, Math.PI * 2);
        minimapCtx.fill();
        
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
    
    // Draw camera view
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
    if (player) {
        finalScoreDisplay.textContent = player.score;
        finalKillsDisplay.textContent = player.kills;
        finalLevelDisplay.textContent = player.level;
        const survivalSeconds = Math.floor((Date.now() - startTime) / 1000);
        survivalTimeDisplay.textContent = Math.floor(survivalSeconds / 60) + 'm ' + (survivalSeconds % 60) + 's';
    }
    gameOverScreen.classList.remove('hidden');
}

function drawGrid() {
    const gridSize = 100;
    const startX = Math.floor(camera.x / gridSize) * gridSize;
    const startY = Math.floor(camera.y / gridSize) * gridSize;
    
    for (let x = startX; x < camera.x + canvas.width + gridSize; x += gridSize) {
        for (let y = startY; y < camera.y + canvas.height + gridSize; y += gridSize) {
            const screenX = x - camera.x;
            const screenY = y - camera.y;
            
            const pattern = (Math.floor(x / gridSize) + Math.floor(y / gridSize)) % 4;
            
            switch(pattern) {
                case 0: ctx.fillStyle = 'rgba(45, 80, 22, 0.8)'; break;
                case 1: ctx.fillStyle = 'rgba(60, 100, 30, 0.8)'; break;
                case 2: ctx.fillStyle = 'rgba(74, 124, 58, 0.8)'; break;
                case 3: ctx.fillStyle = 'rgba(85, 140, 65, 0.8)'; break;
            }
            
            ctx.fillRect(screenX, screenY, gridSize, gridSize);
            
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            ctx.strokeRect(screenX, screenY, gridSize, gridSize);
        }
    }
}

function drawExperienceBar() {
    if (!player) return;
    
    const barWidth = 250;
    const barHeight = 12;
    const x = canvas.width / 2 - barWidth / 2;
    const y = 15;
    
    const xpNeeded = 300 + (player.level * 150);
    const currentXP = player.experience % xpNeeded;
    const expPercent = currentXP / xpNeeded;
    const nextLevel = player.level + 1;
    
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(x, y, barWidth, barHeight);
    
    // XP fill with gradient
    const gradient = ctx.createLinearGradient(x, y, x + barWidth, y);
    gradient.addColorStop(0, '#9C27B0');
    gradient.addColorStop(1, '#E1BEE7');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, barWidth * expPercent, barHeight);
    
    // Border
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);
    
    // Text
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(
        `Level ${player.level} | ${currentXP}/${xpNeeded} XP | Next: Level ${nextLevel}`,
        canvas.width / 2,
        y + barHeight + 16
    );
}

function drawHUD() {
    // Controls info
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, canvas.height - 100, 200, 90);
    
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    
    if (!isMobile) {
        ctx.fillText('W/S: Forward/Backward', 20, canvas.height - 80);
        ctx.fillText('A/D: Rotate', 20, canvas.height - 60);
        ctx.fillText('Mouse: Aim Turret', 20, canvas.height - 40);
        ctx.fillText('Click: Shoot | Space: Ability', 20, canvas.height - 20);
    } else {
        ctx.fillText('Touch & Drag: Move & Rotate', 20, canvas.height - 80);
        ctx.fillText('Fire Button: Shoot', 20, canvas.height - 60);
    }
    
    // Special ability status
    if (player && player.specialAbilityCooldown <= 0 && !player.specialAbilityActive) {
        ctx.fillStyle = '#4CAF50';
        ctx.fillText('Special Ability Ready!', canvas.width - 150, 30);
    }
    
    // FPS counter
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`FPS: ${fps}`, canvas.width - 10, 20);
    
    drawExperienceBar();
}

function calculateFPS() {
    frameCount++;
    const now = Date.now();
    const delta = now - lastUpdateTime;
    
    if (delta >= 1000) {
        fps = Math.round((frameCount * 1000) / delta);
        frameCount = 0;
        lastUpdateTime = now;
    }
}

// Enhanced game loop
function gameLoop(timestamp) {
    if (!gameRunning) return;
    
    calculateFPS();
    updateCamera();
    
    // Clear canvas
    ctx.fillStyle = '#2d5016';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
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
    
    // Update and draw bullets (with cleanup)
    bullets = bullets.filter(bullet => {
        const shouldKeep = bullet.update();
        if (shouldKeep) {
            bullet.draw();
        }
        return shouldKeep;
    });
    
    // Update and draw explosions
    for (let i = explosions.length - 1; i >= 0; i--) {
        const explosion = explosions[i];
        explosion.update();
        explosion.draw();
        
        if (explosion.isDone()) {
            explosions.splice(i, 1);
        }
    }
    
    // Check for resource collection
    checkResourceCollection();
    
    drawMiniMap();
    drawHUD();
    
    requestAnimationFrame(gameLoop);
}

// Enhanced game initialization
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

playAgainButton.addEventListener('click', () => {
    gameOverScreen.classList.add('hidden');
    startScreen.style.display = 'flex';
});

window.addEventListener('beforeunload', () => {
    if (gameRunning && playerId) {
        socket.emit('leave-game', playerId);
    }
});

// Auto-select first vehicle and enable start button after timeout
vehicleOptions[0].classList.add('selected');

setTimeout(() => {
    if (document.getElementById('startButton').disabled) {
        console.warn('Server config not received, using defaults');
        document.getElementById('startButton').disabled = false;
    }
}, 3000);
