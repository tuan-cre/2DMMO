// Collision detection system for 2D MMO
// Shared between client and server for consistency

class CollisionSystem {
  constructor(config = {}) {
    this.playerRadius = config.playerRadius || 10;
    this.feetOffset = config.feetOffset || 10; // Distance from center to feet
    this.feetRadius = config.feetRadius || 6;  // Radius for feet-based collision
    this.useFeetCollision = config.useFeetCollision || false;
  }

  // Check collision with map boundaries
  checkBoundaryCollision(x, y, mapWidth, mapHeight, radius = this.playerRadius) {
    return x < radius || y < radius || x >= mapWidth - radius || y >= mapHeight - radius;
  }

  // Check collision with a single tile
  checkTileCollision(x, y, tileX, tileY, tileSize, radius = this.playerRadius) {
    const tileLeft = tileX * tileSize;
    const tileRight = (tileX + 1) * tileSize;
    const tileTop = tileY * tileSize;
    const tileBottom = (tileY + 1) * tileSize;
    
    // Find the closest point on the tile to the player center
    const closestX = Math.max(tileLeft, Math.min(x, tileRight));
    const closestY = Math.max(tileTop, Math.min(y, tileBottom));
    
    // Calculate distance from player center to closest point on tile
    const dx = x - closestX;
    const dy = y - closestY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Collision if distance is less than player radius
    return distance < radius;
  }

  // Check collision with feet-based detection (more realistic)
  checkFeetCollision(x, y, tileX, tileY, tileSize) {
    const feetX = x;
    const feetY = y + this.feetOffset;
    
    return this.checkTileCollision(feetX, feetY, tileX, tileY, tileSize, this.feetRadius);
  }

  // Check collision with obstacle (rectangle)
  checkObstacleCollision(x, y, obstacle, radius = this.playerRadius) {
    return x + radius > obstacle.x && 
           x - radius < obstacle.x + obstacle.width &&
           y + radius > obstacle.y && 
           y - radius < obstacle.y + obstacle.height;
  }

  // Main collision detection method
  checkMapCollision(x, y, mapData, options = {}) {
    const {
      useFeetCollision = this.useFeetCollision,
      radius = this.playerRadius
    } = options;

    if (!mapData) return false;

    const { width, height, tileMap, tileTypes, tileSize = 32, obstacles = [] } = mapData;
    
    // Determine collision point and radius
    let collisionX = x;
    let collisionY = y;
    let collisionRadius = radius;
    
    if (useFeetCollision) {
      collisionX = x;
      collisionY = y + this.feetOffset;
      collisionRadius = this.feetRadius;
    }

    // Check map boundaries
    if (this.checkBoundaryCollision(collisionX, collisionY, width, height, collisionRadius)) {
      return true;
    }

    // Check tile collisions
    if (tileMap && tileTypes) {
      const tilesX = Math.ceil(width / tileSize);
      const tilesY = Math.ceil(height / tileSize);
      
      // Calculate tile coordinates for the collision area
      const leftTile = Math.floor((collisionX - collisionRadius) / tileSize);
      const rightTile = Math.floor((collisionX + collisionRadius) / tileSize);
      const topTile = Math.floor((collisionY - collisionRadius) / tileSize);
      const bottomTile = Math.floor((collisionY + collisionRadius) / tileSize);
      
      // Check all tiles that overlap with collision area
      for (let tileY = topTile; tileY <= bottomTile; tileY++) {
        for (let tileX = leftTile; tileX <= rightTile; tileX++) {
          // Check if tile coordinates are valid
          if (tileY >= 0 && tileY < tilesY && tileX >= 0 && tileX < tilesX) {
            const tileType = tileMap[tileY][tileX];
            const tileData = tileTypes[tileType];
            
            // Check if tile is not walkable
            if (tileData && (!tileData.walkable || tileData.collision)) {
              // Use precise collision detection
              if (this.checkTileCollision(collisionX, collisionY, tileX, tileY, tileSize, collisionRadius)) {
                return true;
              }
            }
          }
        }
      }
    }

    // Check obstacle collisions
    for (const obstacle of obstacles) {
      if (this.checkObstacleCollision(x, y, obstacle, radius)) {
        return true;
      }
    }

    return false;
  }

  // Get collision debug info for visualization
  getCollisionDebugInfo(x, y, mapData, options = {}) {
    const {
      useFeetCollision = this.useFeetCollision,
      radius = this.playerRadius
    } = options;

    const debugInfo = {
      collisionPoint: { x, y },
      radius,
      collides: false,
      collidingTiles: [],
      collidingObstacles: []
    };

    if (!mapData) return debugInfo;

    const { width, height, tileMap, tileTypes, tileSize = 32, obstacles = [] } = mapData;
    
    // Determine collision point and radius
    let collisionX = x;
    let collisionY = y;
    let collisionRadius = radius;
    
    if (useFeetCollision) {
      collisionX = x;
      collisionY = y + this.feetOffset;
      collisionRadius = this.feetRadius;
    }

    debugInfo.collisionPoint = { x: collisionX, y: collisionY };
    debugInfo.radius = collisionRadius;

    // Check boundaries
    if (this.checkBoundaryCollision(collisionX, collisionY, width, height, collisionRadius)) {
      debugInfo.collides = true;
      debugInfo.boundaryCollision = true;
    }

    // Check tiles
    if (tileMap && tileTypes) {
      const tilesX = Math.ceil(width / tileSize);
      const tilesY = Math.ceil(height / tileSize);
      
      const leftTile = Math.floor((collisionX - collisionRadius) / tileSize);
      const rightTile = Math.floor((collisionX + collisionRadius) / tileSize);
      const topTile = Math.floor((collisionY - collisionRadius) / tileSize);
      const bottomTile = Math.floor((collisionY + collisionRadius) / tileSize);
      
      for (let tileY = topTile; tileY <= bottomTile; tileY++) {
        for (let tileX = leftTile; tileX <= rightTile; tileX++) {
          if (tileY >= 0 && tileY < tilesY && tileX >= 0 && tileX < tilesX) {
            const tileType = tileMap[tileY][tileX];
            const tileData = tileTypes[tileType];
            
            if (tileData && (!tileData.walkable || tileData.collision)) {
              if (this.checkTileCollision(collisionX, collisionY, tileX, tileY, tileSize, collisionRadius)) {
                debugInfo.collides = true;
                debugInfo.collidingTiles.push({ x: tileX, y: tileY, type: tileType });
              }
            }
          }
        }
      }
    }

    // Check obstacles
    for (let i = 0; i < obstacles.length; i++) {
      if (this.checkObstacleCollision(x, y, obstacles[i], radius)) {
        debugInfo.collides = true;
        debugInfo.collidingObstacles.push(i);
      }
    }

    return debugInfo;
  }
}

// For Node.js (server-side)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CollisionSystem;
}

// For browser (client-side)
if (typeof window !== 'undefined') {
  window.CollisionSystem = CollisionSystem;
}
