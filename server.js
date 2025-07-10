const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const app = express();

// Serve the frontend
app.use(express.static('public'));
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Player list
let players = {};
let enemies = {};
let playerScores = {}; // Track kill scores for each player

// Initialize enemies when server starts
function spawnEnemies() {
  for (let i = 0; i < 5; i++) {
    const enemyId = `enemy_${i}`;
    enemies[enemyId] = {
      x: Math.random() * 600 + 100, // Random position between 100-700
      y: Math.random() * 400 + 100, // Random position between 100-500
      name: "Enemy",
      type: "enemy",
      health: 20,
      maxHealth: 20
    };
  }
  console.log('🔴 5 enemies spawned on the map');
}

// Spawn enemies on server start
spawnEnemies();

// Sword collision detection function
function checkSwordCollisions(playerId) {
  const player = players[playerId];
  if (!player) return 0;
  
  let hitCount = 0;
  const swordRange = 20; // Sword reach distance (reduced from 40)
  const swordDamage = 10; // Sword damage per hit
  
  for (let enemyId in enemies) {
    const enemy = enemies[enemyId];
    
    // Calculate sword tip position based on facing direction
    let swordTipX = player.x;
    let swordTipY = player.y;
    
    switch(player.facing) {
      case 'up': swordTipY -= swordRange; break;
      case 'down': swordTipY += swordRange; break;
      case 'left': swordTipX -= swordRange; break;
      case 'right': swordTipX += swordRange; break;
    }
    
    // Check if enemy is within sword range
    const dx = swordTipX - enemy.x;
    const dy = swordTipY - enemy.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Also check if enemy is in the sword's arc (roughly in front of player)
    const playerToEnemyX = enemy.x - player.x;
    const playerToEnemyY = enemy.y - player.y;
    
    let inArc = false;
    switch(player.facing) {
      case 'up': inArc = playerToEnemyY < 0 && Math.abs(playerToEnemyX) < swordRange/2; break;
      case 'down': inArc = playerToEnemyY > 0 && Math.abs(playerToEnemyX) < swordRange/2; break;
      case 'left': inArc = playerToEnemyX < 0 && Math.abs(playerToEnemyY) < swordRange/2; break;
      case 'right': inArc = playerToEnemyX > 0 && Math.abs(playerToEnemyY) < swordRange/2; break;
    }
    
    if (distance < swordRange && inArc) {
      // Deal damage to enemy
      enemy.health -= swordDamage;
      console.log(`⚔️ Sword hit enemy ${enemyId}! Enemy health: ${enemy.health}/${enemy.maxHealth}`);
      
      // Check if enemy is defeated
      if (enemy.health <= 0) {
        console.log(`💀 Enemy ${enemyId} defeated!`);
        delete enemies[enemyId];
        
        // Increment player's kill score
        if (!playerScores[playerId]) {
          playerScores[playerId] = 0;
        }
        playerScores[playerId]++;
      }
      
      hitCount++;
    }
  }
  
  return hitCount;
}

// Broadcast to all clients
function broadcast(data) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

wss.on('connection', ws => {
  const id = Math.random().toString(36).substr(2, 9);
  const playerName = `Player${Math.floor(Math.random() * 1000)}`;
  players[id] = { 
    x: 200, 
    y: 200, 
    name: playerName,
    facing: 'down', // Track facing direction: 'up', 'down', 'left', 'right'
    isSwinging: false,
    swingEndTime: 0,
    health: 20,
    maxHealth: 20
  };
  
  // Initialize player score
  if (!playerScores[id]) {
    playerScores[id] = 0;
  }

  console.log(`🟢 Player connected: ${id} (${playerName})`);

  // Send initial state to new player
  ws.send(JSON.stringify({ id, players, enemies, scores: playerScores }));
  
  // Broadcast updated player list to all other clients
  broadcast({ players, enemies, scores: playerScores });

  ws.on('message', msg => {
    try {
      const data = JSON.parse(msg);

      if (data.type === 'move') {
        const p = players[id];
        if (!p) return;
        
        // Get canvas dimensions from client, with fallback to default
        const canvasWidth = data.canvasWidth || 800;
        const canvasHeight = data.canvasHeight || 600;
        
        // Keep players within canvas bounds (subtract 32 for sprite size)
        const newX = Math.max(11, Math.min(canvasWidth - 21, p.x + data.dx));
        const newY = Math.max(11, Math.min(canvasHeight - 21, p.y + data.dy));
        
        p.x = newX;
        p.y = newY;
        
        // Update facing direction based on movement
        if (data.dx > 0) p.facing = 'right';
        else if (data.dx < 0) p.facing = 'left';
        else if (data.dy > 0) p.facing = 'down';
        else if (data.dy < 0) p.facing = 'up';
        
        // Broadcast updated state to all clients (no collision check for killing)
        broadcast({ players, enemies, scores: playerScores });
      }
      
      if (data.type === 'sword_swing') {
        const p = players[id];
        if (!p) return;
        
        // Set sword swing state
        p.isSwinging = true;
        p.swingEndTime = Date.now() + 300; // Swing lasts 300ms
        
        // Check for enemies in sword range
        const swordCollisions = checkSwordCollisions(id);
        
        console.log(`⚔️ Player ${id} swings sword facing ${p.facing}!`);
        
        // Broadcast updated state
        broadcast({ players, enemies, scores: playerScores });
        
        if (swordCollisions > 0) {
          const remainingEnemies = Object.keys(enemies).length;
          const playerScore = playerScores[id];
          console.log(`🎯 Sword hit ${swordCollisions} enemies! Player ${id} now has ${playerScore} kills! Enemies remaining: ${remainingEnemies}`);
          
          // Respawn enemies if all are defeated
          if (remainingEnemies === 0) {
            console.log('🔄 All enemies defeated! Respawning...');
            spawnEnemies();
            broadcast({ players, enemies, scores: playerScores });
          }
        }
      }
    } catch (e) {
      console.error('Bad JSON:', e);
    }
  });

  ws.on('close', () => {
    console.log(`🔴 Player disconnected: ${id}`);
    delete players[id];
    delete playerScores[id]; // Clean up score when player leaves
    // Broadcast updated state when player disconnects
    broadcast({ players, enemies, scores: playerScores });
  });
});

server.listen(3000, () => {
  console.log('🚀 Server running at http://localhost:3000');
});
