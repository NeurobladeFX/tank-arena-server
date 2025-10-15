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

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Game configuration
const MAP_SIZE = 3000;
const MAX_PLAYERS = 50;
const VEHICLE_TYPES = {
  tank: { health: 150, speed: 2, damage: 35, size: 45, color: '#4CAF50' },
  jeep: { health: 100, speed: 4, damage: 20, size: 35, color: '#FF9800' },
  apc: { health: 200, speed: 1.5, damage: 25, size: 50, color: '#795548' },
  artillery: { health: 120, speed: 1, damage: 50, size: 40, color: '#607D8B' }
};

// Game state
const gameState = {
  players: {},
  bullets: [],
  obstacles: generateObstacles(),
  resources: generateResources(),
  leaderboard: [],
  gameTime: 600 // 10 minutes
};

// Generate obstacles
function generateObstacles() {
  const obstacles = [];
  // Border walls
  obstacles.push({ x: 0, y: MAP_SIZE/2, width: 50, height: MAP_SIZE, type: 'wall' });
  obstacles.push({ x: MAP_SIZE, y: MAP_SIZE/2, width: 50, height: MAP_SIZE, type: 'wall' });
  obstacles.push({ x: MAP_SIZE/2, y: 0, width: MAP_SIZE, height: 50, type: 'wall' });
  obstacles.push({ x: MAP_SIZE/2, y: MAP_SIZE, width: MAP_SIZE, height: 50, type: 'wall' });

  // Random obstacles
  for (let i = 0; i < 50; i++) {
    obstacles.push({
      x: Math.random() * (MAP_SIZE - 200) + 100,
      y: Math.random() * (MAP_SIZE - 200) + 100,
      width: Math.random() * 100 + 50,
      height: Math.random() * 100 + 50,
      type: Math.random() > 0.7 ? 'destructible' : 'wall'
    });
  }

  // Buildings
  for (let i = 0; i < 20; i++) {
    obstacles.push({
      x: Math.random() * (MAP_SIZE - 150) + 75,
      y: Math.random() * (MAP_SIZE - 150) + 75,
      width: 80,
      height: 80,
      type: 'building'
    });
  }

  return obstacles;
}

// Generate resources (ammo, health)
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

// Game loop
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
    
    // Remove bullets out of bounds
    return bullet.x > 0 && bullet.x < MAP_SIZE && bullet.y > 0 && bullet.y < MAP_SIZE;
  });
  
  // Check collisions
  checkCollisions();
  
  // Update game time
  gameState.gameTime--;
  
  // Regenerate resources occasionally
  if (Math.random() < 0.01 && gameState.resources.length < 30) {
    gameState.resources.push({
      x: Math.random() * (MAP_SIZE - 100) + 50,
      y: Math.random() * (MAP_SIZE - 100) + 50,
      type: Math.random() > 0.5 ? 'health' : 'ammo',
      value: Math.random() > 0.5 ? 25 : 50
    });
  }
}

function checkCollisions() {
  // Bullet vs Player collisions
  gameState.bullets = gameState.bullets.filter(bullet => {
    let hit = false;
    
    Object.keys(gameState.players).forEach(playerId => {
      const player = gameState.players[playerId];
      
      if (playerId !== bullet.ownerId) {
        const dx = bullet.x - player.x;
        const dy = bullet.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const playerSize = VEHICLE_TYPES[player.vehicleType].size;
        
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
            // Award kill
            if (gameState.players[bullet.ownerId]) {
              gameState.players[bullet.ownerId].kills = (gameState.players[bullet.ownerId].kills || 0) + 1;
              gameState.players[bullet.ownerId].score = (gameState.players[bullet.ownerId].score || 0) + 100;
              gameState.players[bullet.ownerId].experience = (gameState.players[bullet.ownerId].experience || 0) + 50;
              io.emit('player-killed', {
                killerId: bullet.ownerId,
                victimId: playerId
              });
            }
            
            // Respawn player
            setTimeout(() => {
              if (gameState.players[playerId]) {
                gameState.players[playerId].health = VEHICLE_TYPES[gameState.players[playerId].vehicleType].health;
                gameState.players[playerId].x = Math.random() * (MAP_SIZE - 200) + 100;
                gameState.players[playerId].y = Math.random() * (MAP_SIZE - 200) + 100;
              }
            }, 3000);
          }
        }
      }
    });
    
    // Bullet vs Obstacle collisions
    gameState.obstacles.forEach((obstacle, index) => {
      if (bullet.x > obstacle.x - obstacle.width/2 &&
          bullet.x < obstacle.x + obstacle.width/2 &&
          bullet.y > obstacle.y - obstacle.height/2 &&
          bullet.y < obstacle.y + obstacle.height/2) {
        
        if (obstacle.type === 'destructible') {
          gameState.obstacles.splice(index, 1);
        }
        hit = true;
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
      vehicle: player.vehicleType
    }))
    .sort((a, b) => b.score - a.score);
  
  io.emit('leaderboard-update', gameState.leaderboard);
}

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);
  
  // Send game configuration immediately
  socket.emit('game-config', {
    mapSize: MAP_SIZE,
    vehicleTypes: VEHICLE_TYPES
  });
  
  socket.emit('room-assigned', 'main_arena');
  socket.emit('game-state', gameState);
  
  socket.on('join-game', (playerData) => {
    if (Object.keys(gameState.players).length >= MAX_PLAYERS) {
      socket.emit('game-full');
      return;
    }
    
    gameState.players[playerData.id] = {
      id: playerData.id,
      x: playerData.x || Math.random() * (MAP_SIZE - 200) + 100,
      y: playerData.y || Math.random() * (MAP_SIZE - 200) + 100,
      angle: 0,
      health: VEHICLE_TYPES[playerData.vehicleType].health,
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
      gameState.bullets.push({
        ...bulletData,
        damage: VEHICLE_TYPES[player.vehicleType].damage,
        speed: 8
      });
    }
  });
  
  socket.on('collect-resource', (data) => {
    const player = gameState.players[data.playerId];
    const resourceIndex = gameState.resources.findIndex(r => 
      r.x === data.resource.x && r.y === data.resource.y
    );
    
    if (resourceIndex !== -1 && player) {
      const resource = gameState.resources[resourceIndex];
      if (resource.type === 'health') {
        player.health = Math.min(
          player.health + resource.value,
          VEHICLE_TYPES[player.vehicleType].health
        );
      } else if (resource.type === 'ammo') {
        player.score += resource.value;
      }
      gameState.resources.splice(resourceIndex, 1);
    }
  });

  socket.on('score-update', (scoreData) => {
    if (gameState.players[scoreData.id]) {
      gameState.players[scoreData.id].score = scoreData.score;
      gameState.players[scoreData.id].kills = scoreData.kills;
      gameState.players[scoreData.id].experience = scoreData.experience;
      gameState.players[scoreData.id].level = scoreData.level;
    }
  });

  socket.on('player-respawn', (playerData) => {
    if (gameState.players[playerData.id]) {
      gameState.players[playerData.id].health = playerData.health;
      gameState.players[playerData.id].x = playerData.x;
      gameState.players[playerData.id].y = playerData.y;
    }
  });

  socket.on('rejoin-game', (playerData) => {
    gameState.players[playerData.id] = {
      id: playerData.id,
      x: playerData.x,
      y: playerData.y,
      health: playerData.health,
      color: playerData.color,
      name: playerData.name,
      vehicleType: playerData.vehicleType,
      kills: 0,
      score: playerData.score || 0,
      experience: playerData.experience || 0,
      level: playerData.level || 1
    };
    console.log(`Player ${playerData.name} rejoined`);
  });

  socket.on('leave-game', (playerId) => {
    delete gameState.players[playerId];
    console.log(`Player ${playerId} left the game`);
    io.emit('game-state', gameState);
  });
  
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    delete gameState.players[socket.id];
    io.emit('game-state', gameState);
  });
});

// Start the game loop
startGameLoop();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Military Vehicles IO Server running on port ${PORT}`);
});
