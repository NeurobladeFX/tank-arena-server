const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Get the correct path to public directory
const publicPath = path.join(__dirname, 'public');
console.log('Public path:', publicPath);

// Serve static files from public directory
app.use(express.static(publicPath));
app.use('/assets', express.static(path.join(publicPath, 'assets')));

// Routes
app.get('/', (req, res) => {
  const indexPath = path.join(publicPath, 'index.html');
  console.log('Serving index.html from:', indexPath);
  res.sendFile(indexPath);
});

// Health check for Render
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    players: Object.keys(gameState.players).length,
    uptime: process.uptime()
  });
});

// Game Configuration
const MAP_SIZE = 4000;
const MAX_PLAYERS = 50;

// Enhanced Vehicle System with 5 Levels and 6 Vehicles
const VEHICLE_SYSTEM = {
    tank: {
        base: { health: 150, speed: 2, damage: 35, size: 70, fireRate: 1.0, name: "Light Tank", rotationSpeed: 0.03 },
        upgrades: {
            2: { health: 200, speed: 2.2, damage: 45, size: 75, fireRate: 1.1, name: "Medium Tank", rotationSpeed: 0.035 },
            3: { health: 280, speed: 2.3, damage: 55, size: 80, fireRate: 1.2, name: "Heavy Tank", rotationSpeed: 0.04 },
            4: { health: 350, speed: 2.4, damage: 65, size: 85, fireRate: 1.3, name: "Battle Tank", rotationSpeed: 0.045 },
            5: { health: 450, speed: 2.5, damage: 80, size: 90, fireRate: 1.5, name: "Elite Tank", rotationSpeed: 0.05 }
        }
    },
    jeep: {
        base: { health: 100, speed: 4, damage: 20, size: 55, fireRate: 1.2, name: "Scout Jeep", rotationSpeed: 0.05 },
        upgrades: {
            2: { health: 130, speed: 4.5, damage: 25, size: 58, fireRate: 1.3, name: "Combat Jeep", rotationSpeed: 0.055 },
            3: { health: 170, speed: 5.0, damage: 30, size: 62, fireRate: 1.4, name: "Assault Jeep", rotationSpeed: 0.06 },
            4: { health: 220, speed: 5.5, damage: 35, size: 65, fireRate: 1.5, name: "Raider Jeep", rotationSpeed: 0.065 },
            5: { health: 280, speed: 6.0, damage: 40, size: 70, fireRate: 1.7, name: "Commando Jeep", rotationSpeed: 0.07 }
        }
    },
    apc: {
        base: { health: 200, speed: 1.5, damage: 25, size: 80, fireRate: 0.8, name: "Armored APC", rotationSpeed: 0.025 },
        upgrades: {
            2: { health: 280, speed: 1.7, damage: 30, size: 85, fireRate: 0.9, name: "Heavy APC", rotationSpeed: 0.03 },
            3: { health: 350, speed: 1.9, damage: 35, size: 90, fireRate: 1.0, name: "Battle APC", rotationSpeed: 0.035 },
            4: { health: 450, speed: 2.1, damage: 40, size: 95, fireRate: 1.1, name: "Commando APC", rotationSpeed: 0.04 },
            5: { health: 550, speed: 2.3, damage: 50, size: 100, fireRate: 1.2, name: "Elite APC", rotationSpeed: 0.045 }
        }
    },
    artillery: {
        base: { health: 120, speed: 1, damage: 50, size: 70, fireRate: 0.5, name: "Field Artillery", rotationSpeed: 0.02 },
        upgrades: {
            2: { health: 160, speed: 1.1, damage: 65, size: 75, fireRate: 0.6, name: "Heavy Artillery", rotationSpeed: 0.025 },
            3: { health: 210, speed: 1.2, damage: 80, size: 80, fireRate: 0.7, name: "Battle Artillery", rotationSpeed: 0.03 },
            4: { health: 270, speed: 1.3, damage: 95, size: 85, fireRate: 0.8, name: "Plasma Artillery", rotationSpeed: 0.035 },
            5: { health: 340, speed: 1.4, damage: 120, size: 90, fireRate: 0.9, name: "Elite Artillery", rotationSpeed: 0.04 }
        }
    },
    helicopter: {
        base: { health: 80, speed: 3.5, damage: 15, size: 60, fireRate: 2.0, name: "Scout Helicopter", rotationSpeed: 0.06 },
        upgrades: {
            2: { health: 110, speed: 3.8, damage: 20, size: 65, fireRate: 2.2, name: "Attack Helicopter", rotationSpeed: 0.065 },
            3: { health: 150, speed: 4.0, damage: 25, size: 70, fireRate: 2.4, name: "Gunship Helicopter", rotationSpeed: 0.07 },
            4: { health: 200, speed: 4.2, damage: 30, size: 75, fireRate: 2.6, name: "Stealth Helicopter", rotationSpeed: 0.075 },
            5: { health: 260, speed: 4.5, damage: 35, size: 80, fireRate: 2.8, name: "Elite Helicopter", rotationSpeed: 0.08 }
        }
    }
};

// Game State
const gameState = {
  players: {},
  bullets: [],
  obstacles: generateObstacles(),
  resources: generateResources(),
  leaderboard: []
};

function generateObstacles() {
  const obstacles = [];
  
  // Large obstacles
  for (let i = 0; i < 50; i++) {
    obstacles.push({
      x: Math.random() * (MAP_SIZE - 200) + 100,
      y: Math.random() * (MAP_SIZE - 200) + 100,
      width: Math.random() * 100 + 50,
      height: Math.random() * 100 + 50,
      type: 'wall'
    });
  }
  
  // Very large obstacles
  for (let i = 0; i < 8; i++) {
    obstacles.push({
      x: Math.random() * (MAP_SIZE - 200) + 100,
      y: Math.random() * (MAP_SIZE - 200) + 100,
      width: 150 + Math.random() * 150,
      height: 150 + Math.random() * 150,
      type: 'wall'
    });
  }
  
  // Wall-like obstacles
  for (let i = 0; i < 10; i++) {
    const isHorizontal = Math.random() > 0.5;
    if (isHorizontal) {
      obstacles.push({
        x: Math.random() * (MAP_SIZE - 200) + 100,
        y: Math.random() * (MAP_SIZE - 200) + 100,
        width: 200 + Math.random() * 300,
        height: 30,
        type: 'wall'
      });
    } else {
      obstacles.push({
        x: Math.random() * (MAP_SIZE - 200) + 100,
        y: Math.random() * (MAP_SIZE - 200) + 100,
        width: 30,
        height: 200 + Math.random() * 300,
        type: 'wall'
      });
    }
  }
  
  return obstacles;
}

function generateResources() {
  const resources = [];
  
  // XP resources
  for (let i = 0; i < 40; i++) {
    resources.push({
      x: Math.random() * (MAP_SIZE - 100) + 50,
      y: Math.random() * (MAP_SIZE - 100) + 50,
      type: 'experience',
      value: 25 + Math.floor(Math.random() * 25)
    });
  }
  
  // Health resources
  for (let i = 0; i < 20; i++) {
    resources.push({
      x: Math.random() * (MAP_SIZE - 100) + 50,
      y: Math.random() * (MAP_SIZE - 100) + 50,
      type: 'health',
      value: 25
    });
  }
  
  // Ammo resources
  for (let i = 0; i < 15; i++) {
    resources.push({
      x: Math.random() * (MAP_SIZE - 100) + 50,
      y: Math.random() * (MAP_SIZE - 100) + 50,
      type: 'ammo',
      value: 50
    });
  }
  
  return resources;
}

function getVehicleStats(vehicleType, level) {
  const vehicle = VEHICLE_SYSTEM[vehicleType];
  if (!vehicle) return VEHICLE_SYSTEM.tank.base;
  
  if (level > 1 && vehicle.upgrades[level]) {
    return vehicle.upgrades[level];
  }
  return vehicle.base;
}

function calculateXPNeeded(level) {
  // Progressive difficulty - each level gets significantly harder
  // Level 1->2: 500 XP
  // Level 2->3: 1200 XP (2.4x harder)
  // Level 3->4: 2500 XP (2.1x harder) 
  // Level 4->5: 5000 XP (2x harder)
  // Total to reach level 5: 9,200 XP - Very challenging!
  const xpRequirements = {
    1: 500,
    2: 1200,
    3: 2500,
    4: 5000,
    5: 0  // Max level
  };
  return xpRequirements[level] || 0;
}

// Game Loop
const GAME_LOOP_INTERVAL = 1000 / 60;
let gameLoop;

function startGameLoop() {
  gameLoop = setInterval(() => {
    updateGameState();
    io.emit('game-state', gameState);
  }, GAME_LOOP_INTERVAL);
}

function updateGameState() {
  // Update bullets
  for (let i = gameState.bullets.length - 1; i >= 0; i--) {
    const bullet = gameState.bullets[i];
    bullet.x += Math.cos(bullet.angle) * bullet.speed;
    bullet.y += Math.sin(bullet.angle) * bullet.speed;
    
    // Remove bullets that go out of bounds
    if (bullet.x < 0 || bullet.x > MAP_SIZE || bullet.y < 0 || bullet.y > MAP_SIZE) {
        gameState.bullets.splice(i, 1);
        continue;
    }
    
    // Remove bullets that hit obstacles
    const hitObstacle = gameState.obstacles.some(obstacle => {
      return bullet.x > obstacle.x - obstacle.width/2 && 
             bullet.x < obstacle.x + obstacle.width/2 &&
             bullet.y > obstacle.y - obstacle.height/2 && 
             bullet.y < obstacle.y + obstacle.height/2;
    });

    if (hitObstacle) {
        gameState.bullets.splice(i, 1);
    }
  }
  
  checkCollisions();
  updateLeaderboard();
}

function checkCollisions() {
    for (let i = gameState.bullets.length - 1; i >= 0; i--) {
        const bullet = gameState.bullets[i];
        let hit = false;

        for (const playerId in gameState.players) {
            const player = gameState.players[playerId];

            if (playerId !== bullet.ownerId) {
                const dx = bullet.x - player.x;
                const dy = bullet.y - player.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const playerSize = getVehicleStats(player.vehicleType, player.level).size / 2;

                if (distance < playerSize) {
                    player.health -= bullet.damage;
                    hit = true;

                    io.emit('player-hit', {
                        playerId: playerId,
                        newHealth: player.health,
                        x: bullet.x,
                        y: bullet.y
                    });

                    if (player.health <= 0) {
                        if (gameState.players[bullet.ownerId]) {
                            const killer = gameState.players[bullet.ownerId];
                            killer.kills++;
                            killer.score += 100;
                            killer.experience += 50;

                            const xpNeeded = calculateXPNeeded(killer.level);
                            if (killer.experience >= xpNeeded && killer.level < 5) {
                                killer.level++;
                                killer.experience -= xpNeeded; 
                                io.to(bullet.ownerId).emit('show-upgrade-screen', {
                                    playerId: bullet.ownerId,
                                    currentLevel: killer.level - 1,
                                    nextLevel: killer.level
                                });
                            }

                            io.emit('player-killed', {
                                killerId: bullet.ownerId,
                                victimId: playerId
                            });
                        }
                        
                        delete gameState.players[playerId];
                        io.emit('player-left', playerId);
                    }
                    break; 
                }
            }
        }

        if (hit) {
            gameState.bullets.splice(i, 1);
        }
    }
}

function updateLeaderboard() {
  gameState.leaderboard = Object.values(gameState.players)
    .map(player => ({
      id: player.id,
      name: player.name,
      score: player.score || 0,
      kills: player.kills || 0,
      experience: player.experience || 0,
      level: player.level || 1,
      vehicle: player.vehicleType
    }))
    .sort((a, b) => b.score - a.score);
  
  io.emit('leaderboard-update', gameState.leaderboard);
}

// Socket Events
io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);
  
  socket.emit('game-config', {
    mapSize: MAP_SIZE,
  });
  
  socket.on('join-game', (playerData) => {
    if (Object.keys(gameState.players).length >= MAX_PLAYERS) {
      socket.emit('game-full');
      return;
    }
    
    const stats = getVehicleStats(playerData.vehicleType, 1);
    const defaultColor = { 
      tank: '#4CAF50', 
      jeep: '#2196F3', 
      apc: '#FF9800', 
      artillery: '#9C27B0', 
      helicopter: '#00BCD4'
    };
    
    gameState.players[socket.id] = {
      id: socket.id,
      x: Math.random() * (MAP_SIZE - 200) + 100,
      y: Math.random() * (MAP_SIZE - 200) + 100,
      angle: 0,
      turretAngle: 0,
      health: stats.health,
      maxHealth: stats.health,
      color: defaultColor[playerData.vehicleType] || '#4CAF50',
      name: playerData.name,
      vehicleType: playerData.vehicleType,
      kills: 0,
      score: 0,
      experience: 0,
      level: 1
    };
    
    socket.emit('game-state', gameState);
    io.emit('player-joined', gameState.players[socket.id]);
  });
  
  socket.on('player-update', (playerData) => {
    const player = gameState.players[socket.id];
    if (player) {
      player.x = playerData.x;
      player.y = playerData.y;
      player.angle = playerData.angle;
      player.turretAngle = playerData.turretAngle;
    }
  });
  
  socket.on('bullet-fired', (bulletData) => {
    const player = gameState.players[socket.id];
    if (player) {
      const stats = getVehicleStats(player.vehicleType, player.level);
      gameState.bullets.push({
        ...bulletData,
        damage: stats.damage,
        speed: 12,
        ownerId: socket.id
      });
    }
  });
  
  socket.on('collect-resource', (data) => {
    const player = gameState.players[data.playerId];
    if (!player) return;

    let resourceIndex = gameState.resources.findIndex(r => 
        Math.abs(r.x - data.resource.x) < 1 && 
        Math.abs(r.y - data.resource.y) < 1 && 
        r.type === data.resource.type
    );

    if (resourceIndex === -1) return;

    const collectedResource = gameState.resources.splice(resourceIndex, 1)[0];

    if (collectedResource.type === 'health') {
        player.health = Math.min(player.maxHealth, player.health + collectedResource.value);
    } else if (collectedResource.type === 'experience') {
        player.experience += collectedResource.value;
        player.score += 20;
        
        const xpNeeded = calculateXPNeeded(player.level);
        if (player.experience >= xpNeeded && player.level < 5) {
            player.level++;
            player.experience -= xpNeeded;
            io.to(data.playerId).emit('show-upgrade-screen', {
                playerId: data.playerId,
                nextLevel: player.level
            });
        }
    }

    io.emit('resource-collected', {
        playerId: data.playerId,
        resource: collectedResource
    });

    // Respawn resource after delay
    setTimeout(() => {
        const newResource = { 
          ...collectedResource, 
          x: Math.random() * (MAP_SIZE - 100) + 50, 
          y: Math.random() * (MAP_SIZE - 100) + 50 
        };
        gameState.resources.push(newResource);
        io.emit('resource-spawned', newResource);
    }, 5000);
  });
  
  socket.on('select-vehicle-upgrade', (data) => {
    const player = gameState.players[data.playerId];
    if (!player || player.level !== data.newLevel) return;

    player.vehicleType = data.newVehicleType;
    const stats = getVehicleStats(player.vehicleType, player.level);
    player.maxHealth = stats.health;
    player.health = stats.health;

    io.emit('vehicle-upgraded', {
        playerId: data.playerId,
        newVehicleType: player.vehicleType,
        newLevel: player.level
    });
  });
  
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    delete gameState.players[socket.id];
    io.emit('player-left', socket.id);
  });
});

startGameLoop();

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Military Vehicles IO Server running on port ${PORT}`);
  console.log('Current directory:', __dirname);
  console.log('Public directory:', publicPath);
});