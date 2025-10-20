const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const minimap = document.getElementById('minimap');
const minimapCtx = minimap.getContext('2d');

console.log('=== GAME INITIALIZATION STARTED ===');

// Sound Effects System
const sounds = {
    shoot: null,
    hit: null,
    explosion: null,
    levelUp: null,
    xpCollect: null,
    enabled: true
};

// Initialize sound effects using Web Audio API
function initSounds() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioContext = new AudioContext();
        
        // Shoot sound (pew!)
        sounds.shoot = () => {
            if (!sounds.enabled) return;
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.frequency.value = 800;
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        };
        
        // Hit sound (impact)
        sounds.hit = () => {
            if (!sounds.enabled) return;
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.type = 'sawtooth';
            oscillator.frequency.value = 200;
            gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.15);
        };
        
        // Explosion sound (boom!)
        sounds.explosion = () => {
            if (!sounds.enabled) return;
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.3);
            gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        };
        
        // Level up sound (triumph!)
        sounds.levelUp = () => {
            if (!sounds.enabled) return;
            [0, 0.1, 0.2].forEach((delay, i) => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                oscillator.frequency.value = 400 + (i * 200);
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime + delay);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + delay + 0.2);
                oscillator.start(audioContext.currentTime + delay);
                oscillator.stop(audioContext.currentTime + delay + 0.2);
            });
        };
        
        // XP collect sound (bling!)
        sounds.xpCollect = () => {
            if (!sounds.enabled) return;
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.frequency.value = 1200;
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.08);
        };
        
        console.log('🔊 Sound effects initialized');
    } catch (error) {
        console.warn('⚠️ Sound effects not available:', error);
        sounds.enabled = false;
    }
}

// Initialize sounds on first user interaction
let soundsInitialized = false;
function ensureSoundsInitialized() {
    if (!soundsInitialized) {
        initSounds();
        soundsInitialized = true;
    }
}

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
const currentXPDisplay = document.getElementById('currentXP');
const neededXPDisplay = document.getElementById('neededXP');
const xpBarFill = document.getElementById('xpBarFill');
const xpBarBackground = document.getElementById('xpBarBackground');
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

// FIXED: Proper canvas sizing with device pixel ratio
function setCanvasSizes() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // Set display size (css)
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    
    // Set actual size in memory (scaled for retina displays)
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    
    // Reset transform and set new scale
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset first
    ctx.scale(dpr, dpr);
    
    // Now set the canvas drawing buffer size to match CSS size
    ctx.canvas.width = window.innerWidth;
    ctx.canvas.height = window.innerHeight;
    
    minimap.width = 150;
    minimap.height = 150;
    
    console.log('🖼️ Canvas set - CSS:', window.innerWidth + 'x' + window.innerHeight, 
                'Buffer:', canvas.width + 'x' + canvas.height,
                'DPR:', dpr);
}

// Call immediately and on resize
setCanvasSizes();
window.addEventListener('resize', setCanvasSizes);

// Socket.io connection
console.log('Attempting to connect to server...');
const socket = io();

socket.on('connect_error', (error) => {
    console.error('❌ Connection failed:', error);
    startButton.disabled = false;
    startButton.textContent = 'RETRY CONNECTION';
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
let camera = {
    x: 0,
    y: 0
};
let mapSize = 4000;
let startTime = Date.now();

// XP calculation function - Progressively harder levels (matches server)
function calculateXPNeeded(level) {
    // Level 1->2: 500 XP
    // Level 2->3: 1200 XP (2.4x harder)
    // Level 3->4: 2500 XP (2.1x harder)
    // Level 4->5: 5000 XP (2x harder)
    // Total to reach level 5: 9,200 XP!
    const xpRequirements = {
        1: 500,
        2: 1200,
        3: 2500,
        4: 5000,
        5: 0  // Max level
    };
    return xpRequirements[level] || 0;
}

// Update XP bar display with animations
function updateXPBar(currentXP, level) {
    const xpNeeded = calculateXPNeeded(level);
    
    if (level >= 5) {
        // Max level reached
        currentXPDisplay.textContent = 'MAX';
        neededXPDisplay.textContent = 'LEVEL';
        xpBarFill.style.width = '100%';
        xpBarFill.style.background = 'linear-gradient(90deg, #ffd700, #ffed4e, #ffd700)';
        return;
    }
    
    const percentage = Math.min(100, (currentXP / xpNeeded) * 100);
    
    currentXPDisplay.textContent = Math.floor(currentXP);
    neededXPDisplay.textContent = xpNeeded;
    xpBarFill.style.width = percentage + '%';
    
    // Add gain animation
    xpBarFill.classList.remove('xp-gained');
    void xpBarFill.offsetWidth; // Force reflow
    xpBarFill.classList.add('xp-gained');
    
    // Pulse effect when close to level up (85%+)
    if (percentage >= 85) {
        xpBarBackground.classList.add('near-levelup');
    } else {
        xpBarBackground.classList.remove('near-levelup');
    }
}

console.log('Game variables initialized');

// Enhanced Vehicle System
const vehicleSystem = {
    tank: {
        base: {
            name: "Light Tank",
            health: 150,
            damage: 35,
            speed: 2,
            rotationSpeed: 0.03,
            size: 70,
            fireRate: 1.0
        },
        upgrades: {
            2: {
                name: "Medium Tank",
                health: 200,
                damage: 45,
                speed: 2.2,
                rotationSpeed: 0.035,
                size: 75,
                fireRate: 1.1
            },
            3: {
                name: "Heavy Tank",
                health: 280,
                damage: 55,
                speed: 2.3,
                rotationSpeed: 0.04,
                size: 80,
                fireRate: 1.2
            },
            4: {
                name: "Battle Tank",
                health: 350,
                damage: 65,
                speed: 2.4,
                rotationSpeed: 0.045,
                size: 85,
                fireRate: 1.3
            },
            5: {
                name: "Elite Tank",
                health: 450,
                damage: 80,
                speed: 2.5,
                rotationSpeed: 0.05,
                size: 90,
                fireRate: 1.5
            }
        }
    },
    jeep: {
        base: {
            name: "Scout Jeep",
            health: 100,
            damage: 20,
            speed: 4,
            rotationSpeed: 0.05,
            size: 55,
            fireRate: 1.2
        },
        upgrades: {
            2: {
                name: "Combat Jeep",
                health: 130,
                damage: 25,
                speed: 4.5,
                rotationSpeed: 0.055,
                size: 58,
                fireRate: 1.3
            },
            3: {
                name: "Assault Jeep",
                health: 170,
                damage: 30,
                speed: 5.0,
                rotationSpeed: 0.06,
                size: 62,
                fireRate: 1.4
            },
            4: {
                name: "Raider Jeep",
                health: 220,
                damage: 35,
                speed: 5.5,
                rotationSpeed: 0.065,
                size: 65,
                fireRate: 1.5
            },
            5: {
                name: "Commando Jeep",
                health: 280,
                damage: 40,
                speed: 6.0,
                rotationSpeed: 0.07,
                size: 70,
                fireRate: 1.7
            }
        }
    },
    apc: {
        base: {
            name: "Armored APC",
            health: 200,
            damage: 25,
            speed: 1.5,
            rotationSpeed: 0.025,
            size: 80,
            fireRate: 0.8
        },
        upgrades: {
            2: {
                name: "Heavy APC",
                health: 280,
                damage: 30,
                speed: 1.7,
                rotationSpeed: 0.03,
                size: 85,
                fireRate: 0.9
            },
            3: {
                name: "Battle APC",
                health: 350,
                damage: 35,
                speed: 1.9,
                rotationSpeed: 0.035,
                size: 90,
                fireRate: 1.0
            },
            4: {
                name: "Commando APC",
                health: 450,
                damage: 40,
                speed: 2.1,
                rotationSpeed: 0.04,
                size: 95,
                fireRate: 1.1
            },
            5: {
                name: "Elite APC",
                health: 550,
                damage: 50,
                speed: 2.3,
                rotationSpeed: 0.045,
                size: 100,
                fireRate: 1.2
            }
        }
    },
    artillery: {
        base: {
            name: "Field Artillery",
            health: 120,
            damage: 50,
            speed: 1,
            rotationSpeed: 0.02,
            size: 70,
            fireRate: 0.5
        },
        upgrades: {
            2: {
                name: "Heavy Artillery",
                health: 160,
                damage: 65,
                speed: 1.1,
                rotationSpeed: 0.025,
                size: 75,
                fireRate: 0.6
            },
            3: {
                name: "Battle Artillery",
                health: 210,
                damage: 80,
                speed: 1.2,
                rotationSpeed: 0.03,
                size: 80,
                fireRate: 0.7
            },
            4: {
                name: "Plasma Artillery",
                health: 270,
                damage: 95,
                speed: 1.3,
                rotationSpeed: 0.035,
                size: 85,
                fireRate: 0.8
            },
            5: {
                name: "Elite Artillery",
                health: 340,
                damage: 120,
                speed: 1.4,
                rotationSpeed: 0.04,
                size: 90,
                fireRate: 0.9
            }
        }
    },
    helicopter: {
        base: {
            name: "Scout Helicopter",
            health: 80,
            damage: 15,
            speed: 3.5,
            rotationSpeed: 0.06,
            size: 60,
            fireRate: 2.0
        },
        upgrades: {
            2: {
                name: "Attack Helicopter",
                health: 110,
                damage: 20,
                speed: 3.8,
                rotationSpeed: 0.065,
                size: 65,
                fireRate: 2.2
            },
            3: {
                name: "Gunship Helicopter",
                health: 150,
                damage: 25,
                speed: 4.0,
                rotationSpeed: 0.07,
                size: 70,
                fireRate: 2.4
            },
            4: {
                name: "Stealth Helicopter",
                health: 200,
                damage: 30,
                speed: 4.2,
                rotationSpeed: 0.075,
                size: 75,
                fireRate: 2.6
            },
            5: {
                name: "Elite Helicopter",
                health: 260,
                damage: 35,
                speed: 4.5,
                rotationSpeed: 0.08,
                size: 80,
                fireRate: 2.8
            }
        }
    }
};

console.log('Vehicle system initialized with', Object.keys(vehicleSystem).length, 'vehicle types');

// Image Loading System - Works with available images and gracefully handles missing ones
const vehicleImages = {
    tank: { basic: {}, medium: {}, heavy: {}, battle: {}, elite: {} },
    jeep: { basic: {}, combat: {}, assault: {}, raider: {}, commando: {} },
    apc: { basic: {}, heavy: {}, battle: {}, commando: {}, elite: {} },
    artillery: { basic: {}, heavy: {}, battle: {}, plasma: {}, elite: {} },
    helicopter: { basic: {}, attack: {}, gunship: {}, stealth: {}, elite: {}, rotor: null }
};

let imagesLoaded = false;
let totalImagesToLoad = 0;
let imagesLoadedCount = 0;

// Load images with fallback support
function loadVehicleImages() {
    console.log('🖼️ Starting image loading...');
    
    const imageMap = [
        // Tank images - All 5 levels
        { type: 'tank', level: 'basic', part: 'body', path: '/assets/tank_basic_body.png' },
        { type: 'tank', level: 'basic', part: 'turret', path: '/assets/tank_basic_turret.png' },
        { type: 'tank', level: 'medium', part: 'body', path: '/assets/tank_medium_body.png' },
        { type: 'tank', level: 'medium', part: 'turret', path: '/assets/tank_medium_turret.png' },
        { type: 'tank', level: 'heavy', part: 'body', path: '/assets/tank_heavy_body.png' },
        { type: 'tank', level: 'heavy', part: 'turret', path: '/assets/tank_heavy_turret.png' },
        { type: 'tank', level: 'battle', part: 'body', path: '/assets/tank_battle_body.png' },
        { type: 'tank', level: 'battle', part: 'turret', path: '/assets/tank_battle_turret.png' },
        { type: 'tank', level: 'elite', part: 'body', path: '/assets/tank_elite_body.png' },
        { type: 'tank', level: 'elite', part: 'turret', path: '/assets/tank_elite_turret.png' },
        
        // Jeep images - All 5 levels
        { type: 'jeep', level: 'basic', part: 'body', path: '/assets/jeep_basic_body.png' },
        { type: 'jeep', level: 'basic', part: 'turret', path: '/assets/jeep_basic_turret.png' },
        { type: 'jeep', level: 'combat', part: 'body', path: '/assets/jeep_combat_body.png' },
        { type: 'jeep', level: 'combat', part: 'turret', path: '/assets/jeep_combat_turret.png' },
        { type: 'jeep', level: 'assault', part: 'body', path: '/assets/jeep_assault_body.png' },
        { type: 'jeep', level: 'assault', part: 'turret', path: '/assets/jeep_assault_turret.png' },
        { type: 'jeep', level: 'raider', part: 'body', path: '/assets/jeep_raider_body.png' },
        { type: 'jeep', level: 'raider', part: 'turret', path: '/assets/jeep_raider_turret.png' },
        { type: 'jeep', level: 'commando', part: 'body', path: '/assets/jeep_commando_body.png' },
        { type: 'jeep', level: 'commando', part: 'turret', path: '/assets/jeep_commando_turret.png' },
        
        // APC images - All 5 levels
        { type: 'apc', level: 'basic', part: 'body', path: '/assets/apc_basic_body.png' },
        { type: 'apc', level: 'basic', part: 'turret', path: '/assets/apc_basic_turret.png' },
        { type: 'apc', level: 'heavy', part: 'body', path: '/assets/apc_heavy_body.png' },
        { type: 'apc', level: 'heavy', part: 'turret', path: '/assets/apc_heavy_turret.png' },
        { type: 'apc', level: 'battle', part: 'body', path: '/assets/apc_battle_body.png' },
        { type: 'apc', level: 'battle', part: 'turret', path: '/assets/apc_battle_turret.png' },
        { type: 'apc', level: 'commando', part: 'body', path: '/assets/apc_commando_body.png' },
        { type: 'apc', level: 'commando', part: 'turret', path: '/assets/apc_commando_turret.png' },
        { type: 'apc', level: 'elite', part: 'body', path: '/assets/apc_elite_body.png' },
        { type: 'apc', level: 'elite', part: 'turret', path: '/assets/apc_elite_turret.png' },
        
        // Artillery images - All 5 levels
        { type: 'artillery', level: 'basic', part: 'body', path: '/assets/artillery_basic_body.png' },
        { type: 'artillery', level: 'basic', part: 'turret', path: '/assets/artillery_basic_turret.png' },
        { type: 'artillery', level: 'heavy', part: 'body', path: '/assets/artillery_heavy_body.png' },
        { type: 'artillery', level: 'heavy', part: 'turret', path: '/assets/artillery_heavy_turret.png' },
        { type: 'artillery', level: 'battle', part: 'body', path: '/assets/artillery_battle_body.png' },
        { type: 'artillery', level: 'battle', part: 'turret', path: '/assets/artillery_battle_turret.png' },
        { type: 'artillery', level: 'plasma', part: 'body', path: '/assets/artillery_plasma_body.png' },
        { type: 'artillery', level: 'plasma', part: 'turret', path: '/assets/artillery_plasma_turret.png' },
        { type: 'artillery', level: 'elite', part: 'body', path: '/assets/artillery_elite_body.png' },
        { type: 'artillery', level: 'elite', part: 'turret', path: '/assets/artillery_elite_turret.png' },
        
        // Helicopter images - Different bodies, shared rotor wings
        { type: 'helicopter', level: 'basic', part: 'body', path: '/assets/helicopter_basic_body.png' },
        { type: 'helicopter', level: 'attack', part: 'body', path: '/assets/helicopter_attack_body.png' },
        { type: 'helicopter', level: 'gunship', part: 'body', path: '/assets/helicopter_gunship_body.png' },
        { type: 'helicopter', level: 'stealth', part: 'body', path: '/assets/helicopter_stealth_body.png' },
        { type: 'helicopter', level: 'elite', part: 'body', path: '/assets/helicopter_elite_body.png' },
        // Shared rotor for all helicopter levels
        { type: 'helicopter', level: 'rotor', part: 'rotor', path: '/assets/helicopter_basic_rotor.png' },
        
        // Mech images - Will use fallback colored shapes (no images uploaded yet)
        // { type: 'mech', level: 'base', part: 'body', path: '/assets/mech_basic_body.png' },
        // { type: 'mech', level: 'base', part: 'turret', path: '/assets/mech_basic_turret.png' }
    ];
    
    totalImagesToLoad = imageMap.length;
    
    imageMap.forEach(item => {
        const img = new Image();
        img.onload = () => {
            if (!vehicleImages[item.type][item.level]) {
                vehicleImages[item.type][item.level] = {};
            }
            vehicleImages[item.type][item.level][item.part] = img;
            imagesLoadedCount++;
            console.log(`✅ Loaded: ${item.path} (${imagesLoadedCount}/${totalImagesToLoad})`);
            
            if (imagesLoadedCount === totalImagesToLoad) {
                imagesLoaded = true;
                console.log('🎉 All images loaded successfully!');
            }
        };
        img.onerror = () => {
            imagesLoadedCount++;
            console.log(`⚠️ Image not found (will use fallback): ${item.path} (${imagesLoadedCount}/${totalImagesToLoad})`);
            
            if (imagesLoadedCount === totalImagesToLoad) {
                imagesLoaded = true;
                console.log('🎉 Image loading complete (some using fallbacks)');
            }
        };
        img.src = item.path;
    });
}

// Start loading images immediately
loadVehicleImages();

console.log('Image loading initiated');

// Input handling
const keys = {};
const mouse = {
    x: 0,
    y: 0,
    clicked: false
};
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
console.log('Mobile device detected:', isMobile);

// Event listeners for desktop
// FIXED: Keyboard event handlers
document.addEventListener('keydown', (e) => {
    if (e.key) {
        keys[e.key.toLowerCase()] = true;
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key) {
        keys[e.key.toLowerCase()] = false;
    }
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / (window.devicePixelRatio || 1) / rect.width;
    const scaleY = canvas.height / (window.devicePixelRatio || 1) / rect.height;
    
    mouse.x = (e.clientX - rect.left) * scaleX + camera.x;
    mouse.y = (e.clientY - rect.top) * scaleY + camera.y;
});

// Mobile controls
if (isMobile) {
    console.log('Setting up mobile controls');
    mobileControls.style.display = 'block';

    // Enhanced mobile controls: Drag to move, tap to fire
    let touchStartTime = 0;
    const TAP_DURATION = 200; // ms - if touch is shorter than this, it's a tap (fire)
    
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        ensureSoundsInitialized(); // Initialize sounds on first touch
        
        const touchEvent = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        touch.active = true;
        touch.startX = touchEvent.clientX - rect.left;
        touch.startY = touchEvent.clientY - rect.top;
        touch.x = touch.startX;
        touch.y = touch.startY;
        touchStartTime = Date.now();
        
        // Calculate world coordinates for turret aiming
        if (player) {
            const worldX = touch.startX + camera.x;
            const worldY = touch.startY + camera.y;
            const dx = worldX - player.x;
            const dy = worldY - player.y;
            player.turretAngle = Math.atan2(dy, dx);
        }
    });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!touch.active) return;

        const touchEvent = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        touch.x = touchEvent.clientX - rect.left;
        touch.y = touchEvent.clientY - rect.top;

        // Calculate movement direction based on drag
        const dx = touch.x - touch.startX;
        const dy = touch.y - touch.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 5) { // Minimum drag distance to avoid jitter
            touch.moveX = dx * 0.015;
            touch.moveY = dy * 0.015;
            
            // Update turret angle to point at drag direction
            if (player) {
                const worldX = touch.x + camera.x;
                const worldY = touch.y + camera.y;
                const tdx = worldX - player.x;
                const tdy = worldY - player.y;
                player.turretAngle = Math.atan2(tdy, tdx);
            }
        }
    });

    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        const touchDuration = Date.now() - touchStartTime;
        
        // If it was a quick tap (not a drag), fire!
        if (touchDuration < TAP_DURATION && player && player.cooldown <= 0) {
            mouse.clicked = true;
            setTimeout(() => { mouse.clicked = false; }, 50);
        }
        
        touch.active = false;
        touch.moveX = 0;
        touch.moveY = 0;
    });

    // Fire button still works as backup
    fireButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        ensureSoundsInitialized();
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
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    fireButton.addEventListener('contextmenu', (e) => e.preventDefault());
} else {
    console.log('Setting up desktop controls');
    canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
            ensureSoundsInitialized(); // Initialize sounds on first click
            mouse.clicked = true;
        }
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
        console.log('Vehicle selected:', selectedVehicle);
    });
});

// Vehicle class - SIMPLIFIED AND ROBUST
class Vehicle {
    constructor(x, y, isPlayer = false, id = null, vehicleType = 'tank', color = null, name = '') {
        console.log(`🚗 Creating new Vehicle:`, { x, y, isPlayer, id, vehicleType, name });
        
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

        // Movement state
        this.movingForward = false;
        this.movingBackward = false;
        this.turningLeft = false;
        this.turningRight = false;
        
        // Debug info
        this.debugId = Math.random().toString(36).substr(2, 5);
        console.log(`✅ Vehicle ${this.debugId} created at ${x}, ${y}`);
    }

    getDefaultColor() {
        const colors = {
            tank: '#4CAF50',
            jeep: '#2196F3',
            apc: '#FF9800',
            artillery: '#9C27B0',
            helicopter: '#00BCD4'
        };
        return colors[this.vehicleType] || '#4CAF50';
    }

    updateStats() {
        const vehicleData = vehicleSystem[this.vehicleType];
        if (!vehicleData) {
            console.error(`❌ No vehicle data found for type: ${this.vehicleType}`);
            return;
        }

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

    update() {
        if (this.isPlayer) {
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
                // Enhanced mobile controls - Drag to move vehicle
                if (touch.active) {
                    // Calculate angle from drag direction
                    const dragDistance = Math.sqrt(touch.moveX * touch.moveX + touch.moveY * touch.moveY);
                    
                    if (dragDistance > 0.1) {
                        // Move in the direction of the drag
                        const targetAngle = Math.atan2(touch.moveY, touch.moveX);
                        
                        // Smoothly rotate towards drag direction
                        let angleDiff = targetAngle - this.angle;
                        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                        
                        this.angle += angleDiff * 0.2; // Smooth rotation
                        
                        // Move forward in current direction
                        const moveSpeed = Math.min(dragDistance, 1) * this.speed;
                        this.x += Math.cos(this.angle) * moveSpeed;
                        this.y += Math.sin(this.angle) * moveSpeed;
                        moved = true;
                    }
                }
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

            // Shooting
            if (mouse.clicked && this.cooldown <= 0) {
                this.shoot();
                this.cooldown = this.maxCooldown;
            }
        }

        // Keep in bounds
        this.x = Math.max(this.width / 2, Math.min(mapSize - this.width / 2, this.x));
        this.y = Math.max(this.height / 2, Math.min(mapSize - this.height / 2, this.y));

        // Cooldowns
        if (this.cooldown > 0) this.cooldown--;
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

        // Play shoot sound
        if (sounds.shoot) sounds.shoot();

        // Muzzle flash
        explosions.push(new Explosion(
            bulletX - Math.cos(this.turretAngle) * 10,
            bulletY - Math.sin(this.turretAngle) * 10,
            8,
            '#FF9800'
        ));
    }

    draw() {
    // FIXED: Use proper coordinate conversion
    const displayWidth = canvas.width / (window.devicePixelRatio || 1);
    const displayHeight = canvas.height / (window.devicePixelRatio || 1);
    
    const screenX = this.x - camera.x;
    const screenY = this.y - camera.y;

    // Debug specific vehicle
    if (this.isPlayer && Math.random() < 0.02) {
        console.log('🚗 Player draw - World:', this.x, this.y, 
                   'Camera:', camera.x, camera.y,
                   'Screen:', screenX, screenY,
                   'Canvas:', displayWidth, displayHeight);
    }

    // FIXED: Better bounds checking
    const margin = 200; // Large margin to prevent culling issues
    if (screenX < -this.width - margin || screenX > displayWidth + this.width + margin ||
        screenY < -this.height - margin || screenY > displayHeight + this.height + margin) {
        if (this.isPlayer) console.log('❌ Player culled!');
        return;
    }

        ctx.save();
        ctx.translate(screenX, screenY);

        // Draw vehicle body with unique shape for each type
        ctx.save();
        ctx.rotate(this.angle);
        
        // Different shapes for different vehicle types
        this.drawVehicleBody();
        ctx.restore();

        // Draw turret
        ctx.save();
        ctx.rotate(this.turretAngle);
        this.drawTurret();
        ctx.restore();

        ctx.restore();

        // Draw UI
        this.drawUI(screenX, screenY);
    }

    drawVehicleBody() {
        // Map level numbers to image level names for each vehicle type
        const levelMaps = {
            tank: { 1: 'basic', 2: 'medium', 3: 'heavy', 4: 'battle', 5: 'elite' },
            jeep: { 1: 'basic', 2: 'combat', 3: 'assault', 4: 'raider', 5: 'commando' },
            apc: { 1: 'basic', 2: 'heavy', 3: 'battle', 4: 'commando', 5: 'elite' },
            artillery: { 1: 'basic', 2: 'heavy', 3: 'battle', 4: 'plasma', 5: 'elite' },
            helicopter: { 1: 'basic', 2: 'attack', 3: 'gunship', 4: 'stealth', 5: 'elite' }
        };
        
        const levelMap = levelMaps[this.vehicleType] || levelMaps.tank;
        const levelKey = levelMap[this.level] || 'basic';
        
        // Debug logging for APC
        if (this.vehicleType === 'apc' && this.isPlayer) {
            console.log('🚜 APC Debug:', {
                level: this.level,
                levelKey: levelKey,
                hasVehicleData: !!vehicleImages[this.vehicleType],
                hasLevelData: !!(vehicleImages[this.vehicleType] && vehicleImages[this.vehicleType][levelKey]),
                hasBodyImage: !!(vehicleImages[this.vehicleType] && vehicleImages[this.vehicleType][levelKey] && vehicleImages[this.vehicleType][levelKey].body)
            });
        }
        
        // Try to use image first
        const vehicleImageData = vehicleImages[this.vehicleType];
        const levelImageData = vehicleImageData && vehicleImageData[levelKey];
        const bodyImage = levelImageData && levelImageData.body;
        
        if (bodyImage && bodyImage.complete && bodyImage.naturalWidth > 0) {
            // Draw using image
            const scale = this.width / 100; // Normalize to vehicle size
            ctx.save();
            ctx.drawImage(
                bodyImage,
                -this.width / 2,
                -this.height / 2,
                this.width,
                this.height
            );
            ctx.restore();
            return;
        }
        
        // Fallback to colored shapes if image not available
        ctx.fillStyle = this.color;
        
        switch(this.vehicleType) {
            case 'tank':
                // Tank shape
                ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
                ctx.fillStyle = '#2E7D32';
                ctx.fillRect(-this.width / 4, -this.height / 4, this.width / 2, this.height / 2);
                break;
                
            case 'jeep':
                // Jeep shape
                ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
                ctx.fillStyle = '#1565C0';
                ctx.fillRect(-this.width / 3, -this.height / 3, this.width * 0.66, this.height * 0.66);
                break;
                
            case 'apc':
                // APC shape
                ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
                ctx.fillStyle = '#E65100';
                ctx.fillRect(-this.width / 2.5, -this.height / 2.5, this.width / 1.25, this.height / 1.25);
                break;
                
            case 'artillery':
                // Artillery shape
                ctx.beginPath();
                ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#6A1B9A';
                ctx.beginPath();
                ctx.arc(0, 0, this.width / 3, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'helicopter':
                // Helicopter shape
                ctx.beginPath();
                ctx.ellipse(0, 0, this.width / 2, this.height / 3, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#006064';
                ctx.fillRect(-this.width / 2, -this.height / 2 - 5, this.width, 3);
                break;
                
            default:
                ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        }
    }

    drawTurret() {
        // Special handling for helicopter - uses shared rotor for all levels
        if (this.vehicleType === 'helicopter') {
            const rotorImage = vehicleImages.helicopter.rotor && vehicleImages.helicopter.rotor.rotor;
            if (rotorImage && rotorImage.complete && rotorImage.naturalWidth > 0) {
                ctx.save();
                // Draw rotating rotor
                ctx.rotate((Date.now() / 50) % (Math.PI * 2)); // Fast spin animation
                ctx.drawImage(
                    rotorImage,
                    -this.width / 2,
                    -this.height / 2,
                    this.width,
                    this.height
                );
                ctx.restore();
                return;
            }
            // Fallback: draw simple rotating line for helicopter rotor
            ctx.save();
            ctx.rotate((Date.now() / 50) % (Math.PI * 2));
            ctx.fillStyle = '#555';
            ctx.fillRect(-this.width / 2, -2, this.width, 4);
            ctx.restore();
            return;
        }
        
        // For other vehicles: normal turret handling
        const levelMaps = {
            tank: { 1: 'basic', 2: 'medium', 3: 'heavy', 4: 'battle', 5: 'elite' },
            jeep: { 1: 'basic', 2: 'combat', 3: 'assault', 4: 'raider', 5: 'commando' },
            apc: { 1: 'basic', 2: 'heavy', 3: 'battle', 4: 'commando', 5: 'elite' },
            artillery: { 1: 'basic', 2: 'heavy', 3: 'battle', 4: 'plasma', 5: 'elite' }
        };
        
        const levelMap = levelMaps[this.vehicleType] || levelMaps.tank;
        const levelKey = levelMap[this.level] || 'basic';
        
        // Try to use image first
        const vehicleImageData = vehicleImages[this.vehicleType];
        const levelImageData = vehicleImageData && vehicleImageData[levelKey];
        const turretImage = levelImageData && levelImageData.turret;
        
        if (turretImage && turretImage.complete && turretImage.naturalWidth > 0) {
            // Draw using image
            ctx.save();
            ctx.drawImage(
                turretImage,
                -this.width / 2,
                -this.height / 2,
                this.width,
                this.height
            );
            ctx.restore();
            return;
        }
        
        // Fallback to simple turret shape
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#555';
        ctx.fillRect(0, -3, this.width / 2 + 10, 6);
        
        ctx.fillStyle = '#777';
        ctx.fillRect(this.width / 2 + 10, -2, 5, 4);
    }

    drawUI(screenX, screenY) {
        // Name and level
        if (this.name) {
            ctx.fillStyle = 'white';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.name, screenX, screenY - this.height / 2 - 25);

            if (this.level > 1) {
                ctx.fillStyle = '#ffd700';
                ctx.font = 'bold 12px Arial';
                ctx.fillText(`Lvl ${this.level}`, screenX, screenY - this.height / 2 - 10);
            }
        }

        // Health bar
        const barWidth = 50;
        const barHeight = 6;
        const healthPercent = Math.max(0, this.health / this.maxHealth);

        ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
        ctx.fillRect(screenX - barWidth / 2, screenY - this.height / 2 - 40, barWidth, barHeight);
        
        ctx.fillStyle = healthPercent > 0.6 ? '#4CAF50' : healthPercent > 0.3 ? '#FF9800' : '#F44336';
        ctx.fillRect(screenX - barWidth / 2, screenY - this.height / 2 - 40, barWidth * healthPercent, barHeight);
        
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(screenX - barWidth / 2, screenY - this.height / 2 - 40, barWidth, barHeight);
    }
}

// Bullet class
class Bullet {
    constructor(x, y, angle, ownerId, damage) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = 12;
        this.size = 6;
        this.ownerId = ownerId;
        this.damage = damage;
    }

    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
    }

    draw() {
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;

        ctx.fillStyle = 'rgba(255, 235, 59, 0.9)';
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FF5722';
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Resource class
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
            ctx.fillRect(screenX - pulseSize / 2, screenY - pulseSize / 2, pulseSize, pulseSize);
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

// Explosion class
class Explosion {
    constructor(x, y, size, color = '#FF9800') {
        this.x = x;
        this.y = y;
        this.size = size;
        this.maxSize = size * 4;
        this.currentSize = size;
        this.growing = true;
        this.color = color;
    }

    update() {
        if (this.growing) {
            this.currentSize += 3;
            if (this.currentSize >= this.maxSize) this.growing = false;
        } else {
            this.currentSize -= 2;
        }
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
    }

    isDone() {
        return this.currentSize <= 0;
    }
}

// Socket events
socket.on('connect', () => {
    playerId = socket.id;
    console.log('✅ Connected to server with ID:', playerId);
    startButton.disabled = false;
    startButton.textContent = 'START BATTLE';
});

socket.on('game-config', (config) => {
    mapSize = config.mapSize || mapSize;
    console.log('🎮 Game config received, map size:', mapSize);
});

socket.on('game-state', (gameState) => {
    if (!gameRunning) return;

    const receivedPlayers = {};
    
    // Process all players from server
    Object.values(gameState.players).forEach(playerData => {
        receivedPlayers[playerData.id] = true;
        
        // Handle local player (you)
        if (playerData.id === playerId) {
            if (player) {
                player.health = playerData.health;
                player.kills = playerData.kills;
                player.score = playerData.score;
                player.experience = playerData.experience;

                if (player.level !== playerData.level) {
                   player.level = playerData.level;
                   player.updateStats();
                   vehicleNameDisplay.textContent = player.displayName;
                   
                   // Update XP bar on level up
                   updateXPBar(player.experience, player.level);
                }
                
                healthDisplay.textContent = Math.ceil(player.health);
                killsDisplay.textContent = player.kills;
                scoreDisplay.textContent = player.score;
                levelDisplay.textContent = player.level;
                
                // Update XP bar in real-time
                updateXPBar(player.experience, player.level);
            }
        } else {
            // Handle remote players
            let vehicle = players.find(p => p && p.id === playerData.id);
            if (!vehicle) {
                vehicle = new Vehicle(
                    playerData.x,
                    playerData.y,
                    false,
                    playerData.id,
                    playerData.vehicleType,
                    playerData.color,
                    playerData.name
                );
                players.push(vehicle);
                console.log(`➕ Added remote player: ${playerData.name}`);
            }

            // Update remote player position
            vehicle.x = playerData.x;
            vehicle.y = playerData.y;
            vehicle.angle = playerData.angle;
            vehicle.turretAngle = playerData.turretAngle;
            vehicle.health = playerData.health;
            vehicle.kills = playerData.kills;
            vehicle.score = playerData.score;
            vehicle.experience = playerData.experience;

            if (vehicle.level !== playerData.level) {
                vehicle.level = playerData.level;
                vehicle.updateStats();
            }
        }
    });

    // Remove players that left the game
    players = players.filter(p => p && receivedPlayers[p.id]);

    // Update bullets, obstacles, resources
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
});

socket.on('leaderboard-update', (updatedLeaderboard) => {
    leaderboard = updatedLeaderboard;
    updateLeaderboard();
});

socket.on('player-hit', (data) => {
    let targetPlayer = players.find(p => p && p.id === data.playerId);
    if (targetPlayer) {
        targetPlayer.health = Math.max(0, data.newHealth);
        if (targetPlayer.isPlayer) {
            healthDisplay.textContent = Math.ceil(targetPlayer.health);
        }
    }
    
    // Play hit sound
    if (sounds.hit) sounds.hit();
    
    explosions.push(new Explosion(data.x, data.y, 25));

    if (data.playerId === playerId && data.newHealth <= 0) {
       showGameOver();
    }
});

socket.on('player-killed', (data) => {
    if (data.killerId === playerId && player) {
        player.kills++;
        player.score += 100;
        player.experience += 50;
        killsDisplay.textContent = player.kills;
        scoreDisplay.textContent = player.score;
        
        // Update XP bar when gaining XP from kills
        updateXPBar(player.experience, player.level);
    }
    
    const victim = players.find(p => p && p.id === data.victimId);
    if (victim) {
        // Play explosion sound
        if (sounds.explosion) sounds.explosion();
        explosions.push(new Explosion(victim.x, victim.y, 35));
    }
});

socket.on('player-joined', (playerData) => {
    if (playerData.id !== playerId && !players.some(p => p && p.id === playerData.id)) {
        const vehicle = new Vehicle(
            playerData.x,
            playerData.y,
            false,
            playerData.id,
            playerData.vehicleType,
            playerData.color,
            playerData.name
        );
        vehicle.level = playerData.level || 1;
        vehicle.updateStats();
        players.push(vehicle);
        console.log(`👋 New player joined: ${playerData.name}`);
    }
});

socket.on('player-left', (leftPlayerId) => {
    players = players.filter(p => p && p.id !== leftPlayerId);
    console.log(`👋 Player left: ${leftPlayerId}`);
});

socket.on('resource-collected', (data) => {
    // Remove the collected resource locally
    resources = resources.filter(r => 
        !(Math.abs(r.x - data.resource.x) < 1 && 
          Math.abs(r.y - data.resource.y) < 1 && 
          r.type === data.resource.type)
    );
    
    // Play XP collect sound for experience resources
    if (data.resource.type === 'experience' && data.playerId === playerId) {
        if (sounds.xpCollect) sounds.xpCollect();
    }
    
    // Show collection effect
    explosions.push(new Explosion(data.resource.x, data.resource.y, 15, '#4CAF50'));
    
    // Update XP bar if XP was collected by this player
    if (data.resource.type === 'experience' && player && data.playerId === playerId) {
        player.experience += data.resource.value;
        updateXPBar(player.experience, player.level);
    }
});

// Resource Respawned Handler
socket.on('resource-spawned', (newResource) => {
    resources.push(new Resource(newResource.x, newResource.y, newResource.type, newResource.value));
});

// Upgrade Screen Handling
socket.on('show-upgrade-screen', (data) => {
    if (data.playerId === playerId) {
        // Play level up sound
        if (sounds.levelUp) sounds.levelUp();
        showUpgradeScreen(data.nextLevel);
    }
});

// Vehicle Upgraded Handler
socket.on('vehicle-upgraded', (data) => {
    const vehicle = players.find(p => p && p.id === data.playerId);
    if (vehicle) {
        vehicle.vehicleType = data.newVehicleType;
        vehicle.level = data.newLevel;
        vehicle.updateStats();
        
        // Update display if it's the local player
        if (data.playerId === playerId && player) {
            player.vehicleType = data.newVehicleType;
            player.level = data.newLevel;
            player.updateStats();
            vehicleNameDisplay.textContent = player.displayName;
            levelDisplay.textContent = player.level;
            console.log('✅ Vehicle upgraded to', data.newVehicleType, 'Level', data.newLevel);
        }
    }
});

function showUpgradeScreen(nextLevel) {
    // Create upgrade screen if it doesn't exist
    let upgradeScreen = document.getElementById('upgradeScreen');
    if (!upgradeScreen) {
        upgradeScreen = document.createElement('div');
        upgradeScreen.id = 'upgradeScreen';
        upgradeScreen.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: rgba(0,0,0,0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;
        upgradeScreen.innerHTML = `
            <div id="upgradeContent" style="
                background: rgba(0,0,0,0.95);
                padding: 30px;
                border-radius: 15px;
                border: 3px solid #ffd700;
                text-align: center;
                color: white;
                max-width: 90%;
                max-height: 90%;
                overflow-y: auto;
            ">
                <h2 style="color: #ffd700; margin-bottom: 20px;">🎉 LEVEL UP! 🎉</h2>
                <p style="margin-bottom: 20px; font-size: 18px;">You've reached Level ${nextLevel}! Choose your upgraded vehicle:</p>
                <div class="upgrade-options" id="upgradeOptions" style="
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 15px;
                    margin: 20px 0;
                "></div>
                <button id="confirmUpgrade" style="
                    padding: 15px 30px;
                    background: linear-gradient(45deg, #4CAF50, #45a049);
                    color: white;
                    border: none;
                    border-radius: 10px;
                    font-size: 18px;
                    cursor: pointer;
                    margin-top: 20px;
                ">CONFIRM SELECTION</button>
            </div>
        `;
        document.body.appendChild(upgradeScreen);
    }
    
    // Populate upgrade options
    const upgradeOptions = document.getElementById('upgradeOptions');
    upgradeOptions.innerHTML = '';
    
    let isFirst = true;
    Object.keys(vehicleSystem).forEach(vehicleType => {
        const vehicleData = vehicleSystem[vehicleType];
        const stats = vehicleData.upgrades[nextLevel] || vehicleData.base;
        
        const option = document.createElement('div');
        option.className = 'upgrade-option';
        option.dataset.vehicle = vehicleType;
        option.style.cssText = `
            background: rgba(255,255,255,0.1);
            padding: 15px;
            border-radius: 10px;
            border: 2px solid transparent;
            cursor: pointer;
            transition: all 0.3s ease;
        `;
        
        // Auto-select the first option
        if (isFirst) {
            option.style.borderColor = '#ffd700';
            option.style.background = 'rgba(255,215,0,0.2)';
            option.classList.add('selected');
            isFirst = false;
        }
        
        option.innerHTML = `
            <div style="font-size: 40px; margin-bottom: 10px;">${getVehicleEmoji(vehicleType)}</div>
            <div style="color: #ffd700; font-weight: bold; margin-bottom: 5px;">${stats.name}</div>
            <div style="color: #ccc; font-size: 0.9em;">
                Health: ${stats.health} | Damage: ${stats.damage}<br>
                Speed: ${stats.speed} | Fire Rate: ${stats.fireRate}
            </div>
        `;
        
        option.addEventListener('click', () => {
            document.querySelectorAll('.upgrade-option').forEach(opt => {
                opt.style.borderColor = 'transparent';
                opt.style.background = 'rgba(255, 255, 255, 0.1)';
                opt.classList.remove('selected');
            });
            option.style.borderColor = '#ffd700';
            option.style.background = 'rgba(255,215,0,0.2)';
            option.classList.add('selected');
        });
        
        upgradeOptions.appendChild(option);
    });
    
    // Confirm button handler
    const confirmBtn = document.getElementById('confirmUpgrade');
    confirmBtn.onclick = () => {
        // Use class-based selection instead of style checking
        const selected = document.querySelector('.upgrade-option.selected');
        if (selected) {
            const newVehicleType = selected.dataset.vehicle;
            socket.emit('select-vehicle-upgrade', {
                playerId: playerId,
                newLevel: nextLevel,
                newVehicleType: newVehicleType
            });
            upgradeScreen.remove();
            gameRunning = true;
        } else {
            alert('Please select a vehicle upgrade!');
        }
    };
    
    // Show the screen
    upgradeScreen.style.display = 'flex';
    gameRunning = false;
}

function getVehicleEmoji(type) {
    const emojis = {
        tank: '🚀',
        jeep: '🚙', 
        apc: '🚜',
        artillery: '🚛',
        helicopter: '🚁'
    };
    return emojis[type] || '🚗';
}

// Add this function to check for resource collection
function checkResourceCollection() {
    if (!player) return;
    
    resources.forEach((resource, index) => {
        const dx = resource.x - player.x;
        const dy = resource.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < (player.width / 2 + resource.size)) {
            socket.emit('collect-resource', {
                playerId: player.id,
                resource: {
                    x: resource.x,
                    y: resource.y,
                    type: resource.type,
                    value: resource.value
                }
            });
            
            // Remove from local array (server will respawn it)
            resources.splice(index, 1);
        }
    });
}

// Game functions
function initGame() {
    const nameInput = document.getElementById('playerNameInput');
    playerName = nameInput.value.trim().slice(0, 15) || "Soldier" + Math.floor(Math.random() * 1000);
    
    // Reset game state
    players = [];
    bullets = [];
    explosions = [];
    startTime = Date.now();

    // Create player at center of map
    const startX = mapSize / 2;
    const startY = mapSize / 2;
    
    player = new Vehicle(
        startX,
        startY,
        true,
        playerId,
        selectedVehicle,
        null,
        playerName
    );
    
    players.push(player);

    socket.emit('join-game', {
        name: playerName,
        vehicleType: selectedVehicle,
    });

    // Update UI
    healthDisplay.textContent = Math.ceil(player.health);
    killsDisplay.textContent = player.kills;
    scoreDisplay.textContent = player.score;
    levelDisplay.textContent = player.level;
    vehicleNameDisplay.textContent = player.displayName;

    // Set camera to player position
    camera.x = player.x - (canvas.width / (window.devicePixelRatio || 1)) / 2;
    camera.y = player.y - (canvas.height / (window.devicePixelRatio || 1)) / 2;
    
    // Initialize XP bar
    updateXPBar(player.experience, player.level);
    
    console.log('🎮 Game started!');
    console.log('📍 Player at:', player.x, player.y);
    console.log('📷 Camera at:', camera.x, camera.y);
    console.log('🖼️ Canvas size:', canvas.width + ' (' + (canvas.width / (window.devicePixelRatio || 1)) + ' css)');
}

function updateLeaderboard() {
    leaderboardEntries.innerHTML = '';

    const sorted = [...leaderboard].sort((a, b) => b.score - a.score).slice(0, 10);

    sorted.forEach((entry, index) => {
        const isYou = entry.id === playerId;
        const entryEl = document.createElement('div');
        entryEl.className = `leaderboard-entry ${isYou ? 'leaderboard-you' : ''}`;
        entryEl.innerHTML = `
            <div>
                <span class="leaderboard-rank">${index + 1}.</span>
                <span>${entry.name}</span>
                ${entry.level > 1 ? `<span class="level-badge">Lvl ${entry.level}</span>` : ''}
            </div>
            <div>${entry.score}</div>
        `;
        leaderboardEntries.appendChild(entryEl);
    });
}

function updateCamera() {
    if (player) {
        // Get the actual display size (CSS pixels) - FIXED CALCULATION
        const displayWidth = canvas.width / (window.devicePixelRatio || 1);
        const displayHeight = canvas.height / (window.devicePixelRatio || 1);
        
        // Debug before calculation
        console.log('🔍 Before camera - Player:', player.x, player.y, 'Screen:', displayWidth, displayHeight);
        
        // Direct camera positioning - FIXED
        camera.x = player.x - displayWidth / 2;
        camera.y = player.y - displayHeight / 2;
        
        // Debug after calculation
        console.log('📐 Calculated camera:', camera.x, camera.y);
        
        // Keep within bounds
        camera.x = Math.max(0, Math.min(mapSize - displayWidth, camera.x));
        camera.y = Math.max(0, Math.min(mapSize - displayHeight, camera.y));
        
        // Final debug
        console.log('🎯 Final camera:', Math.round(camera.x), Math.round(camera.y), 
                   'Player screen pos:', Math.round(player.x - camera.x), Math.round(player.y - camera.y));
    }
}

function drawBackground() {
    // Simple gradient background
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#2d5016');
    gradient.addColorStop(1, '#4a7c3a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid for orientation
    const gridSize = 100;
    const startX = Math.floor(camera.x / gridSize) * gridSize;
    const startY = Math.floor(camera.y / gridSize) * gridSize;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;

    for (let x = startX; x < camera.x + canvas.width + gridSize; x += gridSize) {
        const screenX = x - camera.x;
        ctx.beginPath();
        ctx.moveTo(screenX, 0);
        ctx.lineTo(screenX, canvas.height);
        ctx.stroke();
    }

    for (let y = startY; y < camera.y + canvas.height + gridSize; y += gridSize) {
        const screenY = y - camera.y;
        ctx.beginPath();
        ctx.moveTo(0, screenY);
        ctx.lineTo(canvas.width, screenY);
        ctx.stroke();
    }
}

function drawMiniMap() {
    minimapCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    minimapCtx.fillRect(0, 0, minimap.width, minimap.height);

    const scale = minimap.width / mapSize;

    // Draw players
    players.forEach(p => {
        if (!p) return;
        minimapCtx.fillStyle = p.id === playerId ? '#ffd700' : p.color;
        minimapCtx.beginPath();
        minimapCtx.arc(p.x * scale, p.y * scale, 3, 0, Math.PI * 2);
        minimapCtx.fill();
    });

    // Draw camera view
    minimapCtx.strokeStyle = '#ffd700';
    minimapCtx.lineWidth = 2;
    minimapCtx.strokeRect(
        camera.x * scale,
        camera.y * scale,
        (canvas.width / (window.devicePixelRatio || 1)) * scale,
        (canvas.height / (window.devicePixelRatio || 1)) * scale
    );
}

function drawHUD() {
    // Controls info
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, canvas.height - 100, 220, 90);

    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';

    if (!isMobile) {
        ctx.fillText('W/S: Forward/Backward', 20, canvas.height - 80);
        ctx.fillText('A/D: Rotate', 20, canvas.height - 60);
        ctx.fillText('Mouse: Aim Turret', 20, canvas.height - 40);
        ctx.fillText('Click: Shoot', 20, canvas.height - 20);
    }
}

function showGameOver() {
    if (!gameRunning) return;
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

// Game loop
function gameLoop(timestamp) {
    updateCamera();

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    drawBackground();

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
    players.forEach((p) => {
        if (p) {
            if (p.isPlayer && gameRunning) {
                p.update();
            }
            p.draw();
        }
    });

    // Update and draw bullets
    bullets.forEach(bullet => {
        bullet.update();
        bullet.draw();
    });

    // Update and draw explosions
    for (let i = explosions.length - 1; i >= 0; i--) {
        const explosion = explosions[i];
        explosion.update();
        explosion.draw();

        if (explosion.isDone()) explosions.splice(i, 1);
    }

    // Check for resource collection only when game is running
    if (gameRunning) {
        checkResourceCollection();
    }

    // Draw UI
    drawMiniMap();
    drawHUD();

    requestAnimationFrame(gameLoop);
}

// Start game
startButton.addEventListener('click', () => {
    ensureSoundsInitialized(); // Initialize sounds when game starts
    
    if (!selectedVehicle) {
        alert('Please select a vehicle!');
        return;
    }

    startScreen.style.display = 'none';
    gameRunning = true;
    initGame();
    console.log('🚀 Starting game loop...');
    requestAnimationFrame(gameLoop);
});

// Play again
playAgainButton.addEventListener('click', () => {
    gameOverScreen.classList.add('hidden');
    startScreen.style.display = 'flex';
    socket.disconnect();
    socket.connect();
});

// Auto-select first vehicle
vehicleOptions[0].classList.add('selected');

console.log('=== GAME INITIALIZATION COMPLETE ===');