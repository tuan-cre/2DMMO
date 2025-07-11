// Map class to handle different map layouts and configurations
class Map {
  constructor(mapData = {}) {
    this.id = mapData.id || 'default';
    this.name = mapData.name || 'Default Map';
    this.width = mapData.width || 800;
    this.height = mapData.height || 600;
    this.backgroundColor = mapData.backgroundColor || '#2d5a27';
    this.backgroundImage = mapData.backgroundImage || null;
    
    // Spawn points for players and enemies
    this.playerSpawnPoints = mapData.playerSpawnPoints || [
      { x: 200, y: 200 },
      { x: 300, y: 200 },
      { x: 400, y: 200 },
      { x: 500, y: 200 }
    ];
    
    this.enemySpawnPoints = mapData.enemySpawnPoints || [
      { x: 150, y: 150 },
      { x: 650, y: 150 },
      { x: 150, y: 450 },
      { x: 650, y: 450 },
      { x: 400, y: 300 }
    ];
    
    // Obstacles/walls (optional)
    this.obstacles = mapData.obstacles || [];
    
    // Boundaries
    this.boundaries = {
      minX: (mapData.boundaries && mapData.boundaries.minX) || 11,
      minY: (mapData.boundaries && mapData.boundaries.minY) || 11,
      maxX: (mapData.boundaries && mapData.boundaries.maxX) || this.width - 21,
      maxY: (mapData.boundaries && mapData.boundaries.maxY) || this.height - 21
    };
    
    // Special zones (healing, damage, etc.)
    this.specialZones = mapData.specialZones || [];
    
    // Tile system for resource management
    this.tileSize = mapData.tileSize || 32; // Default tile size in pixels
    this.tilesX = Math.ceil(this.width / this.tileSize);
    this.tilesY = Math.ceil(this.height / this.tileSize);
    
    // Tile types and their resources
    this.tileTypes = mapData.tileTypes || {
      grass: { 
        sprite: 'assets/tiles/grass.png', 
        walkable: true, 
        color: '#4a7c59' 
      },
      stone: { 
        sprite: 'assets/tiles/stone.png', 
        walkable: false, 
        color: '#666666' 
      },
      water: { 
        sprite: 'assets/tiles/water.png', 
        walkable: false, 
        color: '#4a90e2' 
      },
      dirt: { 
        sprite: 'assets/tiles/dirt.png', 
        walkable: true, 
        color: '#8b4513' 
      },
      sand: { 
        sprite: 'assets/tiles/sand.png', 
        walkable: true, 
        color: '#f4a460' 
      }
    };
    
    // Tile map - defines which tile type is at each position
    this.tileMap = mapData.tileMap || this.generateDefaultTileMap();
    
    // Resource mapping for different elements
    this.resourceMap = {
      // Player sprites based on map theme
      playerSprites: mapData.playerSprites || {
        self: ['assets/sprites/player_self1.png', 'assets/sprites/player_self2.png'],
        other: ['assets/sprites/player_other1.png', 'assets/sprites/player_other2.png']
      },
      
      // Enemy sprites based on map theme
      enemySprites: mapData.enemySprites || ['assets/sprites/enemy.png'],
      
      // Weapon sprites
      weaponSprites: mapData.weaponSprites || {
        sword_up: 'assets/sprites/sword_up.png',
        sword_down: 'assets/sprites/sword_down.png',
        sword_left: 'assets/sprites/sword_left.png',
        sword_right: 'assets/sprites/sword_right.png'
      },
      
      // Environmental objects
      objects: mapData.objects || [
        { type: 'tree', sprite: 'assets/objects/tree.png', x: 300, y: 200 },
        { type: 'rock', sprite: 'assets/objects/rock.png', x: 500, y: 400 }
      ],
      
      // Audio resources
      audio: mapData.audio || {
        background: 'assets/audio/background.mp3',
        footsteps: 'assets/audio/footsteps.wav',
        combat: 'assets/audio/sword_clash.wav'
      }
    };
    
    this.usedPlayerSpawns = new Set();
  }

  // Get a random player spawn point that hasn't been used recently
  getPlayerSpawnPoint() {
    // If all spawn points are used, reset the set
    if (this.usedPlayerSpawns.size >= this.playerSpawnPoints.length) {
      this.usedPlayerSpawns.clear();
    }
    
    // Find available spawn points
    const availableSpawns = this.playerSpawnPoints.filter((_, index) => 
      !this.usedPlayerSpawns.has(index)
    );
    
    if (availableSpawns.length === 0) {
      // Fallback to first spawn point
      return this.playerSpawnPoints[0];
    }
    
    // Pick a random available spawn
    const randomIndex = Math.floor(Math.random() * availableSpawns.length);
    const selectedSpawn = availableSpawns[randomIndex];
    
    // Mark this spawn as used
    const originalIndex = this.playerSpawnPoints.indexOf(selectedSpawn);
    this.usedPlayerSpawns.add(originalIndex);
    
    return { ...selectedSpawn };
  }

  // Get random enemy spawn points
  getEnemySpawnPoints(count = 5) {
    const spawns = [];
    const availableSpawns = [...this.enemySpawnPoints];
    
    for (let i = 0; i < Math.min(count, availableSpawns.length); i++) {
      const randomIndex = Math.floor(Math.random() * availableSpawns.length);
      spawns.push({ ...availableSpawns[randomIndex] });
      availableSpawns.splice(randomIndex, 1);
    }
    
    // If we need more spawns than available points, generate random ones
    while (spawns.length < count) {
      spawns.push({
        x: Math.random() * (this.boundaries.maxX - this.boundaries.minX) + this.boundaries.minX,
        y: Math.random() * (this.boundaries.maxY - this.boundaries.minY) + this.boundaries.minY
      });
    }
    
    return spawns;
  }

  // Check if a position is within map boundaries
  isValidPosition(x, y) {
    return x >= this.boundaries.minX && 
           x <= this.boundaries.maxX && 
           y >= this.boundaries.minY && 
           y <= this.boundaries.maxY;
  }

  // Clamp position to boundaries
  clampPosition(x, y) {
    return {
      x: Math.max(this.boundaries.minX, Math.min(this.boundaries.maxX, x)),
      y: Math.max(this.boundaries.minY, Math.min(this.boundaries.maxY, y))
    };
  }

  // Check collision with obstacles
  checkObstacleCollision(x, y, radius = 10) {
    for (const obstacle of this.obstacles) {
      if (x + radius > obstacle.x && 
          x - radius < obstacle.x + obstacle.width &&
          y + radius > obstacle.y && 
          y - radius < obstacle.y + obstacle.height) {
        return true;
      }
    }
    return false;
  }

  // Check collision with tiles
  checkTileCollision(x, y, radius = 10) {
    // Check if the position is within bounds
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) {
      return true; // Out of bounds = collision
    }
    
    // If no tile map, only check boundaries
    if (!this.tileMap || this.tileMap.length === 0) {
      return false;
    }
    
    // Calculate tile coordinates for the player's bounding box
    const tileSize = this.tileSize;
    const leftTile = Math.floor((x - radius) / tileSize);
    const rightTile = Math.floor((x + radius) / tileSize);
    const topTile = Math.floor((y - radius) / tileSize);
    const bottomTile = Math.floor((y + radius) / tileSize);
    
    // Check all tiles that the player overlaps with
    for (let tileY = topTile; tileY <= bottomTile; tileY++) {
      for (let tileX = leftTile; tileX <= rightTile; tileX++) {
        // Check if tile coordinates are valid
        if (tileY >= 0 && tileY < this.tilesY && tileX >= 0 && tileX < this.tilesX) {
          const tileType = this.tileMap[tileY][tileX];
          const tileData = this.tileTypes[tileType];
          
          // Check if tile is not walkable
          if (tileData && (!tileData.walkable || tileData.collision)) {
            return true; // Collision detected
          }
        }
      }
    }
    
    return false; // No collision
  }

  // Check all types of collisions (tiles + obstacles)
  checkCollision(x, y, radius = 10) {
    // Check tile collision first
    if (this.checkTileCollision(x, y, radius)) {
      return true;
    }
    
    // Check obstacle collision
    if (this.checkObstacleCollision(x, y, radius)) {
      return true;
    }
    
    return false;
  }

  // Generate a default tile map if none provided
  generateDefaultTileMap() {
    const tileMap = [];
    for (let y = 0; y < this.tilesY; y++) {
      const row = [];
      for (let x = 0; x < this.tilesX; x++) {
        // Create varied terrain based on position
        let tileType = 'grass'; // Default
        
        // Add some variety based on position
        const centerX = this.tilesX / 2;
        const centerY = this.tilesY / 2;
        const distanceFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        
        // Create natural-looking terrain
        const noise = Math.sin(x * 0.1) * Math.cos(y * 0.1) + Math.random() * 0.3;
        
        if (noise > 0.4) {
          tileType = 'stone';
        } else if (noise < -0.3) {
          tileType = 'dirt';
        } else if (distanceFromCenter > this.tilesX * 0.4 && Math.random() > 0.7) {
          tileType = 'water';
        }
        
        row.push(tileType);
      }
      tileMap.push(row);
    }
    return tileMap;
  }
  
  // Get tile type at world coordinates
  getTileTypeAt(x, y) {
    const tileX = Math.floor(x / this.tileSize);
    const tileY = Math.floor(y / this.tileSize);
    
    if (tileX >= 0 && tileX < this.tilesX && tileY >= 0 && tileY < this.tilesY) {
      return this.tileMap[tileY][tileX];
    }
    return 'grass'; // Default fallback
  }
  
  // Check if a position is walkable based on tile type
  isWalkable(x, y) {
    const tileType = this.getTileTypeAt(x, y);
    return this.tileTypes[tileType]?.walkable !== false;
  }
  
  // Get appropriate sprite based on map theme and context
  getPlayerSprite(isLocal = false, animationFrame = 0) {
    const sprites = isLocal ? this.resourceMap.playerSprites.self : this.resourceMap.playerSprites.other;
    return sprites[animationFrame % sprites.length];
  }
  
  getEnemySprite(enemyType = 'default', animationFrame = 0) {
    const sprites = this.resourceMap.enemySprites;
    return sprites[animationFrame % sprites.length];
  }
  
  getWeaponSprite(direction) {
    return this.resourceMap.weaponSprites[`sword_${direction}`] || this.resourceMap.weaponSprites.sword_down;
  }
  
  // Get environmental objects for rendering
  getEnvironmentalObjects() {
    return this.resourceMap.objects;
  }
  
  // Get audio resource for specific action
  getAudioResource(action) {
    return this.resourceMap.audio[action];
  }
  
  // Resource loading strategy based on map type
  getResourceLoadingStrategy() {
    return {
      // Priority loading order
      priority: [
        'playerSprites',
        'weaponSprites', 
        'enemySprites',
        'tileSprites'
      ],
      
      // Preload vs lazy load
      preload: this.resourceMap.playerSprites.self.concat(
        this.resourceMap.playerSprites.other,
        Object.values(this.resourceMap.weaponSprites)
      ),
      
      lazyLoad: this.resourceMap.objects.map(obj => obj.sprite),
      
      // Fallback resources if sprites fail to load
      fallbacks: {
        player: '#4CAF50', // Green circle
        enemy: '#F44336',  // Red circle
        sword: '#FFD700'   // Gold rectangle
      }
    };
  }
  
  // Get tile rendering information
  getTileRenderData() {
    return {
      tileSize: this.tileSize,
      tilesX: this.tilesX,
      tilesY: this.tilesY,
      tileMap: this.tileMap,
      tileTypes: this.tileTypes
    };
  }
  
  // Get map data for client
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      width: this.width,
      height: this.height,
      backgroundColor: this.backgroundColor,
      backgroundImage: this.backgroundImage,
      obstacles: this.obstacles,
      boundaries: this.boundaries,
      specialZones: this.specialZones,
      
      // Tile and resource data
      tileData: this.getTileRenderData(),
      resourceMap: this.resourceMap,
      loadingStrategy: this.getResourceLoadingStrategy()
    };
  }
}

module.exports = Map;
