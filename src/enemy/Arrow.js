export default class Arrow extends Phaser.Physics.Matter.Sprite {
  constructor(scene, x, y, angle, speed) {
    super(scene.matter.world, x, y, 'arrow');
    scene.add.existing(this);

    this.setRectangle(16, 4, {
      label: 'enemy_projectile',
      isSensor: true,
      render: {sprite: {yOffset: 0.1}},
    })
    this.setIgnoreGravity(true);
    this.setFixedRotation();
    this.setRotation(angle);
    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    this.setDepth(this.y);

    this.lifespan = 3000;
    this.scene.matter.world.on('collisionstart', this.handleCollision, this);
  }

  handleCollision(e) {
    e.pairs.forEach(pair => {
      const { bodyA, bodyB } = pair;
      const targetBody = bodyA === this.body ? bodyB : (bodyB === this.body ? bodyA : null);

      if (targetBody) {
        if (targetBody.label === 'enemy' || targetBody.label === 'throughable') {
          return;
        }

        if (targetBody.label === 'player') {
          if (this.scene.player) {
            this.scene.player.takeDamage(2);
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