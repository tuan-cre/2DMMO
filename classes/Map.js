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
      specialZones: this.specialZones
    };
  }
}

module.exports = Map;
