const GameMap = require('./Map');

// MapManager class to handle loading and managing different maps
class MapManager {
  constructor() {
    this.maps = new Map();
    this.currentMapId = null;
    
    // Load custom maps first (they take priority)
    this.loadCustomMaps();
    
    // Then load default maps
    this.loadDefaultMaps();

    // Set default map (prefer custom_map if it exists, otherwise use first available)
    if (this.maps.has('custom_map')) {
      this.currentMapId = 'custom_map';
    } else if (this.maps.size > 0) {
      this.currentMapId = Array.from(this.maps.keys())[0];
    }
  }

  // Load predefined maps
  loadDefaultMaps() {
    // Battle Arena map with obstacles
    const arenaMap = {
      id: 'arena',
      name: 'Battle Arena',
      width: 800,
      height: 600,
      backgroundColor: '#8B4513',
      backgroundImage: null,
      playerSpawnPoints: [
        { x: 50, y: 50 },
        { x: 750, y: 50 },
        { x: 50, y: 550 },
        { x: 750, y: 550 }
      ],
      enemySpawnPoints: [
        { x: 300, y: 200 },
        { x: 500, y: 200 },
        { x: 300, y: 400 },
        { x: 500, y: 400 },
        { x: 400, y: 300 }
      ],
      obstacles: [
        { x: 200, y: 200, width: 50, height: 50 },
        { x: 550, y: 200, width: 50, height: 50 },
        { x: 200, y: 350, width: 50, height: 50 },
        { x: 550, y: 350, width: 50, height: 50 },
        { x: 375, y: 275, width: 50, height: 50 }
      ],
      boundaries: { minX: 11, minY: 11, maxX: 789, maxY: 589 }
    };

    // Forest map
    const forestMap = {
      id: 'forest',
      name: 'Dark Forest',
      width: 1000,
      height: 800,
      backgroundColor: '#1a4d1a',
      backgroundImage: null,
      playerSpawnPoints: [
        { x: 100, y: 100 },
        { x: 900, y: 100 },
        { x: 100, y: 700 },
        { x: 900, y: 700 },
        { x: 500, y: 400 }
      ],
      enemySpawnPoints: [
        { x: 200, y: 200 },
        { x: 800, y: 200 },
        { x: 200, y: 600 },
        { x: 800, y: 600 },
        { x: 300, y: 400 },
        { x: 700, y: 400 },
        { x: 500, y: 250 },
        { x: 500, y: 550 }
      ],
      obstacles: [
        // Tree obstacles
        { x: 300, y: 150, width: 30, height: 30 },
        { x: 500, y: 180, width: 30, height: 30 },
        { x: 700, y: 160, width: 30, height: 30 },
        { x: 250, y: 350, width: 30, height: 30 },
        { x: 750, y: 380, width: 30, height: 30 },
        { x: 450, y: 450, width: 30, height: 30 },
        { x: 600, y: 320, width: 30, height: 30 }
      ],
      boundaries: { minX: 11, minY: 11, maxX: 989, maxY: 789 }
    };

    // Small duel map
    const duelMap = {
      id: 'duel',
      name: 'Duel Arena',
      width: 400,
      height: 400,
      backgroundColor: '#654321',
      backgroundImage: null,
      playerSpawnPoints: [
        { x: 100, y: 200 },
        { x: 300, y: 200 }
      ],
      enemySpawnPoints: [
        { x: 200, y: 100 },
        { x: 200, y: 300 }
      ],
      obstacles: [],
      boundaries: { minX: 11, minY: 11, maxX: 389, maxY: 389 }
    };

    // Register predefined maps (only if they don't already exist)
    if (!this.maps.has('arena')) this.registerMap(arenaMap);
    if (!this.maps.has('forest')) this.registerMap(forestMap);
    if (!this.maps.has('duel')) this.registerMap(duelMap);
  }

  // Load custom maps from files
  loadCustomMaps() {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Load custom_map.json
      const customMapPath = path.join(__dirname, '..', 'maps', 'custom_map.json');
      if (fs.existsSync(customMapPath)) {
        const customMapData = JSON.parse(fs.readFileSync(customMapPath, 'utf8'));
        this.registerMap(customMapData);
        console.log('✅ Loaded custom_map.json');
      }
      
      // Load forest_theme.json
      const forestMapPath = path.join(__dirname, '..', 'maps', 'forest_theme.json');
      if (fs.existsSync(forestMapPath)) {
        const forestMapData = JSON.parse(fs.readFileSync(forestMapPath, 'utf8'));
        this.registerMap(forestMapData);
        console.log('✅ Loaded forest_theme.json');
      }
    } catch (error) {
      console.warn('⚠️ Could not load custom maps:', error.message);
    }
  }

  // Register a new map
  registerMap(mapData) {
    const map = new GameMap(mapData);
    this.maps.set(map.id, map);
    console.log(`📍 Registered map: ${map.name} (${map.id})`);
  }

  // Load a map from file (for future expansion)
  async loadMapFromFile(filePath) {
    try {
      const fs = require('fs').promises;
      const mapData = JSON.parse(await fs.readFile(filePath, 'utf8'));
      this.registerMap(mapData);
      return mapData.id;
    } catch (error) {
      console.error('Failed to load map from file:', error);
      return null;
    }
  }

  // Switch to a different map
  switchMap(mapId) {
    if (this.maps.has(mapId)) {
      this.currentMapId = mapId;
      console.log(`🗺️ Switched to map: ${this.getCurrentMap().name}`);
      return true;
    }
    console.warn(`❌ Map not found: ${mapId}`);
    return false;
  }

  // Get current map
  getCurrentMap() {
    return this.maps.get(this.currentMapId);
  }

  // Get map by ID
  getMap(mapId) {
    return this.maps.get(mapId);
  }

  // Get all available maps
  getAllMaps() {
    const mapList = [];
    for (const [id, map] of this.maps) {
      mapList.push({
        id: map.id,
        name: map.name,
        width: map.width,
        height: map.height
      });
    }
    return mapList;
  }

  // Get random map
  getRandomMap() {
    const mapIds = Array.from(this.maps.keys());
    const randomId = mapIds[Math.floor(Math.random() * mapIds.length)];
    return this.maps.get(randomId);
  }

  // Check if map exists
  hasMap(mapId) {
    return this.maps.has(mapId);
  }
}

module.exports = MapManager;
