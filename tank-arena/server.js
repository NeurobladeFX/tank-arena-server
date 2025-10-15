const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// --- FIX FOR DEPLOYMENT ---
// This tells Express to serve all your front-end files (index.html, images)
// from a 'public' folder located in the same directory as this server.js file.
const publicPath = path.join(__dirname, 'public');

// --- HELPFUL DEBUGGING LOGS ---
// These lines will print in your Render logs so you can confirm the paths are correct.
console.log(`[Server Info] Current script directory (__dirname): ${__dirname}`);
console.log(`[Server Info] Serving static files from: ${publicPath}`);

app.use(express.static(publicPath));

// This is the main route. It ensures that anyone visiting your website
// gets the index.html file.
app.get('/', (req, res) => {
  const indexPath = path.join(publicPath, 'index.html');
  console.log(`[Request Info] Attempting to send file: ${indexPath}`);
  res.sendFile(indexPath, (err) => {
      if (err) {
          // If there's an error, it will show up in your Render logs.
          console.error("[Server Error] Failed to send index.html:", err);
          res.status(500).send("Server error: Could not find index.html. Please check the server logs for path details.");
      }
  });
});


// Game Configuration
const MAP_SIZE = 3000;
const MAX_PLAYERS = 50;

// Vehicle System with Upgrades
const VEHICLE_SYSTEM = {
  tank: {
    base: { health: 150, speed: 2, damage: 35, size: 60 },
    upgrades: {
      '2': { health: 180, speed: 2.2, damage: 40, name: "Advanced Tank" },
      '3': { health: 220, speed: 2.4, damage: 45, name: "Battle Tank" },
    }
  },
  jeep: {
    base: { health: 100, speed: 4, damage: 20, size: 50 },
    upgrades: {
      '2': { health: 120, speed: 4.3, damage: 25, name: "Combat Jeep" },
      '3': { health: 140, speed: 4.6, damage: 30, name: "Assault Jeep" },
    }
  },
  apc: {
    base: { health: 200, speed: 1.5, damage: 25, size: 70 },
    upgrades: {
      '2': { health: 240, speed: 1.7, damage: 30, name: "Armored APC" },
      '3': { health: 290, speed: 1.9, damage: 35, name: "Heavy APC" },
    }
  },
  artillery: {
    base: { health: 120, speed: 1, damage: 50, size: 65 },
    upgrades: {
      '2': { health: 140, speed: 1.1, damage: 60, name: "Field Artillery" },
      '3': { health: 170, speed: 1.2, damage: 70, name: "Heavy Artillery" },
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
  return obstacles;
}

function generateResources() {
  const resources = [];
  for (let i = 0; i < 30; i++) {
    resources.push({
      x: Math.random() * (MAP_SIZE - 100) + 50,
      y: Math.random() * (MAP_SIZE - 100) + 50,
      type: Math.random() > 0.5 ? 'health' : 'ammo'
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

function gameLoop() {
  updateGameState();
  io.emit('game-state', gameState);
  updateLeaderboard();
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
    const bulletsToRemove = new Set();

    gameState.bullets.forEach((bullet, bulletIndex) => {
        for (const playerId in gameState.players) {
            if (playerId === bullet.ownerId) continue;

            const player = gameState.players[playerId];
            const dx = bullet.x - player.x;
            const dy = bullet.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const playerSize = getVehicleStats(player.vehicleType, player.level).size / 2;

            if (distance < playerSize) {
                bulletsToRemove.add(bulletIndex);
                player.health -= bullet.damage;
                io.emit('player-hit', { playerId: playerId, newHealth: player.health, x: bullet.x, y: bullet.y });

                if (player.health <= 0) {
                    const killer = gameState.players[bullet.ownerId];
                    if (killer) {
                        killer.kills++;
                        killer.score += 100;
                        killer.experience += 50;

                        const newLevel = Math.floor(killer.experience / 300) + 1;
                        if (newLevel > killer.level && newLevel <= 3) {
                            killer.level = newLevel;
                            const newStats = getVehicleStats(killer.vehicleType, newLevel);
                            killer.health = newStats.health;
                        }
                    }
                    
                    io.emit('player-killed', { killerId: bullet.ownerId, victimId: playerId });

                    // Respawn logic
                    setTimeout(() => {
                        if (gameState.players[playerId]) {
                            const stats = getVehicleStats(player.vehicleType, 1);
                            player.health = stats.health;
                            player.x = Math.random() * (MAP_SIZE - 200) + 100;
                            player.y = Math.random() * (MAP_SIZE - 200) + 100;
                            player.level = 1;
                            player.kills = 0;
                            player.score = 0;
                            player.experience = 0;
                        }
                    }, 3000);
                }
                break; 
            }
        }
    });

    gameState.bullets = gameState.bullets.filter((_, index) => !bulletsToRemove.has(index));
}

function updateLeaderboard() {
  gameState.leaderboard = Object.values(gameState.players)
    .map(player => ({
      id: player.id,
      name: player.name,
      score: player.score || 0,
      level: player.level || 1,
    }))
    .sort((a, b) => b.score - a.score);
  
  io.emit('leaderboard-update', gameState.leaderboard);
}

// Socket Events
io.on('connection', (socket) => {
  
  socket.emit('game-config', {
    mapSize: MAP_SIZE,
    vehicleSystem: VEHICLE_SYSTEM
  });
  
  socket.on('join-game', (playerData) => {
    if (Object.keys(gameState.players).length >= MAX_PLAYERS) {
      socket.emit('game-full');
      return;
    }
    
    const stats = getVehicleStats(playerData.vehicleType, 1);
    
    gameState.players[socket.id] = {
      id: socket.id,
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
  });
  
  socket.on('player-update', (playerData) => {
    if (gameState.players[socket.id]) {
      gameState.players[socket.id].x = playerData.x;
      gameState.players[socket.id].y = playerData.y;
      gameState.players[socket.id].angle = playerData.angle;
    }
  });
  
  socket.on('bullet-fired', (bulletData) => {
    const player = gameState.players[bulletData.ownerId];
    if (player) {
      const stats = getVehicleStats(player.vehicleType, player.level);
      gameState.bullets.push({
        ...bulletData,
        damage: stats.damage,
        speed: 15
      });
    }
  });
  
  socket.on('disconnect', () => {
    delete gameState.players[socket.id];
  });
});

setInterval(gameLoop, GAME_LOOP_INTERVAL);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

