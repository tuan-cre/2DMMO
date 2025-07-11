const Player = require('./Player');
const Enemy = require('./Enemy');
const MapManager = require('./MapManager');

// Main GameServer class to handle all game logic
class GameServer {
  constructor() {
    this.app = null;
    this.server = null;
    this.wss = null;
    
    this.players = new Map();
    this.enemies = new Map();
    this.playerScores = new Map();
    
    // Map system
    this.mapManager = new MapManager();
    
    // Optimization variables
    this.lastBroadcastTime = 0;
    this.BROADCAST_INTERVAL = 16; // 60fps
    this.pendingBroadcast = false;
    this.SWORD_RANGE = 20;
    this.SWORD_DAMAGE = 10;
  }

  initialize(app, server, wss) {
    this.app = app;
    this.server = server;
    this.wss = wss;
    
    this.setupServer();
    this.spawnEnemies();
    this.setupWebSocket();
  }

  setupServer() {
    this.app.use(require('express').static('public'));
    
    // API endpoint to get available maps
    this.app.get('/api/maps', (req, res) => {
      res.json({
        maps: this.getAvailableMaps(),
        currentMap: this.getCurrentMapInfo()
      });
    });
    
    // API endpoint to switch map
    this.app.post('/api/switch-map/:mapId', (req, res) => {
      const mapId = req.params.mapId;
      const success = this.handleMapSwitch(mapId);
      
      if (success) {
        res.json({
          success: true,
          message: `Switched to map: ${this.mapManager.getCurrentMap().name}`,
          currentMap: this.getCurrentMapInfo()
        });
      } else {
        res.status(404).json({
          success: false,
          message: `Map not found: ${mapId}`
        });
      }
    });
    
    // API endpoint to load custom map from file
    this.app.post('/api/load-map', require('express').json(), async (req, res) => {
      try {
        this.mapManager.registerMap(req.body);
        res.json({
          success: true,
          message: `Map registered: ${req.body.name}`,
          mapId: req.body.id
        });
      } catch (error) {
        res.status(400).json({
          success: false,
          message: 'Invalid map data',
          error: error.message
        });
      }
    });
  }

  spawnEnemies() {
    this.enemies.clear();
    const currentMap = this.mapManager.getCurrentMap();
    const spawnPoints = currentMap.getEnemySpawnPoints(5);
    
    for (let i = 0; i < spawnPoints.length; i++) {
      const enemyId = `enemy_${i}`;
      const spawn = spawnPoints[i];
      this.enemies.set(enemyId, new Enemy(enemyId, spawn.x, spawn.y));
    }
    console.log(`🔴 ${spawnPoints.length} enemies spawned on map: ${currentMap.name}`);
  }

  generatePlayerId() {
    return Math.random().toString(36).substr(2, 9);
  }

  generatePlayerName() {
    return `Player${Math.floor(Math.random() * 1000)}`;
  }

  checkSwordCollisions(player) {
    let hitCount = 0;
    const swordRange = this.SWORD_RANGE;
    const swordDamage = this.SWORD_DAMAGE;
    
    // Calculate sword tip position
    let swordTipX = player.x;
    let swordTipY = player.y;
    
    switch(player.facing) {
      case 'up': swordTipY -= swordRange; break;
      case 'down': swordTipY += swordRange; break;
      case 'left': swordTipX -= swordRange; break;
      case 'right': swordTipX += swordRange; break;
    }
    
    // Check each enemy
    for (let [enemyId, enemy] of this.enemies) {
      const dx = swordTipX - enemy.x;
      const dy = swordTipY - enemy.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Check if enemy is in sword arc
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
        const enemyDied = enemy.takeDamage(swordDamage);
        
        if (enemyDied) {
          console.log(`💀 Enemy ${enemyId} defeated!`);
          this.enemies.delete(enemyId);
          
          // Increment player's kill score
          const currentScore = this.playerScores.get(player.id) || 0;
          this.playerScores.set(player.id, currentScore + 1);
        }
        
        hitCount++;
      }
    }
    
    return hitCount;
  }

  broadcast(data = {}, priority = false) {
    const now = Date.now();
    
    // For high priority events, bypass throttling
    if (priority) {
      this.performBroadcast(data);
      return;
    }
    
    // Throttle broadcasts
    if (now - this.lastBroadcastTime < this.BROADCAST_INTERVAL) {
      if (!this.pendingBroadcast) {
        this.pendingBroadcast = true;
        setTimeout(() => {
          this.performBroadcast(data);
          this.pendingBroadcast = false;
        }, this.BROADCAST_INTERVAL - (now - this.lastBroadcastTime));
      }
      return;
    }
    
    this.performBroadcast(data);
  }

  performBroadcast(data = {}) {
    this.lastBroadcastTime = Date.now();
    const now = Date.now();
    
    // Clear expired sword swings
    for (let [id, player] of this.players) {
      if (player.isSwinging && player.swingEndTime && now > player.swingEndTime + 500) {
        player.clearSwing();
        console.log(`Server cleared sword swing for player ${id}`);
      }
    }
    
    // Prepare optimized data
    const optimizedData = {
      players: {},
      enemies: {},
      scores: this.getScoresObject()
    };
    
    // Add player data
    for (let [id, player] of this.players) {
      optimizedData.players[id] = player.toJSON();
      
      if (player.isSwinging) {
        console.log(`📡 Broadcasting sword swing for player ${id}: facing=${player.facing}, startTime=${player.swingStartTime}`);
      }
    }
    
    // Add enemy data
    for (let [id, enemy] of this.enemies) {
      optimizedData.enemies[id] = enemy.toJSON();
    }
    
    // Send to all clients
    const message = JSON.stringify(optimizedData);
    this.wss.clients.forEach(client => {
      if (client.readyState === require('ws').OPEN) {
        client.send(message);
      }
    });
  }

  getScoresObject() {
    const scores = {};
    for (let [id, score] of this.playerScores) {
      scores[id] = score;
    }
    return scores;
  }

  getInitialState() {
    const players = {};
    const enemies = {};
    
    for (let [id, player] of this.players) {
      players[id] = player.toJSON();
    }
    
    for (let [id, enemy] of this.enemies) {
      enemies[id] = enemy.toJSON();
    }
    
    return {
      players,
      enemies,
      scores: this.getScoresObject(),
      map: this.mapManager.getCurrentMap().toJSON(),
      availableMaps: this.mapManager.getAllMaps()
    };
  }

  // Helper method to get client WebSocket by player ID
  getClientByPlayerId(playerId) {
    for (const client of this.wss.clients) {
      if (client.playerId === playerId && client.readyState === require('ws').OPEN) {
        return client;
      }
    }
    return null;
  }

  handlePlayerMove(playerId, data) {
    const player = this.players.get(playerId);
    if (!player) return;
    
    const currentMap = this.mapManager.getCurrentMap();
    const canvasWidth = data.canvasWidth || currentMap.width;
    const canvasHeight = data.canvasHeight || currentMap.height;
    
    // Calculate new position
    const newX = Math.max(11, Math.min(canvasWidth - 21, player.x + data.dx));
    const newY = Math.max(11, Math.min(canvasHeight - 21, player.y + data.dy));
    
    // Check for collisions at the new position
    const playerRadius = 10; // Player collision radius
    if (currentMap.checkCollision(newX, newY, playerRadius)) {
      // Collision detected, send position correction to client (fallback for client-side prediction failures)
      const client = this.getClientByPlayerId(playerId);
      if (client) {
        // Only send correction if player actually moved to a different position
        const distanceMoved = Math.sqrt(Math.pow(newX - player.x, 2) + Math.pow(newY - player.y, 2));
        if (distanceMoved > 1) { // Only send correction if significant movement was attempted
          console.log(`🚫 Server collision detected at (${newX}, ${newY}), correcting player ${playerId}`);
          client.send(JSON.stringify({
            type: 'position_correction',
            x: player.x,
            y: player.y,
            facing: player.facing
          }));
        }
      }
      return;
    }
    
    // No collision, allow movement
    const positionChanged = player.move(data.dx, data.dy, canvasWidth, canvasHeight);
    
    if (positionChanged) {
      this.broadcast();
    }
  }

  handleSwordSwing(playerId) {
    const player = this.players.get(playerId);
    if (!player) return;
    
    player.swingSword();
    
    // Broadcast immediately
    this.broadcast({}, true);
    
    // Broadcast again after delay to ensure delivery
    setTimeout(() => {
      this.broadcast({}, true);
    }, 50);
    
    // Check for sword collisions
    const swordCollisions = this.checkSwordCollisions(player);
    
    if (swordCollisions > 0) {
      const remainingEnemies = this.enemies.size;
      const playerScore = this.playerScores.get(playerId) || 0;
      console.log(`🎯 Sword hit ${swordCollisions} enemies! Player ${playerId} now has ${playerScore} kills! Enemies remaining: ${remainingEnemies}`);
      
      // Respawn enemies if all defeated
      if (remainingEnemies === 0) {
        console.log('🔄 All enemies defeated! Respawning...');
        this.spawnEnemies();
        this.broadcast({}, true);
      } else {
        this.broadcast({}, true);
      }
    }
  }

  handlePlayerDisconnect(playerId) {
    console.log(`🔴 Player disconnected: ${playerId}`);
    this.players.delete(playerId);
    this.playerScores.delete(playerId);
    this.broadcast();
  }

  // Handle map switching
  handleMapSwitch(mapId) {
    if (this.mapManager.switchMap(mapId)) {
      // Respawn all players at new spawn points
      const currentMap = this.mapManager.getCurrentMap();
      
      for (let [id, player] of this.players) {
        const spawnPoint = currentMap.getPlayerSpawnPoint();
        player.x = spawnPoint.x;
        player.y = spawnPoint.y;
        player.health = player.maxHealth; // Heal players on map switch
      }
      
      // Respawn enemies
      this.spawnEnemies();
      
      // Broadcast new map state
      this.broadcast({}, true);
      
      console.log(`🗺️ All players moved to map: ${currentMap.name}`);
      return true;
    }
    return false;
  }

  // Get current map info
  getCurrentMapInfo() {
    return this.mapManager.getCurrentMap().toJSON();
  }

  // Get all available maps
  getAvailableMaps() {
    return this.mapManager.getAllMaps();
  }

  setupWebSocket() {
    this.wss.on('connection', ws => {
      const id = this.generatePlayerId();
      const playerName = this.generatePlayerName();
      
      // Store player ID on the WebSocket connection for later reference
      ws.playerId = id;
      
      // Get spawn point from current map
      const currentMap = this.mapManager.getCurrentMap();
      const spawnPoint = currentMap.getPlayerSpawnPoint();
      
      // Create new player at spawn point
      const player = new Player(id, playerName, spawnPoint.x, spawnPoint.y);
      this.players.set(id, player);
      this.playerScores.set(id, 0);
      
      console.log(`🟢 Player connected: ${id} (${playerName}) on map: ${currentMap.name}`);
      
      // Send initial state
      const initialState = this.getInitialState();
      ws.send(JSON.stringify({ id, ...initialState }));
      
      // Broadcast to other players
      this.broadcast();
      
      // Handle messages
      ws.on('message', msg => {
        try {
          const data = JSON.parse(msg);
          
          if (data.type === 'move') {
            this.handlePlayerMove(id, data);
          } else if (data.type === 'sword_swing') {
            this.handleSwordSwing(id);
          } else if (data.type === 'switch_map') {
            this.handleMapSwitch(data.mapId);
          } else if (data.type === 'get_maps') {
            // Send available maps to requesting client
            ws.send(JSON.stringify({
              type: 'maps_list',
              maps: this.getAvailableMaps(),
              currentMap: this.getCurrentMapInfo()
            }));
          }
        } catch (e) {
          console.error('Bad JSON:', e);
        }
      });
      
      // Handle disconnect
      ws.on('close', () => {
        this.handlePlayerDisconnect(id);
      });
    });
  }

  start(port = 3000) {
    this.server.listen(port, () => {
      console.log(`🚀 Server running at http://localhost:${port}`);
    });
  }
}

module.exports = GameServer;
