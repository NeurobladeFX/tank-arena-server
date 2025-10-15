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
const MAP_SIZE = 3000;
const MAX_PLAYERS = 50;

// Enhanced Vehicle System with Upgrades
const VEHICLE_SYSTEM = {
  tank: {
    base: { health: 150, speed: 2, damage: 35, size: 60 },
    upgrades: {
      1: { health: 180, speed: 2.2, damage: 40, name: "Advanced Tank" },
      2: { health: 220, speed: 2.4, damage: 45, name: "Battle Tank" },
      3: { health: 270, speed: 2.6, damage: 50, name: "Elite Tank" }
    }
  },
  jeep: {
    base: { health: 100, speed: 4, damage: 20, size: 50 },
    upgrades: {
      1: { health: 120, speed: 4.3, damage: 25, name: "Combat Jeep" },
      2: { health: 140, speed: 4.6, damage: 30, name: "Assault Jeep" },
      3: { health: 160, speed: 5.0, damage: 35, name: "Commando Jeep" }
    }
  },
  apc: {
    base: { health: 200, speed: 1.5, damage: 25, size: 70 },
    upgrades: {
      1: { health: 240, speed: 1.7, damage: 30, name: "Armored APC" },
      2: { health: 290, speed: 1.9, damage: 35, name: "Heavy APC" },
      3: { health: 350, speed: 2.1, damage: 40, name: "Battle APC" }
    }
  },
  artillery: {
    base: { health: 120, speed: 1, damage: 50, size: 65 },
    upgrades: {
      1: { health: 140, speed: 1.1, damage: 60, name: "Field Artillery" },
      2: { health: 170, speed: 1.2, damage: 70, name: "Heavy Artillery" },
      3: { health: 200, speed: 1.3, damage: 80, name: "Siege Artillery" }
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
  // Border walls
  obstacles.push({ x: 0, y: MAP_SIZE/2, width: 50, height: MAP_SIZE, type: 'wall' });
  obstacles.push({ x: MAP_SIZE, y: MAP_SIZE/2, width: 50, height: MAP_SIZE, type: 'wall' });
  obstacles.push({ x: MAP_SIZE/2, y: 0, width: MAP_SIZE, height: 50, type: 'wall' });
  obstacles.push({ x: MAP_SIZE/2, y: MAP_SIZE, width: MAP_SIZE, height: 50, type: 'wall' });

  for (let i = 0; i < 50; i++) {
    obstacles.push({
      x: Math.random() * (MAP_SIZE - 200) + 100,
      y: Math.random() * (MAP_SIZE - 200) + 100,
      width: Math.random() * 100 + 50,
      height: Math.random() * 100 + 50,
      type: Math.random() > 0.7 ? 'destructible' : 'wall'
    });
  }
  return obstacles;
}

function generateResources() {
  const resources = [];
  for (let i = 0; i < 30; i++) {
    resources.push({
      x: Math.random() * (MAP_SIZE - 100) + 50,
      y: Math.random() * (MAP_SIZE - 100) + 50,
      type: Math.random() > 0.5 ? 'health' : 'ammo',
      value: Math.random() > 0.5 ? 25 : 50
    });
  }
  return resources;
}

function getVehicleStats(vehicleType, level) {
  const vehicle = VEHICLE_SYSTEM[vehicleType];
  if (level > 1 && vehicle.upgrades[level]) {
    return vehicle.upgrades[level];
  }
  return vehicle.base;
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
  gameState.bullets = gameState.bullets.filter(bullet => {
    bullet.x += Math.cos(bullet.angle) * bullet.speed;
    bullet.y += Math.sin(bullet.angle) * bullet.speed;
    return bullet.x > 0 && bullet.x < MAP_SIZE && bullet.y > 0 && bullet.y < MAP_SIZE;
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
              gameState.players[bullet.ownerId].kills++;
              gameState.players[bullet.ownerId].score += 100;
              gameState.players[bullet.ownerId].experience += 50;
              
              // Check for level up
              const killer = gameState.players[bullet.ownerId];
              const newLevel = Math.floor(killer.experience / 300) + 1;
              if (newLevel > killer.level && newLevel <= 3) {
                killer.level = newLevel;
                killer.health = getVehicleStats(killer.vehicleType, killer.level).health;
              }
              
              io.emit('player-killed', {
                killerId: bullet.ownerId,
                victimId: playerId
              });
            }
            
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
      health: stats.health,
      color: playerData.color,
      name: playerData.name,
      vehicleType: playerData.vehicleType,
      kills: 0,
      score: 0,
      experience: 0,
      level: 1
    };
    
    console.log(`Player ${playerData.name} joined as ${playerData.vehicleType}`);
    io.emit('game-state', gameState);
  });
  
  socket.on('player-update', (playerData) => {
    if (gameState.players[playerData.id]) {
      gameState.players[playerData.id].x = playerData.x;
      gameState.players[playerData.id].y = playerData.y;
      gameState.players[playerData.id].angle = playerData.angle;
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
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    delete gameState.players[socket.id];
    io.emit('game-state', gameState);
  });
});

startGameLoop();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Military Vehicles IO Server running on port ${PORT}`);
});