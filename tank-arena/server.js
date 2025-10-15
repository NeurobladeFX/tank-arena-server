const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Game Configuration
const MAP_SIZE = 4000;
const MAX_PLAYERS = 50;

// Enhanced Vehicle System with 5 Levels and 6 Vehicles
const VEHICLE_SYSTEM = {
    tank: {
        base: { health: 150, speed: 2, damage: 35, size: 70, fireRate: 1.0, name: "Light Tank" },
        upgrades: {
            2: { health: 200, speed: 2.2, damage: 45, size: 75, fireRate: 1.1, name: "Medium Tank" },
            3: { health: 280, speed: 2.3, damage: 55, size: 80, fireRate: 1.2, name: "Heavy Tank" },
            4: { health: 350, speed: 2.4, damage: 65, size: 85, fireRate: 1.3, name: "Battle Tank" },
            5: { health: 450, speed: 2.5, damage: 80, size: 90, fireRate: 1.5, name: "Elite Tank" }
        }
    },
    jeep: {
        base: { health: 100, speed: 4, damage: 20, size: 55, fireRate: 1.2, name: "Scout Jeep" },
        upgrades: {
            2: { health: 130, speed: 4.5, damage: 25, size: 58, fireRate: 1.3, name: "Combat Jeep" },
            3: { health: 170, speed: 5.0, damage: 30, size: 62, fireRate: 1.4, name: "Assault Jeep" },
            4: { health: 220, speed: 5.5, damage: 35, size: 65, fireRate: 1.5, name: "Raider Jeep" },
            5: { health: 280, speed: 6.0, damage: 40, size: 70, fireRate: 1.7, name: "Commando Jeep" }
        }
    },
    apc: {
        base: { health: 200, speed: 1.5, damage: 25, size: 80, fireRate: 0.8, name: "Armored APC" },
        upgrades: {
            2: { health: 280, speed: 1.7, damage: 30, size: 85, fireRate: 0.9, name: "Heavy APC" },
            3: { health: 350, speed: 1.9, damage: 35, size: 90, fireRate: 1.0, name: "Battle APC" },
            4: { health: 450, speed: 2.1, damage: 40, size: 95, fireRate: 1.1, name: "Assault APC" },
            5: { health: 550, speed: 2.3, damage: 50, size: 100, fireRate: 1.2, name: "Titan APC" }
        }
    },
    artillery: {
        base: { health: 120, speed: 1, damage: 50, size: 70, fireRate: 0.5, name: "Field Artillery" },
        upgrades: {
            2: { health: 160, speed: 1.1, damage: 65, size: 75, fireRate: 0.6, name: "Heavy Artillery" },
            3: { health: 210, speed: 1.2, damage: 80, size: 80, fireRate: 0.7, name: "Siege Artillery" },
            4: { health: 270, speed: 1.3, damage: 95, size: 85, fireRate: 0.8, name: "Mobile Artillery" },
            5: { health: 340, speed: 1.4, damage: 120, size: 90, fireRate: 0.9, name: "Super Artillery" }
        }
    },
    helicopter: {
        base: { health: 80, speed: 3.5, damage: 15, size: 60, fireRate: 2.0, name: "Scout Helicopter" },
        upgrades: {
            2: { health: 110, speed: 3.8, damage: 20, size: 65, fireRate: 2.2, name: "Attack Helicopter" },
            3: { health: 150, speed: 4.0, damage: 25, size: 70, fireRate: 2.4, name: "Gunship Helicopter" },
            4: { health: 200, speed: 4.2, damage: 30, size: 75, fireRate: 2.6, name: "Heavy Gunship" },
            5: { health: 260, speed: 4.5, damage: 35, size: 80, fireRate: 2.8, name: "Elite Helicopter" }
        }
    },
    mech: {
        base: { health: 180, speed: 1.8, damage: 40, size: 65, fireRate: 0.9, name: "Combat Mech" },
        upgrades: {
            2: { health: 240, speed: 1.9, damage: 50, size: 70, fireRate: 1.0, name: "Assault Mech" },
            3: { health: 320, speed: 2.0, damage: 60, size: 75, fireRate: 1.1, name: "Heavy Mech" },
            4: { health: 400, speed: 2.1, damage: 70, size: 80, fireRate: 1.2, name: "Battle Mech" },
            5: { health: 500, speed: 2.2, damage: 85, size: 85, fireRate: 1.3, name: "Titan Mech" }
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
  
  for (let i = 0; i < 50; i++) {
    obstacles.push({
      x: Math.random() * (MAP_SIZE - 200) + 100,
      y: Math.random() * (MAP_SIZE - 200) + 100,
      width: Math.random() * 100 + 50,
      height: Math.random() * 100 + 50,
      type: 'wall'
    });
  }
  
  for (let i = 0; i < 8; i++) {
    obstacles.push({
      x: Math.random() * (MAP_SIZE - 200) + 100,
      y: Math.random() * (MAP_SIZE - 200) + 100,
      width: 150 + Math.random() * 150,
      height: 150 + Math.random() * 150,
      type: 'wall'
    });
  }
  
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
  
  // More XP resources for progressive leveling
  for (let i = 0; i < 40; i++) {
    resources.push({
      x: Math.random() * (MAP_SIZE - 100) + 50,
      y: Math.random() * (MAP_SIZE - 100) + 50,
      type: 'experience',
      value: 25 + Math.floor(Math.random() * 25) // 25-50 XP
    });
  }
  
  for (let i = 0; i < 20; i++) {
    resources.push({
      x: Math.random() * (MAP_SIZE - 100) + 50,
      y: Math.random() * (MAP_SIZE - 100) + 50,
      type: 'health',
      value: 25
    });
  }
  
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

// Progressive XP calculation
function calculateXPNeeded(level) {
  return 300 + (level * 150); // Level 1: 450, Level 2: 600, Level 3: 750, etc.
}

// Game Loop
const GAME_LOOP_INTERVAL = 1000 / 60;
let gameLoop;

function startGameLoop() {
  gameLoop = setInterval(() => {
    updateGameState();
    io.emit('game-state', gameState);
    updateLeaderboard();
  }, GAME_LOOP_INTERVAL);
}

function updateGameState() {
  // Update bullets
  gameState.bullets = gameState.bullets.filter(bullet => {
    bullet.x += Math.cos(bullet.angle) * bullet.speed;
    bullet.y += Math.sin(bullet.angle) * bullet.speed;
    
    // Remove bullets that hit obstacles or go out of bounds
    const hitObstacle = gameState.obstacles.some(obstacle => {
      return bullet.x > obstacle.x - obstacle.width/2 && 
             bullet.x < obstacle.x + obstacle.width/2 &&
             bullet.y > obstacle.y - obstacle.height/2 && 
             bullet.y < obstacle.y + obstacle.height/2;
    });
    
    return !hitObstacle && 
           bullet.x > 0 && bullet.x < MAP_SIZE && 
           bullet.y > 0 && bullet.y < MAP_SIZE;
  });
  
  checkCollisions();
}

function checkCollisions() {
  gameState.bullets = gameState.bullets.filter(bullet => {
    let hit = false;
    
    Object.keys(gameState.players).forEach(playerId => {
      const player = gameState.players[playerId];
      
      if (playerId !== bullet.ownerId) {
        const dx = bullet.x - player.x;
        const dy = bullet.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const playerSize = getVehicleStats(player.vehicleType, player.level).size;
        
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
              
              // Check for level up with progressive XP
              const xpNeeded = calculateXPNeeded(killer.level);
              if (killer.experience >= xpNeeded && killer.level < 5) {
                killer.level++;
                killer.experience = killer.experience - xpNeeded; // Carry over excess XP
                
                // Show upgrade screen
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
            
            // Respawn player after 3 seconds
            setTimeout(() => {
              if (gameState.players[playerId]) {
                const stats = getVehicleStats(gameState.players[playerId].vehicleType, gameState.players[playerId].level);
                gameState.players[playerId].health = stats.health;
                gameState.players[playerId].x = Math.random() * (MAP_SIZE - 200) + 100;
                gameState.players[playerId].y = Math.random() * (MAP_SIZE - 200) + 100;
              }
            }, 3000);
          }
        }
      }
    });
    
    return !hit;
  });
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
    vehicleSystem: VEHICLE_SYSTEM
  });
  
  socket.emit('game-state', gameState);
  
  socket.on('join-game', (playerData) => {
    if (Object.keys(gameState.players).length >= MAX_PLAYERS) {
      socket.emit('game-full');
      return;
    }
    
    const stats = getVehicleStats(playerData.vehicleType, 1);
    
    gameState.players[playerData.id] = {
      id: playerData.id,
      x: Math.random() * (MAP_SIZE - 200) + 100,
      y: Math.random() * (MAP_SIZE - 200) + 100,
      angle: 0,
      turretAngle: 0,
      health: stats.health,
      maxHealth: stats.health,
      color: playerData.color,
      name: playerData.name,
      vehicleType: playerData.vehicleType,
      kills: 0,
      score: 0,
      experience: 0,
      level: 1
    };
    
    console.log(`Player ${playerData.name} joined as ${playerData.vehicleType}`);
    io.emit('player-joined', gameState.players[playerData.id]);
  });
  
  socket.on('player-update', (playerData) => {
    if (gameState.players[playerData.id]) {
      gameState.players[playerData.id].x = playerData.x;
      gameState.players[playerData.id].y = playerData.y;
      gameState.players[playerData.id].angle = playerData.angle;
      gameState.players[playerData.id].turretAngle = playerData.turretAngle;
      if (playerData.level) {
        gameState.players[playerData.id].level = playerData.level;
      }
    }
  });
  
  socket.on('bullet-fired', (bulletData) => {
    const player = gameState.players[bulletData.ownerId];
    if (player) {
      const stats = getVehicleStats(player.vehicleType, player.level);
      gameState.bullets.push({
        ...bulletData,
        damage: stats.damage,
        speed: 8
      });
      
      io.emit('bullet-created', {
        ...bulletData,
        damage: stats.damage
      });
    }
  });
  
  // NEW: Resource collection
  socket.on('collect-resource', (data) => {
    const player = gameState.players[data.playerId];
    if (!player) return;

    // Remove the collected resource
    gameState.resources = gameState.resources.filter(r => 
        !(Math.abs(r.x - data.resource.x) < 5 && 
          Math.abs(r.y - data.resource.y) < 5 && 
          r.type === data.resource.type)
    );

    // Apply resource effects
    if (data.resource.type === 'health') {
        player.health = Math.min(player.maxHealth, player.health + data.resource.value);
    } else if (data.resource.type === 'experience') {
        // Award XP and score
        player.experience += data.resource.value;
        player.score += data.resource.value;
        
        // Check for level up with progressive requirements
        const xpNeeded = calculateXPNeeded(player.level);
        if (player.experience >= xpNeeded && player.level < 5) {
            // Level up and show upgrade screen
            player.level++;
            player.experience = player.experience - xpNeeded;
            
            io.to(data.playerId).emit('show-upgrade-screen', {
                playerId: data.playerId,
                currentLevel: player.level - 1,
                nextLevel: player.level
            });
        }
    }

    // Notify all clients
    io.emit('resource-collected', {
        playerId: data.playerId,
        resource: data.resource
    });

    // Spawn new resource after delay
    setTimeout(() => {
        const newResource = {
            x: Math.random() * (MAP_SIZE - 100) + 50,
            y: Math.random() * (MAP_SIZE - 100) + 50,
            type: data.resource.type,
            value: data.resource.value
        };
        gameState.resources.push(newResource);
        io.emit('resource-spawned', newResource);
    }, 5000);
  });
  
  // NEW: Vehicle upgrade selection
  socket.on('select-vehicle-upgrade', (data) => {
    const player = gameState.players[data.playerId];
    if (!player) return;

    // Update player vehicle and level
    player.vehicleType = data.newVehicleType;
    player.level = data.newLevel;
    
    // Update stats based on new vehicle and level
    const stats = getVehicleStats(data.newVehicleType, data.newLevel);
    player.health = stats.health;
    player.maxHealth = stats.health;

    // Notify all clients
    io.emit('vehicle-upgraded', {
        playerId: data.playerId,
        newVehicleType: data.newVehicleType,
        newLevel: player.level
    });
  });
  
  // NEW: Player upgraded
  socket.on('player-upgraded', (data) => {
    const player = gameState.players[data.id];
    if (player) {
        player.level = data.level;
        player.vehicleType = data.vehicleType;
        
        const stats = getVehicleStats(data.vehicleType, data.level);
        player.health = stats.health;
        player.maxHealth = stats.health;
        
        io.emit('player-upgraded', {
            playerId: data.id,
            level: data.level,
            vehicleType: data.vehicleType
        });
    }
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    delete gameState.players[socket.id];
    io.emit('player-left', socket.id);
  });
});

startGameLoop();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Military Vehicles IO Server running on port ${PORT}`);
});
