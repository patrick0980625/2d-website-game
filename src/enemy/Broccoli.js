export default class Broccoli extends Phaser.Physics.Matter.Sprite {
  constructor(scene, x, y, angle, speed) {
    super(scene.matter.world, x, y, 'broccoli');
    scene.add.existing(this);

    this.setRectangle(12, 12, {
      label: 'enemy_projectile',
      isSensor: true,
    })
    this.setIgnoreGravity(true)
    this.setFixedRotation();
    this.setRotation(angle + Math.PI / 2);
    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    this.setDepth(this.y);

    this.lifespan = 3000;
    this.scene.matter.world.on('collisionstart', this.handleCollision, this);
  }

  handleCollision(e) {
    e.pairs.forEach(p => {
      const {bodyA, bodyB} = p;
      const targetBody = bodyA === this.body ? bodyB : (bodyB === this.body ? bodyA : null);

      if (targetBody) {
        if (targetBody.label === 'enemy' || targetBody.label === 'throughable') {
          return;
        }

        if (targetBody.label === 'player') {
          if (this.scene.player) {
            this.scene.player.takeDamage(3);
          }
          this.destroy();
        } else if (targetBody.label === 'collision') {
          this.destroy();
        }
      }
    })
  }

  update(time, delta) {
    if (!this.active) {
      return;
    }

    this.lifespan -= delta;
    if (this.lifespan <= 0) {
      this.destroy();
    }
  }

  destroy() {
    super.destroy();
  }
}