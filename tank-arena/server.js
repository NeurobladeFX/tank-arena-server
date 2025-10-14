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

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Game state
const gameState = {
  tanks: {},
  bullets: [],
  obstacles: [
    { x: 200, y: 150, width: 100, height: 30, destructible: false },
    { x: 600, y: 450, width: 100, height: 30, destructible: false },
    { x: 400, y: 300, width: 80, height: 80, destructible: true },
    { x: 150, y: 400, width: 60, height: 60, destructible: true }
  ],
  leaderboard: []
};

// Game loop
const GAME_LOOP_INTERVAL = 1000 / 60; // 60 FPS
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
    bullet.x += Math.sin(bullet.angle) * 5;
    bullet.y -= Math.cos(bullet.angle) * 5;
    
    // Remove bullets out of bounds
    return bullet.x > 0 && bullet.x < 800 && bullet.y > 0 && bullet.y < 600;
  });
  
  // Check collisions
  checkCollisions();
}

function checkCollisions() {
  // Bullet vs Tank collisions
  gameState.bullets = gameState.bullets.filter(bullet => {
    let hit = false;
    
    Object.keys(gameState.tanks).forEach(tankId => {
      const tank = gameState.tanks[tankId];
      
      if (tankId !== bullet.ownerId) {
        const dx = bullet.x - tank.x;
        const dy = bullet.y - tank.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 20) {
          tank.health -= 25;
          hit = true;
          
          io.emit('player-hit', {
            playerId: tankId,
            newHealth: tank.health,
            x: bullet.x,
            y: bullet.y
          });
          
          if (tank.health <= 0) {
            if (gameState.tanks[bullet.ownerId]) {
              gameState.tanks[bullet.ownerId].kills = (gameState.tanks[bullet.ownerId].kills || 0) + 1;
              gameState.tanks[bullet.ownerId].score = (gameState.tanks[bullet.ownerId].score || 0) + 100;
              io.emit('player-killed', bullet.ownerId);
            }
            
            setTimeout(() => {
              if (gameState.tanks[tankId]) {
                gameState.tanks[tankId].health = 100;
                gameState.tanks[tankId].x = Math.random() * 700 + 50;
                gameState.tanks[tankId].y = Math.random() * 500 + 50;
              }
            }, 2000);
          }
        }
      }
    });
    
    return !hit;
  });
}

function updateLeaderboard() {
  gameState.leaderboard = Object.values(gameState.tanks)
    .map(tank => ({
      id: tank.id,
      name: tank.name,
      score: tank.score || 0,
      kills: tank.kills || 0
    }))
    .sort((a, b) => b.score - a.score);
  
  io.emit('leaderboard-update', gameState.leaderboard);
}

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  socket.emit('game-config', {
    mapSize: MAP_SIZE,
    vehicleTypes: VEHICLE_TYPES
  });
  
  socket.emit('room-assigned', 'main_arena');
  socket.emit('game-state', gameState);
  
  socket.on('join-game', (playerData) => {
    gameState.tanks[playerData.id] = {
      id: playerData.id,
      x: playerData.x || Math.random() * 700 + 50,
      y: playerData.y || Math.random() * 500 + 50,
      angle: 0,
      turretAngle: 0,
      health: playerData.health || 100,
      color: playerData.color,
      name: playerData.name,
      kills: 0,
      score: 0
    };
    
    console.log(`Player ${playerData.name} (${playerData.id}) joined`);
    io.emit('game-state', gameState);
  });
  
  socket.on('player-update', (playerData) => {
    if (gameState.tanks[playerData.id]) {
      gameState.tanks[playerData.id].x = playerData.x;
      gameState.tanks[playerData.id].y = playerData.y;
      gameState.tanks[playerData.id].angle = playerData.angle;
      gameState.tanks[playerData.id].turretAngle = playerData.turretAngle;
    }
  });
  
  socket.on('bullet-fired', (bulletData) => {
    gameState.bullets.push({
      ...bulletData,
      id: Math.random().toString(36).substr(2, 9)
    });
  });
  
  socket.on('score-update', (scoreData) => {
  if (gameState.players[scoreData.id]) {
    gameState.players[scoreData.id].score = scoreData.score;
    gameState.players[scoreData.id].kills = scoreData.kills;
    gameState.players[scoreData.id].experience = scoreData.experience;
    gameState.players[scoreData.id].level = scoreData.level;
  }
});

// Handle resource collection
socket.on('collect-resource', (data) => {
  // Remove the collected resource
  gameState.resources = gameState.resources.filter(resource => 
    !(resource.x === data.resource.x && resource.y === data.resource.y)
  );
});
  
  socket.on('player-respawn', (playerData) => {
    if (gameState.tanks[playerData.id]) {
      gameState.tanks[playerData.id].health = playerData.health;
      gameState.tanks[playerData.id].x = playerData.x;
      gameState.tanks[playerData.id].y = playerData.y;
    }
  });
  
  socket.on('rejoin-game', (playerData) => {
    gameState.tanks[playerData.id] = {
      id: playerData.id,
      x: playerData.x,
      y: playerData.y,
      health: playerData.health,
      color: playerData.color,
      name: playerData.name,
      kills: 0,
      score: playerData.score || 0
    };
    console.log(`Player ${playerData.name} rejoined`);
  });
  
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    delete gameState.tanks[socket.id];
    io.emit('game-state', gameState);
  });
  
  socket.on('leave-game', (playerId) => {
    delete gameState.tanks[playerId];
    console.log(`Player ${playerId} left the game`);
    io.emit('game-state', gameState);
  });
});

// Start the game loop
startGameLoop();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Tank Arena Server running on port ${PORT}`);
});
