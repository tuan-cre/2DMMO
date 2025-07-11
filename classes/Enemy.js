// Enemy class to encapsulate enemy data and behavior
class Enemy {
  constructor(id, x, y) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.name = "Enemy";
    this.type = "enemy";
    this.health = 20;
    this.maxHealth = 20;
  }

  takeDamage(damage) {
    this.health = Math.max(0, this.health - damage);
    console.log(`⚔️ Enemy ${this.id} takes ${damage} damage! Health: ${this.health}/${this.maxHealth}`);
    return this.health <= 0;
  }

  isDead() {
    return this.health <= 0;
  }

  toJSON() {
    return {
      x: Math.round(this.x),
      y: Math.round(this.y),
      name: this.name,
      health: this.health,
      maxHealth: this.maxHealth
    };
  }
}

module.exports = Enemy;
