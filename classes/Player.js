// Player class to encapsulate player data and behavior
class Player {
  constructor(id, name, x = 200, y = 200) {
    this.id = id;
    this.name = name;
    this.x = x;
    this.y = y;
    this.facing = 'down';
    this.isSwinging = false;
    this.swingStartTime = 0;
    this.swingEndTime = 0;
    this.health = 20;
    this.maxHealth = 20;
    this.lastMoveTime = 0;
  }

  move(dx, dy, canvasWidth, canvasHeight) {
    const oldX = this.x;
    const oldY = this.y;
    const oldFacing = this.facing;
    
    // Keep players within canvas bounds
    this.x = Math.max(11, Math.min(canvasWidth - 21, this.x + dx));
    this.y = Math.max(11, Math.min(canvasHeight - 21, this.y + dy));
    
    // Update facing direction based on movement
    if (dx > 0) this.facing = 'right';
    else if (dx < 0) this.facing = 'left';
    else if (dy > 0) this.facing = 'down';
    else if (dy < 0) this.facing = 'up';
    
    this.lastMoveTime = Date.now();
    
    // Return true if position or facing changed
    return (oldX !== this.x || oldY !== this.y || oldFacing !== this.facing);
  }

  swingSword() {
    this.isSwinging = true;
    this.swingStartTime = Date.now();
    this.swingEndTime = Date.now() + 300;
    
    console.log(`⚔️ Player ${this.id} swings sword facing ${this.facing}!`);
  }

  takeDamage(damage) {
    this.health = Math.max(0, this.health - damage);
    return this.health <= 0;
  }

  clearSwing() {
    this.isSwinging = false;
    this.swingStartTime = 0;
    this.swingEndTime = 0;
  }

  toJSON() {
    return {
      x: Math.round(this.x),
      y: Math.round(this.y),
      name: this.name,
      facing: this.facing,
      isSwinging: this.isSwinging,
      swingStartTime: this.swingStartTime,
      swingEndTime: this.swingEndTime,
      health: this.health,
      maxHealth: this.maxHealth
    };
  }
}

module.exports = Player;
